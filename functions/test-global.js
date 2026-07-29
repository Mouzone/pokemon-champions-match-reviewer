const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({ vertexai: true, project: "pokemon-champions-match-reviewer", location: "global" });
async function run() {
  try {
    const res = await ai.models.generateContent({ model: 'gemini-3.5-flash', contents: "Hello" });
    console.log(`SUCCESS: ${res.text}`);
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
  }
}
run();
