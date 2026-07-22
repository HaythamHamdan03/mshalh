import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { branch: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      return;
    }

    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
      branchCode: user.branch?.code ?? null,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    } as jwt.SignOptions);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        branchId: user.branchId,
        branch: user.branch ? { id: user.branch.id, name: user.branch.name, code: user.branch.code } : null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { branch: true },
    });

    if (!user) {
      res.status(404).json({ error: 'المستخدم غير موجود' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      branchId: user.branchId,
      branch: user.branch ? { id: user.branch.id, name: user.branch.name, code: user.branch.code } : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

export { router as authRoutes };
