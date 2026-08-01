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
  Store,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
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
import { GOOGLE_MAPS_API_KEY } from '@/lib/google-maps';
import { useOrder, useOrderTracking, useReorder } from '@/lib/order/hooks';
import { toE164IndianMobile } from '@/lib/order/phone';
import { paymentMethodLabel } from '@/lib/order/payment-labels';
import {
  canRateOrder,
  isActiveOrderStatus,
  normalizeOrderStatus,
} from '@/lib/order/types';
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
  if (s.includes('out') || s.includes('way') || s.includes('pick')) {
    return 'on_the_way';
  }
  if (s.includes('prepar') || s.includes('ready')) return 'preparing';
  return 'placed';
}

function stepIndex(key: StepKey) {
  return ['placed', 'preparing', 'on_the_way', 'delivered'].indexOf(key);
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

  const order = useOrder(id, {
    refetchInterval: (query) =>
      isActiveOrderStatus(query.state.data?.status) ? 8_000 : false,
  });
  const tracking = useOrderTracking(id, {
    refetchInterval: (query) => {
      const st = query.state.data?.status ?? order.data?.status;
      return isActiveOrderStatus(st) ? 8_000 : false;
    },
  });
  const reorder = useReorder(id);
  const o = order.data;
  const t = tracking.data;

  const [distanceInfo, setDistanceInfo] = useState<{
    dist: string;
    time: string;
  } | null>(null);

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

  const combinedStatus = o?.status ?? t?.status;
  // Assume live until status is known (avoids a flash of "completed")
  const active = !combinedStatus || isActiveOrderStatus(combinedStatus);
  const completed = isOrderCompleted(combinedStatus);
  const cancelled = isTerminalCancelled(combinedStatus);
  const partnerAssigned = Boolean(
    t?.deliveryPartnerName ||
      (o?.raw?.deliveryPartnerName as string | undefined)
  );
  const partnerName =
    t?.deliveryPartnerName ||
    (o?.raw?.deliveryPartnerName as string | undefined) ||
    (active ? 'Finding a partner' : undefined);
  const partnerPhone =
    t?.deliveryPartnerPhone ||
    (o?.raw?.deliveryPartnerPhone as string | undefined);

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
      partnerLat: t?.deliveryPartnerLat,
      partnerLng: t?.deliveryPartnerLng,
      restName: o?.restaurantName || 'Restaurant',
      apiKey: GOOGLE_MAPS_API_KEY,
    });
  }, [
    restLat,
    restLng,
    custLat,
    custLng,
    t?.deliveryPartnerLat,
    t?.deliveryPartnerLng,
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
  const tip = Number(o?.tip ?? 0);
  const discount = Number(o?.discount ?? 0);
  const couponCode =
    o?.couponCode ||
    (typeof o?.raw?.couponCode === 'string' ? o.raw.couponCode : undefined) ||
    (typeof o?.raw?.promoCode === 'string' ? o.raw.promoCode : undefined) ||
    (typeof (o?.raw?.coupon as { code?: string } | undefined)?.code === 'string'
      ? (o?.raw?.coupon as { code?: string }).code
      : undefined);

  // Tax: API value → implied from grand total → 5% of item total
  const TAX_RATE = 0.05;
  const tax = (() => {
    const fromApi = Number(o?.tax ?? 0);
    if (fromApi > 0.009) return Math.round(fromApi * 100) / 100;

    if (typeof o?.total === 'number' && o.total > 0) {
      const withoutTax = subtotal + deliveryFee + tip - discount;
      const implied = Math.round((o.total - withoutTax) * 100) / 100;
      if (implied > 0.009) return implied;
    }

    if (subtotal > 0) {
      return Math.round(subtotal * TAX_RATE * 100) / 100;
    }
    return 0;
  })();

  const total = (() => {
    if (typeof o?.total === 'number' && o.total > 0) {
      const withoutTax = subtotal + deliveryFee + tip - discount;
      // API total omitted tax — include the 5% we display
      if (tax > 0 && Math.abs(o.total - withoutTax) < 0.02) {
        return Math.round((withoutTax + tax) * 100) / 100;
      }
      return o.total;
    }
    return Math.max(
      0,
      Math.round((subtotal + deliveryFee + tax + tip - discount) * 100) / 100
    );
  })();
  const taxIsFivePercent =
    tax > 0 &&
    Math.abs(tax - Math.round(subtotal * TAX_RATE * 100) / 100) < 0.05;

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

  const etaRaw =
    t?.etaText ||
    (typeof t?.etaMinutes === 'number'
      ? `${t.etaMinutes} mins`
      : distanceInfo?.time) ||
    '—';
  const etaNumber = String(etaRaw).replace(/\s*mins?/i, '').trim();
  const showMins = /min/i.test(String(etaRaw)) || typeof t?.etaMinutes === 'number';

  const goBack = () => {
    if (newOrder === 'true') {
      router.replace('/orders');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/orders');
  };

  const handleReorder = () => {
    Alert.alert('Order again?', 'Place a new order with the same items.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Order again',
        onPress: async () => {
          try {
            const next = await reorder.mutateAsync();
            router.replace({
              pathname: '/orders/[orderId]/tracking',
              params: { orderId: next.id, newOrder: 'true' },
            });
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

        {active && distanceInfo?.dist ? (
          <View style={styles.mapMeta}>
            <Text style={styles.mapMetaText}>{distanceInfo.dist} away</Text>
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
                    <Bike color={ORANGE} size={22} strokeWidth={2.3} />
                  </Animated.View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.partnerEyebrow}>DELIVERY PARTNER</Text>
                    <Text style={styles.partnerName} numberOfLines={1}>
                      {partnerName}
                    </Text>
                    <Text style={styles.partnerPhone} numberOfLines={1}>
                      {partnerPhone
                        ? partnerPhone
                        : 'Number appears once assigned'}
                    </Text>
                  </View>
                </View>

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
              <BillLine
                label="Delivery fee"
                value={deliveryFee}
                free={deliveryFee <= 0}
              />
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
              <BillLine
                label={
                  taxIsFivePercent
                    ? 'Taxes & charges (5%)'
                    : 'Taxes & charges'
                }
                value={tax}
              />
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
});
