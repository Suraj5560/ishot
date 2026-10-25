const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());

const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function testVision() {
  console.log('Testing Gemini vision on sample image buffer...');
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `Analyze this screenshot image and output STRICT JSON matching this schema:
{
  "ocrText": "all readable text in the image, any language including Hindi, in reading order",
  "caption": "one clear sentence describing the screenshot, usable as alt text",
  "tags": ["5 to 8 short lowercase keywords"],
  "category": "one of Payments, Chats, Study, Code, Tickets, Other",
  "hasSensitiveData": true or false
}`;

  const imagePart = {
    inlineData: {
      data: SAMPLE_PNG_BASE64,
      mimeType: 'image/png',
    },
  };

  const res = await model.generateContent([prompt, imagePart]);
  const text = res.response.text();
  console.log('Gemini vision raw output:', text);
  const parsed = JSON.parse(text);
  console.log('Parsed JSON successfully:', parsed);
}

testVision().catch((e) => console.error('Vision test error:', e));
