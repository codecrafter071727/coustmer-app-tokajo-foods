import { Pressable } from '@/components/common/Pressable';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Clock, MessageSquare, Gift } from 'lucide-react-native';
import { authTheme } from '@/constants/auth-theme';
import { 
  useCustomerProfile, 
  useFavorites, 
  useDeals 
} from '@/lib/customer/hooks';
import { useTickets } from '@/lib/support/support-hooks';

export function CustomerDashboard() {
  const router = useRouter();
  const profile = useCustomerProfile();
  const favorites = useFavorites();
  const tickets = useTickets();
  const deals = useDeals();

  const stats = [
    {
      id: 'favorites',
      title: 'Favorites',
      value: favorites.data?.length ?? 0,
      icon: Heart,
      onPress: () => router.push('/favorites'),
    },
    {
      id: 'support',
      title: 'Support',
      value: tickets.data?.tickets?.filter(t => t.status === 'open').length ?? 0,
      icon: MessageSquare,
      onPress: () => router.push('/support'),
    },
    {
      id: 'deals',
      title: 'Deals',
      value: deals.data?.length ?? 0,
      icon: Gift,
      onPress: () => router.push('/deals'),
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Pressable key={stat.id} style={styles.card} onPress={stat.onPress}>
              <Icon color={authTheme.brand} size={18} />
              <Text style={styles.value}>{stat.value}</Text>
              <Text style={styles.title}>{stat.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: authTheme.card,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: authTheme.text,
  },
  title: {
    fontSize: 11,
    color: authTheme.textMuted,
  },
});