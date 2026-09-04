import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { fonts } from '@/constants/typography';
import { resolveMindChipImage } from '@/lib/restaurant/mind-chip-images';
import type { CuisineChip } from '@/lib/restaurant/types';

type Props = {
  visible: boolean;
  categories: CuisineChip[];
  onClose: () => void;
  onSelect: (cat: CuisineChip) => void;
};

const COLS = 3;
const H_PAD = 16;
const GAP = 14;

/**
 * Bottom drawer listing every nearby menu category for What's on your mind.
 */
export function MindCategoriesDrawer({
  visible,
  categories,
  onClose,
  onSelect,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const slotW = (width - H_PAD * 2 - GAP * (COLS - 1)) / COLS;
  const circle = Math.min(78, Math.floor(slotW - 10));

  const withPhotos = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        imageUrl: resolveMindChipImage(c.slug, c.name, c.imageUrl),
      })),
    [categories]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, 16) + 8 },
        ]}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>What's on your mind?</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={22} color="#374151" strokeWidth={2.2} />
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          {withPhotos.length} categories near you
        </Text>

        <FlatList
          data={withPhotos}
          keyExtractor={(item) => item.id || item.slug}
          numColumns={COLS}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <DrawerChip
              label={item.name}
              imageUrl={item.imageUrl}
              slotW={slotW}
              circle={circle}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            />
          )}
        />
      </View>
    </Modal>
  );
}

function DrawerChip({
  label,
  imageUrl,
  slotW,
  circle,
  onPress,
}: {
  label: string;
  imageUrl?: string;
  slotW: number;
  circle: number;
  onPress: () => void;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.chip,
        { width: slotW },
        pressed && styles.chipPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.ring,
          {
            width: circle + 6,
            height: circle + 6,
            borderRadius: (circle + 6) / 2,
          },
        ]}
      >
        {!failed && imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={{
              width: circle,
              height: circle,
              borderRadius: circle / 2,
            }}
            contentFit="cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <View
            style={[
              styles.fallback,
              {
                width: circle,
                height: circle,
                borderRadius: circle / 2,
              },
            ]}
          >
            <Text style={styles.letter}>
              {(label || '?').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D4D4D8',
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    marginBottom: 4,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: '#111827',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#6B7280',
    paddingHorizontal: H_PAD,
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: H_PAD,
    paddingBottom: 12,
  },
  row: {
    gap: GAP,
    marginBottom: GAP + 4,
  },
  chip: {
    alignItems: 'center',
  },
  chipPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  ring: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE8D6',
  },
  letter: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: '#AC0F45',
  },
  label: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 15,
  },
});
