import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authenticate);

// GET /api/branches
router.get('/', async (_req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الفروع' });
  }
});

// POST /api/branches
router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { name, code, address, phone } = req.body;
    if (!name || !code) { res.status(400).json({ error: 'الاسم والكود مطلوبان' }); return; }

    const branch = await prisma.branch.create({ data: { name, code, address, phone } });
    res.status(201).json(branch);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إنشاء الفرع' });
  }
});

// PUT /api/branches/:id
router.put('/:id', requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { name, code, address, phone, isActive } = req.body;
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: { name, code, address, phone, isActive },
    });
    res.json(branch);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث الفرع' });
  }
});

export { router as branchesRoutes };
