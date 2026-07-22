import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateOrderNumber } from '../utils/orderNumber';
import { notificationService } from '../services/notification.service';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authenticate);

function buildOrderWhereClause(user: AuthRequest['user'], query: Record<string, string>) {
  const where: Record<string, unknown> = {};

  // Branch users only see their own branch
  if (user?.role === 'BRANCH') {
    where.branchId = user.branchId;
  } else if (query.branchId) {
    where.branchId = query.branchId;
  }

  if (query.status) where.status = query.status;
  if (query.urgent === 'true') where.urgent = true;
  if (query.customerId) where.customerId = query.customerId;

  if (query.search) {
    where.OR = [
      { orderNumber: { contains: query.search } },
      { customer: { name: { contains: query.search } } },
      { customer: { mobile: { contains: query.search } } },
    ];
  }

  // Late orders filter
  if (query.late === 'true') {
    where.dueDate = { lt: new Date() };
    where.status = { notIn: ['COMPLETED', 'CANCELLED', 'DELIVERED_TO_CUSTOMER'] };
  }

  return where;
}

// GET /api/orders
router.get('/', async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where = buildOrderWhereClause(req.user, req.query as Record<string, string>);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, mobile: true } },
          branch: { select: { id: true, name: true, code: true } },
          items: true,
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: [{ urgent: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في جلب الطلبات' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        branch: true,
        items: { orderBy: { itemNumber: 'asc' } },
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        attachments: true,
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
        payments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'الطلب غير موجود' });
      return;
    }

    // Branch users can only see their own branch orders
    if (req.user?.role === 'BRANCH' && order.branchId !== req.user.branchId) {
      res.status(403).json({ error: 'لا يمكنك الوصول إلى هذا الطلب' });
      return;
    }

    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في جلب الطلب' });
  }
});

// POST /api/orders
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { customerId, productType, quantity, dueDate, urgent, price, deposit,
      paymentStatus, branchNotes, factoryNotes, internalNotes, items } = req.body;

    // Determine branchId
    let branchId: string;
    if (req.user?.role === 'BRANCH') {
      branchId = req.user.branchId!;
    } else if (req.body.branchId) {
      branchId = req.body.branchId;
    } else {
      res.status(400).json({ error: 'يجب تحديد الفرع' });
      return;
    }

    if (!customerId) {
      res.status(400).json({ error: 'يجب تحديد العميل' });
      return;
    }

    // Verify customer belongs to branch
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || (req.user?.role === 'BRANCH' && customer.branchId !== branchId)) {
      res.status(400).json({ error: 'العميل غير موجود أو لا ينتمي لهذا الفرع' });
      return;
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      res.status(400).json({ error: 'الفرع غير موجود' });
      return;
    }

    const orderNumber = await generateOrderNumber(branch.code);
    const remaining = price && deposit !== undefined ? price - deposit : price;

    // Allow branch to send directly to factory on creation
    const initialStatus =
      req.body.status === 'SENT_TO_FACTORY' ? 'SENT_TO_FACTORY' : 'RECEIVED_AT_BRANCH';

    const order = await prisma.order.create({
      data: {
        orderNumber,
        branchId,
        customerId,
        status: initialStatus,
        productType: productType || 'BISHT',
        quantity: quantity || 1,
        dueDate: dueDate ? new Date(dueDate) : null,
        urgent: urgent || false,
        price: price ? parseFloat(price) : null,
        deposit: deposit !== undefined ? parseFloat(deposit) : null,
        remaining: remaining ? parseFloat(String(remaining)) : null,
        paymentStatus: paymentStatus || 'UNPAID',
        branchNotes,
        factoryNotes,
        internalNotes,
        createdById: req.user?.id,
        updatedById: req.user?.id,
        items: items?.length ? {
          create: items.map((item: Record<string, unknown>, idx: number) => ({
            itemNumber: idx + 1,
            ...item,
          })),
        } : undefined,
      },
      include: {
        customer: true,
        branch: true,
        items: true,
      },
    });

    // Log status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        newStatus: initialStatus,
        changedById: req.user?.id,
        notes: initialStatus === 'SENT_TO_FACTORY' ? 'تم إنشاء الطلب وإرساله للمصنع' : 'تم إنشاء الطلب',
      },
    });

    // Send SMS only when branch sends directly to factory
    if (initialStatus === 'SENT_TO_FACTORY') {
      try {
        await notificationService.sendOrderSentToFactory(customer.mobile, orderNumber, branch.name, branch.code, (branch as any).mapLink, order.id);
      } catch { /* SMS failure should not block order creation */ }
    }

    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في إنشاء الطلب' });
  }
});

// PATCH /api/orders/:id — update order details
router.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { branch: true } });
    if (!order) { res.status(404).json({ error: 'الطلب غير موجود' }); return; }

    if (req.user?.role === 'BRANCH' && order.branchId !== req.user.branchId) {
      res.status(403).json({ error: 'لا يمكنك تعديل هذا الطلب' }); return;
    }

    // Branch users cannot change factory notes or production status after factory accepts
    const factoryStatuses = ['ACCEPTED_BY_FACTORY', 'IN_PREPARATION', 'IN_CUTTING', 'IN_EMBROIDERY', 'IN_FINISHING', 'READY_AT_FACTORY'];
    if (req.user?.role === 'BRANCH' && factoryStatuses.includes(order.status)) {
      // Only allow branch notes and payment updates
      const { branchNotes, paymentStatus, deposit } = req.body;
      const updated = await prisma.order.update({
        where: { id: req.params.id },
        data: { branchNotes, paymentStatus, deposit, updatedById: req.user?.id },
        include: { customer: true, branch: true, items: true },
      });
      res.json(updated); return;
    }

    const { productType, quantity, dueDate, urgent, price, deposit, remaining,
      paymentStatus, branchNotes, factoryNotes, internalNotes } = req.body;

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        productType, quantity, dueDate: dueDate ? new Date(dueDate) : undefined,
        urgent, price, deposit, remaining, paymentStatus,
        branchNotes, factoryNotes, internalNotes, updatedById: req.user?.id,
      },
      include: { customer: true, branch: true, items: true },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في تحديث الطلب' });
  }
});

// PATCH /api/orders/:id/status — change status
router.patch('/:id/status', async (req: AuthRequest, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) { res.status(400).json({ error: 'يجب تحديد الحالة الجديدة' }); return; }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { customer: true, branch: true },
    });
    if (!order) { res.status(404).json({ error: 'الطلب غير موجود' }); return; }

    if (req.user?.role === 'BRANCH' && order.branchId !== req.user.branchId) {
      res.status(403).json({ error: 'لا يمكنك تعديل هذا الطلب' }); return;
    }

    // Validate allowed status transitions per role
    const branchAllowed = ['DRAFT', 'RECEIVED_AT_BRANCH', 'SENT_TO_FACTORY', 'RECEIVED_AT_BRANCH_CONFIRMED', 'CUSTOMER_NOTIFIED', 'DELIVERED_TO_CUSTOMER', 'COMPLETED', 'CANCELLED', 'ON_HOLD'];
    const factoryAllowed = ['ACCEPTED_BY_FACTORY', 'IN_PREPARATION', 'IN_CUTTING', 'IN_EMBROIDERY', 'IN_FINISHING', 'READY_AT_FACTORY', 'SENT_TO_BRANCH', 'ON_HOLD', 'CANCELLED'];

    if (req.user?.role === 'BRANCH' && !branchAllowed.includes(status)) {
      res.status(403).json({ error: 'غير مسموح لك بتغيير الطلب إلى هذه الحالة' }); return;
    }
    if (req.user?.role === 'FACTORY' && !factoryAllowed.includes(status)) {
      res.status(403).json({ error: 'غير مسموح لك بتغيير الطلب إلى هذه الحالة' }); return;
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status, updatedById: req.user?.id },
      include: { customer: true, branch: true },
    });

    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        oldStatus: order.status,
        newStatus: status,
        changedById: req.user?.id,
        notes,
      },
    });

    // Send SMS on key transitions
    try {
      if (status === 'SENT_TO_FACTORY') {
        await notificationService.sendOrderSentToFactory(order.customer.mobile, order.orderNumber, order.branch.name, order.branch.code, (order.branch as any).mapLink, order.id);
      } else if (status === 'RECEIVED_AT_BRANCH_CONFIRMED') {
        await notificationService.sendOrderReadyAtBranch(order.customer.mobile, order.orderNumber, order.branch.name, order.branch.code, (order.branch as any).mapLink, order.id);
      }
    } catch { /* SMS failure should not block status update */ }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في تحديث حالة الطلب' });
  }
});

// GET /api/orders/:id/history
router.get('/:id/history', async (req: AuthRequest, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) { res.status(404).json({ error: 'الطلب غير موجود' }); return; }
    if (req.user?.role === 'BRANCH' && order.branchId !== req.user.branchId) {
      res.status(403).json({ error: 'غير مسموح' }); return;
    }

    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: req.params.id },
      include: { changedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب السجل' });
  }
});

export { router as ordersRoutes };
