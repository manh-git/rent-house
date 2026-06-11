import * as RoommateService from '../services/roomate.service.js';
import { Request, Response } from 'express';

export const createRoommate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await RoommateService.createRoommate(req.body, userId);
    res.json(result);
  } catch (e) {
    console.error('Lỗi', e);
    res.status(400).json({ message: e });
  }
};

export const updateRoommate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await RoommateService.updateRoommate(req.body, userId);
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e });
  }
};

export const deleteRoommate = async (req: Request, res: Response) => {
  try {
    const { room_id} = req.params;
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const result = await RoommateService.deleteRoommate(Number(room_id), userId);
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e });
  }
};

export const getListRoommate = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    
    const result = await RoommateService.getListRoommate(req.query as any, userId);
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: e });
  }
};

export const getListRoommateOwner = async (req: Request, res: Response) => {
    try {
        const currentUserId = (req as any).user?.userId;
        if (!currentUserId) return res.status(401).json({ message: "Unauthorized" });

        const targetUserId = req.query.user_id ? Number(req.query.user_id) : (req as any).user?.id;;

        const result = await RoommateService.getListRommateOwner(currentUserId, targetUserId);
        res.json(result);
    } catch (e: any) {
        res.status(400).json({ message: e.message || e });
    }
};