const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
let genAI = null;

if (GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  console.log('🤖 [Gemini] Vision service initialized with Gemini Flash');
} else {
  console.warn('⚠️ [Gemini] Warning: GEMINI_API_KEY is not configured in server/.env');
}

// Sequential queue to process image analyses sequentially to respect rate limits
let analysisQueue = Promise.resolve();

const VALID_CATEGORIES = new Set([
  'Payments',
  'Chats',
  'Study',
  'Code',
  'Tickets',
  'Other',
]);

/**
 * Strips markdown code fences (```json ... ```) from a text response.
 */
function stripMarkdownFences(text) {
  if (!text) return '';
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

/**
 * Core function that calls Gemini Flash with the image buffer and strict JSON output.
 */
async function callGeminiVision(buffer, mimeType = 'image/png') {
  if (!genAI) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Use current Gemini Flash model
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  });

  const prompt = `You are an expert OCR, document inspection, and image analysis engine.
Inspect the attached screenshot carefully and return a STRICT JSON object with the following schema:
{
  "ocrText": "all readable text in the image, in any language including Hindi and English, in reading order",
  "caption": "one clear sentence describing the screenshot, usable as alt text",
  "tags": ["5 to 8 short lowercase keywords"],
  "category": "one of Payments, Chats, Study, Code, Tickets, Other",
  "hasSensitiveData": true or false
}

Guidelines:
- "ocrText": Extract every piece of visible text verbatim. If no text exists, return an empty string.
- "caption": Exactly one informative sentence describing what is shown.
- "tags": 5 to 8 concise, relevant lowercase tags (e.g. ["upi", "receipt", "payment", "bank", "transaction"]).
- "category": Must be exactly one of: Payments, Chats, Study, Code, Tickets, Other.
- "hasSensitiveData": Set to true if the screenshot contains sensitive information such as OTP codes, full credit/debit card numbers, CVVs, passwords, PINs, or government identity numbers like Aadhaar or SSN; otherwise false.

Respond ONLY with valid JSON.`;

  const imagePart = {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType: mimeType || 'image/png',
    },
  };

  const response = await model.generateContent([prompt, imagePart]);
  const rawText = response.response.text();
  const cleanJson = stripMarkdownFences(rawText);

  let parsed = null;
  try {
    parsed = JSON.parse(cleanJson);
  } catch (parseErr) {
    throw new Error(`Failed to parse Gemini response as JSON: ${parseErr.message}`);
  }

  // Sanitize and validate fields
  const ocrText = typeof parsed.ocrText === 'string' ? parsed.ocrText.trim() : '';
  const caption = typeof parsed.caption === 'string' ? parsed.caption.trim() : '';
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .filter((t) => typeof t === 'string' && t.trim())
        .map((t) => t.trim().toLowerCase())
    : [];
  const category = VALID_CATEGORIES.has(parsed.category)
    ? parsed.category
    : 'Other';
  const hasSensitiveData = Boolean(parsed.hasSensitiveData);

  return {
    ocrText,
    caption,
    tags,
    category,
    hasSensitiveData,
    success: true,
  };
}

/**
 * Analyzes a screenshot with retries (up to 2 retries / 3 attempts) and sequential queuing.
 * If all retries fail, returns default empty fields and logs a clear warning without throwing.
 *
 * @param {Buffer} buffer - Screenshot image buffer
 * @param {string} mimeType - Image mime type (e.g. 'image/png')
 * @returns {Promise<Object>} { ocrText, caption, tags, category, hasSensitiveData, success }
 */
function analyzeScreenshotWithGemini(buffer, mimeType = 'image/png') {
  // Chain through sequential queue to avoid concurrent bursts and respect rate limits
  const task = async () => {
    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await callGeminiVision(buffer, mimeType);
        return result;
      } catch (err) {
        lastError = err;
        const errMsg = err.message || 'Unknown error';

        if (attempt < maxAttempts) {
          const delayMs = attempt * 1000;
          console.warn(
            `⚠️ [Gemini Vision] Attempt ${attempt}/${maxAttempts} failed (${errMsg}). Retrying in ${delayMs / 1000}s...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    console.warn(
      `⚠️ [Gemini Vision] Analysis could not complete after ${maxAttempts} attempts (${lastError?.message || 'Unknown error'}). Proceeding with empty fields.`
    );

    return {
      ocrText: '',
      caption: '',
      tags: [],
      category: 'Other',
      hasSensitiveData: false,
      success: false,
    };
  };

  // Enqueue task sequentially
  const nextInQueue = analysisQueue.then(task, task);
  analysisQueue = nextInQueue;
  return nextInQueue;
}

module.exports = {
  analyzeScreenshotWithGemini,
  callGeminiVision,
};
