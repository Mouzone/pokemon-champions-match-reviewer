const { GoogleGenAI } = require("@google/genai");
async function run() {
  const models = [
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-002',
    'gemini-1.5-pro-001',
    'gemini-1.5-pro-002',
    'gemini-3.5-flash-001',
    'gemini-3.5-flash-002',
    'gemini-2.5-flash',
    'gemini-2.5-flash-001',
    'gemini-2.5-pro',
    'gemini-1.0-pro'
  ];
  
  for (const m of models) {
    const ai = new GoogleGenAI({ vertexai: true, project: "pokemon-champions-match-reviewer", location: "us-central1" });
    try {
      await ai.models.generateContent({ model: m, contents: "Hi" });
      console.log(`SUCCESS: ${m}`);
    } catch (e) {
      console.log(`FAILED: ${m} - ${e.message}`);
    }
  }
}
run();
