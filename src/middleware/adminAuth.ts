// src/middleware/adminAuth.ts
import { Request, Response, NextFunction } from 'express';

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  // เช็คว่ามี header ชื่อ 'x-admin-key' ส่งมาไหม และตรงกับใน .env ไหม
  const adminKey = req.headers['x-admin-key'];
  
  if (adminKey === process.env.ADMIN_SECRET_KEY) {
    next(); // ผ่าน
  } else {
    res.status(403).json({ error: 'Access Denied: Admin only' });
  }
};