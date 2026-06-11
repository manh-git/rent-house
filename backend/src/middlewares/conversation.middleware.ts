import { Socket } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.util.js';

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) throw new Error('Không có token');

    const payload = verifyAccessToken(token) as { userId: number; roleId: number };
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error('Xác thực thất bại'));
  }
};