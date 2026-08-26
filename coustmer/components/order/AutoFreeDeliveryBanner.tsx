import { Bike } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { fonts } from '@/constants/typography';
import type { BillBreakdown } from '@/lib/cart/bill';

const GREEN = '#16A34A';
const GREEN_BG = '#F0FDF4';
const GREEN_BORDER = '#BBF7D0';
const ORANGE = '#F97316';
const ORANGE_BG = '#FFF7ED';
const ORANGE_BORDER = '#FED7AA';
const TEXT = '#0B1220';
const TEXT_SEC = '#64748B';

type Props = {
  bill: BillBreakdown;
  deliveryType: 'delivery' | 'takeaway';
};

export function AutoFreeDeliveryBanner({ bill, deliveryType }: Props) {
  if (deliveryType === 'takeaway') return null;
  if (bill.superFreeDelivery) return null;

  if (bill.autoFreeDelivery) {
    const title =
      bill.autoFreeDeliveryTitle?.trim() ||
      (bill.autoFreeDeliveryMinOrder != null && bill.autoFreeDeliveryMinOrder > 0
        ? `Free delivery on orders above ₹${Math.round(bill.autoFreeDeliveryMinOrder)}`
        : 'Free delivery unlocked');

    return (
      <View style={[styles.banner, styles.bannerApplied]}>
        <View style={styles.iconWrapApplied}>
          <Bike color={GREEN} size={18} strokeWidth={2.3} />
        </View>
        <View style={styles.body}>
          <Text style={styles.titleApplied}>{title}</Text>
          <Text style={styles.subApplied}>Delivery fee waived on this order</Text>
        </View>
      </View>
    );
  }

  const minOrder =
    bill.autoFreeDeliveryUpsellMinOrder ?? bill.autoFreeDeliveryMinOrder;
  if (minOrder == null || minOrder <= 0) return null;

  const amountNeeded = bill.autoFreeDeliveryAmountNeeded;
  const headline =
    amountNeeded != null && amountNeeded > 0
      ? `Add ₹${Math.ceil(amountNeeded)} more for free delivery`
      : `Free delivery on orders above ₹${Math.round(minOrder)}`;

  const subline =
    amountNeeded != null && amountNeeded > 0
      ? `Free delivery when item total reaches ₹${Math.round(minOrder)}`
      : 'Add more items to unlock free delivery';

  return (
    <View style={[styles.banner, styles.bannerUpsell]}>
      <View style={styles.iconWrapUpsell}>
        <Bike color={ORANGE} size={18} strokeWidth={2.3} />
      </View>
      <View style={styles.body}>
        <Text style={styles.titleUpsell}>{headline}</Text>
        <Text style={styles.subUpsell}>{subline}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  bannerApplied: {
    backgroundColor: GREEN_BG,
    borderColor: GREEN_BORDER,
  },
  bannerUpsell: {
    backgroundColor: ORANGE_BG,
    borderColor: ORANGE_BORDER,
  },
  iconWrapApplied: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUpsell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleApplied: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: GREEN,
  },
  subApplied: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: TEXT_SEC,
  },
  titleUpsell: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: TEXT,
  },
  subUpsell: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: TEXT_SEC,
  },
});
