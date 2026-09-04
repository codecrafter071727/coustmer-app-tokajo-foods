import { Pressable } from '@/components/common/Pressable';
import { useIsFocused } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Bike,
  ChevronRight,
  CreditCard,
  MapPin,
  Minus,
  MoreVertical,
  Plus,
  ShoppingBag,
  Store,
  Tag,
  Wallet,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SmoothPressable } from '@/components/common/SmoothPressable';
import { fonts } from '@/constants/typography';
import {
  useApplyCoupon,
  useCart,
  useCartBill,
  useCartSlots,
  useClearRemoteCart,
  useRemoveCoupon,
  useSetCartSchedule,
  useSaveCart,
  useUpdateCartDeliveryAddress,
  useUpdateCartDeliveryType,
  useUpdateCartTip,
  useValidateCart,
} from '@/lib/cart/hooks';
import { applyServerCartToStore } from '@/lib/cart/sync';
import { syncCartItemQuantity } from '@/lib/order/add-to-cart';
import { DeliveryPreferences } from '@/components/order/DeliveryPreferences';
import { BillDetailsSection } from '@/components/order/BillDetailsSection';
import { AutoFreeDeliveryBanner } from '@/components/order/AutoFreeDeliveryBanner';
import { ScheduleOrderSection } from '@/components/order/ScheduleOrderSection';
import { CartSuggestionsFromStore } from '@/components/order/CartSuggestions';
import { GroupOrderSheet } from '@/components/order/GroupOrderSheet';
import { CouponPickerSheet } from '@/components/order/CouponPickerSheet';
import { useCreateOrder } from '@/lib/order/hooks';
import { DeliveryLocationPicker } from '@/components/location/DeliveryLocationPicker';
import type { DeliveryLocationResult } from '@/components/location/DeliveryLocationPicker';
import { parseDropPin } from '@/lib/location/drop-pin';
import { extractCityFromAddress, normalizeCityName } from '@/lib/location/format';
import { checkoutBlockCopy } from '@/lib/cart/checkout-block';
import { mapBillBreakdown, DEFAULT_DELIVERY_FEE } from '@/lib/cart/bill';
import {
  ensureWalletCoversCheckout,
  payableBeforeWallet,
} from '@/lib/cart/ensure-wallet-checkout';
import { parseDeliveryAddress } from '@/lib/order/parse-address';
import {
  useInitiatePayment,
  usePaymentMethods,
  usePaymentWallet,
  useVerifyPayment,
} from '@/lib/payment/hooks';
import { needsOnlinePayment } from '@/lib/payment/types';
import { generateTestPaymentUrl, simulatePaymentSuccess } from '@/lib/payment/test-urls';
import { useUserProfile } from '@/lib/profile/hooks';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useDeliveryLocationStore } from '@/store/delivery-location-store';
import { paymentMethodLabel } from '@/lib/checkout/payment-display';
import { OrderPlacementModal, PlacementPhase } from '@/components/order/OrderPlacementModal';
import { PaymentGatewayWebView } from '@/components/payment/PaymentGatewayWebView';

// ─── Design tokens ─────────────────────────────────────────────────────────
const BG = '#F4F5F7';
const WHITE = '#FFFFFF';
const ORANGE = '#F97316';
const ORANGE_DARK = '#EA580C';
const TEXT = '#0B1220';
const TEXT_SEC = '#64748B';
const TEXT_MUTED = '#94A3B8';
const BORDER = '#E5E7EB';
const GREEN = '#16A34A';

// ─── Sub-components ─────────────────────────────────────────────────────────

function QuantityStepper({
  quantity,
  onDecrement,
  onIncrement,
  busy,
}: {
  quantity: number;
  onDecrement: () => void;
  onIncrement: () => void;
  busy: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={onDecrement}
        disabled={busy}
        activeOpacity={0.7}
      >
        <Minus color={ORANGE} size={14} strokeWidth={2.6} />
      </TouchableOpacity>
      <Text style={styles.stepQty}>{busy ? '…' : quantity}</Text>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={onIncrement}
        disabled={busy}
        activeOpacity={0.7}
      >
        <Plus color={ORANGE} size={14} strokeWidth={2.6} />
      </TouchableOpacity>
    </View>
  );
}

function CartItemCard({
  item,
  busy,
  onDecrement,
  onIncrement,
}: {
  item: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    imageUrl?: string;
    isVeg?: boolean;
    modifiers?: Array<{ optionName: string; groupName?: string; price?: number }>;
  };
  busy: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const imageUri =
    item.imageUrl ||
    'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=200&h=200&fit=crop';
  const modifierLabel = (item.modifiers ?? [])
    .map((m) => m.optionName)
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.itemCard}>
      <Image
        source={{ uri: imageUri }}
        style={styles.itemImage}
        contentFit="cover"
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        {modifierLabel ? (
          <Text style={styles.itemModifiers} numberOfLines={2}>
            {modifierLabel}
          </Text>
        ) : null}
        <Text style={styles.itemUnitPrice}>₹{item.price.toFixed(0)} each</Text>
        <View style={styles.itemBottomRow}>
          <Text style={styles.itemPrice}>
            ₹{(item.price * item.quantity).toFixed(0)}
          </Text>
          <QuantityStepper
            quantity={item.quantity}
            onDecrement={onDecrement}
            onIncrement={onIncrement}
            busy={busy}
          />
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export function CartScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ checkoutNow?: string }>();
  const insets = useSafeAreaInsets();
  const token = useAuthStore((s) => s.token);
  const authUser = useAuthStore((s) => s.user);
  const isLoggedIn = Boolean(token);

  const restaurant = useCartStore((s) => s.restaurant);
  const items = useCartStore((s) => s.items);
  const specialInstructions = useCartStore((s) => s.specialInstructions);
  const discount = useCartStore((s) => s.discount);
  const couponCode = useCartStore((s) => s.couponCode);
  const deliveryFee = useCartStore((s) => s.deliveryFee);
  const tax = useCartStore((s) => s.tax);
  const deliveryType = useCartStore((s) => s.deliveryType);
  const scheduledFor = useCartStore((s) => s.scheduledFor);
  const clearLocal = useCartStore((s) => s.clearCart);
  const tip = useCartStore((s) => s.tip);
  const setTip = useCartStore((s) => s.setTip);
  const setDeliveryTypeLocal = useCartStore((s) => s.setDeliveryType);
  const subtotal = useCartStore((s) => s.subtotal());
  const estimatedTotal = useCartStore((s) => s.estimatedTotal());
  const serverTotal = useCartStore((s) => s.serverTotal);

  const location = useDeliveryLocationStore((s) => s.location);
  const setDeliveryLocation = useDeliveryLocationStore((s) => s.setLocation);
  const profile = useUserProfile();
  const paymentMethods = usePaymentMethods();
  const wallet = usePaymentWallet();

  const [orderPlacementPhase, setOrderPlacementPhase] = useState<PlacementPhase>('none');

  const remoteCart = useCart();
  const apiCart = remoteCart.data;
  const isFocused = useIsFocused();

  /** Pin for /cart/bill — header location first, then server cart address */
  const billPin = useMemo(() => {
    if (location?.lat != null && location?.lng != null) {
      return { lat: location.lat, lng: location.lng };
    }
    const addr = apiCart?.deliveryAddress;
    if (addr?.lat != null && addr?.lng != null) {
      return { lat: addr.lat, lng: addr.lng };
    }
    return null;
  }, [location?.lat, location?.lng, apiCart?.deliveryAddress]);

  const normalizedDeliveryType =
    deliveryType === 'takeaway' ? ('takeaway' as const) : ('delivery' as const);

  const liveBill = useCartBill(
    billPin?.lat,
    billPin?.lng,
    Boolean(items.length),
    normalizedDeliveryType,
    Boolean(items.length)
  );
  const slots = useCartSlots({ days: 7, enabled: isLoggedIn && items.length > 0 });
  const setSchedule = useSetCartSchedule();
  const clearRemote = useClearRemoteCart();
  const updateAddress = useUpdateCartDeliveryAddress();
  const updateDeliveryType = useUpdateCartDeliveryType();
  const updateTip = useUpdateCartTip();
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();
  const validateCart = useValidateCart();
  const saveCart = useSaveCart();

  const createOrder = useCreateOrder();
  const initiatePayment = useInitiatePayment();
  const verifyPayment = useVerifyPayment();

  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const [paying, setPaying] = useState(false);

  const [paymentGatewayOpen, setPaymentGatewayOpen] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [currentOrder, setCurrentOrder] = useState<any>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherBusy, setVoucherBusy] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [groupOrderOpen, setGroupOrderOpen] = useState(false);
  const [couponPickerOpen, setCouponPickerOpen] = useState(false);

  const couponApplied = Boolean(couponCode);

  const cachedDeliveryFee = Math.max(
    Number(deliveryFee) || 0,
    Number(apiCart?.deliveryFee) || 0
  );

  // Bill: live /cart/bill with store fallback for instant qty/tip updates.
  const billSubtotal = subtotal;
  const displayTip = Math.max(0, Number(tip) || 0);

  const billBreakdown = useMemo(() => {
    if (liveBill.data) return liveBill.data;

    const fee =
      cachedDeliveryFee > 0 ? cachedDeliveryFee : 0;

    return mapBillBreakdown({
      itemsSubtotal: billSubtotal,
      deliveryFee: fee,
      deliveryFeeBase: fee > 0 ? DEFAULT_DELIVERY_FEE : undefined,
      deliveryType: normalizedDeliveryType,
      taxAmount: tax ?? apiCart?.tax ?? 0,
      packagingCharge: (apiCart as { packagingCharge?: number })?.packagingCharge ?? 0,
      platformFee: (apiCart as { platformFee?: number })?.platformFee,
      tipAmount: displayTip,
      discount: discount ?? apiCart?.discount ?? 0,
      grandTotal: serverTotal ?? estimatedTotal,
      superFreeDelivery: (apiCart as { superFreeDelivery?: boolean })?.superFreeDelivery,
      serviceable: fee > 0 ? true : undefined,
    });
  }, [
    liveBill.data,
    billSubtotal,
    cachedDeliveryFee,
    normalizedDeliveryType,
    tax,
    apiCart,
    displayTip,
    discount,
    serverTotal,
    estimatedTotal,
  ]);

  // Validate cart on open so delivery fee is persisted on server (GET /cart/bill needs it).
  useEffect(() => {
    if (!isFocused || !items.length) return;
    if (normalizedDeliveryType === 'takeaway') return;
    if (!billPin) return;
    if (liveBill.data?.billReady && (liveBill.data.deliveryFee > 0 || liveBill.data.superFreeDelivery)) {
      return;
    }

    void validateCart
      .mutateAsync({ dropLat: billPin.lat, dropLng: billPin.lng })
      .then((result) => {
        if (result.cart) applyServerCartToStore(result.cart);
        void liveBill.refetch();
      })
      .catch(() => {
        void liveBill.refetch();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isFocused,
    items.length,
    billPin?.lat,
    billPin?.lng,
    normalizedDeliveryType,
  ]);

  const feeForTotal =
    billBreakdown.billReady && billBreakdown.deliveryFee > 0
      ? billBreakdown.deliveryFee
      : cachedDeliveryFee > 0
      ? cachedDeliveryFee
      : !liveBill.isLoading && (liveBill.isError || !billBreakdown.billReady) && billPin
      ? DEFAULT_DELIVERY_FEE
      : 0;

  const displayTotal = Math.max(
    0,
    billBreakdown.grandTotal > 0
      ? billBreakdown.grandTotal
      : Number(estimatedTotal) ||
          Math.round(
            (billSubtotal +
              feeForTotal +
              billBreakdown.taxesAndChargesTotal +
              displayTip -
              billBreakdown.discount) *
              100
          ) / 100
  );

  const displayDiscount = billBreakdown.discount;

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

  const addressLabel = location?.label || 'Home';
  const addressLine = location?.formattedAddress || 'Add a delivery address';

  useEffect(() => {
    if (couponCode) setVoucherCode(couponCode);
  }, [couponCode]);

  useEffect(() => {
    if (!isLoggedIn || !location?.savedAddressId) return;

    void updateAddress
      .mutateAsync({ addressId: location.savedAddressId })
      .catch((e) => {
        if (__DEV__) {
          console.warn(
            '[cart] PUT /cart/delivery-address failed',
            e instanceof Error ? e.message : e
          );
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.savedAddressId, isLoggedIn]);

  // After placing an order the cart is cleared while tracking is open —
  // that must not call router.back() and yank the user off delivery tracking.
  useEffect(() => {
    if (!isFocused || items.length > 0) return;
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  }, [items.length, isFocused, router]);

  const onRefresh = () => {
    remoteCart.refetch();
    void liveBill.refetch();
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  };

  const syncQty = async (itemId: string, quantity: number) => {
    setBusyId(itemId);
    try {
      const ok = await syncCartItemQuantity(itemId, quantity);
      if (!ok) {
        // Helper already reverted + alerted; refresh from server for safety
        await Promise.all([remoteCart.refetch(), liveBill.refetch()]);
      } else {
        // Reconcile server totals in background without blocking instant UI.
        void remoteCart.refetch();
        void liveBill.refetch();
      }
    } finally {
      setBusyId(null);
    }
  };

  const requireLogin = (action: string) => {
    Alert.alert('Sign in required', `Please sign in to ${action}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign in', onPress: () => router.push('/login') },
    ]);
  };

  const handleTipChange = (nextTip: number) => {
    if (!isLoggedIn) {
      requireLogin('add a delivery tip');
      return;
    }

    const previousTip = tip;
    setTip(nextTip);

    void updateTip
      .mutateAsync({ tip: nextTip })
      .then((cart) => {
        if (typeof cart.tip === 'number') {
          setTip(cart.tip);
        }
        void liveBill.refetch();
      })
      .catch((e) => {
        setTip(previousTip);
        Alert.alert(
          'Could not save tip',
          e instanceof Error
            ? e.message
            : 'Tip was not added to the server bill. Please try again.'
        );
      });
  };

  const handleDeliveryTypeChange = (type: 'delivery' | 'takeaway') => {
    if (!isLoggedIn) {
      requireLogin('change delivery type');
      return;
    }

    if (deliveryType === type) return;

    const previous = deliveryType;
    setDeliveryTypeLocal(type);

    void updateDeliveryType
      .mutateAsync({ deliveryType: type, type })
      .then((cart) => {
        // Hook already hydrates; refresh to lock bill/fees from server
        void remoteCart.refetch();
        if (cart?.deliveryType) {
          setDeliveryTypeLocal(
            cart.deliveryType === 'takeaway' ||
              String(cart.deliveryType).toLowerCase().includes('pick')
              ? 'takeaway'
              : 'delivery'
          );
        }
      })
      .catch((e) => {
        setDeliveryTypeLocal(previous);
        const message =
          e instanceof Error ? e.message : 'Please try again.';
        const lower = message.toLowerCase();
        if (
          lower.includes('auth') ||
          lower.includes('login') ||
          lower.includes('unauthorized') ||
          lower.includes('forbidden') ||
          lower.includes('token')
        ) {
          requireLogin('change delivery type');
          return;
        }
        Alert.alert('Could not update delivery type', message);
      });
  };

  const handleScheduleSlot = (value: string | null) => {
    if (!isLoggedIn) {
      requireLogin('schedule your order');
      return;
    }
    setSchedule
      .mutateAsync(value)
      .then((cart) => {
        useCartStore.getState().setScheduledFor(cart.scheduledFor ?? value);
      })
      .catch((e) => {
        Alert.alert(
          'Could not schedule order',
          e instanceof Error ? e.message : 'Please try again.'
        );
      });
  };

  const handleScheduleNow = () => handleScheduleSlot(null);
  const handleSchedulePick = (startIso: string) => handleScheduleSlot(startIso);

  const handlePaymentComplete = async (success: boolean, data?: any) => {
    setPaymentGatewayOpen(false);

    if (success) {
      setOrderPlacementPhase('placed');
      if (currentOrder) {
        try {
          if (paymentUrl.includes('test') || paymentUrl.includes('httpbin')) {
            const simulatedResult = simulatePaymentSuccess(currentOrder.id, currentOrder.total ?? estimatedTotal);
            console.log('Simulated payment result:', simulatedResult);
          } else {
            await verifyPayment.mutateAsync({
              paymentId: data?.paymentId || 'unknown',
              orderId: currentOrder.id,
              gatewayPaymentId: data?.gatewayPaymentId || data?.paymentId,
              gatewayOrderId: data?.gatewayOrderId,
              gatewaySignature:
                data?.gatewaySignature || data?.razorpay_signature,
              razorpay_payment_id: data?.razorpay_payment_id,
              razorpay_order_id: data?.razorpay_order_id,
              razorpay_signature: data?.razorpay_signature,
              signature: data?.gatewaySignature || data?.razorpay_signature,
              status: 'success',
            });
          }
        } catch (verifyError) {
          console.warn('Payment verification failed:', verifyError);
        }
      }

      await new Promise((r) => setTimeout(r, 1500));
      router.replace({
        pathname: '/orders/[orderId]/tracking',
        params: { orderId: currentOrder?.id || '', newOrder: 'true' },
      });
      setOrderPlacementPhase('none');
    } else {
      Alert.alert(
        'Payment Failed',
        'Your payment could not be processed.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              if (paymentUrl) setPaymentGatewayOpen(true);
            },
          },
          { text: 'Contact Support', onPress: () => router.push('/support') },
        ]
      );
    }
  };

  const handlePaymentGatewayClose = () => {
    Alert.alert(
      'Cancel Payment?',
      'Your order has been placed and can be paid later.',
      [
        { text: 'Continue Payment', style: 'cancel' },
        {
          text: 'Cancel Payment',
          onPress: () => {
            setPaymentGatewayOpen(false);
            if (currentOrder) {
              router.replace({
                pathname: '/orders/[orderId]/tracking',
                params: { orderId: currentOrder.id, newOrder: 'true' },
              });
            }
          },
        },
      ]
    );
  };

  const placeOrder = async () => {
    if (!location) {
      Alert.alert('Address Missing', 'Please select a delivery address');
      return;
    }

    setPaying(true);
    setOrderPlacementPhase('placing');
    try {
      const parsedAddress = parseDeliveryAddress({
        formattedAddress: location.formattedAddress,
        label: location.label,
        city: location.city,
        lat: location.lat,
        lng: location.lng,
      });

      let mappedMethod = paymentMethod;
      let mappedMethodId: string | undefined = undefined;

      if (paymentMethod === 'paytm_upi' || paymentMethod === 'gpay') {
        mappedMethod = 'upi';
      } else if (paymentMethods.data?.some((m) => m.id === paymentMethod)) {
        const saved = paymentMethods.data.find((m) => m.id === paymentMethod);
        if (saved) {
          mappedMethod = saved.type;
          mappedMethodId = saved.id;
        }
      }

      if (mappedMethod === 'wallet') {
        await ensureWalletCoversCheckout({
          payableBeforeWallet: payableBeforeWallet(billBreakdown),
          walletBalance: Number(wallet.data?.balance ?? 0),
        });
        void liveBill.refetch();
      }

      const payload = {
        restaurantId: restaurant!.id,
        restaurantName: restaurant!.name,
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
        scheduledFor: scheduledFor ?? undefined,
        isScheduled: Boolean(scheduledFor),
      };

      const order = await createOrder.mutateAsync(payload as any);
      setCurrentOrder(order);
      const amount = order.total ?? displayTotal;

      if (!needsOnlinePayment(mappedMethod)) {
        setOrderPlacementPhase('placed');
        await new Promise((r) => setTimeout(r, 1500));
        router.replace({
          pathname: '/orders/[orderId]/tracking',
          params: { orderId: order.id, newOrder: 'true' },
        });
        setOrderPlacementPhase('none');
        return;
      }

      let paymentUrlToOpen: string | undefined = undefined;
      let payment: any = null;

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
          payment = await initiatePayment.mutateAsync({
            orderId: order.id,
            amount,
            currency: 'INR',
            method: mappedMethod as any,
            methodId: mappedMethodId,
            description: `Order ${order.orderNumber || order.id}`,
          });

          paymentUrlToOpen =
            payment.paymentUrl ||
            payment.checkoutUrl ||
            payment.redirectUrl ||
            payment.gatewayUrl ||
            payment.url;
        } catch (initiateError) {
          console.error('Payment initiate failed:', initiateError);
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
              {
                text: 'Cash on Delivery',
                onPress: async () => {
                  setOrderPlacementPhase('placed');
                  await new Promise((r) => setTimeout(r, 1000));
                  router.replace({
                    pathname: '/orders/[orderId]/tracking',
                    params: { orderId: order.id, newOrder: 'true' },
                  });
                  setOrderPlacementPhase('none');
                },
              },
              { text: 'Contact Support', onPress: () => router.push('/support') },
            ]
          );
          return;
        }
      }

      if (paymentUrlToOpen && paymentUrlToOpen.startsWith('http')) {
        setPaymentUrl(paymentUrlToOpen);
        setPaymentGatewayOpen(true);
        setOrderPlacementPhase('none');
        return;
      }

      Alert.alert(
        'Payment Issue',
        'No payment URL found.',
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
          {
            text: 'Cash on Delivery',
            onPress: async () => {
              setOrderPlacementPhase('placed');
              await new Promise((r) => setTimeout(r, 1000));
              router.replace({
                pathname: '/orders/[orderId]/tracking',
                params: { orderId: order.id, newOrder: 'true' },
              });
              setOrderPlacementPhase('none');
            },
          },
          { text: 'Contact Support', onPress: () => router.push('/support') },
        ]
      );
    } catch (err: any) {
      console.error('Order placement error:', err);
      Alert.alert('Checkout Failed', err.message || 'Could not place order');
      setOrderPlacementPhase('none');
    } finally {
      setPaying(false);
    }
  };

  const handleClear = () => {
    setMenuOpen(false);
    Alert.alert('Clear cart?', 'Remove all items from your cart.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearRemote.mutateAsync();
            clearLocal();
          } catch (e) {
            clearLocal();
            Alert.alert(
              'Cleared on device',
              e instanceof Error
                ? `Server clear failed: ${e.message}`
                : 'Server cart may still have items — pull to refresh later.'
            );
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    setMenuOpen(false);
    if (!isLoggedIn) {
      Alert.alert('Sign in required', 'Log in to save carts for later.');
      return;
    }
    try {
      await saveCart.mutateAsync({
        name: restaurant?.name
          ? `${restaurant.name} · ${new Date().toLocaleDateString()}`
          : undefined,
      });
      Alert.alert('Saved', 'Cart saved for later');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again');
    }
  };

  const handleCheckout = async () => {
    try {
      // Ensure tip is on the backend cart before validate / place order
      if (isLoggedIn && tip >= 0) {
        try {
          await updateTip.mutateAsync({ tip });
        } catch (tipErr) {
          if (tip > 0) {
            Alert.alert(
              'Tip not saved',
              tipErr instanceof Error
                ? tipErr.message
                : 'Could not add tip to the server bill. Try again or remove the tip.'
            );
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
        return;
      }

      const result = await validateCart.mutateAsync(pin ?? {});
      if (result.cart) {
        applyServerCartToStore(result.cart);
      }
      if (!result.valid) {
        const code = result.code || result.issues[0]?.code;
        const needsPin =
          code === 'DROP_PIN_REQUIRED' ||
          (result.message ?? '').toLowerCase().includes('drop pin');
        const msg =
          result.issues.map((i) => i.message).join('\n') ||
          result.message ||
          'Cart validation failed';
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
          const copy = checkoutBlockCopy(code, msg);
          Alert.alert(copy.title, copy.message, [
            { text: 'OK' },
            ...(code === 'OUT_OF_ZONE'
              ? [{ text: 'Change pin', onPress: () => setLocationOpen(true) }]
              : []),
          ]);
        }
        void remoteCart.refetch();
        return;
      }
    } catch (e) {
      Alert.alert(
        'Could not validate cart',
        e instanceof Error
          ? e.message
          : 'Check your connection and try again before placing the order.'
      );
      return;
    }
    placeOrder();
  };

  useEffect(() => {
    if (params.checkoutNow === '1') {
      router.replace('/cart/summary' as import('expo-router').Href);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.checkoutNow]);

  const handleApplyVoucher = async () => {
    const code = voucherCode.trim();
    if (!code) {
      Alert.alert('Enter a voucher code');
      return;
    }
    if (!isLoggedIn) {
      requireLogin('apply a promo code');
      return;
    }
    setVoucherBusy(true);
    try {
      const cart = await applyCoupon.mutateAsync({ code });
      const saved =
        cart.coupon?.code?.trim() || code.toUpperCase();
      setVoucherCode(saved);
      Alert.alert(
        'Promo applied',
        cart.discount > 0
          ? `${saved} applied · ₹${Math.round(cart.discount)} off`
          : `${saved} applied to your cart`
      );
    } catch (e) {
      Alert.alert(
        'Could not apply promo',
        e instanceof Error ? e.message : 'This code could not be applied'
      );
    } finally {
      setVoucherBusy(false);
    }
  };

  const handleRemoveVoucher = async () => {
    if (!isLoggedIn) {
      requireLogin('remove a promo code');
      return;
    }
    setVoucherBusy(true);
    try {
      await removeCoupon.mutateAsync();
      setVoucherCode('');
      Alert.alert('Promo removed', 'Coupon removed from your cart');
    } catch (e) {
      Alert.alert(
        'Could not remove promo',
        e instanceof Error ? e.message : 'Try again'
      );
    } finally {
      setVoucherBusy(false);
    }
  };

  // ── Loading / Empty states ──────────────────────────────────────────────
  if (remoteCart.isLoading && !items.length) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={ORANGE} size="large" />
          <Text style={styles.loadingText}>Loading cart…</Text>
        </View>
      </View>
    );
  }

  if (!items.length || !restaurant) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.topBar}>
          <SmoothPressable onPress={goBack} style={styles.iconBtn} pressScale={0.9}>
            <ArrowLeft color={TEXT} size={22} strokeWidth={2.2} />
          </SmoothPressable>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={styles.iconBtn} />
        </View>
        <View style={styles.emptyWrap}>
          <ShoppingBag color={TEXT_MUTED} size={80} strokeWidth={1.2} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Add items from a restaurant to get started</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.replace('/home')}
            activeOpacity={0.85}
          >
            <Text style={styles.browseBtnText}>Browse Restaurants</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const footerPad = Math.max(insets.bottom, 12);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.root, { backgroundColor: BG }]}>
        {/* ── Top Bar ─────────────────────────────────────────────── */}
        <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
          <SmoothPressable onPress={goBack} style={styles.iconBtn} pressScale={0.9}>
            <View style={styles.backBtnCircle}>
              <ArrowLeft color={TEXT} size={20} strokeWidth={2} />
            </View>
          </SmoothPressable>

          <Text style={styles.headerTitle}>Cart</Text>

          <SmoothPressable
            onPress={() => setMenuOpen(true)}
            style={styles.iconBtn}
            pressScale={0.9}
          >
            <MoreVertical color={TEXT} size={20} strokeWidth={2} />
          </SmoothPressable>
        </View>

        {/* ── Scroll Content ─────────────────────────────────────── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 110 + footerPad },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={remoteCart.isRefetching}
              onRefresh={onRefresh}
              tintColor={ORANGE}
            />
          }
        >
          {/* Address */}
          <Pressable
            style={styles.addressCard}
            onPress={() => setLocationOpen(true)}
          >
            <View style={styles.addressIcon}>
              <MapPin color={ORANGE} size={16} strokeWidth={2.4} />
            </View>
            <View style={styles.addressBody}>
              <Text style={styles.addressEyebrow}>Deliver to {addressLabel}</Text>
              <Text style={styles.addressLine} numberOfLines={1}>
                {addressLine}
              </Text>
            </View>
            <Text style={styles.addressChange}>Change</Text>
          </Pressable>

          {/* Items */}
          <View style={styles.section}>
            {restaurant ? (
              <View style={styles.restaurantHeader}>
                <View style={styles.restaurantIcon}>
                  <Store color={ORANGE} size={16} strokeWidth={2.3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.restaurantTitle}>Ordering from</Text>
                  <Text style={styles.restaurantName} numberOfLines={1}>
                    {restaurant.name}
                  </Text>
                </View>
              </View>
            ) : null}

            {items.map((item, index) => (
              <View key={item.id}>
                {index > 0 ? <View style={styles.itemDivider} /> : null}
                <CartItemCard
                  item={item}
                  busy={busyId === item.id}
                  onDecrement={() => syncQty(item.id, item.quantity - 1)}
                  onIncrement={() => syncQty(item.id, item.quantity + 1)}
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.addMoreBtn}
              activeOpacity={0.7}
              onPress={() => {
                if (restaurant?.id) {
                  router.push(`/restaurants/${restaurant.id}`);
                } else {
                  router.push('/home');
                }
              }}
            >
              <Plus color={ORANGE} size={16} strokeWidth={2.5} />
              <Text style={styles.addMoreText}>Add more items</Text>
            </TouchableOpacity>
          </View>

          <CartSuggestionsFromStore />

          {/* Delivery type */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fulfillment</Text>
            <View style={styles.deliveryTypeRow}>
              <TouchableOpacity
                style={[
                  styles.deliveryTypeChip,
                  deliveryType === 'delivery' && styles.deliveryTypeChipOn,
                ]}
                onPress={() => handleDeliveryTypeChange('delivery')}
                activeOpacity={0.8}
              >
                <Bike
                  color={deliveryType === 'delivery' ? ORANGE : TEXT_SEC}
                  size={16}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.deliveryTypeText,
                    deliveryType === 'delivery' && styles.deliveryTypeTextOn,
                  ]}
                >
                  Delivery
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.deliveryTypeChip,
                  deliveryType === 'takeaway' && styles.deliveryTypeChipOn,
                ]}
                onPress={() => handleDeliveryTypeChange('takeaway')}
                activeOpacity={0.8}
              >
                <Store
                  color={deliveryType === 'takeaway' ? ORANGE : TEXT_SEC}
                  size={16}
                  strokeWidth={2.2}
                />
                <Text
                  style={[
                    styles.deliveryTypeText,
                    deliveryType === 'takeaway' && styles.deliveryTypeTextOn,
                  ]}
                >
                  Takeaway
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScheduleOrderSection
            scheduleData={slots.data}
            isLoading={slots.isLoading}
            isError={slots.isError}
            scheduledFor={scheduledFor}
            busy={setSchedule.isPending}
            onSelectNow={handleScheduleNow}
            onSelectSlot={handleSchedulePick}
          />

          <DeliveryPreferences tip={tip} setTip={handleTipChange} />

          {normalizedDeliveryType === 'delivery' && items.length > 0 ? (
            <AutoFreeDeliveryBanner
              bill={billBreakdown}
              deliveryType={normalizedDeliveryType}
            />
          ) : null}

          {/* Promo */}
          <View style={styles.voucherCard}>
            <View style={styles.voucherIconWrap}>
              <Tag color={ORANGE} size={16} strokeWidth={2.2} />
            </View>
            <TextInput
              style={styles.voucherInput}
              placeholder="Promo code"
              placeholderTextColor={TEXT_MUTED}
              value={voucherCode}
              onChangeText={setVoucherCode}
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleApplyVoucher();
              }}
              editable={!couponApplied && !voucherBusy}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.voucherBtn}
              onPress={() => {
                if (voucherBusy) return;
                if (couponApplied) void handleRemoveVoucher();
                else void handleApplyVoucher();
              }}
              activeOpacity={0.7}
              disabled={voucherBusy}
            >
              {voucherBusy ? (
                <ActivityIndicator color={ORANGE} size="small" />
              ) : (
                <Text style={styles.voucherAction}>
                  {couponApplied ? 'Remove' : 'Apply'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Browse coupons */}
          {!couponApplied && isLoggedIn && (
            <TouchableOpacity
              style={styles.browseCouponsBtn}
              onPress={() => setCouponPickerOpen(true)}
              activeOpacity={0.8}
            >
              <Tag color={ORANGE} size={14} strokeWidth={2.3} />
              <Text style={styles.browseCouponsText}>Browse all offers</Text>
            </TouchableOpacity>
          )}

          {/* Payment preview — change on order summary */}
          <View style={styles.paymentCard}>
            <View style={styles.paymentIconWrap}>
              {paymentMethod === 'cod' ? (
                <Bike color={ORANGE} size={18} strokeWidth={2.3} />
              ) : paymentMethod === 'wallet' ? (
                <Wallet color={ORANGE} size={18} strokeWidth={2.3} />
              ) : (
                <CreditCard color={ORANGE} size={18} strokeWidth={2.3} />
              )}
            </View>
            <View style={styles.paymentBody}>
              <Text style={styles.paymentEyebrow}>PAY USING</Text>
              <Text style={styles.paymentTitle} numberOfLines={1}>
                {paymentMethodLabel(paymentMethod, paymentMethods.data)}
              </Text>
              <Text style={styles.paymentHint} numberOfLines={1}>
                Change payment on order summary
              </Text>
            </View>
          </View>

          {/* Bill */}
          <BillDetailsSection
            bill={billBreakdown}
            itemCount={items.reduce((n, i) => n + i.quantity, 0)}
            couponCode={couponCode}
            displayTip={displayTip}
            fallbackTotal={displayTotal}
            hasDeliveryPin={Boolean(billPin) || normalizedDeliveryType === 'takeaway'}
            billLoading={liveBill.isLoading && !billBreakdown.billReady}
            billError={liveBill.isError}
          />
        </ScrollView>

        {/* ── Bottom Checkout Bar ─────────────────────────────────── */}
        <View style={[styles.checkoutBar, { paddingBottom: footerPad }]}>
          <TouchableOpacity
            style={styles.checkoutBtn}
            onPress={() => {
              router.push('/cart/summary' as import('expo-router').Href);
            }}
            disabled={
              voucherBusy ||
              Boolean(busyId) ||
              applyCoupon.isPending ||
              removeCoupon.isPending
            }
            activeOpacity={0.9}
          >
            <View>
              <Text style={styles.checkoutPrice}>
                ₹{displayTotal.toFixed(2)}
              </Text>
              <Text style={styles.checkoutSub}>TOTAL</Text>
            </View>
            <View style={styles.checkoutLabelWrap}>
              <Text style={styles.checkoutLabel}>Order summary</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Overflow Menu Modal ─────────────────────────────────── */}
        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setMenuOpen(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setMenuOpen(false)}
          >
            <View style={[styles.menuSheet, { top: insets.top + 56 }]}>
              <Pressable style={styles.menuItem} onPress={handleSave}>
                <Text style={styles.menuItemText}>Save cart for later</Text>
              </Pressable>
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  router.push('/cart/saved' as import('expo-router').Href);
                }}
              >
                <Text style={styles.menuItemText}>View saved carts</Text>
              </Pressable>
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  if (!isLoggedIn) { requireLogin('start a group order'); return; }
                  setGroupOrderOpen(true);
                }}
              >
                <Text style={styles.menuItemText}>👥 Group order</Text>
              </Pressable>
              <Pressable style={styles.menuItem} onPress={handleClear}>
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>
                  Clear cart
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        {/* ── Order Placement Modal ───────────────────────────────── */}
        <OrderPlacementModal
          phase={orderPlacementPhase}
          addressLabel={addressLabel}
          addressText={addressLine}
          savings={discount}
        />

        {/* ── Payment Gateway WebView ─────────────────────────────── */}
        <PaymentGatewayWebView
          visible={paymentGatewayOpen}
          onClose={handlePaymentGatewayClose}
          paymentUrl={paymentUrl}
          onPaymentComplete={handlePaymentComplete}
          orderAmount={currentOrder?.total ?? estimatedTotal}
          orderNumber={currentOrder?.orderNumber}
        />

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
          initial={location ? { lat: location.lat, lng: location.lng } : null}
        />

        {/* Group Order Sheet */}
        <GroupOrderSheet
          visible={groupOrderOpen}
          onClose={() => setGroupOrderOpen(false)}
        />

        {/* Coupon Picker Sheet */}
        <CouponPickerSheet
          visible={couponPickerOpen}
          onClose={() => setCouponPickerOpen(false)}
          restaurantId={restaurant?.id}
          lat={location?.lat}
          lng={location?.lng}
          subtotal={subtotal}
          onApplied={(code) => {
            setVoucherCode(code);
            setCouponPickerOpen(false);
          }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },

  // ── Loading ──
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: fonts.uiMedium,
    fontSize: 15,
    color: TEXT_SEC,
  },

  // ── Empty ──
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: TEXT,
    marginTop: 16,
  },
  emptySubtitle: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: TEXT_SEC,
    textAlign: 'center',
    lineHeight: 20,
  },
  browseBtn: {
    marginTop: 8,
    backgroundColor: ORANGE,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 30,
  },
  browseBtnText: {
    fontFamily: fonts.uiBold,
    fontSize: 15,
    color: WHITE,
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: WHITE,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: TEXT,
    letterSpacing: -0.3,
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },

  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressBody: {
    flex: 1,
  },
  addressEyebrow: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: TEXT,
  },
  addressLine: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: TEXT_SEC,
  },
  addressChange: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: ORANGE,
  },

  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 12,
  },
  cardTitle: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: TEXT,
    marginBottom: 2,
  },

  // ── Section card (items) ──
  section: {
    backgroundColor: WHITE,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BORDER,
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  restaurantIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantTitle: {
    fontFamily: fonts.uiMedium,
    fontSize: 11,
    color: TEXT_SEC,
  },
  restaurantName: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: TEXT,
  },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginHorizontal: 14,
  },
  addMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    margin: 12,
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
  },
  addMoreText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: ORANGE,
  },

  // ── Cart Item Card ──
  itemCard: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    alignItems: 'center',
  },
  itemImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: TEXT,
  },
  itemModifiers: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: ORANGE,
    marginTop: 1,
  },
  itemUnitPrice: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: TEXT_MUTED,
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  itemPrice: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: TEXT,
  },

  // ── Stepper ──
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    height: 34,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 32,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepQty: {
    minWidth: 26,
    textAlign: 'center',
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: TEXT,
  },

  deliveryTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  deliveryTypeChip: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  deliveryTypeChipOn: {
    borderColor: ORANGE,
    backgroundColor: '#FFF7ED',
  },
  deliveryTypeText: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: TEXT_SEC,
  },
  deliveryTypeTextOn: {
    color: ORANGE,
    fontFamily: fonts.uiBold,
  },
  scheduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FAFAFA',
  },
  scheduleChipActive: {
    borderColor: ORANGE,
    backgroundColor: '#FFF7ED',
  },
  scheduleChipText: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: TEXT_SEC,
  },
  scheduleChipTextActive: {
    color: ORANGE,
    fontFamily: fonts.uiBold,
  },
  scheduleHint: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: TEXT_SEC,
  },

  // ── Voucher Card ──
  voucherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  voucherIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voucherInput: {
    flex: 1,
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: TEXT,
    paddingVertical: 8,
  },
  voucherBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  voucherAction: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: ORANGE,
  },
  browseCouponsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
  },
  browseCouponsText: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: ORANGE,
  },

  // ── Payment ──
  paymentCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  paymentIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentBody: {
    flex: 1,
    gap: 2,
  },
  paymentEyebrow: {
    fontFamily: fonts.uiBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: TEXT_MUTED,
  },
  paymentTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: TEXT,
  },
  paymentHint: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: TEXT_SEC,
  },
  paymentChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  paymentChangeText: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: ORANGE,
  },

  // ── Bill Card ──
  billCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  billHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  billTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: TEXT,
  },
  billItemsPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  billItemsPillText: {
    fontFamily: fonts.uiBold,
    fontSize: 11,
    color: ORANGE_DARK,
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
  billFree: {
    color: GREEN,
    fontFamily: fonts.uiBold,
  },
  billSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginVertical: 4,
  },
  savingsBox: {
    marginTop: 2,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  savingsTitle: {
    fontFamily: fonts.uiSemi,
    fontSize: 12,
    color: '#166534',
  },
  savingsValue: {
    fontFamily: fonts.uiBold,
    fontSize: 13,
    color: '#166534',
  },
  billTotalLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: TEXT,
  },
  billTotalValue: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: TEXT,
  },
  billFooterHint: {
    marginTop: 2,
    fontFamily: fonts.ui,
    fontSize: 11,
    color: TEXT_MUTED,
  },

  // ── Checkout Bar ──
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
  },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ORANGE,
    borderRadius: 16,
    minHeight: 56,
    paddingLeft: 18,
    paddingRight: 8,
    paddingVertical: 8,
  },
  checkoutPrice: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: WHITE,
  },
  checkoutSub: {
    fontFamily: fonts.uiMedium,
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.6,
    marginTop: 1,
  },
  checkoutLabelWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
    borderRadius: 12,
    minHeight: 40,
    paddingHorizontal: 18,
  },
  checkoutLabel: {
    fontFamily: fonts.uiBold,
    fontSize: 14,
    color: ORANGE_DARK,
  },

  // ── Overflow Menu ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  menuSheet: {
    position: 'absolute',
    right: 14,
    backgroundColor: WHITE,
    borderRadius: 14,
    minWidth: 200,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  menuItem: {
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  menuItemText: {
    fontFamily: fonts.uiMedium,
    fontSize: 14,
    color: TEXT,
  },
});
