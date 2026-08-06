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
    const [key, value] = c.split('=');
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

export const getAge = (age: string): number | string => {
  const userAge = new Date().getFullYear() - new Date(age).getFullYear();
  if (userAge < 1) return '-';
  return userAge;
};
