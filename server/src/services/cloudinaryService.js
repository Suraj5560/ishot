const { Readable } = require('stream');
const { cloudinary, isConfigured, defaultFolder } = require('../config/cloudinary');

/**
 * Uploads an image buffer to Cloudinary without any paid add-ons.
 * Cloudinary is used solely for plain storage, CDN delivery, transformations, and deletion.
 *
 * @param {Buffer} buffer - File buffer from multer
 * @param {Object} options - Upload options override
 * @returns {Promise<Object>} Formatted result { publicId, url, width, height, format, bytes }
 */
async function uploadToCloudinary(buffer, options = {}) {
  if (!isConfigured) {
    console.warn('⚠️ [Cloudinary] Credentials missing. Operating in offline/simulated mode.');
    return {
      publicId: `findshot/local_${Date.now()}`,
      url: `data:image/png;base64,${buffer.toString('base64').slice(0, 100)}...`,
      width: 800,
      height: 600,
      format: 'png',
      bytes: buffer.length,
    };
  }

  // Plain upload without any add-ons (no ocr, detection, categorization, or auto_tagging)
  const uploadOptions = {
    folder: defaultFolder,
    resource_type: 'image',
    ...options,
  };

  try {
    const result = await uploadBuffer(buffer, uploadOptions);
    return {
      publicId: result.public_id,
      url: result.secure_url || result.url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (err) {
    console.error('❌ [Cloudinary] Upload failed:', err.message || err);
    throw err;
  }
}

/**
 * Helper to upload buffer using Cloudinary upload_stream wrapped in a Promise.
 */
function uploadBuffer(buffer, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    });

    Readable.from(buffer).pipe(uploadStream);
  });
}

/**
 * Deletes an image from Cloudinary by public ID.
 * @param {string} publicId
 * @returns {Promise<Object>}
 */
async function deleteFromCloudinary(publicId) {
  if (!isConfigured) {
    return { result: 'ok (local simulated mode)' };
  }
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`❌ [Cloudinary] Failed to delete asset ${publicId}:`, err.message);
    throw err;
  }
}

module.exports = {
  uploadToCloudinary,
  deleteFromCloudinary,
};
