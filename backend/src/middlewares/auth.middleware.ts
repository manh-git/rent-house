import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.util.js";
import redis from "../utils/redis.util.js";
export interface AuthRequest extends Request {
    user?: {
        userId: number;
        roleId: number;
    };
}
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Mã xác thực không hợp lệ" });
    }
    
    const payload = verifyAccessToken(token) as {userId: number; roleId: number};

    const isBlocked = await redis.get(`blacklist:${payload.userId}`);
    if(isBlocked){
      return res.status(403).json({
        code: 403,
        message: "Tài khoản bạn đã bị khóa. Vui lòng đăng xuất."
      })
    }
    req.user = payload;
    next();

  } catch (error) {
    return res.status(401).json({ message: "Token không hợp lệ hoặc hết hạn" });
  }
};