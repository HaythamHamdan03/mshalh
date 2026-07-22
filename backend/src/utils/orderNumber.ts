import { prisma } from '../lib/prisma';

export async function generateOrderNumber(branchCode: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

  const prefix = `ARA-${dateStr}-${branchCode}-`;

  const lastOrder = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
  });

  let seq = 1;
  if (lastOrder) {
    const parts = lastOrder.orderNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) seq = lastSeq + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}
