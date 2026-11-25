const TOKEN_KEY = 'voting_guru_voter_token';

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

/**
 * Mengambil atau membuat voter_token unik yang disimpan
 * di localStorage dan cookie sesuai spesifikasi PRD Bab 6.
 */
export function getOrCreateVoterToken() {
  let token = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }

  if (!token) {
    token = getCookie(TOKEN_KEY);
  }

  if (!token || token.length < 16) {
    token = generateUUID();
  }

  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
  setCookie(TOKEN_KEY, token, 365);

  return token;
}
