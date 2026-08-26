import { Pressable } from '@/components/common/Pressable';
import * as Location from 'expo-location';
import { Crosshair, Home, MapPin, Search } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@/constants/typography';
import { useSavedAddresses } from '@/lib/address/hooks';
import { reverseGeocodeAddress } from '@/lib/address/search';
import { formatAddressLabel } from '@/lib/address/types';
import type { SavedAddress } from '@/lib/address/types';
import {
  useCities,
  useSurgeStatus,
  useZone,
  useZones,
} from '@/lib/delivery/hooks';
import type { City } from '@/lib/delivery/types';
import {
  extractCityFromAddress,
  normalizeCityName,
  normalizeLat,
  normalizeLng,
  shortAddressLabel,
} from '@/lib/location/format';
import { useDeliveryLocationStore } from '@/store/delivery-location-store';

export type InitialLocationSheetProps = {
  visible: boolean;
  onManual: () => void;
  onClose: () => void;
};

type LocStatus = {
  permission: Location.PermissionStatus | 'unknown';
  servicesOn: boolean;
};

function cityCenter(city: City): { lat: number; lng: number } | null {
  if (typeof city.lat === 'number' && typeof city.lng === 'number') {
    return { lat: city.lat, lng: city.lng };
  }
  const ring = city.polygon?.[0];
  if (!ring?.length) {
    const zonePoly = city.zones?.find((z) => z.polygon?.[0])?.polygon?.[0];
    if (!zonePoly?.length) return null;
    let lat = 0;
    let lng = 0;
    for (const pair of zonePoly) {
      lng += Number(pair[0] ?? 0);
      lat += Number(pair[1] ?? 0);
    }
    return { lat: lat / zonePoly.length, lng: lng / zonePoly.length };
  }
  let lat = 0;
  let lng = 0;
  for (const pair of ring) {
    lng += Number(pair[0] ?? 0);
    lat += Number(pair[1] ?? 0);
  }
  return { lat: lat / ring.length, lng: lng / ring.length };
}

export function InitialLocationSheet({
  visible,
  onManual,
  onClose,
}: InitialLocationSheetProps) {
  const insets = useSafeAreaInsets();
  const { data: savedAddresses, isLoading: savedLoading } = useSavedAddresses({
    enabled: visible,
  });
  const setLocation = useDeliveryLocationStore((s) => s.setLocation);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<LocStatus>({
    permission: 'unknown',
    servicesOn: true,
  });
  const [statusReady, setStatusReady] = useState(false);
  const cities = useCities();
  const zones = useZones();
  const firstZoneId = useMemo(() => zones.data?.[0]?.id ?? '', [zones.data]);
  const zoneDetail = useZone(firstZoneId);
  const surge = useSurgeStatus(firstZoneId);

  const refreshStatus = useCallback(async () => {
    try {
      const [perm, servicesOn] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.hasServicesEnabledAsync(),
      ]);
      setStatus({
        permission: perm.status,
        servicesOn,
      });
    } catch {
      setStatus({ permission: 'undetermined', servicesOn: true });
    } finally {
      setStatusReady(true);
    }
  }, []);

  useEffect(() => {
    if (!visible) {
      setStatusReady(false);
      return;
    }
    void refreshStatus();
  }, [visible, refreshStatus]);

  // If user already has a default/saved address, apply it automatically — no prompt needed.
  useEffect(() => {
    if (!visible || savedLoading) return;
    if (!savedAddresses?.length) return;

    const preferred =
      savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
    applySaved(preferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when list first loads while open
  }, [visible, savedLoading, savedAddresses]);

  // Permission already granted + GPS on + no saved address → use current location.
  useEffect(() => {
    if (!visible || !statusReady || savedLoading) return;
    if (savedAddresses && savedAddresses.length > 0) return;
    if (status.permission !== 'granted' || !status.servicesOn) return;
    void useCurrentLocation({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, statusReady, status.permission, status.servicesOn, savedLoading, savedAddresses]);

  const applySaved = (saved: SavedAddress) => {
    setLocation({
      lat: saved.lat,
      lng: saved.lng,
      formattedAddress: saved.formattedAddress,
      city: normalizeCityName(
        saved.city || extractCityFromAddress(saved.formattedAddress)
      ),
      label: formatAddressLabel(saved.label) || 'Home',
      source: 'saved',
      savedAddressId: saved.id,
      updatedAt: Date.now(),
    });
    onClose();
  };

  const applyLaunchCity = (city: City) => {
    const center = cityCenter(city);
    if (!center) {
      Alert.alert('City unavailable', 'Could not resolve map center for this city.');
      return;
    }
    const hours =
      city.hours?.open && city.hours?.close
        ? `${city.hours.open} – ${city.hours.close}`
        : undefined;
    setLocation({
      lat: center.lat,
      lng: center.lng,
      formattedAddress: `${city.name}${hours ? ` · ${hours}` : ''}`,
      city: normalizeCityName(city.name),
      label: city.name,
      source: 'search',
      updatedAt: Date.now(),
    });
    onClose();
  };

  const useCurrentLocation = async (opts?: { silent?: boolean }) => {
    setLoading(true);
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        perm = await Location.requestForegroundPermissionsAsync();
      }
      setStatus((s) => ({ ...s, permission: perm.status }));

      if (perm.status !== 'granted') {
        if (!opts?.silent) {
          Alert.alert(
            'Permission needed',
            'Allow location access for this app in Settings to use your current position.'
          );
        }
        return;
      }

      const servicesOn = await Location.hasServicesEnabledAsync();
      setStatus((s) => ({ ...s, servicesOn }));
      if (!servicesOn) {
        if (!opts?.silent) {
          Alert.alert(
            'Device location is off',
            'Location is on for the phone system tray sometimes still needs Location / GPS enabled in Settings.'
          );
        }
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = normalizeLat(pos.coords.latitude);
      const lng = normalizeLng(pos.coords.longitude);

      let address = (await reverseGeocodeAddress({ lat, lng })) ?? undefined;
      if (!address) {
        try {
          const [place] = await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lng,
          });
          if (place) {
            const parts = [place.name, place.street, place.city, place.region]
              .filter(Boolean)
              .filter((v, i, arr) => arr.indexOf(v) === i);
            address = parts.join(', ');
          }
        } catch {
          // ignore
        }
      }

      setLocation({
        lat,
        lng,
        formattedAddress: address || 'Current Location',
        label: shortAddressLabel(address || 'Current Location', 'gps'),
        city: normalizeCityName(
          address ? extractCityFromAddress(address) : undefined
        ),
        source: 'gps',
        updatedAt: Date.now(),
      });
      onClose();
    } catch {
      if (!opts?.silent) {
        Alert.alert(
          'Could not get location',
          'Try again, pick a saved address, or enter location manually.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const permissionGranted = status.permission === 'granted';
  const bannerTitle = !statusReady
    ? 'Checking location…'
    : !permissionGranted
      ? 'App location permission needed'
      : !status.servicesOn
        ? 'Device location is off'
        : 'Use your current location';

  const bannerSub = !statusReady
    ? 'One moment while we check permission status.'
    : !permissionGranted
      ? 'Phone location can be on, but this app still needs permission to read it.'
      : !status.servicesOn
        ? 'Enable Location / GPS in system settings, then tap Use location.'
        : 'We will set your delivery pin to where you are now.';

  const buttonLabel = !permissionGranted
    ? 'ALLOW'
    : !status.servicesOn
      ? 'RETRY'
      : 'USE LOCATION';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.banner}>
          <View style={styles.bannerIconWrap}>
            <Crosshair color="#FFFFFF" size={24} />
          </View>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>{bannerTitle}</Text>
            <Text style={styles.bannerSub}>{bannerSub}</Text>
          </View>
          <Pressable
            style={styles.grantBtn}
            onPress={() => useCurrentLocation()}
            disabled={loading || !statusReady}
          >
            {loading ? (
              <ActivityIndicator color="#F97316" size="small" />
            ) : (
              <Text style={styles.grantText}>{buttonLabel}</Text>
            )}
          </Pressable>
        </View>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Text style={styles.sheetTitle}>Select Delivery Address</Text>

          <ScrollView style={styles.scrollArea}>
            {savedLoading ? (
              <ActivityIndicator color="#AC0F45" style={{ marginVertical: 24 }} />
            ) : savedAddresses && savedAddresses.length > 0 ? (
              savedAddresses.map((addr) => (
                <Pressable
                  key={addr.id}
                  style={styles.savedRow}
                  onPress={() => applySaved(addr)}
                >
                  <Home color="#AC0F45" size={20} />
                  <View style={styles.savedTextCol}>
                    <Text style={styles.savedLabel}>
                      {formatAddressLabel(addr.label) || 'Saved Address'}
                      {addr.isDefault ? ' · Default' : ''}
                    </Text>
                    <Text style={styles.savedAddress} numberOfLines={1}>
                      {addr.formattedAddress}
                    </Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptySaved}>
                No saved addresses yet. Use current location or enter manually.
              </Text>
            )}

            <View style={styles.publicMetaCard}>
              <Text style={styles.publicMetaTitle}>Launch cities</Text>
              {cities.isLoading ? (
                <ActivityIndicator color="#AC0F45" style={{ marginVertical: 8 }} />
              ) : (cities.data ?? []).filter((c) => c.isLive !== false).length ? (
                (cities.data ?? [])
                  .filter((c) => c.isLive !== false)
                  .map((city) => (
                    <Pressable
                      key={city.id}
                      style={styles.cityRow}
                      onPress={() => applyLaunchCity(city)}
                    >
                      <MapPin color="#AC0F45" size={18} />
                      <View style={styles.cityTextCol}>
                        <Text style={styles.cityName}>{city.name}</Text>
                        {city.hours ? (
                          <Text style={styles.cityHours}>
                            {city.hours.open} – {city.hours.close} IST
                          </Text>
                        ) : null}
                      </View>
                    </Pressable>
                  ))
              ) : (
                <Text style={styles.publicMetaLine}>No launch cities listed yet.</Text>
              )}
              {zoneDetail.data ? (
                <Text style={styles.publicMetaLine}>
                  Nearest zone: {zoneDetail.data.name}
                </Text>
              ) : null}
              {surge.data?.isSurge ? (
                <Text style={styles.publicMetaLine}>
                  Surge active
                  {surge.data.multiplier
                    ? ` · ${surge.data.multiplier.toFixed(1)}×`
                    : ''}
                </Text>
              ) : null}
            </View>
          </ScrollView>

          <View style={styles.manualWrapper}>
            <Pressable style={styles.manualBtn} onPress={onManual}>
              <Search color="#AC0F45" size={18} />
              <Text style={styles.manualText}>Enter Location Manually</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  banner: {
    backgroundColor: '#F97316',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bannerIconWrap: {
    marginRight: 12,
  },
  bannerTextCol: {
    flex: 1,
    marginRight: 12,
  },
  bannerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  bannerSub: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 16,
  },
  grantBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 88,
  },
  grantText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#F97316',
    letterSpacing: 0.5,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 24,
  },
  sheetTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: '#3E4152',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F5',
  },
  scrollArea: {
    maxHeight: 300,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F5',
  },
  savedTextCol: {
    marginLeft: 16,
    flex: 1,
  },
  savedLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: '#3E4152',
    marginBottom: 4,
  },
  savedAddress: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#93959F',
  },
  emptySaved: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#93959F',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  publicMetaCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0CC',
    backgroundColor: '#FFF7F2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  publicMetaTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#C2410C',
    letterSpacing: 0.3,
  },
  publicMetaLine: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#7C2D12',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#FED7AA',
  },
  cityTextCol: { flex: 1 },
  cityName: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: '#431407',
  },
  cityHours: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: '#9A3412',
    marginTop: 2,
  },
  manualWrapper: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  manualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualText: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: '#93959F',
    marginLeft: 12,
  },
});
