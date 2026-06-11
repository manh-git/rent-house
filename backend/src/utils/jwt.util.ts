import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

export const generateAccessToken = (userId: number, roleId: number, fullName: string, avatarUrl: string) => {
  return jwt.sign({ userId, roleId, fullName, avatarUrl }, ACCESS_SECRET, {
    expiresIn:  '15m',
  });
};

export const generateRefreshToken = (userId: number) => {
  return jwt.sign({ userId }, REFRESH_SECRET, {
    expiresIn: '7d',
  });
};

export const verifyAccessToken = (token: string) => {
  return jwt.verify(token, ACCESS_SECRET,{
    clockTolerance: 30
  });
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET, {
    clockTolerance: 30
  });
};