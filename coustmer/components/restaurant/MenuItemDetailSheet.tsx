import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import {
  Bell,
  BellOff,
  Heart,
  Minus,
  Plus,
  Share2,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { VegBadge } from '@/components/restaurant/MenuBadges';
import {
  addMenuItemToCart,
  decrementCartItem,
  incrementCartItem,
} from '@/lib/order/add-to-cart';
import { sameModifiers } from '@/lib/cart/modifiers';
import type { CartModifier } from '@/lib/cart/types';
import {
  useItemCustomizations,
  useKitchenAlerts,
  useMenuItem,
  useNotifyStock,
} from '@/lib/restaurant/hooks';
import type { CustomizationGroup, MenuItem } from '@/lib/restaurant/types';
import { resolveMenuItemImage } from '@/lib/restaurant/menu-item-images';
import { playHapticFeedback } from '@/lib/utils/haptics';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';

type MenuItemDetailSheetProps = {
  item: MenuItem | null;
  restaurantId: string;
  restaurantName: string;
  restaurantImageUrl?: string;
  visible?: boolean;
  onClose: () => void;
};

function isSingleSelect(group: CustomizationGroup) {
  const type = String(group.type ?? '').toLowerCase();
  if (type.includes('addon') || type.includes('multi') || type.includes('check')) {
    return false;
  }
  if (typeof group.max === 'number' && group.max > 1) return false;
  if (typeof group.max === 'number' && group.max === 1) return true;
  if (group.required && (group.min ?? 1) >= 1 && (group.max == null || group.max === 1)) {
    return true;
  }
  return (group.max ?? 1) <= 1;
}

function buildSelectedModifiers(
  groups: CustomizationGroup[],
  selected: Record<string, string[]>
): CartModifier[] {
  const out: CartModifier[] = [];
  for (const group of groups) {
    const ids = new Set(selected[group.id] ?? []);
    for (const opt of group.options) {
      if (!ids.has(opt.id)) continue;
      out.push({
        groupId: group.id,
        groupName: group.name,
        optionId: opt.id,
        optionName: opt.name,
        price: Math.max(0, Number(opt.price) || 0),
      });
    }
  }
  return out;
}

function validateSelections(
  groups: CustomizationGroup[],
  selected: Record<string, string[]>
): string | null {
  for (const group of groups) {
    const count = (selected[group.id] ?? []).filter((id) =>
      group.options.some((o) => o.id === id && o.isAvailable !== false)
    ).length;
    const min = group.required
      ? Math.max(1, group.min ?? 1)
      : Math.max(0, group.min ?? 0);
    const max = group.max ?? (isSingleSelect(group) ? 1 : 99);
    if (count < min) {
      return `Choose ${min === 1 ? 'an option' : `${min} options`} for ${group.name}`;
    }
    if (count > max) {
      return `You can pick at most ${max} for ${group.name}`;
    }
  }
  return null;
}

export function MenuItemDetailSheet({
  item,
  restaurantId,
  restaurantName,
  restaurantImageUrl,
  visible = true,
  onClose,
}: MenuItemDetailSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [favorited, setFavorited] = useState(false);
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const itemId = item?.id ?? '';
  const detailQuery = useMenuItem(restaurantId, itemId);
  const customizations = useItemCustomizations(restaurantId, itemId, {
    enabled: Boolean(visible && restaurantId && itemId),
  });
  const alerts = useKitchenAlerts({ enabled: Boolean(token && visible) });
  const notifyStock = useNotifyStock(restaurantId, itemId);

  const displayItem = useMemo((): MenuItem | null => {
    if (!item) return null;
    if (detailQuery.data?.id) {
      return {
        ...item,
        ...detailQuery.data,
        imageUrl: detailQuery.data.imageUrl || item.imageUrl,
        description: detailQuery.data.description || item.description,
      };
    }
    return item;
  }, [item, detailQuery.data]);

  const groups = customizations.data ?? [];
  const selectedModifiers = useMemo(
    () => buildSelectedModifiers(groups, selected),
    [groups, selected]
  );

  useEffect(() => {
    setFavorited(false);
    const next: Record<string, string[]> = {};
    for (const group of groups) {
      const availableOpts = group.options.filter((o) => o.isAvailable !== false);
      const defaults = availableOpts.filter((o) => o.isDefault).map((o) => o.id);
      if (defaults.length) {
        next[group.id] = isSingleSelect(group) ? defaults.slice(0, 1) : defaults;
      } else if (group.required && availableOpts[0]) {
        next[group.id] = [availableOpts[0].id];
      } else {
        next[group.id] = [];
      }
    }
    setSelected(next);
  }, [itemId, groups]);

  const extraPrice = useMemo(
    () => selectedModifiers.reduce((sum, m) => sum + m.price, 0),
    [selectedModifiers]
  );

  const quantity = useCartStore((s) => {
    const line = s.items.find(
      (i) =>
        (i.menuItemId === displayItem?.id || i.id === displayItem?.id) &&
        sameModifiers(i.modifiers, selectedModifiers)
    );
    return line?.quantity || 0;
  });

  const available = displayItem?.isAvailable !== false;
  const watchingStock = (alerts.data ?? []).some(
    (a) =>
      a.itemId === itemId &&
      a.restaurantId === restaurantId &&
      a.active !== false
  );

  const toggleOption = (group: CustomizationGroup, optionId: string) => {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      if (isSingleSelect(group)) {
        return { ...prev, [group.id]: [optionId] };
      }
      const max = group.max ?? 99;
      if (current.includes(optionId)) {
        return {
          ...prev,
          [group.id]: current.filter((id) => id !== optionId),
        };
      }
      if (current.length >= max) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  };

  const handleAdd = () => {
    if (!displayItem || !available) return;
    const validationError = validateSelections(groups, selected);
    if (validationError) {
      Alert.alert('Choose options', validationError);
      return;
    }
    playHapticFeedback();

    const basePrice = displayItem.price ?? 0;
    if (quantity === 0) {
      addMenuItemToCart(
        displayItem,
        {
          id: restaurantId,
          name: restaurantName,
          imageUrl: restaurantImageUrl,
        },
        {
          basePrice,
          modifiers: selectedModifiers,
        }
      );
    } else {
      const line = useCartStore
        .getState()
        .items.find(
          (i) =>
            (i.menuItemId === displayItem.id || i.id === displayItem.id) &&
            sameModifiers(i.modifiers, selectedModifiers)
        );
      void incrementCartItem(line?.id || displayItem.id);
    }
  };

  const handleDecrement = () => {
    if (!displayItem) return;
    playHapticFeedback();
    const line = useCartStore
      .getState()
      .items.find(
        (i) =>
          (i.menuItemId === displayItem.id || i.id === displayItem.id) &&
          sameModifiers(i.modifiers, selectedModifiers)
      );
    void decrementCartItem(line?.id || displayItem.id);
  };

  if (!displayItem) return null;

  const unitPrice = (displayItem.price ?? 0) + extraPrice;
  const description =
    displayItem.description?.trim() ||
    (displayItem.allergens?.length
      ? `Allergens: ${displayItem.allergens.join(', ')}`
      : undefined);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheetContainer, { marginTop: insets.top + 120 }]}>
          <View style={styles.closeBtnWrap}>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <X color="#202020" size={20} strokeWidth={2.5} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            <View style={styles.heroWrap}>
              <Image
                source={{
                  uri: resolveMenuItemImage(
                    displayItem.name,
                    displayItem.imageUrl,
                  ),
                }}
                style={[styles.heroImg, !available && styles.heroDim]}
                contentFit="cover"
              />
              <View style={styles.heroActions}>
                <Pressable style={styles.iconCircle}>
                  <Share2 color="#E87431" size={18} strokeWidth={2.5} />
                </Pressable>
                <Pressable
                  style={styles.iconCircle}
                  onPress={() => setFavorited(!favorited)}
                >
                  <Heart
                    color="#E87431"
                    size={18}
                    strokeWidth={2.5}
                    fill={favorited ? '#E87431' : 'transparent'}
                  />
                </Pressable>
              </View>
              {detailQuery.isFetching || customizations.isFetching ? (
                <View style={styles.loadingBadge}>
                  <ActivityIndicator color="#E87431" size="small" />
                </View>
              ) : null}
              {!available ? (
                <View style={styles.soldOutBadge}>
                  <Text style={styles.soldOutText}>Currently unavailable</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.detailsBlock}>
              <View style={styles.titleRow}>
                <Text style={styles.title}>{displayItem.name}</Text>
                <VegBadge isVeg={displayItem.isVeg} />
              </View>

              {description ? (
                <Text style={styles.description}>{description}</Text>
              ) : null}

              {displayItem.isBestSeller ? (
                <Text style={styles.metaChip}>Bestseller</Text>
              ) : null}

              <Text style={styles.priceText}>₹{unitPrice}</Text>
            </View>

            {customizations.isError ? (
              <Text style={styles.customizationsError}>
                Couldn’t load options. Pull to close and try again.
              </Text>
            ) : null}

            {groups.map((group) => {
              const single = isSingleSelect(group);
              return (
              <View key={group.id} style={styles.optionsCard}>
                <Text style={styles.optionsTitle}>
                  {group.name}
                  {group.required ? ' *' : ''}
                </Text>
                <Text style={styles.optionsHint}>
                  {single
                    ? 'Select one'
                    : `Select up to ${group.max ?? 'any'}${
                        group.min ? ` · min ${group.min}` : ''
                      }`}
                </Text>
                {group.options.map((opt) => {
                  const on = (selected[group.id] ?? []).includes(opt.id);
                  const disabled = opt.isAvailable === false;
                  return (
                    <Pressable
                      key={opt.id}
                      style={[styles.optionRow, disabled && styles.optionDisabled]}
                      onPress={() => !disabled && toggleOption(group, opt.id)}
                      disabled={disabled}
                    >
                      <View style={styles.radioContainer}>
                        <View
                          style={[
                            single ? styles.radioOuter : styles.checkOuter,
                            on && (single ? styles.radioOuterSelected : styles.checkOuterSelected),
                          ]}
                        >
                          {on ? (
                            single ? (
                              <View style={styles.radioInner} />
                            ) : (
                              <Text style={styles.checkMark}>✓</Text>
                            )
                          ) : null}
                        </View>
                        <Text style={styles.optionName}>
                          {opt.name}
                          {disabled ? ' (86’d)' : ''}
                        </Text>
                      </View>
                      <Text style={styles.optionPrice}>
                        {opt.price > 0 ? `+₹${opt.price}` : 'Included'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              );
            })}
          </ScrollView>

          <View style={[styles.bottomBarWrap, { paddingBottom: 12 }]}>
            {!available ? (
              token ? (
                <Pressable
                  style={styles.notifyPill}
                  onPress={() => {
                    if (watchingStock) notifyStock.unsubscribe.mutate();
                    else notifyStock.subscribe.mutate();
                  }}
                  disabled={
                    notifyStock.subscribe.isPending ||
                    notifyStock.unsubscribe.isPending
                  }
                >
                  {watchingStock ? (
                    <BellOff color="#FFFFFF" size={18} />
                  ) : (
                    <Bell color="#FFFFFF" size={18} />
                  )}
                  <Text style={styles.addToCartText}>
                    {watchingStock
                      ? 'Stop back-in-stock alert'
                      : 'Notify me when back in stock'}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.notifyPillMuted}>
                  <Text style={styles.notifyMutedText}>
                    Sign in to get a back-in-stock alert
                  </Text>
                </View>
              )
            ) : quantity === 0 ? (
              <Pressable style={styles.addToCartPillCentered} onPress={handleAdd}>
                <Text style={styles.addToCartText}>Add to cart · ₹{unitPrice}</Text>
              </Pressable>
            ) : (
              <View style={styles.addToCartPill}>
                <View style={styles.stepperWrap}>
                  <Pressable
                    onPress={handleDecrement}
                    style={styles.stepperBtn}
                    hitSlop={10}
                  >
                    <Minus color="#202020" size={16} strokeWidth={2.5} />
                  </Pressable>
                  <Text style={styles.stepperVal}>{quantity}</Text>
                  <Pressable
                    onPress={handleAdd}
                    style={styles.stepperBtn}
                    hitSlop={10}
                  >
                    <Plus color="#202020" size={16} strokeWidth={2.5} />
                  </Pressable>
                </View>

                <Pressable
                  style={styles.viewCartRight}
                  onPress={() => {
                    onClose();
                    router.push('/cart');
                  }}
                >
                  <Text style={styles.addToCartText}>View Cart</Text>
                  <ChevronRight
                    color="#FFFFFF"
                    size={20}
                    style={{ marginLeft: 4 }}
                  />
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: '#EEEEEE',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    position: 'relative',
  },
  closeBtnWrap: {
    position: 'absolute',
    top: -64,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContent: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  heroWrap: {
    width: '100%',
    height: 260,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 20,
  },
  heroImg: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  heroPlaceholder: {
    backgroundColor: '#F1F5F9',
  },
  heroDim: {
    opacity: 0.55,
  },
  heroActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldOutBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15,23,42,0.78)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  soldOutText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  detailsBlock: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#202020',
    paddingRight: 16,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 16,
  },
  metaChip: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
    color: '#EA580C',
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  priceText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#202020',
  },
  optionsCard: {
    backgroundColor: '#E5E5E5',
    borderRadius: 24,
    padding: 20,
    marginBottom: 14,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202020',
    marginBottom: 4,
  },
  optionsHint: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 12,
  },
  customizationsError: {
    marginHorizontal: 4,
    marginBottom: 12,
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionDisabled: {
    opacity: 0.45,
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: '#E87431',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E87431',
  },
  checkOuter: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkOuterSelected: {
    borderColor: '#E87431',
    backgroundColor: '#E87431',
  },
  checkMark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 14,
  },
  optionName: {
    fontSize: 16,
    color: '#202020',
    fontWeight: '500',
    flex: 1,
  },
  optionPrice: {
    fontSize: 16,
    color: '#202020',
    fontWeight: '700',
  },
  bottomBarWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#EEEEEE',
  },
  addToCartPillCentered: {
    backgroundColor: '#E87431',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 30,
    paddingVertical: 18,
    shadowColor: '#E87431',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addToCartPill: {
    backgroundColor: '#E87431',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 30,
    paddingLeft: 8,
    paddingRight: 16,
    paddingVertical: 8,
    shadowColor: '#E87431',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  notifyPill: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 30,
    paddingVertical: 18,
  },
  notifyPillMuted: {
    backgroundColor: '#E5E7EB',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
  },
  notifyMutedText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  viewCartRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 10,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  stepperWrap: {
    backgroundColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 100,
  },
  stepperBtn: {
    padding: 2,
  },
  stepperVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202020',
  },
});
