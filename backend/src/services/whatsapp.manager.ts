import { Client, LocalAuth } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

export type ClientStatus = 'initializing' | 'qr' | 'ready' | 'disconnected';

interface PendingMsg {
  phone: string;
  message: string;
  resolve: () => void;
  reject: (e: Error) => void;
}

interface BranchState {
  client: Client;
  status: ClientStatus;
  qrDataUrl: string | null;
  pending: PendingMsg[];
  branchName: string;
}

const states = new Map<string, BranchState>();
const SESSION_BASE = path.join(process.cwd(), '.whatsapp-session');

async function safeDestroy(client: Client): Promise<void> {
  await Promise.race([
    client.destroy(),
    new Promise<void>(resolve => setTimeout(resolve, 4000)),
  ]).catch(() => {});
}

function clearSessionFiles(branchCode: string): void {
  const sessionDir = path.join(SESSION_BASE, `session-${branchCode}`);
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log(`[WhatsApp ${branchCode}] 🗑️ تم مسح ملفات الجلسة`);
    }
  } catch (e) {
    console.warn(`[WhatsApp ${branchCode}] تعذر مسح ملفات الجلسة:`, e);
  }
}

// Normalize Saudi number to digits-only: 05xxxxxxxx → 966xxxxxxxx
function normalizeNumber(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('00966')) return d.slice(2);
  if (d.startsWith('966'))   return d;
  if (d.startsWith('05'))    return '966' + d.slice(1);
  if (d.startsWith('5') && d.length === 9) return '966' + d;
  return d;
}

async function doSend(client: Client, phone: string, message: string): Promise<void> {
  const normalized = normalizeNumber(phone);
  const numberId = await client.getNumberId(normalized);
  if (!numberId) throw new Error(`الرقم ${normalized} غير مسجل على واتساب`);
  await client.sendMessage(numberId._serialized, message);
}

export function initBranchClient(branchCode: string, branchName: string): void {
  if (states.has(branchCode)) return;

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: branchCode,
      dataPath: SESSION_BASE,
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    },
  });

  const state: BranchState = {
    client,
    status: 'initializing',
    qrDataUrl: null,
    pending: [],
    branchName,
  };
  states.set(branchCode, state);

  client.on('qr', async (qr) => {
    state.status = 'qr';
    state.qrDataUrl = await QRCode.toDataURL(qr, { width: 300 });
    console.log(`[WhatsApp ${branchCode}] 📱 QR جاهز — افتح التطبيق لمسحه`);
  });

  client.on('loading_screen', (pct: number) => {
    process.stdout.write(`\r[WhatsApp ${branchCode}] ⏳ ${pct}%   `);
  });

  client.on('authenticated', () => {
    state.qrDataUrl = null;
    console.log(`\n[WhatsApp ${branchCode}] 🔐 تم التحقق`);
  });

  client.on('ready', () => {
    state.status = 'ready';
    state.qrDataUrl = null;
    console.log(`[WhatsApp ${branchCode}] ✅ جاهز (${branchName})`);
    const pending = [...state.pending];
    state.pending = [];
    for (const msg of pending) {
      doSend(client, msg.phone, msg.message).then(msg.resolve).catch(msg.reject);
    }
  });

  client.on('auth_failure', () => {
    console.error(`[WhatsApp ${branchCode}] ❌ فشل التحقق — مسح الجلسة وإعادة الاتصال...`);
    states.delete(branchCode);
    safeDestroy(client).then(() => {
      clearSessionFiles(branchCode);
      setTimeout(() => initBranchClient(branchCode, branchName), 2000);
    });
  });

  client.on('disconnected', (reason) => {
    console.warn(`[WhatsApp ${branchCode}] ⚠️ انقطع (${reason}) — إعادة الاتصال تلقائياً...`);
    states.delete(branchCode);
    // Fire-and-forget destroy — don't clear session, phone may reconnect with existing session
    safeDestroy(client).catch(() => {});
    setTimeout(() => initBranchClient(branchCode, branchName), 2000);
  });

  client.initialize().catch((err) => {
    console.error(`[WhatsApp ${branchCode}] خطأ في التهيئة:`, err.message);
    states.delete(branchCode);
    safeDestroy(client).catch(() => {});
    clearSessionFiles(branchCode);
    setTimeout(() => initBranchClient(branchCode, branchName), 5000);
  });
}

export function forceReconnect(branchCode: string, branchName: string): void {
  const existing = states.get(branchCode);
  states.delete(branchCode);
  const run = async () => {
    if (existing) await safeDestroy(existing.client);
    clearSessionFiles(branchCode);
    console.log(`[WhatsApp ${branchCode}] 🔁 إعادة اتصال يدوية — جلسة نظيفة`);
    initBranchClient(branchCode, branchName);
  };
  run().catch(console.error);
}

export async function sendFromBranch(branchCode: string, phone: string, message: string): Promise<void> {
  const state = states.get(branchCode);
  if (!state) throw new Error(`لم يتم تهيئة واتساب للفرع ${branchCode}`);

  if (state.status === 'ready') {
    await doSend(state.client, phone, message);
    return;
  }

  if (state.status === 'initializing' || state.status === 'qr') {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = state.pending.findIndex(i => i.resolve === resolve);
        if (idx !== -1) state.pending.splice(idx, 1);
        reject(new Error(`انتهت مهلة انتظار واتساب للفرع ${branchCode}`));
      }, 60_000);
      state.pending.push({
        phone, message,
        resolve: () => { clearTimeout(timer); resolve(); },
        reject:  (e) => { clearTimeout(timer); reject(e); },
      });
    });
  }

  throw new Error(`واتساب الفرع ${branchCode} غير متصل حالياً`);
}

export function getAllStatuses(): Record<string, { status: ClientStatus; qrDataUrl: string | null; branchName: string }> {
  const result: Record<string, { status: ClientStatus; qrDataUrl: string | null; branchName: string }> = {};
  for (const [code, state] of states) {
    result[code] = { status: state.status, qrDataUrl: state.qrDataUrl, branchName: state.branchName };
  }
  return result;
}

export function getBranchStatus(branchCode: string): { status: ClientStatus; qrDataUrl: string | null; branchName: string } | null {
  const state = states.get(branchCode);
  if (!state) return null;
  return { status: state.status, qrDataUrl: state.qrDataUrl, branchName: state.branchName };
}
