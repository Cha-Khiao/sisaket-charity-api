// src/models/Order.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  customerName: string;
  phone: string;
  address?: string;
  isShipping: boolean;
  totalPrice: number;
  paymentProofUrl?: string; // ✅ เพิ่ม field นี้สำหรับเก็บ URL สลิป
  status: 'pending_payment' | 'verification' | 'shipping' | 'completed' | 'cancelled';
  items: Array<{
    productId: mongoose.Types.ObjectId; // ✅ เพิ่ม Reference ไปหา Product
    productName: string; // เปลี่ยนจาก type เป็น productName ให้ชัดเจนขึ้น
    size: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema({
  customerName: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, default: '' },
  isShipping: { type: Boolean, default: false },
  totalPrice: { type: Number, required: true },
  
  // ✅ เก็บ URL สลิป (มาทีหลังตอนแจ้งโอน เลยไม่ต้อง required ตอนสร้าง Order แรก)
  paymentProofUrl: { type: String, default: null },

  status: { 
    type: String, 
    enum: ['pending_payment', 'verification', 'shipping', 'completed', 'cancelled'], 
    default: 'pending_payment' 
  },
  items: [{
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true }, // Link กับ Product
    productName: { type: String, required: true },
    size: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    imageUrl: { type: String }
  }]
}, { timestamps: true });

export default mongoose.model<IOrder>('Order', OrderSchema);