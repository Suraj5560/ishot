const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  '/api'
).replace(/\/$/, '');

export const TOKEN_STORAGE_KEY = 'ishot_token';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (e) {
    return null;
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to set stored token:', e);
  }
}

export function removeStoredToken() {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to remove stored token:', e);
  }
}

function handleAuthError() {
  removeStoredToken();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ishot:unauthorized'));
  }
}

function getAuthHeaders(extraHeaders = {}) {
  const token = getStoredToken();
  const headers = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Universal JSON request wrapper handling Bearer token, 401 auto-logout, and 429 quota errors.
 */
async function request(endpoint, options = {}) {
  const headers = getAuthHeaders(options.headers || {});
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    handleAuthError();
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Session expired or unauthenticated. Please log in again.');
  }

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Upload limit reached (max 25 screenshots per user).');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

/**
 * Authentication APIs
 */
export async function registerApi({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Registration failed with status ${res.status}`);
  }
  return data;
}

export async function loginApi({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Login failed with status ${res.status}`);
  }
  return data;
}

export async function getMeApi() {
  return request('/auth/me');
}

/**
 * Upload an image file with optional progress tracking and per-user token.
 */
export async function uploadScreenshotApi(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const token = getStoredToken();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/upload`);

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

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
        if (xhr.status === 401) {
          handleAuthError();
          reject(new Error(json.error || 'Session expired. Please log in again.'));
          return;
        }
        if (xhr.status === 429) {
          reject(new Error(json.error || 'Upload limit reached (max 25 screenshots per user).'));
          return;
        }
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

  return request(`/search?${query.toString()}`);
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

  return request(`/screenshots?${query.toString()}`);
}

/**
 * Get single screenshot by ID.
 */
export async function getScreenshotByIdApi(id) {
  return request(`/screenshots/${id}`);
}

/**
 * Delete screenshot by ID from Cloudinary and DB.
 */
export async function deleteScreenshotApi(id) {
  return request(`/screenshots/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Get library stats (category counts, top tags, total, maxUploads).
 */
export async function getStatsApi() {
  return request('/stats');
}
