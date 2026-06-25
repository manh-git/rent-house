

import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import Cookies from 'js-cookie';

const BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : 'https://wildcard-euphemism-repeater.ngrok-free.dev';

// ── SINGLETON ─────────────────────────────────────────────────────────────────
let socket: Socket | null = null;
let connectingPromise: Promise<Socket> | null = null;


const statusCache = new Map<number, 'online' | 'offline'>();

type StatusListener = (userId: number, status: 'online' | 'offline') => void;
const statusListeners = new Set<StatusListener>();


export const subscribeStatus = (cb: StatusListener): (() => void) => {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
};

export const getCachedStatus = (userId: number): 'online' | 'offline' | null =>
  statusCache.get(userId) ?? null;

const handleStatusEvent = (data: { userId: number; status: 'online' | 'offline' }) => {
  statusCache.set(Number(data.userId), data.status);
  statusListeners.forEach((cb) => cb(Number(data.userId), data.status));
};

const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return Cookies.get('accessToken') ?? null;
  return SecureStore.getItemAsync('accessToken');
};

export const connectSocket = async (): Promise<Socket> => {
  if (socket?.connected) return socket;
  if (connectingPromise) return connectingPromise;

  connectingPromise = new Promise(async (resolve, reject) => {
    const token = await getToken();

    if (socket) {
      socket.removeAllListeners();
      socket.disconnect();
      socket = null;
    }

    const newSocket = io(BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000,
    });

    newSocket.on('user_status_changed', handleStatusEvent);

    newSocket.on('connect', () => {
      if (statusCache.size > 0) {
        statusCache.forEach((_, userId) => {
          newSocket.emit('check_user_status', { targetUserId: userId });
        });
      }
    });

    const onFirstConnect = () => {
      console.log('[Socket] Connected:', newSocket.id);
      socket = newSocket;
      connectingPromise = null;
      resolve(newSocket);
    };

    const onConnectError = (err: Error) => {
      console.error('[Socket] Connect error:', err.message);
      connectingPromise = null;
      reject(err);
    };

    newSocket.once('connect', onFirstConnect);
    newSocket.once('connect_error', onConnectError);
  });

  return connectingPromise;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  connectingPromise = null;
  statusCache.clear();
  statusListeners.clear();
};