import { initializeApp } from "firebase-admin/app";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

initializeApp();

async function runVideoReview(fileBucket: string, filePath: string, contentType: string, jobId: string) {
  const db = getFirestore();
  const jobRef = db.collection('processing_jobs').doc(jobId);

  try {
    await jobRef.set({
      file_path: filePath,
      status: 'processing',
      started_at: FieldValue.serverTimestamp(),
      video_url: `gs://${fileBucket}/${filePath}`
    });

    const PROJECT_ID = process.env.GCLOUD_PROJECT || "matchreviewer-automation";
    const LOCATION = "us-central1"; // Vertex AI location

    // Fetch teams
    const teamsSnap = await db.collection('teams').get();
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

    const prompt = `You are an expert Pokemon VGC analyst reviewing a Pokemon Scarlet/Violet screen recording. Today's date is ${new Date().toISOString().split('T')[0]}.

CRITICAL INSTRUCTIONS:
- Ensure all identified Pokemon are legal and available in the most recent VGC regulation as of today's date.
- Pay close attention to alternate forms. Format names strictly in lowercase and hyphenated (e.g., "urshifu-rapid-strike", "urshifu-single-strike", "ogerpon-hearthflame", "ogerpon-wellspring", "landorus-therian", "tornadus-incarnate", "calyrex-shadow", "calyrex-ice", "ursaluna-bloodmoon", "flutter-mane", "raging-bolt").

Task 1: Identify My Team
- At Team Preview, there are 12 Pokemon shown (6 for each player).
- Below is a list of my saved teams. Analyze all 12 Pokemon on screen and find which group of 6 perfectly matches (or most closely matches) one of my saved teams.
- Save the ID of the matched team.

My Saved Teams:
${teamListString}

Task 2: Identify the Opponent's Team
- The Pokemon on Team Preview that DO NOT belong to my matched team are the opponent's Pokemon.
- If the video skips Team Preview, identify as many of the opponent's Pokemon as appear during the actual battle (could be only 3 or 4).

Task 3: Determine the Match Result
- Watch the end of the video. Determine if I (the recording player) won, lost, or tied. 
- Edge cases: If the opponent forfeits/disconnects, it's a win. If I forfeit, it's a loss. If the video cuts off early before the match ends, deduce the likely winner based on the final board state (Pokemon remaining, HP), or default to "loss".

Output MUST be valid JSON matching this exact schema:
{
  "opponent_pokemon": [
    { "name": "string (lowercase, hyphenated)", "id": "string (same as name)" }
  ],
  "own_team_id": "string (the exact UUID of my team that matched from the provided list, or null if absolutely no match)",
  "own_team_name": "string (the name of my team that matched, or Unknown)",
  "result": "string (must be exactly 'win', 'loss', or 'tie')"
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
    
    if (analyzeRes.candidates && analyzeRes.candidates.length > 0) {
      const rawText = analyzeRes.text;
      if (rawText) {
        try {
          const parsed = JSON.parse(rawText.trim());
          if (parsed.opponent_pokemon) opponentPokemon = parsed.opponent_pokemon;
          if (parsed.own_team_id) detectedTeamId = parsed.own_team_id;
          if (parsed.result && ['win', 'loss', 'tie'].includes(parsed.result.toLowerCase())) {
            detectedResult = parsed.result.toLowerCase();
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
    const existingMatches = await db.collection('matches').where('video_url', '==', `gs://${fileBucket}/${filePath}`).get();
    
    if (existingMatches.empty) {
      await db.collection('matches').add({
        played_at: new Date().toISOString(),
        opponent_team: opponentPokemon,
        own_team_id: detectedTeamId,
        result: detectedResult,
        video_url: `gs://${fileBucket}/${filePath}`,
        created_at: FieldValue.serverTimestamp()
      });
      console.log(`Match processed and saved successfully for job ${jobId}.`);
    } else {
      // Update existing
      const docId = existingMatches.docs[0].id;
      await db.collection('matches').doc(docId).update({
        opponent_team: opponentPokemon,
        own_team_id: detectedTeamId,
        result: detectedResult,
        updated_at: FieldValue.serverTimestamp()
      });
      console.log(`Match updated successfully for job ${jobId}.`);
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

  // Generate a predictable job ID based on the file name so multiple retries can use the same job
  const jobId = filePath.replace(/[^a-zA-Z0-9]/g, '_');
  await runVideoReview(fileBucket, filePath, contentType, jobId);
});

export const manualProcessMatch = onCall({ region: "us-east1", timeoutSeconds: 540, memory: "512MiB" }, async (request) => {
  const { filePath } = request.data;
  if (!filePath) {
    throw new HttpsError('invalid-argument', 'The function must be called with one argument "filePath".');
  }

  const fileBucket = "matchreviewer-automation.firebasestorage.app"; // Default bucket
  const contentType = "video/mp4"; // Assume video for manual processing
  
  const jobId = filePath.replace(/[^a-zA-Z0-9]/g, '_') + '_manual_' + Date.now();
  await runVideoReview(fileBucket, filePath, contentType, jobId);
  return { success: true, jobId };
});
