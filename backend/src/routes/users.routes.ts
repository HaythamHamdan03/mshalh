import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

router.use(authenticate);

// GET /api/users  — admin only
router.get('/', requireRole('ADMIN'), async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { branch: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users.map(u => ({ ...u, passwordHash: undefined })));
  } catch (err) {
    res.status(500).json({ error: 'خطأ في جلب المستخدمين' });
  }
});

// POST /api/users — admin only
router.post('/', requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { name, username, password, role, branchId } = req.body;
    if (!name || !username || !password) {
      res.status(400).json({ error: 'الاسم واسم المستخدم وكلمة المرور مطلوبة' }); return;
    }

    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) { res.status(400).json({ error: 'اسم المستخدم مستخدم بالفعل' }); return; }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, username, passwordHash, role: role || 'BRANCH', branchId: branchId || null },
      include: { branch: true },
    });

    res.status(201).json({ ...user, passwordHash: undefined });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إنشاء المستخدم' });
  }
});

// PUT /api/users/:id — admin only
router.put('/:id', requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { name, role, branchId, isActive, password } = req.body;

    const updateData: Record<string, unknown> = { name, role, branchId: branchId || null, isActive };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      include: { branch: true },
    });

    res.json({ ...user, passwordHash: undefined });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث المستخدم' });
  }
});

// PATCH /api/users/me/password — any authenticated user
router.patch('/me/password', async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) { res.status(404).json({ error: 'المستخدم غير موجود' }); return; }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' }); return; }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تغيير كلمة المرور' });
  }
});

export { router as usersRoutes };
