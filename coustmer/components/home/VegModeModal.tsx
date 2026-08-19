import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Modal,
  
  StyleSheet,
  Text,
  View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import {
  type VegMode,
  useVegPreferenceStore,
} from '@/store/veg-preference-store';

const VEG_GREEN = '#21B477';

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (mode: VegMode) => void;
};

export function VegModeModal({ visible, onClose, onApply }: Props) {
  const storedMode = useVegPreferenceStore((s) => s.mode);
  const rememberPref = useVegPreferenceStore((s) => s.remember);
  const setRemember = useVegPreferenceStore((s) => s.setRemember);
  const setMode = useVegPreferenceStore((s) => s.setMode);

  const [draft, setDraft] = useState<VegMode>(storedMode);
  const [remember, setRememberLocal] = useState(rememberPref);
  const [mounted, setMounted] = useState(visible);

  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setDraft(storedMode);
      setRememberLocal(rememberPref);
      progress.value = withTiming(1, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
    } else if (mounted) {
      progress.value = withTiming(
        0,
        { duration: 220, easing: Easing.in(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setMounted)(false);
        }
      );
    }
  }, [visible, mounted, progress, storedMode, rememberPref]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value * 0.55,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: 0.88 + progress.value * 0.12 },
      { translateY: (1 - progress.value) * 28 },
    ],
  }));

  if (!mounted) return null;

  const apply = () => {
    setRemember(remember);
    if (remember) setMode(draft);
    else setMode(draft);
    onApply(draft);
    onClose();
  };

  return (
    <Modal transparent visible={mounted} animationType="none" statusBarTranslucent>
      <View style={styles.root} pointerEvents="box-none">
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.header}>
            <Text style={styles.title}>I want to see veg choices from</Text>
            <View style={styles.headerArt}>
              <Image source={{ uri: FOOD_IMG }} style={styles.foodImg} contentFit="cover" />
              <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                <X color="#9CA3AF" size={18} />
              </Pressable>
            </View>
          </View>

          <Pressable style={styles.option} onPress={() => setDraft('all')}>
            <Text style={styles.optionText}>All restaurants</Text>
            <View style={[styles.radio, draft === 'all' && styles.radioOn]}>
              {draft === 'all' ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>

          <Pressable style={styles.option} onPress={() => setDraft('pure_veg')}>
            <Text style={styles.optionText}>Pure veg restaurants only</Text>
            <View style={[styles.radio, draft === 'pure_veg' && styles.radioOn]}>
              {draft === 'pure_veg' ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>

          <View style={styles.dash} />

          <Pressable
            style={styles.rememberRow}
            onPress={() => setRememberLocal((v) => !v)}
          >
            <View style={[styles.checkbox, remember && styles.checkboxOn]}>
              {remember ? <View style={styles.checkMark} /> : null}
            </View>
            <Text style={styles.rememberText}>Remember my choice going forward</Text>
          </Pressable>

          <Pressable style={styles.cta} onPress={apply}>
            <Text style={styles.ctaText}>Show restaurants</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 18,
  },
  title: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: '#282C3F',
    lineHeight: 26,
    letterSpacing: -0.3,
  },
  headerArt: {
    width: 64,
    alignItems: 'flex-end',
  },
  foodImg: {
    width: 56,
    height: 56,
    borderRadius: 14,
    marginTop: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: -6,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  optionText: {
    fontFamily: fonts.uiSemi,
    fontSize: 15,
    color: '#282C3F',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: VEG_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: {
    borderColor: VEG_GREEN,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: VEG_GREEN,
  },
  dash: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    marginVertical: 8,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    borderColor: VEG_GREEN,
    backgroundColor: VEG_GREEN,
  },
  checkMark: {
    width: 8,
    height: 8,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  rememberText: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#686B78',
  },
  cta: {
    marginTop: 12,
    backgroundColor: VEG_GREEN,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
