import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, AlertTriangle, Save, Send, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { ordersApi, customersApi, settingsApi, branchesApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useLangStore } from '../stores/langStore';

const T = {
  ar: {
    pageTitle:         'طلب جديد',
    urgentTitle:       'طلب مستعجل',
    urgentNote:        (fee: number) => `يُضاف ${fee} ريال تلقائياً على السعر`,
    branchSection:     'الفرع',
    pickBranchWarn:    '⚠️ يرجى اختيار الفرع أولاً لتتمكن من البحث عن العملاء',
    customerSection:   'بيانات العميل',
    searchExisting:    'بحث عن عميل موجود',
    newCustomer:       'عميل جديد',
    searchLabel:       'بحث بالاسم أو رقم الجوال',
    searchPlaceholder: 'اكتب اسم العميل أو رقم جواله...',
    ordersCount:       (n: number) => `${n} طلب`,
    custName:          'اسم العميل',
    custNameRequired:  'اسم العميل *',
    custMobile:        'رقم الجوال',
    custMobileRequired:'رقم الجوال *',
    custMobile2:       'رقم جوال إضافي',
    custNotes:         'ملاحظات العميل',
    dupWarn:           (name: string) => `⚠️ هذا الجوال مسجل باسم "${name}" — سيتم ربط الطلب به تلقائياً`,
    orderSection:      'تفاصيل الطلب',
    productType:       'نوع المنتج',
    qty:               'العدد',
    dueDate:           'موعد التسليم *',
    price:             'السعر الإجمالي',
    deposit:           'العربون',
    remaining:         'المتبقي',
    paymentStatus:     'حالة الدفع',
    unpaid:            'غير مدفوع',
    depositPaid:       'عربون',
    fullPaid:          'مدفوع كامل',
    itemsSection:      'تفاصيل الحبات',
    addItem:           'إضافة حبة',
    itemNum:           (n: number) => `الحبة رقم ${n}`,
    embModel:          'موديل التطريز',
    fabric:            'القماش',
    color:             'اللون',
    size:              'المقاس',
    zariWidth:         'عرض الزري (سم)',
    brooj:             'البروج',
    tanjeema:          'تنجيمة',
    dakkaLine:         'خط الدكة',
    mukassar:          'مكسر',
    takheela:          'التكحيلة',
    neckHole:          'عرض حفرة الرقبة',
    embLength:         'طول التطريز',
    measurements:      'المقاسات',
    custHeight:        'طول العميل',
    sleeve:            'طول اليد / الكم',
    shoulder:          'عرض الكتف',
    chest:             'عرض الصدر',
    back:              'طول الظهر',
    front:             'طول الأمام',
    khabna:            'طول الخبنة',
    specialMeas:       'مقاسات خاصة',
    itemNotes:         'ملاحظات الحبة',
    notesSection:      'ملاحظات',
    branchNotes:       'ملاحظات الفرع',
    internalNotes:     'ملاحظات داخلية',
    saveFactory:       'حفظ الطلب في المصنع',
    save:              'حفظ الطلب',
    saveAndSend:       'حفظ وإرسال للمصنع',
    other:             'أخرى',
    optional:          'اختياري',
    unit:              'سم',
    furwaGender:       'نوع الفروة',
    furGenderMale:     'رجالي',
    furGenderFemale:   'نسائي',
    furType:           'نوع الفرو',
    products: {
      BISHT: 'بشت', FURWA: 'فروة', OTHER: 'أخرى',
    },
    furwaFabrics: [
      { value: 'marina',     label: 'مارينا' },
      { value: 'kashmiri',   label: 'كشميري' },
      { value: 'jokh',       label: 'جوخ' },
      { value: 'shamwa',     label: 'شاموا جلد' },
      { value: 'makhmal',    label: 'مخمل' },
      { value: 'soof',       label: 'صوف' },
      { value: 'sky',        label: 'سكاي' },
    ],
    furTypes: [
      { value: 'tufayli',   label: 'طفيلي' },
      { value: 'arnab',     label: 'ارنب طبيعي' },
      { value: 'mink',      label: 'منك' },
      { value: 'thalab',    label: 'فرو الثعلب' },
      { value: 'bidoun',    label: 'بدون فرو' },
    ],
  },
  ur: {
    pageTitle:         'نیا آرڈر',
    urgentTitle:       'فوری آرڈر',
    urgentNote:        (fee: number) => `${fee} ریال خودکار قیمت میں شامل`,
    branchSection:     'برانچ',
    pickBranchWarn:    '⚠️ پہلے برانچ منتخب کریں تاکہ گاہک تلاش کر سکیں',
    customerSection:   'گاہک کی معلومات',
    searchExisting:    'موجودہ گاہک تلاش کریں',
    newCustomer:       'نیا گاہک',
    searchLabel:       'نام یا موبائل سے تلاش',
    searchPlaceholder: 'نام یا موبائل نمبر لکھیں...',
    ordersCount:       (n: number) => `${n} آرڈر`,
    custName:          'گاہک کا نام',
    custNameRequired:  'گاہک کا نام *',
    custMobile:        'موبائل نمبر',
    custMobileRequired:'موبائل نمبر *',
    custMobile2:       'اضافی موبائل نمبر',
    custNotes:         'گاہک کے نوٹس',
    dupWarn:           (name: string) => `⚠️ یہ نمبر "${name}" کے نام سے موجود ہے — آرڈر اس سے جوڑا جائے گا`,
    orderSection:      'آرڈر کی تفصیل',
    productType:       'مصنوع کی قسم',
    qty:               'تعداد',
    dueDate:           'ڈیلیوری تاریخ *',
    price:             'کل قیمت',
    deposit:           'ایڈوانس',
    remaining:         'باقی',
    paymentStatus:     'ادائیگی کی حالت',
    unpaid:            'ادا نہیں ہوئی',
    depositPaid:       'ایڈوانس',
    fullPaid:          'مکمل ادا',
    itemsSection:      'آئٹمز کی تفصیل',
    addItem:           'آئٹم شامل کریں',
    itemNum:           (n: number) => `آئٹم نمبر ${n}`,
    embModel:          'کڑھائی ماڈل',
    fabric:            'کپڑا',
    color:             'رنگ',
    size:              'سائز',
    zariWidth:         'زری چوڑائی (سم)',
    brooj:             'بروج',
    tanjeema:          'تنجیمہ',
    dakkaLine:         'دکہ لائن',
    mukassar:          'مکسر',
    takheela:          'تکحیلہ',
    neckHole:          'گردن کی چوڑائی',
    embLength:         'کڑھائی کی لمبائی',
    measurements:      'پیمائش',
    custHeight:        'گاہک کا قد',
    sleeve:            'بازو / آستین',
    shoulder:          'کندھے کی چوڑائی',
    chest:             'سینے کی چوڑائی',
    back:              'پیٹھ کی لمبائی',
    front:             'آگے کی لمبائی',
    khabna:            'خبنہ کی لمبائی',
    specialMeas:       'خصوصی پیمائش',
    itemNotes:         'آئٹم کے نوٹس',
    notesSection:      'نوٹس',
    branchNotes:       'برانچ کے نوٹس',
    internalNotes:     'اندرونی نوٹس',
    saveFactory:       'فیکٹری میں آرڈر محفوظ کریں',
    save:              'آرڈر محفوظ کریں',
    saveAndSend:       'محفوظ کریں اور فیکٹری بھیجیں',
    other:             'دیگر',
    optional:          'اختیاری',
    unit:              'سم',
    furwaGender:       'فروہ کی قسم',
    furGenderMale:     'مردانہ',
    furGenderFemale:   'زنانہ',
    furType:           'فر کی قسم',
    products: {
      BISHT: 'بشت', FURWA: 'فروہ', OTHER: 'دیگر',
    },
    furwaFabrics: [
      { value: 'marina',     label: 'مارینا' },
      { value: 'kashmiri',   label: 'کشمیری' },
      { value: 'jokh',       label: 'جوخ' },
      { value: 'shamwa',     label: 'شامواہ' },
      { value: 'makhmal',    label: 'مخمل' },
      { value: 'soof',       label: 'اون' },
      { value: 'sky',        label: 'سکائی' },
    ],
    furTypes: [
      { value: 'tufayli',   label: 'طفیلی' },
      { value: 'arnab',     label: 'خرگوش' },
      { value: 'mink',      label: 'منک' },
      { value: 'thalab',    label: 'لومڑی فر' },
      { value: 'bidoun',    label: 'بغیر فر' },
    ],
  },
};

// ------ Chip selector ------
function ChipSelect({ options, value, onChange, allowCustom = true, placeholder, otherLabel }: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  allowCustom?: boolean;
  placeholder?: string;
  otherLabel?: string;
}) {
  const [custom, setCustom] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const isCustom = value && !options.find(o => o.label === value);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt.value} type="button" onClick={() => { onChange(opt.label); setShowCustom(false); }}
            className={`chip ${value === opt.label ? 'selected' : ''}`}>
            {opt.label}
          </button>
        ))}
        {allowCustom && (
          <button type="button" onClick={() => setShowCustom(!showCustom)}
            className={`chip ${isCustom || showCustom ? 'selected' : ''}`}>
            {otherLabel || 'أخرى'}
          </button>
        )}
      </div>
      {(showCustom || isCustom) && (
        <input
          type="text"
          value={isCustom ? value : custom}
          onChange={e => { setCustom(e.target.value); onChange(e.target.value); }}
          className="input-field"
          placeholder={placeholder || 'أدخل قيمة مخصصة...'}
          autoFocus
        />
      )}
    </div>
  );
}

// ------ Order Item ------
interface OrderItem {
  id: string;
  size: string;
  color: string;
  fabric: string;
  embroideryModel: string;
  zariWidth: string;
  brooj: string;
  tanjeema: string;
  dakkaLine: string;
  mukassar: string;
  takheela: string;
  neckHoleWidth: string;
  embroideryLength: string;
  customerHeight: string;
  sleeveLength: string;
  shoulderWidth: string;
  chestWidth: string;
  backLength: string;
  frontLength: string;
  khabna: string;
  specialMeasurements: string;
  notes: string;
  furwaGender: string;
  furType: string;
}

function emptyItem(): OrderItem {
  return {
    id: Math.random().toString(36).slice(2),
    size: '', color: '', fabric: '', embroideryModel: '',
    zariWidth: '', brooj: '', tanjeema: '', dakkaLine: '', mukassar: '',
    takheela: '', neckHoleWidth: '', embroideryLength: '', customerHeight: '',
    sleeveLength: '', shoulderWidth: '', chestWidth: '', backLength: '',
    frontLength: '', khabna: '', specialMeasurements: '', notes: '',
    furwaGender: '', furType: '',
  };
}

export default function NewOrderPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { factoryLang } = useLangStore();
  const isFactory = user?.role === 'FACTORY';
  const isUrdu = isFactory && factoryLang === 'ur';
  const t = isUrdu ? T.ur : T.ar;

  // Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', secondMobile: '', notes: '' });
  const [createNewCustomer, setCreateNewCustomer] = useState(false);

  // Factory-only: selected branch
  const [selectedBranchId, setSelectedBranchId] = useState('');

  // Order main
  const [productType, setProductType] = useState('BISHT');
  const [quantity, setQuantity] = useState(1);
  const [dueDate, setDueDate] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [price, setPrice] = useState('');
  const [deposit, setDeposit] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('UNPAID');

  const URGENT_FEE = 300;

  const toggleUrgent = () => {
    const next = !urgent;
    setUrgent(next);
    setPrice(prev => {
      const current = parseFloat(prev) || 0;
      const updated = next ? current + URGENT_FEE : Math.max(0, current - URGENT_FEE);
      return updated === 0 ? '' : String(updated);
    });
  };
  const [branchNotes, setBranchNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Items
  const [items, setItems] = useState<OrderItem[]>([emptyItem()]);

  // Dropdowns
  const { data: dropdowns } = useQuery({
    queryKey: ['dropdowns'],
    queryFn: () => settingsApi.getDropdowns('embroideryModel,fabric,color,zariWidth,size'),
    select: (res) => res.data as Record<string, { value: string; label: string }[]>,
  });

  // Branches (factory only)
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
    select: (res) => (res.data as any[]).filter((b: any) => b.code !== 'FCT'),
    enabled: isFactory,
  });

  // Customer search — scoped to selected branch for factory
  const searchBranchId = isFactory ? selectedBranchId : undefined;
  const { data: customerResults } = useQuery({
    queryKey: ['customers-search', customerSearch, searchBranchId],
    queryFn: () => customersApi.list({ search: customerSearch, branchId: searchBranchId }),
    enabled: customerSearch.length >= 2 && (!isFactory || !!selectedBranchId),
    select: (res) => res.data,
  });

  // Dedup check when typing mobile for a new customer
  const { data: mobileResults } = useQuery({
    queryKey: ['customers-mobile', newCustomer.mobile, searchBranchId],
    queryFn: () => customersApi.list({ search: newCustomer.mobile, branchId: searchBranchId }),
    enabled: newCustomer.mobile.length >= 9 && (!isFactory || !!selectedBranchId),
    select: (res) => res.data,
  });

  const priceNum   = parseFloat(price)   || 0;
  const depositNum = parseFloat(deposit) || 0;
  const remaining  = paymentStatus === 'FULLY_PAID'
    ? '0'
    : (priceNum > 0 ? String(Math.max(0, priceNum - depositNum)) : '');

  const updateItem = (id: string, field: keyof OrderItem, val: string) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: val } : item));
  };

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (id: string) => { if (items.length > 1) setItems(items.filter(i => i.id !== id)); };

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => customersApi.create(data),
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => ordersApi.create(data),
    onSuccess: (res) => {
      toast.success(`${isUrdu ? 'آرڈر محفوظ' : 'تم حفظ الطلب رقم'} ${res.data.orderNumber}`);
      navigate(`/orders/${res.data.id}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || (isUrdu ? 'آرڈر محفوظ کرنے میں خطا' : 'حدث خطأ في حفظ الطلب'));
    },
  });

  const handleSubmit = async (sendToFactory = false) => {
    if (isFactory && !selectedBranchId) {
      toast.error(isUrdu ? 'پہلے برانچ منتخب کریں' : 'يرجى اختيار الفرع أولاً');
      return;
    }

    let customerId = selectedCustomer?.id;

    if (createNewCustomer) {
      if (!newCustomer.name || !newCustomer.mobile) {
        toast.error(isUrdu ? 'نام اور موبائل نمبر ضروری ہے' : 'يرجى إدخال اسم العميل ورقم جواله');
        return;
      }
      const existing = mobileResults?.find((c: any) => c.mobile === newCustomer.mobile);
      if (existing) {
        customerId = existing.id;
        toast(`${isUrdu ? 'آرڈر موجودہ گاہک سے جوڑا گیا:' : 'تم ربط الطلب بالعميل الموجود:'} ${existing.name}`, { icon: 'ℹ️' });
      } else {
        try {
          const res = await createCustomerMutation.mutateAsync({
            name: newCustomer.name,
            mobile: newCustomer.mobile,
            secondMobile: newCustomer.secondMobile || undefined,
            notes: newCustomer.notes || undefined,
            branchId: isFactory ? selectedBranchId : undefined,
          });
          customerId = res.data.id;
        } catch {
          toast.error(isUrdu ? 'گاہک بنانے میں خطا' : 'حدث خطأ في إنشاء العميل');
          return;
        }
      }
    }

    if (!customerId) { toast.error(isUrdu ? 'گاہک منتخب کریں یا نیا بنائیں' : 'يرجى اختيار العميل أو إنشاء عميل جديد'); return; }
    if (!dueDate)     { toast.error(isUrdu ? 'ڈیلیوری تاریخ ضروری ہے' : 'يرجى تحديد موعد التسليم'); return; }

    const status = isFactory
      ? 'ACCEPTED_BY_FACTORY'
      : sendToFactory ? 'SENT_TO_FACTORY' : 'RECEIVED_AT_BRANCH';

    await createOrderMutation.mutateAsync({
      customerId,
      productType,
      quantity,
      dueDate,
      urgent,
      price: price ? parseFloat(price) : undefined,
      deposit: deposit ? parseFloat(deposit) : undefined,
      paymentStatus,
      branchNotes: branchNotes || undefined,
      internalNotes: internalNotes || undefined,
      items: items.map(({ id, ...rest }) => rest),
      status,
      branchId: isFactory ? selectedBranchId : undefined,
    });
  };

  const backPath = isFactory ? '/factory' : '/branch';
  const opts = dropdowns || {};

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(backPath)} className="btn-secondary btn-sm">
            <ArrowRight size={16} />
          </button>
          <h1 className="page-title">{t.pageTitle}</h1>
        </div>
        {urgent && (
          <span className="badge-urgent text-base px-4 py-2">
            <AlertTriangle size={18} />
            {t.urgentTitle}
          </span>
        )}
      </div>

      {/* Urgent toggle */}
      <div
        className={`card p-4 mb-4 flex items-center justify-between cursor-pointer transition-all ${urgent ? 'border-error bg-error/5' : ''}`}
        onClick={toggleUrgent}
      >
        <div className="flex items-center gap-3">
          <AlertTriangle size={22} className={urgent ? 'text-error' : 'text-muted'} />
          <div>
            <span className="text-lg font-bold">{t.urgentTitle}</span>
            <p className="text-xs text-muted">{t.urgentNote(URGENT_FEE)}</p>
          </div>
        </div>
        <div className={`w-12 h-6 rounded-full transition-colors ${urgent ? 'bg-error' : 'bg-border'}`}>
          <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${urgent ? 'translate-x-0' : 'translate-x-6'}`} />
        </div>
      </div>

      {/* Branch selector (factory only) */}
      {isFactory && (
        <div className="form-section">
          <h2 className="section-title"><BranchIcon />{t.branchSection}</h2>
          <div className="flex flex-wrap gap-3">
            {branches.map((b: any) => (
              <button
                key={b.id}
                type="button"
                onClick={() => { setSelectedBranchId(b.id); setSelectedCustomer(null); setCustomerSearch(''); }}
                className={`chip text-base px-5 py-2.5 ${selectedBranchId === b.id ? 'selected' : ''}`}
              >
                {b.name}
              </button>
            ))}
          </div>
          {!selectedBranchId && (
            <p className="text-warning text-sm mt-2 font-medium">{t.pickBranchWarn}</p>
          )}
        </div>
      )}

      {/* Customer Section */}
      <div className="form-section">
        <h2 className="section-title"><Users2 />{t.customerSection}</h2>

        <div className={isFactory && !selectedBranchId ? 'opacity-40 pointer-events-none' : ''}>
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={() => setCreateNewCustomer(false)}
              className={`btn flex-1 ${!createNewCustomer ? 'btn-primary' : 'btn-secondary'}`}
            >
              {t.searchExisting}
            </button>
            <button
              type="button"
              onClick={() => { setCreateNewCustomer(true); setSelectedCustomer(null); }}
              className={`btn flex-1 ${createNewCustomer ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Plus size={18} />
              {t.newCustomer}
            </button>
          </div>

          {!createNewCustomer ? (
            <div>
              <label className="input-label">{t.searchLabel}</label>
              <input
                type="text"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                className="input-field text-lg mb-3"
                placeholder={t.searchPlaceholder}
              />
              {customerResults && customerResults.length > 0 && !selectedCustomer && (
                <div className="border border-border rounded-xl overflow-hidden">
                  {customerResults.map((c: any) => (
                    <button key={c.id} type="button"
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg text-right border-b border-border last:border-0">
                      <div>
                        <p className="font-semibold text-brown-dark">{c.name}</p>
                        <p className="text-sm text-muted" dir="ltr">{c.mobile}</p>
                      </div>
                      <span className="text-xs text-muted bg-bg px-2 py-1 rounded">{t.ordersCount(c._count?.orders || 0)}</span>
                    </button>
                  ))}
                </div>
              )}
              {selectedCustomer && (
                <div className="bg-success/5 border border-success/20 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-brown-dark">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted" dir="ltr">{selectedCustomer.mobile}</p>
                  </div>
                  <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                    className="text-muted hover:text-error">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="input-label">{t.custNameRequired}</label>
                <input type="text" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="input-field text-lg" placeholder={t.custName} />
              </div>
              <div>
                <label className="input-label">{t.custMobileRequired}</label>
                <input type="tel" value={newCustomer.mobile} onChange={e => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                  className="input-field text-lg" placeholder="05xxxxxxxx" dir="ltr" />
                {mobileResults?.find((c: any) => c.mobile === newCustomer.mobile) && (
                  <p className="text-warning text-xs mt-1 font-medium">
                    {t.dupWarn(mobileResults.find((c: any) => c.mobile === newCustomer.mobile).name)}
                  </p>
                )}
              </div>
              <div>
                <label className="input-label">{t.custMobile2}</label>
                <input type="tel" value={newCustomer.secondMobile} onChange={e => setNewCustomer({ ...newCustomer, secondMobile: e.target.value })}
                  className="input-field" placeholder={t.optional} dir="ltr" />
              </div>
              <div>
                <label className="input-label">{t.custNotes}</label>
                <input type="text" value={newCustomer.notes} onChange={e => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  className="input-field" placeholder="..." />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Details */}
      <div className="form-section">
        <h2 className="section-title"><Package2 />{t.orderSection}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="input-label">{t.productType}</label>
            <select value={productType} onChange={e => setProductType(e.target.value)} className="select-field text-lg">
              {(Object.keys(t.products) as Array<keyof typeof t.products>).map(k => (
                <option key={k} value={k}>{t.products[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">{t.qty}</label>
            <input type="number" min={1} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)}
              className="input-field text-lg" />
          </div>
          <div>
            <label className="input-label">{t.dueDate}</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="input-field text-lg" dir="ltr" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="input-label">{t.price}</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
              className="input-field text-lg" placeholder="0.00" />
          </div>
          <div>
            <label className="input-label">{t.deposit}</label>
            <input type="number" value={deposit} onChange={e => setDeposit(e.target.value)}
              className="input-field text-lg" placeholder="0.00" />
          </div>
          <div>
            <label className="input-label">{t.remaining}</label>
            <input type="number" value={remaining} readOnly className="input-field text-lg bg-bg" />
          </div>
        </div>

        <div className="mt-4">
          <label className="input-label">{t.paymentStatus}</label>
          <div className="flex gap-3">
            {[
              { v: 'UNPAID',       l: t.unpaid },
              { v: 'DEPOSIT_PAID', l: t.depositPaid },
              { v: 'FULLY_PAID',   l: t.fullPaid },
            ].map(opt => (
              <button key={opt.v} type="button" onClick={() => setPaymentStatus(opt.v)}
                className={`chip flex-1 justify-center ${paymentStatus === opt.v ? 'selected' : ''}`}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="form-section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title m-0">{t.itemsSection}</h2>
          <button type="button" onClick={addItem} className="btn-secondary btn-sm">
            <Plus size={16} /> {t.addItem}
          </button>
        </div>

        {items.map((item, idx) => (
          <div key={item.id} className="border border-border rounded-xl p-4 mb-4 bg-bg/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-brown">{t.itemNum(idx + 1)}</h3>
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(item.id)} className="text-error hover:opacity-80">
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* ─── BISHT ──────────────────────────────────── */}
              {productType === 'BISHT' && <>
                <div>
                  <label className="input-label">{t.embModel}</label>
                  <ChipSelect options={opts.embroideryModel || []} value={item.embroideryModel}
                    onChange={v => updateItem(item.id, 'embroideryModel', v)} otherLabel={t.other} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="input-label">{t.fabric}</label>
                    <ChipSelect options={opts.fabric || []} value={item.fabric} onChange={v => updateItem(item.id, 'fabric', v)} otherLabel={t.other} />
                  </div>
                  <div>
                    <label className="input-label">{t.color}</label>
                    <ChipSelect options={opts.color || []} value={item.color} onChange={v => updateItem(item.id, 'color', v)} otherLabel={t.other} />
                  </div>
                  <div>
                    <label className="input-label">{t.size}</label>
                    <ChipSelect options={opts.size || []} value={item.size} onChange={v => updateItem(item.id, 'size', v)} placeholder={t.size} otherLabel={t.other} />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="input-label">{t.zariWidth}</label>
                    <ChipSelect options={opts.zariWidth || []} value={item.zariWidth} onChange={v => updateItem(item.id, 'zariWidth', v)} placeholder={t.zariWidth} otherLabel={t.other} />
                  </div>
                  <div>
                    <label className="input-label">{t.brooj}</label>
                    <input type="text" value={item.brooj} onChange={e => updateItem(item.id, 'brooj', e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="input-label">{t.tanjeema}</label>
                    <input type="text" value={item.tanjeema} onChange={e => updateItem(item.id, 'tanjeema', e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="input-label">{t.dakkaLine}</label>
                    <input type="text" value={item.dakkaLine} onChange={e => updateItem(item.id, 'dakkaLine', e.target.value)} className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="input-label">{t.mukassar}</label>
                    <input type="text" value={item.mukassar} onChange={e => updateItem(item.id, 'mukassar', e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="input-label">{t.takheela}</label>
                    <input type="text" value={item.takheela} onChange={e => updateItem(item.id, 'takheela', e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="input-label">{t.neckHole}</label>
                    <input type="text" value={item.neckHoleWidth} onChange={e => updateItem(item.id, 'neckHoleWidth', e.target.value)} className="input-field" />
                  </div>
                  <div>
                    <label className="input-label">{t.embLength}</label>
                    <input type="text" value={item.embroideryLength} onChange={e => updateItem(item.id, 'embroideryLength', e.target.value)} className="input-field" />
                  </div>
                </div>
              </>}

              {/* ─── FURWA ──────────────────────────────────── */}
              {productType === 'FURWA' && <>
                <div>
                  <label className="input-label">{t.furwaGender}</label>
                  <div className="flex gap-3">
                    {[
                      { v: t.furGenderMale },
                      { v: t.furGenderFemale },
                    ].map(opt => (
                      <button key={opt.v} type="button"
                        onClick={() => updateItem(item.id, 'furwaGender', opt.v)}
                        className={`chip flex-1 justify-center text-base ${item.furwaGender === opt.v ? 'selected' : ''}`}>
                        {opt.v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">{t.fabric}</label>
                    <ChipSelect options={t.furwaFabrics} value={item.fabric}
                      onChange={v => updateItem(item.id, 'fabric', v)} otherLabel={t.other} />
                  </div>
                  <div>
                    <label className="input-label">{t.color}</label>
                    <ChipSelect options={opts.color || []} value={item.color}
                      onChange={v => updateItem(item.id, 'color', v)} otherLabel={t.other} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">{t.furType}</label>
                    <ChipSelect options={t.furTypes} value={item.furType}
                      onChange={v => updateItem(item.id, 'furType', v)} otherLabel={t.other} />
                  </div>
                  <div>
                    <label className="input-label">{t.size}</label>
                    <ChipSelect options={opts.size || []} value={item.size}
                      onChange={v => updateItem(item.id, 'size', v)} placeholder={t.size} otherLabel={t.other} />
                  </div>
                </div>
              </>}

              {/* ─── Measurements (BISHT + FURWA) ─────────── */}
              {(productType === 'BISHT' || productType === 'FURWA') && <>
                <div className="divider" />
                <h4 className="font-semibold text-brown">{t.measurements}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { field: 'customerHeight', label: t.custHeight },
                    { field: 'sleeveLength',   label: t.sleeve },
                    { field: 'shoulderWidth',  label: t.shoulder },
                    { field: 'chestWidth',     label: t.chest },
                    { field: 'backLength',     label: t.back },
                    { field: 'frontLength',    label: t.front },
                    { field: 'khabna',         label: t.khabna },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="input-label">{label}</label>
                      <input type="text" value={(item as any)[field]}
                        onChange={e => updateItem(item.id, field as keyof OrderItem, e.target.value)}
                        className="input-field" placeholder={t.unit} />
                    </div>
                  ))}
                </div>
              </>}

              {/* ─── OTHER: only measurements ─────────────── */}
              {productType === 'OTHER' && <>
                <h4 className="font-semibold text-brown">{t.measurements}</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { field: 'customerHeight', label: t.custHeight },
                    { field: 'sleeveLength',   label: t.sleeve },
                    { field: 'shoulderWidth',  label: t.shoulder },
                    { field: 'chestWidth',     label: t.chest },
                    { field: 'backLength',     label: t.back },
                    { field: 'frontLength',    label: t.front },
                    { field: 'khabna',         label: t.khabna },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="input-label">{label}</label>
                      <input type="text" value={(item as any)[field]}
                        onChange={e => updateItem(item.id, field as keyof OrderItem, e.target.value)}
                        className="input-field" placeholder={t.unit} />
                    </div>
                  ))}
                </div>
              </>}

              {/* ─── Always: special measurements + notes ─── */}
              <div>
                <label className="input-label">{t.specialMeas}</label>
                <input type="text" value={item.specialMeasurements}
                  onChange={e => updateItem(item.id, 'specialMeasurements', e.target.value)}
                  className="input-field" placeholder="..." />
              </div>
              <div>
                <label className="input-label">{t.itemNotes}</label>
                <input type="text" value={item.notes}
                  onChange={e => updateItem(item.id, 'notes', e.target.value)}
                  className="input-field" placeholder="..." />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="form-section">
        <h2 className="section-title">{t.notesSection}</h2>
        <div className="space-y-4">
          <div>
            <label className="input-label">{t.branchNotes}</label>
            <textarea value={branchNotes} onChange={e => setBranchNotes(e.target.value)}
              className="textarea-field" placeholder="..." rows={3} />
          </div>
          <div>
            <label className="input-label">{t.internalNotes}</label>
            <textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)}
              className="textarea-field" placeholder="..." rows={2} />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 bg-bg border-t border-border py-4 px-0 flex items-center gap-3">
        {isFactory ? (
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={createOrderMutation.isPending}
            className="btn-primary btn-lg flex-1"
          >
            <Save size={20} />
            {t.saveFactory}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={createOrderMutation.isPending}
              className="btn-primary btn-lg flex-1"
            >
              <Save size={20} />
              {t.save}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={createOrderMutation.isPending}
              className="btn-lg flex-1"
              style={{ background: '#2F6B3F', color: 'white', borderRadius: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <Send size={20} />
              {t.saveAndSend}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Users2() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function Package2() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>; }
function BranchIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>; }
