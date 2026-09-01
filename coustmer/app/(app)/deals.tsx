import { Pressable } from '@/components/common/Pressable';
import { Tag, Copy, Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View,  Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import {
  EmptyView,
  ErrorView,
  LoadingView,
} from '@/components/common/StateViews';
import { CustomerServiceStatus } from '@/components/customer/CustomerServiceStatus';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import { useDeals } from '@/lib/customer/hooks';

export default function DealsScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { data, isLoading, isError, error, refetch, isRefetching } = useDeals();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const promo = typeof code === 'string' ? code.trim() : '';
    if (!promo || isLoading) return;
    Alert.alert('Promo from banner', `Use code ${promo.toUpperCase()} at checkout`, [{ text: 'OK' }]);
  }, [code, isLoading]);

  const handleCopyCode = async (code: string, dealId: string) => {
    try {
      // Show alert with the code for easy copy
      setCopiedId(dealId);
      setTimeout(() => setCopiedId(null), 2000);
      Alert.alert('Promo Code Copied!', `Use code: ${code} at checkout`, [{ text: 'OK' }]);
    } catch {
      Alert.alert('Promo Code', code, [{ text: 'OK' }]);
    }
  };

  const activateDeals = data?.filter(deal => !deal.expired) ?? [];
  const expiredDeals = data?.filter(deal => deal.expired) ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <ScreenHeader title="Deals & Offers" subtitle="Save on your next order" />

        <CustomerServiceStatus />

        {isLoading ? (
          <LoadingView label="Fetching deals…" />
        ) : isError ? (
          <ErrorView
            message={error instanceof Error ? error.message : 'Failed to load'}
            onRetry={refetch}
          />
        ) : !data || data.length === 0 ? (
          <EmptyView
            icon={<Tag color={authTheme.textDim} size={40} />}
            title="No active deals"
            subtitle="Check back later for discounts and promo offers."
          />
        ) : (
          <FlatList
            data={data}
            keyExtractor={(item, index) => String(item.id ?? index)}
            showsVerticalScrollIndicator={false}
            onRefresh={refetch}
            refreshing={isRefetching}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              activateDeals.length > 0 ? (
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Active Deals</Text>
                  <Text style={styles.sectionSubtitle}>{activateDeals.length} offers available</Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable 
                style={[styles.dealCard, item.expired && styles.dealCardExpired]}
                onPress={() => {
                  if (item.code && !item.expired) {
                    handleCopyCode(item.code, item.id);
                  }
                }}
              >
                {item.imageUrl && (
                  <Image source={{ uri: item.imageUrl }} style={styles.dealImage} />
                )}
                <View style={styles.dealContent}>
                  <View style={styles.dealIcon}>
                    <Tag color={item.expired ? authTheme.textDim : authTheme.brand} size={20} />
                  </View>
                  <View style={styles.dealBody}>
                    <Text style={[styles.dealTitle, item.expired && styles.dealTitleExpired]}>
                      {item.title ?? 'Deal'}
                    </Text>
                    {item.description ? (
                      <Text style={[styles.dealDesc, item.expired && styles.dealDescExpired]}>
                        {item.description}
                      </Text>
                    ) : null}
                    {item.code ? (
                      <View style={[styles.codePill, item.expired && styles.codePillExpired]}>
                        <Text style={[styles.codeText, item.expired && styles.codeTextExpired]}>
                          {item.code}
                        </Text>
                      </View>
                    ) : null}
                    {item.validUntil && (
                      <Text style={[styles.validText, item.expired && styles.validTextExpired]}>
                        Valid until {new Date(item.validUntil).toLocaleDateString()}
                      </Text>
                    )}
                  </View>
                </View>
                {item.expired && (
                  <View style={styles.expiredBadge}>
                    <Text style={styles.expiredText}>Expired</Text>
                  </View>
                )}
                {!item.expired && item.code && (
                  <View style={styles.claimBtnWrap}>
                    <View style={[styles.claimBtn, copiedId === item.id && styles.claimBtnDone]}>
                      {copiedId === item.id ? (
                        <Check color="#FFFFFF" size={14} />
                      ) : (
                        <Copy color="#FFFFFF" size={14} />
                      )}
                      <Text style={styles.claimBtnText}>
                        {copiedId === item.id ? 'Copied!' : 'Claim'}
                      </Text>
                    </View>
                  </View>
                )}
              </Pressable>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: authTheme.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  list: {
    paddingBottom: 24,
    gap: 12,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: authTheme.text,
  },
  sectionSubtitle: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: authTheme.textMuted,
    marginTop: 2,
  },
  dealCard: {
    backgroundColor: authTheme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    overflow: 'hidden',
    position: 'relative',
  },
  dealCardExpired: {
    opacity: 0.6,
  },
  dealImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  dealContent: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  dealIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: authTheme.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dealBody: {
    flex: 1,
  },
  dealTitle: {
    color: authTheme.text,
    fontSize: 16,
    fontFamily: fonts.displayBold,
  },
  dealTitleExpired: {
    color: authTheme.textMuted,
  },
  dealDesc: {
    color: authTheme.textMuted,
    fontSize: 13,
    fontFamily: fonts.ui,
    marginTop: 4,
    lineHeight: 19,
  },
  dealDescExpired: {
    color: authTheme.textDim,
  },
  codePill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: authTheme.brand,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  codePillExpired: {
    borderColor: authTheme.textDim,
  },
  codeText: {
    color: authTheme.brand,
    fontFamily: fonts.displayBold,
    fontSize: 13,
    letterSpacing: 1,
  },
  codeTextExpired: {
    color: authTheme.textDim,
  },
  validText: {
    color: authTheme.textMuted,
    fontSize: 11,
    fontFamily: fonts.ui,
    marginTop: 6,
  },
  validTextExpired: {
    color: authTheme.textDim,
  },
  expiredBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: authTheme.error,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expiredText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: fonts.uiBold,
    letterSpacing: 0.5,
  },
  claimBtnWrap: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  claimBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: authTheme.brand,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  claimBtnDone: {
    backgroundColor: '#059669',
  },
  claimBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: fonts.uiBold,
  },
});
