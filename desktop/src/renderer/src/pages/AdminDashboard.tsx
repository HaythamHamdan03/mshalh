import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Building2, Settings, BarChart2, Plus, X, Trash2, AlertTriangle, MessageCircle, CheckCircle, WifiOff, Loader } from 'lucide-react';
import { usersApi, branchesApi, settingsApi, reportsApi, customersApi, whatsappApi } from '../lib/api';
import toast from 'react-hot-toast';

type Tab = 'branches' | 'users' | 'settings' | 'reports' | 'data' | 'whatsapp';

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('branches');

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'branches', label: 'الفروع',       icon: <Building2 size={18} /> },
    { id: 'users',    label: 'المستخدمون',   icon: <Users size={18} /> },
    { id: 'settings', label: 'خيارات النظام', icon: <Settings size={18} /> },
    { id: 'reports',  label: 'التقارير',      icon: <BarChart2 size={18} /> },
    { id: 'data',     label: 'إدارة البيانات', icon: <Trash2 size={18} /> },
    { id: 'whatsapp', label: 'واتساب',         icon: <MessageCircle size={18} /> },
  ];

  return (
    <div>
      <h1 className="page-title mb-6">إدارة النظام</h1>

      <div className="card">
        <div className="flex border-b border-border">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm border-b-2 transition-colors ${
                tab === t.id ? 'border-gold text-gold-dark' : 'border-transparent text-muted hover:text-brown'
              }`}>
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'branches' && <BranchesTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'settings' && <SettingsTab />}
          {tab === 'reports' && <ReportsTab />}
          {tab === 'data' && <DataTab />}
          {tab === 'whatsapp' && <WhatsAppTab />}
        </div>
      </div>
    </div>
  );
}

// ---------- Branches Tab ----------
function BranchesTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', phone: '' });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
    select: (res) => res.data,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => branchesApi.create(data),
    onSuccess: () => {
      toast.success('تم إنشاء الفرع بنجاح');
      qc.invalidateQueries({ queryKey: ['branches'] });
      setShowForm(false);
      setForm({ name: '', code: '', address: '', phone: '' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'حدث خطأ في إنشاء الفرع'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold">الفروع ({branches.length})</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm">
          <Plus size={16} /> فرع جديد
        </button>
      </div>

      {showForm && (
        <div className="bg-bg border border-border rounded-xl p-4 mb-5 grid grid-cols-2 gap-3">
          {[
            { key: 'name', label: 'اسم الفرع', placeholder: 'الفرع الخامس' },
            { key: 'code', label: 'الكود', placeholder: 'BR05' },
            { key: 'address', label: 'العنوان', placeholder: 'المدينة - الحي' },
            { key: 'phone', label: 'الهاتف', placeholder: '01xxxxxxxx' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="input-label">{label}</label>
              <input type="text" value={(form as any)[key]} onChange={e => setForm({ ...form, [key]: e.target.value })}
                className="input-field" placeholder={placeholder} />
            </div>
          ))}
          <div className="col-span-2 flex gap-3">
            <button onClick={() => createMutation.mutate(form)} className="btn-primary flex-1">حفظ</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">إلغاء</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead><tr><th>الاسم</th><th>الكود</th><th>العنوان</th><th>الهاتف</th><th>الحالة</th></tr></thead>
          <tbody>
            {branches.map((b: any) => (
              <tr key={b.id}>
                <td className="font-semibold">{b.name}</td>
                <td className="font-mono text-sm" dir="ltr">{b.code}</td>
                <td className="text-sm">{b.address || '—'}</td>
                <td className="text-sm" dir="ltr">{b.phone || '—'}</td>
                <td>
                  <span className={`badge ${b.isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                    {b.isActive ? 'نشط' : 'معطل'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Users Tab ----------
function UsersTab() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '', role: 'BRANCH', branchId: '' });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
    select: (res) => res.data,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
    select: (res) => res.data,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: () => {
      toast.success('تم إنشاء المستخدم');
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false);
      setForm({ name: '', username: '', password: '', role: 'BRANCH', branchId: '' });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'حدث خطأ'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersApi.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  const roleLabel = (r: string) =>
    r === 'ADMIN' ? 'مدير النظام' : r === 'FACTORY' ? 'مشرف المصنع' : 'موظف فرع';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold">المستخدمون ({users.length})</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-sm">
          <Plus size={16} /> مستخدم جديد
        </button>
      </div>

      {showForm && (
        <div className="bg-bg border border-border rounded-xl p-4 mb-5 grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">الاسم</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="اسم المستخدم الكامل" />
          </div>
          <div>
            <label className="input-label">اسم الدخول</label>
            <input type="text" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
              className="input-field" dir="ltr" placeholder="username" />
          </div>
          <div>
            <label className="input-label">كلمة المرور</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className="input-field" placeholder="••••••••" />
          </div>
          <div>
            <label className="input-label">الدور</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="select-field">
              <option value="BRANCH">موظف فرع</option>
              <option value="FACTORY">مشرف المصنع</option>
              <option value="ADMIN">مدير النظام</option>
            </select>
          </div>
          {form.role === 'BRANCH' && (
            <div className="col-span-2">
              <label className="input-label">الفرع</label>
              <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className="select-field">
                <option value="">اختر الفرع</option>
                {branches.map((b: any) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="col-span-2 flex gap-3">
            <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}
              className="btn-primary flex-1">
              {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ المستخدم'}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">إلغاء</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead><tr><th>الاسم</th><th>اسم الدخول</th><th>الدور</th><th>الفرع</th><th>الحالة</th><th>إجراء</th></tr></thead>
          <tbody>
            {users.map((u: any) => (
              <tr key={u.id}>
                <td className="font-semibold">{u.name}</td>
                <td className="font-mono text-sm" dir="ltr">{u.username}</td>
                <td>
                  <span className={`badge text-xs ${
                    u.role === 'ADMIN' ? 'bg-gold/10 text-gold-dark' :
                    u.role === 'FACTORY' ? 'bg-blue-50 text-blue-700' : 'bg-bg text-brown'
                  }`}>{roleLabel(u.role)}</span>
                </td>
                <td className="text-sm">{u.branch?.name || '—'}</td>
                <td>
                  <span className={`badge ${u.isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                    {u.isActive ? 'نشط' : 'معطل'}
                  </span>
                </td>
                <td>
                  <button onClick={() => toggleActiveMutation.mutate({ id: u.id, isActive: !u.isActive })}
                    className={`btn-sm text-xs ${u.isActive ? 'btn-secondary' : 'btn-success'}`}>
                    {u.isActive ? 'تعطيل' : 'تفعيل'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Settings Tab ----------
function SettingsTab() {
  const qc = useQueryClient();
  const [newOpt, setNewOpt] = useState({ category: 'embroideryModel', value: '', label: '' });

  const { data: opts } = useQuery({
    queryKey: ['dropdowns-all'],
    queryFn: () => settingsApi.getDropdowns(),
    select: (res) => res.data as Record<string, any[]>,
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => settingsApi.addDropdown(data),
    onSuccess: () => {
      toast.success('تم إضافة الخيار');
      qc.invalidateQueries({ queryKey: ['dropdowns-all'] });
      setNewOpt({ ...newOpt, value: '', label: '' });
    },
    onError: () => toast.error('حدث خطأ'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      settingsApi.updateDropdown(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dropdowns-all'] }),
  });

  const categoryLabels: Record<string, string> = {
    embroideryModel: 'موديل التطريز', fabric: 'القماش', color: 'الألوان',
    zari: 'خيارات الزري', size: 'المقاسات',
  };

  return (
    <div>
      <h2 className="text-lg font-bold mb-5">إدارة القوائم المنسدلة</h2>

      {/* Add new option */}
      <div className="bg-bg border border-border rounded-xl p-4 mb-6 grid grid-cols-3 gap-3">
        <div>
          <label className="input-label">الفئة</label>
          <select value={newOpt.category} onChange={e => setNewOpt({ ...newOpt, category: e.target.value })} className="select-field">
            {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="input-label">القيمة (بالإنجليزية)</label>
          <input type="text" value={newOpt.value} onChange={e => setNewOpt({ ...newOpt, value: e.target.value })}
            className="input-field" dir="ltr" placeholder="my_option" />
        </div>
        <div>
          <label className="input-label">التسمية (بالعربية)</label>
          <input type="text" value={newOpt.label} onChange={e => setNewOpt({ ...newOpt, label: e.target.value })}
            className="input-field" placeholder="اسم الخيار" />
        </div>
        <button onClick={() => addMutation.mutate(newOpt)} disabled={!newOpt.value || !newOpt.label}
          className="col-span-3 btn-primary">
          <Plus size={16} /> إضافة خيار جديد
        </button>
      </div>

      {/* Existing options */}
      {opts && Object.entries(opts).map(([cat, options]) => (
        <div key={cat} className="mb-5">
          <h3 className="font-semibold text-brown mb-2">{categoryLabels[cat] || cat}</h3>
          <div className="flex flex-wrap gap-2">
            {(options as any[]).map((opt) => (
              <div key={opt.id}
                className={`chip ${opt.isActive ? 'border-border' : 'border-error/30 bg-error/5 opacity-50'}`}>
                <span>{opt.label}</span>
                <button onClick={() => toggleMutation.mutate({ id: opt.id, isActive: !opt.isActive })}
                  className="text-muted hover:text-error mr-1">
                  {opt.isActive ? <X size={12} /> : <Plus size={12} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- Data Tab ----------
function DataTab() {
  const qc = useQueryClient();
  const [confirmText, setConfirmText] = useState('');

  const deleteAllMutation = useMutation({
    mutationFn: () => customersApi.deleteAll(),
    onSuccess: (res: any) => {
      toast.success(res.data.message);
      setConfirmText('');
      qc.invalidateQueries({ queryKey: ['branches'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'حدث خطأ'),
  });

  const confirmed = confirmText === 'حذف';

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold">إدارة البيانات</h2>

      <div className="border-2 border-error/30 rounded-xl p-6 bg-error/5">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={22} className="text-error" />
          </div>
          <div>
            <h3 className="font-bold text-error text-base mb-1">حذف جميع العملاء والطلبات</h3>
            <p className="text-sm text-muted">
              سيتم حذف جميع العملاء وجميع الطلبات وسجل الحالات بشكل نهائي ولا يمكن التراجع عنه.
              الفروع والمستخدمون وخيارات القوائم ستبقى كما هي.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="input-label mb-1">اكتب <strong>حذف</strong> للتأكيد</label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            className="input-field w-48"
            placeholder="حذف"
          />
        </div>

        <button
          onClick={() => deleteAllMutation.mutate()}
          disabled={!confirmed || deleteAllMutation.isPending}
          className="btn-danger btn-lg"
        >
          <Trash2 size={18} />
          {deleteAllMutation.isPending ? 'جارٍ الحذف...' : 'حذف جميع العملاء والطلبات'}
        </button>
      </div>
    </div>
  );
}

// ---------- WhatsApp Tab ----------
function WhatsAppTab() {
  return (
    <div>
      <h2 className="text-lg font-bold mb-2">واتساب الفروع</h2>
      <p className="text-sm text-muted mb-6">كل فرع يرسل من رقمه الخاص. امسح الباركود بجوال الفرع لربط الخط.</p>
      <WhatsAppStatusGrid />
    </div>
  );
}

export function WhatsAppStatusGrid({ singleBranchCode }: { singleBranchCode?: string }) {
  const { data: statuses, isLoading, isError, refetch } = useQuery({
    queryKey: ['whatsapp-status', singleBranchCode],
    queryFn: () => singleBranchCode
      ? whatsappApi.getBranchStatus(singleBranchCode)
      : whatsappApi.getStatus(),
    select: (res) => {
      if (singleBranchCode) {
        const d = res.data;
        return { [singleBranchCode]: d } as Record<string, any>;
      }
      return res.data as Record<string, any>;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      const statuses = singleBranchCode
        ? { [singleBranchCode]: (data as any)[singleBranchCode] }
        : (data as Record<string, any>);
      const allReady = Object.values(statuses).every((s: any) => s?.status === 'ready');
      return allReady ? 10000 : 2000;
    },
    retry: 1,
  });

  if (isLoading) {
    return <div className="text-muted text-sm py-4 text-center">جاري التحميل...</div>;
  }

  if (isError) {
    return (
      <div className="text-center py-4 space-y-3">
        <p className="text-error text-sm font-semibold">تعذّر الاتصال بالباك إند</p>
        <p className="text-muted text-xs">تأكد من تشغيله ثم حدّث</p>
        <button onClick={() => refetch()} className="btn-secondary btn-sm">إعادة المحاولة</button>
      </div>
    );
  }

  if (!statuses || Object.keys(statuses).length === 0) {
    return (
      <div className="text-center py-4 space-y-3">
        <p className="text-muted text-sm">لم يبدأ واتساب بعد</p>
        <p className="text-xs text-muted">تأكد أن WHATSAPP_PROVIDER=local في ملف .env وأعد تشغيل الباك إند</p>
        <button onClick={() => refetch()} className="btn-secondary btn-sm">تحديث</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(statuses).map(([code, info]: [string, any]) => (
        <WhatsAppBranchCard key={code} code={code} info={info} onRefresh={() => refetch()} />
      ))}
    </div>
  );
}

function WhatsAppBranchCard({ code, info, onRefresh }: { code: string; info: any; onRefresh: () => void }) {
  const queryClient = useQueryClient();
  const reconnectMutation = useMutation({
    mutationFn: () => whatsappApi.reconnect(code),
    onSuccess: () => {
      toast.success('جاري مسح الجلسة وإعادة الاتصال...');
      setTimeout(() => { queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] }); onRefresh(); }, 1000);
    },
    onError: () => toast.error('فشلت إعادة الاتصال'),
  });

  const statusConfig = {
    ready:        { label: 'متصل',          icon: <CheckCircle size={18} />,                      color: 'text-success bg-success/10 border-success/20' },
    qr:           { label: 'امسح الباركود', icon: <MessageCircle size={18} />,                   color: 'text-gold-dark bg-gold/10 border-gold/20' },
    initializing: { label: 'جاري التحميل', icon: <Loader size={18} className="animate-spin" />, color: 'text-muted bg-bg border-border' },
    disconnected: { label: 'غير متصل',      icon: <Loader size={18} className="animate-spin" />, color: 'text-error bg-error/10 border-error/20' },
  };

  const cfg = statusConfig[info?.status as keyof typeof statusConfig] ?? statusConfig.disconnected;
  const notReady = info?.status === 'disconnected' || info?.status === 'initializing';

  return (
    <div className="border border-border rounded-xl p-5 bg-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-bold text-lg text-brown-dark">{info?.branchName || code}</h3>
          <span className="text-xs text-muted font-mono" dir="ltr">{code}</span>
        </div>
        <div className="flex items-center gap-2">
          {notReady && (
            <button
              onClick={() => reconnectMutation.mutate()}
              disabled={reconnectMutation.isPending}
              className="btn-secondary btn-sm text-xs"
            >
              {reconnectMutation.isPending ? <Loader size={12} className="animate-spin" /> : 'إعادة ربط'}
            </button>
          )}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-semibold ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
          </div>
        </div>
      </div>

      {info?.status === 'qr' && info?.qrDataUrl ? (
        <div className="flex flex-col items-center gap-3 mt-2">
          <p className="text-sm font-semibold text-brown text-center">
            افتح واتساب على جوال الفرع ← الأجهزة المرتبطة ← ربط جهاز ← امسح الباركود
          </p>
          <div className="border-4 border-gold rounded-xl overflow-hidden shadow-lg">
            <img src={info.qrDataUrl} alt="QR Code" className="w-64 h-64" />
          </div>
        </div>
      ) : info?.status === 'qr' ? (
        <p className="text-sm text-gold-dark mt-1">جاري إنشاء الباركود...</p>
      ) : info?.status === 'disconnected' ? (
        <div className="flex items-center gap-2 mt-2 text-sm text-muted">
          <span className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin flex-shrink-0" />
          جاري إعادة الاتصال تلقائياً... (أو اضغط «إعادة ربط» إذا استمرت المشكلة)
        </div>
      ) : info?.status === 'initializing' ? (
        <div className="flex items-center gap-2 mt-2 text-sm text-muted">
          <span className="w-3.5 h-3.5 border-2 border-gold border-t-transparent rounded-full animate-spin flex-shrink-0" />
          جاري تحميل واتساب... سيظهر الباركود تلقائياً
        </div>
      ) : null}
    </div>
  );
}

// ---------- Reports Tab ----------
function ReportsTab() {
  const { data: summary } = useQuery({
    queryKey: ['admin-summary'],
    queryFn: () => reportsApi.summary(),
    select: (res) => res.data,
  });

  const { data: byBranch = [] } = useQuery({
    queryKey: ['orders-by-branch'],
    queryFn: () => reportsApi.ordersByBranch(),
    select: (res) => res.data,
  });

  const { data: byStatus = [] } = useQuery({
    queryKey: ['orders-by-status'],
    queryFn: () => reportsApi.ordersByStatus(),
    select: (res) => res.data,
  });

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الطلبات', value: summary?.total, color: 'gold' },
          { label: 'الطلبات المستعجلة', value: summary?.urgent, color: 'error' },
          { label: 'الطلبات المتأخرة', value: summary?.late, color: 'warning' },
          { label: 'المكتملة', value: summary?.completed, color: 'success' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`card p-4 border-r-4 ${
            color === 'gold' ? 'border-r-gold' :
            color === 'error' ? 'border-r-error' :
            color === 'warning' ? 'border-r-warning' : 'border-r-success'
          }`}>
            <p className="text-3xl font-bold text-brown-dark">{value ?? '—'}</p>
            <p className="text-sm text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* By branch */}
      <div>
        <h3 className="text-lg font-bold mb-3">الطلبات حسب الفرع</h3>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>الفرع</th><th>عدد الطلبات</th></tr></thead>
            <tbody>
              {byBranch.map((row: any) => (
                <tr key={row.branch?.id}>
                  <td className="font-semibold">{row.branch?.name || '—'}</td>
                  <td>{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* By status */}
      <div>
        <h3 className="text-lg font-bold mb-3">الطلبات حسب الحالة</h3>
        <div className="table-container">
          <table className="table">
            <thead><tr><th>الحالة</th><th>العدد</th></tr></thead>
            <tbody>
              {(byStatus as any[]).map((row) => (
                <tr key={row.status}>
                  <td>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold bg-bg">
                      {row.status}
                    </span>
                  </td>
                  <td>{row._count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
