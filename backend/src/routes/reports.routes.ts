import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authenticate);

// GET /api/reports/orders-by-branch — admin + factory
router.get('/orders-by-branch', requireRole('ADMIN', 'FACTORY'), async (_req, res) => {
  try {
    const data = await prisma.order.groupBy({
      by: ['branchId'],
      _count: true,
    });

    const branches = await prisma.branch.findMany();
    const result = data.map(d => ({
      branch: branches.find(b => b.id === d.branchId),
      count: d._count,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التقرير' });
  }
});

// GET /api/reports/orders-by-status
router.get('/orders-by-status', async (req: AuthRequest, res) => {
  try {
    const where: Record<string, unknown> = {};
    if (req.user?.role === 'BRANCH') where.branchId = req.user.branchId;

    const data = await prisma.order.groupBy({ by: ['status'], where, _count: true });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التقرير' });
  }
});

// GET /api/reports/summary
router.get('/summary', async (req: AuthRequest, res) => {
  try {
    const where: Record<string, unknown> = {};
    if (req.user?.role === 'BRANCH') where.branchId = req.user.branchId;

    const [total, urgent, late, completed] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({ where: { ...where, urgent: true } }),
      prisma.order.count({
        where: {
          ...where,
          dueDate: { lt: new Date() },
          status: { notIn: ['COMPLETED', 'CANCELLED', 'DELIVERED_TO_CUSTOMER'] },
        },
      }),
      prisma.order.count({ where: { ...where, status: 'COMPLETED' } }),
    ]);

    const revenue = await prisma.order.aggregate({
      where: { ...where, status: { notIn: ['CANCELLED'] } },
      _sum: { price: true, deposit: true },
    });

    res.json({ total, urgent, late, completed, revenue: revenue._sum });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في التقرير' });
  }
});

// GET /api/reports/audit-log — admin only
router.get('/audit-log', requireRole('ADMIN'), async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب سجل المراجعة' });
  }
});

export { router as reportsRoutes };
