import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getAllStatuses, getBranchStatus, forceReconnect } from '../services/whatsapp.manager';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

// GET /api/whatsapp/status — returns all branches (admin view)
router.get('/status', (_req, res) => {
  res.json(getAllStatuses());
});

// GET /api/whatsapp/status/:branchCode
router.get('/status/:branchCode', (req: AuthRequest, res) => {
  const s = getBranchStatus(req.params.branchCode);
  res.json(s ?? { status: 'disconnected', qrDataUrl: null, branchName: req.params.branchCode });
});

// POST /api/whatsapp/:branchCode/force-reconnect — clear session and reconnect fresh
router.post('/:branchCode/force-reconnect', async (req: AuthRequest, res) => {
  try {
    const { branchCode } = req.params;
    const branch = await prisma.branch.findUnique({ where: { code: branchCode } });
    if (!branch) { res.status(404).json({ error: 'الفرع غير موجود' }); return; }
    await forceReconnect(branchCode, branch.name);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export { router as whatsappRoutes };
