import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, AlertTriangle, Clock, CheckCircle, Factory } from 'lucide-react';
import { ordersApi, branchesApi, reportsApi } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { useLangStore } from '../stores/langStore';

const ACTIVE_STATUSES = ['SENT_TO_FACTORY', 'ACCEPTED_BY_FACTORY'];
const HISTORY_STATUSES = ['SENT_TO_BRANCH', 'COMPLETED', 'CANCELLED'];

type TabId = 'active' | 'incoming' | 'in_progress' | 'history';

const T = {
  ar: {
    title:          'لوحة المصنع',
    refresh:        'تحديث',
    allBranches:    'كل الفروع',
    urgentOnly:     'مستعجلة فقط',
    search:         'بحث بالاسم أو رقم الطلب أو الجوال...',
    loading:        'جاري التحميل...',
    noActive:       'لا توجد طلبات نشطة حالياً',
    noOrders:       'لا توجد طلبات',
    urgentBadge:    'مستعجل',
    tabs: { active: 'النشطة', incoming: 'الطلبات الواردة', in_progress: 'قيد التجهيز', history: 'سجل الطلبات' },
    stats: { total: 'إجمالي الطلبات', urgent: 'مستعجلة', late: 'متأخرة', completed: 'مكتملة' },
    cols: { num: 'رقم الطلب', branch: 'الفرع', customer: 'العميل', mobile: 'الجوال', model: 'الموديل', color: 'اللون', fabric: 'القماش', due: 'موعد التسليم', status: 'الحالة', action: 'إجراء' },
    actions: { SENT_TO_FACTORY: 'بدء تجهيز الطلب', ACCEPTED_BY_FACTORY: 'تم الإرسال للمحل' },
    toast: (n: number) => `🔔 وصل ${n === 1 ? 'طلب جديد' : n + ' طلبات جديدة'} من الفروع`,
  },
  ur: {
    title:          'فیکٹری ڈیش بورڈ',
    refresh:        'تازہ کریں',
    allBranches:    'تمام برانچ',
    urgentOnly:     'صرف فوری',
    search:         'آرڈر نمبر یا نام سے تلاش...',
    loading:        'لوڈ ہو رہا ہے...',
    noActive:       'کوئی فعال آرڈر نہیں',
    noOrders:       'کوئی آرڈر نہیں',
    urgentBadge:    'فوری',
    tabs: { active: 'فعال', incoming: 'آنے والے', in_progress: 'تیاری میں', history: 'تاریخ' },
    stats: { total: 'کل آرڈرز', urgent: 'فوری', late: 'دیر', completed: 'مکمل' },
    cols: { num: 'آرڈر نمبر', branch: 'برانچ', customer: 'گاہک', mobile: 'موبائل', model: 'ماڈل', color: 'رنگ', fabric: 'کپڑا', due: 'ڈیلیوری', status: 'حالت', action: 'عمل' },
    actions: { SENT_TO_FACTORY: 'آرڈر شروع کریں', ACCEPTED_BY_FACTORY: 'دکان کو بھیجیں' },
    toast: (n: number) => `🔔 ${n} نئے آرڈرز آئے`,
  },
};

const STATUS_UR: Record<string, string> = {
  SENT_TO_FACTORY:              'فیکٹری کو بھیجا',
  ACCEPTED_BY_FACTORY:          'قبول کیا',
  SENT_TO_BRANCH:               'دکان کو بھیجا',
  RECEIVED_AT_BRANCH:           'دکان میں',
  RECEIVED_AT_BRANCH_CONFIRMED: 'تصدیق ہوئی',
  COMPLETED:                    'مکمل',
  CANCELLED:                    'منسوخ',
  ON_HOLD:                      'روکا گیا',
};

const STATUS_TRANSITIONS: Record<string, string> = {
  SENT_TO_FACTORY:     'ACCEPTED_BY_FACTORY',
  ACCEPTED_BY_FACTORY: 'SENT_TO_BRANCH',
};

export default function FactoryDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [branchFilter, setBranchFilter] = useState('');
  const [search, setSearch] = useState('');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const { factoryLang: lang, setFactoryLang } = useLangStore();
  const prevIncomingCount = useRef<number | null>(null);

  const t = T[lang];

  const toggleLang = () => setFactoryLang(lang === 'ar' ? 'ur' : 'ar');

  const TABS: { id: TabId; label: string; statuses: string[] }[] = [
    { id: 'active',      label: t.tabs.active,      statuses: ACTIVE_STATUSES },
    { id: 'incoming',    label: t.tabs.incoming,    statuses: ['SENT_TO_FACTORY'] },
    { id: 'in_progress', label: t.tabs.in_progress, statuses: ['ACCEPTED_BY_FACTORY'] },
    { id: 'history',     label: t.tabs.history,     statuses: HISTORY_STATUSES },
  ];

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchesApi.list(),
    select: (res) => res.data,
  });

  const { data: allOrders } = useQuery({
    queryKey: ['factory-orders-all'],
    queryFn: () => ordersApi.list({}),
    select: (res) => res.data.orders as any[],
    refetchInterval: 20000,
  });

  useEffect(() => {
    if (!allOrders) return;
    const incomingCount = allOrders.filter((o: any) => o.status === 'SENT_TO_FACTORY').length;
    if (prevIncomingCount.current !== null && incomingCount > prevIncomingCount.current) {
      toast(t.toast(incomingCount - prevIncomingCount.current), {
        duration: 10000,
        style: { background: '#92400E', color: '#fff', fontWeight: 700, fontSize: 15 },
      });
    }
    prevIncomingCount.current = incomingCount;
  }, [allOrders, t]);

  const incomingCount = (allOrders ?? []).filter((o: any) => o.status === 'SENT_TO_FACTORY').length;
  const tabStatuses = TABS.find(tab => tab.id === activeTab)?.statuses ?? [];

  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['factory-orders', activeTab, branchFilter, search, urgentOnly],
    queryFn: () => ordersApi.list({
      branchId: branchFilter || undefined,
      search: search || undefined,
      urgent: urgentOnly ? 'true' : undefined,
    }),
    select: (res) => {
      let orders: any[] = res.data.orders;
      return orders.filter((o: any) => tabStatuses.includes(o.status));
    },
    refetchInterval: 30000,
  });

  const { data: summary } = useQuery({
    queryKey: ['factory-summary'],
    queryFn: () => reportsApi.summary(),
    select: (res) => res.data,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['factory-orders'] });
      qc.invalidateQueries({ queryKey: ['factory-orders-all'] });
      qc.invalidateQueries({ queryKey: ['factory-summary'] });
    },
    onError: () => toast.error('خطأ'),
  });

  const orders = ordersData ?? [];

  return (
    <div>
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Factory size={28} className="text-gold" />
          <h1 className="page-title">{t.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            onClick={toggleLang}
            className="btn-secondary btn-sm flex items-center gap-1.5 font-semibold"
          >
            <span className="text-lg leading-none">{lang === 'ar' ? '🇵🇰' : '🇸🇦'}</span>
            <span className="text-xs">{lang === 'ar' ? 'اردو' : 'عربي'}</span>
          </button>
          <button onClick={() => refetch()} className="btn-secondary btn-sm">
            {t.refresh}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Factory size={22} />}       label={t.stats.total}     value={summary?.total ?? '-'}     color="gold" />
        <StatCard icon={<AlertTriangle size={22} />} label={t.stats.urgent}    value={summary?.urgent ?? '-'}    color="error" />
        <StatCard icon={<Clock size={22} />}         label={t.stats.late}      value={summary?.late ?? '-'}      color="warning" />
        <StatCard icon={<CheckCircle size={22} />}   label={t.stats.completed} value={summary?.completed ?? '-'} color="success" />
      </div>

      <div className="card">
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-gold text-gold-dark' : 'border-transparent text-muted hover:text-brown'
              }`}
            >
              {tab.label}
              {tab.id === 'incoming' && incomingCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-error text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {incomingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-border">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t.search} className="input-field pr-9 py-2.5" />
          </div>
          <select value={branchFilter} onChange={e => setBranchFilter(e.target.value)} className="select-field w-52">
            <option value="">{t.allBranches}</option>
            {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={urgentOnly} onChange={e => setUrgentOnly(e.target.checked)} className="rounded" />
            <span className="text-sm font-medium text-error">{t.urgentOnly}</span>
          </label>
        </div>

        {/* Table */}
        <div className="table-container">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted">
              <div className="text-center">
                <svg className="animate-spin w-8 h-8 mx-auto mb-2 text-gold" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {t.loading}
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-muted">
              <Factory size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">{activeTab === 'active' ? t.noActive : t.noOrders}</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>{t.cols.num}</th>
                  <th>{t.cols.branch}</th>
                  <th>{t.cols.customer}</th>
                  <th>{t.cols.mobile}</th>
                  <th>{t.cols.model}</th>
                  <th>{t.cols.color}</th>
                  <th>{t.cols.fabric}</th>
                  <th>{t.cols.due}</th>
                  <th>{t.cols.status}</th>
                  <th>{t.cols.action}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => {
                  const isLate = order.dueDate && dayjs(order.dueDate).isBefore(dayjs()) &&
                    !['COMPLETED', 'CANCELLED', 'SENT_TO_BRANCH'].includes(order.status);
                  const nextStatus = STATUS_TRANSITIONS[order.status];
                  const firstItem = order.items?.[0];
                  return (
                    <tr key={order.id} className={`${isLate ? 'bg-error/3' : ''} ${order.status === 'SENT_TO_FACTORY' ? 'border-r-2 border-r-gold' : ''}`}>
                      <td>
                        <div className="flex items-center gap-2">
                          <button onClick={() => navigate(`/orders/${order.id}`)}
                            className="font-mono text-sm font-semibold text-brown-dark hover:text-gold" dir="ltr">
                            {order.orderNumber}
                          </button>
                          {order.urgent && <span className="badge-urgent text-xs px-1.5 py-0.5">{t.urgentBadge}</span>}
                        </div>
                      </td>
                      <td>
                        <span className="bg-gold/10 text-gold-dark px-2 py-1 rounded text-xs font-semibold">
                          {order.branch?.name}
                        </span>
                      </td>
                      <td className="font-medium">{order.customer?.name}</td>
                      <td className="text-sm" dir="ltr">{order.customer?.mobile}</td>
                      <td className="text-sm">{firstItem?.embroideryModel || '—'}</td>
                      <td className="text-sm">{firstItem?.color || '—'}</td>
                      <td className="text-sm">{firstItem?.fabric || '—'}</td>
                      <td className={`text-sm ${isLate ? 'text-error font-bold' : ''}`}>
                        {order.dueDate ? dayjs(order.dueDate).format('DD/MM/YYYY') : '—'}
                        {isLate && ' ⚠️'}
                      </td>
                      <td>
                        {lang === 'ur'
                          ? <span className="text-xs font-medium text-brown">{STATUS_UR[order.status] ?? order.status}</span>
                          : <StatusBadge status={order.status} size="sm" />
                        }
                      </td>
                      <td>
                        {nextStatus && (
                          <button
                            onClick={(e) => { e.stopPropagation(); updateStatusMutation.mutate({ id: order.id, status: nextStatus }); }}
                            disabled={updateStatusMutation.isPending}
                            className={`btn-sm text-xs whitespace-nowrap ${nextStatus === 'ACCEPTED_BY_FACTORY' ? 'btn-primary' : 'btn-success'}`}
                          >
                            {t.actions[order.status as keyof typeof t.actions] ?? ''}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  const colorMap: Record<string, string> = {
    gold: 'text-gold-dark bg-gold/10', error: 'text-error bg-error/10',
    warning: 'text-warning bg-warning/10', success: 'text-success bg-success/10',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-brown-dark">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
