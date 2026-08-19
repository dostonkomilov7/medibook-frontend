// MediBook utility functions - ported from frontend/src/main.ts

// Always same-origin — proxied to the real backend by next.config.ts's
// rewrites(). A direct cross-site call to the backend's own URL would work
// for the request itself, but the browser silently drops the auth cookie
// from a cross-site Set-Cookie response (Safari ITP blocks it outright;
// Chrome does too with strict third-party-cookie settings). Routing every
// call through our own origin keeps the cookie first-party instead.
const apiUrl = '/api';

export { apiUrl };

export const setCookie = (name: string, value: string) => {
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=${value}; path=/`;
  }
};

export const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split('; ');
  for (const c of cookies) {
    const eq = c.indexOf('=');
    if (eq === -1) continue;
    const key = c.slice(0, eq);
    const value = c.slice(eq + 1);
    if (key === name) return value;
  }
  return null;
};

export const deleteCookie = (name: string) => {
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
};

export const getUserData = async () => {
  const userId = getCookie('userId');
  if (!userId) return null;
  const res = await fetch(`${apiUrl}/users/${userId}`, { credentials: 'include' });
  return res.json();
};

export const getRole = async (): Promise<string | null> => {
  if (typeof cookieStore !== 'undefined') {
    const role = await cookieStore.get('role');
    return role?.value ?? null;
  }
  return getCookie('role');
};

// "Am I logged in?" is decided from the "authenticated" cookie, not
// accessToken. accessToken/refreshToken are real HttpOnly cookies set by
// the backend — a script can never read them, and (this was a real bug)
// a script can't even overwrite them with a same-named non-HttpOnly
// cookie either; the browser silently no-ops that write to stop pages
// from stripping HttpOnly protection off an existing cookie.
//
// It also can't just be userId: that gets set as soon as *registration*
// starts (before OTP verification even happens), not only on a real
// login — checking userId here made verify-email think a brand-new,
// unverified signup was already fully authenticated and skip straight to
// the dashboard without ever showing the OTP form. "authenticated" is set
// only where a real session actually starts (login/activateUser/google),
// never on register.
export const AUTH_COOKIE = 'authenticated';

export const redirectIfAuth = async (router: { push: (path: string) => void }) => {
  const token = getCookie(AUTH_COOKIE);
  if (token) {
    const role = getCookie('role');
    if (role === 'Doctor') {
      router.push('/doctor-dashboard');
    } else if (role === 'User') {
      router.push('/user-dashboard');
    } else if (role === 'Admin') {
      router.push('/admin-dashboard');
    } else {
      router.push('/');
    }
  }
};

export const redirectIfNotAuth = (router: { push: (path: string) => void }) => {
  const token = getCookie(AUTH_COOKIE);
  if (!token) {
    router.push('/login');
  }
};

export const signOut = async () => {
  // deleteCookie('accessToken'/'refreshToken') never did anything real —
  // same HttpOnly protection that blocks setting them from JS also blocks
  // "clearing" them this way, so the real session cookie was never
  // actually invalidated server-side. Ask the backend to clear it instead.
  try {
    await fetch(`${apiUrl}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (e) {
    console.error('Failed to log out on the server:', e);
  }
  deleteCookie('accessToken');
  deleteCookie('refreshToken');
  deleteCookie('userId');
  deleteCookie('role');
  deleteCookie(AUTH_COOKIE);
  if (typeof localStorage !== 'undefined') localStorage.clear();
  window.location.href = '/';
};

export const strMonth = (date: string): string => {
  const month = date.split('-').at(1);
  const months: Record<string, string> = {
    '01': 'January', '02': 'February', '03': 'March', '04': 'April',
    '05': 'May', '06': 'June', '07': 'July', '08': 'August',
    '09': 'September', '10': 'October', '11': 'November', '12': 'December'
  };
  return months[month ?? ''] ?? '';
};

// Escapes a string for safe insertion into innerHTML. Use this for any
// backend-sourced value (names, notes, etc.) before interpolating it into
// a template string that gets assigned to innerHTML, to avoid stored XSS.
export const escapeHtml = (str: string): string => {
  if (typeof document === 'undefined') {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  }
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
};

export const getAge = (dob: string): number | string => {
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return '-';
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 1) return '-';
  return age;
};
