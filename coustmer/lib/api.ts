import axios, { AxiosHeaders } from 'axios';
import { Platform } from 'react-native';

import { getToken } from '@/lib/auth/storage';
import { notifyUnauthorized } from '@/lib/auth/unauthorized';
import {
  clearSessionCookies,
  getStoredSessionCookies,
  persistSessionCookies,
} from '@/lib/session-cookies';

/** Cookie session marker stored when API uses Set-Cookie instead of JWT. */
const SESSION_AUTH_TOKEN = 'session';

const DEFAULT_API_BASE_URL = 'http://api.viharfood.in';

function resolveApiBaseUrl(): string {
  /**
   * Expo web runs on localhost. The gateway CORS allowlist rejects that Origin
   * (returns 500), so web uses same-origin requests and Metro proxies to the API.
   * Native (Android/iOS) keeps calling the gateway directly.
   */
  if (Platform.OS === 'web') {
    return '';
  }

  const raw = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (raw && /^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '');
  }
  return DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

export function assertApiBaseUrl(): void {
  if (Platform.OS === 'web') return;
  if (!/^https?:\/\//i.test(API_BASE_URL)) {
    throw new Error(
      'API URL is not configured. Add EXPO_PUBLIC_API_URL=http://api.viharfood.in to .env and restart Expo with npm run start:clear.'
    );
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: 25000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

function csrfFetchErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data as { message?: string } | undefined;
    const serverMessage = data?.message || '';

    if (
      status === 500 &&
      serverMessage.toLowerCase().includes('cors')
    ) {
      return (
        'Web login is blocked by API CORS (localhost not allowed). ' +
        'Restart Expo after the Metro proxy change, or test on Android/iOS. ' +
        'Backend should allow http://localhost:8081 for local web.'
      );
    }

    if (!error.response) {
      return Platform.OS === 'web'
        ? 'Could not reach API from the browser. Restart Expo with a cleared cache (npx expo start --web --clear) so the Metro API proxy loads.'
        : 'Network request failed. Check your internet and try again.';
    }

    return serverMessage || `CSRF request failed (${status})`;
  }

  if (error instanceof Error) return error.message;
  return 'Could not get security token';
}

/** Fetch CSRF via axios so the cookie jar is shared with later POSTs on mobile. */
export async function refreshCsrfToken(force = false): Promise<string> {
  if (!force && csrfToken) return csrfToken;
  if (csrfPromise) return csrfPromise;

  csrfPromise = (async () => {
    try {
      const { data } = await api.get<{ csrfToken?: string; success?: boolean }>(
        '/api/csrf-token'
      );

      const token = data?.csrfToken;
      if (!token) {
        throw new Error('Server did not return a security token');
      }

      csrfToken = token;
      return token;
    } catch (error) {
      csrfToken = null;
      throw new Error(csrfFetchErrorMessage(error));
    } finally {
      csrfPromise = null;
    }
  })();

  return csrfPromise;
}

export function clearCsrfToken(): void {
  csrfToken = null;
}

export async function clearApiSession(): Promise<void> {
  clearCsrfToken();
  await clearSessionCookies();
}

/** Quick connectivity check — call from auth screens on mount. */
export async function checkApiConnection(): Promise<boolean> {
  try {
    const response = await api.get('/health', { timeout: 10000 });
    return response.status >= 200 && response.status < 300;
  } catch {
    return false;
  }
}

function applyCsrfHeader(headers: AxiosHeaders, token: string) {
  headers.set('X-CSRF-Token', token);
}

function isAuthFailure(
  status: number | undefined,
  message: string,
  code?: string,
): boolean {
  if (
    status === 403 &&
    code &&
    ['ACCOUNT_SUSPENDED', 'ACCOUNT_BLOCKED', 'ACCOUNT_DEACTIVATED'].includes(code)
  ) {
    return true;
  }
  if (status !== 401 && status !== 403) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes('authentication') ||
    lower.includes('unauthorized') ||
    lower.includes('log in') ||
    lower.includes('not authenticated') ||
    lower.includes('invalid token') ||
    lower.includes('session') ||
    lower.includes('suspended') ||
    lower.includes('blocked') ||
    lower.includes('deactivated')
  );
}

api.interceptors.request.use(async (config) => {
  const headers = AxiosHeaders.from(config.headers);
  const authToken = await getToken();
  const sessionCookies = await getStoredSessionCookies();

  if (authToken && authToken !== SESSION_AUTH_TOKEN) {
    headers.set('Authorization', `Bearer ${authToken}`);
  } else if (sessionCookies && Platform.OS !== 'web') {
    // Browsers forbid setting Cookie manually; same-origin Metro proxy uses real cookies.
    headers.set('Cookie', sessionCookies);
  }

  const method = config.method?.toLowerCase();
  const isMutating = method && MUTATING_METHODS.has(method);

  if (isMutating) {
    const token = await refreshCsrfToken(true);
    applyCsrfHeader(headers, token);
  }

  config.headers = headers;
  config.withCredentials = true;
  return config;
});

api.interceptors.response.use(
  async (response) => {
    await persistSessionCookies(response);
    return response;
  },
  async (error) => {
    const original = error.config;
    const message =
      error.response?.data?.message ?? error.response?.data?.error ?? '';
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    const status = error.response?.status;

    const isCsrfError =
      typeof message === 'string' &&
      message.toLowerCase().includes('csrf') &&
      original &&
      !original._csrfRetry;

    if (isCsrfError) {
      original._csrfRetry = true;
      clearCsrfToken();
      const token = await refreshCsrfToken(true);
      const headers = AxiosHeaders.from(original.headers);
      applyCsrfHeader(headers, token);
      original.headers = headers;
      original.withCredentials = true;
      return api(original);
    }

    if (
      original &&
      !original._authLogout &&
      isAuthFailure(status, String(message), code)
    ) {
      original._authLogout = true;
      await clearApiSession();
      await notifyUnauthorized();
    }

    return Promise.reject(error);
  }
);

declare module 'axios' {
  export interface AxiosRequestConfig {
    _csrfRetry?: boolean;
    _authLogout?: boolean;
  }
}
