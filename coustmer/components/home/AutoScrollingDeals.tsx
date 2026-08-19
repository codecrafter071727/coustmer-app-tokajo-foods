import { Pressable } from '@/components/common/Pressable';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated,
  Dimensions,
  
  StyleSheet,
  Text,
  View,
  ViewToken } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { fonts } from '@/constants/typography';
import type { Deal } from '@/lib/customer/types';
import { prefetchRestaurantMenu } from '@/lib/restaurant/hooks';
import { useMemo } from 'react';

type Props = {
  deals: Deal[];
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH;
const CARD_HEIGHT = 200;
const AUTO_SCROLL_MS = 4200;

// ---------------------------------------------------------------------------
// Design tokens — three distinct visual identities that rotate across cards,
// the same way each real-world deal (PHAT / Crusto's / FitPass) reads as its
// own brand rather than a reused template with swapped colors.
// ---------------------------------------------------------------------------

const SPLIT_THEMES = [
  {
    bg: ['#F9D3CE', '#FEF5F4'] as [string, string],
    primary: '#8A3B35',
    accentSoft: '#F6D9D4',
    eyebrow: '#B0564C',
  },
  {
    bg: ['#D1F0D6', '#F3FDF4'] as [string, string],
    primary: '#166534',
    accentSoft: '#D6EFDB',
    eyebrow: '#3F8A57',
  },
  {
    bg: ['#FAF7EF', '#FFFFFF'] as [string, string],
    primary: '#92610E',
    accentSoft: '#F1E3C3',
    eyebrow: '#B5862C',
  },
];

const HERO_THEMES = [
  {
    gradient: ['#4C1D95', '#7C3AED', '#2E1065'] as [string, string, string],
    chip: 'rgba(255,255,255,0.16)',
  },
  {
    gradient: ['#0F766E', '#14B8A6', '#0C4A45'] as [string, string, string],
    chip: 'rgba(255,255,255,0.16)',
  },
];

type Variant = 'split' | 'hero';

function getVariant(index: number): Variant {
  // 1 hero (bold, full-bleed) card for every 3 split cards — mirrors the
  // reference set where the FitPass-style banner interrupts the food cards.
  return index % 3 === 2 ? 'hero' : 'split';
}


// ---------------------------------------------------------------------------

export function AutoScrollingDeals({ deals }: Props) {
  const router = useRouter();
  const listRef = useRef<Animated.FlatList<Deal>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const isInteracting = useRef(false);
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const infiniteDeals = useMemo(() => {
    if (!deals || deals.length === 0) return [];
    return Array.from({ length: 500 }, () => deals).flat();
  }, [deals]);

  const startAutoScroll = useCallback(() => {
    if (!infiniteDeals || infiniteDeals.length <= 1) return;
    if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);

    autoScrollTimer.current = setInterval(() => {
      if (isInteracting.current) return;

      let next = indexRef.current + 1;

      // If we somehow reach the end of our giant list, silently snap to the middle
      if (next >= infiniteDeals.length - deals.length) {
        const resetIndex = deals.length * 100 + (next % deals.length);
        listRef.current?.scrollToOffset({
          offset: resetIndex * CARD_WIDTH,
          animated: false,
        });
        indexRef.current = resetIndex;
        next = resetIndex + 1;
      }

      listRef.current?.scrollToOffset({
        offset: next * CARD_WIDTH,
        animated: true,
      });
      indexRef.current = next;
      setActiveIndex(next);
    }, AUTO_SCROLL_MS);
  }, [infiniteDeals, deals.length]);

  useEffect(() => {
    startAutoScroll();
    return () => {
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, [startAutoScroll]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        indexRef.current = viewableItems[0].index;
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  if (!deals || deals.length === 0) return null;

  const goToDeal = async (item: Deal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let rId: string | null = null;
    if (item.restaurants && item.restaurants.length > 0) {
      rId = item.restaurants[0];
    } else if (item.restaurantId) {
      rId = item.restaurantId as string;
    }
    router.push(rId ? `/restaurants/${rId}` : '/deals');
  };

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={listRef}
        data={infiniteDeals}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        bounces={false}
        keyExtractor={(item, index) => index.toString()}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          isInteracting.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          isInteracting.current = false;
          indexRef.current = Math.round(
            e.nativeEvent.contentOffset.x / CARD_WIDTH
          );
        }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * CARD_WIDTH,
            index * CARD_WIDTH,
            (index + 1) * CARD_WIDTH,
          ];

          // Subtle parallax + fade as a card enters/leaves the viewport.
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.55, 1, 0.55],
            extrapolate: 'clamp',
          });
          const imageTranslate = scrollX.interpolate({
            inputRange,
            outputRange: [40, 0, -40],
            extrapolate: 'clamp',
          });
          const contentTranslate = scrollX.interpolate({
            inputRange,
            outputRange: [18, 0, -18],
            extrapolate: 'clamp',
          });

          // Use the original deal index so the variant styling remains exactly the same
          const originalIndex = index % deals.length;
          const variant = getVariant(originalIndex);

          return (
            <Animated.View style={{ width: CARD_WIDTH, opacity }}>
              <Pressable 
                onPress={() => goToDeal(item)}
                onPressIn={() => {
                  const rId = (item.restaurants && item.restaurants.length > 0) 
                    ? item.restaurants[0] 
                    : item.restaurantId;
                  if (rId) prefetchRestaurantMenu(rId as string);
                }}
              >
                {variant === 'split' ? (
                  <SplitCard
                    item={item}
                    theme={SPLIT_THEMES[originalIndex % SPLIT_THEMES.length]}
                    imageSource={null}
                    imageTranslate={imageTranslate}
                    contentTranslate={contentTranslate}
                  />
                ) : (
                  <HeroCard
                    item={item}
                    theme={
                      HERO_THEMES[
                      Math.floor(originalIndex / 3) % HERO_THEMES.length
                      ]
                    }
                    imageSource={null}
                    imageTranslate={imageTranslate}
                    contentTranslate={contentTranslate}
                  />
                )}
              </Pressable>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Card variant 1 — light "split" card (food-style deal: PHAT / Crusto's)
// ---------------------------------------------------------------------------

function SplitCard({
  item,
  theme,
  imageSource,
  imageTranslate,
  contentTranslate,
}: {
  item: Deal;
  theme: (typeof SPLIT_THEMES)[number];
  imageSource: any;
  imageTranslate: Animated.AnimatedInterpolation<number>;
  contentTranslate: Animated.AnimatedInterpolation<number>;
}) {
  const dealType = item.discount?.type;
  const dealValue = item.discount?.value;
  const isPercentage = dealType === 'percentage';
  const resolvedValue = isPercentage ? `${dealValue}%` : `₹${dealValue}`;

  const title =
    item.title || (dealValue ? `Get flat ${resolvedValue} OFF*` : 'Super Deals inside');
  const description = item.description || 'on fantastic delights';
  const hasRestaurant =
    (item.restaurants && item.restaurants.length > 0) || !!item.restaurantId;
  const eyebrow = hasRestaurant ? 'Special Offer' : "Today's Deal";

  return (
    <LinearGradient
      colors={theme.bg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.15 }}
      style={styles.splitCard}
    >
      <Animated.View
        style={[styles.splitLeft, { transform: [{ translateX: contentTranslate }] }]}
      >
        <Text style={[styles.eyebrow, { color: theme.eyebrow }]} numberOfLines={1}>
          {eyebrow}
        </Text>
        <Text style={[styles.splitTitle, { color: theme.primary }]} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.splitDescription} numberOfLines={1}>
          {description}
        </Text>

        <View style={[styles.cta, { backgroundColor: theme.primary }]}>
          <Text style={styles.ctaText}>ORDER NOW</Text>
          <Ionicons name="arrow-forward" size={14} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </View>

        <Text style={styles.tc}>*T&C apply</Text>
      </Animated.View>

      <View style={styles.splitRight}>
        <Animated.View style={{ transform: [{ translateX: imageTranslate }] }}>
          {imageSource ? (
            <Image
              source={imageSource}
              style={styles.splitImage}
              contentFit="contain"
            />
          ) : item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.splitImage}
              contentFit="contain"
            />
          ) : null}
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------
// Card variant 2 — full-bleed gradient "hero" card (campaign-style: FitPass)
// ---------------------------------------------------------------------------

function HeroCard({
  item,
  theme,
  imageSource,
  imageTranslate,
  contentTranslate,
}: {
  item: Deal;
  theme: (typeof HERO_THEMES)[number];
  imageSource: any;
  imageTranslate: Animated.AnimatedInterpolation<number>;
  contentTranslate: Animated.AnimatedInterpolation<number>;
}) {
  const dealType = item.discount?.type;
  const dealValue = item.discount?.value;
  const isPercentage = dealType === 'percentage';
  const resolvedValue = isPercentage ? `${dealValue}%` : `₹${dealValue}`;

  const title = item.title || (dealValue ? `Win up to ${resolvedValue} back` : 'Unlock a special reward');
  const description = item.description || 'Exclusive deal, limited time only';

  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={[styles.badge, { backgroundColor: theme.chip }]}>
        <Text style={styles.badgeText}>LIMITED TIME</Text>
      </View>

      <Animated.View
        style={[styles.heroLeft, { transform: [{ translateX: contentTranslate }] }]}
      >
        <Text style={styles.heroEyebrow} numberOfLines={1}>
          Exclusive Reward
        </Text>
        <Text style={styles.heroTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.heroDescription} numberOfLines={1}>
          {description}
        </Text>

        <View style={styles.heroCta}>
          <Text style={styles.heroCtaText}>ORDER NOW</Text>
        </View>
      </Animated.View>

      <Animated.View
        style={[styles.heroRight, { transform: [{ translateX: imageTranslate }] }]}
      >
        {imageSource ? (
          <Image
            source={imageSource}
            style={styles.heroImage}
            contentFit="contain"
          />
        ) : item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.heroImage}
            contentFit="contain"
          />
        ) : null}
      </Animated.View>
    </LinearGradient>
  );
}

// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },

  // Split card -------------------------------------------------------------
  splitCard: {
    width: CARD_WIDTH - 32,
    marginHorizontal: 16,
    height: CARD_HEIGHT,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: 24,
  },
  splitLeft: {
    flex: 0.62,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  splitTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    lineHeight: 30,
    marginBottom: 6,
  },
  splitDescription: {
    fontFamily: fonts.ui,
    fontSize: 15,
    color: '#64748B',
    marginBottom: 16,
  },
  cta: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginBottom: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontFamily: fonts.uiBold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  tc: {
    fontFamily: fonts.ui,
    fontSize: 10,
    color: '#9CA3AF',
  },
  splitRight: {
    flex: 0.38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageHalo: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  splitImage: {
    width: 160,
    height: 160,
    marginLeft: -30,
  },
  imagePlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },

  // Hero card ----------------------------------------------------------------
  heroCard: {
    width: CARD_WIDTH - 32,
    marginHorizontal: 16,
    height: CARD_HEIGHT,
    flexDirection: 'row',
    overflow: 'hidden',
    paddingHorizontal: 24,
    alignItems: 'center',
    borderRadius: 24,
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  ringA: {
    width: 160,
    height: 160,
    top: -60,
    right: -30,
  },
  ringB: {
    width: 90,
    height: 90,
    bottom: -30,
    right: 60,
  },
  badge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  heroLeft: {
    flex: 0.66,
    justifyContent: 'center',
  },
  heroEyebrow: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    lineHeight: 28,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroDescription: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 16,
  },
  heroCta: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  heroCtaText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  heroRight: {
    flex: 0.34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: 200,
    height: 200,
    marginLeft: -40,
    marginTop: 40,
  },
  heroIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});