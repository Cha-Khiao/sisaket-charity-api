// src/models/User.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username?: string; // สำหรับ Admin
  phone?: string;    // สำหรับ User ทั่วไป
  password: string;  // เก็บแบบ Hash (เข้ารหัสแล้ว)
  name: string;
  role: 'admin' | 'user';
}

const UserSchema: Schema = new Schema({
  username: { type: String, unique: true, sparse: true }, // sparse: true เพื่อให้ค่า null ไม่ซ้ำกันได้
  phone: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  name: { type: String, default: 'Member' },
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);