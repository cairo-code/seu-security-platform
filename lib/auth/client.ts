import { useEffect } from 'react';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('seu_access_token');
}

export function getUser(): { id: string; name: string; role: string; universityId: string; points: number } | null {
  if (typeof window === 'undefined') return null;
  const userJson = window.localStorage.getItem('seu_user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function setAuth(accessToken: string, user: { id: string; name: string; role: string; universityId: string; points: number }): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('seu_access_token', accessToken);
  window.localStorage.setItem('seu_user', JSON.stringify(user));
}

export function clearAuth(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('seu_access_token');
  window.localStorage.removeItem('seu_user');
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1];
    if (!payload) return true;
    const decoded = atob(payload);
    const parsed = JSON.parse(decoded);
    const exp = parsed.exp;
    if (!exp) return true;
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}

export async function authedFetch(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
  const token = getAccessToken();
  if (!token || isTokenExpired(token)) {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    // Return a response that will be handled by the caller (though redirect should have happened)
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  return response;
}