import { Pressable } from '@/components/common/Pressable';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ExternalLink, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator,
  Alert,
  Linking,
  
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/common/ScreenHeader';
import { ErrorView, LoadingView } from '@/components/common/StateViews';
import { authTheme } from '@/constants/auth-theme';
import { usePayment, useVerifyPayment } from '@/lib/payment/hooks';
import {
  PAYMENT_STATUS_LABELS,
  isPaymentSuccess,
} from '@/lib/payment/types';

export function PaymentDetailScreen() {
  const router = useRouter();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const id = String(paymentId ?? '');

  const payment = usePayment(id);
  const verify = useVerifyPayment();

  const [txnId, setTxnId] = useState('');
  const [signature, setSignature] = useState('');
  const [banner, setBanner] = useState<string | null>(null);

  const data = payment.data;

  const handleVerify = async () => {
    if (!data) return;
    try {
      const result = await verify.mutateAsync({
        paymentId: data.id,
        orderId: data.orderId,
        gatewayPaymentId: txnId || data.gatewayPaymentId,
        gatewayOrderId: data.gatewayOrderId ?? data.razorpayOrderId,
        gatewaySignature: signature || undefined,
        transactionId: txnId || data.gatewayPaymentId,
        signature: signature || undefined,
        razorpay_payment_id: txnId || data.gatewayPaymentId,
        razorpay_order_id: data.razorpayOrderId ?? data.gatewayOrderId,
        razorpay_signature: signature || undefined,
        status: 'success',
      });
      setBanner(
        isPaymentSuccess(result.status)
          ? 'Payment verified successfully'
          : `Status: ${result.status}`
      );
      payment.refetch();
    } catch (e) {
      Alert.alert(
        'Verify failed',
        e instanceof Error ? e.message : 'Could not verify payment'
      );
    }
  };

  if (payment.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LoadingView label="Loading payment…" />
      </SafeAreaView>
    );
  }

  if (payment.isError || !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.pad}>
          <ScreenHeader title="Payment" />
        </View>
        <ErrorView
          message={
            payment.error instanceof Error
              ? payment.error.message
              : 'Payment not found'
          }
          onRetry={payment.refetch}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.pad}>
        <ScreenHeader
          title="Payment details"
          subtitle={`#${data.id.slice(-8)}`}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={payment.isRefetching}
            onRefresh={payment.refetch}
            tintColor={authTheme.brand}
          />
        }
      >
        {banner ? <Text style={styles.banner}>{banner}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.label}>Amount</Text>
          <Text style={styles.amount}>
            ₹{data.amount.toFixed(0)} {data.currency}
          </Text>
          <Text style={styles.status}>
            {PAYMENT_STATUS_LABELS[data.status] ?? data.status}
          </Text>
        </View>

        <View style={styles.card}>
          <Row label="Method" value={data.method?.toUpperCase() || '—'} />
          <Row label="Order" value={data.orderId?.slice(-8) || '—'} />
          <Row label="Gateway" value={data.gateway || '—'} />
          {data.gatewayPaymentId ? (
            <Row label="Txn ID" value={data.gatewayPaymentId} />
          ) : null}
          {data.createdAt ? (
            <Row
              label="Created"
              value={new Date(data.createdAt).toLocaleString()}
            />
          ) : null}
          {data.failureReason ? (
            <Row label="Failure" value={data.failureReason} />
          ) : null}
        </View>

        {data.paymentUrl ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => Linking.openURL(data.paymentUrl!)}
          >
            <ExternalLink color={authTheme.brand} size={16} />
            <Text style={styles.secondaryText}>Open payment page</Text>
          </Pressable>
        ) : null}

        {data.orderId ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() =>
              router.push({
                pathname: '/orders/[orderId]',
                params: { orderId: data.orderId! },
              })
            }
          >
            <Text style={styles.secondaryText}>View order</Text>
          </Pressable>
        ) : null}

        {!isPaymentSuccess(data.status) ? (
          <View style={styles.verifyBox}>
            <Text style={styles.section}>Verify payment</Text>
            <Text style={styles.hint}>
              After completing payment at the gateway, enter the transaction ID
              (if required) and verify.
            </Text>
            <TextInput
              style={styles.input}
              value={txnId}
              onChangeText={setTxnId}
              placeholder="Gateway / Razorpay payment ID (optional)"
              placeholderTextColor={authTheme.textDim}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              value={signature}
              onChangeText={setSignature}
              placeholder="Signature (if provided)"
              placeholderTextColor={authTheme.textDim}
              autoCapitalize="none"
            />
            <Pressable
              style={styles.primaryBtn}
              onPress={handleVerify}
              disabled={verify.isPending}
            >
              {verify.isPending ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <RefreshCw color="#FFFFFF" size={16} />
                  <Text style={styles.primaryText}>Verify payment</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: authTheme.bg },
  pad: { paddingHorizontal: 20, paddingTop: 8 },
  scroll: { padding: 20, gap: 14, paddingBottom: 40 },
  banner: {
    color: '#16A34A',
    fontWeight: '700',
    backgroundColor: 'rgba(22,163,74,0.1)',
    padding: 12,
    borderRadius: 12,
  },
  card: {
    backgroundColor: authTheme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
    padding: 16,
    gap: 8,
  },
  label: { color: authTheme.textMuted, fontSize: 12, fontWeight: '600' },
  amount: { color: authTheme.text, fontSize: 32, fontWeight: '800' },
  status: { color: authTheme.brand, fontWeight: '700', fontSize: 14 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: { color: authTheme.textMuted, fontSize: 13 },
  rowValue: {
    color: authTheme.text,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: authTheme.brandSoft,
  },
  secondaryText: { color: authTheme.brand, fontWeight: '700' },
  verifyBox: { gap: 10, marginTop: 8 },
  section: { color: authTheme.text, fontSize: 16, fontWeight: '800' },
  hint: { color: authTheme.textMuted, fontSize: 12, lineHeight: 18 },
  input: {
    backgroundColor: authTheme.input,
    borderWidth: 1,
    borderColor: authTheme.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: authTheme.text,
    fontSize: 14,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: authTheme.brand,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
