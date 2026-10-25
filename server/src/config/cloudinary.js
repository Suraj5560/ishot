const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

cloudinary.config({
  cloud_name: (process.env.CLOUDINARY_CLOUD_NAME || '').trim(),
  api_key: (process.env.CLOUDINARY_API_KEY || '').trim(),
  api_secret: (process.env.CLOUDINARY_API_SECRET || '').trim(),
  secure: true,
});

if (!isConfigured) {
  console.warn(
    '⚠️ [Cloudinary] Warning: Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are not fully configured in .env'
  );
} else {
  console.log(`☁️ [Cloudinary] Configured for cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
}

module.exports = {
  cloudinary,
  isConfigured,
  defaultFolder: process.env.CLOUDINARY_FOLDER || 'findshot',
};
