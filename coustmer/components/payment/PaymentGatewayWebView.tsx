import { Pressable } from '@/components/common/Pressable';
import { ArrowLeft, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator,
  Alert,
  Modal,
  
  StyleSheet,
  Text,
  View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';

import { authTheme } from '@/constants/auth-theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  paymentUrl: string;
  onPaymentComplete: (success: boolean, data?: any) => void;
  orderAmount?: number;
  orderNumber?: string;
};

export function PaymentGatewayWebView({
  visible,
  onClose,
  paymentUrl,
  onPaymentComplete,
  orderAmount,
  orderNumber,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const handleNavigationChange = (navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);

    const url = navState.url;
    const lower = url.toLowerCase();

    const parseGatewayParams = (rawUrl: string) => {
      try {
        const parsed = new URL(rawUrl);
        const q = parsed.searchParams;
        return {
          url: rawUrl,
          paymentId:
            q.get('paymentId') ||
            q.get('payment_id') ||
            undefined,
          gatewayPaymentId:
            q.get('gatewayPaymentId') ||
            q.get('razorpay_payment_id') ||
            q.get('payment_id') ||
            undefined,
          gatewayOrderId:
            q.get('gatewayOrderId') ||
            q.get('razorpay_order_id') ||
            q.get('order_id') ||
            undefined,
          gatewaySignature:
            q.get('gatewaySignature') ||
            q.get('razorpay_signature') ||
            q.get('signature') ||
            undefined,
          razorpay_payment_id: q.get('razorpay_payment_id') || undefined,
          razorpay_order_id: q.get('razorpay_order_id') || undefined,
          razorpay_signature: q.get('razorpay_signature') || undefined,
        };
      } catch {
        return { url: rawUrl };
      }
    };

    if (
      lower.includes('success') ||
      lower.includes('complete') ||
      lower.includes('payment-success') ||
      lower.includes('thankyou') ||
      lower.includes('confirmation')
    ) {
      onPaymentComplete(true, parseGatewayParams(url));
      return;
    }

    if (
      lower.includes('fail') ||
      lower.includes('error') ||
      lower.includes('cancel') ||
      lower.includes('payment-failed') ||
      lower.includes('declined')
    ) {
      onPaymentComplete(false, parseGatewayParams(url));
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PAYMENT_COMPLETE') {
        onPaymentComplete(data.success, data);
      }
    } catch (error) {
      // Ignore parse errors
    }
  };

  const handleGoBack = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
    } else {
      Alert.alert(
        'Cancel Payment',
        'Are you sure you want to cancel the payment?',
        [
          { text: 'Continue Payment', style: 'cancel' },
          { text: 'Cancel', style: 'destructive', onPress: onClose },
        ]
      );
    }
  };

  const injectedJavaScript = `
    // Inject JavaScript to detect payment completion
    (function() {
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;
      
      function sendUrlChange(url) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'URL_CHANGE',
            url: url
          }));
        }
      }
      
      history.pushState = function() {
        originalPushState.apply(history, arguments);
        sendUrlChange(window.location.href);
      };
      
      history.replaceState = function() {
        originalReplaceState.apply(history, arguments);
        sendUrlChange(window.location.href);
      };
      
      // Listen for hash changes
      window.addEventListener('hashchange', function() {
        sendUrlChange(window.location.href);
      });
      
      // Check if page indicates payment completion
      setTimeout(function() {
        const bodyText = document.body.innerText.toLowerCase();
        const url = window.location.href.toLowerCase();
        
        if (bodyText.includes('payment successful') || 
            bodyText.includes('transaction successful') ||
            bodyText.includes('order placed') ||
            url.includes('success')) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PAYMENT_COMPLETE',
              success: true
            }));
          }
        } else if (bodyText.includes('payment failed') || 
                   bodyText.includes('transaction failed') ||
                   url.includes('fail') || 
                   url.includes('error')) {
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'PAYMENT_COMPLETE',
              success: false
            }));
          }
        }
      }, 2000);
    })();
    true;
  `;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable style={styles.headerBtn} onPress={handleGoBack}>
            <ArrowLeft color={authTheme.text} size={20} />
          </Pressable>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Payment Gateway</Text>
            <Text style={styles.headerSubtitle}>
              {orderNumber ? `Order ${orderNumber} • ` : ''}₹
              {Number(orderAmount ?? 0).toFixed(0)}
            </Text>
          </View>
          
          <Pressable style={styles.headerBtn} onPress={onClose}>
            <X color={authTheme.text} size={20} />
          </Pressable>
        </View>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={authTheme.brand} />
            <Text style={styles.loadingText}>Loading payment gateway...</Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: paymentUrl }}
          style={styles.webView}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onNavigationStateChange={handleNavigationChange}
          onMessage={handleMessage}
          injectedJavaScript={injectedJavaScript}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          scalesPageToFit={true}
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            Alert.alert(
              'Payment Gateway Error',
              'Failed to load payment gateway. Please try again.',
              [
                { text: 'Retry', onPress: () => webViewRef.current?.reload() },
                { text: 'Cancel', onPress: onClose },
              ]
            );
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            if (nativeEvent.statusCode >= 400) {
              Alert.alert(
                'Payment Error',
                `Payment gateway error (${nativeEvent.statusCode}). Please try again.`,
                [
                  { text: 'Retry', onPress: () => webViewRef.current?.reload() },
                  { text: 'Cancel', onPress: onClose },
                ]
              );
            }
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: authTheme.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: authTheme.cardBorder,
    backgroundColor: authTheme.surface,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: authTheme.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: authTheme.textMuted,
    marginTop: 2,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: authTheme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: authTheme.textMuted,
    fontWeight: '500',
  },
  webView: {
    flex: 1,
    backgroundColor: authTheme.bg,
  },
});