import { Pressable } from '@/components/common/Pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeliveryLocationPicker } from '@/components/location/DeliveryLocationPicker';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import {
  ErrorView,
  LoadingView,
} from '@/components/common/StateViews';
import { authTheme } from '@/constants/auth-theme';
import {
  useCreateAddress,
  useSavedAddress,
  useUpdateAddress,
} from '@/lib/address/hooks';
import type { AddressLabel } from '@/lib/address/types';
import {
  ADDRESS_LABEL_OPTIONS,
  formatAddressLabel,
  toAddressLabelEnum,
} from '@/lib/address/types';
import {
  extractCityFromAddress,
  normalizeCityName,
} from '@/lib/location/format';
import { parseDeliveryAddress } from '@/lib/order/parse-address';
import { useDeliveryLocationStore } from '@/store/delivery-location-store';

type Props = {
  mode?: 'create' | 'edit';
};

export function AddressEditorScreen({ mode = 'create' }: Props) {
  const router = useRouter();
  const params = useLocalSearchParams<{ addressId?: string }>();
  const addressId = String(params.addressId ?? '');
  const isEdit = mode === 'edit' || Boolean(addressId);

  const existing = useSavedAddress(addressId, { enabled: isEdit });
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const setDeliveryLocation = useDeliveryLocationStore((s) => s.setLocation);
  const currentPin = useDeliveryLocationStore((s) => s.location);

  const [label, setLabel] = useState<'home' | 'work' | 'other'>('home');
  const [customLabel, setCustomLabel] = useState('');
  const [formattedAddress, setFormattedAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing.data) return;
    const a = existing.data;
    const normalized = toAddressLabelEnum(a.label);
    setLabel(normalized);
    if (
      normalized === 'other' &&
      a.label &&
      a.label.toLowerCase() !== 'other'
    ) {
      setCustomLabel(formatAddressLabel(a.label));
    }
    setFormattedAddress(a.formattedAddress);
    setLandmark(a.landmark ?? '');
    setContactName(a.contactName ?? '');
    setContactPhone(a.contactPhone ?? '');
    setLat(a.lat);
    setLng(a.lng);
    setSetAsDefault(a.isDefault);
  }, [existing.data]);

  // Prefill from current delivery pin when creating.
  useEffect(() => {
    if (isEdit || !currentPin || formattedAddress) return;
    setFormattedAddress(currentPin.formattedAddress);
    setLat(currentPin.lat);
    setLng(currentPin.lng);
  }, [isEdit, currentPin, formattedAddress]);

  const resolvedLabel: AddressLabel = label;

  const canSave = useMemo(() => {
    return Boolean(
      resolvedLabel &&
        formattedAddress.trim() &&
        lat != null &&
        lng != null &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
    );
  }, [resolvedLabel, formattedAddress, lat, lng]);

  const busy = create.isPending || update.isPending;

  const onSave = async () => {
    if (!canSave || lat == null || lng == null) {
      setError('Pick a location on the map and add a label.');
      return;
    }

    setError(null);
    const displayLabel =
      label === 'other' && customLabel.trim()
        ? customLabel.trim()
        : formatAddressLabel(label);

    const parsed = parseDeliveryAddress({
      formattedAddress: formattedAddress.trim(),
      label: displayLabel,
      city: normalizeCityName(extractCityFromAddress(formattedAddress)),
      lat,
      lng,
    });

    const payload = {
      label: toAddressLabelEnum(label),
      formattedAddress: formattedAddress.trim(),
      street: parsed.street,
      area: parsed.area,
      city: parsed.city,
      state: parsed.state,
      pincode: parsed.pincode,
      landmark: landmark.trim() || undefined,
      contactName: contactName.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      lat,
      lng,
      setAsDefault,
    };

    try {
      const saved = isEdit
        ? await update.mutateAsync({ addressId, payload })
        : await create.mutateAsync(payload);

      setDeliveryLocation({
        label: formatAddressLabel(saved.label) || displayLabel,
        formattedAddress: saved.formattedAddress || formattedAddress.trim(),
        city: normalizeCityName(
          saved.city || extractCityFromAddress(saved.formattedAddress)
        ),
        lat: saved.lat || lat,
        lng: saved.lng || lng,
        source: 'saved',
        savedAddressId: saved.id,
        updatedAt: Date.now(),
      });

      if (router.canGoBack()) { router.back(); } else { router.replace('/'); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save address');
    }
  };

  if (isEdit && existing.isLoading) {
    return <LoadingView label="Loading address…" />;
  }

  if (isEdit && existing.isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.pad}>
          <ScreenHeader title="Edit address" />
        </View>
        <ErrorView
          message={
            existing.error instanceof Error
              ? existing.error.message
              : 'Address not found'
          }
          onRetry={existing.refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.pad}>
          <ScreenHeader
            title={isEdit ? 'Edit address' : 'Add address'}
            subtitle="Saved to your account"
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.section}>Label</Text>
          <View style={styles.labelRow}>
            {ADDRESS_LABEL_OPTIONS.map((item) => {
              const active = label === item.value;
              return (
                <Pressable
                  key={item.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setLabel(item.value)}
                >
                  <Text
                    style={[styles.chipText, active && styles.chipTextActive]}
                  >
                    {item.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {label === 'other' ? (
            <TextInput
              style={styles.input}
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="e.g. Parents, Gym"
              placeholderTextColor={authTheme.textDim}
            />
          ) : null}

          <Text style={styles.section}>Location</Text>
          <Pressable
            style={styles.mapCard}
            onPress={() => setPickerOpen(true)}
          >
            <MapPin color={authTheme.brand} size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.mapTitle}>
                {formattedAddress ? 'Change on map' : 'Pick on map'}
              </Text>
              <Text style={styles.mapSub} numberOfLines={3}>
                {formattedAddress || 'Search or drop a pin for this address'}
              </Text>
            </View>
          </Pressable>

          <Text style={styles.section}>Address details</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={formattedAddress}
            onChangeText={setFormattedAddress}
            placeholder="Full address"
            placeholderTextColor={authTheme.textDim}
            multiline
          />
          <TextInput
            style={styles.input}
            value={landmark}
            onChangeText={setLandmark}
            placeholder="Landmark (optional)"
            placeholderTextColor={authTheme.textDim}
          />
          <TextInput
            style={styles.input}
            value={contactName}
            onChangeText={setContactName}
            placeholder="Contact name (optional)"
            placeholderTextColor={authTheme.textDim}
          />
          <TextInput
            style={styles.input}
            value={contactPhone}
            onChangeText={(t) =>
              setContactPhone(t.replace(/[^\d+]/g, '').slice(0, 13))
            }
            placeholder="Contact phone (optional)"
            placeholderTextColor={authTheme.textDim}
            keyboardType="phone-pad"
          />

          <Pressable
            style={styles.defaultRow}
            onPress={() => setSetAsDefault((v) => !v)}
          >
            <View
              style={[styles.checkbox, setAsDefault && styles.checkboxOn]}
            />
            <Text style={styles.defaultText}>Set as default delivery address</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.saveBtn, (!canSave || busy) && styles.saveBtnDisabled]}
            disabled={!canSave || busy}
            onPress={onSave}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveText}>
                {isEdit ? 'Update address' : 'Save address'}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <DeliveryLocationPicker
        visible={pickerOpen}
        variant="pin"
        initial={
          lat != null && lng != null ? { lat, lng } : undefined
        }
        autoDetectOnOpen={!lat}
        onClose={() => setPickerOpen(false)}
        onConfirm={(result) => {
          setPickerOpen(false);
          setLat(result.lat);
          setLng(result.lng);
          setFormattedAddress(result.formattedAddress);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: authTheme.bg },
  pad: { paddingHorizontal: 16, paddingTop: 4 },
  scroll: { padding: 16, paddingBottom: 40, gap: 10 },
  section: {
    marginTop: 8,
    color: authTheme.text,
    fontSize: 14,
    fontWeight: '800',
  },
  labelRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: authTheme.surface,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
  },
  chipActive: {
    backgroundColor: authTheme.brand,
    borderColor: authTheme.brand,
  },
  chipText: { color: authTheme.textMuted, fontWeight: '700', fontSize: 13 },
  chipTextActive: { color: '#FFFFFF' },
  input: {
    borderWidth: 1,
    borderColor: authTheme.inputBorder,
    backgroundColor: authTheme.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: authTheme.text,
    fontSize: 14,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  mapCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    backgroundColor: authTheme.card,
  },
  mapTitle: { color: authTheme.text, fontWeight: '800', fontSize: 14 },
  mapSub: { color: authTheme.textMuted, fontSize: 12, marginTop: 2, lineHeight: 17 },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: authTheme.inputBorder,
    backgroundColor: '#FFFFFF',
  },
  checkboxOn: {
    backgroundColor: authTheme.brand,
    borderColor: authTheme.brand,
  },
  defaultText: { color: authTheme.text, fontSize: 13, fontWeight: '600' },
  error: { color: authTheme.error, fontSize: 13, fontWeight: '600' },
  saveBtn: {
    marginTop: 12,
    backgroundColor: authTheme.brand,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.55 },
  saveText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
