// src/routes/authRoutes.ts
import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const router = express.Router();

// Login (และ Auto-Register สำหรับ User ใหม่)
router.post('/login', async (req: any, res: any) => {
  try {
    const { identifier, password, isUserLogin } = req.body; // isUserLogin: "true" | "false"

    let user;

    // -----------------------------------------------------
    // 🟢 กรณี: ลูกค้า (User) -> Auto Register Logic
    // -----------------------------------------------------
    if (isUserLogin === "true" || isUserLogin === true) {
      // 1. ลองหา User จากเบอร์โทร
      user = await User.findOne({ phone: identifier, role: 'user' });

      if (!user) {
        // ✨ ถ้ายังไม่มี -> "สร้างใหม่ทันที" (Auto Register)
        const hashedPassword = await bcrypt.hash(password, 10);
        user = new User({
          phone: identifier,
          password: hashedPassword,
          name: identifier, // ✅ ตั้งชื่อเป็นเบอร์โทรเลย ตามที่ต้องการ
          role: 'user'
        });
        await user.save();
        console.log(`🆕 New User Created: ${identifier}`);
      } else {
        // 🔒 ถ้ามีแล้ว -> "เช็ครหัสผ่าน"
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ error: 'รหัสผ่านไม่ถูกต้อง' }); // เบอร์ถูกแต่รหัสผิด
        }
      }
    } 
    
    // -----------------------------------------------------
    // 🔴 กรณี: แอดมิน (Admin) -> ต้องมีอยู่แล้วเท่านั้น
    // -----------------------------------------------------
    else {
      user = await User.findOne({ username: identifier, role: 'admin' });
      if (!user) {
        return res.status(404).json({ error: 'ไม่พบชื่อผู้ใช้งาน (Admin)' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
      }
    }

    // ✅ 1. สร้าง Token (บัตรผ่าน)
    const token = jwt.sign(
        { id: user._id, role: user.role, name: user.name }, // ข้อมูลในบัตร
        process.env.JWT_SECRET as string,                   // ลายเซ็นลับ
        { expiresIn: '1d' }                                 // หมดอายุใน 1 วัน
    );

    // ✅ 2. ส่ง Token กลับไปพร้อมข้อมูล User
    res.json({
      id: user._id,
      name: user.name,
      role: user.role,
      phone: user.phone,
      token: token // 👈 สำคัญมาก! ส่ง Token กลับไป
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login Error' });
  }
});

// Seed Admin (คงไว้เหมือนเดิม)
router.post('/seed-admin', async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const admin = new User({
            username, password: hashedPassword, name: 'Administrator', role: 'admin'
        });
        await admin.save();
        res.json({ message: 'Admin Created!', admin });
    } catch (error: any) { res.status(400).json({ error: error.message }); }
});

export default router;