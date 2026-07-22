import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { getAllStatuses, getBranchStatus, forceReconnect } from '../services/whatsapp.manager';

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

// POST /api/whatsapp/reconnect/:branchCode — clears session and forces fresh QR
router.post('/reconnect/:branchCode', (req: AuthRequest, res) => {
  const { branchCode } = req.params;
  const current = getBranchStatus(branchCode);
  forceReconnect(branchCode, current?.branchName ?? branchCode);
  res.json({ ok: true });
});

export { router as whatsappRoutes };
