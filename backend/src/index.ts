// Must be first — loads .env before any other module reads process.env
import 'dotenv/config';

import express from 'express';
import cors from 'cors';
import path from 'path';

import { authRoutes } from './routes/auth.routes';
import { ordersRoutes } from './routes/orders.routes';
import { customersRoutes } from './routes/customers.routes';
import { branchesRoutes } from './routes/branches.routes';
import { usersRoutes } from './routes/users.routes';
import { reportsRoutes } from './routes/reports.routes';
import { settingsRoutes } from './routes/settings.routes';
import { notificationsRoutes } from './routes/notifications.routes';
import { whatsappRoutes } from './routes/whatsapp.routes';
import { initBranchClient } from './services/whatsapp.manager';
import { prisma } from './lib/prisma';

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,app://.').split(',');

app.use(cors({
  origin: (origin, callback) => {
    // Allow: no origin (server-to-server), null origin (Electron loadFile), or whitelisted origins
    if (!origin || origin === 'null' || allowedOrigins.some(o => origin.startsWith(o.trim()))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadsDir = process.env.UPLOADS_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadsDir)));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/whatsapp', whatsappRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    error: 'خطأ في الخادم',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Keep the backend alive if WhatsApp/Puppeteer throws outside a request handler
process.on('uncaughtException', (err) => {
  console.error('❌ [uncaughtException] — الباك إند يستمر:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('❌ [unhandledRejection] — الباك إند يستمر:', reason);
});

app.listen(PORT, async () => {
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);

  if (process.env.WHATSAPP_PROVIDER === 'local') {
    // Initialize one WhatsApp client per real branch (skip FCT = factory)
    const branches = await prisma.branch.findMany({
      where: { isActive: true, NOT: { code: 'FCT' } },
    });
    console.log(`📱 تهيئة واتساب لـ ${branches.length} فروع (بشكل متدرج كل 30 ثانية)...`);
    for (let i = 0; i < branches.length; i++) {
      const branch = branches[i];
      setTimeout(() => initBranchClient(branch.code, branch.name), i * 30_000);
    }
  }
});

export default app;
