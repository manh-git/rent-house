import { Request, Response } from 'express';
import * as AdminService from './admin.service.js'; 

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { targetId, actionType } = req.body;
        const result = await AdminService.deleteUser((req as any).user.userId, targetId, actionType);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ code: 1001, message: error.message });
    }
};

export const openUser = async (req: Request, res: Response) => {
    try {
        const { targetId, actionDetail } = req.body;
        const result = await AdminService.openUser((req as any).user.userId, targetId, actionDetail);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ code: 1001, message: error.message });
    }
};

export const deleteReview = async (req: Request, res: Response) => {
    try {
        const { targetId, actionDetail, type } = req.body;
        await AdminService.deleteReview((req as any).user.userId, targetId, actionDetail, type);
        res.status(200).json({ code: 1000, message: "Xóa review thành công." });
    } catch (error: any) {
        res.status(400).json({ code: 1001, message: error.message });
    }
};

export const deletePostRoom = async (req: Request, res: Response) => {
    try {
        const { postId, roomId, actionDetail } = req.body;
        const result = await AdminService.deletePostRoom((req as any).user.userId, postId, roomId, actionDetail);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ code: 1001, message: error.message });
    }
};

export const deleteRoommate= async (req: Request, res: Response) => {
    try {
        const { postId, actionDetail } = req.body;
        const result = await AdminService.deleteRoommate((req as any).user.userId, postId, actionDetail);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ code: 1001, message: error.message });
    }
};

export const getAdminLogs = async (req: Request, res: Response) => {
    try {
        const { index, count, key, startDate, endDate } = req.query;
        const result = await AdminService.getListAdminLog(
            Number(index) || 0, Number(count) || 10, 
            key as string, startDate as string, endDate as string
        );
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ code: 1001, message: error.message });
    }
};

export const getWithdrawalList = async (req: Request, res: Response) => {
    try {
        const data = await AdminService.getAdminWithdrawalList((req as any).user.userId);
        res.status(200).json({ code: 1000, data });
    } catch (error: any) {
        res.status(400).json({ code: 1001, message: error.message });
    }
};

export const updateRole = async (req: Request, res: Response) => {
    try {
        const { targetUserId, newRoleId } = req.body;
        const result = await AdminService.updateUserRole((req as any).user.userId, targetUserId, newRoleId);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ code: 1001, message: error.message });
    }
};

export const updateWithdrawal = async (req: Request, res: Response) => {
    try {
        const { withdrawalId, status } = req.body;
        const result = await AdminService.updateWithdrawalStatus((req as any).user.userId, withdrawalId, status);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ code: 1001, message: error.message });
    }
};

export const getUserActivities = async (req: Request, res: Response) => {
    try {
        const targetUserId = Number(req.params.targetId);
        const { index, count } = req.query;
        const result = await AdminService.getUserActivities(targetUserId, Number(index) || 0, Number(count) || 10);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ code: 1001, message: error.message });
    }
};

export const searchUsers = async (req: Request, res: Response) => {
    try {
        const { index, count, key } = req.query;
        const result = await AdminService.searchUsers(Number(index) || 0, Number(count) || 10, key as string);
        res.status(200).json(result);
    } catch (error: any) {
        res.status(400).json({ code: 1001, message: error.message });
    }
};

export const getListReport = async(req: Request, res: Response)=>{
    try{
        const {index, count, status } = req.body;
        const result = await AdminService.getListReport(index, count, status);
        res.status(200).json(result);
    }catch(e){
        res.status(400).json({message: e});
    }
}
export const markReportAsRead = async(req: Request, res: Response)=>{
    try{
        const adminId = (req as any)?.user.userId;
        const reportId = req.params.reportId;
        const query = await AdminService.markReportAsRead(adminId, Number(reportId));
        res.status(200).json(query);
    }
    catch(e){
        console.error(e)
        res.status(400).json({message: e});
    }
}
export const sendSystemNotification =async(req: Request, res:Response)=>{
    try{
        const { userIds, title, body, data}= req.body;
        if (!title || !body) {
            return res.status(400).json({ code: 1002, message: "Tiêu đề và nội dung không được để trống!" });
        }
        const targetUserIds = Array.isArray(userIds) ? userIds : [];

        const result = await AdminService.sendSystemNotification(
            targetUserIds, 
            title, 
            body, 
            data || {}
        );

        res.status(200).json({
            code: 1000,
            message: "Gửi thông báo thành công!",
            data: result
        });
    }catch(e){
        res.status(400).json({message: e});
    }
}

export const getReportById = async(req: Request, res:Response)=>{
    const reportId = req.params.reportId;
    const result = await AdminService.getReportById(Number(reportId));
    res.status(200).json(result);
}