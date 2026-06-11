import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as NotifService from './notification.service.js';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const page = Number(req.query.page) || 1;
    const result = await NotifService.getNotifications(userId, page);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message });
  }
});

router.patch('/read-all', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    res.json(await NotifService.markAllRead(userId));
  } catch (err: any) {
    res.status(400).json({ code: 400, message: err.message });
  }
});

router.patch('/read/:notifId/', authenticate, async (req: Request, res: Response) => {
  try {
    
    const userId = (req as any).user.userId;
    res.json(await NotifService.markOneRead(Number(req.params.notifId), userId));
  } catch (err: any) {
    console.error(err)
    res.status(400).json({ code: 400, message: err.message });
  }
});

export default router;