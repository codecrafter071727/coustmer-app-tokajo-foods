import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Clock, Star, RotateCcw } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { fonts } from '@/constants/typography';
import { useRecentOrders } from '@/lib/order/hooks';

export function OrderAgainSection() {
  const router = useRouter();
  const { data: orders } = useRecentOrders();

  if (!orders || orders.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <RotateCcw color="#EA580C" size={18} strokeWidth={2.5} />
          <Text style={styles.title}>Order again</Text>
        </View>
        <Pressable onPress={() => router.push('/orders')}>
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {orders.map((order) => (
          <Pressable
            key={order.id}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/restaurants/[restaurantId]',
                params: { restaurantId: order.restaurantId },
              })
            }
          >
            <View style={styles.imageWrap}>
              {order.restaurantImage ? (
                <Image source={{ uri: order.restaurantImage }} style={styles.image} contentFit="cover" />
              ) : (
                <View style={styles.imageFallback}>
                  <Text style={styles.imageFallbackText}>
                    {order.restaurantName?.charAt(0) || '?'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.details}>
              <Text style={styles.name} numberOfLines={1}>
                {order.restaurantName}
              </Text>
              <Text style={styles.itemsText} numberOfLines={1}>
                {order.itemsSummary}
              </Text>
              <View style={styles.metaRow}>
                <Clock color="#64748B" size={11} strokeWidth={2.5} />
                <Text style={styles.metaText}>{order.deliveryTime || '30-40 min'}</Text>
                {order.rating ? (
                  <>
                    <Star color="#FACC15" fill="#FACC15" size={11} strokeWidth={0} />
                    <Text style={styles.metaText}>{order.rating}</Text>
                  </>
                ) : null}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: '#111827',
    letterSpacing: -0.5,
  },
  viewAll: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: '#EA580C',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    width: 260,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  imageWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  imageFallbackText: {
    color: '#FFFFFF',
    fontFamily: fonts.displayBold,
    fontSize: 22,
  },
  details: {
    marginLeft: 12,
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: '#0B1220',
  },
  itemsText: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: '#64748B',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: '#475569',
  },
});
