/**
 * Cloudinary URL transformation utilities.
 * Generates optimized image delivery URLs on-the-fly.
 */

/**
 * Generates an optimized thumbnail URL using Cloudinary dynamic transformations:
 * f_auto (best format: WebP/AVIF), q_auto (intelligent compression), w_400.
 *
 * @param {string} url - Original image URL from Cloudinary or local fallback
 * @param {number} width - Target width in pixels (default 400)
 * @returns {string} Optimized URL
 */
export function getOptimizedThumbnailUrl(url, width = 400) {
  if (!url || typeof url !== 'string') return '';

  // If local base64 or placeholder URL, return as-is
  if (url.startsWith('data:') || !url.includes('res.cloudinary.com')) {
    return url;
  }

  // Cloudinary standard upload pattern
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) {
    return url;
  }

  // Check if transformations already applied
  const afterUpload = url.slice(uploadIndex + 8);
  if (afterUpload.startsWith('f_auto') || afterUpload.startsWith('c_')) {
    return url;
  }

  const transformation = `f_auto,q_auto,w_${width},c_limit`;
  return `${url.slice(0, uploadIndex)}/upload/${transformation}/${afterUpload}`;
}

/**
 * Generates high-res image URL optimized for modal viewing.
 * @param {string} url - Original URL
 * @returns {string} High-res optimized URL
 */
export function getOptimizedModalUrl(url, maxWidth = 1600) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:') || !url.includes('res.cloudinary.com')) {
    return url;
  }

  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const afterUpload = url.slice(uploadIndex + 8);
  if (afterUpload.startsWith('f_auto') || afterUpload.startsWith('c_')) {
    return url;
  }

  const transformation = `f_auto,q_auto,w_${maxWidth},c_limit`;
  return `${url.slice(0, uploadIndex)}/upload/${transformation}/${afterUpload}`;
}
