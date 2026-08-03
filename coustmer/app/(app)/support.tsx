import { Pressable } from '@/components/common/Pressable';
import { useRouter } from 'expo-router';
import { ArrowLeft, ChevronRight, CheckCircle2, RotateCcw } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useOrders } from '@/lib/order/hooks';
import { usePaymentHistory } from '@/lib/payment/hooks';
import { authTheme } from '@/constants/auth-theme';

export default function SupportHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: ordersData } = useOrders({ page: 1, limit: 1 });
  const recentOrder = ordersData?.orders?.[0];
  const history = usePaymentHistory({ limit: 50 });

  const activeRefundLike = useMemo(() => {
    const payments = history.data?.payments ?? [];
    return payments.filter((p) => {
      const s = String(p.status ?? '').toLowerCase();
      return s.includes('refund');
    }).length;
  }, [history.data?.payments]);

  const openRefunds = () => {
    if (recentOrder?.id) {
      router.push({
        pathname: '/orders/[orderId]/refunds',
        params: { orderId: recentOrder.id },
      });
      return;
    }
    router.push('/payments' as import('expo-router').Href);
  };

  const queries = [
    { title: 'Swiggy One FAQs', route: '/support/faq-one' },
    { title: 'General issues', route: '/support/faq-general' },
    { title: 'Partner Onboarding', route: '/support/partner-onboarding' },
    { title: 'Report Safety Emergency', route: '/support/safety' },
    { title: 'Instamart Onboarding', route: '/support/instamart-onboarding' },
    { title: 'Legal, Terms & Conditions', route: '/support/legal' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.headerSafe, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <ArrowLeft color="#1C1C1C" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Help & Support</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.refundsCard}>
          <View style={styles.refundsTextWrap}>
            <Text style={styles.refundsTitle}>
              You have {activeRefundLike} active refund
              {activeRefundLike === 1 ? '' : 's'}
            </Text>
            <Pressable onPress={openRefunds}>
              <Text style={styles.viewRefundsText}>VIEW MY REFUNDS {'>'}</Text>
            </Pressable>
          </View>
          <View style={styles.refundIconWrap}>
            <RotateCcw color={authTheme.textMuted} size={24} />
          </View>
        </View>

        {recentOrder && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECENT ORDER</Text>
            <Pressable
              style={styles.orderCard}
              onPress={() =>
                router.push({
                  pathname: '/support/new',
                  params: { orderId: recentOrder.id },
                })
              }
            >
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.restaurantName}>{recentOrder.restaurantName}</Text>
                  <Text style={styles.orderMeta}>
                    {recentOrder.deliveryAddress?.label || 'Home'} | ₹
                    {recentOrder.total || 0}
                  </Text>
                </View>
                {recentOrder.status === 'delivered' && (
                  <View style={styles.statusWrap}>
                    <Text style={styles.statusText}>Delivered</Text>
                    <CheckCircle2 color="#16A34A" size={14} />
                  </View>
                )}
              </View>

              <View style={styles.divider} />

              <View style={styles.orderBottom}>
                <Text style={styles.itemsText} numberOfLines={1}>
                  {recentOrder.items.map((i) => `${i.name} x${i.quantity}`).join(', ')}
                </Text>
                <ChevronRight color="#9CA3AF" size={18} />
              </View>
            </Pressable>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QUICK QUERIES</Text>
          {queries.map((q) => (
            <Pressable
              key={q.title}
              style={styles.queryRow}
              onPress={() => router.push(q.route as import('expo-router').Href)}
            >
              <Text style={styles.queryText}>{q.title}</Text>
              <ChevronRight color="#9CA3AF" size={18} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerSafe: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  refundsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refundsTextWrap: {
    flex: 1,
    gap: 6,
  },
  refundsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  viewRefundsText: {
    fontSize: 12,
    fontWeight: '700',
    color: authTheme.brand,
    letterSpacing: 0.3,
  },
  refundIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.6,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  orderMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  statusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  orderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemsText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
  },
  queryRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queryText: {
    flex: 1,
    fontSize: 14,
    color: '#1C1C1C',
    fontWeight: '500',
  },
});
