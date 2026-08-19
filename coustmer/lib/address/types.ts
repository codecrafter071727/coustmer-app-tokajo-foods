export type AddressLabel = 'home' | 'work' | 'hotel' | 'other';

export const ADDRESS_LABEL_OPTIONS: { value: AddressLabel; label: string; icon: string }[] = [
  { value: 'home', label: 'Home', icon: '🏠' },
  { value: 'work', label: 'Work', icon: '💼' },
  { value: 'hotel', label: 'Hotel', icon: '🏨' },
  { value: 'other', label: 'Other', icon: '📍' },
];

export type SavedAddress = {
  id: string;
  label: AddressLabel;
  customLabel?: string;
  flat?: string;
  floor?: string;
  landmark?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  formattedAddress?: string;
  lat: number;
  lng: number;
  isDefault?: boolean;
  contactName?: string;
  contactPhone?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateAddressPayload = {
  label: AddressLabel;
  customLabel?: string;
  flat?: string;
  floor?: string;
  landmark?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  formattedAddress?: string;
  lat: number;
  lng: number;
  contactName?: string;
  contactPhone?: string;
};

export type UpdateAddressPayload = Partial<CreateAddressPayload>;

export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress?: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

export type ReverseGeocodeResult = GeocodeResult;

export type AutocompleteItem = {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
};

export type ServiceabilityResult = {
  serviceable: boolean;
  city?: string;
  zone?: string;
  message?: string;
};

export function toAddressLabelEnum(val: string | undefined | null): AddressLabel {
  if (!val) return 'other';
  const lower = val.toLowerCase().trim();
  if (lower === 'home') return 'home';
  if (lower === 'work' || lower === 'office') return 'work';
  if (lower === 'hotel') return 'hotel';
  return 'other';
}

export function formatAddressLabel(addressOrLabel: SavedAddress | string): string {
  if (typeof addressOrLabel === 'string') {
    const opt = ADDRESS_LABEL_OPTIONS.find((o) => o.value === addressOrLabel);
    return opt?.label || addressOrLabel || 'Address';
  }
  const address = addressOrLabel;
  const opt = ADDRESS_LABEL_OPTIONS.find((o) => o.value === address.label);
  const labelText = address.customLabel || opt?.label || 'Address';
  const parts: string[] = [];
  if (address.flat) parts.push(address.flat);
  if (address.street) parts.push(address.street);
  if (address.area) parts.push(address.area);
  if (address.city) parts.push(address.city);
  if (parts.length === 0 && address.formattedAddress) {
    return `${labelText} — ${address.formattedAddress}`;
  }
  return parts.length > 0 ? `${labelText} — ${parts.join(', ')}` : labelText;
}
