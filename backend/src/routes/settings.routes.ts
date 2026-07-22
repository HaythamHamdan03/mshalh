import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authenticate);

// GET /api/settings/dropdowns?category=fabric,color,embroideryModel
router.get('/dropdowns', async (req, res) => {
  try {
    const categories = req.query.category
      ? (req.query.category as string).split(',')
      : undefined;

    const options = await prisma.dropdownOption.findMany({
      where: {
        isActive: true,
        ...(categories ? { category: { in: categories } } : {}),
      },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    // Group by category
    const grouped: Record<string, typeof options> = {};
    for (const opt of options) {
      if (!grouped[opt.category]) grouped[opt.category] = [];
      grouped[opt.category].push(opt);
    }

    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الخيارات' });
  }
});

// POST /api/settings/dropdowns — admin only
router.post('/dropdowns', requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { category, value, label, sortOrder } = req.body;
    if (!category || !value || !label) {
      res.status(400).json({ error: 'الفئة والقيمة والتسمية مطلوبة' }); return;
    }
    const option = await prisma.dropdownOption.create({
      data: { category, value, label, sortOrder: sortOrder || 0 },
    });
    res.status(201).json(option);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إضافة الخيار' });
  }
});

// PUT /api/settings/dropdowns/:id — admin only
router.put('/dropdowns/:id', requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { label, sortOrder, isActive } = req.body;
    const option = await prisma.dropdownOption.update({
      where: { id: req.params.id },
      data: { label, sortOrder, isActive },
    });
    res.json(option);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث الخيار' });
  }
});

// GET /api/settings/system
router.get('/system', requireRole('ADMIN'), async (_req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.key] = s.value; });
    res.json(map);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب الإعدادات' });
  }
});

// PUT /api/settings/system
router.put('/system', requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const settings: Record<string, string> = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حفظ الإعدادات' });
  }
});

export { router as settingsRoutes };
