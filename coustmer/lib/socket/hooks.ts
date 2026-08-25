/**
 * Socket hooks — customer app.
 * Each hook subscribes to one or more server→client events and returns live state.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  emitTyping,
  getSocket,
  sendChatMessage,
  trackOrder,
} from '@/lib/socket/socket';
import type {
  ChatMessageEvent,
  ServerToClientEvents,
} from '@/lib/socket/types';

// ─── Generic on/off helper ────────────────────────────────────────────────────

type EventName = keyof ServerToClientEvents;
type EventCallback<E extends EventName> = ServerToClientEvents[E];

function useSocketEvent<E extends EventName>(
  event: E,
  handler: EventCallback<E>,
  deps: unknown[] = []
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let socket: Awaited<ReturnType<typeof getSocket>> | null = null;

    getSocket().then((s) => {
      socket = s;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      s.on(event as any, (...args: unknown[]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (handlerRef.current as any)(...args);
      });
    });

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket?.off(event as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, ...deps]);
}

// ─── Order status ─────────────────────────────────────────────────────────────

/**
 * Subscribe to `order:status` and `order:cancelled` for a given orderId.
 * Emits `track:order` once mounted so the server knows to push updates.
 */
export function useOrderStatusSocket(
  orderId: string,
  onStatusChange?: (status: string) => void,
  onCancelled?: (reason?: string) => void
) {
  const [status, setStatus] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!orderId) return;
    void trackOrder(orderId);
  }, [orderId]);

  useSocketEvent('order:status', (data) => {
    if (data.orderId !== orderId) return;
    setStatus(data.status);
    onStatusChange?.(data.status);
  });

  useSocketEvent('order:cancelled', (data) => {
    if (data.orderId !== orderId) return;
    setCancelled(true);
    setStatus('cancelled');
    onCancelled?.(data.reason);
  });

  return { status, cancelled };
}

// ─── Partner location ─────────────────────────────────────────────────────────

export type PartnerLocationState = {
  lat: number;
  lng: number;
  heading?: number;
  accuracy?: number;
  updatedAt?: string;
} | null;

/**
 * Subscribe to `partner:location` (and its alias `tracking:location`) for an order.
 * Returns the latest rider GPS position.
 */
export function usePartnerLocationSocket(orderId: string): PartnerLocationState {
  const [location, setLocation] = useState<PartnerLocationState>(null);

  const handler = useCallback(
    (data: { orderId: string; lat: number; lng: number; heading?: number; accuracy?: number; updatedAt?: string }) => {
      if (data.orderId !== orderId) return;
      setLocation({ lat: data.lat, lng: data.lng, heading: data.heading, accuracy: data.accuracy, updatedAt: data.updatedAt });
    },
    [orderId]
  );

  useSocketEvent('partner:location', handler);
  useSocketEvent('tracking:location', handler);

  return location;
}

// ─── ETA ─────────────────────────────────────────────────────────────────────

export function useEtaSocket(orderId: string): { etaMinutes?: number; etaText?: string } | null {
  const [eta, setEta] = useState<{ etaMinutes?: number; etaText?: string } | null>(null);

  useSocketEvent('tracking:eta', (data) => {
    if (data.orderId !== orderId) return;
    setEta({ etaMinutes: data.etaMinutes, etaText: data.etaText });
  });

  return eta;
}

/**
 * Subscribe to `delivery:status` for an order (rider trip machine).
 * Order ticket may stay `out_for_delivery` while trip moves to `arrived_at_customer`.
 */
export function useDeliveryStatusSocket(
  orderId: string,
  onStatusChange?: (status: string) => void
) {
  const [status, setStatus] = useState<string | null>(null);

  useSocketEvent('delivery:status', (data) => {
    if (data.orderId !== orderId) return;
    setStatus(data.status);
    onStatusChange?.(data.status);
  });

  return { status };
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

/**
 * Subscribe to `chat:new-message` for an order.
 * Returns latest messages array and helpers to send / type.
 */
export function useChatSocket(orderId: string) {
  const [messages, setMessages] = useState<ChatMessageEvent[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);

  useSocketEvent('chat:new-message', (data) => {
    if (data.orderId !== orderId) return;
    setMessages((prev) => [...prev, data]);
  });

  useSocketEvent('typing', (data) => {
    if (data.orderId !== orderId || data.from !== 'partner') return;
    setPartnerTyping(data.isTyping);
  });

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      await sendChatMessage(orderId, text);
      // Optimistically append own message
      setMessages((prev) => [
        ...prev,
        {
          orderId,
          from: 'customer',
          text,
          sentAt: new Date().toISOString(),
        },
      ]);
    },
    [orderId]
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      void emitTyping(orderId, isTyping);
    },
    [orderId]
  );

  return { messages, partnerTyping, send, setTyping };
}

// ─── Payment events ───────────────────────────────────────────────────────────

export function usePaymentSocket(orderId?: string) {
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [codPaid, setCodPaid] = useState(false);

  useSocketEvent('payment:update', (data) => {
    if (orderId && data.orderId !== orderId) return;
    setPaymentStatus(data.status);
  });

  useSocketEvent('payment:cod-paid', (data) => {
    if (orderId && data.orderId !== orderId) return;
    setCodPaid(true);
  });

  return { paymentStatus, codPaid };
}

// ─── Notification badge ───────────────────────────────────────────────────────

export function useNotificationSocket(onNew?: (data: { id?: string; title?: string; body?: string; type?: string }) => void) {
  const [unreadCount, setUnreadCount] = useState(0);

  useSocketEvent('notification:new', (data) => {
    setUnreadCount((n) => n + 1);
    onNew?.(data);
  });

  const resetCount = useCallback(() => setUnreadCount(0), []);

  return { unreadCount, resetCount };
}

// ─── Group cart ───────────────────────────────────────────────────────────────

export function useGroupCartSocket(onUpdate?: (data: { cartId?: string; userId?: string; action?: string }) => void) {
  useSocketEvent('cart:group-updated', (data) => {
    onUpdate?.(data);
  });
}
