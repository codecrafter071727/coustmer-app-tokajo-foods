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

const FALLBACK_BANNER: HomeBanner = {
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
  banners: HomeBanner[];
  height: number;
  contentTopPad: number;
};

/** Full-bleed auto-scrolling offer hero with Order now CTA. */
export function HomeOfferHeroBanner({
  banners,
  height,
  contentTopPad,
}: Props) {
  const router = useRouter();
  const slides = banners.length > 0 ? banners : [FALLBACK_BANNER];
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
    if (slides.length <= 1) return;
    timerRef.current = setTimeout(() => {
      if (touchingRef.current) return;
      goto((activeRef.current + 1) % slides.length);
      scheduleNext();
    }, AUTO_MS);
  }, [goto, slides.length]);

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
        {slides.map((banner, i) => (
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
                'rgba(0,0,0,0.48)',
                'rgba(0,0,0,0.12)',
                'rgba(0,0,0,0.74)',
              ]}
              locations={[0, 0.38, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.copy, { paddingTop: contentTopPad }]}>
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
                <ArrowRight color="#FC8019" size={15} strokeWidth={2.6} />
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {slides.length > 1 ? (
        <View style={styles.dots}>
          {slides.map((b, i) => (
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
    paddingBottom: 30,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: fonts.uiBold,
    letterSpacing: 1.2,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: fonts.displayBold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    maxWidth: '88%',
  },
  sub: {
    marginTop: 4,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: fonts.uiSemi,
    fontSize: 13.5,
    lineHeight: 18,
    maxWidth: '90%',
  },
  orderBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  orderText: {
    color: '#FC8019',
    fontFamily: fonts.uiBold,
    fontSize: 13.5,
  },
  dots: {
    position: 'absolute',
    bottom: 10,
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
