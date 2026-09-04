import { cartApi } from '@/lib/cart/api';
import type { Cart } from '@/lib/cart/types';

/**
 * Apply Tokajo wallet on the server cart so place-order sees grandTotal ≈ 0.
 * Order-service rejects `paymentMethod: wallet` when remaining grandTotal > 0.
 */
export async function ensureWalletCoversCheckout(input: {
  /** Bill before wallet (grandTotal + already-applied wallet). */
  payableBeforeWallet: number;
  walletBalance: number;
}): Promise<Cart> {
  const need = Math.round(Math.max(0, input.payableBeforeWallet) * 100) / 100;
  if (need <= 0.009) {
    return cartApi.applyWallet();
  }

  if (input.walletBalance + 0.009 < need) {
    const short = Math.ceil((need - input.walletBalance) * 100) / 100;
    throw new Error(
      `Wallet does not cover the bill. Add ₹${short.toFixed(2)} or choose another payment method.`
    );
  }

  const cart = await cartApi.applyWallet(need);
  const remaining = Number(cart.total ?? 0);
  if (remaining > 0.05) {
    throw new Error(
      'Wallet does not cover the bill after apply. Top up or use split pay with UPI/card.'
    );
  }
  return cart;
}

export function payableBeforeWallet(bill: {
  grandTotal?: number;
  walletApplied?: number;
}): number {
  return Math.round(
    (Math.max(0, Number(bill.grandTotal) || 0) +
      Math.max(0, Number(bill.walletApplied) || 0)) *
      100,
  ) / 100;
}
