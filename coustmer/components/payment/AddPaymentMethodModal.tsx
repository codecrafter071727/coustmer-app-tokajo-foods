import { Pressable } from '@/components/common/Pressable';
import { ArrowLeft, CreditCard, Smartphone } from 'lucide-react-native';
import { useState } from 'react';
import { Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authTheme } from '@/constants/auth-theme';
import { useSavePaymentMethod } from '@/lib/payment/hooks';
import type { SavedMethodType } from '@/lib/payment/types';

type Props = {
  visible: boolean;
  onClose: () => void;
};

type MethodType = 'card' | 'upi';

export function AddPaymentMethodModal({ visible, onClose }: Props) {
  const [methodType, setMethodType] = useState<MethodType>('upi');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [cvv, setCvv] = useState('');
  const [holderName, setHolderName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [setAsDefault, setSetAsDefault] = useState(false);

  const saveMethod = useSavePaymentMethod();

  const resetForm = () => {
    setCardNumber('');
    setExpiryMonth('');
    setExpiryYear('');
    setCvv('');
    setHolderName('');
    setUpiId('');
    setSetAsDefault(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateCard = () => {
    if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
      Alert.alert('Invalid Card', 'Please enter a valid card number');
      return false;
    }
    if (!expiryMonth || !expiryYear) {
      Alert.alert('Invalid Expiry', 'Please enter expiry month and year');
      return false;
    }
    if (!cvv || cvv.length < 3) {
      Alert.alert('Invalid CVV', 'Please enter a valid CVV');
      return false;
    }
    if (!holderName.trim()) {
      Alert.alert('Invalid Name', 'Please enter cardholder name');
      return false;
    }
    return true;
  };

  const validateUpi = () => {
    if (!upiId || !upiId.includes('@')) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g., name@paytm)');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (methodType === 'card' && !validateCard()) return;
    if (methodType === 'upi' && !validateUpi()) return;

    try {
      const payload = {
        type: methodType as SavedMethodType,
        setAsDefault,
        ...(methodType === 'card'
          ? {
              cardNumber: cardNumber.replace(/\s/g, ''),
              expiryMonth: parseInt(expiryMonth),
              expiryYear: parseInt(expiryYear),
              cvv,
              cardHolderName: holderName,
              label: `Card •••• ${cardNumber.slice(-4)}`,
              // Backend requires gatewayToken from the payment gateway
              gatewayToken: cardNumber.replace(/\s/g, ''),
              token: cardNumber.replace(/\s/g, ''),
            }
          : {
              upiId,
              label: upiId,
              gatewayToken: upiId,
              token: upiId,
            }),
      };

      await saveMethod.mutateAsync(payload);
      handleClose();
      Alert.alert('Success', 'Payment method saved successfully');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save payment method'
      );
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(' ') : cleaned;
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Pressable style={styles.backBtn} onPress={handleClose}>
              <ArrowLeft color={authTheme.text} size={20} />
            </Pressable>
            <Text style={styles.title}>Add Payment Method</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            <View style={styles.methodTabs}>
              <Pressable
                style={[
                  styles.methodTab,
                  methodType === 'upi' && styles.methodTabActive,
                ]}
                onPress={() => setMethodType('upi')}
              >
                <Smartphone
                  color={methodType === 'upi' ? '#FFFFFF' : authTheme.textMuted}
                  size={18}
                />
                <Text
                  style={[
                    styles.methodTabText,
                    methodType === 'upi' && styles.methodTabTextActive,
                  ]}
                >
                  UPI ID
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.methodTab,
                  methodType === 'card' && styles.methodTabActive,
                ]}
                onPress={() => setMethodType('card')}
              >
                <CreditCard
                  color={methodType === 'card' ? '#FFFFFF' : authTheme.textMuted}
                  size={18}
                />
                <Text
                  style={[
                    styles.methodTabText,
                    methodType === 'card' && styles.methodTabTextActive,
                  ]}
                >
                  Card
                </Text>
              </Pressable>
            </View>

            {methodType === 'upi' ? (
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>UPI ID</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="yourname@paytm"
                    value={upiId}
                    onChangeText={setUpiId}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.form}>
                <View style={styles.field}>
                  <Text style={styles.label}>Card Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChangeText={(text) => setCardNumber(formatCardNumber(text))}
                    keyboardType="numeric"
                    maxLength={19}
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Expiry Month</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="MM"
                      value={expiryMonth}
                      onChangeText={setExpiryMonth}
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>Expiry Year</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY"
                      value={expiryYear}
                      onChangeText={setExpiryYear}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                  <View style={[styles.field, { flex: 1 }]}>
                    <Text style={styles.label}>CVV</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="123"
                      value={cvv}
                      onChangeText={setCvv}
                      keyboardType="numeric"
                      maxLength={4}
                      secureTextEntry
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Cardholder Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Name on card"
                    value={holderName}
                    onChangeText={setHolderName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <Pressable
              style={styles.defaultOption}
              onPress={() => setSetAsDefault(!setAsDefault)}
            >
              <View
                style={[
                  styles.checkbox,
                  setAsDefault && styles.checkboxActive,
                ]}
              >
                {setAsDefault && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.defaultText}>Set as default payment method</Text>
            </Pressable>
          </ScrollView>

          <Pressable
            style={[styles.saveBtn, saveMethod.isPending && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saveMethod.isPending}
          >
            <Text style={styles.saveBtnText}>
              {saveMethod.isPending ? 'Saving…' : 'Save Payment Method'}
            </Text>
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: authTheme.bg,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: authTheme.cardBorder,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: authTheme.text,
  },
  placeholder: {
    width: 40,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  methodTabs: {
    flexDirection: 'row',
    backgroundColor: authTheme.surface,
    borderRadius: 12,
    padding: 4,
    marginTop: 20,
    marginBottom: 24,
  },
  methodTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  methodTabActive: {
    backgroundColor: authTheme.brand,
  },
  methodTabText: {
    color: authTheme.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  methodTabTextActive: {
    color: '#FFFFFF',
  },
  form: {
    gap: 20,
  },
  field: {
    gap: 8,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    color: authTheme.text,
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    backgroundColor: authTheme.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: authTheme.text,
    borderWidth: 1,
    borderColor: authTheme.cardBorder,
  },
  defaultOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 24,
    paddingVertical: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: authTheme.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: authTheme.brand,
    borderColor: authTheme.brand,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  defaultText: {
    color: authTheme.text,
    fontSize: 16,
    fontWeight: '500',
  },
  saveBtn: {
    backgroundColor: authTheme.brand,
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});