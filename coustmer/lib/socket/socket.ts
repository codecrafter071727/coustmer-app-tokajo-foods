/**
 * Socket.IO singleton — customer app.
 *
 * Auth flow (§1 Gateway):
 *   1. POST /api/v1/socket-token  → { token }
 *   2. Connect io(GATEWAY, { auth: { socketToken: token } })
 *
 * On 401 / token expiry the socket re-fetches the token and reconnects.
 */

import { io, Socket } from 'socket.io-client';

import { api, API_BASE_URL } from '@/lib/api';
import type { ClientToServerEvents, ServerToClientEvents } from '@/lib/socket/types';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let _socket: AppSocket | null = null;
let _tokenPromise: Promise<string | null> | null = null;

async function fetchSocketToken(): Promise<string | null> {
  try {
    const res = await api.post<{ token?: string; socketToken?: string; data?: { token?: string } }>(
      '/api/v1/socket-token',
      {},
      { withCredentials: true }
    );
    const d = res.data;
    return d?.token ?? d?.socketToken ?? d?.data?.token ?? null;
  } catch {
    return null;
  }
}

async function getSocketToken(): Promise<string | null> {
  if (_tokenPromise) return _tokenPromise;
  _tokenPromise = fetchSocketToken().finally(() => { _tokenPromise = null; });
  return _tokenPromise;
}

/**
 * Returns (and lazily creates) the singleton socket.
 * Safe to call before login — the socket simply won't authenticate until
 * `reconnectSocket()` is called after sign-in.
 */
export async function getSocket(): Promise<AppSocket> {
  if (_socket?.connected) return _socket;

  const token = await getSocketToken();

  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }

  const gatewayUrl = API_BASE_URL || 'http://localhost:4000';

  _socket = io(gatewayUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    auth: token ? { socketToken: token } : undefined,
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 12000,
    timeout: 20000,
  }) as AppSocket;

  _socket.on('connect_error', async (err) => {
    const msg = err.message?.toLowerCase() ?? '';
    if (msg.includes('unauthorized') || msg.includes('401') || msg.includes('token')) {
      // Refresh token and reconnect once
      const fresh = await fetchSocketToken();
      if (fresh && _socket) {
        _socket.auth = { socketToken: fresh };
        _socket.connect();
      }
    }
  });

  return _socket;
}

/** Call after successful login to force a fresh authenticated connection. */
export async function reconnectSocket(): Promise<void> {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
  await getSocket();
}

/** Call on logout to cleanly tear down. */
export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

/** Emit `track:order` so the server starts pushing updates for this order. */
export async function trackOrder(orderId: string): Promise<void> {
  const socket = await getSocket();
  socket.emit('track:order', { orderId });
}

/** Send an in-trip chat message to the rider. */
export async function sendChatMessage(orderId: string, text: string): Promise<void> {
  const socket = await getSocket();
  socket.emit('chat:new-message', { orderId, text, to: 'partner' });
}

/** Emit typing indicator. */
export async function emitTyping(orderId: string, isTyping: boolean): Promise<void> {
  const socket = await getSocket();
  socket.emit('typing', { orderId, isTyping });
}
