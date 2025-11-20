// src/routes/orderRoutes.ts
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order';
import Product from '../models/Product';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = express.Router();

// 1. สร้างออร์เดอร์ใหม่ (POST /api/orders)
router.post('/', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customerName, phone, address, isShipping, items } = req.body;
    let calculatedTotalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);

      if (!product) throw new Error(`ไม่พบสินค้า ID: ${item.productId}`);

      const variant = product.stock.find(s => s.size === item.size);
      if (!variant) throw new Error(`สินค้า ${product.name} ไม่มีไซส์ ${item.size}`);
      if (variant.quantity < item.quantity) throw new Error(`สินค้า ${product.name} ไซส์ ${item.size} เหลือไม่พอ`);

      // ตัดสต็อก
      variant.quantity -= item.quantity;
      variant.sold = (variant.sold || 0) + item.quantity;
      
      await product.save({ session });

      const itemPrice = product.price; 
      calculatedTotalPrice += itemPrice * item.quantity;

      orderItems.push({
        productId: product._id,
        productName: product.name,
        size: item.size,
        quantity: item.quantity,
        price: itemPrice
      });
    }

    const shippingCost = isShipping ? 50 : 0;
    calculatedTotalPrice += shippingCost;

    const newOrder = new Order({
      customerName,
      phone,
      address,
      isShipping,
      status: 'pending_payment',
      items: orderItems,
      totalPrice: calculatedTotalPrice
    });

    const savedOrder = await newOrder.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(savedOrder);

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error('Order Error:', error.message);
    res.status(400).json({ error: error.message || 'Failed to create order' });
  }
});

// 2. ดึงออร์เดอร์ทั้งหมด (GET /api/orders)
// ✅ ปรับปรุง: ถ้าเป็น Admin ได้หมด, ถ้าเป็น User ได้เฉพาะของตัวเอง
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
        let filter = {};
        
        // ถ้าไม่ใช่ Admin ให้ดูได้แค่ของตัวเอง (เช็คจากเบอร์โทร หรือ ID ที่อยู่ใน Token)
        if (req.user.role !== 'admin') {
            // สมมติว่าใน Token เราเก็บ phone ไว้ หรือใช้ name ที่เป็นเบอร์โทร
            // ถ้าใน AuthRoutes ตอน Login เราส่ง name เป็นเบอร์โทร ก็ใช้ req.user.name ได้เลย
            filter = { phone: req.user.name }; 
        }

        const orders = await Order.find(filter).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// 3. ✅ [เพิ่มใหม่] ดึงออร์เดอร์รายตัว (GET /api/orders/:id)
// จำเป็นมากสำหรับหน้า Success และหน้า Notify Payment
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        
        // เช็คว่า ID ถูกต้องตาม format MongoDB ไหม
        if (!mongoose.Types.ObjectId.isValid(id)) {
             return res.status(404).json({ error: 'Invalid Order ID' });
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order details' });
    }
});

// 4. [ADMIN] อัปเดตสถานะ (PATCH /api/orders/:id/status)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending_payment', 'verification', 'shipping', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'สถานะไม่ถูกต้อง' });
    }

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true });

    if (!order) return res.status(404).json({ error: 'ไม่พบออร์เดอร์' });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;