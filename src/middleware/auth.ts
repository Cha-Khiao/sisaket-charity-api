// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

// 1. เช็คว่ามีบัตรผ่านไหม (Token)
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // format: Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access Denied: กรุณาเข้าสู่ระบบ' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = verified;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid Token: หมดอายุหรือบัตรไม่ถูกต้อง' });
  }
};

// 2. เช็คว่าเป็นแอดมินไหม (ใช้คู่กับข้อ 1)
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: สำหรับผู้ดูแลระบบเท่านั้น' });
    }
};