// backend/src/index.ts
import dotenv from 'dotenv';
dotenv.config(); // 👈 ต้องอยู่บรรทัดแรกสุดเสมอ

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { v2 as cloudinary } from 'cloudinary'; // ✅ Import Cloudinary

import orderRoutes from './routes/orderRoutes';
import productRoutes from './routes/productRoutes';
import paymentRoutes from './routes/paymentRoutes';
import authRoutes from './routes/authRoutes';

const app = express();
const PORT = process.env.PORT || 8000;

// ✅ ตั้งค่า Cloudinary ตรงนี้ (จุดเดียวจบ)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Routes
app.get('/', (req, res) => {
  res.send('Sisaket Charity API is Running!');
});

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/products', productRoutes);
app.use('/api/payment', paymentRoutes);

// ✅ ใส่โค้ดชุดนี้แทน (เพื่อให้รันได้ทั้งในเครื่อง และบน Vercel)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`🚀 Local Server is running on http://localhost:${PORT}`);
  });
}

// ✅ สำคัญที่สุด: ต้อง Export app
export default app;