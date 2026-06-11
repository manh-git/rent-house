import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.middleware.js";

export const authorize = (...allowedRoles: number[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Chưa xác thực" });
    }

    if (!allowedRoles.includes(user.roleId)) {
      return res.status(403).json({ message: "Không có quyền truy cập" });
    }

    next();
  };
};