// src/models/Product.ts
import mongoose, { Schema, Document } from 'mongoose';

// Interface สำหรับสต็อกแต่ละไซส์ (Sub-document)
interface IProductVariant {
  size: string;      // S, M, L, XL
  quantity: number;  // จำนวนคงเหลือ
  sold: number;      // ขายไปแล้วกี่ตัว (เก็บสถิติ)
}

export interface IProduct extends Document {
  name: string;          // ชื่อสินค้า เช่น "เสื้อวิ่งการกุศล (สีขาว)"
  type: 'normal' | 'mourning'; // เอาไว้ Filter ประเภท
  description?: string;  // รายละเอียดสินค้า
  price: number;         // ราคาขาย
  imageUrl: string;      // URL รูปสินค้าจาก Cloudinary
  stock: IProductVariant[]; // ✅ เก็บสต็อกแยกไซส์ในนี้เลย
  isActive: boolean;     // เปิด/ปิด การขายสินค้านี้
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['normal', 'mourning'], required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  imageUrl: { type: String, required: true }, // สำคัญมากสำหรับ Frontend
  isActive: { type: Boolean, default: true },
  
  // Array ของ Stock แยกตามไซส์
  stock: [{
    size: { type: String, required: true },
    quantity: { type: Number, required: true, default: 0 },
    sold: { type: Number, default: 0 }
  }]
}, { timestamps: true });

export default mongoose.model<IProduct>('Product', ProductSchema);