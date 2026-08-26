import { Pressable } from '@/components/common/Pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Bike, Clock3, MapPin } from 'lucide-react-native';
import { useMemo } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { fonts } from '@/constants/typography';
import { usePublicShareTracking } from '@/lib/delivery/hooks';
import { GOOGLE_MAPS_API_KEY } from '@/lib/google-maps';

const ORANGE = '#FF6A00';
const INK = '#111827';
const MUTED = '#6B7280';
const GREEN = '#059669';

function shareMapHtml(opts: {
  dropLat: number;
  dropLng: number;
  riderLat?: number;
  riderLng?: number;
  apiKey: string;
}) {
  const { dropLat, dropLng, riderLat, riderLng, apiKey } = opts;
  const hasRider =
    typeof riderLat === 'number' &&
    typeof riderLng === 'number' &&
    Number.isFinite(riderLat) &&
    Number.isFinite(riderLng);

  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<style>html,body,#map{height:100%;width:100%;margin:0;padding:0;background:#e8eaed}</style>
</head><body><div id="map"></div>
<script>
function initMap(){
  const drop={lat:${dropLat},lng:${dropLng}};
  const rider=${hasRider ? `{lat:${riderLat},lng:${riderLng}}` : 'null'};
  const map=new google.maps.Map(document.getElementById('map'),{
    zoom:14,center:drop,disableDefaultUI:true,gestureHandling:'none'
  });
  new google.maps.Marker({position:drop,map,title:'Delivery'});
  if(rider) new google.maps.Marker({position:rider,map,title:'Partner'});
  const bounds=new google.maps.LatLngBounds();
  bounds.extend(drop);
  if(rider) bounds.extend(rider);
  map.fitBounds(bounds,{top:40,bottom:40,left:40,right:40});
}
</script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap"></script>
</body></html>`;
}

function formatEta(seconds?: number, etaAt?: string): string {
  if (typeof seconds === 'number' && seconds > 0) {
    const mins = Math.max(1, Math.round(seconds / 60));
    return `${mins} min`;
  }
  if (etaAt) {
    const d = new Date(etaAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
  }
  return '—';
}

function isDelivered(status: string): boolean {
  const s = status.toLowerCase();
  return s.includes('delivered') || s.includes('completed');
}

export function PublicShareTrackingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ shareToken?: string | string[] }>();
  const shareToken = Array.isArray(params.shareToken)
    ? params.shareToken[0] ?? ''
    : (params.shareToken ?? '');

  const tracking = usePublicShareTracking(shareToken, {
    enabled: Boolean(shareToken),
    refetchInterval: (q) => {
      const st = q.state.data?.status ?? '';
      return isDelivered(st) ? false : 6_000;
    },
  });

  const data = tracking.data;
  const mapHtml = useMemo(() => {
    if (!GOOGLE_MAPS_API_KEY || !data?.dropLat || !data?.dropLng) return '';
    return shareMapHtml({
      dropLat: data.dropLat,
      dropLng: data.dropLng,
      riderLat: data.riderLat,
      riderLng: data.riderLng,
      apiKey: GOOGLE_MAPS_API_KEY,
    });
  }, [data?.dropLat, data?.dropLng, data?.riderLat, data?.riderLng]);

  if (!shareToken) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ErrorView message="Invalid share link." />
      </View>
    );
  }

  if (tracking.isLoading && !data) {
    return <LoadingView label="Loading live track…" />;
  }

  if (tracking.isError && !data) {
    const msg =
      tracking.error instanceof Error
        ? tracking.error.message
        : 'Share link expired or not found';
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/')}>
          <ArrowLeft color={INK} size={20} />
        </Pressable>
        <ErrorView message={msg} onRetry={() => void tracking.refetch()} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <ErrorView message="Tracking unavailable." onRetry={() => void tracking.refetch()} />
      </View>
    );
  }

  const delivered = isDelivered(data.status);
  const eta = formatEta(data.etaSeconds, data.etaAt);
  const partner = data.partner;

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={() => router.replace('/')}>
          <ArrowLeft color={INK} size={20} />
        </Pressable>
        <Text style={styles.headerTitle}>Live order track</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={tracking.isRefetching}
            onRefresh={() => void tracking.refetch()}
            tintColor={ORANGE}
          />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        <View style={styles.mapWrap}>
          {mapHtml ? (
            <WebView
              style={styles.map}
              source={{ html: mapHtml }}
              scrollEnabled={false}
              javaScriptEnabled
            />
          ) : (
            <View style={styles.mapFallback}>
              <MapPin color={ORANGE} size={28} />
              <Text style={styles.mapFallbackText}>Map unavailable</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.status}>{data.dutyHint}</Text>
          {!delivered ? (
            <View style={styles.etaRow}>
              <Clock3 color={ORANGE} size={18} />
              <Text style={styles.etaText}>ETA {eta}</Text>
            </View>
          ) : (
            <Text style={styles.delivered}>Order delivered</Text>
          )}

          {data.dropAddress ? (
            <View style={styles.addressRow}>
              <MapPin color={MUTED} size={16} />
              <Text style={styles.address}>{data.dropAddress}</Text>
            </View>
          ) : null}

          {partner ? (
            <View style={styles.partnerCard}>
              <View style={styles.partnerIcon}>
                <Bike color={ORANGE} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.partnerLabel}>Delivery partner</Text>
                <Text style={styles.partnerName}>{partner.name}</Text>
                {partner.vehicleNumber ? (
                  <Text style={styles.partnerMeta}>{partner.vehicleNumber}</Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {data.expiresAt ? (
            <Text style={styles.expiry}>
              Link expires {new Date(data.expiresAt).toLocaleString()}
            </Text>
          ) : null}

          <Text style={styles.note}>
            Shared tracking — no OTP or payment details are shown.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: INK,
  },
  headerSpacer: { width: 42 },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  mapWrap: {
    height: 240,
    backgroundColor: '#E5E7EB',
  },
  map: { flex: 1 },
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
  body: { padding: 18, gap: 12 },
  status: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: INK,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  etaText: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: ORANGE,
  },
  delivered: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: GREEN,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  address: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  partnerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: ORANGE,
  },
  partnerName: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: INK,
  },
  partnerMeta: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  expiry: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
  },
  note: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
