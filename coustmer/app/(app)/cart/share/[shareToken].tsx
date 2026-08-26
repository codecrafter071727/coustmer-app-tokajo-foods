import { SharedCartPreviewScreen } from '@/components/order/SharedCartPreviewScreen';
import { useLocalSearchParams } from 'expo-router';

export default function SharedCartPreviewPage() {
  const params = useLocalSearchParams<{ shareToken?: string | string[] }>();
  const shareToken = Array.isArray(params.shareToken)
    ? params.shareToken[0] ?? ''
    : (params.shareToken ?? '');

  return <SharedCartPreviewScreen shareToken={shareToken} />;
}
