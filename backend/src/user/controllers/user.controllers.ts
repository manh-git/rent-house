import { Request, Response } from "express";
import * as UserService from '../services/user.services.js'
import { error } from "console";
//đăng kí
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, role_id } = req.body;
    if (!email || !password || !role_id) {
      res.status(400).json({ code: 400, message: 'Email và mật khẩu là bắt buộc' });
      return;
    }
    const result = await UserService.createUser(email, password, fullName);
    res.status(201).json(result);
  } catch (error: any) {
    
    res.status(400).json({ code: 400, message: error.message });
  }
};
// Xác nhận email
export const confirmEmail = async (req: Request, res: Response) => {
  try {
    const userId =Number( req.query.userId);
    const otp = String(req.query.otp);
    const result = await UserService.confirmEmail(userId, otp);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

//đăng nhập

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ code: 400, message: 'Email và mật khẩu là bắt buộc' });
      return;
    }
    const { accessToken, refreshToken } = await UserService.login(email, password);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, 
    });

    res.status(200).json({ code: 200, accessToken, refreshToken });
  } catch (error: any) {
    res.status(400).json({ code: 400, message: error.message });
  }
};

//đăng xuất
export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(400).json({ code: 400, message: 'Không tìm thấy refresh token' });
      return;
    }
    await UserService.logout(refreshToken);
    res.clearCookie('refreshToken');
    res.status(200).json({ code: 200, message: 'Đăng xuất thành công!' });
  } catch (error: any) {
    res.status(400).json({ code: 400, message: error.message });
  }
};
//làm mới accesstoken
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      res.status(401).json({ code: 401, message: 'Không tìm thấy refresh token' });
      return;
    }
    const { accessToken, refreshToken: newRefreshToken } = await UserService.refreshAccessToken(refreshToken);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ code: 200, accessToken });
  } catch (error: any) {
    res.status(401).json({ code: 401, message: error.message });
  }
};
//đổi mật khẩu
export const changePassword = async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({ code: 401, message: 'Chưa xác thực' });
      return;
    }
    if (!newPassword) {
      res.status(400).json({ code: 400, message: 'Vui lòng nhập đầy đủ thông tin' });
      return;
    }

    const result = await UserService.changePassword(userId,newPassword);
    res.status(200).json({ code: 200, ...result });
  } catch (error: any) {
    res.status(400).json({ code: 400, message: error.message });
  }
};
//quên mật khẩu
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ code: 400, message: 'Email là bắt buộc' });
      return;
    }
    const result = await UserService.forgotPassword(email);
    res.status(200).json({ code: 200, ...result });
  } catch (error: any) {
    res.status(400).json({ code: 400, message: error.message });
  }
};
//đặt lại mk
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { otp } = req.body;
    const { newPass } = req.body;
    const { email } = req.body;

    if (!otp || typeof otp !== 'string') {
      res.status(400).json({ code: 400, message: 'Token không hợp lệ' });
      return;
    }
    if (!newPass) {
      res.status(400).json({ code: 400, message: 'Mật khẩu mới là bắt buộc' });
      return;
    }
    if (!email) {
      res.status(400).json({ code: 400, message:'Email là bắt buộc' });
      return;
    }


    const result = await UserService.resetPassword(otp, newPass, email);
    res.status(200).json({ ...result });
  } catch (error: any) {
    res.status(400).json({ code: 400, message: error.message });
  }
};
//cập nhật thông tin
export const updateUserInfor = async(req: Request, res: Response) =>{
  try{
    const userId = (req as any).user?.userId;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
}
    const query = await UserService.UpdateUser(userId, req.body);
    res.json(query);
  }
  catch(e){
    res.status(400).json({message: e});
  }
}
export const getUserInfor = async(req: Request, res:Response)=>{
  try{
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
}
    const query = await UserService.GetUserInfor(userId);
    res.json(query);
  } catch(e){
    res.status(400).json({message: e});
  }
}

export const loginGoogle = async(req: Request, res: Response)=>{
  try{
    const IdToken = req.body;
    
    const query = await UserService.loginWithGoogle(IdToken);
    res.json(query);
  } catch(e){
    console.error("Lỗi Backend:",e)
    res.status(400).json({message: e});
  }
}

export const resentOtp = async(req:Request, res: Response)=>{
  try{
    const userId = req.body.userId;
    const email = req.body.email;
    const query = await UserService.resendOTP(userId, email);
    res.json(query);
  }
  catch(e){
    res.status(400).json({message: e})
  }
}
export const findUser = async(req: Request, res: Response)=>{
  try{
    const key = req.query.key as string ;
    const query = await UserService.findUser(key);
    res.json(query);
  }catch(e){
    res.status(400).json({message: e});
  }
}