import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  pickupProofUrl?: string | null;
  proofOfDelivery?: string | null;
};

function ProofThumb({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      style={styles.thumbWrap}
      onPress={() => void Linking.openURL(url)}
      accessibilityRole="imagebutton"
      accessibilityLabel={`${label} — open full size`}
    >
      <Image source={{ uri: url }} style={styles.thumb} contentFit="cover" />
      <Text style={styles.thumbLabel}>{label}</Text>
    </Pressable>
  );
}

/** Shows rider parcel photos from live tracking (pickup + drop). */
export function ParcelProofSection({
  pickupProofUrl,
  proofOfDelivery,
}: Props) {
  const pickup =
    typeof pickupProofUrl === 'string' && pickupProofUrl.startsWith('https://')
      ? pickupProofUrl
      : null;
  const drop =
    typeof proofOfDelivery === 'string' && proofOfDelivery.startsWith('https://')
      ? proofOfDelivery
      : null;
  if (!pickup && !drop) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.title}>Delivery photos</Text>
      <Text style={styles.hint}>
        Taken by your partner at pickup and drop — tap to open.
      </Text>
      <View style={styles.row}>
        {pickup ? <ProofThumb label="At restaurant" url={pickup} /> : null}
        {drop ? <ProofThumb label="At your door" url={drop} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 16, gap: 8 },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  hint: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 12 },
  thumbWrap: { flex: 1, maxWidth: '48%', gap: 6 },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  thumbLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
});
