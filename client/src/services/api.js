const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Upload an image file with optional progress tracking.
 */
export async function uploadScreenshotApi(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/upload`);

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(json);
        } else {
          reject(new Error(json.error || `Upload failed with status ${xhr.status}`));
        }
      } catch (err) {
        reject(new Error(`Invalid server response: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error during upload. Check server connection.'));
    };

    xhr.send(formData);
  });
}

/**
 * Search screenshots with text query, tag, category, date filters, and pagination.
 */
export async function searchScreenshotsApi(params = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.tag) query.set('tag', params.tag);
  if (params.category && params.category !== 'All') query.set('category', params.category);
  if (params.from) query.set('from', params.from);
  if (params.to) query.set('to', params.to);
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);

  const res = await fetch(`${API_BASE}/search?${query.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Search failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Get paginated screenshots list (latest first).
 */
export async function getScreenshotsApi(params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.category && params.category !== 'All') query.set('category', params.category);
  if (params.tag) query.set('tag', params.tag);

  const res = await fetch(`${API_BASE}/screenshots?${query.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch screenshots: ${res.status}`);
  }
  return res.json();
}

/**
 * Get single screenshot by ID.
 */
export async function getScreenshotByIdApi(id) {
  const res = await fetch(`${API_BASE}/screenshots/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch screenshot: ${res.status}`);
  }
  return res.json();
}

/**
 * Delete screenshot by ID from Cloudinary and DB.
 */
export async function deleteScreenshotApi(id) {
  const res = await fetch(`${API_BASE}/screenshots/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Delete failed with status ${res.status}`);
  }
  return res.json();
}

/**
 * Get library stats (category counts, top tags, total).
 */
export async function getStatsApi() {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch stats: ${res.status}`);
  }
  return res.json();
}
