import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Clock, AlertTriangle, CheckCircle, Package, MessageCircle, X } from 'lucide-react';
import { ordersApi, reportsApi, whatsappApi } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { useAuthStore } from '../stores/authStore';
import { WhatsAppStatusGrid } from './AdminDashboard';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';

dayjs.locale('ar');

const ACTIVE_STATUSES = ['RECEIVED_AT_BRANCH', 'SENT_TO_FACTORY', 'ACCEPTED_BY_FACTORY', 'SENT_TO_BRANCH', 'RECEIVED_AT_BRANCH_CONFIRMED', 'ON_HOLD'];
const HISTORY_STATUSES = ['COMPLETED', 'CANCELLED'];
const ARRIVED_STATUS = 'SENT_TO_BRANCH';

type TabId = 'active' | 'at_branch' | 'at_factory' | 'arrived' | 'history';

const TABS: { id: TabId; label: string; statuses?: string[] }[] = [
  { id: 'active',     label: 'النشطة',           statuses: ACTIVE_STATUSES },
  { id: 'at_branch',  label: 'في الفرع',          statuses: ['RECEIVED_AT_BRANCH'] },
  { id: 'at_factory', label: 'عند المصنع',         statuses: ['SENT_TO_FACTORY', 'ACCEPTED_BY_FACTORY'] },
  { id: 'arrived',    label: 'وصل من المصنع',      statuses: ['SENT_TO_BRANCH', 'RECEIVED_AT_BRANCH_CONFIRMED'] },
  { id: 'history',    label: 'سجل الطلبات',        statuses: HISTORY_STATUSES },
];

export default function BranchDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('active');
  const [search, setSearch] = useState('');
  const [showQR, setShowQR] = useState(false);
  const prevArrivedCount = useRef<number | null>(null);

  const branchCode = user?.branch?.code;

  // Poll WhatsApp status for the banner
  const { data: waStatus } = useQuery({
    queryKey: ['wa-status-branch', branchCode],
    queryFn: () => whatsappApi.getBranchStatus(branchCode!),
    select: (res) => res.data as { status: string; qrDataUrl: string | null; branchName: string },
    enabled: !!branchCode,
    refetchInterval: (query) => (query.state.data as any)?.status === 'ready' ? 10000 : 2000,
  });

  // Background poll for factory-returned orders to trigger notification
  const { data: allOrders } = useQuery({
    queryKey: ['orders-all-branch'],
    queryFn: () => ordersApi.list({}),
    select: (res) => res.data.orders as any[],
    refetchInterval: 20000,
  });

  useEffect(() => {
    if (!allOrders) return;
    const arrivedCount = allOrders.filter((o: any) => o.status === ARRIVED_STATUS).length;
    if (prevArrivedCount.current !== null && arrivedCount > prevArrivedCount.current) {
      const diff = arrivedCount - prevArrivedCount.current;
      toast(`📦 وصل ${diff === 1 ? 'طلب' : diff + ' طلبات'} من المصنع — يرجى التأكيد`, {
        duration: 10000,
        style: { background: '#0F766E', color: '#fff', fontWeight: 700, fontSize: 15 },
      });
    }
    prevArrivedCount.current = arrivedCount;
  }, [allOrders]);

  const statusFilter = TABS.find(t => t.id === activeTab)?.statuses ?? [];

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', activeTab, search],
    queryFn: () => ordersApi.list({ search: search || undefined }),
    select: (res) => {
      let orders: any[] = res.data.orders;
      orders = orders.filter((o: any) => statusFilter.includes(o.status));
      return orders;
    },
  });

  const { data: summary } = useQuery({
    queryKey: ['branch-summary'],
    queryFn: () => reportsApi.summary(),
    select: (res) => res.data,
  });

  // Badge count for "arrived" tab
  const arrivedCount = (allOrders ?? []).filter((o: any) => o.status === ARRIVED_STATUS).length;

  const orders = ordersData ?? [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">لوحة التحكم</h1>
        <div className="flex items-center gap-3">
          {/* WhatsApp status button — always visible for branch users */}
          {branchCode && branchCode !== 'FCT' && (
            <button
              onClick={() => setShowQR(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all ${
                !waStatus || waStatus.status === 'initializing'
                  ? 'bg-bg text-muted border-border'
                  : waStatus.status === 'ready'
                  ? 'bg-success/10 text-success border-success/20'
                  : waStatus.status === 'qr'
                  ? 'bg-gold/10 text-gold-dark border-gold/20 animate-pulse'
                  : 'bg-error/10 text-error border-error/20'
              }`}
              title="حالة واتساب"
            >
              <MessageCircle size={16} />
              {!waStatus || waStatus.status === 'initializing' ? 'واتساب...' :
               waStatus.status === 'ready' ? 'واتساب ✓' :
               waStatus.status === 'qr' ? '📷 امسح الباركود' : 'واتساب غير متصل'}
            </button>
          )}
          <button onClick={() => navigate('/branch/new-order')} className="btn-primary btn-lg">
            <Plus size={22} />
            طلب جديد
          </button>
        </div>
      </div>

      {/* QR Modal */}
      {showQR && branchCode && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowQR(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">ربط واتساب الفرع</h2>
              <button onClick={() => setShowQR(false)} className="text-muted hover:text-brown"><X size={20} /></button>
            </div>
            <WhatsAppStatusGrid singleBranchCode={branchCode} />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Package size={24} />} label="إجمالي الطلبات" value={summary?.total ?? '-'} color="gold" />
        <StatCard icon={<AlertTriangle size={24} />} label="مستعجلة" value={summary?.urgent ?? '-'} color="error" />
        <StatCard icon={<Clock size={24} />} label="متأخرة" value={summary?.late ?? '-'} color="warning" />
        <StatCard icon={<CheckCircle size={24} />} label="مكتملة" value={summary?.completed ?? '-'} color="success" />
      </div>

      <div className="card">
        {/* Tabs */}
        <div className="flex border-b border-border overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-gold text-gold-dark'
                  : 'border-transparent text-muted hover:text-brown'
              }`}
            >
              {tab.label}
              {/* Badge for arrived orders */}
              {tab.id === 'arrived' && arrivedCount > 0 && (
                <span className="absolute -top-1 -left-1 bg-error text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {arrivedCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="p-4 border-b border-border">
          <div className="relative max-w-sm">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو رقم الطلب أو الجوال..."
              className="input-field pr-10"
            />
          </div>
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
                جاري التحميل...
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 text-muted">
              <Package size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">لا توجد طلبات</p>
              {activeTab === 'active' && <p className="text-sm mt-1">قم بإنشاء طلب جديد للبدء</p>}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>العميل</th>
                  <th>الجوال</th>
                  <th>الحالة</th>
                  <th>موعد التسليم</th>
                  <th>مستعجل</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => (
                  <tr
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className={`cursor-pointer hover:bg-bg/50 ${order.status === ARRIVED_STATUS ? 'bg-success/5 border-r-2 border-r-success' : ''}`}
                  >
                    <td className="font-mono text-sm font-semibold text-brown-dark">{order.orderNumber}</td>
                    <td className="font-semibold">{order.customer?.name}</td>
                    <td className="text-sm" dir="ltr">{order.customer?.mobile}</td>
                    <td><StatusBadge status={order.status} size="sm" /></td>
                    <td className="text-sm">
                      {order.dueDate ? (
                        <span className={dayjs(order.dueDate).isBefore(dayjs()) && !HISTORY_STATUSES.includes(order.status) ? 'text-error font-semibold' : ''}>
                          {dayjs(order.dueDate).format('DD/MM/YYYY')}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {order.urgent && (
                        <span className="badge-urgent">
                          <AlertTriangle size={12} />
                          مستعجل
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
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
    gold: 'text-gold-dark bg-gold/10',
    error: 'text-error bg-error/10',
    warning: 'text-warning bg-warning/10',
    success: 'text-success bg-success/10',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-brown-dark">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
