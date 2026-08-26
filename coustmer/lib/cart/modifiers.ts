import type { CartModifier } from '@/lib/cart/types';

/** Stable key so Half vs Full (or different add-ons) stay separate cart lines. */
export function modifiersSignature(modifiers?: CartModifier[] | null): string {
  if (!modifiers?.length) return '';
  return [...modifiers]
    .map((m) => `${String(m.groupId)}:${String(m.optionId)}`)
    .sort()
    .join('|');
}

export function cartLineLocalId(
  menuItemId: string,
  modifiers?: CartModifier[] | null
): string {
  const sig = modifiersSignature(modifiers);
  return sig ? `${menuItemId}__${sig}` : menuItemId;
}

export function sameModifiers(
  a?: CartModifier[] | null,
  b?: CartModifier[] | null
): boolean {
  return modifiersSignature(a) === modifiersSignature(b);
}

export function modifiersExtraTotal(modifiers?: CartModifier[] | null): number {
  if (!modifiers?.length) return 0;
  return modifiers.reduce((sum, m) => sum + (Number(m.price) || 0), 0);
}
