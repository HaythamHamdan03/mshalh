import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('بدء إدراج البيانات الأولية...');

  // ── Branches ─────────────────────────────────────────────────────────────
  const branches = await Promise.all([
    prisma.branch.upsert({
      where: { code: 'BR01' },
      update: { name: 'النسيم', address: 'شارع أسامة بن زيد', mapLink: 'https://maps.app.goo.gl/KHGw7SNqwXR7SsQe6' },
      create: { name: 'النسيم', code: 'BR01', address: 'شارع أسامة بن زيد', phone: '', mapLink: 'https://maps.app.goo.gl/KHGw7SNqwXR7SsQe6' },
    }),
    prisma.branch.upsert({
      where: { code: 'BR02' },
      update: { name: 'العليا', address: 'طريق الملك فهد', mapLink: 'https://maps.app.goo.gl/DzbfYtwthNgYLeba7' },
      create: { name: 'العليا', code: 'BR02', address: 'طريق الملك فهد', phone: '', mapLink: 'https://maps.app.goo.gl/DzbfYtwthNgYLeba7' },
    }),
    prisma.branch.upsert({
      where: { code: 'BR03' },
      update: { name: 'ميهاف', address: 'ميهاف', mapLink: 'https://maps.app.goo.gl/AkUQzGoAUXHdcjQX7' },
      create: { name: 'ميهاف', code: 'BR03', address: 'ميهاف', phone: '', mapLink: 'https://maps.app.goo.gl/AkUQzGoAUXHdcjQX7' },
    }),
    prisma.branch.upsert({
      where: { code: 'BR04' },
      update: { name: 'الديرة', address: 'سوق الزل', mapLink: 'https://maps.app.goo.gl/U8pa4QmTRFWUzKnn9' },
      create: { name: 'الديرة', code: 'BR04', address: 'سوق الزل', phone: '', mapLink: 'https://maps.app.goo.gl/U8pa4QmTRFWUzKnn9' },
    }),
    prisma.branch.upsert({
      where: { code: 'FCT' },
      update: {},
      create: { name: 'المصنع', code: 'FCT', address: 'المصنع', phone: '' },
    }),
  ]);

  console.log('تم إنشاء الفروع:', branches.map(b => b.name).join(', '));

  const [br01, br02, br03, br04] = branches;

  // ── System users (admin + factory + one per branch) ──────────────────────
  const USERS = [
    { username: 'admin.mshalh',   password: 'Admin@Mshalh#25',  role: 'ADMIN',   name: 'مدير النظام',          branchId: null },
    { username: 'masna3.mshalh',  password: 'Masna3@Mshalh#25', role: 'FACTORY', name: 'مشرف المصنع',          branchId: null },
    { username: 'naseem.mshalh',  password: 'Naseem@Br#2025',   role: 'BRANCH',  name: 'موظف فرع النسيم',      branchId: br01.id },
    { username: 'olaya.mshalh',   password: 'Olaya@Br#2025',    role: 'BRANCH',  name: 'موظف فرع العليا',      branchId: br02.id },
    { username: 'mihaf.mshalh',   password: 'Mihaf@Br#2025',    role: 'BRANCH',  name: 'موظف فرع ميهاف',       branchId: br03.id },
    { username: 'deera.mshalh',   password: 'Deera@Br#2025',    role: 'BRANCH',  name: 'موظف فرع الديرة',      branchId: br04.id },
  ];

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { username: u.username },
      update: { passwordHash, name: u.name, role: u.role, branchId: u.branchId },
      create: { username: u.username, passwordHash, name: u.name, role: u.role, branchId: u.branchId },
    });
  }

  console.log('تم إنشاء المستخدمين');

  // ── Dropdown options ──────────────────────────────────────────────────────
  const dropdownData = [
    // Embroidery models
    { category: 'embroideryModel', value: 'malaki',      label: 'ملكي' },
    { category: 'embroideryModel', value: 'murawba',     label: 'مروبع' },
    { category: 'embroideryModel', value: 'mukhawmas',   label: 'مخومس' },
    { category: 'embroideryModel', value: 'mutawasea',   label: 'متوسع' },
    { category: 'embroideryModel', value: 'shabak',      label: 'شبك' },
    { category: 'embroideryModel', value: 'taboq',       label: 'طابوق' },
    { category: 'embroideryModel', value: 'maktumi',     label: 'مكتومي' },
    { category: 'embroideryModel', value: 'daqqa_malik', label: 'دقة الملك عبدالله' },
    { category: 'embroideryModel', value: '319',         label: '319' },
    { category: 'embroideryModel', value: '310',         label: '310' },
    { category: 'embroideryModel', value: '331',         label: '331' },
    // Fabrics
    { category: 'fabric', value: 'ghat',            label: 'غاط' },
    { category: 'fabric', value: 'ghaten',          label: 'غاطين' },
    { category: 'fabric', value: 'msawaf',          label: 'مصوف' },
    { category: 'fabric', value: 'waneesha',        label: 'ونيشاء' },
    { category: 'fabric', value: 'kashmiri',        label: 'كشميري' },
    { category: 'fabric', value: 'wabar',           label: 'وبر' },
    { category: 'fabric', value: 'marina',          label: 'مارينا' },
    { category: 'fabric', value: 'yabani',          label: 'ياباني' },
    { category: 'fabric', value: 'najafi',          label: 'نجفي' },
    { category: 'fabric', value: 'selka',           label: 'سلكا' },
    { category: 'fabric', value: 'jokh',            label: 'جوخ' },
    { category: 'fabric', value: 'sosrol',          label: 'سوسرول' },
    { category: 'fabric', value: 'customer_fabric', label: 'قماش الزبون' },
    // Colors
    { category: 'color', value: 'aswad',    label: 'أسود' },
    { category: 'color', value: 'oudi',     label: 'عودي' },
    { category: 'color', value: 'ashqar',   label: 'أشقر' },
    { category: 'color', value: 'laimoni',  label: 'ليموني' },
    { category: 'color', value: 'zafarani', label: 'زعفراني' },
    { category: 'color', value: 'beige',    label: 'بيج' },
    { category: 'color', value: 'abyad',    label: 'أبيض' },
    { category: 'color', value: 'sukari',   label: 'سكري' },
    { category: 'color', value: 'kahli',    label: 'كحلي' },
    { category: 'color', value: 'zaiti',    label: 'زيتي' },
    { category: 'color', value: 'rasasi',   label: 'رصاصي' },
    { category: 'color', value: 'lahmi',    label: 'لحمي' },
    { category: 'color', value: 'buni',     label: 'بني' },
    // Zari type (kept for reference / future use)
    { category: 'zari', value: 'zari',              label: 'زري' },
    { category: 'zari', value: 'harir',             label: 'حرير' },
    { category: 'zari', value: 'fiddi',             label: 'فضي' },
    { category: 'zari', value: 'thahabi',           label: 'ذهبي' },
    { category: 'zari', value: 'ahmar',             label: 'أحمر' },
    { category: 'zari', value: 'aswad',             label: 'أسود' },
    { category: 'zari', value: 'bidoun',            label: 'بدون' },
    { category: 'zari', value: 'zari_fiddi',        label: 'زري فضي' },
    { category: 'zari', value: 'fiddi_aswad_fiddi', label: 'فضي أسود فضي' },
    // Zari width (numeric — سم)
    { category: 'zariWidth', value: '4',   label: '4' },
    { category: 'zariWidth', value: '4.5', label: '4.5' },
    { category: 'zariWidth', value: '5',   label: '5' },
    { category: 'zariWidth', value: '5.5', label: '5.5' },
    { category: 'zariWidth', value: '6',   label: '6' },
    // Sizes
    { category: 'size', value: '26',      label: '26' },
    { category: 'size', value: '27',      label: '27' },
    { category: 'size', value: '28',      label: '28' },
    { category: 'size', value: '29',      label: '29' },
    { category: 'size', value: '30',      label: '30' },
    { category: 'size', value: '31',      label: '31' },
    { category: 'size', value: '32',      label: '32' },
    { category: 'size', value: 'special', label: 'مقاس خاص' },
  ];

  for (const opt of dropdownData) {
    await prisma.dropdownOption.upsert({
      where: { category_value: { category: opt.category, value: opt.value } },
      update: {},
      create: { ...opt, sortOrder: dropdownData.findIndex(d => d.value === opt.value && d.category === opt.category) },
    });
  }

  console.log('تم إنشاء خيارات القوائم المنسدلة');
  console.log('\n✅ اكتملت عملية إدراج البيانات الأولية بنجاح');
  console.log('\n📋 بيانات تسجيل الدخول:');
  console.log('');
  console.log('  المدير:');
  console.log('    admin.mshalh  /  Admin@Mshalh#25');
  console.log('');
  console.log('  المصنع:');
  console.log('    masna3.mshalh  /  Masna3@Mshalh#25');
  console.log('');
  console.log('  الفروع:');
  console.log('    naseem.mshalh  /  Naseem@Br#2025   (النسيم)');
  console.log('    olaya.mshalh   /  Olaya@Br#2025    (العليا)');
  console.log('    mihaf.mshalh   /  Mihaf@Br#2025    (ميهاف)');
  console.log('    deera.mshalh   /  Deera@Br#2025    (الديرة)');
}

main()
  .catch(e => {
    console.error('خطأ في إدراج البيانات:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
