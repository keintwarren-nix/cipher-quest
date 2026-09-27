// Support setting API via URL parameter (e.g. ?api=https://mean-beers-win.loca.lt/api) or localStorage
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
  // Small fetch wrapper with network error handling and clearer messages.
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(url, {
      method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    clearTimeout(timeout);

    // attempt to parse JSON safely
    const text = await res.text().catch(() => '');
    const data = text ? JSON.parse(text) : {};

    if (!res.ok) {
      const msg = data && data.message ? data.message : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Network timeout: backend did not respond', { cause: err });
    // map typical network failure into a friendlier message
    throw new Error(err.message || 'Network error: could not reach backend', { cause: err });
  }
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
  getTutorialPreferences: ()              => request('GET',    '/users/preferences/tutorial'),
  saveTutorialPreference: (cipherType, dismissed) =>
    request('POST', '/users/preferences/tutorial', { cipherType, dismissed }),
};

export const fishingApi = {
  startSession:   ()               => request('POST', '/fishing/start'),
  cast:           (sessionId)      => request('POST', `/fishing/${sessionId}/cast`),
  submitAnswer:   (sessionId, ans) => request('POST', `/fishing/${sessionId}/submit`, { answer: ans }),
  endSession:     (sessionId)      => request('POST', `/fishing/${sessionId}/end`),
  getSummary:     (sessionId)      => request('GET',  `/fishing/${sessionId}/summary`),
  getLeaderboard: ()               => request('GET',  '/fishing/leaderboard'),
};

export const leaderboardApi = {
  getGlobalLeaderboard: (scope = 'overall') =>
    request('GET', `/leaderboard?scope=${encodeURIComponent(scope)}`),
};

// ── SCORING SYSTEM (server-authoritative) ────────────────────────────
// The client never submits score, streak, multiplier, or completion time.
// The backend computes and validates everything from its own session data.
export const scoringApi = {
  // Begin a stage attempt; returns { sessionId, startedAt, ... }
  startStage: (cipherType, difficultyTier, levelIndex) =>
    request('POST', '/scoring/start', { cipherType, difficultyTier, levelIndex }),
  // Complete successfully; returns score, streak, multiplier, time, total, bests
  completeStage: (sessionId) =>
    request('POST', `/scoring/complete/${sessionId}`),
  // Register a failure; resets the streak, keeps the total score
  failStage: (sessionId) =>
    request('POST', `/scoring/fail/${sessionId}`),
  // Per-stage leaderboard: category = 'score' | 'time'
  getStageLeaderboard: (cipherType, difficultyTier, levelIndex, category = 'score') =>
    request('GET', `/scoring/leaderboard?cipherType=${encodeURIComponent(cipherType)}`
      + `&difficultyTier=${encodeURIComponent(difficultyTier)}&levelIndex=${levelIndex}`
      + `&category=${encodeURIComponent(category)}`),
};

export const saveToken  = (token) => localStorage.setItem('cq_token', token);
export const clearToken = ()      => localStorage.removeItem('cq_token');
export const isLoggedIn = ()      => !!getToken();