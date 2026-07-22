import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authenticate);

// GET /api/notifications — admin/factory see all, branch sees their own
router.get('/', async (req: any, res) => {
  try {
    const logs = await prisma.notificationLog.findMany({
      where: req.user?.role === 'BRANCH'
        ? { order: { branchId: req.user.branchId } }
        : {},
      include: { order: { select: { orderNumber: true, branchId: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإشعارات' });
  }
});

export { router as notificationsRoutes };
