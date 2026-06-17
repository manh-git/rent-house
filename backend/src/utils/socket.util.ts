import redis from './redis.util.js';

const ONLINE_TTL = 60 * 60*24; // 5 phút

// Lưu user online
export const setUserOnline = async (userId: number, socketId: string) => {
  await redis.set(`online:${userId}`, socketId, 'EX', ONLINE_TTL);
};

// Xóa user online
export const setUserOffline = async (userId: number, socketId: string): Promise<boolean> => {
  const currentSocketId = await redis.get(`online:${userId}`);
  if (currentSocketId === socketId) {
    await redis.del(`online:${userId}`);
    return true;
  }
  return false;
};

// Kiểm tra user có online không
export const getSocketId = async (userId: number): Promise<string | null> => {
  return await redis.get(`online:${userId}`);
};

// Lưu tin nhắn tạm vào Redis
export const pushMessageToBuffer = async (convId: number, message: object) => {
  await redis.rpush(`messages:${convId}`, JSON.stringify(message));
  const count = await redis.llen(`messages:${convId}`);
  return count;
};

// Lấy và xóa buffer tin nhắn
export const flushMessageBuffer = async (convId: number) => {
  const messages = await redis.lrange(`messages:${convId}`, 0, -1);
  await redis.del(`messages:${convId}`);
  return messages.map(m => JSON.parse(m));
};