/**
 * socket.ts — Singleton socket với hỗ trợ:
 * - Auto reconnect và re-query status sau reconnect
 * - Global status cache + listener registry (tránh miss event khi component mount muộn)
 * - connectSocket() chỉ resolve sau khi thực sự connected
 */

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

// ── GLOBAL STATUS CACHE + LISTENERS ──────────────────────────────────────────
// Vấn đề gốc: backend emit 'user_status_changed' qua socket.broadcast —
// nếu component chưa mount kịp thì miss event, không bao giờ nhận lại được.
// Giải pháp: cache status global + subscribe pattern.
// Component mount muộn → đọc cache ngay lập tức, không cần đợi event.

const statusCache = new Map<number, 'online' | 'offline'>();

type StatusListener = (userId: number, status: 'online' | 'offline') => void;
const statusListeners = new Set<StatusListener>();

/**
 * Đăng ký lắng nghe thay đổi online status toàn cục.
 * Trả về hàm unsubscribe — gọi trong useEffect cleanup.
 */
export const subscribeStatus = (cb: StatusListener): (() => void) => {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
};

/**
 * Lấy trạng thái cached của một user (sync, không async).
 * Dùng để set initialState trong useState tránh flicker.
 */
export const getCachedStatus = (userId: number): 'online' | 'offline' | null =>
  statusCache.get(userId) ?? null;

// Internal: khi nhận event → cập nhật cache → notify tất cả listeners
const handleStatusEvent = (data: { userId: number; status: 'online' | 'offline' }) => {
  statusCache.set(Number(data.userId), data.status);
  statusListeners.forEach((cb) => cb(Number(data.userId), data.status));
};

// ── TOKEN ─────────────────────────────────────────────────────────────────────
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return Cookies.get('accessToken') ?? null;
  return SecureStore.getItemAsync('accessToken');
};

// ── CONNECT ───────────────────────────────────────────────────────────────────
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

    // Gắn global status listener 1 lần duy nhất trên socket instance này.
    // Listener này KHÔNG bao giờ bị remove bởi component — chỉ remove khi disconnect.
    newSocket.on('user_status_changed', handleStatusEvent);

    // Sau mỗi lần reconnect: re-query status của tất cả userId đang theo dõi.
    // Vì trong lúc mất kết nối có thể đã có người online/offline mà mình miss.
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