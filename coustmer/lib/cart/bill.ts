/** Normalized bill breakdown from GET /cart/bill (CartBillDto). */

export type BillChargeLine = {
  key: string;
  label: string;
  value: number;
  hint?: string;
};

export type BillBreakdown = {
  itemsSubtotal: number;
  deliveryFee: number;
  deliveryFeeBase: number;
  surgeMultiplier: number;
  surgeExtra: number;
  rainFee: number;
  packagingCharge: number;
  /** Restaurant GST on food subtotal */
  restaurantTaxAmount: number;
  taxAmount: number;
  taxRate: number;
  platformFee: number;
  tipAmount: number;
  discount: number;
  couponCode: string | null;
  walletApplied: number;
  loyaltyDiscount: number;
  grandTotal: number;
  deliveryFeeMax: number;
  deliveryDistanceKm: number | null;
  deliveryDistanceCharge: number;
  deliveryFeePerKm: number;
  /** Collapsed "Taxes & charges" = restaurant taxes + platform fee */
  taxesAndChargesTotal: number;
  chargeLines: BillChargeLine[];
  superFreeDelivery: boolean;
  autoFreeDelivery: boolean;
  autoFreeDeliveryMinOrder: number | null;
  autoFreeDeliveryTitle: string | null;
  autoFreeDeliveryUpsellMinOrder: number | null;
  autoFreeDeliveryAmountNeeded: number | null;
  deliveryType: 'delivery' | 'takeaway';
  /** True when values came from GET /cart/bill (validated), not local fallback */
  billReady: boolean;
};

function num(...values: unknown[]): number {
  for (const v of values) {
    if (v === undefined || v === null || v === '') continue;
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pickNullableNumber(...values: unknown[]): number | null {
  for (const v of values) {
    if (v === undefined || v === null || v === '') continue;
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Default when cart-service image not rebuilt yet (matches PLATFORM_FEE env default). */
const FALLBACK_PLATFORM_FEE = 12;
/** Matches cart-service BASE_DELIVERY_FEE default. */
export const DEFAULT_DELIVERY_FEE = 15;
export const DEFAULT_DELIVERY_FEE_MAX = 50;

export function mapBillBreakdown(raw: Record<string, unknown>): BillBreakdown {
  const itemsSubtotal = num(
    raw.itemsSubtotal,
    raw.subtotal,
    raw.itemTotal,
    raw.itemsTotal
  );
  const packagingCharge = num(raw.packagingCharge, raw.packingCharge);
  const deliveryFeeBase = num(raw.deliveryFeeBase, raw.baseDeliveryFee);
  const deliveryFee = num(raw.deliveryFee, raw.deliveryCharge);
  const deliveryDistanceKm = pickNullableNumber(raw.deliveryDistanceKm, raw.distanceKm);
  const deliveryDistanceCharge = num(raw.deliveryDistanceCharge, raw.distanceCharge);
  const deliveryFeePerKm = num(raw.deliveryFeePerKm, raw.perKm) || 4;
  const deliveryFeeMax = num(raw.deliveryFeeMax, raw.maxDeliveryFee) || DEFAULT_DELIVERY_FEE_MAX;
  const surgeMultiplier = Math.max(1, num(raw.surgeMultiplier, raw.surge) || 1);
  const rainFee = num(raw.rainFee, raw.rainCharge);
  const taxRate = num(raw.taxRate, raw.gstRate);
  const restaurantTaxAmount = num(
    raw.restaurantTaxAmount,
    raw.taxAmount,
    raw.tax,
    raw.taxes,
    raw.gst
  );
  let platformFee = num(raw.platformFee, raw.platformCharge);
  if (platformFee <= 0 && itemsSubtotal > 0 && raw.platformFee === undefined) {
    platformFee = FALLBACK_PLATFORM_FEE;
  }
  const tipAmount = num(raw.tipAmount, raw.tip, raw.deliveryTip);
  const discount = num(raw.discount, raw.couponDiscount);
  const walletApplied = num(raw.walletApplied, raw.walletDeduction);
  const loyaltyDiscount = num(raw.loyaltyDiscount, raw.loyaltyDeduction);
  const grandTotal = num(raw.grandTotal, raw.total, raw.payableAmount, raw.toPay);

  let surgeExtra = 0;
  const preSurge = deliveryFeeBase + deliveryDistanceCharge;
  if (deliveryFee > preSurge + 0.009) {
    surgeExtra = Math.round((deliveryFee - preSurge) * 100) / 100;
  } else if (surgeMultiplier > 1 && preSurge > 0 && deliveryFee >= deliveryFeeMax - 0.009) {
    surgeExtra = Math.round((preSurge * (surgeMultiplier - 1)) * 100) / 100;
  }

  const chargeLines: BillChargeLine[] = [];

  if (restaurantTaxAmount > 0 || itemsSubtotal > 0) {
    chargeLines.push({
      key: 'restaurant_tax',
      label:
        taxRate > 0
          ? `Restaurant taxes (${taxRate}% GST)`
          : 'Restaurant taxes',
      value: restaurantTaxAmount,
      hint: 'GST on food items charged by the restaurant',
    });
  }

  if (platformFee > 0 || itemsSubtotal > 0) {
    chargeLines.push({
      key: 'platform',
      label: 'Platform fee',
      value: platformFee,
      hint: 'Service fee for order processing & support',
    });
  }

  const taxesAndChargesTotal = restaurantTaxAmount + platformFee;

  const deliveryTypeRaw = String(raw.deliveryType ?? 'delivery').toLowerCase();
  const deliveryType: 'delivery' | 'takeaway' =
    deliveryTypeRaw.includes('pick') ||
    deliveryTypeRaw.includes('take') ||
    deliveryTypeRaw === 'self_pickup'
      ? 'takeaway'
      : 'delivery';

  return {
    itemsSubtotal,
    deliveryFee,
    deliveryFeeBase,
    deliveryDistanceKm,
    deliveryDistanceCharge,
    deliveryFeePerKm,
    deliveryFeeMax,
    surgeMultiplier,
    surgeExtra,
    rainFee,
    packagingCharge,
    restaurantTaxAmount,
    taxAmount: restaurantTaxAmount,
    taxRate,
    platformFee,
    tipAmount,
    discount,
    couponCode: (raw.couponCode as string) ?? null,
    walletApplied,
    loyaltyDiscount,
    grandTotal,
    taxesAndChargesTotal,
    chargeLines,
    superFreeDelivery: raw.superFreeDelivery === true,
    autoFreeDelivery: raw.autoFreeDelivery === true,
    autoFreeDeliveryMinOrder: pickNullableNumber(raw.autoFreeDeliveryMinOrder),
    autoFreeDeliveryTitle:
      typeof raw.autoFreeDeliveryTitle === 'string' ? raw.autoFreeDeliveryTitle : null,
    autoFreeDeliveryUpsellMinOrder: pickNullableNumber(raw.autoFreeDeliveryUpsellMinOrder),
    autoFreeDeliveryAmountNeeded: pickNullableNumber(raw.autoFreeDeliveryAmountNeeded),
    deliveryType,
    billReady:
      raw.serviceable !== undefined ||
      raw.deliveryFeeBase !== undefined ||
      raw.reason !== undefined ||
      deliveryFee > 0 ||
      raw.billReady === true ||
      raw.estimated === true,
  };
}
