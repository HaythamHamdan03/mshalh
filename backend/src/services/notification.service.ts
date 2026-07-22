import { prisma } from '../lib/prisma';
import { sendFromBranch } from './whatsapp.manager';

function buildOrderSentMessage(orderNumber: string, branchName: string, mapLink?: string | null): string {
  let msg = `عزيزي العميل، تم استلام طلبكم رقم ${orderNumber} لدى *المشالح العربية الخاصة* — فرع *${branchName}* وجارٍ إرساله للتصنيع. شكراً لاختياركم لنا 🙏`;
  if (mapLink) msg += `\n\n📍 موقع الفرع على الخريطة:\n${mapLink}`;
  return msg;
}

function buildOrderReadyMessage(orderNumber: string, branchName: string, mapLink?: string | null): string {
  let msg = `عزيزي العميل، طلبكم رقم ${orderNumber} جاهز للاستلام من فرع *${branchName}*. نسعد بخدمتكم — المشالح العربية الخاصة ✅`;
  if (mapLink) msg += `\n\n📍 موقع الفرع على الخريطة:\n${mapLink}`;
  return msg;
}

async function send(
  mobile: string,
  message: string,
  branchCode: string,
  orderId?: string,
): Promise<void> {
  const provider = process.env.WHATSAPP_PROVIDER || 'mock';

  const log = await prisma.notificationLog.create({
    data: { orderId, mobile, message, type: 'WHATSAPP', provider, status: 'PENDING' },
  });

  try {
    if (provider === 'mock') {
      console.log(`[WhatsApp Mock ${branchCode}] → ${mobile}`);
      console.log(`[WhatsApp Mock] "${message}"`);
      await prisma.notificationLog.update({ where: { id: log.id }, data: { status: 'SENT', sentAt: new Date() } });
      return;
    }

    if (provider === 'local') {
      await sendFromBranch(branchCode, mobile, message);
      await prisma.notificationLog.update({ where: { id: log.id }, data: { status: 'SENT', sentAt: new Date() } });
      return;
    }

    if (provider === 'ultramsg') {
      const instance = process.env.ULTRAMSG_INSTANCE;
      const token    = process.env.ULTRAMSG_TOKEN;
      if (!instance || !token) throw new Error('ULTRAMSG_INSTANCE and ULTRAMSG_TOKEN must be set');
      const body = new URLSearchParams({ token, to: mobile, body: message });
      const res  = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const json = await res.json() as { sent?: string; error?: string };
      if (json.sent !== 'true') throw new Error(json.error || 'UltraMsg error');
      await prisma.notificationLog.update({ where: { id: log.id }, data: { status: 'SENT', sentAt: new Date() } });
      return;
    }

    throw new Error(`Unknown WHATSAPP_PROVIDER: ${provider}`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await prisma.notificationLog.update({ where: { id: log.id }, data: { status: 'FAILED', error } });
    console.error(`فشل إرسال واتساب [${branchCode}]:`, error);
  }
}

export const notificationService = {
  sendOrderSentToFactory: (
    mobile: string,
    orderNumber: string,
    branchName: string,
    branchCode: string,
    mapLink?: string | null,
    orderId?: string,
  ) => send(mobile, buildOrderSentMessage(orderNumber, branchName, mapLink), branchCode, orderId),

  sendOrderReadyAtBranch: (
    mobile: string,
    orderNumber: string,
    branchName: string,
    branchCode: string,
    mapLink?: string | null,
    orderId?: string,
  ) => send(mobile, buildOrderReadyMessage(orderNumber, branchName, mapLink), branchCode, orderId),
};
