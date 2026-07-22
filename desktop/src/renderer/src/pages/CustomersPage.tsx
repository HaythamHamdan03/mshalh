import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, User, Phone, RefreshCw, ChevronLeft } from 'lucide-react';
import { customersApi } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function CustomersPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', mobile: '', secondMobile: '', notes: '' });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list({ search: search || undefined }),
    select: (res) => res.data,
  });

  const { data: selectedCustomer } = useQuery({
    queryKey: ['customer', selectedId],
    queryFn: () => customersApi.get(selectedId!),
    enabled: !!selectedId,
    select: (res) => res.data,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => customersApi.create(data),
    onSuccess: () => {
      toast.success('تم إنشاء العميل بنجاح');
      qc.invalidateQueries({ queryKey: ['customers'] });
      setShowAddForm(false);
      setNewCustomer({ name: '', mobile: '', secondMobile: '', notes: '' });
    },
    onError: () => toast.error('حدث خطأ في إنشاء العميل'),
  });

  return (
    <div className="flex gap-6 h-full">
      {/* List panel */}
      <div className="w-80 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h1 className="page-title">العملاء</h1>
          <button onClick={() => setShowAddForm(true)} className="btn-primary btn-sm">
            <Plus size={16} /> جديد
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="اسم أو جوال..."
            className="input-field pr-9 py-2.5"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted">جاري التحميل...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-muted">
              <User size={40} className="mx-auto mb-2 opacity-30" />
              <p>لا يوجد عملاء</p>
            </div>
          ) : (
            customers.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-right p-4 rounded-xl border transition-all ${
                  selectedId === c.id ? 'border-gold bg-gold/5' : 'border-border bg-card hover:border-gold/30'
                }`}
              >
                <p className="font-semibold text-brown-dark">{c.name}</p>
                <p className="text-sm text-muted mt-0.5" dir="ltr">{c.mobile}</p>
                <p className="text-xs text-muted mt-1">{c._count?.orders || 0} طلب سابق</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto">
        {showAddForm ? (
          <div className="card p-6 max-w-lg">
            <h2 className="text-xl font-bold mb-5">عميل جديد</h2>
            <div className="space-y-4">
              <div>
                <label className="input-label">الاسم <span className="text-error">*</span></label>
                <input type="text" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  className="input-field text-lg" placeholder="الاسم الكامل" />
              </div>
              <div>
                <label className="input-label">رقم الجوال <span className="text-error">*</span></label>
                <input type="tel" value={newCustomer.mobile} onChange={e => setNewCustomer({ ...newCustomer, mobile: e.target.value })}
                  className="input-field text-lg" dir="ltr" placeholder="05xxxxxxxx" />
              </div>
              <div>
                <label className="input-label">رقم جوال إضافي</label>
                <input type="tel" value={newCustomer.secondMobile} onChange={e => setNewCustomer({ ...newCustomer, secondMobile: e.target.value })}
                  className="input-field" dir="ltr" placeholder="اختياري" />
              </div>
              <div>
                <label className="input-label">ملاحظات</label>
                <textarea value={newCustomer.notes} onChange={e => setNewCustomer({ ...newCustomer, notes: e.target.value })}
                  className="textarea-field" placeholder="ملاحظات..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => createMutation.mutate(newCustomer)} disabled={createMutation.isPending}
                  className="btn-primary flex-1">
                  {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ العميل'}
                </button>
                <button onClick={() => setShowAddForm(false)} className="btn-secondary flex-1">إلغاء</button>
              </div>
            </div>
          </div>
        ) : selectedCustomer ? (
          <div>
            {/* Customer header */}
            <div className="card p-6 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-brown-dark">{selectedCustomer.name}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Phone size={16} className="text-muted" />
                    <span dir="ltr" className="text-muted">{selectedCustomer.mobile}</span>
                    {selectedCustomer.secondMobile && (
                      <span dir="ltr" className="text-muted">/ {selectedCustomer.secondMobile}</span>
                    )}
                  </div>
                  {selectedCustomer.notes && (
                    <p className="text-muted mt-2 text-sm">{selectedCustomer.notes}</p>
                  )}
                </div>
                <button
                  onClick={() => navigate('/branch/new-order', { state: { customerId: selectedCustomer.id, customerName: selectedCustomer.name } })}
                  className="btn-primary"
                >
                  <RefreshCw size={18} />
                  طلب جديد
                </button>
              </div>
            </div>

            {/* Measurements */}
            {selectedCustomer.measurements?.length > 0 && (
              <div className="card p-5 mb-4">
                <h3 className="section-title">المقاسات المحفوظة</h3>
                {(() => {
                  const m = selectedCustomer.measurements[0];
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'الطول', val: m.customerHeight },
                        { label: 'طول اليد', val: m.sleeveLength },
                        { label: 'عرض الكتف', val: m.shoulderWidth },
                        { label: 'عرض الصدر', val: m.chestWidth },
                        { label: 'طول الظهر', val: m.backLength },
                        { label: 'طول الأمام', val: m.frontLength },
                      ].filter(x => x.val).map(({ label, val }) => (
                        <div key={label} className="bg-bg rounded-lg p-3 text-center">
                          <p className="text-xs text-muted">{label}</p>
                          <p className="text-lg font-bold text-brown-dark">{val} سم</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Orders history */}
            <div className="card p-5">
              <h3 className="section-title">الطلبات السابقة ({selectedCustomer.orders?.length || 0})</h3>
              {selectedCustomer.orders?.length === 0 ? (
                <p className="text-muted text-center py-4">لا يوجد طلبات سابقة</p>
              ) : (
                <div className="space-y-2">
                  {selectedCustomer.orders?.map((order: any) => (
                    <button
                      key={order.id}
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-gold/30 hover:bg-bg text-right transition-all"
                    >
                      <div>
                        <p className="font-mono font-semibold text-sm text-brown-dark" dir="ltr">{order.orderNumber}</p>
                        <p className="text-xs text-muted mt-0.5">
                          {dayjs(order.createdAt).format('DD/MM/YYYY')}
                          {order.dueDate && ` — موعد التسليم: ${dayjs(order.dueDate).format('DD/MM/YYYY')}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={order.status} size="sm" />
                        <ChevronLeft size={16} className="text-muted" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted">
            <div className="text-center">
              <User size={48} className="mx-auto mb-3 opacity-20" />
              <p>اختر عميلاً لعرض تفاصيله</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
