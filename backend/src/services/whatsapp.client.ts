import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

let client: Client | null = null;
let ready = false;

// Queue of messages that arrived before the client was ready
const pendingQueue: { phone: string; message: string; resolve: () => void; reject: (e: Error) => void }[] = [];

async function flushQueue() {
  while (pendingQueue.length > 0) {
    const item = pendingQueue.shift()!;
    try {
      await doSend(item.phone, item.message);
      item.resolve();
    } catch (e) {
      item.reject(e instanceof Error ? e : new Error(String(e)));
    }
  }
}

export function initWhatsApp() {
  if (process.env.WHATSAPP_PROVIDER !== 'local') return;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.whatsapp-session' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    },
  });

  client.on('qr', (qr) => {
    console.log('\n══════════════════════════════════════');
    console.log('  📱 امسح رمز QR لربط واتساب');
    console.log('  WhatsApp → Linked Devices → Link a Device');
    console.log('══════════════════════════════════════\n');
    qrcode.generate(qr, { small: true });
  });

  client.on('loading_screen', (percent: number) => {
    process.stdout.write(`\r  ⏳ واتساب يتصل... ${percent}%   `);
  });

  client.on('authenticated', () => {
    console.log('\n  🔐 تم التحقق من الجلسة — جارٍ الاتصال...');
  });

  client.on('ready', () => {
    ready = true;
    console.log('\n✅ واتساب متصل وجاهز لإرسال الرسائل\n');
    flushQueue().catch(console.error);
  });

  client.on('auth_failure', () => {
    console.error('\n❌ فشل التحقق من واتساب — امسح QR مرة أخرى');
    ready = false;
  });

  client.on('disconnected', () => {
    ready = false;
    console.warn('\n⚠️  انقطع الاتصال بواتساب — سيتم إعادة المحاولة...');
    setTimeout(() => client?.initialize(), 5000);
  });

  client.initialize();
}

// Normalize any Saudi format to digits-only (no + prefix): 05xxxxxxxx → 9665xxxxxxxx
function normalizeNumber(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('00966')) return d.slice(2);
  if (d.startsWith('966'))   return d;
  if (d.startsWith('05'))    return '966' + d.slice(1);
  if (d.startsWith('5') && d.length === 9) return '966' + d;
  return d;
}

async function doSend(phone: string, message: string): Promise<void> {
  if (!client) throw new Error('WhatsApp client not initialised');
  const normalized = normalizeNumber(phone);
  const numberId = await client.getNumberId(normalized);
  if (!numberId) throw new Error(`الرقم ${normalized} غير مسجل على واتساب`);
  await client.sendMessage(numberId._serialized, message);
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  if (ready) {
    // Client is live — send immediately
    await doSend(phone, message);
    return;
  }

  if (client) {
    // Client is initializing — queue for up to 60 seconds
    console.log(`  ⏳ واتساب لم يتصل بعد — الرسالة في الانتظار (${phone})`);
    await new Promise<void>((resolve, reject) => {
      pendingQueue.push({ phone, message, resolve, reject });
      // Timeout: if not sent within 60s, reject
      setTimeout(() => {
        const idx = pendingQueue.findIndex(i => i.resolve === resolve);
        if (idx !== -1) {
          pendingQueue.splice(idx, 1);
          reject(new Error('انتهت مهلة الانتظار — واتساب لم يتصل خلال 60 ثانية'));
        }
      }, 60_000);
    });
    return;
  }

  throw new Error('WHATSAPP_PROVIDER=local لكن initWhatsApp لم يُستدعَ');
}

export function isWhatsAppReady(): boolean {
  return ready;
}
