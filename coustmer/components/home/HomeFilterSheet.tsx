import { Pressable } from '@/components/common/Pressable';
import {
  BadgePercent,
  Check,
  Clock3,
  IndianRupee,
  ListFilter,
  ShieldCheck,
  Star,
  X,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable as RNPressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fonts } from '@/constants/typography';
import {
  applyHomeFilters,
  countActiveHomeFilters,
  DEFAULT_HOME_FILTERS,
  DISH_PRICE_OPTIONS,
  HOME_SORT_OPTIONS,
  RATING_OPTIONS,
  TIME_OPTIONS,
  type DeliveryTimeBand,
  type DishPriceBand,
  type FilterSheetTab,
  type HomeFilterState,
  type HomeSortId,
  type RatingBand,
} from '@/lib/home/filters';
import type { Restaurant } from '@/lib/restaurant/types';

type TabId = FilterSheetTab;

type Props = {
  visible: boolean;
  filters: HomeFilterState;
  restaurants: Restaurant[];
  initialTab?: TabId;
  onClose: () => void;
  onApply: (next: HomeFilterState) => void;
};

const TABS: { id: TabId; label: string; Icon: typeof Star }[] = [
  { id: 'sort', label: 'Sort By', Icon: ListFilter },
  { id: 'time', label: 'Time', Icon: Clock3 },
  { id: 'rating', label: 'Rating', Icon: Star },
  { id: 'offers', label: 'Offers', Icon: BadgePercent },
  { id: 'price', label: 'Dish Price', Icon: IndianRupee },
  { id: 'trust', label: 'Trust', Icon: ShieldCheck },
];

function RupeeMarks({ count }: { count: number }) {
  return (
    <Text style={styles.rupeeMarks}>
      {Array.from({ length: count }, () => '₹').join('')}
    </Text>
  );
}

export function HomeFilterSheet({
  visible,
  filters,
  restaurants,
  initialTab = 'sort',
  onClose,
  onApply,
}: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabId>(initialTab);
  const [draft, setDraft] = useState<HomeFilterState>(filters);

  useEffect(() => {
    if (visible) {
      setDraft(filters);
      setTab(initialTab);
    }
  }, [visible, filters, initialTab]);

  const previewCount = useMemo(
    () => applyHomeFilters(restaurants, draft).length,
    [restaurants, draft]
  );
  const draftActive = countActiveHomeFilters(draft);

  const patch = (partial: Partial<HomeFilterState>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const togglePrice = (id: DishPriceBand) => {
    patch({ priceBand: draft.priceBand === id ? 'any' : id });
  };
  const toggleTime = (id: DeliveryTimeBand) => {
    patch({ timeBand: draft.timeBand === id ? 'any' : id });
  };
  const toggleRating = (id: RatingBand) => {
    patch({ ratingBand: draft.ratingBand === id ? 'any' : id });
  };

  const handleClear = () => {
    setDraft({
      ...DEFAULT_HOME_FILTERS,
      cuisine: draft.cuisine,
    });
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <RNPressable style={styles.backdrop} onPress={onClose} />

        <RNPressable style={styles.closeFab} onPress={onClose} hitSlop={8}>
          <X color="#FFFFFF" size={18} strokeWidth={2.6} />
        </RNPressable>

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.header}>
            <Text style={styles.title}>Filters and sorting</Text>
            <Pressable onPress={handleClear} hitSlop={8}>
              <Text style={styles.clearAll}>Clear all</Text>
            </Pressable>
          </View>

          <View style={styles.body}>
            <View style={styles.sidebar}>
              {TABS.map(({ id, label, Icon }) => {
                const on = tab === id;
                return (
                  <Pressable
                    key={id}
                    style={[styles.sideItem, on && styles.sideItemOn]}
                    onPress={() => setTab(id)}
                  >
                    <Icon
                      color={on ? '#F97316' : '#686B78'}
                      size={18}
                      strokeWidth={2.2}
                    />
                    <Text style={[styles.sideLabel, on && styles.sideLabelOn]}>
                      {label}
                    </Text>
                    {on ? <View style={styles.sideAccent} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentInner}
              showsVerticalScrollIndicator={false}
            >
              {tab === 'sort' ? (
                <View>
                  <Text style={styles.sectionTitle}>Sort By</Text>
                  {HOME_SORT_OPTIONS.map((opt) => {
                    const on = draft.sort === opt.id;
                    return (
                      <Pressable
                        key={opt.id}
                        style={[styles.radioRow, on && styles.optionOn]}
                        onPress={() =>
                          patch({
                            sort: opt.id as HomeSortId,
                            nearOnly: opt.id === 'nearest',
                          })
                        }
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.optionTitle, on && styles.optionTitleOn]}>
                            {opt.label}
                          </Text>
                          <Text style={styles.optionHint}>{opt.hint}</Text>
                        </View>
                        <View style={[styles.radio, on && styles.radioChecked]}>
                          {on ? <Check color="#FFFFFF" size={12} strokeWidth={3} /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {tab === 'time' ? (
                <View>
                  <Text style={styles.sectionTitle}>Delivery Time</Text>
                  <View style={styles.cardGrid}>
                    {TIME_OPTIONS.map((opt) => {
                      const on = draft.timeBand === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          style={[styles.choiceCard, on && styles.choiceCardOn]}
                          onPress={() => toggleTime(opt.id)}
                        >
                          <Clock3
                            color={on ? '#F97316' : '#16A34A'}
                            size={20}
                            strokeWidth={2.2}
                          />
                          <Text style={[styles.choiceLabel, on && styles.choiceLabelOn]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {tab === 'rating' ? (
                <View>
                  <Text style={styles.sectionTitle}>Rating</Text>
                  <View style={styles.cardGrid}>
                    {RATING_OPTIONS.map((opt) => {
                      const on = draft.ratingBand === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          style={[styles.choiceCard, on && styles.choiceCardOn]}
                          onPress={() => toggleRating(opt.id)}
                        >
                          <Star
                            color={on ? '#F97316' : '#F59E0B'}
                            size={20}
                            fill={on ? '#F97316' : '#F59E0B'}
                            strokeWidth={0}
                          />
                          <Text style={[styles.choiceLabel, on && styles.choiceLabelOn]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {tab === 'offers' ? (
                <View>
                  <Text style={styles.sectionTitle}>Offers</Text>
                  <Pressable
                    style={[
                      styles.choiceCardWide,
                      draft.offersOnly && styles.choiceCardOn,
                    ]}
                    onPress={() => patch({ offersOnly: !draft.offersOnly })}
                  >
                    <BadgePercent
                      color={draft.offersOnly ? '#F97316' : '#16A34A'}
                      size={22}
                      strokeWidth={2.2}
                    />
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.choiceLabel,
                          draft.offersOnly && styles.choiceLabelOn,
                        ]}
                      >
                        Restaurants with offers
                      </Text>
                      <Text style={styles.optionHint}>
                        Show places running deals right now
                      </Text>
                    </View>
                    <View
                      style={[styles.radio, draft.offersOnly && styles.radioChecked]}
                    >
                      {draft.offersOnly ? (
                        <Check color="#FFFFFF" size={12} strokeWidth={3} />
                      ) : null}
                    </View>
                  </Pressable>
                </View>
              ) : null}

              {tab === 'price' ? (
                <View>
                  <Text style={styles.sectionTitle}>Dish Price</Text>
                  <View style={styles.priceRow}>
                    {DISH_PRICE_OPTIONS.map((opt) => {
                      const on = draft.priceBand === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          style={[styles.priceCard, on && styles.choiceCardOn]}
                          onPress={() => togglePrice(opt.id)}
                        >
                          <RupeeMarks count={opt.rupees} />
                          <Text
                            style={[styles.priceLabel, on && styles.choiceLabelOn]}
                          >
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.sectionTitle, { marginTop: 22 }]}>
                    Trust Markers
                  </Text>
                  <View style={styles.trustGrid}>
                    <Pressable
                      style={[
                        styles.trustCard,
                        draft.pureVeg && styles.choiceCardOn,
                      ]}
                      onPress={() => patch({ pureVeg: !draft.pureVeg })}
                    >
                      <View style={styles.vegBadge}>
                        <Text style={styles.vegBadgeText}>VEG</Text>
                      </View>
                      <Text
                        style={[
                          styles.trustLabel,
                          draft.pureVeg && styles.choiceLabelOn,
                        ]}
                      >
                        Pure Veg
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.trustCard,
                        draft.hygieneRatedOnly && styles.choiceCardOn,
                      ]}
                      onPress={() =>
                        patch({ hygieneRatedOnly: !draft.hygieneRatedOnly })
                      }
                    >
                      <ShieldCheck
                        color={draft.hygieneRatedOnly ? '#EA580C' : '#64748B'}
                        size={18}
                        strokeWidth={2.2}
                      />
                      <Text
                        style={[
                          styles.trustLabel,
                          draft.hygieneRatedOnly && styles.choiceLabelOn,
                        ]}
                      >
                        Hygiene rated 4+
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {tab === 'trust' ? (
                <View>
                  <Text style={styles.sectionTitle}>Trust Markers</Text>
                  <View style={styles.trustGrid}>
                    <Pressable
                      style={[
                        styles.trustCard,
                        draft.pureVeg && styles.choiceCardOn,
                      ]}
                      onPress={() => patch({ pureVeg: !draft.pureVeg })}
                    >
                      <View style={styles.vegBadge}>
                        <Text style={styles.vegBadgeText}>VEG</Text>
                      </View>
                      <Text
                        style={[
                          styles.trustLabel,
                          draft.pureVeg && styles.choiceLabelOn,
                        ]}
                      >
                        Pure Veg
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.trustCard,
                        draft.hygieneRatedOnly && styles.choiceCardOn,
                      ]}
                      onPress={() =>
                        patch({ hygieneRatedOnly: !draft.hygieneRatedOnly })
                      }
                    >
                      <ShieldCheck
                        color={draft.hygieneRatedOnly ? '#EA580C' : '#64748B'}
                        size={18}
                        strokeWidth={2.2}
                      />
                      <Text
                        style={[
                          styles.trustLabel,
                          draft.hygieneRatedOnly && styles.choiceLabelOn,
                        ]}
                      >
                        Hygiene rated 4+
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </ScrollView>
          </View>

          <View style={styles.footer}>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
            <Pressable
              style={[
                styles.showBtn,
                draftActive > 0 ? styles.showBtnActive : styles.showBtnMuted,
              ]}
              onPress={handleApply}
            >
              <Text
                style={[
                  styles.showBtnText,
                  draftActive > 0 && styles.showBtnTextActive,
                ]}
              >
                {`Show results${previewCount >= 0 ? ` (${previewCount})` : ''}`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2,6,12,0.45)',
  },
  closeFab: {
    alignSelf: 'center',
    marginBottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1C1C',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '88%',
    minHeight: '72%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: '#1C1C1C',
  },
  clearAll: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: '#686B78',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 420,
  },
  sidebar: {
    width: 104,
    backgroundColor: '#F5F5F6',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E8E8E8',
  },
  sideItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 6,
    gap: 6,
    position: 'relative',
  },
  sideItemOn: {
    backgroundColor: '#FFF7ED',
  },
  sideAccent: {
    position: 'absolute',
    right: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: '#F97316',
  },
  sideLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: '#686B78',
    textAlign: 'center',
  },
  sideLabelOn: {
    color: '#F97316',
    fontFamily: fonts.uiBold,
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentInner: {
    padding: 16,
    paddingBottom: 28,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: '#1C1C1C',
    marginBottom: 14,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  optionOn: {
    backgroundColor: '#FFF7ED',
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  optionTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: '#282C3F',
  },
  optionTitleOn: {
    color: '#F97316',
    fontFamily: fonts.uiBold,
  },
  optionHint: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#8A8D9F',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CFD0D6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioChecked: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  cardGrid: {
    gap: 10,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  choiceCardWide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  choiceCardOn: {
    borderColor: '#F97316',
    backgroundColor: '#FFF7ED',
  },
  choiceLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: '#282C3F',
  },
  choiceLabelOn: {
    color: '#F97316',
    fontFamily: fonts.uiBold,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priceCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 6,
    backgroundColor: '#FFFFFF',
    minHeight: 96,
  },
  rupeeMarks: {
    color: '#1BA672',
    fontFamily: fonts.displayBold,
    fontSize: 18,
    letterSpacing: 1,
  },
  priceLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: '#282C3F',
    textAlign: 'center',
  },
  trustGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  trustCard: {
    width: '47%',
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  trustLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: '#282C3F',
    lineHeight: 18,
  },
  trustEmoji: {
    fontSize: 22,
  },
  vegBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: '#1BA672',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F8F0',
  },
  vegBadgeText: {
    fontFamily: fonts.uiBold,
    fontSize: 9,
    color: '#1BA672',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
    gap: 12,
  },
  closeText: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: '#1C1C1C',
    paddingVertical: 10,
    paddingRight: 8,
  },
  showBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  showBtnMuted: {
    backgroundColor: '#E8E8E8',
  },
  showBtnActive: {
    backgroundColor: '#F97316',
  },
  showBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: '#686B78',
  },
  showBtnTextActive: {
    color: '#FFFFFF',
  },
});
