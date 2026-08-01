import * as Haptics from 'expo-haptics';
import { ChevronRight } from 'lucide-react-native';
import { useCallback, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { fonts } from '@/constants/typography';

const ORANGE = '#F97316';
const ORANGE_DARK = '#EA580C';
const WHITE = '#FFFFFF';
const TRACK = '#FFF1E6';
const TEXT_MUTED = '#9A3412';

const THUMB = 52;
const PAD = 4;

type Props = {
  amountLabel: string;
  disabled?: boolean;
  loading?: boolean;
  onComplete: () => void;
};

export function SlideToOrderButton({
  amountLabel,
  disabled = false,
  loading = false,
  onComplete,
}: Props) {
  const width = useSharedValue(0);
  const translateX = useSharedValue(0);
  const completed = useSharedValue(0);

  const resetThumb = useCallback(() => {
    completed.value = 0;
    translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
  }, [completed, translateX]);

  const fireComplete = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete();
    setTimeout(() => {
      resetThumb();
    }, 700);
  }, [onComplete, resetThumb]);

  useEffect(() => {
    if (disabled && !loading) {
      translateX.value = withTiming(0, { duration: 180 });
      completed.value = 0;
    }
  }, [disabled, loading, translateX, completed]);

  useEffect(() => {
    if (loading && width.value > 0) {
      const max = Math.max(0, width.value - THUMB - PAD * 2);
      translateX.value = withTiming(max, { duration: 220 });
      completed.value = 1;
    }
  }, [loading, width, translateX, completed]);

  const pan = Gesture.Pan()
    .enabled(!disabled && !loading)
    .activeOffsetX(8)
    .failOffsetY([-14, 14])
    .onUpdate((e) => {
      if (completed.value) return;
      const max = Math.max(0, width.value - THUMB - PAD * 2);
      translateX.value = Math.min(max, Math.max(0, e.translationX));
    })
    .onEnd(() => {
      if (completed.value) return;
      const max = Math.max(0, width.value - THUMB - PAD * 2);
      if (max > 0 && translateX.value >= max * 0.82) {
        completed.value = 1;
        translateX.value = withSpring(max, { damping: 16, stiffness: 260 });
        runOnJS(fireComplete)();
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const fillStyle = useAnimatedStyle(() => ({
    width: THUMB + PAD * 2 + translateX.value,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const labelStyle = useAnimatedStyle(() => {
    const max = Math.max(0, width.value - THUMB - PAD * 2);
    const progress = max > 0 ? translateX.value / max : 0;
    return {
      opacity: interpolate(progress, [0, 0.4, 0.72], [1, 0.5, 0], Extrapolation.CLAMP),
      transform: [
        {
          translateX: interpolate(progress, [0, 1], [0, 16], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const amountStyle = useAnimatedStyle(() => {
    const max = Math.max(0, width.value - THUMB - PAD * 2);
    const progress = max > 0 ? translateX.value / max : 0;
    return {
      color: interpolateColor(progress, [0, 0.35, 0.7], [
        ORANGE_DARK,
        ORANGE_DARK,
        WHITE,
      ]),
    };
  });

  const hintStyle = useAnimatedStyle(() => {
    const max = Math.max(0, width.value - THUMB - PAD * 2);
    const progress = max > 0 ? translateX.value / max : 0;
    return {
      opacity: interpolate(progress, [0, 0.25], [0.75, 0], Extrapolation.CLAMP),
    };
  });

  return (
    <View
      style={[styles.track, disabled && !loading && styles.trackDisabled]}
      onLayout={(e) => {
        width.value = e.nativeEvent.layout.width;
      }}
    >
      <Animated.View style={[styles.fill, fillStyle]} />

      <View style={styles.content} pointerEvents="none">
        <View>
          <Animated.Text style={[styles.amount, amountStyle]}>
            {amountLabel}
          </Animated.Text>
          <Animated.Text style={[styles.hint, hintStyle]}>
            SLIDE TO ORDER
          </Animated.Text>
        </View>
        <Animated.Text style={[styles.label, labelStyle]}>
          Place order
        </Animated.Text>
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.thumb, thumbStyle]}>
          {loading ? (
            <ActivityIndicator color={WHITE} size="small" />
          ) : (
            <View style={styles.chevrons}>
              <ChevronRight color={WHITE} size={18} strokeWidth={2.8} />
              <ChevronRight
                color="rgba(255,255,255,0.5)"
                size={18}
                strokeWidth={2.8}
                style={styles.chevronTrail}
              />
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: 60,
    borderRadius: 18,
    backgroundColor: TRACK,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  trackDisabled: {
    opacity: 0.55,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: ORANGE,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    paddingLeft: THUMB + PAD * 2 + 10,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amount: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
  },
  hint: {
    fontFamily: fonts.uiBold,
    fontSize: 9,
    letterSpacing: 1.1,
    color: TEXT_MUTED,
    marginTop: 2,
  },
  label: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: ORANGE_DARK,
  },
  thumb: {
    position: 'absolute',
    left: PAD,
    top: PAD,
    width: THUMB,
    height: THUMB,
    borderRadius: 14,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevrons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  chevronTrail: {
    marginLeft: -10,
  },
});
