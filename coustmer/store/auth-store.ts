import { create } from 'zustand';

import { authApi, SESSION_AUTH_TOKEN } from '@/lib/auth/api';
import {
  clearAuthStorage,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from '@/lib/auth/storage';
import type {
  AuthUser,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  LoginPayload,
  OtpSendPayload,
  OtpVerifyPayload,
  RegisterPayload,
  ResetPasswordPayload,
} from '@/lib/auth/types';
import { setUnauthorizedHandler } from '@/lib/auth/unauthorized';
import { getApiErrorMessage } from '@/lib/errors';
import { completeOnboarding } from '@/lib/onboarding';
import { getStoredSessionCookies } from '@/lib/session-cookies';
import { useDeliveryLocationStore } from '@/store/delivery-location-store';

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isHydrated: boolean;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  setSession: (token: string, user: AuthUser) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  sendOtp: (payload: OtpSendPayload) => Promise<string>;
  verifyOtp: (payload: OtpVerifyPayload) => Promise<void>;
  forgotPassword: (payload: ForgotPasswordPayload) => Promise<string>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<string>;
  verifyEmail: (token: string) => Promise<string>;
  changePassword: (payload: ChangePasswordPayload) => Promise<string>;
  resendEmailVerification: () => Promise<string>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  clearSession: () => Promise<void>;
};

async function persistSession(token: string, user: AuthUser) {
  await setToken(token);
  await setStoredUser(user);
  await completeOnboarding();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isHydrated: false,
  isLoading: false,

  hydrate: async () => {
    if (get().isHydrated) return;

    try {
      const [token, user] = await Promise.all([getToken(), getStoredUser()]);

      if (!token || !user) {
        useDeliveryLocationStore.getState().unbindUser();
        set({ token: null, user: null, isHydrated: true });
        return;
      }

      // Cookie sessions need stored cookies — otherwise treat as logged out.
      if (token === SESSION_AUTH_TOKEN) {
        const cookies = await getStoredSessionCookies();
        if (!cookies) {
          await clearAuthStorage();
          useDeliveryLocationStore.getState().unbindUser();
          set({ token: null, user: null, isHydrated: true });
          return;
        }
      }

      // Kick out partner accounts that somehow remained stored locally.
      if (authApi.isBlockedPartnerRole(user.role)) {
        await clearAuthStorage();
        useDeliveryLocationStore.getState().unbindUser();
        set({ token: null, user: null, isHydrated: true });
        return;
      }

      useDeliveryLocationStore.getState().bindUser(user.id);
      set({ token, user, isHydrated: true });
    } catch {
      await clearAuthStorage();
      useDeliveryLocationStore.getState().unbindUser();
      set({ token: null, user: null, isHydrated: true });
    }
  },

  setSession: async (token, user) => {
    await persistSession(token, user);
    set({ token, user });
    useDeliveryLocationStore.getState().bindUser(user.id);
    // Merge guest cart into authenticated cart (best-effort)
    try {
      const { cartApi } = await import('@/lib/cart/api');
      const { applyServerCartToStore } = await import('@/lib/cart/sync');
      const { clearCartSessionId } = await import('@/lib/cart/session');
      const merged = await cartApi.merge();
      applyServerCartToStore(merged);
      // Drop guest session so a future anonymous cart starts clean
      await clearCartSessionId();
    } catch {
      try {
        const { cartApi } = await import('@/lib/cart/api');
        const { applyServerCartToStore } = await import('@/lib/cart/sync');
        const { clearCartSessionId } = await import('@/lib/cart/session');
        const cart = await cartApi.getCart();
        applyServerCartToStore(cart);
        await clearCartSessionId();
      } catch {
        // keep local cart
      }
    }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const response = await authApi.register(payload);
      await get().setSession(response.token, response.user);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Registration failed'));
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login(payload);
      await get().setSession(response.token, response.user);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Login failed'));
    } finally {
      set({ isLoading: false });
    }
  },

  sendOtp: async (payload) => {
    set({ isLoading: true });
    try {
      const response = await authApi.sendOtp(payload);
      return response.message ?? 'OTP sent successfully';
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to send OTP'));
    } finally {
      set({ isLoading: false });
    }
  },

  verifyOtp: async (payload) => {
    set({ isLoading: true });
    try {
      const response = await authApi.verifyOtp(payload);
      await get().setSession(response.token, response.user);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'OTP verification failed'));
    } finally {
      set({ isLoading: false });
    }
  },

  forgotPassword: async (payload) => {
    set({ isLoading: true });
    try {
      const response = await authApi.forgotPassword(payload);
      return response.message ?? 'Password reset link sent to your email';
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to send reset link'));
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (payload) => {
    set({ isLoading: true });
    try {
      const response = await authApi.resetPassword(payload);
      return response.message ?? 'Password reset successfully';
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to reset password'));
    } finally {
      set({ isLoading: false });
    }
  },

  verifyEmail: async (token) => {
    set({ isLoading: true });
    try {
      const response = await authApi.verifyEmail(token);
      const currentUser = get().user;
      if (currentUser) {
        const updatedUser = { ...currentUser, emailVerified: true };
        await setStoredUser(updatedUser);
        set({ user: updatedUser });
      }
      return response.message ?? 'Email verified successfully';
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Email verification failed'));
    } finally {
      set({ isLoading: false });
    }
  },

  changePassword: async (payload) => {
    set({ isLoading: true });
    try {
      const response = await authApi.changePassword(payload);
      return response.message ?? 'Password changed successfully';
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to change password'));
    } finally {
      set({ isLoading: false });
    }
  },

  resendEmailVerification: async () => {
    set({ isLoading: true });
    try {
      const response = await authApi.resendEmailVerification();
      return response.message ?? 'Verification email sent';
    } catch (error) {
      throw new Error(
        getApiErrorMessage(error, 'Failed to resend verification email')
      );
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authApi.logout();
    } catch {
      // Clear local session even if server logout fails
    } finally {
      await get().clearSession();
      set({ isLoading: false });
    }
  },

  logoutAll: async () => {
    set({ isLoading: true });
    try {
      await authApi.logoutAll();
    } catch {
      // Clear local session even if server logout fails
    } finally {
      await get().clearSession();
      set({ isLoading: false });
    }
  },

  clearSession: async () => {
    useDeliveryLocationStore.getState().unbindUser();
    try {
      const { clearCartSessionId } = await import('@/lib/cart/session');
      const { useCartStore } = await import('@/store/cart-store');
      await clearCartSessionId();
      useCartStore.getState().clearCart();
    } catch {
      // ignore cart cleanup failures
    }
    await clearAuthStorage();
    set({ user: null, token: null });
  },
}));

setUnauthorizedHandler(() => useAuthStore.getState().clearSession());
