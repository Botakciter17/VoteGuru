import { getOrCreateVoterToken } from '../utils/voterToken';

const ADMIN_TOKEN_KEY = 'voting_guru_admin_token';
const ADMIN_USER_KEY = 'voting_guru_admin_user';

export function getAdminToken() {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminSession(token, user) {
  try {
    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user || {}));
    } else {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem(ADMIN_USER_KEY);
    }
  } catch {
    // ignore
  }
}

export function getAdminUser() {
  try {
    const raw = localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getCandidateBaseUrls() {
  const candidates = [''];
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '127.0.0.1';
    const port = window.location.port;
    if (port !== '8006') {
      candidates.push(`http://${host}:8006`);
      if (host !== '127.0.0.1') {
        candidates.push('http://127.0.0.1:8006');
      }
    }
  }
  return candidates;
}

async function fetchWithFallback(path, options) {
  const bases = getCandidateBaseUrls();
  let lastError = null;
  let lastResponse = null;

  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`, options);
      const ct = res.headers.get('content-type') || '';
      // Jika respons bukan JSON (mis. 404/502 HTML dari server lain atau proxy), coba langsung ke port 8006 Laravel
      if (!ct.includes('application/json') && base === '' && bases.length > 1) {
        lastResponse = res;
        continue;
      }
      return res;
    } catch (err) {
      lastError = err;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error('Tidak dapat terhubung ke server backend Laravel (pastikan server berjalan di port 8006).');
}

async function request(path, options = {}) {
  const voterToken = getOrCreateVoterToken();
  const adminToken = getAdminToken();

  const headers = {
    Accept: 'application/json',
    'X-Voter-Token': voterToken,
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (adminToken && path.startsWith('/api/admin')) {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

  const response = await fetchWithFallback(path, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let data = null;
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && path.startsWith('/api/admin') && path !== '/api/admin/login') {
      setAdminSession(null, null);
    }
    const firstValidationError =
      data?.errors && Object.values(data.errors)[0]
        ? Object.values(data.errors)[0][0]
        : null;
    const fallbackMsg =
      response.status === 419
        ? 'Sesi keamanan kedaluwarsa, silakan muat ulang halaman.'
        : response.status >= 500 && !data?.message
        ? 'Server backend belum merespons. Pastikan server Laravel aktif di port 8006.'
        : 'Terjadi kesalahan pada server.';
    const error = new Error(firstValidationError || data?.message || fallbackMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Publik
  getCategories: () => request('/api/categories'),
  getMyVotes: () => {
    const token = getOrCreateVoterToken();
    return request(`/api/my-votes?voter_token=${encodeURIComponent(token)}`);
  },
  submitVote: (payload) =>
    request('/api/votes', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        voter_token: getOrCreateVoterToken(),
      }),
    }),
  cancelVote: (categoryId) => {
    const token = getOrCreateVoterToken();
    return request(`/api/votes/${categoryId}?voter_token=${encodeURIComponent(token)}`, {
      method: 'DELETE',
    });
  },

  // Admin Auth
  adminLogin: (email, password) =>
    request('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  adminMe: () => request('/api/admin/me'),
  adminLogout: () =>
    request('/api/admin/logout', {
      method: 'POST',
    }),

  // Admin Teachers (CRUD + Foto Upload)
  adminGetTeachers: (includeTrashed = true) =>
    request(`/api/admin/teachers?include_trashed=${includeTrashed ? '1' : '0'}`),
  adminCreateTeacher: (formData) =>
    request('/api/admin/teachers', {
      method: 'POST',
      body: formData,
    }),
  adminUpdateTeacher: (id, formData) =>
    request(`/api/admin/teachers/${id}`, {
      method: 'POST',
      body: formData,
    }),
  adminDeleteTeacher: (id) =>
    request(`/api/admin/teachers/${id}`, {
      method: 'DELETE',
    }),
  adminRestoreTeacher: (id) =>
    request(`/api/admin/teachers/${id}/restore`, {
      method: 'POST',
    }),

  // Admin Categories (CRUD + Nominasi + Toggle)
  adminGetCategories: () => request('/api/admin/categories'),
  adminCreateCategory: (payload) =>
    request('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminUpdateCategory: (id, payload) =>
    request(`/api/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  adminToggleCategory: (id) =>
    request(`/api/admin/categories/${id}/toggle-status`, {
      method: 'PATCH',
    }),
  adminDeleteCategory: (id) =>
    request(`/api/admin/categories/${id}`, {
      method: 'DELETE',
    }),

  // Admin Stats, Export & Reset
  adminGetStats: () => request('/api/admin/stats'),
  adminResetVotes: (payload) =>
    request('/api/admin/votes/reset', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  adminDownloadCsv: async () => {
    const adminToken = getAdminToken();
    const res = await fetchWithFallback('/api/admin/stats/export', {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    if (!res.ok) {
      throw new Error('Gagal mengunduh file CSV statistik.');
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statistik-voting-guru-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
