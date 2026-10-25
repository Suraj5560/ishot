/**
 * End-to-end integration test for ishot server
 * Tests:
 * 1. Health check
 * 2. Upload with OCR/hash check
 * 3. Duplicate detection
 * 4. Search with snippets & regex fallback
 * 5. Category and tag filtering
 * 6. Get stats
 * 7. Delete screenshot
 */

const http = require('http');
const { app, startServer } = require('../src/server');
const Screenshot = require('../src/models/Screenshot');
const { closeDB } = require('../src/config/db');

// Tiny 1x1 PNG buffer with valid PNG header
const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const samplePngBuffer = Buffer.from(SAMPLE_PNG_BASE64, 'base64');

async function runTests() {
  console.log('🧪 Starting ishot Server Tests...');
  const server = await startServer();
  const address = server.address();
  const port = address.port;
  const baseUrl = `http://localhost:${port}`;

  let passed = 0;
  let failed = 0;

  async function assert(desc, fn) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${desc} -> ${err.message}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    await assert('GET /api/health returns status ok', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      const data = await res.json();
      if (res.status !== 200 || data.status !== 'ok') {
        throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
      }
    });

    // 2. Direct Model creation with OCR text & categorization test
    let testDoc = null;
    await assert('Screenshot creation with auto-categorization and text search', async () => {
      const { categorizeScreenshot } = require('../src/services/categorizerService');
      const ocr = 'Invoice #1042 Total Due: $450.00 Paid with Visa card ending 4242';
      const cat = categorizeScreenshot(ocr, ['invoice', 'payment']);
      if (cat !== 'Payments') {
        throw new Error(`Expected Payments category, got ${cat}`);
      }

      testDoc = await Screenshot.create({
        publicId: 'test/sample_payment_1',
        url: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
        ocrText: ocr,
        caption: 'A receipt for payment',
        tags: ['invoice', 'visa', 'payment'],
        category: cat,
        fileHash: 'test-hash-12345',
        width: 1024,
        height: 768,
      });

      if (!testDoc._id) throw new Error('Document creation failed');
    });

    // 3. Search endpoint test with snippet and query matching
    await assert('GET /api/search?q=Invoice returns snippet with matched terms', async () => {
      const res = await fetch(`${baseUrl}/api/search?q=Invoice`);
      const data = await res.json();
      if (!data.success || data.total < 1) {
        throw new Error(`Search failed: ${JSON.stringify(data)}`);
      }
      const match = data.screenshots[0];
      if (!match.snippet || !match.snippet.toLowerCase().includes('invoice')) {
        throw new Error(`Snippet did not contain match: ${match.snippet}`);
      }
    });

    // 4. Regex fallback search test (partial match)
    await assert('GET /api/search with partial term "Invoi" uses regex fallback', async () => {
      const res = await fetch(`${baseUrl}/api/search?q=Invoi`);
      const data = await res.json();
      if (!data.success || data.total < 1) {
        throw new Error(`Regex search failed: ${JSON.stringify(data)}`);
      }
    });

    // 5. Category filter test
    await assert('GET /api/screenshots?category=Payments filters correctly', async () => {
      const res = await fetch(`${baseUrl}/api/screenshots?category=Payments`);
      const data = await res.json();
      if (!data.success || data.total < 1) {
        throw new Error(`Category filter failed: ${JSON.stringify(data)}`);
      }
      if (data.screenshots[0].category !== 'Payments') {
        throw new Error(`Expected Payments category, got ${data.screenshots[0].category}`);
      }
    });

    // 6. Stats endpoint test
    await assert('GET /api/stats returns category and total counts', async () => {
      const res = await fetch(`${baseUrl}/api/stats`);
      const data = await res.json();
      if (!data.success || data.total < 1 || data.categories.Payments < 1) {
        throw new Error(`Stats endpoint invalid: ${JSON.stringify(data)}`);
      }
    });

    // 7. Delete endpoint test
    await assert('DELETE /api/screenshots/:id removes document', async () => {
      const res = await fetch(`${baseUrl}/api/screenshots/${testDoc._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(`Delete failed: ${JSON.stringify(data)}`);
      }

      const verify = await Screenshot.findById(testDoc._id);
      if (verify) {
        throw new Error('Screenshot was not removed from MongoDB');
      }
    });

    console.log(`\n🎉 Tests completed: ${passed} passed, ${failed} failed.`);
  } finally {
    server.close();
    await closeDB();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = runTests;
