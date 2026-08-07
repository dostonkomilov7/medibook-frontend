// MediBook utility functions - ported from frontend/src/main.ts

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
  const res = await fetch(`${apiUrl}/users/${userId}`);
  return res.json();
};

export const getRole = async (): Promise<string | null> => {
  if (typeof cookieStore !== 'undefined') {
    const role = await cookieStore.get('role');
    return role?.value ?? null;
  }
  return getCookie('role');
};

export const redirectIfAuth = async (router: { push: (path: string) => void }) => {
  const token = getCookie('accessToken');
  if (token) {
    const role = getCookie('role');
    if (role === 'Doctor') {
      router.push('/doctor-dashboard');
    } else if (role === 'User') {
      router.push('/user-dashboard');
    } else if (role === 'Admin') {
      router.push('/doctor-management');
    } else {
      router.push('/');
    }
  }
};

export const redirectIfNotAuth = (router: { push: (path: string) => void }) => {
  const token = getCookie('accessToken');
  if (!token) {
    router.push('/login');
  }
};

export const signOut = () => {
  deleteCookie('accessToken');
  deleteCookie('refreshToken');
  deleteCookie('userId');
  deleteCookie('role');
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
