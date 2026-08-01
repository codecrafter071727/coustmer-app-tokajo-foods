import { Check, CheckCircle2, Clock, Package, Truck, X } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { fonts } from '@/constants/typography';
import { normalizeOrderStatus } from '@/lib/order/types';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'out-for-delivery'
  | 'delivered'
  | 'cancelled'
  | 'rejected';

type TimelineStep = {
  status: OrderStatus;
  label: string;
  icon: React.ReactNode;
  timestamp?: string;
};

type Props = {
  currentStatus: string;
  timestamps?: Record<string, string | undefined>;
};

const ORANGE = '#FF6A00';
const INK = '#111827';
const MUTED = '#6B7280';
const LINE = '#E5E7EB';
const WHITE = '#FFFFFF';

const STATUS_ORDER: OrderStatus[] = [
  'pending',
  'accepted',
  'preparing',
  'ready',
  'out-for-delivery',
  'delivered',
];

/** Map API statuses onto the timeline steps */
export function mapToTimelineStatus(status?: string): OrderStatus {
  const s = normalizeOrderStatus(status);
  if (['cancelled', 'canceled'].includes(s)) return 'cancelled';
  if (['rejected', 'failed'].includes(s)) return 'rejected';
  if (['delivered', 'completed'].includes(s)) return 'delivered';
  if (
    s.includes('out') ||
    s.includes('way') ||
    s.includes('pick') ||
    s === 'out_for_delivery' ||
    s === 'on_the_way'
  ) {
    return 'out-for-delivery';
  }
  if (s.includes('ready')) return 'ready';
  if (s.includes('prepar')) return 'preparing';
  if (
    s.includes('accept') ||
    s.includes('confirm') ||
    s === 'confirmed'
  ) {
    return 'accepted';
  }
  return 'pending';
}

export function OrderStatusTimeline({
  currentStatus,
  timestamps = {},
}: Props) {
  const mapped = mapToTimelineStatus(currentStatus);
  const steps: TimelineStep[] = [
    {
      status: 'pending',
      label: 'Order placed',
      icon: <Clock color={WHITE} size={15} strokeWidth={2.4} />,
      timestamp: timestamps.pending || timestamps.createdAt,
    },
    {
      status: 'accepted',
      label: 'Order confirmed',
      icon: <Check color={WHITE} size={15} strokeWidth={2.6} />,
      timestamp: timestamps.accepted || timestamps.acceptedAt,
    },
    {
      status: 'preparing',
      label: 'Preparing',
      icon: <Package color={WHITE} size={15} strokeWidth={2.4} />,
      timestamp: timestamps.preparing || timestamps.preparingAt,
    },
    {
      status: 'ready',
      label: 'Ready',
      icon: <CheckCircle2 color={WHITE} size={15} strokeWidth={2.4} />,
      timestamp: timestamps.ready || timestamps.readyAt,
    },
    {
      status: 'out-for-delivery',
      label: 'Out for delivery',
      icon: <Truck color={WHITE} size={15} strokeWidth={2.4} />,
      timestamp:
        timestamps['out-for-delivery'] ||
        timestamps.out_for_delivery ||
        timestamps.outForDeliveryAt,
    },
    {
      status: 'delivered',
      label: 'Delivered',
      icon: <CheckCircle2 color={WHITE} size={15} strokeWidth={2.4} />,
      timestamp: timestamps.delivered || timestamps.deliveredAt,
    },
  ];

  const currentIndex = Math.max(0, STATUS_ORDER.indexOf(mapped));
  const isRejected = mapped === 'rejected';
  const isCancelled = mapped === 'cancelled';

  if (isRejected || isCancelled) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <View style={[styles.errorIcon, isRejected && styles.rejectedIcon]}>
            <X color={WHITE} size={22} strokeWidth={2.5} />
          </View>
          <Text style={styles.errorTitle}>
            {isRejected ? 'Order rejected' : 'Order cancelled'}
          </Text>
          <Text style={styles.errorSubtitle}>
            {isRejected
              ? 'The restaurant could not fulfill this order'
              : 'This order was cancelled'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Order status</Text>
      <View style={styles.timeline}>
        {steps.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === steps.length - 1;

          return (
            <TimelineItem
              key={step.status}
              step={step}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              isLast={isLast}
              index={index}
            />
          );
        })}
      </View>
    </View>
  );
}

function TimelineItem({
  step,
  isCompleted,
  isCurrent,
  isLast,
  index,
}: {
  step: TimelineStep;
  isCompleted: boolean;
  isCurrent: boolean;
  isLast: boolean;
  index: number;
}) {
  const appear = useSharedValue(0);

  useEffect(() => {
    appear.value = withDelay(
      index * 90,
      withSpring(1, { damping: 14, stiffness: 120 })
    );
  }, [appear, index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + appear.value * 0.6,
    transform: [{ translateY: (1 - appear.value) * 6 }],
  }));

  const timestamp = step.timestamp
    ? new Date(step.timestamp).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <Animated.View style={[styles.timelineItem, animatedStyle]}>
      <View style={styles.timelineLeft}>
        <View
          style={[
            styles.iconContainer,
            isCompleted && styles.iconContainerActive,
            isCurrent && styles.iconContainerCurrent,
          ]}
        >
          {isCompleted ? (
            step.icon
          ) : (
            <View style={styles.idleDot} />
          )}
        </View>

        {!isLast ? (
          <View
            style={[
              styles.connector,
              isCompleted && !isCurrent && styles.connectorActive,
              isCurrent && styles.connectorCurrent,
            ]}
          />
        ) : null}
      </View>

      <View style={styles.timelineContent}>
        <Text
          style={[
            styles.stepLabel,
            isCompleted && styles.stepLabelActive,
            isCurrent && styles.stepLabelCurrent,
          ]}
        >
          {step.label}
        </Text>

        {timestamp && isCompleted ? (
          <Text style={styles.timestamp}>{timestamp}</Text>
        ) : null}

        {isCurrent ? (
          <View style={styles.currentBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.currentText}>In progress</Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: WHITE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 18,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: INK,
    marginBottom: 18,
    letterSpacing: -0.2,
  },
  timeline: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 36,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: LINE,
    zIndex: 2,
  },
  iconContainerActive: {
    backgroundColor: ORANGE,
    borderColor: ORANGE,
  },
  iconContainerCurrent: {
    backgroundColor: ORANGE,
    borderColor: '#FFD7B8',
    borderWidth: 3,
  },
  idleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  connector: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: LINE,
    marginVertical: 4,
    zIndex: 1,
  },
  connectorActive: {
    backgroundColor: ORANGE,
  },
  connectorCurrent: {
    backgroundColor: '#FFD7B8',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: 18,
  },
  stepLabel: {
    fontFamily: fonts.uiSemi,
    fontSize: 14,
    color: MUTED,
  },
  stepLabelActive: {
    color: INK,
    fontFamily: fonts.uiBold,
  },
  stepLabelCurrent: {
    color: ORANGE,
    fontFamily: fonts.displayBold,
  },
  timestamp: {
    fontFamily: fonts.ui,
    fontSize: 12,
    color: MUTED,
    marginTop: 3,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ORANGE,
  },
  currentText: {
    fontFamily: fonts.uiBold,
    fontSize: 12,
    color: ORANGE,
  },
  errorCard: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  rejectedIcon: {
    backgroundColor: '#DC2626',
  },
  errorTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: INK,
  },
  errorSubtitle: {
    marginTop: 6,
    fontFamily: fonts.ui,
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
  },
});
