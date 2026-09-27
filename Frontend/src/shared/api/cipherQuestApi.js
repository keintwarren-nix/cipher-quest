if (typeof window !== 'undefined') {
  const urlParams = new URLSearchParams(window.location.search);
  const apiParam = urlParams.get('api');
  if (apiParam) {
    let formatted = apiParam.trim();
    if (!formatted.endsWith('/api')) {
      formatted = formatted.replace(/\/+$/, '') + '/api';
    }
    localStorage.setItem('cq_api_base', formatted);
  }
}

const getBaseUrl = () => {
  if (typeof window !== 'undefined' && localStorage.getItem('cq_api_base')) {
    return localStorage.getItem('cq_api_base');
  }
  if (import.meta.env && import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  if (typeof window !== 'undefined' && window.__API_BASE__) {
    return window.__API_BASE__;
  }
  return (typeof window !== 'undefined' ? window.location.origin : '') + '/api';
};

const getToken = () => localStorage.getItem('cq_token');

const headers = () => ({
  'Content-Type': 'application/json',
  'bypass-tunnel-reminder': 'true',
  'Bypass-Tunnel-Reminder': 'true',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

async function request(method, path, body) {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

export const authApi = {
  register: (username, email, password) =>
    request('POST', '/auth/register', { username, email, password }),
  login: (username, password) =>
    request('POST', '/auth/login', { username, password }),
  resetPassword: (username, email, newPassword) =>
    request('POST', '/auth/reset-password', { username, email, newPassword }),
};

export const userApi = {
  getMyProfile:   ()                      => request('GET',    '/users/me'),
  deleteAccount:  ()                      => request('DELETE', '/users/me'),
  // DAY 2 additions
  getProgress:    ()                      => request('GET',    '/users/progress'),
  saveProgress:   (cipherType, difficultyTier, levelIndex) =>
    request('POST', '/users/progress', { cipherType, difficultyTier, levelIndex }),
  deductAttempt:  ()                      => request('POST', '/users/attempts/deduct'),
  getBadges:      ()                      => request('GET',    '/users/badges'),
};

export const fishingApi = {
  startSession:   ()               => request('POST', '/fishing/start'),
  cast:           (sessionId)      => request('POST', `/fishing/${sessionId}/cast`),
  submitAnswer:   (sessionId, ans) => request('POST', `/fishing/${sessionId}/submit`, { answer: ans }),
  endSession:     (sessionId)      => request('POST', `/fishing/${sessionId}/end`),
  getSummary:     (sessionId)      => request('GET',  `/fishing/${sessionId}/summary`),
  getLeaderboard: ()               => request('GET',  '/fishing/leaderboard'),
};

export const saveToken  = (token) => localStorage.setItem('cq_token', token);
export const clearToken = ()      => localStorage.removeItem('cq_token');
export const isLoggedIn = ()      => !!getToken();