"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processMatch = void 0;
const storage_1 = require("firebase-functions/v2/storage");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const genai_1 = require("@google/genai");
(0, app_1.initializeApp)();
exports.processMatch = (0, storage_1.onObjectFinalized)({ region: "us-east1", timeoutSeconds: 540, memory: "512MiB" }, async (event) => {
    const fileBucket = event.data.bucket; // Storage bucket containing the file.
    const filePath = event.data.name; // File path in the bucket.
    const contentType = event.data.contentType; // File content type.
    if (!contentType || !contentType.startsWith("video/")) {
        console.log("This is not a video.");
        return;
    }
    console.log(`Processing video: ${filePath} in bucket ${fileBucket}`);
    const PROJECT_ID = process.env.GCLOUD_PROJECT || "matchreviewer-automation";
    const LOCATION = "us-east1"; // Vertex AI location
    try {
        // Fetch teams
        const db = (0, firestore_1.getFirestore)();
        const teamsSnap = await db.collection('teams').get();
        const teams = teamsSnap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        let teamListString = "";
        if (teams && teams.length > 0) {
            teamListString = teams.map((t) => `Team ID: ${t.id}\nTeam Name: ${t.name}\nPokemon:\n${t.paste_text}`).join("\n\n---\n\n");
        }
        let opponentPokemon = [];
        let detectedTeamId = null;
        let detectedResult = 'win';
        console.log("Starting Vertex AI Analysis...");
        const ai = new genai_1.GoogleGenAI({
            vertexai: true,
            project: PROJECT_ID,
            location: LOCATION
        });
        const prompt = `This is a Pokemon VGC screen recording.
IMPORTANT: When identifying Pokemon, ensure they are legal and available in the latest regulation of Pokemon Champions. Do not hallucinate older or unavailable Pokemon.

Task 1: Look at the Team Preview screen to identify the opponent's 6 Pokemon. (Usually the opponent's team is shown at the top or on the right).
Task 2: Look at the other 6 Pokemon. Compare them to this list of my teams:
${teamListString}
Identify which of my teams I am using.
Task 3: Watch the end of the video. Did I win, lose, or tie?

Output MUST be valid JSON matching this exact schema:
{
  "opponent_pokemon": [
    { "name": "string (lowercase, hyphenated like urshifu-rapid-strike)", "id": "string (same as name)" }
  ],
  "own_team_id": "string (the UUID of my team that matched, or null)",
  "own_team_name": "string (the name of my team that matched, or Unknown)",
  "result": "string (must be exactly 'win', 'loss', or 'tie')"
}`;
        const request = {
            model: 'gemini-1.5-flash',
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
        console.log("Raw Vertex AI Response:", JSON.stringify(analyzeRes));
        if (analyzeRes.candidates && analyzeRes.candidates.length > 0) {
            const rawText = analyzeRes.text;
            if (rawText) {
                try {
                    const parsed = JSON.parse(rawText.trim());
                    console.log("Vertex AI successfully parsed output.");
                    if (parsed.opponent_pokemon)
                        opponentPokemon = parsed.opponent_pokemon;
                    if (parsed.own_team_id)
                        detectedTeamId = parsed.own_team_id;
                    if (parsed.result && ['win', 'loss', 'tie'].includes(parsed.result.toLowerCase())) {
                        detectedResult = parsed.result.toLowerCase();
                    }
                }
                catch (e) {
                    console.error("Failed to parse Vertex AI JSON:", rawText);
                }
            }
        }
        if (!detectedTeamId && teams && teams.length > 0) {
            detectedTeamId = teams[0].id;
        }
        console.log("Saving to database...");
        // Instead of youtubeUrl, we just save the storage path
        await db.collection('matches').add({
            played_at: new Date().toISOString(),
            opponent_team: opponentPokemon,
            own_team_id: detectedTeamId,
            result: detectedResult,
            video_url: `gs://${fileBucket}/${filePath}`,
            created_at: firestore_1.FieldValue.serverTimestamp()
        });
        console.log("Match processed successfully.");
    }
    catch (error) {
        console.error("Function error:", error);
    }
});
//# sourceMappingURL=index.js.map