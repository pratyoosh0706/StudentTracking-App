import { startProgress, doneProgress } from './progress';

const API_URL = 'https://studenttracking-app.onrender.com/api';

async function apiFetch(endpoint, options = {}) {
  startProgress();
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }

    return await response.json();
  } finally {
    doneProgress();
  }
}

export const api = {
  get: (endpoint) => apiFetch(endpoint),
  post: (endpoint, data) => apiFetch(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: (endpoint, data) => apiFetch(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (endpoint) => apiFetch(endpoint, { method: 'DELETE' }),
};

export default api;
