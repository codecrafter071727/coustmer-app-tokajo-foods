/**
 * Socket.IO event types — customer app.
 * Source: CUSTOMER_APP_ALL_APIS.md §1 Sockets
 */

/** Server → Client events */
export type ServerToClientEvents = {
  /** Order status stepper update */
  'order:status': (data: { orderId: string; status: string; updatedAt?: string }) => void;
  /** Order was cancelled */
  'order:cancelled': (data: { orderId: string; reason?: string; refundAmount?: number }) => void;
  /** Rider GPS (primary) */
  'partner:location': (data: { orderId: string; lat: number; lng: number; heading?: number; accuracy?: number; updatedAt?: string }) => void;
  /** Rider GPS alias */
  'tracking:location': (data: { orderId: string; lat: number; lng: number; heading?: number; accuracy?: number; updatedAt?: string }) => void;
  /** ETA update chip */
  'tracking:eta': (data: { orderId: string; etaMinutes?: number; etaText?: string }) => void;
  /** Rider trip status (assigned → arrived_at_customer → delivered / RTO) */
  'delivery:status': (data: {
    orderId: string;
    status: string;
    deliveryId?: string;
    otpVerified?: boolean;
    updatedAt?: string;
  }) => void;
  /** New notification badge */
  'notification:new': (data: { id?: string; title?: string; body?: string; type?: string }) => void;
  /** Group cart member changed items */
  'cart:group-updated': (data: { cartId?: string; userId?: string; action?: string }) => void;
  /** Payment gateway success or failure */
  'payment:update': (data: { orderId?: string; paymentId?: string; status: string; amount?: number }) => void;
  /** COD collected at door */
  'payment:cod-paid': (data: { orderId: string; amount?: number; collectedAt?: string }) => void;
  /** In-trip chat message (both directions) */
  'chat:new-message': (data: ChatMessageEvent) => void;
  /** Typing dots */
  typing: (data: { orderId: string; from: 'customer' | 'partner'; isTyping: boolean }) => void;
  /** Support ticket updated (agent reply, status, refund, etc.) */
  'support:ticket-updated': (data: {
    ticketId?: string | null;
    ticketNo?: string | null;
    kind?: string | null;
    status?: string | null;
    updatedAt?: string | null;
    refundId?: string;
    amount?: number;
  }) => void;
  /** Admin forced logout / account restriction — sign out immediately */
  'session:revoked': (data: {
    userId?: string;
    reason?: string | null;
    action?: string | null;
  }) => void;
};

/** Client → Server events */
export type ClientToServerEvents = {
  /** Start receiving updates for an order */
  'track:order': (data: { orderId: string }) => void;
  /** Send a chat message to the rider */
  'chat:new-message': (data: { orderId: string; text: string; to: 'partner' }) => void;
  /** Typing indicator */
  typing: (data: { orderId: string; isTyping: boolean }) => void;
};

export type ChatMessageEvent = {
  orderId: string;
  from: 'customer' | 'partner';
  text: string;
  messageId?: string;
  sentAt?: string;
};

export type SocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
