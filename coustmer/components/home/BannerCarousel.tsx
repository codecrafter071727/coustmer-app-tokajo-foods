import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { HomeBanner } from '@/lib/customer/types';

const { width } = Dimensions.get('window');
const CARD_W = width - 40;
const GAP = 12;
const STEP = CARD_W + GAP;
const AUTO_MS = 3500;

const GRADIENTS: [string, string][] = [
  ['#FF6B35', '#F7931E'],
  ['#AC0F45', '#EA580C'],
  ['#6D28D9', '#9333EA'],
  ['#0F766E', '#0D9488'],
  ['#1D4ED8', '#7C3AED'],
];

export function BannerCarousel({ banners }: { banners: HomeBanner[] }) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchingRef = useRef(false);

  const goto = useCallback(
    (idx: number, animated = true) => {
      activeRef.current = idx;
      setActiveIdx(idx);
      scrollRef.current?.scrollTo({ x: idx * STEP, animated });
    },
    [],
  );

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (banners.length <= 1) return;
    timerRef.current = setTimeout(() => {
      if (touchingRef.current) return;
      const next = (activeRef.current + 1) % banners.length;
      goto(next);
      scheduleNext();
    }, AUTO_MS);
  }, [banners.length, goto]);

  // start on mount, clean up on unmount
  useEffect(() => {
    scheduleNext();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleNext]);

  if (banners.length === 0) return null;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / STEP);
    if (idx !== activeRef.current) {
      activeRef.current = idx;
      setActiveIdx(idx);
    }
  };

  const onTouchStart = () => {
    touchingRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const onTouchEnd = () => {
    touchingRef.current = false;
    // Give user a moment to read, then resume
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      scheduleNext();
    }, 2500);
  };

  const handlePress = (banner: HomeBanner) => {
    if (!banner.deepLink) return;
    try { router.push(banner.deepLink as never); } catch { /* ignore */ }
  };

  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={STEP}
        snapToAlignment="start"
        decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.98}
        disableIntervalMomentum
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={32}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        contentContainerStyle={styles.list}
      >
        {banners.map((banner, i) => (
          <Pressable
            key={banner.id || `b${i}`}
            style={[styles.card, { width: CARD_W }]}
            onPress={() => handlePress(banner)}
          >
            {/* Background image */}
            {banner.imageUrl ? (
              <Image
                source={{ uri: banner.imageUrl }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <LinearGradient
                colors={GRADIENTS[i % GRADIENTS.length]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}

            {/* Scrim so text is readable over any photo */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.68)']}
              start={{ x: 0, y: 0.3 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.content}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>OFFER</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {banner.title}
              </Text>
              <View style={styles.cta}>
                <Text style={styles.ctaText}>Order now</Text>
                <ArrowRight color="#fff" size={14} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {banners.length > 1 && (
        <View style={styles.dots}>
          {banners.map((b, i) => (
            <View
              key={b.id || `d${i}`}
              style={[styles.dot, i === activeIdx && styles.dotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { marginTop: 20 },
  list:  { paddingHorizontal: 20, gap: GAP },
  card:  {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: '#1a1a2e',
  },
  content: { padding: 18, paddingBottom: 16 },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  pillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    maxWidth: '85%',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  ctaText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  dotActive: {
    width: 20, height: 6, borderRadius: 3,
    backgroundColor: '#AC0F45',
  },
});
