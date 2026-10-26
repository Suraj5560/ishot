/**
 * Automated Test Suite: Per-User Authentication & Data Isolation
 *
 * Verifies:
 * 1. Requests without a token get 401 Unauthorized
 * 2. Registration and login validations (min 8 chars, generic login errors)
 * 3. User A cannot list, search, fetch, or delete User B's screenshot (404 / empty)
 * 4. The same file uploaded by two different users is saved for both
 * 5. Per-user deduplication works (duplicate only for the same user)
 * 6. Upload cap (MAX_UPLOADS_PER_USER) triggers 429 when exceeded
 */

const { startServer } = require('../src/server');
const { closeDB } = require('../src/config/db');
const User = require('../src/models/User');
const Screenshot = require('../src/models/Screenshot');

const SAMPLE_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const samplePngBuffer = Buffer.from(SAMPLE_PNG_BASE64, 'base64');

async function runAuthIsolationTests() {
  console.log('🧪 Starting ishot Authentication & Data Isolation Tests...\n');
  const server = await startServer();
  const port = server.address().port;
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

  let tokenA = '';
  let userA = null;
  let tokenB = '';
  let userB = null;
  let screenshotA = null;

  try {
    // 1. Unauthenticated requests get 401
    await assert('GET /api/screenshots without token returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/screenshots`);
      if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
      }
    });

    await assert('GET /api/search without token returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/search?q=test`);
      if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
      }
    });

    await assert('POST /api/upload without token returns 401', async () => {
      const res = await fetch(`${baseUrl}/api/upload`, { method: 'POST' });
      if (res.status !== 401) {
        throw new Error(`Expected 401, got ${res.status}`);
      }
    });

    // 2. Registration & Login
    await assert('Registration enforces password min 8 characters', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'short@test.com', password: '123' }),
      });
      if (res.status !== 400) {
        throw new Error(`Expected 400, got ${res.status}`);
      }
    });

    await assert('Register User A and User B successfully', async () => {
      const emailA = `user_a_${Date.now()}@test.com`;
      const resA = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailA, password: 'password123' }),
      });
      const dataA = await resA.json();
      if (resA.status !== 201 || !dataA.token) {
        throw new Error(`User A registration failed: ${JSON.stringify(dataA)}`);
      }
      tokenA = dataA.token;
      userA = dataA.user;

      const emailB = `user_b_${Date.now()}@test.com`;
      const resB = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailB, password: 'password123' }),
      });
      const dataB = await resB.json();
      if (resB.status !== 201 || !dataB.token) {
        throw new Error(`User B registration failed: ${JSON.stringify(dataB)}`);
      }
      tokenB = dataB.token;
      userB = dataB.user;
    });

    await assert('Login with wrong password returns 401 generic error', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userA.email, password: 'wrongpassword' }),
      });
      const data = await res.json();
      if (res.status !== 401 || data.error !== 'Invalid email or password') {
        throw new Error(`Expected 401 generic error, got: ${JSON.stringify(data)}`);
      }
    });

    await assert('GET /api/auth/me returns current user identity', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      });
      const data = await res.json();
      if (res.status !== 200 || data.user.email !== userA.email) {
        throw new Error(`Failed to fetch me: ${JSON.stringify(data)}`);
      }
    });

    // 3. User A uploads a screenshot
    await assert('User A uploads a screenshot', async () => {
      const blob = new Blob([samplePngBuffer], { type: 'image/png' });
      const form = new FormData();
      form.append('file', blob, 'user_a_screenshot.png');

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenA}` },
        body: form,
      });
      const data = await res.json();
      if (res.status !== 201 || !data.success) {
        throw new Error(`Upload failed: ${JSON.stringify(data)}`);
      }
      screenshotA = data.screenshot;
      if (screenshotA.userId.toString() !== userA._id.toString()) {
        throw new Error(`Screenshot userId mismatch: ${screenshotA.userId} vs ${userA._id}`);
      }
    });

    // 4. Data Isolation: User B cannot see, search, fetch or delete User A's screenshot
    await assert('User B cannot see User A screenshot in list (returns empty)', async () => {
      const res = await fetch(`${baseUrl}/api/screenshots`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const data = await res.json();
      if (res.status !== 200 || data.total !== 0 || data.screenshots.length !== 0) {
        throw new Error(`User B saw screenshots: ${JSON.stringify(data)}`);
      }
    });

    await assert('User B cannot search User A screenshot (returns 0 matches)', async () => {
      const query = screenshotA.caption ? screenshotA.caption.split(' ')[0] : 'background';
      const res = await fetch(`${baseUrl}/api/search?q=${query}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      const data = await res.json();
      if (res.status !== 200 || data.total !== 0) {
        throw new Error(`User B search found User A screenshot: ${JSON.stringify(data)}`);
      }
    });

    await assert('User B cannot fetch User A screenshot by ID (returns 404)', async () => {
      const res = await fetch(`${baseUrl}/api/screenshots/${screenshotA._id}`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      if (res.status !== 404) {
        throw new Error(`Expected 404, got ${res.status}`);
      }
    });

    await assert('User B cannot delete User A screenshot (returns 404)', async () => {
      const res = await fetch(`${baseUrl}/api/screenshots/${screenshotA._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenB}` },
      });
      if (res.status !== 404) {
        throw new Error(`Expected 404, got ${res.status}`);
      }

      // Verify screenshot A still exists in DB
      const verify = await Screenshot.findById(screenshotA._id);
      if (!verify) {
        throw new Error('Screenshot A was improperly deleted by User B!');
      }
    });

    // 5. Per-User Deduplication: Same file uploaded by User B is saved for User B
    let screenshotB = null;
    await assert('Same file uploaded by User B is saved (per-user deduplication)', async () => {
      const blob = new Blob([samplePngBuffer], { type: 'image/png' });
      const form = new FormData();
      form.append('file', blob, 'user_b_same_file.png');

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: form,
      });
      const data = await res.json();
      if (res.status !== 201 || data.duplicate === true) {
        throw new Error(`Expected 201 for User B, got status ${res.status}: ${JSON.stringify(data)}`);
      }
      screenshotB = data.screenshot;
      if (screenshotB.userId.toString() !== userB._id.toString()) {
        throw new Error('Screenshot B userId mismatch');
      }
    });

    await assert('Same file re-uploaded by User B is flagged as duplicate', async () => {
      const blob = new Blob([samplePngBuffer], { type: 'image/png' });
      const form = new FormData();
      form.append('file', blob, 'user_b_reupload.png');

      const res = await fetch(`${baseUrl}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenB}` },
        body: form,
      });
      const data = await res.json();
      if (res.status !== 200 || !data.duplicate) {
        throw new Error(`Expected 200 duplicate: true, got: ${JSON.stringify(data)}`);
      }
    });

    // 6. Upload Cap Enforcement (MAX_UPLOADS_PER_USER)
    await assert('Upload cap returns 429 when max limit is reached', async () => {
      const originalLimit = process.env.MAX_UPLOADS_PER_USER;
      process.env.MAX_UPLOADS_PER_USER = '1'; // Limit to 1 for test

      try {
        const crypto = require('crypto');
        // Generate a new unique file buffer
        const uniqueBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        );
        const blob = new Blob([uniqueBuffer], { type: 'image/png' });
        const form = new FormData();
        form.append('file', blob, 'exceed_cap.png');

        // User A already has 1 screenshot uploaded, so next upload must be rejected with 429
        const res = await fetch(`${baseUrl}/api/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokenA}` },
          body: form,
        });

        const data = await res.json();
        if (res.status !== 429 || !data.error.includes('Upload limit reached')) {
          throw new Error(`Expected 429 upload cap error, got status ${res.status}: ${JSON.stringify(data)}`);
        }
      } finally {
        process.env.MAX_UPLOADS_PER_USER = originalLimit;
      }
    });

    console.log(`\n🎉 All Authentication & Isolation Tests Passed: ${passed} passed, ${failed} failed.\n`);
  } finally {
    server.close();
    await closeDB();
  }

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAuthIsolationTests();
}

module.exports = runAuthIsolationTests;
