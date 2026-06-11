import  bcrypt  from 'bcrypt';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken } from '../../utils/jwt.util.js';
import { sendResetPasswordEmail, confirmAccount } from '../../utils/mailer.util.js';
import redis from '../../utils/redis.util.js';
import { UpdateUserDto } from '../dto/UpdateUser.dto.js';
import { OAuth2Client } from 'google-auth-library';

const prisma = new PrismaClient();

const REFRESH_TTL = 60*60*24*7;
const RESET_TTL = 60*5;
const CONFIRM_TTL = 60*5;

//register
export const createUser = async (email: string, password: string, fullName: string) => {
    const checkEmail = await prisma.users.findUnique({ where: {email }});
    if(checkEmail) throw new Error('Email đã được sử dụng');

    const pwHash = await bcrypt.hash(password,10);

    const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
    const otp = generateOTP();
    const user = await prisma.users.create({
        data: {
            email,
            password_hash: pwHash,
            full_name: fullName ?? null,
            role_id:  4,
            is_active: true,
            is_verified: false,
        },
    });
    let token: string | null = null;
    try{
        await redis.set(`confirm:${user.user_id}`, otp, 'EX', CONFIRM_TTL);
        await confirmAccount(email, otp);
    }
    catch(e){
        await prisma.users.delete({where: { user_id: user.user_id}});
        if(token) await redis.del(`confirm:${token}`);
        throw new Error('Có lỗi khi gửi email xác nhận! Vui lòng nhập email khác.')
    }
    return {code: 1000, message: 'Đăng kí thành công, vui lòng kiểm tra email để xác nhận tài khoản.', userId: user.user_id}

}
export const confirmEmail = async (userId: number, otp: string) => {
    const key = `confirm:${userId}`;
  const stored = await redis.get(key);

  if (!stored) throw new Error('OTP đã hết hạn!');
  if (stored !== otp) throw new Error('OTP không chính xác!');

  await prisma.users.update({
    where: { user_id: userId },
    data: { is_verified: true },
  });

  await redis.del(`confirm:${userId}`);
  return { code: 1000, message: 'Xác nhận email thành công' };
};

//login
export const login = async (email: string, password: string) =>{
    const user = await prisma.users.findUnique({where: {email}});
    if(!user) throw new Error('Email hoặc mật khẩu không chính xác!')
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if(!isMatch) throw new Error('Email hoặc mật khẩu không chính xác!');
    if(!user.is_active) throw new Error('Tài khoản của bạn đã bị khóa');
    if(!user.full_name ) throw new Error ('fullName lỗi!')

    if(!user.is_verified){
        const stored = await redis.get(`confirm:${user.user_id}`);
        if(stored){
            await redis.del(`confirm:${user.user_id}`);
        }
        const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
        const otp = generateOTP();
        await redis.set(`confirm:${user.user_id}`, otp, 'EX', CONFIRM_TTL);
        await confirmAccount(email, otp);
        throw new Error('Bạn cần phải xác nhận email! Hãy kiểm tra email của bạn!');
    }
    const accessToken = generateAccessToken(user.user_id, user.role_id, user.full_name, user.avatar_url || "");
    const refreshToken = generateRefreshToken(user.user_id);

    await redis.set(`refresh:${refreshToken}`, user.user_id, 'EX',REFRESH_TTL);

    return { accessToken, refreshToken};
}

//logout
export const logout = async (refreshToken: string) => {
    await redis.del(`refresh:${refreshToken}`);
    return { code: '1000', message: 'Đăng xuất thành công!'};
}
//Reset accessToken
export const refreshAccessToken = async(refreshToken: string)=>{
    const stored = await redis.get(`refresh:${refreshToken}`);
    if(!stored) throw new Error('Refresh token không hợp lệ!');

    const payload = verifyRefreshToken(refreshToken) as {userId: number; roleId: number};
    await redis.del(`refresh:${refreshToken}`);
    const newRefreshToken = generateRefreshToken(payload.userId);
    await redis.set(`refresh:${newRefreshToken}`, payload.userId, 'EX', REFRESH_TTL);

    const user = await prisma.users.findUnique({where: {user_id: payload.userId}});
    if(!user || !user.full_name ) throw new Error('User không tồn tại!');

    const newAccessToken = generateAccessToken(user.user_id, user.role_id, user.full_name, user.avatar_url || "");
    return { accessToken: newAccessToken, refreshToken: newRefreshToken};

}

//đổi mật khẩu
export const changePassword = async (userId: number, newPass: string) =>{
    const user = await prisma.users.findUnique({ where: {user_id: userId}});
    if(!user) throw new Error('Tài khoản không tồn tại');

    const passwordHash = await bcrypt.hash(newPass,10);
    await prisma.users.update({
        where: {user_id: userId},
        data: {password_hash: passwordHash},
    })
    return { message: 'Đổi mật khẩu thành công!'};
}
//Quên mật khẩu
export const forgotPassword = async (email: string)=>{
    const user = await prisma.users.findUnique({where: {email}});
    if(!user) return {message: 'Nếu email tồn tại, bạn sẽ nhận được link thay đổi mật khẩu!'};

    const stored = await redis.get(`reset:${user.user_id}`);
        if(stored){
            await redis.del(`reset:${user.user_id}`);
        }
    const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
    const otp = generateOTP();
    await redis.set(`reset:${user.user_id}`, otp, 'EX', RESET_TTL);
    await sendResetPasswordEmail(email,otp);
    return { code: 1000, message: 'Nếu email tồn tại, bạn sẽ nhận được link thay đổi mật khẩu!'};
}
export const resetPassword = async (otp:string, newPass: string, email: string) =>{
    const user = await prisma.users.findUnique({
        where:  {email: email},
        select: {
            user_id: true,
        }
    });
    const store = await redis.get(`reset:${user?.user_id}`);
    if(!store || store!==otp) throw new Error('Otp không chính xác hoặc đã hết hạn!');

    const passwordHash = await bcrypt.hash(newPass,10);

    await prisma.users.update({
        where: {user_id: Number(user?.user_id)},
        data: { password_hash: passwordHash},
    });

    await redis.del(`reset:${user?.user_id}`);
    return { code: 1000, message: 'Thay đổi mật khẩu thành công!'};
}
//Thông tin
export const UpdateUser = async (userId: number, dto: UpdateUserDto)=>{
    const user = await prisma.users.findUnique({where: {user_id: userId}});
    if(!user) throw new Error('User không tồn tại');
    const updated = await prisma.users.update({
        where: { user_id: userId},
        data: {
            full_name: dto.full_name ?? null,
            phone: dto.phone ?? null,
            avatar_url: dto.avatar_url ?? null,
            role_id: dto.role_id ?? user.role_id,
        },
        select: {
        user_id: true,
        email: true,
        full_name: true,
        phone: true,
        avatar_url: true,
    }
    });
    return {
        code: 1000,
        message: 'Cập nhật thông tin người dùng thành công',
        data: updated
    }
    
}
export const GetUserInfor = async(userId: number)=>{
    const user = await prisma.users.findUnique({ where: {user_id: userId},
        select: {
            user_id: true,
            email: true,
            full_name: true,
            phone: true,
            avatar_url: true,
            is_verified: true,
            created_at: true,
            role_id: true,
            is_active: true
        }
    });
    if(!user || !user.is_active) {
        const error = new Error('Tài khoản không tồn tại hoặc đã bị xóa khỏi hệ thống!');
        (error as any).status = 401; 
        throw error;
    
    }
    return {
        code: 1000,
        message: 'Lấy thông tin người dùng thành công!',
        data: user
    }
}

export const resendOTP = async (userId: number, email: string) => {
  const stored = await redis.get(`confirm:${userId}`);
  if(stored){
    await redis.del(`confirm:${userId}`);
  }
  const user = await prisma.users.findUnique({ where: { user_id: userId } });
  if (!user) throw new Error('Người dùng không tồn tại!');
  if (user.is_verified) throw new Error('Tài khoản đã được xác nhận!');

  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
  const otp = generateOTP();
  await redis.set(`confirm:${userId}`, otp, 'EX', CONFIRM_TTL);
  await confirmAccount(email, otp);

  return { code: 1000, message: 'Đã gửi lại OTP!' };
};


const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const loginWithGoogle = async (data: any) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID chưa được cấu hình trong .env');
  }
  

  const actualToken = typeof data === 'object' ? data.idToken : data;

  const ticket = await googleClient.verifyIdToken({
    idToken: actualToken,
    audience: clientId,
  });

  
  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error('Token Google không hợp lệ!');

  let user = await prisma.users.findUnique({ where: { email: payload.email } });

  if (!user) {
    user = await prisma.users.create({
      data: {
        email: payload.email,
        full_name: payload.name ?? null,
        avatar_url: payload.picture ?? null,
        password_hash: '',   
        role_id: 4,
        is_active: true,
        is_verified: true,   
      },
    });
  }
  

  if (!user.is_active) throw new Error('Tài khoản đã bị khóa!');

  const accessToken = generateAccessToken(user.user_id, user.role_id, user.full_name ?? "", user.avatar_url ?? "");
  const refreshToken = generateRefreshToken(user.user_id);
  await redis.set(`refresh:${refreshToken}`, user.user_id, 'EX', REFRESH_TTL);

  return { accessToken, refreshToken };
};

export const findUser = async(key: string)=>{
    const result = await prisma.users.findMany({
  where: {
    full_name: {
      contains: key,
      mode: 'insensitive',
    },
  },
  select: {
    full_name: true,
    phone: true,
    user_id: true
  }
});
  return {
    code: 1000,
    message: 'OK',
    data: result
  }
    
}

//viết báo cáo 