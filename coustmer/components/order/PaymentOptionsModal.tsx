import { Pressable } from '@/components/common/Pressable';
import { ArrowLeft, CheckCircle2, ChevronRight, Circle, CreditCard, Landmark, Plus, Receipt, Truck, Wallet } from 'lucide-react-native';
import { Alert, Modal,  ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { SavedPaymentMethod, WalletSummary } from '@/lib/payment/types';

type PaymentMethod = string;

type Props = {
  visible: boolean;
  onClose: () => void;
  selectedMethod: string;
  onSelectMethod: (method: string) => void;
  itemCount: number;
  total: number;
  savings: number;
  restaurantName: string;
  deliveryTime?: string;
  addressLabel: string;
  addressText: string;
  onPay: (method: string) => void;
  savedMethods?: SavedPaymentMethod[];
  wallet?: WalletSummary;
};

export function PaymentOptionsModal({
  visible,
  onClose,
  selectedMethod,
  onSelectMethod,
  itemCount,
  total,
  savings,
  restaurantName,
  deliveryTime,
  addressLabel,
  addressText,
  onPay,
  savedMethods,
  wallet,
}: Props) {
  const router = useRouter();

  const savedCards = savedMethods?.filter((m) => m.type === 'card') || [];
  const savedUpis = savedMethods?.filter((m) => m.type === 'upi') || [];

  const handleWalletSelect = () => {
    if (wallet && wallet.balance < total) {
      const diff = total - wallet.balance;
      Alert.alert(
        'Insufficient Balance',
        `You need ₹${diff.toFixed(0)} more in your wallet to pay for this order.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Top Up Now', 
            onPress: () => {
              onClose();
              router.push('/profile/wallet' as import('expo-router').Href);
            }
          }
        ]
      );
    } else {
      onSelectMethod('wallet');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView edges={['bottom']} style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton} hitSlop={10}>
            <ArrowLeft color="#1C1C1C" size={24} />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Payment Options</Text>
            <Text style={styles.headerSubtitle}>
              {itemCount} item{itemCount !== 1 ? 's' : ''} • Total: ₹{total.toFixed(0)} • <Text style={styles.savingsText}>Savings of ₹{savings.toFixed(0)}</Text>
            </Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          <View style={styles.addressStrip}>
            <View style={styles.timeline}>
              <View style={styles.timelineDotTop} />
              <View style={styles.timelineLine} />
              <View style={styles.timelineDotBottom} />
            </View>
            <View style={styles.addressInfo}>
              <Text style={styles.addressRow} numberOfLines={1}>
                <Text style={styles.addressName}>{restaurantName}</Text>
                {deliveryTime ? (
                  <Text style={styles.addressDesc}>
                    {' '}
                    | Delivery in: {deliveryTime}
                  </Text>
                ) : null}
              </Text>
              <Text style={styles.addressRow} numberOfLines={1}>
                <Text style={styles.addressName}>{addressLabel}</Text>
                <Text style={styles.addressDesc}> | {addressText}</Text>
              </Text>
            </View>
          </View>

          <Pressable style={styles.offersBanner}>
            <View style={styles.offersLeft}>
              <View style={styles.percentBadge}>
                <Text style={styles.percentText}>%</Text>
              </View>
              <Text style={styles.offersText}>Save more with payment offers</Text>
            </View>
            <ChevronRight color="#00A160" size={20} />
          </Pressable>

          <View style={styles.swiggyUpiBanner}>
            <View style={styles.swiggyUpiContent}>
              <Text style={styles.swiggyUpiTitle}>UPI payments, now 3X Faster</Text>
              <Text style={styles.swiggyUpiDesc}>Unlock faster in-app UPI for instant payments!</Text>
              <Pressable style={styles.swiggyUpiBtn}>
                <Text style={styles.swiggyUpiBtnText}>Activate in 10s</Text>
              </Pressable>
            </View>
            <View style={styles.swiggyUpiLogo}>
              <Text style={styles.swiggyUpiLogoText}>TOKAJO</Text>
              <Text style={styles.swiggyUpiLogoBadge}>UPI</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Preferred Payment</Text>
          <View style={styles.cardGroup}>
            <Pressable
              style={styles.cardItem}
              onPress={() => onSelectMethod('paytm_upi')}
            >
              <View style={styles.cardRow}>
                <View style={styles.iconBox}>
                  <Text style={styles.paytmText}>paytm</Text>
                </View>
                <Text style={styles.cardItemText}>Paytm UPI</Text>
                {selectedMethod === 'paytm_upi' ? (
                  <CheckCircle2 color="#00A160" fill="#00A160" size={24} />
                ) : (
                  <Circle color="#D3D3D3" size={24} />
                )}
              </View>
            </Pressable>
          </View>

          {savedUpis.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Saved UPI IDs</Text>
              <View style={styles.cardGroup}>
                {savedUpis.map((upi, index) => (
                  <View key={upi.id}>
                    <Pressable style={styles.cardItem} onPress={() => onSelectMethod(upi.id)}>
                      <View style={styles.cardRow}>
                        <View style={[styles.iconBox, { borderColor: '#E5E5E5', borderWidth: 1 }]}>
                          <Text style={{ fontSize: 10, fontWeight: 'bold' }}>UPI</Text>
                        </View>
                        <View style={styles.cardItemBody}>
                          <Text style={styles.cardItemText}>{upi.upiId}</Text>
                          <Text style={styles.cardItemSubtext}>Saved UPI ID</Text>
                        </View>
                        {selectedMethod === upi.id ? (
                          <CheckCircle2 color="#00A160" fill="#00A160" size={24} />
                        ) : (
                          <Circle color="#D3D3D3" size={24} />
                        )}
                      </View>
                    </Pressable>
                    {index < savedUpis.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </>
          )}

          <Text style={styles.sectionTitle}>Pay by any UPI App</Text>
          <View style={styles.cardGroup}>
            <Pressable style={styles.cardItem}>
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, { borderColor: '#E5E5E5', borderWidth: 1 }]}>
                  <Text style={styles.swiggyIconText}>TOKAJO</Text>
                  <Text style={styles.swiggyIconUpi}>UPI</Text>
                </View>
                <View style={styles.cardItemBody}>
                  <View style={styles.cardItemTitleRow}>
                    <Text style={styles.cardItemText}>Unlock Tokajo Foods UPI</Text>
                    <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                  </View>
                  <Text style={styles.cardItemSubtext}>Activate fastest UPI in 10 seconds</Text>
                </View>
                <ChevronRight color="#A0A0A0" size={20} />
              </View>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.cardItem} onPress={() => onSelectMethod('gpay')}>
              <View style={styles.cardRow}>
                <View style={styles.iconBox}>
                  <Text style={styles.gpayText}>GPay</Text>
                </View>
                <Text style={styles.cardItemText}>Google Pay</Text>
                {selectedMethod === 'gpay' ? (
                  <CheckCircle2 color="#00A160" fill="#00A160" size={24} />
                ) : (
                  <Circle color="#D3D3D3" size={24} />
                )}
              </View>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Credit & Debit Cards</Text>
          <View style={styles.cardGroup}>
            {savedCards.map((card) => (
              <View key={card.id}>
                <Pressable style={styles.cardItem} onPress={() => onSelectMethod(card.id)}>
                  <View style={styles.cardRow}>
                    <View style={[styles.iconBox, { borderColor: '#E5E5E5', borderWidth: 1 }]}>
                      <CreditCard color="#555" size={20} />
                    </View>
                    <View style={styles.cardItemBody}>
                      <Text style={styles.cardItemText}>
                        {card.brand ? card.brand.toUpperCase() : 'CARD'} •••• {card.last4}
                      </Text>
                      <Text style={styles.cardItemSubtext}>
                        Expires {card.expiryMonth}/{card.expiryYear}
                      </Text>
                    </View>
                    {selectedMethod === card.id ? (
                      <CheckCircle2 color="#00A160" fill="#00A160" size={24} />
                    ) : (
                      <Circle color="#D3D3D3" size={24} />
                    )}
                  </View>
                </Pressable>
                <View style={styles.divider} />
              </View>
            ))}
            <Pressable style={styles.cardItem} onPress={() => onSelectMethod('card')}>
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, { borderColor: '#E5E5E5', borderWidth: 1 }]}>
                  <Plus color="#F15700" size={20} />
                </View>
                <View style={styles.cardItemBody}>
                  <Text style={[styles.cardItemText, { color: '#F15700' }]}>Add New Card</Text>
                  <Text style={styles.cardItemSubtext}>Save and Pay via Cards.</Text>
                </View>
                {selectedMethod === 'card' ? (
                  <CheckCircle2 color="#00A160" fill="#00A160" size={24} />
                ) : (
                  <Circle color="#D3D3D3" size={24} />
                )}
              </View>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>More Payment Options</Text>
          <View style={styles.cardGroup}>
            <Pressable style={styles.cardItem}>
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, { borderColor: '#E5E5E5', borderWidth: 1 }]}><Receipt color="#555" size={18} /></View>
                <Text style={styles.cardItemText}>Pay Later</Text>
                <ChevronRight color="#A0A0A0" size={20} />
              </View>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.cardItem}>
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, { borderColor: '#E5E5E5', borderWidth: 1 }]}><CreditCard color="#555" size={18} /></View>
                <View style={styles.cardItemBody}>
                  <Text style={styles.cardItemText}>Pluxee</Text>
                  <Text style={styles.cardItemSubtext}>Pluxee card valid only on Food & Instamart</Text>
                </View>
                <ChevronRight color="#A0A0A0" size={20} />
              </View>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.cardItem} onPress={handleWalletSelect}>
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, { borderColor: '#E5E5E5', borderWidth: 1 }]}><Wallet color="#555" size={18} /></View>
                <View style={styles.cardItemBody}>
                  <Text style={styles.cardItemText}>Wallets</Text>
                  <Text style={styles.cardItemSubtext}>
                    {wallet ? `Balance: ₹${wallet.balance.toFixed(0)}` : 'PhonePe, Amazon Pay & more'}
                  </Text>
                </View>
                {selectedMethod === 'wallet' ? (
                  <CheckCircle2 color="#00A160" fill="#00A160" size={24} />
                ) : (
                  <ChevronRight color="#A0A0A0" size={20} />
                )}
              </View>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.cardItem}>
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, { borderColor: '#E5E5E5', borderWidth: 1 }]}><Landmark color="#555" size={18} /></View>
                <View style={styles.cardItemBody}>
                  <Text style={styles.cardItemText}>Netbanking</Text>
                  <Text style={styles.cardItemSubtext}>Select from a list of banks</Text>
                </View>
                <ChevronRight color="#A0A0A0" size={20} />
              </View>
            </Pressable>
          </View>

          <Text style={styles.sectionTitle}>Pay on Delivery</Text>
          <View style={styles.cardGroup}>
            <Pressable
              style={[styles.cardItem, selectedMethod !== 'cod' && { opacity: 0.8 }]}
              onPress={() => onSelectMethod('cod')}
            >
              <View style={styles.cardRow}>
                <View style={[styles.iconBox, { borderColor: '#E5E5E5', borderWidth: 1, backgroundColor: '#F9F9F9' }]}>
                  <Truck color="#888" size={20} />
                </View>
                <View style={styles.cardItemBody}>
                  <Text style={styles.cardItemText}>Pay on Delivery (Cash/UPI)</Text>
                  <Text style={styles.cardItemSubtext}>Pay with cash or UPI at your doorstep.</Text>
                </View>
                {selectedMethod === 'cod' ? (
                  <CheckCircle2 color="#00A160" fill="#00A160" size={24} />
                ) : (
                  <Circle color="#D3D3D3" size={24} />
                )}
              </View>
            </Pressable>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#555555',
    fontWeight: '500',
  },
  savingsText: {
    color: '#00A160',
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  addressStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  timeline: {
    alignItems: 'center',
    marginRight: 12,
  },
  timelineDotTop: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#60A5FA',
    backgroundColor: '#FFFFFF',
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: '#E5E7EB',
    marginVertical: 2,
  },
  timelineDotBottom: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#8B5CF6',
    backgroundColor: '#FFFFFF',
  },
  addressInfo: {
    flex: 1,
    gap: 12,
  },
  addressRow: {
    fontSize: 13,
  },
  addressName: {
    fontWeight: '600',
    color: '#1C1C1C',
  },
  addressDesc: {
    color: '#777777',
  },
  offersBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
  },
  offersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00A160',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  percentText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  offersText: {
    color: '#00A160',
    fontWeight: '600',
    fontSize: 14,
  },
  swiggyUpiBanner: {
    flexDirection: 'row',
    backgroundColor: '#1C5C50',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  swiggyUpiContent: {
    flex: 1,
    paddingRight: 16,
  },
  swiggyUpiTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  swiggyUpiDesc: {
    color: '#A7F3D0',
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  swiggyUpiBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  swiggyUpiBtnText: {
    color: '#1C5C50',
    fontWeight: '700',
    fontSize: 12,
  },
  swiggyUpiLogo: {
    alignItems: 'center',
  },
  swiggyUpiLogoText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  swiggyUpiLogoBadge: {
    color: '#1C5C50',
    backgroundColor: '#FDE047',
    paddingHorizontal: 4,
    borderRadius: 2,
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardItem: {
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paytmText: {
    color: '#00BAF2',
    fontWeight: '900',
    fontSize: 12,
  },
  gpayText: {
    color: '#4285F4',
    fontWeight: '900',
    fontSize: 12,
  },
  swiggyIconText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#333',
  },
  swiggyIconUpi: {
    fontSize: 8,
    fontWeight: '700',
    color: '#F15700',
  },
  cardItemBody: {
    flex: 1,
  },
  cardItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1C',
  },
  cardItemSubtext: {
    fontSize: 12,
    color: '#777777',
    marginTop: 2,
  },
  newBadge: {
    backgroundColor: '#F15700',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  payBtn: {
    backgroundColor: '#00A160',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    marginLeft: 48,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 64,
  }
});
