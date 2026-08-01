import { Pressable } from '@/components/common/Pressable';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import { useRecommended } from '@/lib/customer/hooks';

export function CustomerRecommendations() {
  const router = useRouter();
  const { data: recommendations } = useRecommended();

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Sparkles color={authTheme.brand} size={16} />
        <Text style={styles.title}>Picked for you</Text>
      </View>
      
      <FlatList
        data={recommendations.slice(0, 5)}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable 
            style={styles.card}
            onPress={() => router.push(`/restaurants/${item.id}`)}
          >
            <Text style={styles.restaurantName}>{item.name}</Text>
            {item.cuisines && (
              <Text style={styles.cuisines}>{item.cuisines.join(', ')}</Text>
            )}
            {item.rating && (
              <Text style={styles.rating}>⭐ {item.rating}</Text>
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontFamily: fonts.displayBold,
    color: authTheme.text,
    letterSpacing: -0.3,
  },
  list: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 200,
    backgroundColor: authTheme.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
  },
  restaurantName: {
    fontSize: 14,
    fontFamily: fonts.uiBold,
    color: authTheme.text,
  },
  cuisines: {
    fontSize: 12,
    fontFamily: fonts.uiSemi,
    color: authTheme.textMuted,
    marginTop: 4,
  },
  rating: {
    fontSize: 12,
    fontFamily: fonts.uiBold,
    color: authTheme.brandDark,
    marginTop: 4,
  },
});