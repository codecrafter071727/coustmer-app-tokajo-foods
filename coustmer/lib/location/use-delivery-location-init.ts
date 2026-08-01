import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';

import { addressApi } from '@/lib/address/api';
import { formatAddressLabel } from '@/lib/address/types';
import {
  extractCityFromAddress,
  normalizeCityName,
} from '@/lib/location/format';
import {
  isBadStoredLocation,
  resolvePlaceFromCoords,
} from '@/lib/location/resolve-place';
import { useAuthStore } from '@/store/auth-store';
import { useDeliveryLocationStore } from '@/store/delivery-location-store';

/**
 * Startup order (Swiggy-style):
 * 1. Keep persisted pin for this user if present
 * 2. Else load default/first saved address from API
 * 3. Else optionally GPS (only when logged out / no saved addresses)
 * Never overwrite an existing saved/persisted pin with GPS.
 */
export function useDeliveryLocationInit() {
  const authHydrated = useAuthStore((s) => s.isHydrated);
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const hasHydrated = useDeliveryLocationStore((s) => s.hasHydrated);
  const location = useDeliveryLocationStore((s) => s.location);
  const isDetecting = useDeliveryLocationStore((s) => s.isDetecting);
  const setLocation = useDeliveryLocationStore((s) => s.setLocation);
  const setDetecting = useDeliveryLocationStore((s) => s.setDetecting);

  const repaired = useRef(false);
  const bootstrapDone = useRef(false);
  const gpsStarted = useRef(false);

  useEffect(() => {
    repaired.current = false;
    bootstrapDone.current = false;
    gpsStarted.current = false;
  }, [userId]);

  // 1 + 2: After auth + store hydrate, prefer account saved address if pin empty.
  useEffect(() => {
    if (!hasHydrated || !authHydrated) return;
    if (bootstrapDone.current) return;

    // Already have a pin (persisted or bound) — do not re-ask.
    if (location) {
      bootstrapDone.current = true;
      return;
    }

    // Guest / not logged in: nothing to fetch from address-service.
    if (!token || !userId) {
      bootstrapDone.current = true;
      return;
    }

    let cancelled = false;
    bootstrapDone.current = true;

    void (async () => {
      setDetecting(true);
      try {
        const addresses = await addressApi.list();
        if (cancelled) return;

        const preferred =
          addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
        if (!preferred) return;

        // If something else set a pin while we fetched, keep it.
        const current = useDeliveryLocationStore.getState().location;
        if (current) return;

        setLocation({
          label: formatAddressLabel(preferred.label) || 'Home',
          formattedAddress: preferred.formattedAddress,
          city: normalizeCityName(
            preferred.city ||
              extractCityFromAddress(preferred.formattedAddress)
          ),
          lat: preferred.lat,
          lng: preferred.lng,
          source: 'saved',
          savedAddressId: preferred.id,
          updatedAt: Date.now(),
        });
      } catch {
        // Fall through — GPS / manual sheet may help.
      } finally {
        if (!cancelled) setDetecting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    hasHydrated,
    authHydrated,
    token,
    userId,
    location,
    setDetecting,
    setLocation,
  ]);

  // Repair junk "Lat / Lng …" labels without changing the pin.
  useEffect(() => {
    if (!hasHydrated || !authHydrated || !location || repaired.current || isDetecting) {
      return;
    }
    if (!isBadStoredLocation(location)) return;
    repaired.current = true;

    void (async () => {
      setDetecting(true);
      try {
        const resolved = await resolvePlaceFromCoords({
          lat: location.lat,
          lng: location.lng,
          source: location.source,
        });
        setLocation({
          ...resolved,
          source: location.source,
          savedAddressId: location.savedAddressId,
          updatedAt: Date.now(),
        });
      } catch {
        // keep existing
      } finally {
        setDetecting(false);
      }
    })();
  }, [hasHydrated, authHydrated, location, isDetecting, setDetecting, setLocation]);

  // 3: GPS only when still no pin after bootstrap.
  // Logged-in users: try GPS quietly if permission already granted (don't force the
  // "permission off" sheet when the phone location toggle is already on).
  useEffect(() => {
    if (!hasHydrated || !authHydrated) return;
    if (!bootstrapDone.current) return;
    if (location || isDetecting || gpsStarted.current) return;

    gpsStarted.current = true;

    void (async () => {
      setDetecting(true);
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        // Don't pop the system permission dialog on cold start for logged-in users
        // who may already have a saved address path; only use GPS if already allowed.
        if (perm.status !== 'granted') return;

        const enabled = await Location.hasServicesEnabledAsync();
        if (!enabled) return;

        if (useDeliveryLocationStore.getState().location) return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (useDeliveryLocationStore.getState().location) return;

        const resolved = await resolvePlaceFromCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: 'gps',
        });

        setLocation({
          ...resolved,
          source: 'gps',
          updatedAt: Date.now(),
        });
      } catch {
        // user can pick manually
      } finally {
        setDetecting(false);
      }
    })();
  }, [
    hasHydrated,
    authHydrated,
    location,
    isDetecting,
    setDetecting,
    setLocation,
  ]);
}
