import { auth } from 'google-auth-library';
import { authenticate } from '../../middlewares/auth.middleware.js';
import * as ConversationController from '../controllers/conversation.controller.js'
import { Router } from 'express'
const router = Router();


router.get('/conversation', authenticate, ConversationController.getListConversation);
router.get('/:convId/messages', authenticate, ConversationController.getConversation );
router.get('/find-room/:receiverId', authenticate,ConversationController.findRoom );
router.get('/unread-count', authenticate, ConversationController.getUnreadCount);
router.get('/:convId/read', authenticate, ConversationController.markConversationAsRead);
router.get('/:convId/images', authenticate, ConversationController.getChatImages);
export default router;