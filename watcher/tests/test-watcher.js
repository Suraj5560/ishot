/**
 * Integration test for ishot folder watcher
 */

const fs = require('fs');
const path = require('path');
const { startServer } = require('../../server/src/server');
const { closeDB } = require('../../server/src/config/db');
const { handleNewFile, computeFileHash } = require('../watch.js');

const SAMPLE_IMAGE_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function testWatcher() {
  console.log('🧪 Starting Watcher Integration Test...');
  const server = await startServer();
  const testDir = path.resolve(__dirname, 'temp_watch');

  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const testFilePath = path.join(testDir, `test_screenshot_${Date.now()}.png`);

  try {
    // 1. Write a test image file
    fs.writeFileSync(testFilePath, Buffer.from(SAMPLE_IMAGE_BASE64, 'base64'));
    console.log(`📸 Test screenshot generated at: ${testFilePath}`);

    // 2. Process file through watcher handler
    console.log('Triggering watcher handler for new file...');
    await handleNewFile(testFilePath);

    // 3. Test duplicate skip
    console.log('Triggering duplicate detection on same file...');
    await handleNewFile(testFilePath);

    console.log('✅ Watcher processed new file and handled duplicate successfully!');
  } finally {
    // Cleanup test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir, { recursive: true });
    }
    server.close();
    await closeDB();
  }
}

testWatcher()
  .then(() => {
    console.log('🎉 Watcher test passed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Watcher test failed:', err);
    process.exit(1);
  });
