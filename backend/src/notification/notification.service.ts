import { PrismaClient } from '@prisma/client';
import { io } from '../index.js';

const prisma = new PrismaClient();

export const createNotification = async (data: {
  user_id: number;
  type: string;
  title: string;
  body: string;
  data?: any;
}) => {
  const notif = await prisma.notifications.create({ data });

  io.to(`user_${data.user_id}`).emit('new_notification', notif);

  return notif;
};

export const getNotifications = async (userId: number, page = 1) => {
  const [items, total, unread] = await Promise.all([
    prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * 20,
      take: 20,
    }),
    prisma.notifications.count({ where: { user_id: userId } }),
    prisma.notifications.count({ where: { user_id: userId, is_read: false } }),
  ]);

  return { code: 1000, data: items, total, unread, page };
};

export const markAllRead = async (userId: number) => {
  await prisma.notifications.updateMany({
    where: { user_id: userId, is_read: false },
    data: { is_read: true },
  });
  return { code: 1000, message: 'Đã đánh dấu tất cả là đã đọc!' };
};

export const markOneRead = async (notifId: number, userId: number) => {
  
  await prisma.notifications.updateMany({
    where: { notif_id: notifId, user_id: userId },
    data: { is_read: true },
  });
  
  return { code: 1000, message: 'Đã đọc!' };
};