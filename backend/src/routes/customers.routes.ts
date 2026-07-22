import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authenticate);

// GET /api/customers
router.get('/', async (req: AuthRequest, res) => {
  try {
    const where: Record<string, unknown> = {};

    if (req.user?.role === 'BRANCH') {
      where.branchId = req.user.branchId;
    } else if (req.query.branchId) {
      where.branchId = req.query.branchId;
    }

    if (req.query.search) {
      where.OR = [
        { name: { contains: req.query.search as string } },
        { mobile: { contains: req.query.search as string } },
        { secondMobile: { contains: req.query.search as string } },
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, code: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب العملاء' });
  }
});

// GET /api/customers/:id
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: {
        branch: true,
        measurements: { orderBy: { createdAt: 'desc' }, take: 1 },
        orders: {
          include: { items: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!customer) { res.status(404).json({ error: 'العميل غير موجود' }); return; }

    if (req.user?.role === 'BRANCH' && customer.branchId !== req.user.branchId) {
      res.status(403).json({ error: 'لا يمكنك الوصول إلى بيانات هذا العميل' }); return;
    }

    res.json(customer);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب بيانات العميل' });
  }
});

// POST /api/customers
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, mobile, secondMobile, notes } = req.body;

    if (!name || !mobile) {
      res.status(400).json({ error: 'الاسم ورقم الجوال مطلوبان' }); return;
    }

    const branchId = req.user?.role === 'BRANCH' ? req.user.branchId! : req.body.branchId;
    if (!branchId) { res.status(400).json({ error: 'يجب تحديد الفرع' }); return; }

    // Dedup: reuse existing customer if same mobile exists in this branch
    const existing = await prisma.customer.findFirst({
      where: { branchId, mobile },
      include: { branch: true },
    });
    if (existing) {
      res.status(200).json(existing);
      return;
    }

    const customer = await prisma.customer.create({
      data: { name, mobile, secondMobile, notes, branchId },
      include: { branch: true },
    });

    res.status(201).json(customer);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إنشاء العميل' });
  }
});

// PUT /api/customers/:id
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) { res.status(404).json({ error: 'العميل غير موجود' }); return; }
    if (req.user?.role === 'BRANCH' && customer.branchId !== req.user.branchId) {
      res.status(403).json({ error: 'لا يمكنك تعديل بيانات هذا العميل' }); return;
    }

    const { name, mobile, secondMobile, notes } = req.body;
    const updated = await prisma.customer.update({
      where: { id: req.params.id },
      data: { name, mobile, secondMobile, notes },
      include: { branch: true },
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث بيانات العميل' });
  }
});

// POST /api/customers/:id/measurements
router.post('/:id/measurements', async (req: AuthRequest, res) => {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
    if (!customer) { res.status(404).json({ error: 'العميل غير موجود' }); return; }
    if (req.user?.role === 'BRANCH' && customer.branchId !== req.user.branchId) {
      res.status(403).json({ error: 'غير مسموح' }); return;
    }

    const measurement = await prisma.customerMeasurement.create({
      data: { customerId: req.params.id, ...req.body },
    });

    res.status(201).json(measurement);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حفظ المقاسات' });
  }
});

// DELETE /api/customers/all — admin only: wipes all orders + customers
router.delete('/all', requireRole('ADMIN'), async (_req, res) => {
  try {
    await prisma.orderStatusHistory.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.attachment.deleteMany({});
    await prisma.notificationLog.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.customerMeasurement.deleteMany({});
    const { count } = await prisma.customer.deleteMany({});
    res.json({ message: `تم حذف ${count} عميل وجميع الطلبات المرتبطة بنجاح` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في حذف البيانات' });
  }
});

export { router as customersRoutes };
