import { setAccessToken } from './api';

const LS_KEY = 'rollcraft_access_token';

export function loadAccessToken() {
  const t = localStorage.getItem(LS_KEY);
  if (t) setAccessToken(t);
  return t;
}

export function saveAccessToken(token: string | null) {
  if (token) localStorage.setItem(LS_KEY, token);
  else localStorage.removeItem(LS_KEY);
  setAccessToken(token);
}

