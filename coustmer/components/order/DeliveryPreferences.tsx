import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { CheckSquare, Square, X } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { fonts } from '@/constants/typography';

const TIP_IMAGE_IDLE =
  'https://cdn-icons-png.flaticon.com/512/3063/3063822.png';
const BIKE_IMAGE = 'https://cdn-icons-png.flaticon.com/512/2830/2830305.png';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONFETTI_COLORS = [
  '#F97316',
  '#00BAF2',
  '#FFC107',
  '#1BA672',
  '#E91E63',
  '#9C27B0',
];
const TIP_AMOUNTS = [20, 30, 50];
const BRAND = '#F97316';

function InstantConfetti({
  trigger,
  bikeAnim,
}: {
  trigger: number;
  bikeAnim: Animated.Value;
}) {
  const anims = React.useMemo(() => {
    if (trigger === 0) return [];
    return Array.from({ length: 120 }).map(() => {
      const spawnX = -100 + Math.random() * (SCREEN_WIDTH + 80);
      const distX = 50 + Math.random() * 100;
      const endX = spawnX - distX;
      const startBottom = 5;
      const endBottom = startBottom + (Math.random() * 60 - 30);

      return {
        spawnX,
        endX,
        startBottom,
        endBottom,
        size: 3 + Math.random() * 5,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotDir: Math.random() > 0.5 ? 1 : -1,
      };
    });
  }, [trigger]);

  if (trigger === 0 || anims.length === 0) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100 }]} pointerEvents="none">
      {anims.map((a, i) => {
        const translateX = bikeAnim.interpolate({
          inputRange: [-200, a.spawnX, a.spawnX + 150, SCREEN_WIDTH + 500],
          outputRange: [a.spawnX, a.spawnX, a.endX, a.endX],
          extrapolate: 'clamp',
        });
        const translateY = bikeAnim.interpolate({
          inputRange: [-200, a.spawnX, a.spawnX + 150, SCREEN_WIDTH + 500],
          outputRange: [
            0,
            0,
            -(a.endBottom - a.startBottom),
            -(a.endBottom - a.startBottom),
          ],
          extrapolate: 'clamp',
        });
        const rotate = bikeAnim.interpolate({
          inputRange: [-200, a.spawnX, a.spawnX + 150, SCREEN_WIDTH + 500],
          outputRange: [
            '0deg',
            '0deg',
            `${a.rotDir * 180}deg`,
            `${a.rotDir * 180}deg`,
          ],
          extrapolate: 'clamp',
        });
        const scale = bikeAnim.interpolate({
          inputRange: [-200, a.spawnX, a.spawnX + 150, SCREEN_WIDTH + 500],
          outputRange: [0.2, 1, 0, 0],
          extrapolate: 'clamp',
        });
        const opacity = bikeAnim.interpolate({
          inputRange: [
            -200,
            a.spawnX - 1,
            a.spawnX,
            a.spawnX + 50,
            a.spawnX + 150,
            SCREEN_WIDTH + 500,
          ],
          outputRange: [0, 0, 1, 0.8, 0, 0],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              bottom: a.startBottom,
              left: 10,
              width: a.size,
              height: a.size * 1.2,
              backgroundColor: a.color,
              borderRadius: 1,
              opacity,
              transform: [
                { translateX },
                { translateY },
                { rotate },
                { skewX: '20deg' },
                { scale },
              ],
            }}
          />
        );
      })}
    </View>
  );
}

type Props = {
  tip: number;
  setTip: (tip: number) => void;
  /** Kept optional for CartScreen compatibility; notes UI removed. */
  specialInstructions?: string;
  setSpecialInstructions?: (inst: string) => void;
  onFocusOther?: () => void;
};

export function DeliveryPreferences({ tip, setTip }: Props) {
  const [autoTip, setAutoTip] = useState(false);
  const [animatingTip, setAnimatingTip] = useState(false);
  const bikeAnim = useRef(new Animated.Value(-SCREEN_WIDTH)).current;
  const [confettiKey, setConfettiKey] = useState(0);

  const handleTipSelect = (amt: number) => {
    if (tip === amt && amt !== 0) {
      setTip(0);
      return;
    }
    setTip(amt);

    if (amt > 0) {
      setConfettiKey((prev) => prev + 1);
      if (!animatingTip) {
        setAnimatingTip(true);
        bikeAnim.setValue(-120);
        Animated.timing(bikeAnim, {
          toValue: SCREEN_WIDTH + 100,
          duration: 2500,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(() => {
          setAnimatingTip(false);
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tipHeaderRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.sectionTitle}>Delivery tip</Text>
          <Text style={styles.tipDesc}>
            Day & night, our delivery partners bring your favourite meals. Thank
            them with a tip.
          </Text>
        </View>
        <Image
          source={{ uri: TIP_IMAGE_IDLE }}
          style={styles.tipImage}
          contentFit="contain"
        />
      </View>

      <View style={{ position: 'relative' }}>
        <View style={styles.tipOptionsRow}>
          {TIP_AMOUNTS.map((amt) => {
            const isSelected = tip === amt;
            const isMostTipped = amt === 30;
            return (
              <Pressable
                key={amt}
                style={[
                  styles.tipOption,
                  isSelected && styles.tipOptionSelected,
                  isMostTipped && { paddingBottom: 16 },
                ]}
                onPress={() => handleTipSelect(amt)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text
                    style={[
                      styles.tipAmtText,
                      isSelected && styles.tipAmtTextSelected,
                    ]}
                  >
                    ₹{amt}
                  </Text>
                  {isSelected ? (
                    <X
                      size={12}
                      color={BRAND}
                      style={{ marginLeft: 4 }}
                      strokeWidth={3}
                    />
                  ) : null}
                </View>
                {isMostTipped && !isSelected ? (
                  <View style={styles.mostTippedBadge}>
                    <Text style={styles.mostTippedText}>Most tipped</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.checkboxRow, { opacity: tip > 0 ? 1 : 0 }]}
          onPress={() => tip > 0 && setAutoTip(!autoTip)}
          disabled={tip === 0}
        >
          {autoTip ? (
            <CheckSquare size={18} color={BRAND} />
          ) : (
            <Square size={18} color="#9CA3AF" />
          )}
          <Text style={styles.checkboxText}>
            Add this tip automatically to future orders
          </Text>
        </Pressable>

        <InstantConfetti trigger={confettiKey} bikeAnim={bikeAnim} />
        {animatingTip ? (
          <Animated.Image
            source={{ uri: BIKE_IMAGE }}
            style={[
              styles.bikeAnimation,
              { transform: [{ translateX: bikeAnim }, { scaleX: -1 }] },
            ]}
            resizeMode="contain"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'visible',
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: '#0B1220',
    marginBottom: 4,
  },
  tipDesc: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
  },
  tipImage: {
    width: 48,
    height: 48,
  },
  tipOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tipOption: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tipOptionSelected: {
    borderColor: BRAND,
    backgroundColor: '#FFF7ED',
  },
  tipAmtText: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: '#334155',
  },
  tipAmtTextSelected: {
    color: BRAND,
  },
  mostTippedBadge: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    backgroundColor: BRAND,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    paddingVertical: 2,
    alignItems: 'center',
  },
  mostTippedText: {
    fontFamily: fonts.uiBold,
    fontSize: 8,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  checkboxText: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#64748B',
  },
  bikeAnimation: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    width: 56,
    height: 40,
    zIndex: 101,
  },
});
