const fs = require('fs');
const path = require('path');

const sampleDir = path.resolve(__dirname, 'sample-screenshots');
if (!fs.existsSync(sampleDir)) {
  fs.mkdirSync(sampleDir, { recursive: true });
}

// 1x1 valid PNG images with unique bytes
const pngs = [
  {
    name: 'sample_payment_receipt.png',
    b64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  },
  {
    name: 'sample_chat_discord.png',
    b64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  },
  {
    name: 'sample_study_notes.png',
    b64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwGAqVb7awAAAABJRU5ErkJggg==',
  },
];

for (const p of pngs) {
  const filePath = path.join(sampleDir, p.name);
  fs.writeFileSync(filePath, Buffer.from(p.b64, 'base64'));
  console.log('Created sample image:', filePath);
}
