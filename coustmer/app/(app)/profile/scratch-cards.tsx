import { useRouter } from 'expo-router';
import { ChevronLeft, Gift, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import { useRevealScratchCard, useScratchCards } from '@/lib/customer/hooks';
import type { ScratchCard } from '@/lib/customer/types';

function ScratchCardItem({
  card,
  onReveal,
  revealing,
}: {
  card: ScratchCard;
  onReveal: () => void;
  revealing: boolean;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    scale.value = withSequence(withSpring(0.92), withSpring(1.05), withSpring(1));
    onReveal();
  };

  const isPending = card.status === 'pending';
  const isRevealed = card.status === 'revealed';

  return (
    <Animated.View style={[styles.card, animStyle, isRevealed && styles.cardRevealed]}>
      <View style={styles.cardIcon}>
        {isPending ? (
          <Sparkles size={28} color="#F59E0B" strokeWidth={1.5} />
        ) : (
          <Gift size={28} color="#16A34A" strokeWidth={1.5} />
        )}
      </View>
      <View style={styles.cardBody}>
        {isPending && (
          <>
            <Text style={styles.cardTitle}>Scratch to reveal!</Text>
            <Text style={styles.cardSub}>Tap to uncover your reward</Text>
          </>
        )}
        {isRevealed && (
          <>
            <Text style={styles.cardTitle}>{card.reward || 'You won!'}</Text>
            {card.couponCode && (
              <View style={styles.couponWrap}>
                <Text style={styles.couponCode}>{card.couponCode}</Text>
              </View>
            )}
            {card.discount != null && (
              <Text style={styles.discountText}>₹{card.discount} off</Text>
            )}
          </>
        )}
        {card.status === 'used' && (
          <Text style={styles.usedText}>Reward used</Text>
        )}
        {card.status === 'expired' && (
          <Text style={styles.expiredText}>Expired</Text>
        )}
      </View>
      {isPending && (
        <TouchableOpacity
          style={styles.revealBtn}
          onPress={handlePress}
          disabled={revealing}
          activeOpacity={0.85}
        >
          {revealing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.revealText}>Scratch</Text>
          )}
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

export default function ScratchCardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: cards, isLoading, refetch, isRefetching } = useScratchCards();
  const reveal = useRevealScratchCard();
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const handleReveal = (cardId: string) => {
    setRevealingId(cardId);
    reveal.mutate(cardId, {
      onSettled: () => setRevealingId(null),
    });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={22} color="#0B1220" strokeWidth={2.2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scratch Cards</Text>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={authTheme.brand} />
        </View>
      )}

      {!isLoading && (
        <FlatList
          data={cards ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          ListEmptyComponent={
            <View style={styles.center}>
              <Gift size={48} color="#D1D5DB" strokeWidth={1.2} />
              <Text style={styles.emptyTitle}>No scratch cards</Text>
              <Text style={styles.emptyText}>
                Complete orders to earn scratch cards with exciting rewards!
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ScratchCardItem
              card={item}
              onReveal={() => handleReveal(item.id)}
              revealing={revealingId === item.id}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: '#0B1220' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    elevation: 1,
  },
  cardRevealed: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  cardIcon: { marginRight: 14 },
  cardBody: { flex: 1 },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: '#0B1220', marginBottom: 2 },
  cardSub: { fontFamily: fonts.ui, fontSize: 12, color: '#92400E' },
  couponWrap: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderStyle: 'dashed',
  },
  couponCode: { fontFamily: fonts.uiBold, fontSize: 13, color: '#166534', letterSpacing: 0.8 },
  discountText: { fontFamily: fonts.uiBold, fontSize: 14, color: '#16A34A', marginTop: 4 },
  usedText: { fontFamily: fonts.uiSemi, fontSize: 13, color: '#6B7280' },
  expiredText: { fontFamily: fonts.uiSemi, fontSize: 13, color: '#DC2626' },
  revealBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealText: { fontFamily: fonts.uiBold, fontSize: 13, color: '#FFFFFF' },
  emptyTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: '#6B7280', marginTop: 12 },
  emptyText: { fontFamily: fonts.ui, fontSize: 13, color: '#9CA3AF', textAlign: 'center', maxWidth: 260, lineHeight: 19 },
});
