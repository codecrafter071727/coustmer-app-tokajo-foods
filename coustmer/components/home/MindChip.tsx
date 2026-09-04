import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/typography';
import { resolveMindChipImage } from '@/lib/restaurant/mind-chip-images';

export const MIND_CHIP_SIZE = 72;

type Props = {
  label: string;
  slug: string;
  imageUrl?: string;
  onPress: () => void;
};

export function MindChip({ label, slug, imageUrl, onPress }: Props) {
  const [failed, setFailed] = useState(false);
  const uri = useMemo(
    () => resolveMindChipImage(slug, label, imageUrl),
    [slug, label, imageUrl]
  );

  return (
    <Pressable
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.ring}>
        <View style={styles.imgWrap}>
          {!failed ? (
            <Image
              source={{ uri }}
              style={styles.img}
              contentFit="cover"
              transition={220}
              cachePolicy="memory-disk"
              onError={() => setFailed(true)}
            />
          ) : (
            <View style={[styles.img, styles.imgFallback]}>
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

const SIZE = MIND_CHIP_SIZE;

const styles = StyleSheet.create({
  item: {
    alignItems: 'center',
    width: 88,
  },
  itemPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.96 }],
  },
  ring: {
    width: SIZE + 6,
    height: SIZE + 6,
    borderRadius: (SIZE + 6) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 7,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  imgWrap: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  img: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  imgFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8D6',
  },
  fallbackLetter: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: '#AC0F45',
  },
  label: {
    fontFamily: fonts.uiSemi,
    fontSize: 11.5,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 2,
  },
});
