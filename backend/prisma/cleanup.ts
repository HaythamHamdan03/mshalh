import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('حذف البيانات التجريبية...');

  // Delete demo orders (and cascaded items/history)
  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`حُذف ${deletedOrders.count} طلب`);

  // Delete all customers
  const deletedCustomers = await prisma.customer.deleteMany({});
  console.log(`حُذف ${deletedCustomers.count} عميل`);

  // Delete all users except admin
  const deletedUsers = await prisma.user.deleteMany({
    where: { username: { not: 'admin_mshalh' } },
  });
  console.log(`حُذف ${deletedUsers.count} مستخدم`);

  // Delete notification logs
  await prisma.notificationLog.deleteMany({});

  console.log('✅ تم حذف جميع البيانات التجريبية');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
