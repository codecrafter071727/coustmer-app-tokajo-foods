import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/typography';
import { resolveMindChipImage } from '@/lib/restaurant/mind-chip-images';

/** Default circle diameter; grows with wider slots. */
export const MIND_CHIP_SIZE = 76;

type Props = {
  label: string;
  slug: string;
  imageUrl?: string;
  onPress: () => void;
  /** Full column width for this chip (from 6-up grid). */
  slotWidth?: number;
};

export function MindChip({
  label,
  slug,
  imageUrl,
  onPress,
  slotWidth,
}: Props) {
  const [failed, setFailed] = useState(false);
  const uri = useMemo(
    () => resolveMindChipImage(slug, label, imageUrl),
    [slug, label, imageUrl]
  );

  // Fill most of the column so the strip looks dense edge-to-edge.
  const size = slotWidth
    ? Math.min(MIND_CHIP_SIZE, Math.max(54, Math.floor(slotWidth - 2)))
    : MIND_CHIP_SIZE;
  const ring = size + 2;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        slotWidth ? { width: slotWidth } : null,
        pressed && styles.itemPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.ring,
          {
            width: ring,
            height: ring,
            borderRadius: ring / 2,
          },
        ]}
      >
        <View
          style={[
            styles.imgWrap,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        >
          {!failed ? (
            <Image
              source={{ uri }}
              style={{ width: size, height: size, borderRadius: size / 2 }}
              contentFit="cover"
              transition={220}
              cachePolicy="memory-disk"
              onError={() => setFailed(true)}
            />
          ) : (
            <View
              style={[
                styles.imgFallback,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                },
              ]}
            >
              <Text style={styles.fallbackLetter}>
                {(label || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
  },
  itemPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 2,
  },
  imgWrap: {
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  imgFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8D6',
  },
  fallbackLetter: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: '#AC0F45',
  },
  label: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 1,
  },
});
