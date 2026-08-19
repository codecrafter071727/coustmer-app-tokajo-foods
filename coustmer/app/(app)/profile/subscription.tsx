import { useRouter } from 'expo-router';
import { ChevronLeft, Crown, Check } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import {
  useCancelSubscription,
  useMySubscription,
  useSubscriptionPlans,
} from '@/lib/customer/hooks';
import type { SubscriptionPlan } from '@/lib/customer/types';

export default function SubscriptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: plans, isLoading: plansLoading } = useSubscriptionPlans();
  const { data: myPlan, isLoading: myLoading } = useMySubscription();
  const cancel = useCancelSubscription();

  const handleCancel = () => {
    Alert.alert(
      'Cancel subscription?',
      'You will retain benefits until the current period ends.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () =>
            cancel.mutate(undefined, {
              onSuccess: () => Alert.alert('Done', 'Subscription cancelled at period end.'),
              onError: () => Alert.alert('Error', 'Could not cancel. Try again.'),
            }),
        },
      ]
    );
  };

  function renderPlan({ item }: { item: SubscriptionPlan }) {
    const isActive = myPlan?.planId === item.id;
    return (
      <View style={[styles.planCard, item.isPopular && styles.planCardPopular]}>
        {item.isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>POPULAR</Text>
          </View>
        )}
        <Text style={styles.planName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.planDesc}>{item.description}</Text>
        )}
        <Text style={styles.planPrice}>
          ₹{item.price}
          {item.durationDays ? (
            <Text style={styles.planDuration}> / {item.durationDays} days</Text>
          ) : null}
        </Text>
        {(item.benefits ?? []).length > 0 && (
          <View style={styles.benefits}>
            {item.benefits!.map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <Check size={14} color="#16A34A" strokeWidth={2.5} />
                <Text style={styles.benefitText}>{b}</Text>
              </View>
            ))}
          </View>
        )}
        {isActive ? (
          <View style={styles.activeLabel}>
            <Text style={styles.activeLabelText}>Active</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.subscribeBtn} activeOpacity={0.85}>
            <Text style={styles.subscribeBtnText}>Subscribe</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const loading = plansLoading || myLoading;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.2} />
        </TouchableOpacity>
        <Crown size={28} color="#FDE68A" strokeWidth={1.5} />
        <Text style={styles.headerTitle}>Super Membership</Text>
        {myPlan && !myPlan.cancelAtPeriodEnd && (
          <Text style={styles.headerSub}>
            {myPlan.planName} · ends {myPlan.endDate?.slice(0, 10) ?? '—'}
          </Text>
        )}
      </LinearGradient>

      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={authTheme.brand} />
        </View>
      )}

      {!loading && (
        <FlatList
          data={plans ?? []}
          keyExtractor={(p) => p.id}
          renderItem={renderPlan}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No subscription plans available.</Text>
          }
          ListFooterComponent={
            myPlan && !myPlan.cancelAtPeriodEnd ? (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancel}
                disabled={cancel.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>
                  {cancel.isPending ? 'Cancelling…' : 'Cancel subscription'}
                </Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 6,
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    top: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  headerSub: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  list: { padding: 16, paddingBottom: 40 },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
  },
  planCardPopular: {
    borderColor: '#7C3AED',
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#7C3AED',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  popularText: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  planName: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: '#0B1220',
    marginBottom: 4,
  },
  planDesc: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 18,
  },
  planPrice: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: '#111827',
    marginBottom: 12,
  },
  planDuration: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#6B7280',
  },
  benefits: { gap: 6, marginBottom: 16 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitText: { fontFamily: fonts.ui, fontSize: 13, color: '#374151', lineHeight: 18, flex: 1 },
  activeLabel: {
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLabelText: { fontFamily: fonts.uiBold, fontSize: 14, color: '#16A34A' },
  subscribeBtn: {
    height: 42,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeBtnText: { fontFamily: fonts.uiBold, fontSize: 15, color: '#FFFFFF' },
  cancelBtn: {
    marginTop: 8,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontFamily: fonts.uiBold, fontSize: 13, color: '#DC2626' },
  emptyText: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingTop: 40,
  },
});
