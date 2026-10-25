const { app, startServer } = require('../src/server');
const { closeDB } = require('../src/config/db');

// Valid 1x1 PNG image buffer
const SAMPLE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

async function testUpload() {
  console.log('🧪 Testing POST /api/upload endpoint...');
  const server = await startServer();
  const port = server.address().port;
  const url = `http://localhost:${port}/api/upload`;

  try {
    const blob1 = new Blob([SAMPLE_PNG], { type: 'image/png' });
    const form1 = new FormData();
    form1.append('file', blob1, 'sample_screenshot.png');

    const res = await fetch(url, {
      method: 'POST',
      body: form1,
    });

    const data = await res.json();
    console.log('Upload response status:', res.status);
    console.log('Upload response body:', data);

    if (res.status !== 201 || !data.success) {
      throw new Error(`Upload failed: ${JSON.stringify(data)}`);
    }

    console.log('✅ Initial upload passed!');

    // Test duplicate upload (should detect duplicate and return status 200 with duplicate: true)
    console.log('Testing duplicate upload detection...');
    const blob2 = new Blob([SAMPLE_PNG], { type: 'image/png' });
    const form2 = new FormData();
    form2.append('file', blob2, 'sample_screenshot_copy.png');

    const res2 = await fetch(url, {
      method: 'POST',
      body: form2,
    });

    const data2 = await res2.json();
    console.log('Duplicate response status:', res2.status);
    console.log('Duplicate response body:', data2);

    if (res2.status !== 200 || !data2.duplicate) {
      throw new Error(`Duplicate detection failed: ${JSON.stringify(data2)}`);
    }

    console.log('✅ Duplicate detection passed!');
  } finally {
    server.close();
    await closeDB();
  }
}

testUpload()
  .then(() => {
    console.log('🎉 All upload tests passed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Upload test failed:', err);
    process.exit(1);
  });
