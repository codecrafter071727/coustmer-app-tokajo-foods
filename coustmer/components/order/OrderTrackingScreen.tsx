import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bike,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Headset,
  MapPin,
  Phone,
  Star,
  Store,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  Linking,
  Share,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { fonts } from '@/constants/typography';
import { deliveryApi } from '@/lib/delivery/api';
import {
  deliveryKeys,
  useChatHistory,
  useChangeAddress,
  useContactPartner,
  useContactSupport,
  useCreateShareLink,
  useDropOtp,
  useLiveLocation,
  useNudgePartner,
  useOrderDeliveryPartner,
  useOrderTracking as useDeliveryTracking,
  useRevokeShareLink,
  useRatePartner,
  useSendChat,
  useSetContactless,
  useSetDeliveryInstructions,
  useAddTip,
  useTrackingEta,
  useTrackingRoute,
} from '@/lib/delivery/hooks';
import { GOOGLE_MAPS_API_KEY } from '@/lib/google-maps';
import { useOrder, useReorder } from '@/lib/order/hooks';
import { toE164IndianMobile } from '@/lib/order/phone';
import { paymentMethodLabel } from '@/lib/order/payment-labels';
import {
  canRateOrder,
  isActiveOrderStatus,
  normalizeOrderStatus,
} from '@/lib/order/types';
import {
  useDeliveryStatusSocket,
  useEtaSocket,
  useOrderStatusSocket,
  usePartnerLocationSocket,
} from '@/lib/socket/hooks';
import { useCartStore } from '@/store/cart-store';

const ORANGE = '#FF6A00';
const ORANGE_SOFT = '#FFF4EC';
const INK = '#111827';
const INK_SOFT = '#374151';
const MUTED = '#6B7280';
const LINE = '#ECEFF3';
const WHITE = '#FFFFFF';
const GREEN = '#059669';
const SHEET = '#F7F8FA';

type StepKey = 'placed' | 'preparing' | 'on_the_way' | 'delivered';

function isTerminalCancelled(status?: string) {
  const s = normalizeOrderStatus(status);
  return ['cancelled', 'canceled', 'rejected', 'failed'].includes(s);
}

function isOrderCompleted(status?: string) {
  const s = normalizeOrderStatus(status);
  return s === 'delivered' || s === 'completed';
}

function statusLabel(status?: string) {
  const s = normalizeOrderStatus(status ?? 'placed');
  if (isTerminalCancelled(s)) return 'Cancelled';
  if (isOrderCompleted(s)) return 'Completed';
  if (s === 'arrived_at_customer' || s.includes('arrived_at_customer')) {
    return 'Partner at your door';
  }
  if (s.includes('out') || s.includes('way') || s.includes('pick')) {
    return 'Out for delivery';
  }
  if (s.includes('ready')) return 'Ready for pickup';
  if (s.includes('prepar')) return 'Preparing your food';
  if (s.includes('confirm') || s.includes('accept')) return 'Order confirmed';
  return 'Order placed';
}

function statusHint(status?: string, active?: boolean) {
  const s = normalizeOrderStatus(status);
  if (!active) {
    if (isTerminalCancelled(s)) return 'This order was cancelled';
    if (isOrderCompleted(s)) return 'Your order was delivered successfully';
    return 'Order update';
  }
  if (s === 'arrived_at_customer' || s.includes('arrived_at_customer')) {
    return 'Share the delivery OTP below to complete your order';
  }
  if (s.includes('out') || s.includes('way') || s.includes('pick')) {
    return 'Your partner is on the way';
  }
  if (s.includes('prepar') || s.includes('ready')) {
    return 'Kitchen is crafting your order';
  }
  if (s.includes('confirm') || s.includes('accept')) {
    return 'Restaurant has accepted your order';
  }
  return 'We’ve received your order';
}

function currentStep(status?: string): StepKey {
  const s = normalizeOrderStatus(status);
  if (isOrderCompleted(s)) return 'delivered';
  if (isTerminalCancelled(s)) return 'preparing';
  if (
    s === 'arrived_at_customer' ||
    s.includes('arrived_at_customer') ||
    s.includes('out') ||
    s.includes('way') ||
    s.includes('pick')
  ) {
    return 'on_the_way';
  }
  if (s.includes('prepar') || s.includes('ready')) return 'preparing';
  return 'placed';
}

function stepIndex(key: StepKey) {
  return ['placed', 'preparing', 'on_the_way', 'delivered'].indexOf(key);
}

function etaFromSeconds(seconds?: number): string | null {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null;
  return `${Math.max(1, Math.round(seconds / 60))} mins`;
}

function etaFromIso(iso?: string): string | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return null;
  const mins = Math.ceil((at - Date.now()) / 60000);
  return mins > 0 ? `${mins} mins` : 'Arriving soon';
}

function statusEtaFallback(
  status?: string,
  order?: {
    createdAt?: string;
    acceptedAt?: string;
    preparingAt?: string;
    readyAt?: string;
    outForDeliveryAt?: string;
    raw?: Record<string, unknown>;
  }
): string | null {
  const s = normalizeOrderStatus(status);
  if (!s || s === 'delivered' || s === 'completed' || s === 'cancelled' || s === 'canceled') return null;

  const pickIso = (...vals: Array<string | undefined>): string | undefined =>
    vals.find((v) => typeof v === 'string' && Number.isFinite(new Date(v).getTime()));
  const raw = order?.raw ?? {};

  const phaseStartedAt = (() => {
    if (s.includes('out') || s.includes('way') || s.includes('pick')) {
      return pickIso(
        order?.outForDeliveryAt,
        String(raw['outForDeliveryAt'] ?? ''),
        String(raw['pickedUpAt'] ?? ''),
        order?.readyAt
      );
    }
    if (s === 'preparing' || s === 'ready') {
      return pickIso(
        order?.preparingAt,
        String(raw['preparingAt'] ?? ''),
        order?.acceptedAt,
        String(raw['acceptedAt'] ?? '')
      );
    }
    return pickIso(
      order?.acceptedAt,
      String(raw['acceptedAt'] ?? ''),
      order?.createdAt,
      String(raw['createdAt'] ?? '')
    );
  })();

  const elapsedMinutes = (() => {
    if (!phaseStartedAt) return 0;
    const started = new Date(phaseStartedAt).getTime();
    if (!Number.isFinite(started)) return 0;
    return Math.max(0, Math.floor((Date.now() - started) / 60000));
  })();

  const baseMinutes =
    s.includes('out') || s.includes('way') || s.includes('pick')
      ? 10
      : s === 'preparing' || s === 'ready'
        ? 18
        : 25;

  // Before SLA breach: show normal countdown.
  if (elapsedMinutes < baseMinutes) {
    return `${Math.max(1, baseMinutes - elapsedMinutes)} mins`;
  }

  // After breach: extend ETA as delay grows (dynamic overrun handling).
  const overrun = elapsedMinutes - baseMinutes;
  const extended = Math.min(45, 6 + Math.ceil(overrun * 0.6));
  return `${Math.max(3, extended)} mins`;
}

function generateMapHtml(opts: {
  restLat: number;
  restLng: number;
  custLat: number;
  custLng: number;
  partnerLat?: number;
  partnerLng?: number;
  restName: string;
  apiKey: string;
}) {
  const {
    restLat,
    restLng,
    custLat,
    custLng,
    partnerLat,
    partnerLng,
    restName,
    apiKey,
  } = opts;
  const safeName = restName.replace(/'/g, "\\'");
  const hasPartner =
    typeof partnerLat === 'number' &&
    typeof partnerLng === 'number' &&
    Number.isFinite(partnerLat) &&
    Number.isFinite(partnerLng);

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; }
    body { background: #e8eaed; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    function initMap() {
      const rest = { lat: ${restLat}, lng: ${restLng} };
      const cust = { lat: ${custLat}, lng: ${custLng} };
      const partner = ${hasPartner ? `{ lat: ${partnerLat}, lng: ${partnerLng} }` : 'null'};

      const map = new google.maps.Map(document.getElementById('map'), {
        zoom: 14,
        center: {
          lat: (rest.lat + cust.lat) / 2,
          lng: (rest.lng + cust.lng) / 2
        },
        disableDefaultUI: true,
        gestureHandling: 'none',
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#f1f3f4' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#f1f3f4' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
          { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e5e7eb' }] },
          { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e5e7eb' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dbeafe' }] },
          { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#eef0f2' }] }
        ]
      });

      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#FF6A00',
          strokeOpacity: 0.95,
          strokeWeight: 5
        }
      });

      function pin(color, label) {
        return {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">' +
            '<path d="M18 0C8.06 0 0 8.06 0 18c0 12.75 18 30 18 30s18-17.25 18-30C36 8.06 27.94 0 18 0z" fill="' + color + '"/>' +
            '<circle cx="18" cy="18" r="7.5" fill="#fff"/>' +
            '</svg>'
          ),
          scaledSize: new google.maps.Size(36, 48),
          anchor: new google.maps.Point(18, 46),
          labelOrigin: new google.maps.Point(18, 58)
        };
      }

      new google.maps.Marker({
        position: rest,
        map,
        icon: pin('#111827', '${safeName}'),
        label: { text: 'Restaurant', color: '#111827', fontWeight: '700', fontSize: '11px' }
      });

      new google.maps.Marker({
        position: cust,
        map,
        icon: pin('#FF6A00', 'You'),
        label: { text: 'You', color: '#111827', fontWeight: '700', fontSize: '11px' }
      });

      if (partner) {
        new google.maps.Marker({
          position: partner,
          map,
          zIndex: 999,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 52 52">' +
              '<circle cx="26" cy="26" r="24" fill="#FF6A00" fill-opacity="0.18"/>' +
              '<circle cx="26" cy="26" r="16" fill="#FF6A00"/>' +
              '<circle cx="26" cy="26" r="12" fill="#fff"/>' +
              '<text x="26" y="31" font-size="14" text-anchor="middle">🛵</text>' +
              '</svg>'
            ),
            scaledSize: new google.maps.Size(52, 52),
            anchor: new google.maps.Point(26, 26)
          }
        });
      }

      directionsService.route({
        origin: rest,
        destination: cust,
        travelMode: google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          directionsRenderer.setDirections(result);
          const leg = result.routes[0].legs[0];
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ROUTE_INFO',
              distance: leg.distance.text,
              duration: leg.duration.text
            }));
          }
          const bounds = new google.maps.LatLngBounds();
          bounds.extend(rest);
          bounds.extend(cust);
          if (partner) bounds.extend(partner);
          map.fitBounds(bounds, { top: 100, bottom: 48, left: 48, right: 48 });
        } else {
          new google.maps.Polyline({
            path: [rest, cust],
            geodesic: true,
            strokeColor: '#FF6A00',
            strokeOpacity: 0.85,
            strokeWeight: 4,
            map
          });
        }
      });
    }
  </script>
  <script async defer src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap"></script>
</body>
</html>`;
}

const STEPS: { key: StepKey; label: string }[] = [
  { key: 'placed', label: 'Placed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'on_the_way', label: 'On the way' },
  { key: 'delivered', label: 'Delivered' },
];

/** Same cute delivery bike used in the tip animation */
const BIKE_IMAGE = 'https://cdn-icons-png.flaticon.com/512/2830/2830305.png';
const SCOOTER_W = 44;
const SCOOTER_H = 34;

export function OrderTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { orderId, newOrder } = useLocalSearchParams<{
    orderId: string;
    newOrder?: string;
  }>();
  const id = String(orderId ?? '');
  const clearCart = useCartStore((s) => s.clearCart);
  const queryClient = useQueryClient();

  const order = useOrder(id, {
    refetchInterval: (query) =>
      isActiveOrderStatus(query.state.data?.status) ? 8_000 : false,
  });
  // Prefer delivery-service full tracker (partner coords, timeline, shareToken)
  const tracking = useDeliveryTracking(id, {
    refetchInterval: (query) => {
      const st = query.state.data?.status ?? order.data?.status;
      return isActiveOrderStatus(st) ? 8_000 : false;
    },
  });
  const reorder = useReorder(id);
  const o = order.data;
  const t = tracking.data;

  // ── Socket live updates ────────────────────────────────────────────────────
  // order:status / order:cancelled push real-time status without polling delay
  const { status: socketStatus } = useOrderStatusSocket(
    id,
    () => { void order.refetch(); void tracking.refetch(); },
    () => { void order.refetch(); }
  );
  // delivery:status — trip machine (arrived_at_customer may not change order ticket)
  const { status: deliverySocketStatus } = useDeliveryStatusSocket(id, (status) => {
    void tracking.refetch();
    void queryClient.invalidateQueries({ queryKey: deliveryKeys.dropOtp(id) });
    if (status === 'delivered' || status === 'returned' || status === 'cancelled') {
      void order.refetch();
    }
  });
  // partner:location / tracking:location — live GPS overlay
  const socketLocation = usePartnerLocationSocket(id);
  // tracking:eta — live ETA chip
  const socketEta = useEtaSocket(id);
  // ──────────────────────────────────────────────────────────────────────────

  // Prefer rider trip status so "arrived at door" shows even while order is OFD
  const combinedStatusEarly =
    deliverySocketStatus ?? t?.status ?? socketStatus ?? o?.status;
  const trackingActive =
    !combinedStatusEarly || isActiveOrderStatus(combinedStatusEarly);

  const partnerQuery = useOrderDeliveryPartner(id, {
    enabled: Boolean(id) && trackingActive,
    refetchInterval: trackingActive ? 12_000 : false,
  });
  const partner = partnerQuery.data;

  // GET /tracking/order/:orderId/location — live GPS fallback (5s poll)
  const liveLocQuery = useLiveLocation(id, trackingActive);
  // GET /tracking/order/:orderId/eta — polled ETA fallback (30s poll)
  const etaQuery = useTrackingEta(id, trackingActive);

  const [distanceInfo, setDistanceInfo] = useState<{
    dist: string;
    time: string;
  } | null>(null);
  const [chatText, setChatText] = useState('');
  const [instructionText, setInstructionText] = useState('');
  const [contactless, setContactless] = useState(false);
  const [tipInput, setTipInput] = useState('');
  const [partnerRatingInput, setPartnerRatingInput] = useState('5');

  const mapHeight = useSharedValue(52);
  const pulse = useSharedValue(0);
  const progressAnim = useSharedValue(0);
  const scooterBob = useSharedValue(0);
  const railWidth = useSharedValue(0);

  useEffect(() => {
    if (newOrder !== 'true') return;
    const clearTimer = setTimeout(async () => {
      try {
        const { cartApi } = await import('@/lib/cart/api');
        await cartApi.clearCart();
      } catch {
        // local clear still runs
      } finally {
        clearCart();
      }
    }, 400);
    return () => clearTimeout(clearTimer);
  }, [newOrder, clearCart]);

  const combinedStatus =
    deliverySocketStatus ?? t?.status ?? socketStatus ?? o?.status;
  // Assume live until status is known (avoids a flash of "completed")
  const active = !combinedStatus || isActiveOrderStatus(combinedStatus);
  const completed = isOrderCompleted(combinedStatus);
  const cancelled = isTerminalCancelled(combinedStatus);
  // t?.partner from delivery-service full tracker; partner query from /tracking/order/:id/partner
  const trackerPartner = t?.partner;
  const partnerAssigned = Boolean(
    partner?.name || partner?.phone || trackerPartner?.name
  );
  const partnerName =
    partner?.name ||
    trackerPartner?.name ||
    (active ? 'Finding a partner' : undefined);
  const partnerPhone = partner?.phone || trackerPartner?.phone;
  const partnerRating =
    (partner ?? trackerPartner) && ((partner ?? trackerPartner)!.rating ?? 0) > 0
      ? ((partner ?? trackerPartner)!.rating).toFixed(1)
      : null;
  const partnerVehicle = (partner ?? trackerPartner)
    ? [(partner ?? trackerPartner)!.vehicleType, (partner ?? trackerPartner)!.vehicleNumber]
        .filter(Boolean)
        .join(' · ')
    : '';
  // Prefer socket live GPS → /location poll → partner query → full tracker
  const partnerLat =
    socketLocation?.lat ??
    liveLocQuery.data?.lat ??
    partner?.currentLocation?.lat ??
    trackerPartner?.currentLocation?.lat;
  const partnerLng =
    socketLocation?.lng ??
    liveLocQuery.data?.lng ??
    partner?.currentLocation?.lng ??
    trackerPartner?.currentLocation?.lng;

  const restLat = t?.restaurantLat ?? 26.2183;
  const restLng = t?.restaurantLng ?? 78.1828;
  const custLat = t?.customerLat ?? 26.2124;
  const custLng = t?.customerLng ?? 78.1772;

  const mapHtml = useMemo(() => {
    if (!GOOGLE_MAPS_API_KEY) return '';
    return generateMapHtml({
      restLat,
      restLng,
      custLat,
      custLng,
      partnerLat,
      partnerLng,
      restName: o?.restaurantName || 'Restaurant',
      apiKey: GOOGLE_MAPS_API_KEY,
    });
  }, [
    restLat,
    restLng,
    custLat,
    custLng,
    partnerLat,
    partnerLng,
    o?.restaurantName,
  ]);

  const step = currentStep(combinedStatus);
  const activeIdx = stepIndex(step);

  useEffect(() => {
    mapHeight.value = withTiming(active ? 46 : 30, { duration: 380 });
  }, [active, mapHeight]);

  useEffect(() => {
    progressAnim.value = withTiming(activeIdx / (STEPS.length - 1), {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [activeIdx, progressAnim]);

  useEffect(() => {
    if (!active || partnerAssigned) {
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [active, partnerAssigned, pulse]);

  useEffect(() => {
    if (!active || step === 'delivered') {
      scooterBob.value = withTiming(0, { duration: 220 });
      return;
    }
    // Cute bounce like a rolling delivery bike
    scooterBob.value = withRepeat(
      withSequence(
        withTiming(-3.5, {
          duration: 280,
          easing: Easing.inOut(Easing.sin),
        }),
        withTiming(0, {
          duration: 280,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );
  }, [active, step, scooterBob]);

  const mapStyle = useAnimatedStyle(() => ({
    height: `${mapHeight.value}%` as unknown as number,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.08]) }],
    opacity: interpolate(pulse.value, [0, 1], [1, 0.72]),
  }));

  const progressFillStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  const scooterStyle = useAnimatedStyle(() => {
    const travel = Math.max(0, railWidth.value - SCOOTER_W);
    const bounce = scooterBob.value;
    // Subtle lean while bouncing so it feels like riding
    const lean = interpolate(bounce, [-3.5, 0], [-4, 0]);
    return {
      transform: [
        { translateX: progressAnim.value * travel },
        { translateY: bounce },
        { rotate: `${lean}deg` },
        // Face right — same flip as tip scooter animation
        { scaleX: -1 },
      ],
    };
  });

  const onRailLayout = (e: LayoutChangeEvent) => {
    railWidth.value = e.nativeEvent.layout.width;
  };

  const callPartner = () => {
    if (!partnerPhone) return;
    const e164 = toE164IndianMobile(partnerPhone) || partnerPhone;
    void Linking.openURL(`tel:${e164}`);
  };

  const routeQuery = useTrackingRoute(id);
  const otpQuery = useDropOtp(id, trackingActive);
  const chatQuery = useChatHistory(id, {
    enabled: Boolean(id),
    refetchInterval: trackingActive ? 8_000 : false,
  });
  const sendChat = useSendChat(id);
  const createShare = useCreateShareLink(id);
  const revokeShare = useRevokeShareLink(id);
  const nudgePartner = useNudgePartner(id);
  const contactPartner = useContactPartner(id);
  const contactSupport = useContactSupport(id);
  const setDeliveryInstructions = useSetDeliveryInstructions(id);
  const setContactlessMutation = useSetContactless(id);
  const changeAddress = useChangeAddress(id);
  const addTip = useAddTip(id);
  const ratePartner = useRatePartner(id);

  const routeDistance =
    typeof routeQuery.data?.distanceMeters === 'number'
      ? `${(routeQuery.data.distanceMeters / 1000).toFixed(1)} km`
      : distanceInfo?.dist;
  const routeDuration =
    typeof routeQuery.data?.durationSeconds === 'number'
      ? `${Math.max(1, Math.round(routeQuery.data.durationSeconds / 60))} mins`
      : distanceInfo?.time;

  const handleSendChat = async () => {
    const text = chatText.trim();
    if (!text) return;
    try {
      await sendChat.mutateAsync(text);
      setChatText('');
      void chatQuery.refetch();
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Try again');
    }
  };

  const handleShareTracking = async () => {
    try {
      const link = await createShare.mutateAsync();
      if (!link.shareToken || !link.url) {
        Alert.alert('Share unavailable', 'Tracking link is not ready yet.');
        return;
      }
      // Validate public endpoint before sharing.
      await deliveryApi.getPublicShare(link.shareToken);
      const shareUrl =
        link.url?.trim() ||
        `tokajo://track/share/${link.shareToken}`;
      await Share.share({
        message: `Track my order live: ${shareUrl}`,
        url: shareUrl,
      });
    } catch (e) {
      Alert.alert('Share failed', e instanceof Error ? e.message : 'Please try again');
    }
  };

  const handleNudge = async () => {
    try {
      await nudgePartner.mutateAsync();
      Alert.alert('Sent', 'We nudged your delivery partner.');
    } catch (e) {
      Alert.alert('Could not nudge', e instanceof Error ? e.message : 'Please try again');
    }
  };

  const handleMaskedCall = async () => {
    try {
      const res = await contactPartner.mutateAsync();
      if (res.maskedPhone) {
        const e164 = toE164IndianMobile(res.maskedPhone) || res.maskedPhone;
        await Linking.openURL(`tel:${e164}`);
        return;
      }
      Alert.alert('Connected', 'Partner call request was sent.');
    } catch (e) {
      Alert.alert('Call failed', e instanceof Error ? e.message : 'Please try again');
    }
  };

  const handleSupport = async () => {
    try {
      await contactSupport.mutateAsync('Customer asked for order tracking help');
      Alert.alert('Support contacted', 'Our support team has been notified.');
    } catch (e) {
      Alert.alert('Could not contact support', e instanceof Error ? e.message : 'Please try again');
    }
  };

  const handleSaveInstructions = async () => {
    const text = instructionText.trim();
    if (!text) {
      Alert.alert('Add instructions', 'Please write delivery notes first.');
      return;
    }
    try {
      await setDeliveryInstructions.mutateAsync({ instructions: text });
      Alert.alert('Saved', 'Delivery instructions updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again');
    }
  };

  const handleContactlessToggle = async () => {
    try {
      const next = !contactless;
      await setContactlessMutation.mutateAsync({
        enabled: next,
        instructions: next ? instructionText.trim() || 'Leave at door' : undefined,
      });
      setContactless(next);
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Please try again');
    }
  };

  const handleAddressChange = async () => {
    if (!o?.deliveryAddress) {
      Alert.alert('Address unavailable', 'Current delivery address not found.');
      return;
    }
    try {
      await changeAddress.mutateAsync({
        lat: Number(o.deliveryAddress.lat ?? custLat),
        lng: Number(o.deliveryAddress.lng ?? custLng),
        formattedAddress: address,
        instructions: instructionText.trim() || undefined,
      });
      Alert.alert('Request sent', 'Address change was submitted.');
    } catch (e) {
      Alert.alert('Could not change address', e instanceof Error ? e.message : 'Address can be changed only before pickup.');
    }
  };

  const handleInFlightTip = async () => {
    const amount = Number(tipInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid tip', 'Enter a valid tip amount.');
      return;
    }
    try {
      await addTip.mutateAsync({ tip: amount });
      setTipInput('');
      Alert.alert('Tip added', `₹${amount.toFixed(0)} tip sent to your partner.`);
    } catch (e) {
      Alert.alert('Could not add tip', e instanceof Error ? e.message : 'Please try again');
    }
  };

  const handleRatePartner = async () => {
    const rating = Number(partnerRatingInput);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      Alert.alert('Invalid rating', 'Rating should be between 1 and 5.');
      return;
    }
    try {
      await ratePartner.mutateAsync({ rating, comment: 'Rated from order tracking' });
      Alert.alert('Thanks!', 'Partner rating submitted.');
    } catch (e) {
      Alert.alert('Could not submit rating', e instanceof Error ? e.message : 'Please try again');
    }
  };

  if ((order.isLoading || tracking.isLoading) && !o && !t) {
    return <LoadingView label="Loading tracking…" />;
  }

  if (tracking.isError && order.isError && !o && !t) {
    return (
      <View style={[styles.safe, { paddingTop: insets.top }]}>
        <ErrorView
          message={
            tracking.error instanceof Error
              ? tracking.error.message
              : 'Tracking unavailable'
          }
          onRetry={() => {
            void tracking.refetch();
            void order.refetch();
          }}
        />
      </View>
    );
  }

  const items = o?.items ?? [];
  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal =
    typeof o?.subtotal === 'number'
      ? o.subtotal
      : items.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = Number(o?.deliveryFee ?? 0);
  const packagingCharge = Number(o?.packagingCharge ?? 0);
  const platformFee = Number(o?.platformFee ?? 0);
  const tip = Number(o?.tip ?? 0);
  const discount = Number(o?.discount ?? 0);
  const rainFee = Number(o?.rainFee ?? 0);
  const couponCode =
    o?.couponCode ||
    (typeof o?.raw?.couponCode === 'string' ? o.raw.couponCode : undefined) ||
    (typeof o?.raw?.promoCode === 'string' ? o.raw.promoCode : undefined) ||
    (typeof (o?.raw?.coupon as { code?: string } | undefined)?.code === 'string'
      ? (o?.raw?.coupon as { code?: string }).code
      : undefined);

  const tax = Number(o?.tax ?? 0);

  const total = (() => {
    if (typeof o?.total === 'number' && o.total > 0) {
      return o.total;
    }
    return Math.max(
      0,
      Math.round(
        (subtotal +
          packagingCharge +
          platformFee +
          deliveryFee +
          tax +
          rainFee +
          tip -
          discount) *
          100,
      ) / 100,
    );
  })();

  const address =
    o?.deliveryAddress?.formattedAddress ||
    [
      o?.deliveryAddress?.street,
      o?.deliveryAddress?.area,
      o?.deliveryAddress?.city,
    ]
      .filter(Boolean)
      .join(', ') ||
    'Delivery address';

  // Prefer socket ETA → delivery-service /eta poll → full tracker
  const etaRaw =
    socketEta?.etaText ||
    (typeof socketEta?.etaMinutes === 'number' ? `${socketEta.etaMinutes} mins` : null) ||
    etaFromSeconds(socketEta?.etaSeconds) ||
    etaQuery.data?.etaText ||
    (typeof etaQuery.data?.etaMinutes === 'number' ? `${etaQuery.data.etaMinutes} mins` : null) ||
    etaFromSeconds(etaQuery.data?.etaSeconds) ||
    t?.etaText ||
    (typeof t?.etaMinutes === 'number'
      ? `${t.etaMinutes} mins`
      : etaFromSeconds(t?.etaSeconds)) ||
    (t?.etaAt ? new Date(t.etaAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : null) ||
    (etaQuery.data?.etaAt
      ? new Date(etaQuery.data.etaAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : distanceInfo?.time) ||
    etaFromIso(o?.estimatedDeliveryAt) ||
    etaFromIso((o?.raw?.estimatedArrival as string) || undefined) ||
    statusEtaFallback(combinedStatus, o) ||
    '—';
  const etaNumber = String(etaRaw).replace(/\s*mins?/i, '').trim();
  const showMins =
    /min/i.test(String(etaRaw)) ||
    typeof t?.etaMinutes === 'number' ||
    typeof t?.etaSeconds === 'number' ||
    typeof socketEta?.etaMinutes === 'number' ||
    typeof socketEta?.etaSeconds === 'number' ||
    typeof etaQuery.data?.etaMinutes === 'number' ||
    typeof etaQuery.data?.etaSeconds === 'number';

  const goBack = () => {
    if (newOrder === 'true') {
      router.replace('/orders');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/orders');
  };

  const handleReorder = () => {
    Alert.alert('Order again?', 'Add the same items to your cart.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Order again',
        onPress: async () => {
          try {
            const next = await reorder.mutateAsync();
            if (next.mode === 'order' && next.order?.id) {
              router.replace({
                pathname: '/orders/[orderId]/tracking',
                params: { orderId: next.order.id, newOrder: 'true' },
              });
              return;
            }
            Alert.alert(
              'Added to cart',
              next.message || 'Review your cart to place the order.',
              [
                {
                  text: 'Go to cart',
                  onPress: () =>
                    router.push('/cart' as import('expo-router').Href),
                },
              ]
            );
          } catch (e) {
            Alert.alert(
              'Reorder failed',
              e instanceof Error ? e.message : 'Could not reorder'
            );
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.mapWrap, mapStyle]}>
        {GOOGLE_MAPS_API_KEY && mapHtml ? (
          <WebView
            style={styles.map}
            source={{ html: mapHtml }}
            originWhitelist={['*']}
            onMessage={(event) => {
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.type === 'ROUTE_INFO') {
                  setDistanceInfo({ dist: data.distance, time: data.duration });
                }
              } catch {
                // ignore
              }
            }}
            scrollEnabled={false}
            bounces={false}
            javaScriptEnabled
            domStorageEnabled
          />
        ) : (
          <LinearGradient
            colors={['#FFE8D6', '#F3F4F6']}
            style={styles.mapFallback}
          >
            <MapPin color={ORANGE} size={28} />
            <Text style={styles.mapFallbackText}>Live map unavailable</Text>
          </LinearGradient>
        )}

        <LinearGradient
          colors={['rgba(17,24,39,0.28)', 'transparent']}
          style={styles.mapScrim}
          pointerEvents="none"
        />

        <View style={[styles.headerOverlay, { paddingTop: insets.top + 6 }]}>
          <Pressable style={styles.circleBtn} onPress={goBack}>
            <ArrowLeft color={INK} size={20} strokeWidth={2.4} />
          </Pressable>

          {active ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live tracking</Text>
            </View>
          ) : completed ? (
            <View style={styles.donePill}>
              <Check color={GREEN} size={12} strokeWidth={3} />
              <Text style={styles.donePillText}>Completed</Text>
            </View>
          ) : cancelled ? (
            <View style={styles.cancelPill}>
              <Text style={styles.cancelPillText}>Cancelled</Text>
            </View>
          ) : (
            <View style={styles.headerGhost} />
          )}

          <Pressable
            style={styles.circleBtn}
            onPress={() =>
              router.push({
                pathname: '/orders/[orderId]/issues',
                params: { orderId: id },
              })
            }
          >
            <Headset color={INK} size={18} strokeWidth={2.3} />
          </Pressable>
        </View>

        {active && routeDistance ? (
          <View style={styles.mapMeta}>
            <Text style={styles.mapMetaText}>
              {routeDistance} away
              {routeDuration ? ` · ${routeDuration}` : ''}
            </Text>
          </View>
        ) : null}
      </Animated.View>

      <View style={styles.sheet}>
        <View style={styles.handle} />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 28,
            paddingHorizontal: 18,
          }}
        >
          <Animated.View entering={FadeInDown.duration(420).springify()}>
            <Text style={styles.kicker}>
              {o?.restaurantName || 'Your order'}
              {o?.orderNumber
                ? `  ·  #${String(o.orderNumber).replace(/^#/, '')}`
                : ''}
            </Text>
            <Text style={styles.statusTitle}>
              {statusLabel(combinedStatus)}
            </Text>
            <Text style={styles.statusHint}>
              {statusHint(combinedStatus, active)}
            </Text>

            {active ? (
              <View style={styles.etaRow}>
                <View style={styles.etaBlock}>
                  <Text style={styles.etaLabel}>ARRIVING IN</Text>
                  <View style={styles.etaValueRow}>
                    <Text style={styles.etaValue}>{etaNumber}</Text>
                    {showMins && etaNumber !== '—' ? (
                      <Text style={styles.etaUnit}>min</Text>
                    ) : null}
                  </View>
                </View>
                <View style={styles.etaDivider} />
                <View style={styles.etaSide}>
                  <Clock3 color={ORANGE} size={16} strokeWidth={2.3} />
                  <Text style={styles.etaSideText}>
                    {itemCount
                      ? `${itemCount} item${itemCount === 1 ? '' : 's'}`
                      : 'Order'}
                  </Text>
                  <Text style={styles.etaSideSub}>On Tokajo Foods</Text>
                </View>
              </View>
            ) : null}
          </Animated.View>

          {/* Timeline */}
          <Animated.View
            entering={FadeInDown.delay(80).duration(420).springify()}
            style={styles.timeline}
          >
            <View style={styles.timelineRail} onLayout={onRailLayout}>
              <View style={styles.timelineTrack}>
                <Animated.View
                  style={[styles.timelineFill, progressFillStyle]}
                />
              </View>
              <Animated.View
                style={[styles.scooterWrap, scooterStyle]}
                pointerEvents="none"
              >
                <Image
                  source={{ uri: BIKE_IMAGE }}
                  style={styles.scooterImage}
                  contentFit="contain"
                />
                <View style={styles.scooterShadow} />
              </Animated.View>
            </View>
            <View style={styles.timelineSteps}>
              {STEPS.map((s, i) => {
                const done = i <= activeIdx;
                const current = i === activeIdx && active;
                const label =
                  s.key === 'delivered' && completed ? 'Completed' : s.label;
                return (
                  <View key={s.key} style={styles.timelineStep}>
                    <View
                      style={[
                        styles.timelineDot,
                        done && styles.timelineDotDone,
                        current && styles.timelineDotCurrent,
                        completed && i === STEPS.length - 1 && styles.timelineDotDone,
                      ]}
                    >
                      {(done && !current) || (completed && i === STEPS.length - 1) ? (
                        <Check color={WHITE} size={11} strokeWidth={3} />
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.timelineLabel,
                        done && styles.timelineLabelDone,
                      ]}
                    >
                      {label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>

          {/* Partner */}
          {active ? (
            <Animated.View
              entering={FadeInDown.delay(140).duration(420).springify()}
              style={styles.partnerCard}
            >
              <LinearGradient
                colors={['#FFF8F2', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.partnerGrad}
              >
                <View style={styles.partnerTop}>
                  <Animated.View
                    style={[styles.partnerAvatar, !partnerAssigned && pulseStyle]}
                  >
                    {partner?.imageUrl ? (
                      <Image
                        source={{ uri: partner.imageUrl }}
                        style={styles.partnerAvatarImage}
                        contentFit="cover"
                      />
                    ) : (
                      <Bike color={ORANGE} size={22} strokeWidth={2.3} />
                    )}
                  </Animated.View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partnerEyebrow}>DELIVERY PARTNER</Text>
                    <Text style={styles.partnerName} numberOfLines={1}>
                      {partnerName}
                    </Text>
                    {partnerAssigned && (partnerRating || partnerVehicle) ? (
                      <View style={styles.partnerMetaRow}>
                        {partnerRating ? (
                          <View style={styles.partnerRatingPill}>
                            <Star
                              color="#F59E0B"
                              fill="#F59E0B"
                              size={11}
                            />
                            <Text style={styles.partnerRatingText}>
                              {partnerRating}
                            </Text>
                          </View>
                        ) : null}
                        {partnerVehicle ? (
                          <Text style={styles.partnerVehicle} numberOfLines={1}>
                            {partnerVehicle}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                    <Text style={styles.partnerPhone} numberOfLines={1}>
                      {partnerPhone
                        ? partnerPhone
                        : 'Number appears once assigned'}
                    </Text>
                  </View>
                </View>

                {partnerAssigned ? (
                  <>
                    <View style={styles.partnerActions}>
                      <Pressable
                        style={[
                          styles.callBtn,
                          !partnerPhone && styles.btnDisabled,
                        ]}
                        disabled={!partnerPhone}
                        onPress={callPartner}
                      >
                        <Phone color={WHITE} size={16} strokeWidth={2.5} />
                        <Text style={styles.callBtnText}>Call partner</Text>
                      </Pressable>
                      <Pressable
                        style={styles.helpBtn}
                        onPress={() =>
                          router.push({
                            pathname: '/orders/[orderId]/issues',
                            params: { orderId: id },
                          })
                        }
                      >
                        <Headset color={INK} size={16} strokeWidth={2.4} />
                        <Text style={styles.helpBtnText}>Help</Text>
                      </Pressable>
                    </View>
                    <View style={styles.partnerActions}>
                      <Pressable style={styles.softBtn} onPress={handleNudge}>
                        <Text style={styles.softBtnText}>
                          {nudgePartner.isPending ? 'Sending…' : 'Where are you?'}
                        </Text>
                      </Pressable>
                      <Pressable style={styles.softBtn} onPress={handleShareTracking}>
                        <Text style={styles.softBtnText}>
                          {createShare.isPending ? 'Creating…' : 'Share track'}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.softBtn, styles.softBtnDanger]}
                        onPress={async () => {
                          try {
                            await revokeShare.mutateAsync();
                            Alert.alert('Revoked', 'Public tracking link has been disabled.');
                          } catch (e) {
                            Alert.alert(
                              'Could not revoke',
                              e instanceof Error ? e.message : 'Please try again'
                            );
                          }
                        }}
                      >
                        <Text style={styles.softBtnDangerText}>
                          {revokeShare.isPending ? 'Revoking…' : 'Revoke'}
                        </Text>
                      </Pressable>
                    </View>
                  </>
                ) : null}
              </LinearGradient>
            </Animated.View>
          ) : (
            <View style={[styles.doneBanner, cancelled && styles.doneBannerCancel]}>
              <CheckCircle2
                color={cancelled ? '#DC2626' : GREEN}
                size={22}
                strokeWidth={2.3}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.doneText}>
                  {cancelled
                    ? 'This order was cancelled'
                    : 'Order completed'}
                </Text>
                <Text style={styles.doneSub}>
                  {cancelled
                    ? 'You can place this order again anytime'
                    : 'Hope you enjoyed your meal'}
                </Text>
              </View>
            </View>
          )}

          {!active ? (
            <View style={styles.completedActions}>
              {canRateOrder(combinedStatus) ? (
                <Pressable
                  style={styles.rateOutlineBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/orders/[orderId]/review',
                      params: { orderId: id },
                    })
                  }
                >
                  <Text style={styles.rateOutlineText}>Rate order</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[
                  styles.reorderSolidBtn,
                  !canRateOrder(combinedStatus) && { flex: 1 },
                ]}
                onPress={handleReorder}
                disabled={reorder.isPending}
              >
                {reorder.isPending ? (
                  <ActivityIndicator color={WHITE} />
                ) : (
                  <Text style={styles.reorderSolidText}>Order again</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          {active && otpQuery.data?.otp ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {normalizeOrderStatus(combinedStatus) === 'arrived_at_customer'
                  ? 'Confirm delivery'
                  : 'Delivery OTP'}
              </Text>
              <View
                style={[
                  styles.otpCard,
                  normalizeOrderStatus(combinedStatus) === 'arrived_at_customer' &&
                    styles.otpCardUrgent,
                ]}
              >
                <Text style={styles.otpLabel}>
                  {normalizeOrderStatus(combinedStatus) === 'arrived_at_customer'
                    ? 'Share this OTP with your delivery partner to complete the order'
                    : 'Share this with your partner when they arrive'}
                </Text>
                <Text style={styles.otpValue}>{otpQuery.data.otp}</Text>
                {otpQuery.data.expiresAt ? (
                  <Text style={styles.otpExpiry}>
                    Expires {new Date(otpQuery.data.expiresAt).toLocaleTimeString()}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {partnerAssigned ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chat with partner</Text>
              <View style={styles.chatCard}>
                {chatQuery.data?.length ? (
                  chatQuery.data.slice(-4).map((m) => (
                    <View
                      key={m.id}
                      style={[
                        styles.chatBubble,
                        m.from === 'customer' ? styles.chatBubbleMine : styles.chatBubbleTheirs,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chatText,
                          m.from === 'customer' && { color: WHITE },
                        ]}
                      >
                        {m.text}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.chatEmpty}>No messages yet</Text>
                )}
                <View style={styles.chatInputRow}>
                  <TextInput
                    value={chatText}
                    onChangeText={setChatText}
                    placeholder="Type a message..."
                    placeholderTextColor="#9CA3AF"
                    style={styles.chatInput}
                  />
                  <Pressable
                    style={styles.chatSendBtn}
                    onPress={handleSendChat}
                    disabled={sendChat.isPending}
                  >
                    <Text style={styles.chatSendText}>
                      {sendChat.isPending ? '...' : 'Send'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ) : null}

          {partnerAssigned ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Delivery controls</Text>
              <View style={styles.chatCard}>
                <View style={styles.partnerActions}>
                  <Pressable style={styles.softBtn} onPress={handleMaskedCall}>
                    <Text style={styles.softBtnText}>
                      {contactPartner.isPending ? 'Connecting…' : 'Masked call'}
                    </Text>
                  </Pressable>
                  <Pressable style={styles.softBtn} onPress={handleSupport}>
                    <Text style={styles.softBtnText}>
                      {contactSupport.isPending ? 'Sending…' : 'Contact support'}
                    </Text>
                  </Pressable>
                </View>

              <TextInput
                value={instructionText}
                onChangeText={setInstructionText}
                placeholder="Add drop instructions (gate no, floor, landmark)"
                placeholderTextColor="#9CA3AF"
                style={styles.chatInput}
              />
              <View style={styles.partnerActions}>
                <Pressable style={styles.softBtn} onPress={handleSaveInstructions}>
                  <Text style={styles.softBtnText}>
                    {setDeliveryInstructions.isPending ? 'Saving…' : 'Save notes'}
                  </Text>
                </Pressable>
                <Pressable style={styles.softBtn} onPress={handleContactlessToggle}>
                  <Text style={styles.softBtnText}>
                    {setContactlessMutation.isPending
                      ? 'Updating…'
                      : contactless
                        ? 'Contactless ON'
                        : 'Enable contactless'}
                  </Text>
                </Pressable>
                <Pressable style={styles.softBtn} onPress={handleAddressChange}>
                  <Text style={styles.softBtnText}>
                    {changeAddress.isPending ? 'Updating…' : 'Change pin'}
                  </Text>
                </Pressable>
              </View>

              {active ? (
                <View style={styles.chatInputRow}>
                  <TextInput
                    value={tipInput}
                    onChangeText={setTipInput}
                    placeholder="Tip amount"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={styles.chatInput}
                  />
                  <Pressable style={styles.chatSendBtn} onPress={handleInFlightTip}>
                    <Text style={styles.chatSendText}>
                      {addTip.isPending ? '...' : 'Add tip'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {!active && completed ? (
                <View style={styles.chatInputRow}>
                  <TextInput
                    value={partnerRatingInput}
                    onChangeText={setPartnerRatingInput}
                    placeholder="Rate rider (1-5)"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={styles.chatInput}
                  />
                  <Pressable style={styles.chatSendBtn} onPress={handleRatePartner}>
                    <Text style={styles.chatSendText}>
                      {ratePartner.isPending ? '...' : 'Rate'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              </View>
            </View>
          ) : null}

          {/* Summary */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(420).springify()}
            style={styles.section}
          >
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Order summary</Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/orders/[orderId]',
                    params: { orderId: id },
                  })
                }
                style={styles.detailsLink}
              >
                <Text style={styles.detailsLinkText}>Full details</Text>
                <ChevronRight color={ORANGE} size={14} strokeWidth={2.5} />
              </Pressable>
            </View>

            <View style={styles.restChip}>
              <View style={styles.restIcon}>
                <Store color={ORANGE} size={15} strokeWidth={2.4} />
              </View>
              <Text style={styles.restName} numberOfLines={1}>
                {o?.restaurantName || 'Restaurant'}
              </Text>
            </View>

            {items.map((item, index) => (
              <View key={`${item.id ?? item.name}-${index}`}>
                {index > 0 ? <View style={styles.hairline} /> : null}
                <View style={styles.itemRow}>
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyText}>{item.quantity}×</Text>
                  </View>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.itemPrice}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.billBlock}>
              <Text style={styles.billHeading}>Bill details</Text>
              <BillLine
                label={`Item total (${itemCount})`}
                value={subtotal}
              />
              {packagingCharge > 0 ? (
                <BillLine label="Packaging" value={packagingCharge} />
              ) : null}
              {platformFee > 0 ? (
                <BillLine label="Platform fee" value={platformFee} />
              ) : null}
              <BillLine
                label="Delivery fee"
                value={deliveryFee}
                free={deliveryFee <= 0}
              />
              {rainFee > 0 ? <BillLine label="Rain fee" value={rainFee} /> : null}
              {discount > 0 ? (
                <BillLine
                  label={
                    couponCode
                      ? `Promo · ${String(couponCode).toUpperCase()}`
                      : 'Promo discount'
                  }
                  value={-discount}
                  green
                />
              ) : null}
              {tax > 0 ? (
                <BillLine label="Taxes & charges" value={tax} />
              ) : null}
              {tip > 0 ? <BillLine label="Partner tip" value={tip} /> : null}
              <View style={styles.totalRule} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {active &&
                  o?.paymentMethod &&
                  String(o.paymentMethod).toLowerCase() === 'cod'
                    ? 'To pay'
                    : 'Grand total'}
                </Text>
                <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
              </View>
              {o?.paymentMethod ? (
                <Text style={styles.billPayNote}>
                  {paymentMethodLabel(o.paymentMethod)}
                </Text>
              ) : null}
            </View>
          </Animated.View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivering to</Text>
            <View style={styles.addressRow}>
              <View style={styles.addressIcon}>
                <MapPin color={ORANGE} size={16} strokeWidth={2.4} />
              </View>
              <Text style={styles.addressText}>{address}</Text>
            </View>
            {o?.paymentMethod ? (
              <Text style={styles.payMeta}>
                {paymentMethodLabel(o.paymentMethod)}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function BillLine({
  label,
  value,
  free,
  green,
}: {
  label: string;
  value: number;
  free?: boolean;
  green?: boolean;
}) {
  return (
    <View style={styles.billLine}>
      <Text style={[styles.billLabel, green && { color: GREEN }]}>{label}</Text>
      {free ? (
        <Text style={[styles.billValue, { color: GREEN }]}>FREE</Text>
      ) : (
        <Text style={[styles.billValue, green && { color: GREEN }]}>
          {green
            ? `−₹${Math.abs(value).toFixed(2)}`
            : `₹${Number(value).toFixed(2)}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: SHEET },
  safe: { flex: 1, backgroundColor: WHITE, justifyContent: 'center' },
  mapWrap: {
    width: '100%',
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  map: { flex: 1, backgroundColor: 'transparent' },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapFallbackText: {
    fontFamily: fonts.uiMedium,
    color: MUTED,
    fontSize: 13,
  },
  mapScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  headerGhost: { width: 96 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: WHITE,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  liveText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: INK,
    letterSpacing: 0.1,
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  donePillText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: GREEN,
  },
  cancelPill: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  cancelPillText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: '#DC2626',
  },
  mapMeta: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    backgroundColor: 'rgba(17,24,39,0.82)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  mapMetaText: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: WHITE,
  },
  sheet: {
    flex: 1,
    marginTop: -22,
    backgroundColor: WHITE,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginTop: 10,
    marginBottom: 14,
  },
  kicker: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: MUTED,
    marginBottom: 6,
  },
  statusTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: INK,
    letterSpacing: -0.5,
  },
  statusHint: {
    marginTop: 4,
    fontFamily: fonts.ui,
    fontSize: 14,
    color: MUTED,
  },
  etaRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ORANGE_SOFT,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  etaBlock: { flex: 1 },
  etaLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: ORANGE,
    marginBottom: 2,
  },
  etaValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  etaValue: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    color: INK,
    letterSpacing: -1,
  },
  etaUnit: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: INK_SOFT,
    marginBottom: 4,
  },
  etaDivider: {
    width: 1,
    height: 42,
    backgroundColor: '#F3D5BE',
    marginHorizontal: 14,
  },
  etaSide: {
    width: 108,
    gap: 4,
  },
  etaSideText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: INK,
  },
  etaSideSub: {
    fontFamily: fonts.ui,
    fontSize: 11,
    color: MUTED,
  },
  timeline: {
    marginTop: 22,
    marginBottom: 8,
  },
  timelineRail: {
    marginHorizontal: 10,
    height: 48,
    justifyContent: 'flex-end',
    paddingBottom: 10,
  },
  timelineTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: LINE,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  timelineFill: {
    height: '100%',
    backgroundColor: ORANGE,
    borderRadius: 999,
  },
  scooterWrap: {
    position: 'absolute',
    left: 0,
    bottom: 6,
    width: SCOOTER_W,
    height: SCOOTER_H + 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 4,
  },
  scooterImage: {
    width: SCOOTER_W,
    height: SCOOTER_H,
    zIndex: 2,
  },
  scooterShadow: {
    position: 'absolute',
    bottom: 0,
    width: 28,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.14)',
    zIndex: 1,
  },
  timelineSteps: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineStep: {
    width: '25%',
    alignItems: 'center',
    gap: 6,
  },
  timelineDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: ORANGE,
  },
  timelineDotCurrent: {
    borderWidth: 3,
    borderColor: '#FFD8B8',
    backgroundColor: ORANGE,
  },
  timelineLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 10,
    color: MUTED,
    textAlign: 'center',
  },
  timelineLabelDone: {
    color: INK,
    fontFamily: fonts.uiBold,
  },
  partnerCard: {
    marginTop: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFE4CC',
  },
  partnerGrad: {
    padding: 16,
  },
  partnerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  partnerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE4CC',
    overflow: 'hidden',
  },
  partnerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  partnerEyebrow: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: ORANGE,
    marginBottom: 2,
  },
  partnerName: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: INK,
  },
  partnerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  partnerRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  partnerRatingText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: '#92400E',
  },
  partnerVehicle: {
    flex: 1,
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: MUTED,
    textTransform: 'capitalize',
  },
  partnerPhone: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
  },
  partnerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  callBtn: {
    flex: 1.35,
    height: 46,
    borderRadius: 14,
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  callBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: WHITE,
  },
  helpBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: LINE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  helpBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: INK,
  },
  softBtn: {
    flex: 1,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  softBtnText: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#9A3412',
  },
  softBtnDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  softBtnDangerText: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#B91C1C',
  },
  btnDisabled: { opacity: 0.45 },
  doneBanner: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 14,
  },
  doneBannerCancel: {
    backgroundColor: '#FEF2F2',
  },
  doneText: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: INK,
  },
  doneSub: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
  },
  completedActions: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  rateOutlineBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
  },
  rateOutlineText: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: ORANGE,
  },
  reorderSolidBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderSolidText: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: WHITE,
  },
  section: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LINE,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: INK,
    letterSpacing: -0.2,
  },
  detailsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailsLinkText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: ORANGE,
  },
  restChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  restIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restName: {
    flex: 1,
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: INK,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: LINE,
    marginVertical: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  qtyBadge: {
    minWidth: 28,
    height: 24,
    borderRadius: 7,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  qtyText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: ORANGE,
  },
  itemName: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 13.5,
    color: INK,
  },
  itemPrice: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: INK_SOFT,
  },
  billBlock: { marginTop: 14, gap: 8 },
  billHeading: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    letterSpacing: 1,
    color: MUTED,
    marginBottom: 4,
  },
  billLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  billLabel: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: MUTED,
  },
  billValue: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: INK,
  },
  totalRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: LINE,
    marginVertical: 6,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: INK,
  },
  totalValue: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: ORANGE,
    letterSpacing: -0.3,
  },
  billPayNote: {
    marginTop: 6,
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: MUTED,
    textAlign: 'right',
  },
  addressRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  addressIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  addressText: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 13.5,
    color: INK_SOFT,
    lineHeight: 19,
  },
  payMeta: {
    marginTop: 10,
    marginLeft: 40,
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: MUTED,
  },
  otpCard: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
    padding: 12,
  },
  otpCardUrgent: {
    borderColor: ORANGE,
    backgroundColor: ORANGE_SOFT,
    borderWidth: 2,
  },
  otpLabel: {
    fontFamily: fonts.uiMedium,
    fontSize: 12,
    color: '#92400E',
  },
  otpValue: {
    marginTop: 4,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    letterSpacing: 4,
    color: '#78350F',
  },
  otpExpiry: {
    marginTop: 4,
    fontFamily: fonts.ui,
    fontSize: 11,
    color: '#A16207',
  },
  chatCard: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: WHITE,
    padding: 10,
    gap: 8,
  },
  chatBubble: {
    maxWidth: '90%',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chatBubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: ORANGE,
  },
  chatBubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
  },
  chatText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: INK,
  },
  chatEmpty: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
  },
  chatInputRow: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: INK,
  },
  chatSendBtn: {
    height: 40,
    minWidth: 56,
    borderRadius: 10,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chatSendText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: WHITE,
  },
});
