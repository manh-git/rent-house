import { Request, Response } from "express";
import * as RoomService from '../services/room.services.js'

//thêm sửa xóa phòng
export const createRooms = async(req: Request, res:Response)=>{
    try{
        
         const userId = (req as any).user?.userId;
         if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
    const result  = await RoomService.createPostRoom(
        userId,
        req.body,
    );
    res.json(result);
    } catch(err){
        res.status(400).json({message: err});
    }
}
export const updateRooms = async(req: Request, res:Response)=>{
    try{
    const userId = (req as any).user?.userId;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const result  = await RoomService.updatePostRoom(
        userId,
        req.body,
    );
    res.json(result);
    } catch(err){
        res.status(400).json({message: err});
    }
}

export const deleteRooms = async(req: Request, res:Response)=>{
    try{
    const userId = (req as any).user?.userId;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const result  = await RoomService.deletePostRoom(
        userId,
        Number(req.params.room_id)
    );
    res.json(result);
    } catch(err){
        res.status(400).json({message: err});
    }
}
//lấy danh sách phòng
export const getListRoom = async(req: Request, res:Response)=>{
    try{
    const result  = await RoomService.getListPost(
        req.query as any,
    );
    res.json(result);
    } catch(err){
        res.status(400).json({message: err});
    }
}
export const getRooms = async(req: Request, res:Response)=>{
    try{
    const post_id = Number(req.params.post_id);
    const result  = await RoomService.getPost(
        post_id
    );
    res.json(result);
    } catch(err){
        res.status(400).json({message: err});
    }
}
export const getWard = async(req: Request, res: Response)=>{
    try{
        const result = await RoomService.getWard();
        res.json(result);
    }
    catch(e){
        res.status(400).json({message: e});
    }
}

export const getListPostOwner = async (req: Request, res: Response) => {
    try {

        const targetUserId = req.query.user_id ? Number(req.query.user_id) : (req as any).user?.id;;

        const result = await RoomService.getListPostOwner( targetUserId);
        res.json(result);
    } catch (err: any) {
        res.status(400).json({ message: err.message || err });
    }
};