import { Pressable } from '@/components/common/Pressable';
import { useRouter } from 'expo-router';
import { ChevronLeft, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EmptyView,
  ErrorView,
  LoadingView,
} from '@/components/common/StateViews';
import { SmoothPressable } from '@/components/common/SmoothPressable';
import { OrderCard } from '@/components/order/OrderCard';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import {
  useActiveOrders,
  useOrders,
  useScheduledOrders,
} from '@/lib/order/hooks';
import type { Order } from '@/lib/order/types';

const PAGE_BG = '#FFFFFF';
const TEXT_DARK = '#202020';
const BANNER_BG = '#F9F1EB';
const BANNER_ICON_BG = '#F3744B';

type Tab = 'all' | 'active' | 'scheduled';

export function OrdersHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bannerVisible, setBannerVisible] = useState(true);
  const [tab, setTab] = useState<Tab>('all');

  const all = useOrders({ limit: 50 });
  const active = useActiveOrders({ refetchInterval: 15_000 });
  const scheduled = useScheduledOrders();

  const orders: Order[] = useMemo(() => {
    if (tab === 'active') return active.data ?? [];
    if (tab === 'scheduled') return scheduled.data ?? [];
    return all.data?.orders ?? [];
  }, [tab, all.data?.orders, active.data, scheduled.data]);

  const isLoading =
    tab === 'all'
      ? all.isLoading
      : tab === 'active'
        ? active.isLoading
        : scheduled.isLoading;
  const isError =
    tab === 'all'
      ? all.isError
      : tab === 'active'
        ? active.isError
        : scheduled.isError;
  const error =
    tab === 'all'
      ? all.error
      : tab === 'active'
        ? active.error
        : scheduled.error;
  const refreshing =
    all.isRefetching || active.isRefetching || scheduled.isRefetching;

  const refetch = () => {
    void all.refetch();
    void active.refetch();
    void scheduled.refetch();
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <SmoothPressable
          onPress={goBack}
          style={styles.backBtn}
          pressScale={0.9}
          hitSlop={8}
        >
          <ChevronLeft color={TEXT_DARK} size={24} strokeWidth={2.5} />
        </SmoothPressable>
        <Text style={styles.title}>Your orders</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.tabs}>
        {(
          [
            { key: 'all', label: 'All' },
            { key: 'active', label: 'Active' },
            { key: 'scheduled', label: 'Scheduled' },
          ] as const
        ).map((item) => {
          const on = tab === item.key;
          return (
            <Pressable
              key={item.key}
              style={[styles.tab, on && styles.tabOn]}
              onPress={() => setTab(item.key)}
            >
              <Text style={[styles.tabText, on && styles.tabTextOn]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <LoadingView label="Loading orders…" />
      ) : isError ? (
        <ErrorView
          message={
            error instanceof Error ? error.message : 'Failed to load orders'
          }
          onRetry={refetch}
        />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refetch}
              tintColor={authTheme.brand}
            />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {bannerVisible && tab === 'all' ? (
                <View style={styles.banner}>
                  <View style={styles.bannerContent}>
                    <View style={styles.bannerGridMock}>
                      <View style={styles.gridRow}>
                        <View style={styles.gridCellActive} />
                        <View style={styles.gridCell} />
                        <View style={styles.gridCell} />
                      </View>
                      <View style={styles.gridRow}>
                        <View style={styles.gridCell} />
                        <View style={styles.gridCell} />
                        <View style={styles.gridCell} />
                      </View>
                    </View>
                    <Text style={styles.bannerText}>See how it works</Text>
                  </View>
                  <Pressable
                    hitSlop={10}
                    onPress={() => setBannerVisible(false)}
                    style={styles.bannerClose}
                  >
                    <X color="#303030" size={16} strokeWidth={2} />
                  </Pressable>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <EmptyView
              title={
                tab === 'active'
                  ? 'No active orders'
                  : tab === 'scheduled'
                    ? 'No scheduled orders'
                    : 'No orders yet'
              }
              subtitle={
                tab === 'all'
                  ? 'Place an order to see it here.'
                  : 'Pull to refresh.'
              }
            />
          }
          renderItem={({ item }) => <OrderCard order={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: PAGE_BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 44,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: TEXT_DARK,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  tabOn: {
    backgroundColor: '#FFF1E8',
  },
  tabText: {
    fontFamily: fonts.uiMedium,
    fontSize: 13,
    color: '#6B7280',
  },
  tabTextOn: {
    fontFamily: fonts.uiBold,
    color: BANNER_ICON_BG,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  listHeader: {
    paddingBottom: 16,
  },
  banner: {
    backgroundColor: BANNER_BG,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    position: 'relative',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bannerGridMock: {
    backgroundColor: '#FFFFFF',
    padding: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderTopWidth: 6,
    gap: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 4,
  },
  gridCellActive: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: BANNER_ICON_BG,
  },
  gridCell: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  bannerText: {
    fontFamily: fonts.displaySemi,
    fontSize: 14,
    color: TEXT_DARK,
    textDecorationLine: 'underline',
  },
  bannerClose: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
});
