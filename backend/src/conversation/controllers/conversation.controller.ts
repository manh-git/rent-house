import * as ConversationService from '../services/conversation.services.js';
import { Request, Response } from "express";

export const getConversation = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const convId = Number(req.params.convId);
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 20;
        
        if (isNaN(convId)) {
            return res.json({
                code: 1000,
                message: 'Cuộc hội thoại mới chưa có tin nhắn!',
                data: [] // Trả về mảng rỗng để frontend không bị lỗi
            });
        }
        const result = await ConversationService.getConversation(
            userId, convId, limit, page
        )
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export const findRoom = async (req: Request, res: Response) => {
    try {
        const currentUserId = (req as any).user?.userId;
        const receiverId = Number(req.params.receiverId);

        if (!currentUserId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const result = await ConversationService.findExistingRoom(
            currentUserId, 
            receiverId
        );
        
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export const getListConversation = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        const result = await ConversationService.getListConv(userId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

// ─── API: Lấy tổng số tin nhắn chưa đọc ──────────────────────────────
export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const result = await ConversationService.getUnreadMessagesCount(userId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── API: Đánh dấu đã đọc hội thoại ──────────────────────────────────
export const markConversationAsRead = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const convId = Number(req.params.convId);

        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        if (isNaN(convId)) return res.status(400).json({ message: "Mã hội thoại không hợp lệ" });

        const result = await ConversationService.markAsRead(userId, convId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// ─── API: Lấy kho lưu trữ ảnh của hộp chat ───────────────────────────
export const getChatImages = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        const convId = Number(req.params.convId);

        if (!userId) return res.status(401).json({ message: "Unauthorized" });
        if (isNaN(convId)) return res.status(400).json({ message: "Mã hội thoại không hợp lệ" });

        const result = await ConversationService.getConversationImages(userId, convId);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};