import { Pressable } from '@/components/common/Pressable';
import * as Location from 'expo-location';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Briefcase,
  Check,
  Crosshair,
  Home,
  MapPin,
  MoreVertical,
  Navigation,
  Plus,
  Search,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator,
  Alert,
  AppState,
  type AppStateStatus,
  Keyboard,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { SmoothPressable } from '@/components/common/SmoothPressable';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import type { AddressSuggestion } from '@/lib/address/api';
import { useSavedAddresses } from '@/lib/address/hooks';
import {
  formatAddressLabel,
  type SavedAddress,
} from '@/lib/address/types';
import {
  geocodeAddress,
  reverseGeocodeAddress,
  searchAddresses,
} from '@/lib/address/search';
import { getApiErrorMessage } from '@/lib/errors';
import { GOOGLE_MAPS_API_KEY } from '@/lib/google-maps';
import {
  normalizeLat,
  normalizeLng,
  shortAddressLabel,
} from '@/lib/location/format';
import { useDeliveryLocationStore } from '@/store/delivery-location-store';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const DEFAULT = { lat: 23.2599, lng: 77.4126 }; // Bhopal fallback
const PAGE_BG = '#F5F5F5';
const SELECTED_BG = '#D8F5E8';
const SELECTED_TEXT = '#0A8F5A';
const ADD_ICON_BG = authTheme.brand;
/** Keep in sync with authTheme.brand — used inside WebView HTML (must remount on change). */
const MAP_PIN_COLOR = '#F97316';
const MAP_THEME_VERSION = 'orange-v2';

/** Compact toggle matching the location mock (grey off / green on). */
function LocationToggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  const knobX = useSharedValue(value ? 14 : 0);
  const trackProgress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    knobX.value = withSpring(value ? 14 : 0, {
      damping: 18,
      stiffness: 280,
      mass: 0.55,
    });
    trackProgress.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [value, knobX, trackProgress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: trackProgress.value > 0.5 ? '#34C759' : '#C7C7CC',
  }));

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: knobX.value }],
  }));

  return (
    <Pressable
      disabled={disabled}
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View
        style={[
          {
            width: 34,
            height: 20,
            borderRadius: 10,
            paddingHorizontal: 2,
            justifyContent: 'center',
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#FFFFFF',
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOpacity: 0.18,
                  shadowRadius: 2,
                  shadowOffset: { width: 0, height: 1 },
                },
                android: { elevation: 2 },
                default: {},
              }),
            },
            knobStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

export type DeliveryLocationResult = {
  lat: number;
  lng: number;
  formattedAddress: string;
  label: string;
  source: 'gps' | 'search' | 'saved';
  savedAddressId?: string;
};

type DeliveryLocationPickerProps = {
  visible: boolean;
  /** Previously saved pin (map still jumps to GPS on open). */
  initial?: { lat: number; lng: number } | null;
  /** When true (default), open → request GPS and center pin on you. */
  autoDetectOnOpen?: boolean;
  /**
   * `delivery` — full “Select Your Location” flow (home).
   * `pin` — map only (edit/add saved address): pick pin → confirm → return to form.
   */
  variant?: 'delivery' | 'pin';
  onClose: () => void;
  onConfirm: (result: DeliveryLocationResult) => void;
};

function buildGoogleMapHtml(
  lat: number,
  lng: number,
  apiKey: string,
  pinColor: string = MAP_PIN_COLOR
): string {
  const key = apiKey.replace(/'/g, "\\'");
  const pin = pinColor.replace(/'/g, "\\'");
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #e8eaed; }
  .center-pin {
    position: absolute; left: 50%; top: 50%;
    transform: translate(-50%, -100%);
    z-index: 1000; pointer-events: none;
  }
  .center-pin svg { filter: drop-shadow(0 3px 6px rgba(0,0,0,0.35)); }
  .center-pin path { fill: ${pin} !important; stroke: ${pin} !important; }
</style>
</head>
<body>
<div id="map"></div>
<div class="center-pin">
  <svg width="44" height="44" viewBox="0 0 24 24" fill="${pin}" stroke="${pin}" stroke-width="1.5">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
    <circle cx="12" cy="10" r="3" fill="#fff" stroke="#fff"></circle>
  </svg>
</div>
<script>
  var map;
  var autocompleteService;
  var placesService;
  var geocoder;
  var suppressIdleUntil = 0;
  function post(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
  function emitCenter() {
    if (!map) return;
    if (Date.now() < suppressIdleUntil) return;
    var c = map.getCenter();
    var lng = c.lng();
    while (lng > 180) lng -= 360;
    while (lng < -180) lng += 360;
    post({ type: 'move', lat: c.lat(), lng: lng });
  }
  function setMapView(lat, lng, zoom) {
    if (!map) return;
    suppressIdleUntil = Date.now() + 800;
    map.setCenter({ lat: lat, lng: lng });
    if (zoom) map.setZoom(zoom);
    else map.setZoom(17);
  }
  function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
      center: { lat: ${lat}, lng: ${lng} },
      zoom: 16,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      gestureHandling: 'greedy',
    });
    autocompleteService = new google.maps.places.AutocompleteService();
    placesService = new google.maps.places.PlacesService(map);
    geocoder = new google.maps.Geocoder();
    map.addListener('idle', emitCenter);
    document.addEventListener('message', handleRN);
    window.addEventListener('message', handleRN);
    post({ type: 'ready' });
    emitCenter();
  }
  function handleRN(e) {
    try {
      var msg = JSON.parse(e.data);
      if (msg.type === 'setView' && map) {
        setMapView(msg.lat, msg.lng, msg.zoom);
      }
      if (msg.type === 'autocomplete' && autocompleteService) {
        var req = { input: msg.query || '', componentRestrictions: { country: 'in' } };
        if (typeof msg.lat === 'number' && typeof msg.lng === 'number') {
          req.location = new google.maps.LatLng(msg.lat, msg.lng);
          req.radius = msg.radius || 40000;
        }
        autocompleteService.getPlacePredictions(req, function(predictions, status) {
          post({
            type: 'autocompleteResults',
            requestId: msg.requestId,
            status: status,
            predictions: (predictions || []).map(function(p) {
              return {
                description: p.description,
                placeId: p.place_id,
                mainText: (p.structured_formatting && p.structured_formatting.main_text) || '',
                secondaryText: (p.structured_formatting && p.structured_formatting.secondary_text) || ''
              };
            })
          });
        });
      }
      if (msg.type === 'placeDetails' && placesService) {
        placesService.getDetails({
          placeId: msg.placeId,
          fields: ['geometry', 'formatted_address', 'name']
        }, function(place, status) {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !place || !place.geometry || !place.geometry.location) {
            post({ type: 'placeDetailsResult', requestId: msg.requestId, ok: false });
            return;
          }
          var plat = place.geometry.location.lat();
          var plng = place.geometry.location.lng();
          setMapView(plat, plng, 17);
          post({
            type: 'placeDetailsResult',
            requestId: msg.requestId,
            ok: true,
            lat: plat,
            lng: plng,
            formattedAddress: place.formatted_address || place.name || ''
          });
        });
      }
      if (msg.type === 'geocodeText' && geocoder) {
        geocoder.geocode({ address: msg.query, componentRestrictions: { country: 'IN' } }, function(results, status) {
          if (status !== 'OK' || !results || !results[0]) {
            post({ type: 'geocodeTextResult', requestId: msg.requestId, ok: false });
            return;
          }
          var r = results[0];
          var glat = r.geometry.location.lat();
          var glng = r.geometry.location.lng();
          setMapView(glat, glng, 17);
          post({
            type: 'geocodeTextResult',
            requestId: msg.requestId,
            ok: true,
            lat: glat,
            lng: glng,
            formattedAddress: r.formatted_address || msg.query
          });
        });
      }
    } catch (err) {}
  }
</script>
<script async defer
  src="https://maps.googleapis.com/maps/api/js?key=${key}&callback=initMap&libraries=places&v=weekly">
</script>
</body>
</html>`;
}

export function DeliveryLocationPicker({
  visible,
  initial,
  autoDetectOnOpen = true,
  variant = 'delivery',
  onClose,
  onConfirm,
}: DeliveryLocationPickerProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pinOnly = variant === 'pin';
  const webRef = useRef<InstanceType<typeof WebView>>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confirmPending = useRef(false);
  const detectedRef = useRef<string | undefined>(undefined);
  const sourceRef = useRef<'gps' | 'search'>('search');
  const requestIdRef = useRef(0);
  const pendingRequest = useRef<{
    id: number;
    kind: 'autocomplete' | 'details' | 'geocode';
  } | null>(null);
  /** Ignore map "move" echoes right after we programmatically recenter. */
  const suppressMoveUntil = useRef(0);
  /** Auto-detect GPS at most once per map open. */
  const didAutoDetectMapRef = useRef(false);
  const locationEnabledRef = useRef(false);

  const startPoint = useMemo(() => initial ?? DEFAULT, [initial?.lat, initial?.lng]);

  const [viewMode, setViewMode] = useState<'browse' | 'map'>(
    pinOnly ? 'map' : 'browse'
  );
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [currentPreview, setCurrentPreview] =
    useState<DeliveryLocationResult | null>(null);
  const [pin, setPin] = useState(startPoint);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [detectedAddress, setDetectedAddress] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [gpsReady, setGpsReady] = useState(false);

  const savedAddresses = useSavedAddresses({ enabled: visible });
  const activeSavedId = useDeliveryLocationStore(
    (s) => s.location?.savedAddressId
  );

  detectedRef.current = detectedAddress;

  const sendToMap = useCallback((lat: number, lng: number, zoom = 17) => {
    if (!webRef.current) return;
    // Map fires "move" while animating — keep Confirm address stable during that window.
    suppressMoveUntil.current = Date.now() + 700;
    // Android WebView often drops RN postMessage — call setMapView via injectJS
    webRef.current.injectJavaScript(`
      (function() {
        try {
          if (typeof setMapView === 'function') {
            setMapView(${lat}, ${lng}, ${zoom});
          } else if (map) {
            map.setCenter({ lat: ${lat}, lng: ${lng} });
            map.setZoom(${zoom});
          }
        } catch (e) {}
      })();
      true;
    `);
  }, []);

  const reverseLookup = useCallback((lat: number, lng: number) => {
    if (reverseTimer.current) clearTimeout(reverseTimer.current);
    reverseTimer.current = setTimeout(async () => {
      const addr = await reverseGeocodeAddress({ lat, lng });
      if (addr) setDetectedAddress(addr);
    }, 450);
  }, []);

  const applyCoords = useCallback(
    async (
      lat: number,
      lng: number,
      source: 'gps' | 'search',
      formatted?: string
    ): Promise<{ lat: number; lng: number; formattedAddress: string; source: 'gps' | 'search' }> => {
      const safeLat = normalizeLat(lat);
      const safeLng = normalizeLng(lng);
      sourceRef.current = source;
      setPin({ lat: safeLat, lng: safeLng });
      // Jump map immediately (and once more shortly after in case WebView was busy)
      sendToMap(safeLat, safeLng, 17);
      setTimeout(() => sendToMap(safeLat, safeLng, 17), 350);

      let address = formatted;
      if (address && !/^lat\s*-?\d/i.test(address)) {
        setDetectedAddress(address);
        return { lat: safeLat, lng: safeLng, formattedAddress: address, source };
      }

      address = (await reverseGeocodeAddress({ lat: safeLat, lng: safeLng })) ?? undefined;
      if (address) {
        setDetectedAddress(address);
        return { lat: safeLat, lng: safeLng, formattedAddress: address, source };
      }

      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: safeLat,
          longitude: safeLng,
        });
        if (place) {
          const parts = [place.name, place.street, place.city, place.region]
            .filter(Boolean)
            .filter((v, i, arr) => arr.indexOf(v) === i);
          address = parts.join(', ') || 'Selected location';
          setDetectedAddress(address);
          return { lat: safeLat, lng: safeLng, formattedAddress: address, source };
        }
      } catch {
        // ignore
      }
      address = 'Selected location';
      setDetectedAddress(address);
      return { lat: safeLat, lng: safeLng, formattedAddress: address, source };
    },
    [sendToMap]
  );

  const detectCurrentLocation = useCallback(async (): Promise<DeliveryLocationResult | null> => {
    setLocating(true);
    setGpsReady(false);
    setError(null);
    setSearchError(null);
    setSuggestions([]);
    try {
      let perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        perm = await Location.requestForegroundPermissionsAsync();
      }
      if (perm.status !== 'granted') {
        setError(
          'Phone location can be on, but this app still needs permission. Tap Allow when asked.'
        );
        locationEnabledRef.current = false;
        setLocationEnabled(false);
        setCurrentPreview(null);
        return null;
      }

      const servicesOn = await Location.hasServicesEnabledAsync().catch(() => false);
      if (!servicesOn) {
        setError('Device location is off. Turn on Location / GPS in phone settings.');
        locationEnabledRef.current = false;
        setLocationEnabled(false);
        setCurrentPreview(null);
        setGpsReady(false);
        return null;
      }

      let pos: Location.LocationObject;
      try {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch {
        setError('Could not read GPS. Make sure Location is on, then try again.');
        locationEnabledRef.current = false;
        setLocationEnabled(false);
        setCurrentPreview(null);
        return null;
      }

      const { latitude, longitude } = pos.coords;
      const applied = await applyCoords(latitude, longitude, 'gps');
      setGpsReady(true);
      locationEnabledRef.current = true;
      setLocationEnabled(true);
      setSearch('');
      const result: DeliveryLocationResult = {
        lat: applied.lat,
        lng: applied.lng,
        formattedAddress: applied.formattedAddress,
        label: shortAddressLabel(applied.formattedAddress, 'gps'),
        source: 'gps',
      };
      setCurrentPreview(result);
      return result;
    } catch {
      setError('Could not detect your location. Search or pick a saved address instead.');
      locationEnabledRef.current = false;
      setLocationEnabled(false);
      setCurrentPreview(null);
      return null;
    } finally {
      setLocating(false);
    }
  }, [applyCoords]);

  /** Toggle is ON only when app permission AND phone GPS/location services are both on. */
  const syncLocationToggle = useCallback(async (opts?: { detectIfOn?: boolean }) => {
    try {
      const [perm, servicesOn] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.hasServicesEnabledAsync().catch(() => false),
      ]);
      const on = perm.status === 'granted' && servicesOn;
      if (locationEnabledRef.current !== on) {
        locationEnabledRef.current = on;
        setLocationEnabled(on);
      }
      if (!on) {
        setCurrentPreview(null);
        setGpsReady(false);
        return false;
      }
      if (opts?.detectIfOn) {
        void detectCurrentLocation();
      }
      return true;
    } catch {
      if (locationEnabledRef.current) {
        locationEnabledRef.current = false;
        setLocationEnabled(false);
      }
      setCurrentPreview(null);
      setGpsReady(false);
      return false;
    }
  }, [detectCurrentLocation]);

  useEffect(() => {
    if (!visible) {
      setMapReady(false);
      setGpsReady(false);
      setViewMode(pinOnly ? 'map' : 'browse');
      didAutoDetectMapRef.current = false;
      return;
    }
    setError(null);
    setSearchError(null);
    setSuggestions([]);
    setSearch('');
    setPin(startPoint);
    setDetectedAddress(undefined);
    setGpsReady(false);
    setViewMode(pinOnly ? 'map' : 'browse');
    setCurrentPreview(null);
    sourceRef.current = 'search';
    didAutoDetectMapRef.current = false;

    void syncLocationToggle({ detectIfOn: autoDetectOnOpen });
    // Intentionally only re-init when the sheet opens — not when startPoint identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startPoint snapshotted on open
  }, [visible, pinOnly, autoDetectOnOpen, syncLocationToggle]);

  // When user leaves app to toggle phone Location, refresh when they come back.
  // Poll only on the browse screen — polling on the map was re-triggering GPS and flickering Confirm.
  useEffect(() => {
    if (!visible || pinOnly) return;

    const onAppState = (next: AppStateStatus) => {
      if (next === 'active') {
        void syncLocationToggle({ detectIfOn: false });
      }
    };

    const sub = AppState.addEventListener('change', onAppState);
    if (viewMode !== 'browse') {
      return () => {
        sub.remove();
      };
    }

    const poll = setInterval(() => {
      void syncLocationToggle({ detectIfOn: false });
    }, 4000);

    return () => {
      sub.remove();
      clearInterval(poll);
    };
  }, [visible, viewMode, pinOnly, syncLocationToggle]);

  useEffect(() => {
    if (!visible || viewMode !== 'map' || !mapReady) return;
    if (autoDetectOnOpen && locationEnabled) {
      if (didAutoDetectMapRef.current) return;
      didAutoDetectMapRef.current = true;
      void detectCurrentLocation();
      return;
    }
    if (initial) {
      sendToMap(initial.lat, initial.lng);
      reverseLookup(initial.lat, initial.lng);
    }
    // Use lat/lng primitives — object identity of `initial` was re-running this and flickering Confirm.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    visible,
    viewMode,
    mapReady,
    autoDetectOnOpen,
    locationEnabled,
    initial?.lat,
    initial?.lng,
    detectCurrentLocation,
    sendToMap,
    reverseLookup,
  ]);

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (reverseTimer.current) clearTimeout(reverseTimer.current);
    };
  }, []);

  const runRestAutocomplete = useCallback(async (query: string, requestId: number) => {
    setSearching(true);
    setSearchError(null);
    try {
      const res = await searchAddresses(query, {
        bias: {
          lat: pin.lat,
          lng: pin.lng,
          radiusMeters: 40000,
        },
      });
      // Ignore stale responses when user kept typing
      if (requestId !== requestIdRef.current) return;
      setSuggestions(res);
      if (res.length === 0) {
        setSearchError('No places found. Try a landmark, area, or full address.');
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setSuggestions([]);
      setSearchError(
        getApiErrorMessage(err, 'Could not load address suggestions')
      );
    } finally {
      if (requestId === requestIdRef.current) {
        setSearching(false);
      }
    }
  }, [pin.lat, pin.lng]);

  const askWebViewAutocomplete = useCallback((query: string, requestId: number) => {
    if (!GOOGLE_MAPS_API_KEY || !mapReady || !webRef.current) return;
    pendingRequest.current = { id: requestId, kind: 'autocomplete' };
    const payload = JSON.stringify({
      type: 'autocomplete',
      query,
      requestId,
      lat: pin.lat,
      lng: pin.lng,
      radius: 40000,
    });
    webRef.current.injectJavaScript(`
      (function() {
        try {
          if (typeof handleRN === 'function') {
            handleRN({ data: ${JSON.stringify(payload)} });
          }
        } catch (e) {}
      })();
      true;
    `);
  }, [mapReady, pin.lat, pin.lng]);

  const onSearchChange = (text: string) => {
    setSearch(text);
    setSearchError(null);
    setGpsReady(false);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) {
      setSuggestions([]);
      setSearching(false);
      pendingRequest.current = null;
      return;
    }

    searchTimer.current = setTimeout(() => {
      const query = text.trim();
      const id = ++requestIdRef.current;
      setSearching(true);
      setSuggestions([]);
      // Always search from RN (Photon + OSM + Google + backend)
      void runRestAutocomplete(query, id);
      // Also try in-map Places when available
      askWebViewAutocomplete(query, id);
    }, 280);
  };

  const onMapMessage = (event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        setMapReady(true);
        return;
      }

      if (msg.type === 'move' && typeof msg.lat === 'number') {
        const lat = normalizeLat(msg.lat);
        const lng = normalizeLng(msg.lng);
        setPin({ lat, lng });
        // Keep previous address visible while map settles / programmatic recenter runs
        // so Confirm doesn't flicker between spinner, coords, and address.
        if (Date.now() < suppressMoveUntil.current) {
          return;
        }
        setGpsReady(false);
        sourceRef.current = 'search';
        reverseLookup(lat, lng);
        return;
      }

      if (msg.type === 'autocompleteResults') {
        // WebView Places is optional — merge with REST results if available
        if (
          msg.status === 'OK' &&
          Array.isArray(msg.predictions) &&
          msg.predictions.length
        ) {
          if (
            pendingRequest.current?.id === msg.requestId ||
            msg.requestId === requestIdRef.current
          ) {
            pendingRequest.current = null;
            const mapped: AddressSuggestion[] = msg.predictions.map(
              (p: {
                description: string;
                placeId: string;
                mainText?: string;
                secondaryText?: string;
              }) => ({
                description: p.description,
                placeId: p.placeId,
                mainText: p.mainText,
                secondaryText: p.secondaryText,
                source: 'google-webview',
              })
            );
            setSuggestions((prev) => {
              const seen = new Set(
                prev.map((s) => s.description.toLowerCase())
              );
              const extra = mapped.filter(
                (s) => !seen.has(s.description.toLowerCase())
              );
              // Keep REST/backend results first; WebView Google only fills gaps.
              return [...prev, ...extra].slice(0, 10);
            });
            setSearching(false);
            setSearchError(null);
          }
        }
        return;
      }

      if (msg.type === 'placeDetailsResult') {
        if (pendingRequest.current?.id !== msg.requestId) return;
        pendingRequest.current = null;
        setSearching(false);
        if (msg.ok) {
          void applyCoords(msg.lat, msg.lng, 'search', msg.formattedAddress);
          setSuggestions([]);
          Keyboard.dismiss();
          return;
        }
        setError('Could not open that place. Try another suggestion.');
        return;
      }

      if (msg.type === 'geocodeTextResult') {
        if (pendingRequest.current?.id !== msg.requestId) return;
        pendingRequest.current = null;
        setSearching(false);
        if (msg.ok) {
          void applyCoords(msg.lat, msg.lng, 'search', msg.formattedAddress);
          setSuggestions([]);
          setSearch(msg.formattedAddress || search);
          Keyboard.dismiss();
          return;
        }
        void (async () => {
          try {
            const geo = await geocodeAddress({ address: search.trim() });
            await applyCoords(
              geo.lat,
              geo.lng,
              'search',
              geo.formattedAddress ?? search.trim()
            );
            setSuggestions([]);
          } catch (err) {
            setSearchError(
              getApiErrorMessage(err, 'No results for that address')
            );
          }
        })();
        return;
      }

      if (
        msg.type === 'confirm' &&
        confirmPending.current &&
        typeof msg.lat === 'number' &&
        typeof msg.lng === 'number'
      ) {
        confirmPending.current = false;
        const formatted =
          detectedRef.current ??
          `Lat ${msg.lat.toFixed(5)}, Lng ${msg.lng.toFixed(5)}`;
        onConfirm({
          lat: msg.lat,
          lng: msg.lng,
          formattedAddress: formatted,
          label: shortAddressLabel(formatted, sourceRef.current),
          source: sourceRef.current,
        });
      }
    } catch {
      // ignore malformed messages
    }
  };

  const pickSuggestion = async (item: AddressSuggestion) => {
    Keyboard.dismiss();
    setSuggestions([]);
    setSearch(item.description);
    setSearching(true);
    setSearchError(null);
    setError(null);
    setGpsReady(false);

    try {
      const lat = typeof item.lat === 'number' ? item.lat : undefined;
      const lng = typeof item.lng === 'number' ? item.lng : undefined;

      // Prefer coords already on the suggestion (OSM/Photon)
      if (
        lat != null &&
        lng != null &&
        Number.isFinite(lat) &&
        Number.isFinite(lng)
      ) {
        await applyCoords(lat, lng, 'search', item.description);
        return;
      }

      // Resolve Google placeId / address via Places API (New) — do not wait on WebView
      const geo = await geocodeAddress({
        placeId: item.placeId,
        address: item.description,
      });
      await applyCoords(
        geo.lat,
        geo.lng,
        'search',
        geo.formattedAddress ?? item.description
      );
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to open this place on the map'));
    } finally {
      setSearching(false);
    }
  };

  const submitSearch = () => {
    const query = search.trim();
    if (query.length < 2) return;
    Keyboard.dismiss();
    setSuggestions([]);
    setSearching(true);
    setSearchError(null);
    setError(null);

    void (async () => {
      try {
        // If a suggestion is already selected text, geocode it via Places New / fallbacks
        const geo = await geocodeAddress({ address: query });
        await applyCoords(
          geo.lat,
          geo.lng,
          'search',
          geo.formattedAddress ?? query
        );
        if (geo.formattedAddress) setSearch(geo.formattedAddress);
      } catch (err) {
        setSearchError(getApiErrorMessage(err, 'No results for that address'));
      } finally {
        setSearching(false);
      }
    })();
  };

  const handleConfirm = () => {
    const formatted =
      detectedAddress ?? `Lat ${pin.lat.toFixed(5)}, Lng ${pin.lng.toFixed(5)}`;

    onConfirm({
      lat: pin.lat,
      lng: pin.lng,
      formattedAddress: formatted,
      label: shortAddressLabel(formatted, sourceRef.current),
      source: sourceRef.current,
    });
  };

  const selectSavedAddress = (address: SavedAddress) => {
    const displayLabel = formatAddressLabel(address.label) || 'Home';
    onConfirm({
      lat: address.lat,
      lng: address.lng,
      formattedAddress: address.formattedAddress,
      label: displayLabel,
      source: 'saved',
      savedAddressId: address.id,
    });
  };

  const onToggleLocation = (value: boolean) => {
    if (!value) {
      locationEnabledRef.current = false;
      setLocationEnabled(false);
      setCurrentPreview(null);
      setGpsReady(false);
      return;
    }
    // Turning on: request permission + verify phone GPS is actually enabled.
    void (async () => {
      const ok = await detectCurrentLocation();
      if (!ok) {
        // detectCurrentLocation already set toggle off + error if GPS/permission failed
        await syncLocationToggle({ detectIfOn: false });
      }
    })();
  };

  const useCurrentLocationOption = async () => {
    const result = currentPreview ?? (await detectCurrentLocation());
    if (result) {
      onConfirm(result);
    }
  };

  const openAddAddress = () => {
    setViewMode('map');
  };

  const requestAddressViaWhatsApp = async () => {
    const message = encodeURIComponent(
      'Hi! Can you please share your delivery address with me?'
    );
    const url = `whatsapp://send?text=${message}`;
    const webUrl = `https://wa.me/?text=${message}`;
    try {
      const can = await Linking.canOpenURL(url);
      await Linking.openURL(can ? url : webUrl);
    } catch {
      Alert.alert('WhatsApp', 'Could not open WhatsApp on this device.');
    }
  };

  const labelIcon = (label: string) => {
    const lower = label.toLowerCase();
    if (lower === 'work') {
      return <Briefcase color="#1C1C1C" size={15} strokeWidth={2} />;
    }
    return <Home color="#1C1C1C" size={15} strokeWidth={2} />;
  };

  // Rebuild map HTML only when the sheet opens — remounting on GPS/pin updates caused Confirm flicker.
  const mapHtml = useMemo(
    () =>
      !visible || !GOOGLE_MAPS_API_KEY
        ? ''
        : buildGoogleMapHtml(
            startPoint.lat,
            startPoint.lng,
            GOOGLE_MAPS_API_KEY,
            MAP_PIN_COLOR
          ),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot startPoint when visible flips
    [visible]
  );

  const mapWebViewKey = `${MAP_THEME_VERSION}-${visible ? '1' : '0'}`;

  const showSuggestions = search.trim().length >= 2;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {viewMode === 'browse' && !pinOnly ? (
        <Animated.View
          style={[styles.browseRoot, { paddingTop: insets.top + 6 }]}
        >
          <Animated.View>
            <View style={styles.headerRow}>
              <SmoothPressable onPress={onClose} style={styles.backBtn} hitSlop={10} pressScale={0.9}>
                <ArrowLeft color="#02060C" size={22} strokeWidth={2.2} />
              </SmoothPressable>
              <Text style={styles.headerTitle}>Select Your Location</Text>
            </View>
          </Animated.View>

          <Animated.View>
            <View style={styles.searchBar}>
              <TextInput
                value={search}
                onChangeText={onSearchChange}
                onSubmitEditing={submitSearch}
                placeholder="Search an area or address"
                placeholderTextColor="#93959F"
                style={styles.searchInput}
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="words"
              />
              {searching ? (
                <ActivityIndicator color={authTheme.brand} size="small" />
              ) : search.length > 0 ? (
                <SmoothPressable
                  onPress={() => {
                    setSearch('');
                    setSuggestions([]);
                    setSearchError(null);
                  }}
                  hitSlop={8}
                  pressScale={0.88}
                >
                  <X color="#686B78" size={18} />
                </SmoothPressable>
              ) : (
                <Search color="#686B78" size={18} strokeWidth={2} />
              )}
            </View>
          </Animated.View>

          {showSuggestions ? (
            <View style={styles.suggestionsCard}>
              {searching && suggestions.length === 0 ? (
                <View style={styles.searchingRow}>
                  <ActivityIndicator color={authTheme.brand} size="small" />
                  <Text style={styles.searchingText}>Finding places…</Text>
                </View>
              ) : null}
              {searchError && suggestions.length === 0 && !searching ? (
                <Text style={styles.searchErrorInline}>{searchError}</Text>
              ) : null}
              <ScrollView keyboardShouldPersistTaps="always" style={{ maxHeight: 320 }}>
                {suggestions.slice(0, 8).map((item, index) => (
                  <Pressable
                    key={`${item.placeId ?? item.description}-${index}`}
                    onPress={() => {
                      void pickSuggestion(item).then(() => setViewMode('map'));
                    }}
                    style={[
                      styles.suggestionRow,
                      index === Math.min(suggestions.length, 8) - 1 &&
                        styles.suggestionRowLast,
                    ]}
                  >
                    <View style={styles.suggestionIcon}>
                      <MapPin color={authTheme.brand} size={16} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionMain} numberOfLines={1}>
                        {String(item.mainText || item.description.split(',')[0])}
                      </Text>
                      <Text style={styles.suggestionSecondary} numberOfLines={2}>
                        {String(
                          item.secondaryText ||
                            item.description
                              .split(',')
                              .slice(1)
                              .join(',')
                              .trim() ||
                            item.description
                        )}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingBottom: Math.max(insets.bottom, 20) + 16,
              }}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                style={styles.actionRow}
              >
                <SmoothPressable
                  style={styles.actionCard}
                  onPress={() => onToggleLocation(!locationEnabled)}
                  disabled={locating}
                  pressScale={0.96}
                >
                  {locating ? (
                    <ActivityIndicator color={authTheme.brand} style={{ marginTop: 2 }} />
                  ) : (
                    <LocationToggle
                      value={locationEnabled}
                      onChange={onToggleLocation}
                      disabled={locating}
                    />
                  )}
                  <Text style={styles.actionLabel}>
                    {locating
                      ? 'Detecting…'
                      : locationEnabled
                        ? 'Location on'
                        : 'Turn on Location'}
                  </Text>
                </SmoothPressable>

                <SmoothPressable
                  style={styles.actionCard}
                  onPress={openAddAddress}
                  pressScale={0.96}
                >
                  <View style={styles.addIconBox}>
                    <Plus color="#FFFFFF" size={13} strokeWidth={3} />
                  </View>
                  <Text style={styles.actionLabel}>Add New Address</Text>
                </SmoothPressable>

                <SmoothPressable
                  style={styles.actionCard}
                  onPress={() => void requestAddressViaWhatsApp()}
                  pressScale={0.96}
                >
                  <MaterialCommunityIcons
                    name="whatsapp"
                    size={22}
                    color="#25D366"
                  />
                  <Text style={styles.actionLabel}>Request Address</Text>
                </SmoothPressable>
              </Animated.View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {locationEnabled ? (
                <Animated.View>
                  <Text style={styles.sectionLabel}>CURRENT LOCATION</Text>
                  <View style={styles.savedCard}>
                    <SmoothPressable
                      style={styles.savedRow}
                      onPress={() => void useCurrentLocationOption()}
                      disabled={locating}
                      pressScale={0.985}
                    >
                      <View style={[styles.savedIcon, styles.currentLocIcon]}>
                        {locating ? (
                          <ActivityIndicator color={authTheme.brand} size="small" />
                        ) : (
                          <Navigation color={authTheme.brand} size={18} strokeWidth={2.4} />
                        )}
                      </View>
                      <View style={styles.savedBody}>
                        <View style={styles.savedTitleRow}>
                          <Text style={styles.savedTitle} numberOfLines={1}>
                            {locating ? 'Detecting…' : 'Current location'}
                          </Text>
                          {gpsReady && !locating ? (
                            <View style={styles.selectedBadge}>
                              <Text style={styles.selectedBadgeText}>GPS</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.savedAddress} numberOfLines={2}>
                          {locating
                            ? 'Getting your position…'
                            : currentPreview?.formattedAddress ||
                              'Use your live GPS position for delivery'}
                        </Text>
                      </View>
                      <ArrowLeft
                        color="#9CA3AF"
                        size={16}
                        strokeWidth={2.4}
                        style={{ transform: [{ rotate: '180deg' }] }}
                      />
                    </SmoothPressable>
                  </View>
                </Animated.View>
              ) : null}

              <Animated.View>
                <Text style={styles.sectionLabel}>SAVED ADDRESSES</Text>

                <View style={styles.savedCard}>
                  {savedAddresses.isLoading ? (
                    <View style={styles.savedEmpty}>
                      <ActivityIndicator color={authTheme.brand} />
                    </View>
                  ) : (savedAddresses.data?.length ?? 0) === 0 ? (
                    <View style={styles.savedEmpty}>
                      <Text style={styles.savedEmptyText}>
                        No saved addresses yet. Add one to order faster.
                      </Text>
                      <SmoothPressable
                        style={styles.savedEmptyCta}
                        onPress={openAddAddress}
                        pressScale={0.95}
                      >
                        <Text style={styles.savedEmptyCtaText}>Add address</Text>
                      </SmoothPressable>
                    </View>
                  ) : (
                    (savedAddresses.data ?? []).map((address, index, arr) => {
                      const title = formatAddressLabel(address.label);
                      const selected =
                        activeSavedId === address.id ||
                        (!activeSavedId && address.isDefault && index === 0);
                      return (
                        <SmoothPressable
                          key={address.id}
                          style={[
                            styles.savedRow,
                            index < arr.length - 1 && styles.savedRowBorder,
                          ]}
                          onPress={() => selectSavedAddress(address)}
                          pressScale={0.985}
                        >
                          <View style={styles.savedIcon}>
                            {labelIcon(String(address.label))}
                          </View>

                          <View style={styles.savedBody}>
                            <View style={styles.savedTitleRow}>
                              <Text style={styles.savedTitle} numberOfLines={1}>
                                {title}
                              </Text>
                              {selected ? (
                                <View style={styles.selectedBadge}>
                                  <Text style={styles.selectedBadgeText}>
                                    SELECTED
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={styles.savedAddress}>
                              {address.formattedAddress}
                            </Text>
                          </View>

                          <Pressable
                            hitSlop={12}
                            onPress={() => {
                              onClose();
                              router.push('/profile/addresses' as never);
                            }}
                            style={styles.moreBtn}
                            accessibilityLabel="Address options"
                          >
                            <MoreVertical
                              color="#1A1A1A"
                              size={18}
                              strokeWidth={2.5}
                            />
                          </Pressable>
                        </SmoothPressable>
                      );
                    })
                  )}
                </View>
              </Animated.View>
            </ScrollView>
          )}
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(160)} style={styles.root}>
          <View style={styles.mapPane}>
            {visible && GOOGLE_MAPS_API_KEY ? (
              <WebView
                key={mapWebViewKey}
                ref={webRef}
                style={styles.map}
                originWhitelist={['*']}
                source={{ html: mapHtml, baseUrl: 'https://maps.googleapis.com' }}
                onMessage={onMapMessage}
                javaScriptEnabled
                domStorageEnabled
                geolocationEnabled
                startInLoadingState
                renderLoading={() => (
                  <View style={styles.mapLoading}>
                    <ActivityIndicator color={authTheme.brand} size="large" />
                    <Text style={styles.mapLoadingText}>Loading map…</Text>
                  </View>
                )}
              />
            ) : (
              <View style={styles.mapFallback}>
                <MapPin color={authTheme.brand} size={40} />
                <Text style={styles.mapFallbackTitle}>
                  {GOOGLE_MAPS_API_KEY
                    ? 'Preparing map…'
                    : 'Map key missing — search still works'}
                </Text>
                <Text style={styles.mapFallbackText}>
                  Use current location or search for an address below.
                </Text>
              </View>
            )}

            <View
              style={[styles.topSection, { paddingTop: insets.top + 8 }]}
              pointerEvents="box-none"
            >
              <View style={styles.topBar}>
                <Pressable
                  onPress={() => {
                    if (pinOnly) {
                      onClose();
                      return;
                    }
                    setViewMode('browse');
                  }}
                  style={styles.mapBackBtn}
                  hitSlop={10}
                >
                  <ArrowLeft color="#02060C" size={20} strokeWidth={2.2} />
                </Pressable>
                <View style={styles.searchWrap}>
                  <Search color={authTheme.textMuted} size={18} />
                  <TextInput
                    value={search}
                    onChangeText={onSearchChange}
                    onSubmitEditing={submitSearch}
                    placeholder="Search area, street, landmark…"
                    placeholderTextColor={authTheme.textMuted}
                    style={styles.mapSearchInput}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="words"
                  />
                  {searching ? (
                    <ActivityIndicator color={authTheme.brand} size="small" />
                  ) : search.length > 0 ? (
                    <Pressable
                      onPress={() => {
                        setSearch('');
                        setSuggestions([]);
                        setSearchError(null);
                      }}
                      hitSlop={8}
                    >
                      <X color={authTheme.textMuted} size={16} />
                    </Pressable>
                  ) : null}
                </View>
              </View>

              {search.trim().length < 2 ? (
                <Pressable
                  style={styles.currentLocationCard}
                  onPress={detectCurrentLocation}
                  disabled={locating}
                >
                  <View style={styles.currentLocationIcon}>
                    {locating ? (
                      <ActivityIndicator color={authTheme.brand} size="small" />
                    ) : (
                      <Navigation color={authTheme.brand} size={18} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.currentLocationTitle}>
                      {locating
                        ? 'Detecting your location…'
                        : gpsReady
                          ? 'Using your current location'
                          : 'Use my current location'}
                    </Text>
                    <Text style={styles.currentLocationSub}>
                      {gpsReady
                        ? 'Pin is on you — confirm below or fine-tune on the map'
                        : 'Automatically set delivery to where you are now'}
                    </Text>
                  </View>
                  <Crosshair color={authTheme.brand} size={18} />
                </Pressable>
              ) : (
                <View style={styles.suggestions}>
                  {searching && suggestions.length === 0 ? (
                    <View style={styles.searchingCard}>
                      <ActivityIndicator color={authTheme.brand} size="small" />
                      <Text style={styles.searchingText}>Finding places…</Text>
                    </View>
                  ) : null}
                  {searchError && suggestions.length === 0 && !searching ? (
                    <Text style={styles.searchErrorInline}>{searchError}</Text>
                  ) : null}
                  <ScrollView
                    keyboardShouldPersistTaps="always"
                    nestedScrollEnabled
                    style={styles.suggestionsScroll}
                  >
                    {suggestions.slice(0, 8).map((item, index) => (
                      <Pressable
                        key={`${item.placeId ?? item.description}-${index}`}
                        onPress={() => void pickSuggestion(item)}
                        style={[
                          styles.suggestionRow,
                          index === Math.min(suggestions.length, 8) - 1 &&
                            styles.suggestionRowLast,
                        ]}
                      >
                        <View style={styles.suggestionIcon}>
                          <MapPin color={authTheme.brand} size={16} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionMain} numberOfLines={1}>
                            {String(
                              item.mainText || item.description.split(',')[0]
                            )}
                          </Text>
                          <Text
                            style={styles.suggestionSecondary}
                            numberOfLines={2}
                          >
                            {String(
                              item.secondaryText ||
                                item.description
                                  .split(',')
                                  .slice(1)
                                  .join(',')
                                  .trim() ||
                                item.description
                            )}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>

          <View
            style={[
              styles.bottomPanel,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <View style={styles.detectedRow}>
              <MapPin color={authTheme.brand} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detectedLabel}>DELIVERY LOCATION</Text>
                <Text style={styles.detectedValue} numberOfLines={2}>
                  {locating && !detectedAddress
                    ? 'Getting your address…'
                    : detectedAddress ??
                      `Lat ${pin.lat.toFixed(5)}, Lng ${pin.lng.toFixed(5)}`}
                </Text>
                <Text style={styles.detectedHint}>
                  Drag the map to fine-tune · or search above
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleConfirm}
              disabled={locating && !detectedAddress}
              style={{
                marginTop: 14,
                height: 54,
                borderRadius: 14,
                backgroundColor: authTheme.brand,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                opacity: locating && !detectedAddress ? 0.6 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel="Confirm delivery location"
            >
              {locating && !detectedAddress ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Check color="#FFFFFF" size={20} strokeWidth={2.5} />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 16,
                      fontFamily: fonts.displayBold,
                      color: '#FFFFFF',
                    }}
                  >
                    Confirm location
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  browseRoot: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 14,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: '#02060C',
    letterSpacing: -0.3,
  },
  searchBar: {
    marginHorizontal: 16,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E2E7',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#02060C',
    paddingVertical: 0,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 16,
  },
  actionCard: {
    flex: 1,
    minHeight: 88,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  addIconBox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    backgroundColor: ADD_ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#2C2F3A',
    lineHeight: 16,
    paddingTop: 8,
  },
  sectionLabel: {
    marginTop: 22,
    marginHorizontal: 16,
    marginBottom: 10,
    fontFamily: fonts.uiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#9CA3AF',
  },
  savedCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  savedRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  savedIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  currentLocIcon: {
    backgroundColor: '#EEF8F1',
  },
  savedBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  savedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingRight: 4,
  },
  savedTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: '#02060C',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  selectedBadge: {
    backgroundColor: SELECTED_BG,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  selectedBadgeText: {
    fontFamily: fonts.displayBold,
    fontSize: 10,
    color: SELECTED_TEXT,
    letterSpacing: 0.4,
  },
  savedAddress: {
    marginTop: 5,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#686B78',
    lineHeight: 19,
  },
  moreBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  savedEmpty: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  savedEmptyText: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#686B78',
    textAlign: 'center',
    lineHeight: 18,
  },
  savedEmptyCta: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: authTheme.brandSoft,
  },
  savedEmptyCtaText: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: authTheme.brand,
  },
  suggestionsCard: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    overflow: 'hidden',
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },

  root: { flex: 1, backgroundColor: '#FFFFFF' },
  mapPane: {
    flex: 1,
    backgroundColor: '#E8EAED',
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
    backgroundColor: '#E8EAED',
  },
  mapLoading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#E8EAED',
  },
  mapLoadingText: {
    fontSize: 14,
    color: authTheme.textMuted,
    fontFamily: fonts.uiSemi,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
    backgroundColor: authTheme.surface,
  },
  mapFallbackTitle: {
    color: authTheme.text,
    fontFamily: fonts.displayBold,
    fontSize: 16,
    textAlign: 'center',
  },
  mapFallbackText: {
    color: authTheme.textMuted,
    fontFamily: fonts.ui,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  topSection: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  mapBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  mapSearchInput: { flex: 1, fontSize: 15, color: authTheme.text, fontFamily: fonts.ui },
  currentLocationCard: {
    marginTop: 10,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  currentLocationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: authTheme.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationTitle: {
    color: authTheme.text,
    fontFamily: fonts.displayBold,
    fontSize: 14,
  },
  currentLocationSub: {
    color: authTheme.textMuted,
    fontFamily: fonts.ui,
    fontSize: 12,
    marginTop: 2,
  },
  searchingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  searchingText: {
    color: authTheme.textMuted,
    fontFamily: fonts.uiSemi,
    fontSize: 13,
  },
  searchErrorInline: {
    fontSize: 13,
    color: authTheme.error,
    fontFamily: fonts.uiMedium,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  suggestions: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 16,
    maxHeight: 340,
    zIndex: 50,
  },
  suggestionsScroll: {
    maxHeight: 340,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  suggestionRowLast: { borderBottomWidth: 0 },
  suggestionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: authTheme.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  suggestionMain: {
    color: '#0F172A',
    fontFamily: fonts.uiBold,
    fontSize: 14,
  },
  suggestionSecondary: {
    color: '#64748B',
    fontFamily: fonts.ui,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  bottomPanel: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  detectedRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detectedLabel: {
    fontSize: 11,
    fontFamily: fonts.uiBold,
    letterSpacing: 1,
    color: authTheme.textMuted,
  },
  detectedValue: {
    marginTop: 2,
    fontSize: 14,
    fontFamily: fonts.uiSemi,
    color: authTheme.text,
  },
  detectedHint: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: fonts.ui,
    color: authTheme.textDim,
  },
  errorText: {
    fontSize: 13,
    color: authTheme.error,
    fontFamily: fonts.uiMedium,
    marginBottom: 8,
    marginHorizontal: 16,
    marginTop: 10,
  },
});
