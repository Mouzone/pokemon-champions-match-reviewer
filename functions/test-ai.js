const { GoogleGenAI } = require("@google/genai");

async function testModel(modelName, location) {
  const ai = new GoogleGenAI({ 
    vertexai: true,
    project: process.env.GCLOUD_PROJECT || "matchreviewer-automation", 
    location: location 
  });
  
  try {
    const res = await ai.models.generateContent({
      model: modelName,
      contents: "Hello",
    });
    console.log(`SUCCESS: ${modelName} in ${location} - ${res.text}`);
  } catch (e) {
    console.log(`FAILED: ${modelName} in ${location} - ${e.message}`);
  }
}

async function run() {
  const models = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-3.5-flash',
    'gemini-2.0-flash',
    'gemini-3.0-flash',
    'gemini-pro',
    'gemini-flash'
  ];
  
  for (const model of models) {
    await testModel(model, 'us-central1');
    await testModel(model, 'us-east1');
  }
}

run();
