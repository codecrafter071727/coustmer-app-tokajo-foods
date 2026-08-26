import { useState } from 'react';
import {
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Heart, MessageSquare, UtensilsCrossed } from 'lucide-react-native';

import { fonts } from '@/constants/typography';
import {
  useUpdateCartInstructions,
} from '@/lib/cart/hooks';
import { useAuthStore } from '@/store/auth-store';

const ORANGE = '#F97316';
const TEXT = '#0B1220';
const TEXT_SEC = '#64748B';
const TEXT_MUTED = '#94A3B8';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';

type Props = {
  tip: number;
  setTip: (amount: number) => void;
};

const TIP_PRESETS = [0, 20, 30, 50, 80];

export function DeliveryPreferences({ tip, setTip }: Props) {
  const isLoggedIn = Boolean(useAuthStore((s) => s.token));

  const updateInstructions = useUpdateCartInstructions();

  const [cooking, setCooking] = useState('');
  const [cutlery, setCutlery] = useState(false);
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  const syncInstructions = (updates: { cooking?: string; cutlery?: boolean; leaveAtDoor?: boolean }) => {
    if (!isLoggedIn) return;
    updateInstructions.mutate(updates, {
      onSuccess: () => {
        setSavedTick(true);
        setTimeout(() => setSavedTick(false), 1200);
      },
    });
  };

  return (
    <View style={styles.card}>
      {/* Tip */}
      <Text style={styles.cardTitle}>Delivery partner tip</Text>
      <View style={styles.tipRow}>
        {TIP_PRESETS.map((amount) => (
          <TouchableOpacity
            key={amount}
            style={[styles.tipChip, tip === amount && styles.tipChipActive]}
            onPress={() => setTip(amount)}
            activeOpacity={0.7}
          >
            <Text style={[styles.tipChipText, tip === amount && styles.tipChipTextActive]}>
              {amount === 0 ? 'No tip' : `₹${amount}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Instructions */}
      <View style={styles.divider} />
      <Text style={styles.cardTitle}>Delivery instructions</Text>
      <Text style={styles.liveHint}>
        {updateInstructions.isPending
          ? 'Saving instructions...'
          : savedTick
            ? 'Saved to cart'
            : 'These notes are sent to the kitchen live'}
      </Text>

      <View style={styles.instructionRow}>
        <UtensilsCrossed color={TEXT_SEC} size={16} strokeWidth={2} />
        <Text style={styles.instructionLabel}>Include cutlery</Text>
        <Switch
          value={cutlery}
          onValueChange={(v) => {
            setCutlery(v);
            syncInstructions({ cutlery: v, leaveAtDoor, cooking });
          }}
          trackColor={{ true: ORANGE, false: '#E2E8F0' }}
          thumbColor={WHITE}
        />
      </View>

      <View style={styles.instructionRow}>
        <Heart color={TEXT_SEC} size={16} strokeWidth={2} />
        <Text style={styles.instructionLabel}>Leave at door</Text>
        <Switch
          value={leaveAtDoor}
          onValueChange={(v) => {
            setLeaveAtDoor(v);
            syncInstructions({ cutlery, leaveAtDoor: v, cooking });
          }}
          trackColor={{ true: ORANGE, false: '#E2E8F0' }}
          thumbColor={WHITE}
        />
      </View>

      <View style={styles.cookingRow}>
        <MessageSquare color={TEXT_SEC} size={16} strokeWidth={2} />
        <TextInput
          style={styles.cookingInput}
          placeholder="Special cooking request…"
          placeholderTextColor={TEXT_MUTED}
          value={cooking}
          onChangeText={setCooking}
          onBlur={() => syncInstructions({ cutlery, leaveAtDoor, cooking })}
          onSubmitEditing={() => syncInstructions({ cutlery, leaveAtDoor, cooking })}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: TEXT,
    marginBottom: 10,
  },
  liveHint: {
    marginTop: -4,
    marginBottom: 10,
    fontFamily: fonts.ui,
    fontSize: 12,
    color: TEXT_SEC,
  },
  tipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  tipChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FAFAFA',
  },
  tipChipActive: {
    borderColor: ORANGE,
    backgroundColor: '#FFF7ED',
  },
  tipChipText: {
    fontFamily: fonts.uiSemi,
    fontSize: 13,
    color: TEXT_SEC,
  },
  tipChipTextActive: {
    color: ORANGE,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 14,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  instructionLabel: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 14,
    color: TEXT,
  },
  cookingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  cookingInput: {
    flex: 1,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: TEXT,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FAFAFA',
  },
});
