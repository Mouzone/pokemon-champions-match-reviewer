import { initializeApp } from "firebase-admin/app";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { GoogleGenAI } from "@google/genai";

initializeApp();

async function runVideoReview(fileBucket: string, filePath: string, contentType: string, jobId: string, userId: string) {
  const db = getFirestore();
  const jobRef = db.collection('processing_jobs').doc(jobId);

  try {
    await jobRef.set({
      file_path: filePath,
      status: 'processing',
      started_at: FieldValue.serverTimestamp(),
      video_url: `gs://${fileBucket}/${filePath}`,
      userId: userId
    });

    const PROJECT_ID = process.env.GCLOUD_PROJECT || "matchreviewer-automation";
    const LOCATION = "us-central1"; // Vertex AI location

    // Fetch teams ordered by newest first
    const teamsSnap = await db.collection('teams').where('userId', '==', userId).orderBy('created_at', 'desc').get();
    const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let teamListString = "";
    if (teams && teams.length > 0) {
      teamListString = teams.map((t: any) => `Team ID: ${t.id}\nTeam Name: ${t.name}\nPokemon:\n${t.paste_text}`).join("\n\n---\n\n");
    }

    let opponentPokemon: any[] = [];
    let detectedTeamId = null;
    let detectedResult = 'win';
    
    console.log(`Starting Vertex AI Analysis for job ${jobId}...`);
    const ai = new GoogleGenAI({ 
      vertexai: true,
      project: PROJECT_ID, 
      location: LOCATION 
    });

    const prompt = `You are an expert Pokemon VGC (Scarlet/Violet) analyst. Today: ${new Date().toISOString().split('T')[0]}.

## Turn Definitions
- **Turn 0** — The Pokemon selection phase (team preview + lead selection). Timestamp: 0s if the video starts here.
- **Turn 1** — Begins the moment the Pokemon are sent out onto the field (before any abilities, weather, or terrain activate). Ends after the last move of that turn resolves, just before the next move selection screen appears.
- **Turn 2+** — Each turn begins at the move selection screen ("Fight / Pokemon / Bag / Run") and ends after all moves for that turn resolve, just before the next move selection screen.

## Legality Rules
- Only include Pokemon that are legal in the current active VGC regulation as of today's date.
- No Mythicals or banned Legendaries unless explicitly legal right now.
- If you think you see an illegal Pokemon, look closer — you have almost certainly misidentified it.
- Use lowercase hyphenated names for all forms: e.g. urshifu-rapid-strike, ogerpon-hearthflame, landorus-therian, calyrex-shadow, flutter-mane, raging-bolt.

## Task 1 — Identify My Team
From Team Preview, find the group of 6 Pokemon that best matches one of my saved teams below.
Return the exact UUID of the matched team. If multiple teams match equally, pick the first one in the list (most recently created).

My Saved Teams:
${teamListString || "(No teams saved yet)"}

## Task 2 — Identify Opponent's Team
The 6 Pokemon on Team Preview that are NOT on my team are the opponent's full team — return all 6.
Exception: if the video skips Team Preview entirely and starts mid-battle, return only the Pokemon that visibly appeared (3–4).

## Task 3 — Match Result
Watch the end of the video. Return "win", "loss", or "tie".
- Opponent forfeits/disconnects = win. I forfeit = loss.
- Video cuts off early = infer from final board state, default to "loss".

## Task 4 — Turn-by-Turn Analysis
For every turn (0 through the last turn of the battle):
- **timestamp**: seconds from the start of the video when this turn begins.
- **events**: factual summary of what happened (moves used, damage, KOs, switches).
- **notes**: analysis of the decisions made (good plays, mistakes, alternatives).
- **knowns**: what this turn revealed about the opponent's sets, items, or abilities.
- **assumptions**: informed guesses about the opponent's remaining unknowns.

## Output
Respond with ONLY valid JSON — no markdown, no explanation:
{
  "opponent_pokemon": [
    { "name": "string (lowercase, hyphenated)", "id": "string (same as name)" }
  ],
  "own_team_id": "string (exact UUID from My Saved Teams, or null)",
  "own_team_name": "string (team name, or Unknown)",
  "result": "win" | "loss" | "tie",
  "turns": [
    {
      "turn_number": 0,
      "timestamp": 0,
      "events": "string",
      "notes": "string",
      "knowns": "string",
      "assumptions": "string"
    }
  ]
}`;

    const request = {
      model: 'gemini-2.5-flash',
      contents: [{
        role: 'user',
        parts: [
          {
            fileData: {
              fileUri: `gs://${fileBucket}/${filePath}`,
              mimeType: contentType
            }
          },
          { text: prompt }
        ]
      }],
      config: {
        responseMimeType: "application/json"
      }
    };

    const analyzeRes = await ai.models.generateContent(request);
    console.log(`Raw Vertex AI Response for job ${jobId}:`, JSON.stringify(analyzeRes));
    
    let turns: any[] = [];
    if (analyzeRes.candidates && analyzeRes.candidates.length > 0) {
      const rawText = analyzeRes.text;
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText.trim().replace(/^```json\s*/, '').replace(/\s*```$/, ''));
          if (parsed.opponent_pokemon) opponentPokemon = parsed.opponent_pokemon;
          if (parsed.own_team_id) detectedTeamId = parsed.own_team_id;
          if (parsed.result && ['win', 'loss', 'tie'].includes(parsed.result.toLowerCase())) {
            detectedResult = parsed.result.toLowerCase();
          }
          if (parsed.turns && Array.isArray(parsed.turns)) {
            turns = parsed.turns;
          }
        } catch(e) {
          console.error(`Failed to parse Vertex AI JSON for job ${jobId}:`, rawText);
        }
      }
    }

    if (!detectedTeamId && teams && teams.length > 0) {
      detectedTeamId = teams[0].id;
    }
    
    // Check if match already exists for this video to avoid duplicates during manual runs
    const existingMatches = await db.collection('matches').where('video_url', '==', `gs://${fileBucket}/${filePath}`).where('userId', '==', userId).get();
    
    let matchId = "";
    if (existingMatches.empty) {
      const newMatch = await db.collection('matches').add({
        played_at: new Date().toISOString(),
        opponent_team: opponentPokemon,
        own_team_id: detectedTeamId,
        result: detectedResult,
        video_url: `gs://${fileBucket}/${filePath}`,
        userId: userId,
        created_at: FieldValue.serverTimestamp()
      });
      matchId = newMatch.id;
      console.log(`Match processed and saved successfully for job ${jobId}.`);
    } else {
      // Update existing
      matchId = existingMatches.docs[0].id;
      await db.collection('matches').doc(matchId).update({
        opponent_team: opponentPokemon,
        own_team_id: detectedTeamId,
        result: detectedResult,
        updated_at: FieldValue.serverTimestamp()
      });
      console.log(`Match updated successfully for job ${jobId}.`);
    }

    // Save generated turns to match_notes
    if (turns.length > 0) {
      const notesRef = db.collection('match_notes');
      
      // Delete existing notes for this match so we don't duplicate on re-run
      const existingNotesSnap = await notesRef.where('match_id', '==', matchId).where('userId', '==', userId).get();
      if (!existingNotesSnap.empty) {
        const batch = db.batch();
        existingNotesSnap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      const insertBatch = db.batch();
      for (const t of turns) {
        const payload = JSON.stringify({
          events: t.events || '',
          notes: t.notes || '',
          knowns: t.knowns || '',
          assumptions: t.assumptions || ''
        });
        const tab = t.turn_number === 0 ? 'select' : 'battle';
        const docRef = notesRef.doc();
        insertBatch.set(docRef, {
          match_id: matchId,
          tab: tab,
          turn_number: t.turn_number,
          timestamp: typeof t.timestamp === 'number' ? t.timestamp : null,
          actual_note: payload,
          correct_note: '',
          userId: userId
        });
      }
      await insertBatch.commit();
      console.log(`Saved ${turns.length} turns to match_notes for match ${matchId}.`);
    }

    await jobRef.update({
      status: 'completed',
      completed_at: FieldValue.serverTimestamp()
    });

  } catch (error: any) {
    console.error(`Function error for job ${jobId}:`, error);
    await jobRef.update({
      status: 'failed',
      error: error.message || 'Unknown error',
      completed_at: FieldValue.serverTimestamp()
    });
    throw error;
  }
}

export const processMatch = onObjectFinalized({ region: "us-east1", timeoutSeconds: 540, memory: "512MiB" }, async (event) => {
  const fileBucket = event.data.bucket;
  const filePath = event.data.name;
  const contentType = event.data.contentType;

  if (!contentType || !contentType.startsWith("video/")) {
    console.log("This is not a video.");
    return;
  }

  // Extract userId from filePath: videos/{userId}/{filename}
  const parts = filePath.split('/');
  if (parts.length < 3 || parts[0] !== 'videos') {
    console.log("Invalid file path structure. Expected videos/{userId}/{filename}");
    return;
  }
  const userId = parts[1];

  // Generate a predictable job ID based on the file name so multiple retries can use the same job
  const jobId = filePath.replace(/[^a-zA-Z0-9]/g, '_');
  await runVideoReview(fileBucket, filePath, contentType, jobId, userId);
});

export const manualProcessMatch = onCall({ region: "us-east1", timeoutSeconds: 540, memory: "512MiB" }, async (request) => {
  const { filePath } = request.data;
  const userId = request.auth?.uid;
  if (!filePath) {
    throw new HttpsError('invalid-argument', 'The function must be called with one argument "filePath".');
  }
  if (!userId) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to process a match.');
  }

  const fileBucket = "matchreviewer-automation.firebasestorage.app"; // Default bucket
  const contentType = "video/mp4"; // Assume video for manual processing
  
  const jobId = filePath.replace(/[^a-zA-Z0-9]/g, '_') + '_manual_' + Date.now();
  await runVideoReview(fileBucket, filePath, contentType, jobId, userId);
  return { success: true, jobId };
});

export const cleanupOldVideos = onSchedule({ schedule: "every day 00:00", region: "us-east1", timeoutSeconds: 540 }, async (event) => {
  const bucket = getStorage().bucket("matchreviewer-automation.firebasestorage.app");
  const [files] = await bucket.getFiles({ prefix: 'videos/' });
  
  const fiveDaysAgo = Date.now() - 5 * 24 * 60 * 60 * 1000;
  let deletedCount = 0;
  
  for (const file of files) {
    try {
      const [metadata] = await file.getMetadata();
      if (metadata && metadata.timeCreated) {
        const timeCreated = new Date(metadata.timeCreated).getTime();
        if (timeCreated < fiveDaysAgo) {
          await file.delete();
          console.log(`Deleted old video: ${file.name}`);
          deletedCount++;
        }
      }
    } catch (err) {
      console.error(`Failed to check or delete file ${file.name}:`, err);
    }
  }
  
  console.log(`Cleanup complete. Deleted ${deletedCount} videos.`);
});
