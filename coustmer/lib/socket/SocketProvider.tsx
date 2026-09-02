/**

 * SocketProvider — mounts once at the root layout.

 *

 * What it does:

 *  - Connects the socket when the user is logged in.

 *  - Disconnects on logout.

 *  - Exposes `useSocket()` so any component can subscribe to events or emit.

 *  - Keeps `socketStatus` in context so the UI can show a "reconnecting…" banner.

 */



import React, {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useRef,

  useState,

} from 'react';



import { useAuthStore } from '@/store/auth-store';

import {

  disconnectSocket,

  getSocket,

  reconnectSocket,

  type AppSocket,

} from '@/lib/socket/socket';

import { useSessionRevokedSocket } from '@/lib/socket/hooks';

import { clearApiSession } from '@/lib/api';

import { notifyUnauthorized } from '@/lib/auth/unauthorized';

import type { SocketStatus } from '@/lib/socket/types';



type SocketContextValue = {

  socket: AppSocket | null;

  status: SocketStatus;

};



const SocketContext = createContext<SocketContextValue>({

  socket: null,

  status: 'disconnected',

});



export function SocketProvider({ children }: { children: React.ReactNode }) {

  const isLoggedIn = useAuthStore((s) => Boolean(s.user));

  const isHydrated = useAuthStore((s) => s.isHydrated);



  const [status, setStatus] = useState<SocketStatus>('disconnected');

  const socketRef = useRef<AppSocket | null>(null);



  useSessionRevokedSocket(() => {

    void (async () => {

      await clearApiSession();

      await notifyUnauthorized();

    })();

  });



  const connect = useCallback(async () => {

    setStatus('connecting');

    try {

      const socket = await (socketRef.current

        ? reconnectSocket().then(() => getSocket())

        : getSocket());

      socketRef.current = socket;



      const onConnect = () => setStatus('connected');

      const onDisconnect = () => setStatus('disconnected');

      const onError = () => setStatus('error');



      socket.off('connect', onConnect);

      socket.off('disconnect', onDisconnect);

      socket.off('connect_error', onError);



      socket.on('connect', onConnect);

      socket.on('disconnect', onDisconnect);

      socket.on('connect_error', onError);



      if (socket.connected) setStatus('connected');

    } catch {

      setStatus('error');

    }

  }, []);



  const disconnect = useCallback(() => {

    disconnectSocket();

    socketRef.current = null;

    setStatus('disconnected');

  }, []);



  useEffect(() => {

    if (!isHydrated) return;

    if (isLoggedIn) {

      void connect();

    } else {

      disconnect();

    }

    return () => {

      // Cleanup socket listeners on unmount but keep the socket alive

    };

  }, [isLoggedIn, isHydrated, connect, disconnect]);



  return (

    <SocketContext.Provider value={{ socket: socketRef.current, status }}>

      {children}

    </SocketContext.Provider>

  );

}



export function useSocket(): SocketContextValue {

  return useContext(SocketContext);

}

