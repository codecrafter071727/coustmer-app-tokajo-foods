import { Pressable } from '@/components/common/Pressable';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bike,
  ChevronRight,
  CreditCard,
  MapPin,
  Pencil,
  Store,
  Wallet,
} from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DeliveryLocationPicker } from '@/components/location/DeliveryLocationPicker';
import { OrderPlacementModal, PlacementPhase } from '@/components/order/OrderPlacementModal';
import { PaymentOptionsModal } from '@/components/order/PaymentOptionsModal';
import { SlideToOrderButton } from '@/components/order/SlideToOrderButton';
import { PaymentGatewayWebView } from '@/components/payment/PaymentGatewayWebView';
import { fonts } from '@/constants/typography';
import {
  useCart,
  useUpdateCartDeliveryType,
  useUpdateCartTip,
  useValidateCart,
} from '@/lib/cart/hooks';
import { applyServerCartToStore } from '@/lib/cart/sync';
import { useCreateOrder } from '@/lib/order/hooks';
import { parseDeliveryAddress } from '@/lib/order/parse-address';
import { parseDropPin } from '@/lib/location/drop-pin';
import { checkoutBlockCopy } from '@/lib/cart/checkout-block';
import {
  paymentMethodHint,
  paymentMethodLabel,
} from '@/lib/order/payment-labels';
import {
  useInitiatePayment,
  usePaymentMethods,
  usePaymentWallet,
  useVerifyPayment,
} from '@/lib/payment/hooks';
import { needsOnlinePayment } from '@/lib/payment/types';
import {
  generateTestPaymentUrl,
  simulatePaymentSuccess,
} from '@/lib/payment/test-urls';
import { useUserProfile } from '@/lib/profile/hooks';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useDeliveryLocationStore } from '@/store/delivery-location-store';
import { extractCityFromAddress, normalizeCityName } from '@/lib/location/format';
import type { DeliveryLocationResult } from '@/components/location/DeliveryLocationPicker';

const BG = '#F3F4F6';
const WHITE = '#FFFFFF';
const ORANGE = '#F97316';
const ORANGE_DARK = '#EA580C';
const TEXT = '#0B1220';
const TEXT_SEC = '#64748B';
const TEXT_MUTED = '#94A3B8';
const BORDER = '#E5E7EB';
const GREEN = '#16A34A';

export function OrderSummaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const authUser = useAuthStore((s) => s.user);
  const isLoggedIn = Boolean(token);

  const restaurant = useCartStore((s) => s.restaurant);
  const items = useCartStore((s) => s.items);
  const tip = useCartStore((s) => s.tip);
  const discount = useCartStore((s) => s.discount);
  const couponCode = useCartStore((s) => s.couponCode);
  const deliveryFee = useCartStore((s) => s.deliveryFee);
  const tax = useCartStore((s) => s.tax);
  const deliveryType = useCartStore((s) => s.deliveryType);
  const setDeliveryTypeLocal = useCartStore((s) => s.setDeliveryType);
  const specialInstructions = useCartStore((s) => s.specialInstructions);
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);
  const subtotal = useCartStore((s) => s.subtotal());
  const serverTotal = useCartStore((s) => s.serverTotal);

  const location = useDeliveryLocationStore((s) => s.location);
  const setDeliveryLocation = useDeliveryLocationStore((s) => s.setLocation);
  const profile = useUserProfile();
  const paymentMethods = usePaymentMethods();
  const wallet = usePaymentWallet();
  const remoteCart = useCart();
  const updateDeliveryType = useUpdateCartDeliveryType();
  const updateTip = useUpdateCartTip();
  const validateCart = useValidateCart();
  const createOrder = useCreateOrder();
  const initiatePayment = useInitiatePayment();
  const verifyPayment = useVerifyPayment();

  const [locationOpen, setLocationOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [orderPlacementPhase, setOrderPlacementPhase] =
    useState<PlacementPhase>('none');
  const [paymentGatewayOpen, setPaymentGatewayOpen] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [currentOrder, setCurrentOrder] = useState<any>(null);

  // Hold last non-empty cart so UI stays stable if server clears cart mid-checkout.
  const lastRestaurantRef = useRef(restaurant);
  const lastItemsRef = useRef(items);
  if (restaurant) lastRestaurantRef.current = restaurant;
  if (items.length) lastItemsRef.current = items;

  const checkoutInFlight =
    paying ||
    orderPlacementPhase !== 'none' ||
    paymentGatewayOpen ||
    Boolean(currentOrder);

  const displayRestaurant =
    restaurant ?? (checkoutInFlight ? lastRestaurantRef.current : null);
  const displayItems =
    items.length > 0
      ? items
      : checkoutInFlight
        ? lastItemsRef.current
        : items;

  const apiCart = remoteCart.data;
  const billSubtotal =
    typeof apiCart?.subtotal === 'number' ? apiCart.subtotal : subtotal;
  const displayDeliveryFee =
    typeof apiCart?.deliveryFee === 'number'
      ? apiCart.deliveryFee
      : Number(deliveryFee) || 0;
  const displayDiscount =
    typeof apiCart?.discount === 'number'
      ? apiCart.discount
      : Number(discount) || 0;
  const displayTip =
    typeof apiCart?.tip === 'number' && Number.isFinite(apiCart.tip)
      ? apiCart.tip
      : Number(tip) || 0;
  const apiTax = typeof apiCart?.tax === 'number' ? apiCart.tax : Number(tax) || 0;
  const apiTotal =
    typeof apiCart?.total === 'number'
      ? apiCart.total
      : typeof serverTotal === 'number'
        ? serverTotal
        : null;

  const displayTax = useMemo(() => {
    if (apiTax > 0) return apiTax;
    if (apiTotal != null) {
      const withoutTax =
        billSubtotal + displayDeliveryFee + displayTip - displayDiscount;
      const implied = Math.round((apiTotal - withoutTax) * 100) / 100;
      if (implied > 0.009) return implied;
    }
    return 0;
  }, [
    apiTax,
    apiTotal,
    billSubtotal,
    displayDeliveryFee,
    displayTip,
    displayDiscount,
  ]);

  const displayTotal = Math.max(
    0,
    Math.round(
      (billSubtotal +
        displayDeliveryFee +
        displayTax +
        displayTip -
        displayDiscount) *
        100
    ) / 100
  );

  const addressLabel = location?.label || 'Home';
  const addressLine = location?.formattedAddress || 'Add a delivery address';

  const displayName =
    profile.data?.displayName ||
    [profile.data?.firstName, profile.data?.lastName].filter(Boolean).join(' ') ||
    authUser?.firstName ||
    'Guest';

  const phoneDigits = (
    profile.data?.phone ||
    authUser?.phone ||
    ''
  ).replace(/\D/g, '');
  const phone =
    phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits || '—';

  const itemCount = displayItems.reduce((n, i) => n + i.quantity, 0);

  const handleFulfillment = (type: 'delivery' | 'takeaway') => {
    if (deliveryType === type) return;
    if (!isLoggedIn) {
      Alert.alert('Sign in required', 'Please sign in to change fulfillment.');
      return;
    }
    const prev = deliveryType;
    setDeliveryTypeLocal(type);
    void updateDeliveryType.mutateAsync({ deliveryType: type, type }).catch((e) => {
      setDeliveryTypeLocal(prev);
      Alert.alert(
        'Could not update',
        e instanceof Error ? e.message : 'Try again'
      );
    });
  };

  const handlePaymentComplete = async (data: any) => {
    setPaymentGatewayOpen(false);
    try {
      if (paymentUrl.includes('test') || paymentUrl.includes('httpbin')) {
        const simulatedResult = simulatePaymentSuccess(
          currentOrder?.id || 'unknown',
          currentOrder?.total ?? displayTotal
        );
        await verifyPayment.mutateAsync({
          paymentId: simulatedResult.paymentId,
          orderId: currentOrder?.id,
          gatewayPaymentId: simulatedResult.gatewayPaymentId,
          gatewayOrderId: simulatedResult.gatewayOrderId,
          gatewaySignature: simulatedResult.gatewaySignature,
          status: 'success',
        });
      } else if (data?.paymentId || data?.gatewayPaymentId) {
        await verifyPayment.mutateAsync({
          paymentId: data.paymentId,
          orderId: currentOrder?.id,
          gatewayPaymentId: data.gatewayPaymentId,
          gatewayOrderId: data.gatewayOrderId,
          gatewaySignature: data.gatewaySignature || data.razorpay_signature,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_order_id: data.razorpay_order_id,
          razorpay_signature: data.razorpay_signature,
          signature: data.gatewaySignature || data.razorpay_signature,
        });
      }
      setOrderPlacementPhase('placed');
      await new Promise((r) => setTimeout(r, 1200));
      if (currentOrder?.id) {
        router.replace({
          pathname: '/orders/[orderId]/tracking',
          params: { orderId: currentOrder.id, newOrder: 'true' },
        });
      }
      setOrderPlacementPhase('none');
    } catch {
      Alert.alert('Payment Failed', 'Your payment could not be processed.', [
        {
          text: 'Try Again',
          onPress: () => {
            if (paymentUrl) setPaymentGatewayOpen(true);
          },
        },
      ]);
    }
  };

  const placeOrder = async () => {
    if (!location) {
      Alert.alert('Address Missing', 'Please select a delivery address');
      return;
    }
    if (!restaurant || !items.length) {
      Alert.alert('Empty cart', 'Add items before confirming.');
      return;
    }

    setPaying(true);
    setOrderPlacementPhase('placing');
    try {
      if (isLoggedIn && tip >= 0) {
        try {
          await updateTip.mutateAsync({ tip });
        } catch (tipErr) {
          if (tip > 0) {
            Alert.alert(
              'Tip not saved',
              tipErr instanceof Error
                ? tipErr.message
                : 'Could not add tip to the server bill.'
            );
            setOrderPlacementPhase('none');
            return;
          }
        }
      }

      const isDelivery = deliveryType !== 'takeaway';
      const pin = parseDropPin(location?.lat, location?.lng);
      if (isDelivery && !pin) {
        Alert.alert(
          'Drop a pin for delivery',
          'We need your exact map pin to check if we deliver here and to calculate the fee.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Set pin', onPress: () => setLocationOpen(true) },
          ]
        );
        setOrderPlacementPhase('none');
        return;
      }

      const result = await validateCart.mutateAsync(pin ?? {});
      if (result.cart) applyServerCartToStore(result.cart);
      if (!result.valid) {
        const code = result.code || result.issues[0]?.code;
        const needsPin =
          code === 'DROP_PIN_REQUIRED' ||
          (result.message ?? '').toLowerCase().includes('drop pin');
        if (needsPin) {
          Alert.alert(
            'Drop a pin for delivery',
            'Your cart has no delivery pin yet. Open the map and drop your pin, then try again.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Set pin', onPress: () => setLocationOpen(true) },
            ]
          );
        } else {
          const copy = checkoutBlockCopy(
            code,
            result.issues.map((i) => i.message).join('\n') ||
              result.message ||
              'Cart validation failed'
          );
          Alert.alert(copy.title, copy.message, [
            { text: 'OK' },
            ...(code === 'OUT_OF_ZONE'
              ? [{ text: 'Change pin', onPress: () => setLocationOpen(true) }]
              : []),
          ]);
        }
        setOrderPlacementPhase('none');
        return;
      }

      const parsedAddress = parseDeliveryAddress({
        formattedAddress: location.formattedAddress,
        label: location.label,
        city: location.city,
        lat: location.lat,
        lng: location.lng,
      });

      let mappedMethod = paymentMethod;
      let mappedMethodId: string | undefined;

      if (paymentMethod === 'paytm_upi' || paymentMethod === 'gpay') {
        mappedMethod = 'upi';
      } else if (paymentMethods.data?.some((m) => m.id === paymentMethod)) {
        const saved = paymentMethods.data.find((m) => m.id === paymentMethod);
        if (saved) {
          mappedMethod = saved.type;
          mappedMethodId = saved.id;
        }
      }

      const order = await createOrder.mutateAsync({
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        items: items.map((item) => ({
          menuItemId: item.menuItemId || item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          specialInstructions: item.specialInstructions,
        })),
        deliveryAddress: {
          label: parsedAddress.label,
          formattedAddress: parsedAddress.formattedAddress,
          street: parsedAddress.street,
          area: parsedAddress.area,
          city: parsedAddress.city,
          state: parsedAddress.state,
          pincode: parsedAddress.pincode,
          contactName: displayName,
          contactPhone: phone.replace(/\D/g, ''),
          lat: parsedAddress.lat,
          lng: parsedAddress.lng,
        },
        addressId: location.savedAddressId,
        paymentMethod: mappedMethod,
        deliveryType,
        fulfillmentType: deliveryType,
        specialInstructions: specialInstructions || undefined,
        tip: tip > 0 ? tip : 0,
        deliveryTip: tip > 0 ? tip : 0,
      } as any);

      setCurrentOrder(order);
      const amount = order.total ?? displayTotal;

      if (!needsOnlinePayment(mappedMethod)) {
        setOrderPlacementPhase('placed');
        await new Promise((r) => setTimeout(r, 1400));
        router.replace({
          pathname: '/orders/[orderId]/tracking',
          params: { orderId: order.id, newOrder: 'true' },
        });
        setOrderPlacementPhase('none');
        return;
      }

      let paymentUrlToOpen: string | undefined;
      if (order.raw && typeof order.raw.paymentUrl === 'string') {
        paymentUrlToOpen = order.raw.paymentUrl;
      } else if (order.raw) {
        paymentUrlToOpen =
          (order.raw.checkoutUrl as string | undefined) ||
          (order.raw.redirectUrl as string | undefined) ||
          (order.raw.gatewayUrl as string | undefined) ||
          (order.raw.url as string | undefined);
      }

      if (!paymentUrlToOpen) {
        try {
          const payment = await initiatePayment.mutateAsync({
            orderId: order.id,
            amount,
            currency: 'INR',
            method: mappedMethod as any,
            methodId: mappedMethodId,
            description: `Order ${order.orderNumber || order.id}`,
          });
          const urls = [
            payment.paymentUrl,
            payment.checkoutUrl,
            payment.redirectUrl,
            payment.gatewayUrl,
            payment.url,
          ];
          paymentUrlToOpen = urls.find(
            (url): url is string => typeof url === 'string' && url.length > 0
          );
        } catch {
          Alert.alert(
            'Payment Configuration Issue',
            'Payment gateway not properly configured.',
            [
              {
                text: 'Test Payment',
                onPress: () => {
                  const testUrl = generateTestPaymentUrl('razorpay', {
                    orderId: order.id,
                    amount,
                    currency: 'INR',
                    description: `Test Order ${order.orderNumber || order.id}`,
                  });
                  setPaymentUrl(testUrl);
                  setPaymentGatewayOpen(true);
                  setOrderPlacementPhase('none');
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
          return;
        }
      }

      if (paymentUrlToOpen?.startsWith('http')) {
        setPaymentUrl(paymentUrlToOpen);
        setPaymentGatewayOpen(true);
        setOrderPlacementPhase('none');
        return;
      }

      Alert.alert('Payment Issue', 'No payment URL found.');
      setOrderPlacementPhase('none');
    } catch (err: any) {
      Alert.alert('Checkout Failed', err?.message || 'Could not place order');
      setOrderPlacementPhase('none');
    } finally {
      setPaying(false);
    }
  };

  // Keep summary mounted while placing — server may empty the cart after create.
  if ((!displayItems.length || !displayRestaurant) && !checkoutInFlight) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <ArrowLeft color={TEXT} size={22} strokeWidth={2.2} />
          </Pressable>
          <Text style={styles.headerTitle}>Order summary</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing to review</Text>
          <Pressable style={styles.emptyBtn} onPress={() => router.replace('/cart')}>
            <Text style={styles.emptyBtnText}>Back to cart</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft color={TEXT} size={22} strokeWidth={2.2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Order summary</Text>
          <Text style={styles.headerSub}>
            {itemCount} item{itemCount === 1 ? '' : 's'} · Review before paying
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 110 },
        ]}
      >
        <LinearGradient
          colors={['#FFF7ED', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroKicker}>ALMOST THERE</Text>
          <Text style={styles.heroTitle}>Confirm your order</Text>
          <Text style={styles.heroSub} numberOfLines={1}>
            From {displayRestaurant?.name ?? 'Restaurant'}
          </Text>
        </LinearGradient>

        {/* Address */}
        <Pressable style={styles.card} onPress={() => setLocationOpen(true)}>
          <View style={styles.cardHead}>
            <View style={styles.cardIcon}>
              <MapPin color={ORANGE} size={18} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardEyebrow}>DELIVERY ADDRESS</Text>
              <Text style={styles.cardTitle}>{addressLabel}</Text>
              <Text style={styles.cardBody} numberOfLines={2}>
                {addressLine}
              </Text>
            </View>
            <View style={styles.changePill}>
              <Pencil color={ORANGE} size={12} strokeWidth={2.4} />
              <Text style={styles.changeText}>Change</Text>
            </View>
          </View>
        </Pressable>

        {/* Fulfillment */}
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>FULFILLMENT</Text>
          <View style={styles.fulfillRow}>
            <Pressable
              style={[
                styles.fulfillChip,
                deliveryType === 'delivery' && styles.fulfillChipOn,
              ]}
              onPress={() => handleFulfillment('delivery')}
            >
              <Bike
                color={deliveryType === 'delivery' ? ORANGE : TEXT_SEC}
                size={16}
                strokeWidth={2.3}
              />
              <Text
                style={[
                  styles.fulfillText,
                  deliveryType === 'delivery' && styles.fulfillTextOn,
                ]}
              >
                Delivery
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.fulfillChip,
                deliveryType === 'takeaway' && styles.fulfillChipOn,
              ]}
              onPress={() => handleFulfillment('takeaway')}
            >
              <Store
                color={deliveryType === 'takeaway' ? ORANGE : TEXT_SEC}
                size={16}
                strokeWidth={2.3}
              />
              <Text
                style={[
                  styles.fulfillText,
                  deliveryType === 'takeaway' && styles.fulfillTextOn,
                ]}
              >
                Takeaway
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Items */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardEyebrow}>ITEMS</Text>
              <Text style={styles.cardTitle}>
                {displayRestaurant?.name ?? 'Restaurant'}
              </Text>
            </View>
            <Pressable
              style={styles.changePill}
              onPress={() => router.back()}
            >
              <Pencil color={ORANGE} size={12} strokeWidth={2.4} />
              <Text style={styles.changeText}>Edit</Text>
            </Pressable>
          </View>
          <View style={styles.itemList}>
            {displayItems.map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <View style={styles.itemDivider} /> : null}
                <View style={styles.itemRow}>
                  <Image
                    source={{
                      uri:
                        item.imageUrl ||
                        'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=120&h=120&fit=crop',
                    }}
                    style={styles.itemImage}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemMeta}>Qty {item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    ₹{Math.round(item.price * item.quantity)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Payment */}
        <Pressable style={styles.card} onPress={() => setPaymentOpen(true)}>
          <View style={styles.cardHead}>
            <View style={styles.cardIcon}>
              {paymentMethod === 'cod' ? (
                <Bike color={ORANGE} size={18} strokeWidth={2.3} />
              ) : paymentMethod === 'wallet' ? (
                <Wallet color={ORANGE} size={18} strokeWidth={2.3} />
              ) : (
                <CreditCard color={ORANGE} size={18} strokeWidth={2.3} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardEyebrow}>PAYMENT</Text>
              <Text style={styles.cardTitle}>
                {paymentMethodLabel(paymentMethod, paymentMethods.data)}
              </Text>
              <Text style={styles.cardBody}>
                {paymentMethodHint(paymentMethod)}
              </Text>
            </View>
            <ChevronRight color={ORANGE} size={18} strokeWidth={2.3} />
          </View>
        </Pressable>

        {/* Bill */}
        <View style={styles.billCard}>
          <Text style={styles.cardEyebrow}>BILL DETAILS</Text>
          <BillRow label={`Item total (${itemCount})`} value={billSubtotal} />
          <BillRow
            label="Delivery fee"
            value={displayDeliveryFee}
            free={displayDeliveryFee <= 0}
          />
          <BillRow label="Taxes & charges" value={displayTax} />
          <BillRow
            label="Delivery tip"
            value={displayTip}
            dash={displayTip <= 0}
          />
          {displayDiscount > 0 ? (
            <BillRow
              label={couponCode ? `Promo · ${couponCode}` : 'Discount'}
              value={-displayDiscount}
              green
            />
          ) : null}
          <View style={styles.billSep} />
          <View style={styles.billTotalRow}>
            <Text style={styles.billTotalLabel}>To pay</Text>
            <Text style={styles.billTotalValue}>
              ₹{displayTotal.toFixed(2)}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <SlideToOrderButton
          amountLabel={`₹${displayTotal.toFixed(2)}`}
          loading={paying || validateCart.isPending}
          disabled={paying || validateCart.isPending}
          onComplete={() => {
            void placeOrder();
          }}
        />
      </View>

      <DeliveryLocationPicker
        visible={locationOpen}
        onClose={() => setLocationOpen(false)}
        onConfirm={(result: DeliveryLocationResult) => {
          setDeliveryLocation({
            label: result.label,
            formattedAddress: result.formattedAddress,
            city: normalizeCityName(
              extractCityFromAddress(result.formattedAddress)
            ),
            lat: result.lat,
            lng: result.lng,
            source: result.source,
            savedAddressId: result.savedAddressId,
            updatedAt: Date.now(),
          });
          setLocationOpen(false);
        }}
        initial={
          location ? { lat: location.lat, lng: location.lng } : null
        }
      />

      <PaymentOptionsModal
        visible={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        selectedMethod={paymentMethod}
        onSelectMethod={(m) => {
          setPaymentMethod(m);
          setPaymentOpen(false);
        }}
        onPay={(m) => {
          setPaymentMethod(m);
          setPaymentOpen(false);
        }}
        itemCount={displayItems.length}
        total={displayTotal}
        savings={displayDiscount}
        restaurantName={displayRestaurant?.name ?? 'Restaurant'}
        addressLabel={addressLabel}
        addressText={addressLine}
        savedMethods={paymentMethods.data}
        wallet={wallet.data}
      />

      <OrderPlacementModal
        phase={orderPlacementPhase}
        addressLabel={addressLabel}
        addressText={addressLine}
        savings={discount}
      />

      <PaymentGatewayWebView
        visible={paymentGatewayOpen}
        onClose={() => setPaymentGatewayOpen(false)}
        paymentUrl={paymentUrl}
        onPaymentComplete={(success, data) => {
          if (success) void handlePaymentComplete(data);
          else {
            Alert.alert('Payment Failed', 'Your payment could not be processed.');
          }
        }}
        orderAmount={currentOrder?.total ?? displayTotal}
        orderNumber={currentOrder?.orderNumber}
      />
    </View>
  );
}

function BillRow({
  label,
  value,
  free,
  dash,
  green,
}: {
  label: string;
  value: number;
  free?: boolean;
  dash?: boolean;
  green?: boolean;
}) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, green && { color: GREEN }]}>{label}</Text>
      {free ? (
        <Text style={[styles.billValue, { color: GREEN }]}>FREE</Text>
      ) : dash ? (
        <Text style={styles.billValue}>—</Text>
      ) : (
        <Text style={[styles.billValue, green && { color: GREEN }]}>
          {green ? `−₹${Math.abs(value).toFixed(2)}` : `₹${value.toFixed(2)}`}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: TEXT,
  },
  headerSub: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 1,
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 4,
  },
  heroKicker: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    letterSpacing: 1.4,
    color: ORANGE,
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: TEXT,
    letterSpacing: -0.3,
  },
  heroSub: {
    marginTop: 4,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: TEXT_SEC,
  },
  card: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEyebrow: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: TEXT_MUTED,
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: TEXT,
  },
  cardBody: {
    marginTop: 3,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: TEXT_SEC,
    lineHeight: 18,
  },
  changePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
  },
  changeText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: ORANGE,
  },
  fulfillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  fulfillChip: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  fulfillChipOn: {
    borderColor: ORANGE,
    backgroundColor: '#FFF7ED',
  },
  fulfillText: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: TEXT_SEC,
  },
  fulfillTextOn: {
    color: ORANGE,
    fontFamily: fonts.uiBold,
  },
  itemList: {
    marginTop: 12,
  },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginVertical: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  itemName: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: TEXT,
  },
  itemMeta: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: TEXT_MUTED,
  },
  itemPrice: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: TEXT,
  },
  billCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billLabel: {
    fontFamily: fonts.ui,
    fontSize: 13,
    color: TEXT_SEC,
  },
  billValue: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: TEXT,
  },
  billSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginVertical: 4,
  },
  billTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billTotalLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: TEXT,
  },
  billTotalValue: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: ORANGE_DARK,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    elevation: 12,
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: TEXT,
  },
  emptyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: ORANGE,
  },
  emptyBtnText: {
    fontFamily: fonts.uiBold,
    color: WHITE,
  },
});
