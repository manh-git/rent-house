import 'dotenv/config';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import redis from './utils/redis.util.js';
import cors from 'cors';
import cron from 'node-cron';
import { checkExpiredCancelContracts } from './manage_rent/contract.service.js';
// Routes
import userRouters from './user/routes/user.route.js';
import postRoomRouters from './post_rooms/routes/post_room.routes.js';
import roommateRouters from './roommate/routes/roommate.routes.js';
import conversationRouters from './conversation/routes/conversation.route.js';
import contractRouters from './manage_rent/contract.route.js'
import notificationsRoutes from './notification/notification.routes.js'
import adminRoutes from './admin/admin.router.js'
// Socket
import { socketAuthMiddleware } from './middlewares/conversation.middleware.js';
import { registerChatHandlers, flushToDB } from './conversation/conversation.handle.js';

const app = express();
const httpServer = createServer(app);

app.use(cors({
  origin: 'http://localhost:8081', // Phải khớp chính xác với URL của Expo Web
  credentials: true,               // Cho phép gửi cookie/header xác thực
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

export const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req: Request, res: Response) => {
  res.send('Hello');
});

cron.schedule('0 0 * * *', async () => {
  console.log('Đang chạy tác vụ tự động giải ngân...');
  await checkExpiredCancelContracts();
});


app.use('/user', userRouters);
app.use('/roommate', roommateRouters);
app.use('/post_room', postRoomRouters);
app.use('/chat', conversationRouters);
app.use('/contract',contractRouters);
app.use('/notification', notificationsRoutes)
app.use('/admin', adminRoutes)

io.use(socketAuthMiddleware);

io.on('connection', (socket) => {
  registerChatHandlers(io, socket);
});

setInterval(async () => {
  try {
    const keys = await redis.keys('messages:*');
    for (const key of keys) {
      const convId = Number(key.split(':')[1]);
      if (!isNaN(convId)) {
        await flushToDB(convId);
      }
    }
  } catch (err) {
    console.error('Flush error:', err);
  }
}, 30_000);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT,() => {
  console.log(`Server is running on port ${PORT}`);
});