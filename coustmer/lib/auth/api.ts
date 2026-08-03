import axios from 'axios';

import { api, assertApiBaseUrl } from '@/lib/api';
import type {
  AuthResponse,
  AuthUser,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  MessageResponse,
  OtpSendPayload,
  OtpVerifyPayload,
  RegisterPayload,
  ResetPasswordPayload,
} from '@/lib/auth/types';
import {
  assertCustomerAccount,
  isPartnerRole,
  normalizeUserRole,
} from '@/lib/auth/types';

/** Live API mounts auth under user-service (not /auth at root). */
const AUTH_BASE = '/api/v1/user-service/auth';
const USERS_ME = '/api/v1/user-service/users/me';

/** Cookie session auth — no JWT in response body. */
export const SESSION_AUTH_TOKEN = 'session';

function mapApiUser(data: Record<string, unknown>): AuthUser {
  return {
    id: String(data._id ?? data.id ?? ''),
    email: String(data.email ?? ''),
    firstName: (data.firstName as string) || undefined,
    lastName: (data.lastName as string) || undefined,
    phone: (data.phone as string) || undefined,
    role:
      normalizeUserRole(
        data.role ?? data.userType ?? data.type ?? data.accountType
      ) || undefined,
    emailVerified: Boolean(data.isEmailVerified ?? data.emailVerified ?? false),
  };
}

function normalizeAuthResponse(data: unknown): AuthResponse {
  const payload = data as Record<string, unknown>;
  const nested = payload.data as Record<string, unknown> | undefined;

  const token =
    (payload.token as string) ||
    (payload.accessToken as string) ||
    (payload.access_token as string) ||
    (nested?.token as string) ||
    (nested?.accessToken as string) ||
    SESSION_AUTH_TOKEN;

  const userSource = (nested?.user ??
    nested ??
    payload.user ??
    payload) as Record<string, unknown>;
  const user = mapApiUser(userSource);

  if (!user.id || !user.email) {
    throw new Error('Invalid authentication response from server');
  }

  return { token, user, message: payload.message as string | undefined };
}

function normalizeMessageResponse(data: unknown): MessageResponse {
  const payload = data as { message?: string };
  return { message: payload.message ?? 'Success' };
}

function extractErrorMessage(data: unknown, fallback: string): string {
  const payload = data as {
    message?: string;
    error?: string;
    errors?: Record<string, string[]>;
  } | null;

  if (payload?.errors) {
    const details = Object.values(payload.errors).flat().filter(Boolean);
    if (details.length > 0) {
      return details.join('\n');
    }
  }

  return payload?.message || payload?.error || fallback;
}

async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
  } = {}
): Promise<T> {
  const { method = 'GET', body } = options;

  assertApiBaseUrl();

  try {
    const response = await api.request<T>({
      url: path,
      method,
      data: body,
      withCredentials: true,
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (!error.response) {
        throw new Error(
          'Network request failed. Check your internet connection and try again.'
        );
      }

      const message = extractErrorMessage(
        error.response.data,
        `Request failed (${error.response.status})`
      );

      if (message.toLowerCase().includes('csrf')) {
        throw new Error(
          'Security token expired. Close and reopen the app, then try again.'
        );
      }

      if (message.includes('generatePasswordResetToken')) {
        throw new Error(
          'Password reset failed on the server. Ask backend to fix User.generatePasswordResetToken in AuthService.forgotPassword (user query must return a Mongoose document, not a plain object).'
        );
      }

      throw new Error(message);
    }

    throw error;
  }
}

/** Best-effort logout so a rejected partner session is not left open. */
async function revokeSessionQuietly() {
  try {
    await apiRequest<unknown>(`${AUTH_BASE}/logout`, { method: 'POST' });
  } catch {
    // ignore
  }
}

/**
 * Ensure the authenticated account is a customer.
 * If login response omitted role, fetch /users/me.
 */
async function ensureCustomerAuth(
  response: AuthResponse
): Promise<AuthResponse> {
  let role = response.user.role;

  if (!role) {
    try {
      const me = await apiRequest<{
        data?: Record<string, unknown>;
        role?: string;
      }>(USERS_ME);
      const source = (me.data ?? me) as Record<string, unknown>;
      role =
        normalizeUserRole(
          source.role ?? source.userType ?? source.type ?? source.accountType
        ) || undefined;
    } catch {
      // If profile fetch fails, keep going with whatever we have.
    }
  }

  try {
    assertCustomerAccount(role);
  } catch (error) {
    await revokeSessionQuietly();
    throw error;
  }

  return {
    ...response,
    user: {
      ...response.user,
      role: role || 'customer',
    },
  };
}

export const authApi = {
  register: async (payload: RegisterPayload) => {
    const data = await apiRequest<unknown>(`${AUTH_BASE}/register`, {
      method: 'POST',
      body: {
        ...payload,
        // Always register as a customer in this app.
        role: 'customer',
      },
    });
    return ensureCustomerAuth(normalizeAuthResponse(data));
  },

  login: async (payload: LoginPayload) => {
    const data = await apiRequest<unknown>(`${AUTH_BASE}/login`, {
      method: 'POST',
      body: payload,
    });
    return ensureCustomerAuth(normalizeAuthResponse(data));
  },

  sendOtp: async (payload: OtpSendPayload) => {
    const data = await apiRequest<unknown>(`${AUTH_BASE}/otp/send`, {
      method: 'POST',
      body: {
        identifier: payload.emailOrPhone,
        purpose: payload.purpose ?? 'login',
      },
    });
    return normalizeMessageResponse(data);
  },

  verifyOtp: async (payload: OtpVerifyPayload) => {
    const data = await apiRequest<unknown>(`${AUTH_BASE}/otp/verify`, {
      method: 'POST',
      body: {
        identifier: payload.emailOrPhone,
        otp: payload.otp,
        purpose: payload.purpose ?? 'login',
      },
    });
    return ensureCustomerAuth(normalizeAuthResponse(data));
  },

  forgotPassword: async (payload: ForgotPasswordPayload) => {
    const data = await apiRequest<unknown>(`${AUTH_BASE}/forgot-password`, {
      method: 'POST',
      body: payload,
    });
    return normalizeMessageResponse(data);
  },

  resetPassword: async (payload: ResetPasswordPayload) => {
    const data = await apiRequest<unknown>(`${AUTH_BASE}/reset-password`, {
      method: 'POST',
      body: {
        token: payload.token,
        password: payload.password,
        confirmPassword: payload.confirmPassword ?? payload.password,
      },
    });
    return normalizeMessageResponse(data);
  },

  verifyEmail: async (token: string) => {
    const data = await apiRequest<unknown>(
      `${AUTH_BASE}/email/verify/${token}`
    );
    return normalizeMessageResponse(data);
  },

  logout: async () => {
    const data = await apiRequest<unknown>(`${AUTH_BASE}/logout`, {
      method: 'POST',
    });
    return normalizeMessageResponse(data);
  },

  logoutAll: async () => {
    const data = await apiRequest<unknown>(`${AUTH_BASE}/logout-all`, {
      method: 'POST',
    });
    return normalizeMessageResponse(data);
  },

  changePassword: async (payload: ChangePasswordPayload) => {
    const data = await apiRequest<unknown>(`${AUTH_BASE}/change-password`, {
      method: 'POST',
      body: {
        currentPassword: payload.oldPassword,
        newPassword: payload.newPassword,
        confirmPassword: payload.confirmPassword ?? payload.newPassword,
      },
    });
    return normalizeMessageResponse(data);
  },

  resendEmailVerification: async () => {
    const data = await apiRequest<unknown>(`${AUTH_BASE}/email/send-verify`, {
      method: 'POST',
    });
    return normalizeMessageResponse(data);
  },

  /** True when a stored/session user must not use the customer app. */
  isBlockedPartnerRole: isPartnerRole,
};
