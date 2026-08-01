import { fonts } from '@/constants/typography';

export function paymentMethodLabel(
  method: string,
  savedMethods?: {
    id: string;
    type?: string;
    upiId?: string;
    brand?: string;
    last4?: string;
  }[]
): string {
  switch (method) {
    case 'cod':
      return 'Pay on Delivery';
    case 'paytm_upi':
      return 'Paytm UPI';
    case 'gpay':
      return 'Google Pay';
    case 'wallet':
      return 'Tokajo Foods Wallet';
    case 'card':
      return 'Credit / Debit Card';
    default: {
      const saved = savedMethods?.find((m) => m.id === method);
      if (!saved) return 'Choose payment';
      if (saved.type === 'upi' && saved.upiId) return saved.upiId;
      if (saved.type === 'card' && saved.last4) {
        return `${(saved.brand || 'Card').toUpperCase()} •••• ${saved.last4}`;
      }
      return 'Saved payment';
    }
  }
}

export function paymentMethodHint(method: string): string {
  switch (method) {
    case 'cod':
      return 'Cash or UPI at delivery';
    case 'paytm_upi':
    case 'gpay':
      return 'Pay instantly via UPI';
    case 'wallet':
      return 'Pay from Tokajo Foods Wallet';
    case 'card':
      return 'Secure card payment';
    default:
      return 'Tap to change';
  }
}

export { fonts };
