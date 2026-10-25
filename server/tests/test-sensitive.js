const { analyzeScreenshotWithGemini } = require('../src/services/geminiService');

async function testSensitivePrompt() {
  console.log('Testing Gemini sensitive data classification logic...');
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  require('dotenv').config();

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `You are an expert OCR, document inspection, and image analysis engine.
If a screenshot text contains: "Your OTP is 948201 for transaction of $450 on Card ending 4242 CVV 123",
classify it and return JSON:
{
  "ocrText": "string",
  "caption": "string",
  "tags": ["string"],
  "category": "Payments",
  "hasSensitiveData": true
}`;

  const res = await model.generateContent(prompt);
  const parsed = JSON.parse(res.response.text());
  console.log('Sensitive detection result:', parsed);
  if (parsed.hasSensitiveData !== true) {
    throw new Error('Expected hasSensitiveData to be true');
  }
  console.log('✅ Sensitive data detection verified!');
}

testSensitivePrompt().catch(console.error);
