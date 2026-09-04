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

import { fonts } from '@/constants/typography';
import type { HomeBanner } from '@/lib/customer/types';

const { width: SCREEN_W } = Dimensions.get('window');
const AUTO_MS = 4000;

export const FALLBACK_HOME_BANNER: HomeBanner = {
  id: 'fallback-offer',
  title: 'Hungry? Order now',
  subtitle: 'Fresh meals from kitchens near you',
  imageUrl:
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&h=800&fit=crop&q=80',
};

const GRADIENTS: [string, string][] = [
  ['#FC8019', '#EA580C'],
  ['#E23744', '#BE123C'],
  ['#0F766E', '#0D9488'],
];

type Props = {
  banners?: HomeBanner[] | null;
  height: number;
  /** Space reserved at top for location + profile overlay. */
  topOverlayPad: number;
  /** Space reserved at bottom for search + notification overlay. */
  bottomOverlayPad: number;
};

function normalizeBanners(banners?: HomeBanner[] | null): HomeBanner[] {
  if (!Array.isArray(banners) || banners.length === 0) {
    return [FALLBACK_HOME_BANNER];
  }
  return banners;
}

/** Full-bleed offer slides; chrome overlays sit on top inside the same hero. */
export function HomeOfferHeroBanner({
  banners,
  height,
  topOverlayPad,
  bottomOverlayPad,
}: Props) {
  const router = useRouter();
  const list = normalizeBanners(banners);
  const scrollRef = useRef<ScrollView>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const activeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchingRef = useRef(false);

  const goto = useCallback((idx: number, animated = true) => {
    activeRef.current = idx;
    setActiveIdx(idx);
    scrollRef.current?.scrollTo({ x: idx * SCREEN_W, animated });
  }, []);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (list.length <= 1) return;
    timerRef.current = setTimeout(() => {
      if (touchingRef.current) return;
      goto((activeRef.current + 1) % list.length);
      scheduleNext();
    }, AUTO_MS);
  }, [goto, list.length]);

  useEffect(() => {
    scheduleNext();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleNext]);

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (idx !== activeRef.current) {
      activeRef.current = idx;
      setActiveIdx(idx);
    }
  };

  const onPress = (banner: HomeBanner) => {
    if (!banner.deepLink) {
      router.push('/search');
      return;
    }
    try {
      router.push(banner.deepLink as never);
    } catch {
      router.push('/search');
    }
  };

  return (
    <View style={[styles.wrap, { height }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.98}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        onTouchStart={() => {
          touchingRef.current = true;
          if (timerRef.current) clearTimeout(timerRef.current);
        }}
        onTouchEnd={() => {
          touchingRef.current = false;
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => scheduleNext(), 2200);
        }}
        style={StyleSheet.absoluteFill}
      >
        {list.map((banner, i) => (
          <Pressable
            key={banner.id || `hero-${i}`}
            style={[styles.slide, { width: SCREEN_W, height }]}
            onPress={() => onPress(banner)}
          >
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
            <LinearGradient
              colors={[
                'rgba(0,0,0,0.45)',
                'rgba(0,0,0,0.08)',
                'rgba(0,0,0,0.55)',
                'rgba(0,0,0,0.88)',
              ]}
              locations={[0, 0.28, 0.58, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                styles.copy,
                {
                  paddingTop: topOverlayPad,
                  paddingBottom: bottomOverlayPad,
                },
              ]}
            >
              <View style={styles.pill}>
                <Text style={styles.pillText}>OFFER</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>
                {banner.title}
              </Text>
              {banner.subtitle ? (
                <Text style={styles.sub} numberOfLines={2}>
                  {banner.subtitle}
                </Text>
              ) : null}
              <View style={styles.orderBtn}>
                <Text style={styles.orderText}>Order now</Text>
                <ArrowRight color="#FC8019" size={13} strokeWidth={2.6} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {list.length > 1 ? (
        <View
          style={[styles.dots, { bottom: bottomOverlayPad - 6 }]}
          pointerEvents="none"
        >
          {list.map((b, i) => (
            <View
              key={b.id || `dot-${i}`}
              style={[styles.dot, i === activeIdx && styles.dotActive]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#1C1C1C',
  },
  slide: {
    justifyContent: 'flex-end',
  },
  copy: {
    paddingHorizontal: 18,
    justifyContent: 'flex-end',
    flex: 1,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(252,128,25,0.92)',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 4,
    marginBottom: 10,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: fonts.uiBold,
    letterSpacing: 1.3,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: fonts.displayBold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.45,
    maxWidth: '92%',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  sub: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.95)',
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    lineHeight: 19,
    maxWidth: '92%',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  orderBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  orderText: {
    color: '#FC8019',
    fontFamily: fonts.uiBold,
    fontSize: 12.5,
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 16,
    backgroundColor: '#FFFFFF',
  },
});
