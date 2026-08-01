import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Clock, Star } from 'lucide-react-native';

import { fonts } from '@/constants/typography';

const ORDER_AGAIN_ITEMS = [
  {
    id: '1',
    restaurantName: 'Burger King',
    category: 'Fast Food Category',
    time: '45-60 mins',
    rating: '4.5',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop', // Burger
  },
  {
    id: '2',
    restaurantName: 'McDonalds',
    category: 'Fast Food Category',
    time: '25-30 mins',
    rating: '4.8',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&h=400&fit=crop', // Pizza
  },
  {
    id: '3',
    restaurantName: 'Spice Kitchen',
    category: 'Indian Cuisine',
    time: '35-45 mins',
    rating: '4.6',
    image: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&h=400&fit=crop',
  },
  {
    id: '4',
    restaurantName: 'Green Bowl',
    category: 'Healthy',
    time: '15-25 mins',
    rating: '4.9',
    image: 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=600&h=400&fit=crop',
  },
];

export function OrderAgainSection() {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Order again</Text>
        <Text style={styles.viewAll}>View all</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {ORDER_AGAIN_ITEMS.map((order) => (
          <View key={order.id} style={styles.card}>
            {/* Image Container */}
            <View style={styles.imageWrap}>
              <Image source={{ uri: order.image }} style={styles.image} contentFit="cover" />
            </View>

            {/* Details */}
            <View style={styles.details}>
              <Text style={styles.category}>🍗 {order.category}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {order.restaurantName}
              </Text>
              <View style={styles.timeRow}>
                <Clock color="#64748B" size={12} strokeWidth={2.5} />
                <Text style={styles.time}>{order.time}</Text>
              </View>
            </View>

            {/* Rating Badge */}
            <View style={styles.ratingBadge}>
              <Star color="#FACC15" fill="#FACC15" size={10} strokeWidth={0} />
              <Text style={styles.ratingText}>{order.rating}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: '#0B1220',
    letterSpacing: -0.3,
  },
  viewAll: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: '#EA580C',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    paddingRight: 24, 
    width: 270,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  imageWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  details: {
    marginLeft: 12,
    flex: 1,
    gap: 2,
  },
  category: {
    fontFamily: fonts.uiSemi,
    fontSize: 11,
    color: '#475569',
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: '#0B1220',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  time: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#475569',
  },
  ratingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 2,
  },
  ratingText: {
    color: '#FFFFFF',
    fontFamily: fonts.uiBold,
    fontSize: 10,
  },
});
