// src/routes/orderRoutes.ts
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product'; // ✅ ใช้ Product แทน Stock
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// 1. สร้างออร์เดอร์ใหม่ (POST /api/orders)
router.post('/', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerName, phone, address, isShipping, items } = req.body;
    let calculatedTotalPrice = 0;
    const orderItems = [];

    // 1. วนลูปเช็คของและตัดสต็อก
    for (const item of items) {
      // หา Product จาก ID (ใช้ session เพื่อ lock)
      const product = await Product.findById(item.productId).session(session);

      if (!product) {
        throw new Error(`ไม่พบสินค้า ID: ${item.productId}`);
      }

      // หา Size ใน Array stock ของ Product นั้น
      const variant = product.stock.find(s => s.size === item.size);

      if (!variant) {
        throw new Error(`สินค้า ${product.name} ไม่มีไซส์ ${item.size}`);
      }

      if (variant.quantity < item.quantity) {
        throw new Error(`สินค้า ${product.name} ไซส์ ${item.size} เหลือไม่พอ (เหลือ ${variant.quantity})`);
      }

      // ✅ ตัดของ และ เพิ่มยอดขาย (ใน memory ก่อน save)
      variant.quantity -= item.quantity;
      variant.sold = (variant.sold || 0) + item.quantity;
      
      // บันทึก Product ที่อัปเดตแล้วลง DB
      await product.save({ session });

      // ✅ เตรียมข้อมูลลง Order (ใช้ราคาจริงจาก DB เพื่อความปลอดภัย)
      const itemPrice = product.price; 
      calculatedTotalPrice += itemPrice * item.quantity;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        size: item.size,
        quantity: item.quantity,
        price: itemPrice // ใช้ราคาจากระบบ
      });
    }

    // ค่าส่ง (ถ้ามี Logic ค่าส่ง ใส่ตรงนี้ได้)
    const shippingCost = isShipping ? 50 : 0; // สมมติค่าส่ง 50
    calculatedTotalPrice += shippingCost;

    // 2. สร้างออร์เดอร์
    const newOrder = new Order({
      customerName,
      phone,
      address,
      isShipping,
      status: 'pending_payment',
      items: orderItems,
      totalPrice: calculatedTotalPrice // ✅ ใช้ราคาที่คำนวณใหม่จาก Server
    });

    const savedOrder = await newOrder.save({ session });

    // 3. ยืนยัน Transaction
    await session.commitTransaction();
    session.endSession();

    console.log('✅ Order Created & Stock Deducted:', savedOrder._id);
    res.status(201).json(savedOrder);

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('Order Error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to create order' });
  }
});

// ... (ส่วน GET orders เก็บไว้เหมือนเดิมได้เลยครับ แค่เปลี่ยน Type return ถ้าจำเป็น)
// GET ทั้งหมด
router.get('/', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET ของ User
router.get('/my-orders', async (req: Request, res: Response) => {
    try {
        const { phone } = req.query;
        if (!phone) return res.status(400).json({ error: 'Phone number is required' }); // ใส่ return เพื่อจบ function
        const orders = await Order.find({ phone: phone }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user orders' });
    }
});


// 4. [ADMIN] อัปเดตสถานะออร์เดอร์ (เช่น กดอนุมัติ, กดส่งของ)
// PATCH /api/orders/:id/status
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // รับค่า status ใหม่ เช่น 'shipping', 'completed'

    const validStatuses = ['pending_payment', 'verification', 'shipping', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
    }

    const order = await Order.findByIdAndUpdate(
      id, 
      { status: status }, 
      { new: true } // ส่งค่าใหม่กลับไป
    );

    if (!order) {
      return res.status(404).json({ error: 'ไม่พบออร์เดอร์' });
    }

    console.log(`✅ Order ${id} status updated to ${status}`);
    res.json(order);

  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;

