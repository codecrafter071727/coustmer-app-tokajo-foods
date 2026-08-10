import { Pressable } from '@/components/common/Pressable';
import { useRouter } from 'expo-router';
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator,
  Alert,
  FlatList,
  
  RefreshControl,
  StyleSheet,
  Text,
  View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { ScreenHeader } from '@/components/common/ScreenHeader';
import {
  ErrorView,
  LoadingView,
} from '@/components/common/StateViews';
import { NotificationRow } from '@/components/notification/NotificationRow';
import { authTheme } from '@/constants/auth-theme';
import { getApiErrorMessage } from '@/lib/errors';
import {
  useClearAllNotifications,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/lib/notification/hooks';
import type { AppNotification } from '@/lib/notification/types';
import { restaurantApi } from '@/lib/restaurant/api';
import {
  restaurantKeys,
  useKitchenAlerts,
} from '@/lib/restaurant/hooks';
import type { KitchenAlert } from '@/lib/restaurant/types';
import { useAuthStore } from '@/store/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type Filter = 'all' | 'unread';

function openNotificationDeepLink(
  router: ReturnType<typeof useRouter>,
  item: AppNotification
) {
  const data = item.data ?? {};
  const orderId = String(
    data.orderId ?? data.order_id ?? data.order ?? ''
  ).trim();
  const restaurantId = String(
    data.restaurantId ?? data.restaurant_id ?? data.restaurant ?? ''
  ).trim();
  const paymentId = String(
    data.paymentId ?? data.payment_id ?? data.payment ?? ''
  ).trim();

  if (orderId) {
    router.push({
      pathname: '/orders/[orderId]',
      params: { orderId },
    } as never);
    return;
  }
  if (restaurantId) {
    router.push({
      pathname: '/restaurants/[restaurantId]',
      params: { restaurantId },
    } as never);
    return;
  }
  if (paymentId) {
    router.push({
      pathname: '/payments/[paymentId]',
      params: { paymentId },
    } as never);
    return;
  }
}

export function NotificationsHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<Filter>('all');
  const token = useAuthStore((s) => s.token);
  const authed = Boolean(token);
  const queryClient = useQueryClient();
  const kitchenAlerts = useKitchenAlerts({ enabled: authed });
  const activeAlerts = (kitchenAlerts.data ?? []).filter(
    (a) => a.active !== false
  );
  const unsubscribeAlert = useMutation({
    mutationFn: async (alert: KitchenAlert) => {
      if (!alert.restaurantId) return;
      if (alert.itemId) {
        await restaurantApi.unsubscribeNotifyStock(
          alert.restaurantId,
          alert.itemId
        );
        return;
      }
      await restaurantApi.unsubscribeNotifyOpen(alert.restaurantId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: restaurantKeys.alerts() });
      queryClient.invalidateQueries({ queryKey: ['customer', 'alerts'] });
    },
  });

  const listQuery = useNotifications(
    {
      page: 1,
      limit: 50,
      unread: filter === 'unread' ? true : undefined,
    },
    { refetchInterval: 20_000, enabled: authed }
  );
  const unreadCount = useUnreadNotificationCount({
    refetchInterval: 12_000,
    enabled: authed,
  });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteOne = useDeleteNotification();
  const clearAll = useClearAllNotifications();

  const notifications = listQuery.data?.notifications ?? [];
  const count = unreadCount.data ?? 0;

  const subtitle = useMemo(() => {
    if (count > 0) return `${count} unread`;
    if (notifications.length > 0) return 'You are all caught up';
    return 'Order updates & offers';
  }, [count, notifications.length]);

  const onOpen = (item: AppNotification) => {
    if (!item.isRead) {
      markRead.mutate(item.id);
    }
    openNotificationDeepLink(router, item);
  };

  const onDelete = (item: AppNotification) => {
    Alert.alert('Delete notification?', item.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteOne.mutate(item.id),
      },
    ]);
  };

  const onMarkAll = () => {
    if (count <= 0) return;
    markAllRead.mutate();
  };

  const onClearAll = () => {
    if (notifications.length === 0) return;
    Alert.alert(
      'Clear all notifications?',
      'This permanently removes every notification from your inbox.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: () => clearAll.mutate(),
        },
      ]
    );
  };

  return (
    <View
      style={[styles.safe, { paddingTop: Math.max(insets.top, 32) }]}
    >
      <View style={styles.container}>
        <ScreenHeader
          title="Notifications"
          subtitle={subtitle}
          right={
            <View style={styles.headerActions}>
              <Pressable
                style={styles.headerBtn}
                onPress={onMarkAll}
                disabled={count <= 0 || markAllRead.isPending}
                hitSlop={6}
                accessibilityLabel="Mark all as read"
              >
                {markAllRead.isPending ? (
                  <ActivityIndicator color={authTheme.brand} size="small" />
                ) : (
                  <CheckCheck
                    color={count > 0 ? authTheme.brand : authTheme.textDim}
                    size={18}
                  />
                )}
              </Pressable>
              <Pressable
                style={styles.headerBtn}
                onPress={onClearAll}
                disabled={notifications.length === 0 || clearAll.isPending}
                hitSlop={6}
                accessibilityLabel="Clear all notifications"
              >
                {clearAll.isPending ? (
                  <ActivityIndicator color={authTheme.brand} size="small" />
                ) : (
                  <Trash2
                    color={
                      notifications.length > 0
                        ? authTheme.brand
                        : authTheme.textDim
                    }
                    size={18}
                  />
                )}
              </Pressable>
            </View>
          }
        />

        <View style={styles.segmentedControl}>
          <Pressable
            style={[styles.segmentBtn, filter === 'all' && styles.segmentBtnActive]}
            onPress={() => setFilter('all')}
          >
            <Text
              style={[
                styles.segmentText,
                filter === 'all' && styles.segmentTextActive,
              ]}
            >
              All
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segmentBtn, filter === 'unread' && styles.segmentBtnActive]}
            onPress={() => setFilter('unread')}
          >
            <Text
              style={[
                styles.segmentText,
                filter === 'unread' && styles.segmentTextActive,
              ]}
            >
              Unread{count > 0 ? ` (${count})` : ''}
            </Text>
          </Pressable>
        </View>

        {activeAlerts.length > 0 ? (
          <View style={styles.alertsBlock}>
            <Text style={styles.alertsTitle}>Kitchen & stock alerts</Text>
            {activeAlerts.map((alert) => (
              <View key={alert.id} style={styles.alertRow}>
                <UtensilsCrossed color={authTheme.brand} size={16} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertName} numberOfLines={1}>
                    {alert.itemName
                      ? `${alert.itemName}`
                      : alert.restaurantName || 'Kitchen open alert'}
                  </Text>
                  <Text style={styles.alertMeta} numberOfLines={1}>
                    {alert.itemId
                      ? `Back in stock · ${alert.restaurantName || 'Restaurant'}`
                      : 'Notify when kitchen opens'}
                    {alert.pushed === false ? ' · waiting to send' : ''}
                  </Text>
                </View>
                <Pressable
                  onPress={() => unsubscribeAlert.mutate(alert)}
                  disabled={unsubscribeAlert.isPending}
                  hitSlop={8}
                >
                  <Text style={styles.alertStop}>Stop</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {listQuery.isLoading ? (
          <LoadingView label="Loading notifications…" />
        ) : listQuery.isError ? (
          <ErrorView
            message={getApiErrorMessage(listQuery.error)}
            onRetry={() => listQuery.refetch()}
          />
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              {filter === 'unread' ? (
                <BellOff color={authTheme.brand} size={32} strokeWidth={2} />
              ) : (
                <Bell color={authTheme.brand} size={32} strokeWidth={2} />
              )}
            </View>
            <Text style={styles.emptyTitle}>
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'unread'
                ? 'You are all caught up! New order updates will show here.'
                : 'Order status, exclusive offers, and account alerts will appear here.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={listQuery.isRefetching}
                onRefresh={() => {
                  listQuery.refetch();
                  unreadCount.refetch();
                  kitchenAlerts.refetch();
                }}
                tintColor={authTheme.brand}
              />
            }
            renderItem={({ item }) => (
              <NotificationRow
                notification={item}
                onPress={() => onOpen(item)}
                onDelete={() => onDelete(item)}
              />
            )}
            ListFooterComponent={
              <Text style={styles.hint}>Long-press a notification to delete</Text>
            }
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#EDF1F5',
    padding: 4,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 24,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentTextActive: {
    color: '#202020',
    fontWeight: '700',
  },
  list: {
    paddingBottom: 40,
  },
  hint: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    marginTop: 40,
  },
  emptyIconWrap: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202020',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  alertsBlock: {
    marginBottom: 16,
    gap: 8,
  },
  alertsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  alertName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  alertMeta: {
    fontSize: 11,
    color: '#9A3412',
    marginTop: 2,
  },
  alertStop: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C2410C',
  },
});
