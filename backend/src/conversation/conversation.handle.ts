import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { verifyAccessToken } from '../utils/jwt.util.js';
import {
  setUserOnline,
  setUserOffline,
  getSocketId,
  pushMessageToBuffer,
  flushMessageBuffer,
} from '../utils/socket.util.js';


const prisma = new PrismaClient();
const FLUSH_THRESHOLD = 10; // flush sau 10 tin nhắn

export const registerChatHandlers = (io: Server, socket: Socket) => {
  const userId = socket.data.userId as number;

  // ─── KẾT NỐI ───────────────────────────────────────────────────────
  const handleConnect = async () => {
    await setUserOnline(userId, socket.id);
    socket.join(`user_${userId}`); 
    socket.broadcast.emit('user_status_changed', { userId, status: 'online' });
  };
  handleConnect();

  // ─── KIỂM TRA TRẠNG THÁI ON/OFF ────────────────────────────────────
  socket.on('check_user_status', async (data: { targetUserId: number }) => {
    const targetSocketId = await getSocketId(data.targetUserId);
    socket.emit('user_status_changed', {
      userId: data.targetUserId,
      status: targetSocketId ? 'online' : 'offline'
    });
  });

  // ─── THAM GIA PHÒNG CHAT & ĐÁNH DẤU ĐÃ XEM ─────────────────────────
  socket.on('join_conversation', async (data: { convId: number }) => {
    if (!data.convId || isNaN(data.convId)) return;
    
    socket.join(`room_${data.convId}`);
    console.log(`User ${userId} joined room_${data.convId}`);

    try {
      // Trước khi đánh dấu đã xem, ép flush toàn bộ tin nhắn tồn đọng của phòng này từ Redis vào DB 
      // để đảm bảo tính nhất quán dữ liệu khi người dùng vừa load trang.
      await flushToDB(data.convId);

      await prisma.messages.updateMany({
        where: {
          conv_id: data.convId,
          sender_id: { not: userId },
          is_read: false
        },
        data: { is_read: true }
      });

      socket.to(`room_${data.convId}`).emit('messages_read_update', {
        convId: data.convId,
        readerId: userId
      });
    } catch (err) {
      console.error("Lỗi cập nhật trạng thái đã xem khi vào phòng:", err);
    }
  });

  //  SỰ KIỆN ĐÁNH DẤU ĐÃ XEM CHỦ ĐỘNG
  socket.on('read_messages', async (data: { convId: number }) => {
    if (!data.convId || isNaN(data.convId)) return;
    try {
      await prisma.messages.updateMany({
        where: {
          conv_id: data.convId,
          sender_id: { not: userId },
          is_read: false
        },
        data: { is_read: true }
      });

      socket.to(`room_${data.convId}`).emit('messages_read_update', {
        convId: data.convId,
        readerId: userId
      });
    } catch (err) {
      console.error("Lỗi phát sự kiện read_messages:", err);
    }
  });

  socket.on('leave_conversation', (data: { convId: number }) => {
    socket.leave(`room_${data.convId}`);
    console.log(`User ${userId} left room_${data.convId}`);
  });

  // ─── GỬI TIN NHẮN ──────────────────────────────────────────────────
  socket.on('send_message', async (data: {
    convId: number | null;
    receiverId: number;
    message: string;
    imageUrls?: string[];
  }) => {
    try {
      let { convId, receiverId, message, imageUrls } = data;
      let isNewConversation = false;

      if (!convId) {
        const existingConv = await prisma.conversations.findFirst({
          where: {
            OR: [
              { user1_id: userId, user2_id: receiverId },
              { user1_id: receiverId, user2_id: userId }
            ]
          }
        });

        if (existingConv) {
          convId = existingConv.conv_id;
        } else {
          const newConv = await prisma.conversations.create({
            data: {
              user1_id: userId,
              user2_id: receiverId,
              last_message_at: new Date()
            }
          });
          convId = newConv.conv_id;
          isNewConversation = true;
        }
      }

      if (isNewConversation) {
        socket.join(`room_${convId}`);
        const receiverSocketId = await getSocketId(receiverId);
        if (receiverSocketId) {
          const receiverSocket = io.sockets.sockets.get(receiverSocketId);
          if (receiverSocket) {
            receiverSocket.join(`room_${convId}`);
          }
        }
      }

      const roomSockets = io.sockets.adapter.rooms.get(`room_${convId}`);
      const receiverSocketId = await getSocketId(receiverId);
      const isReceiverInRoom = receiverSocketId ? roomSockets?.has(receiverSocketId) : false;

      const msgPayload = {
        conv_id: convId,
        sender_id: userId,
        message_text: message,
        image_urls: imageUrls && imageUrls.length > 0 ? imageUrls : [],
        sent_at: new Date().toISOString(),
        is_read: isReceiverInRoom ? true : false,
      };

      // Lưu vào Redis buffer
      const bufferCount = await pushMessageToBuffer(convId, msgPayload);

      // Gửi real-time tới room
      io.to(`room_${convId}`).emit('receive_message', msgPayload);

      // Gửi thông báo ngầm nếu người nhận không ở trong phòng chat
      const targetReceiverId = Number(receiverId); 
io.to(`user_${targetReceiverId}`).emit('receive_notification', msgPayload);


      socket.emit('message_sent', msgPayload);

      if (bufferCount >= FLUSH_THRESHOLD || isNewConversation || !isReceiverInRoom) {
        await flushToDB(convId);
      }
    } catch (err) {
      console.error("Lỗi gửi tin nhắn backend:", err);
      socket.emit('error', { message: 'Gửi tin nhắn thất bại' });
    }
  });
  

  // ─── DISCONNECT ────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
  const wasRemoved = await setUserOffline(userId, socket.id);
  await prisma.users.update({
    where: { user_id: userId },
    data: { last_seen: new Date() },
  });
  if (wasRemoved) {
    socket.broadcast.emit('user_status_changed', { userId, status: 'offline' });
  }
});
};

// ─── FLUSH BUFFER VÀO POSTGRESQL ───────────────────────────────────────────
export const flushToDB = async (convId: number) => {
  const messages = await flushMessageBuffer(convId);
  if (messages.length === 0) return;

  try {
    await prisma.$transaction(async (tx) => {
      for (const m of messages) {
        const createdMessage = await tx.messages.create({
          data: {
            conv_id: m.conv_id,
            sender_id: m.sender_id,
            message_text: m.message_text,
            sent_at: new Date(m.sent_at),
            is_read: m.is_read ?? false, 
          },
        });

        if (m.image_urls && m.image_urls.length > 0) {
          await tx.media.createMany({
            data: m.image_urls.map((url: string) => ({
              message_id: createdMessage.msg_id,
              file_url: url,
              file_type: 'image',
            })),
          });
        }
      }

      await tx.conversations.update({
        where: { conv_id: convId },
        data: { last_message_at: new Date() },
      });
    });

  } catch (error) {
    console.error("[Redis-Flush] Lỗi trong quá trình transaction lưu DB:", error);
  }

};