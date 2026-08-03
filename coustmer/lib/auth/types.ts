export type AuthUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** user-service role, e.g. customer | delivery_partner | restaurant_owner */
  role?: string;
  emailVerified?: boolean;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
  message?: string;
};

export type RegisterPayload = {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  password: string;
  confirmPassword: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type OtpSendPayload = {
  emailOrPhone: string;
  purpose?: 'login' | 'register' | 'verification';
};

export type OtpVerifyPayload = {
  emailOrPhone: string;
  otp: string;
  purpose?: 'login' | 'register' | 'verification';
};

export type ForgotPasswordPayload = {
  email: string;
};

export type ResetPasswordPayload = {
  token: string;
  password: string;
  confirmPassword?: string;
};

export type ChangePasswordPayload = {
  oldPassword: string;
  newPassword: string;
  confirmPassword?: string;
};

export type MessageResponse = {
  message: string;
};

/** Normalize role strings from user-service. */
export function normalizeUserRole(role: unknown): string {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Customer app only. Partner accounts (delivery / restaurant / admin)
 * must use their own apps.
 */
export function isPartnerRole(role: unknown): boolean {
  const r = normalizeUserRole(role);
  if (!r) return false;
  if (r === 'customer' || r === 'user' || r === 'consumer') return false;
  return (
    r.includes('delivery') ||
    r.includes('rider') ||
    r.includes('driver') ||
    r.includes('restaurant') ||
    r.includes('vendor') ||
    r.includes('merchant') ||
    r.includes('owner') ||
    r === 'admin' ||
    r === 'partner'
  );
}

export function assertCustomerAccount(role: unknown): void {
  if (!isPartnerRole(role)) return;
  // Don't reveal that a partner account exists — treat as unknown user.
  throw new Error('User not found');
}
