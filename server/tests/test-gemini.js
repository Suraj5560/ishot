const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());

async function testGemini() {
  const modelName = 'gemini-2.5-flash';
  console.log(`Testing ${modelName} with responseMimeType: application/json...`);

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `Analyze this request and return strict JSON:
{
  "ocrText": "Sample text",
  "caption": "A test screenshot",
  "tags": ["test", "demo"],
  "category": "Other",
  "hasSensitiveData": false
}`;

  const res = await model.generateContent(prompt);
  console.log('Gemini raw response:', res.response.text());
  const parsed = JSON.parse(res.response.text());
  console.log('Parsed successfully:', parsed);
}

testGemini().catch((err) => console.error('Gemini test error:', err));
