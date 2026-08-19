import { useRouter } from 'expo-router';
import { ChevronLeft, MessageSquare, Star } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { authTheme } from '@/constants/auth-theme';
import { fonts } from '@/constants/typography';
import { useSubmitFeedback } from '@/lib/customer/hooks';

export default function FeedbackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const submit = useSubmitFeedback();
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!message.trim()) {
      Alert.alert('Please write something', 'Your feedback message is empty.');
      return;
    }
    submit.mutate(
      { rating: rating || undefined, message: message.trim() },
      {
        onSuccess: () => {
          Alert.alert('Thank you!', 'Your feedback has been received.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
        },
        onError: () => {
          Alert.alert('Failed', 'Could not submit feedback. Please try again.');
        },
      }
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={22} color="#0B1220" strokeWidth={2.2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Feedback</Text>
        </View>

        <View style={styles.body}>
          <View style={styles.iconWrap}>
            <MessageSquare size={40} color={authTheme.brand} strokeWidth={1.3} />
          </View>
          <Text style={styles.title}>How's your experience?</Text>
          <Text style={styles.sub}>
            Your feedback helps us improve the app for everyone.
          </Text>

          {/* Star rating */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => setRating(s)} activeOpacity={0.7}>
                <Star
                  size={36}
                  color="#F59E0B"
                  fill={rating >= s ? '#F59E0B' : 'transparent'}
                  strokeWidth={1.8}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Message */}
          <TextInput
            style={styles.input}
            placeholder="Tell us what you think…"
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.submitBtn, submit.isPending && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submit.isPending}
            activeOpacity={0.85}
          >
            {submit.isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitText}>Submit feedback</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: '#0B1220' },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  iconWrap: { marginBottom: 16 },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: '#0B1220',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  sub: {
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 280,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
  },
  input: {
    width: '100%',
    minHeight: 120,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontFamily: fonts.ui,
    fontSize: 14,
    color: '#0B1220',
    lineHeight: 20,
    marginBottom: 24,
  },
  submitBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: authTheme.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { fontFamily: fonts.uiBold, fontSize: 15, color: '#FFFFFF' },
});
