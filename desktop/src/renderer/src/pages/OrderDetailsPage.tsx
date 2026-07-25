import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Printer, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';
import { ordersApi } from '../lib/api';
import StatusBadge from '../components/StatusBadge';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';

dayjs.locale('ar');

const BRANCH_STATUS_ACTIONS: Record<string, { label: string; newStatus: string; color: string; note?: string }> = {
  SENT_TO_BRANCH: {
    label: 'تأكيد الاستلام من المصنع',
    newStatus: 'RECEIVED_AT_BRANCH_CONFIRMED',
    color: 'success',
    note: 'سيتم إرسال رسالة للعميل بأن طلبه جاهز في الفرع',
  },
  RECEIVED_AT_BRANCH_CONFIRMED: {
    label: 'تأكيد تسليم العميل وإغلاق الطلب',
    newStatus: 'COMPLETED',
    color: 'gold',
  },
};

export default function OrderDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [statusNote, setStatusNote] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => ordersApi.get(id!),
    select: (res) => res.data,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['order-history', id],
    queryFn: () => ordersApi.getHistory(id!),
    select: (res) => res.data,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ status, notes }: { status: string; notes?: string }) =>
      ordersApi.updateStatus(id!, status, notes),
    onSuccess: () => {
      toast.success('تم تحديث الحالة بنجاح');
      qc.invalidateQueries({ queryKey: ['order', id] });
      qc.invalidateQueries({ queryKey: ['order-history', id] });
      setStatusNote('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'حدث خطأ'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => ordersApi.delete(id!),
    onSuccess: () => {
      toast.success('تم حذف الطلب');
      qc.invalidateQueries({ queryKey: ['orders'] });
      navigate(-1);
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'حدث خطأ في الحذف'),
  });

  const handleDelete = () => {
    if (window.confirm(`هل أنت متأكد من حذف الطلب ${order?.orderNumber}؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      deleteMutation.mutate();
    }
  };

  const handlePrint = (type: 'receipt' | 'jobcard' | 'delivery') => {
    if (!order) return;
    const win = window.open('', '_blank', 'width=800,height=600');
    if (!win) return;
    const content = generatePrintContent(type, order);
    win.document.write(content);
    win.document.close();
    win.print();
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted">جاري التحميل...</div>;
  }

  if (!order) {
    return <div className="flex items-center justify-center h-64 text-error">الطلب غير موجود</div>;
  }

  const branchAction = user?.role !== 'FACTORY' ? BRANCH_STATUS_ACTIONS[order.status] : null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary btn-sm">
            <ArrowRight size={16} />
          </button>
          <h1 className="font-mono text-xl font-bold" dir="ltr">{order.orderNumber}</h1>
          {order.urgent && <span className="badge-urgent"><AlertTriangle size={14} />مستعجل</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => handlePrint('receipt')} className="btn-secondary btn-sm">
            <Printer size={16} /> إيصال
          </button>
          <button onClick={() => handlePrint('jobcard')} className="btn-secondary btn-sm">
            <Printer size={16} /> بطاقة مصنع
          </button>
          <button onClick={() => handlePrint('delivery')} className="btn-secondary btn-sm">
            <Printer size={16} /> سند تسليم
          </button>
          {user?.role === 'ADMIN' && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="btn-sm flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors text-sm font-semibold"
            >
              <Trash2 size={14} /> حذف
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Status card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title m-0">الحالة الحالية</h2>
              <StatusBadge status={order.status} />
            </div>

            {branchAction && (
              <div className="bg-gold/5 border border-gold/20 rounded-xl p-4">
                {branchAction.note && (
                  <p className="text-sm text-muted mb-3">{branchAction.note}</p>
                )}
                <textarea
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder="ملاحظة اختيارية..."
                  className="textarea-field mb-3"
                  rows={2}
                />
                <button
                  onClick={() => updateStatusMutation.mutate({ status: branchAction.newStatus, notes: statusNote })}
                  disabled={updateStatusMutation.isPending}
                  className={`btn-lg w-full ${
                    branchAction.color === 'success' ? 'btn-success' : 'btn-primary'
                  }`}
                >
                  <CheckCircle size={20} />
                  {branchAction.label}
                </button>
              </div>
            )}

            {/* Factory quick actions — 2 steps only */}
            {user?.role === 'FACTORY' && (
              <div className="bg-bg rounded-xl p-4 mt-2">
                <p className="text-sm font-semibold mb-3 text-brown">تحديث الحالة:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { s: 'ACCEPTED_BY_FACTORY', l: 'بدء تجهيز الطلب' },
                    { s: 'SENT_TO_BRANCH',      l: 'تم الإرسال للمحل' },
                    { s: 'ON_HOLD',             l: 'إيقاف مؤقت' },
                  ].map(({ s, l }) => (
                    <button key={s} onClick={() => updateStatusMutation.mutate({ status: s })}
                      disabled={order.status === s || updateStatusMutation.isPending}
                      className={`btn-sm text-xs ${order.status === s ? 'btn-primary' : 'btn-secondary'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Customer & branch info */}
          <div className="card p-5">
            <h2 className="section-title">بيانات العميل والفرع</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoRow label="العميل" value={order.customer?.name} />
              <InfoRow label="الجوال" value={order.customer?.mobile} ltr />
              <InfoRow label="الفرع" value={order.branch?.name} />
              <InfoRow label="نوع المنتج" value={productLabel(order.productType)} />
              <InfoRow label="العدد" value={String(order.quantity)} />
              <InfoRow label="موعد التسليم"
                value={order.dueDate ? dayjs(order.dueDate).format('DD/MM/YYYY') : '—'}
                className={order.dueDate && dayjs(order.dueDate).isBefore(dayjs()) ? 'text-error font-bold' : ''} />
            </div>
          </div>

          {/* Items */}
          {order.items?.map((item: any, idx: number) => (
            <div key={item.id} className="card p-5">
              <h3 className="section-title">الحبة رقم {idx + 1}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <InfoRow label="موديل التطريز" value={item.embroideryModel} />
                <InfoRow label="القماش" value={item.fabric} />
                <InfoRow label="اللون" value={item.color} />
                <InfoRow label="المقاس" value={item.size} />
                <InfoRow label="عرض الزري" value={item.zariWidth} />
                <InfoRow label="البروج" value={item.brooj} />
                <InfoRow label="تنجيمة" value={item.tanjeema} />
                <InfoRow label="خط الدكة" value={item.dakkaLine} />
                <InfoRow label="مكسر" value={item.mukassar} />
                <InfoRow label="التكحيلة" value={item.takheela} />
                <InfoRow label="عرض حفرة الرقبة" value={item.neckHoleWidth} />
                <InfoRow label="طول التطريز" value={item.embroideryLength} />
                <InfoRow label="طول العميل" value={item.customerHeight} />
                <InfoRow label="طول اليد" value={item.sleeveLength} />
                <InfoRow label="عرض الكتف" value={item.shoulderWidth} />
                <InfoRow label="عرض الصدر" value={item.chestWidth} />
                <InfoRow label="طول الظهر" value={item.backLength} />
                <InfoRow label="طول الأمام" value={item.frontLength} />
                {item.specialMeasurements && (
                  <div className="col-span-full">
                    <InfoRow label="مقاسات خاصة" value={item.specialMeasurements} />
                  </div>
                )}
                {item.notes && <div className="col-span-full"><InfoRow label="ملاحظات" value={item.notes} /></div>}
              </div>
            </div>
          ))}

          {/* Notes */}
          {(order.branchNotes || order.factoryNotes) && (
            <div className="card p-5">
              <h2 className="section-title">الملاحظات</h2>
              {order.branchNotes && <InfoRow label="ملاحظات الفرع" value={order.branchNotes} />}
              {order.factoryNotes && <InfoRow label="ملاحظات المصنع" value={order.factoryNotes} />}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Payment */}
          <div className="card p-5">
            <h2 className="section-title">الدفع</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">الإجمالي</span>
                <span className="font-bold">{order.price ? `${order.price} ر.س` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">العربون</span>
                <span className="font-bold text-success">{order.deposit ? `${order.deposit} ر.س` : '—'}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-muted">المتبقي</span>
                <span className="font-bold text-error">{order.remaining ? `${order.remaining} ر.س` : '—'}</span>
              </div>
              <div className="mt-3">
                {paymentStatusBadge(order.paymentStatus)}
              </div>
            </div>
          </div>

          {/* Status history */}
          <div className="card p-5">
            <h2 className="section-title">سجل الحالات</h2>
            <div className="space-y-3">
              {history.map((h: any) => (
                <div key={h.id} className="flex gap-3 text-xs">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-gold flex-shrink-0 mt-1" />
                    <div className="w-px flex-1 bg-border mt-1" />
                  </div>
                  <div className="pb-3">
                    <StatusBadge status={h.newStatus} size="sm" />
                    <p className="text-muted mt-1">
                      {h.changedBy?.name || 'النظام'} — {dayjs(h.createdAt).format('DD/MM/YYYY HH:mm')}
                    </p>
                    {h.notes && <p className="text-brown mt-0.5">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, ltr, className }: { label: string; value?: string | null; ltr?: boolean; className?: string }) {
  if (!value) return null;
  return (
    <div>
      <span className="text-muted text-xs">{label}</span>
      <p className={`font-semibold text-brown-dark ${ltr ? 'ltr' : ''} ${className || ''}`} dir={ltr ? 'ltr' : undefined}>
        {value}
      </p>
    </div>
  );
}

function productLabel(type: string) {
  const m: Record<string, string> = {
    BISHT: 'بشت', FURWA: 'فروة', SUDAIRI: 'صديرية', MOROCCAN_THOBE: 'ثوب مغربي', OTHER: 'أخرى',
  };
  return m[type] || type;
}

function paymentStatusBadge(status: string) {
  const map: Record<string, { l: string; c: string }> = {
    UNPAID: { l: 'غير مدفوع', c: 'text-error bg-error/10' },
    DEPOSIT_PAID: { l: 'دفع عربون', c: 'text-warning bg-warning/10' },
    FULLY_PAID: { l: 'مدفوع كامل', c: 'text-success bg-success/10' },
  };
  const info = map[status] || { l: status, c: 'text-muted bg-bg' };
  return <span className={`badge ${info.c}`}>{info.l}</span>;
}

function generatePrintContent(type: 'receipt' | 'jobcard' | 'delivery', order: any): string {
  const logo = `<div style="text-align:center;margin-bottom:16px">
    <div style="font-size:22px;font-weight:bold;color:#3B2615">المشالح العربية الخاصة</div>
    <div style="font-size:13px;color:#7A5B35">نظام إدارة الطلبات</div>
  </div>`;
  const firstItem = order.items?.[0] || {};

  if (type === 'receipt') {
    return `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>إيصال</title>
    <style>body{font-family:Tahoma,Arial,sans-serif;padding:20px;max-width:400px;margin:0 auto}
    table{width:100%;border-collapse:collapse}td{padding:6px 8px;border-bottom:1px solid #eee}
    .label{color:#7A5B35;font-size:13px}.value{font-weight:bold;color:#3B2615}
    .total{background:#F7F1E6;font-size:16px;font-weight:bold}h3{color:#D8A027;margin:12px 0 4px}</style>
    </head><body>${logo}
    <h3>📋 إيصال استلام طلب</h3>
    <table>
      <tr><td class="label">رقم الطلب</td><td class="value" dir="ltr">${order.orderNumber}</td></tr>
      <tr><td class="label">الفرع</td><td class="value">${order.branch?.name}</td></tr>
      <tr><td class="label">العميل</td><td class="value">${order.customer?.name}</td></tr>
      <tr><td class="label">الجوال</td><td class="value" dir="ltr">${order.customer?.mobile}</td></tr>
      <tr><td class="label">موعد التسليم</td><td class="value">${order.dueDate ? dayjs(order.dueDate).format('DD/MM/YYYY') : '—'}</td></tr>
      <tr><td class="label">الإجمالي</td><td class="value">${order.price ? `${order.price} ر.س` : '—'}</td></tr>
      <tr><td class="label">العربون</td><td class="value">${order.deposit ? `${order.deposit} ر.س` : '—'}</td></tr>
      <tr class="total"><td class="label">المتبقي</td><td class="value">${order.remaining ? `${order.remaining} ر.س` : '—'}</td></tr>
    </table>
    <p style="text-align:center;margin-top:20px;color:#7A5B35;font-size:12px">شكراً لاختياركم المشالح العربية الخاصة</p>
    </body></html>`;
  }

  if (type === 'jobcard') {
    return `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>بطاقة مصنع</title>
    <style>body{font-family:Tahoma,Arial,sans-serif;padding:20px}
    .order-num{font-size:32px;font-weight:bold;color:#3B2615;text-align:center;border:3px solid #D8A027;padding:10px;border-radius:8px;margin:16px 0;direction:ltr}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    td{padding:8px;border:1px solid #E7D8BD}
    .label{background:#F7F1E6;font-weight:bold;color:#7A5B35;width:40%}
    .urgent{background:#FEF2F2;color:#A33A2A;font-size:18px;font-weight:bold;text-align:center;padding:8px;border-radius:6px;margin-bottom:12px}
    </style></head><body>${logo}
    ${order.urgent ? '<div class="urgent">⚠️ طلب مستعجل</div>' : ''}
    <div class="order-num">${order.orderNumber}</div>
    <div style="text-align:center;font-size:18px;font-weight:bold;color:#D8A027;margin-bottom:8px">${order.branch?.name}</div>
    <table>
      <tr><td class="label">العميل</td><td>${order.customer?.name}</td><td class="label">العدد</td><td>${order.quantity}</td></tr>
      <tr><td class="label">موديل التطريز</td><td>${firstItem.embroideryModel || '—'}</td><td class="label">القماش</td><td>${firstItem.fabric || '—'}</td></tr>
      <tr><td class="label">اللون</td><td>${firstItem.color || '—'}</td><td class="label">المقاس</td><td>${firstItem.size || '—'}</td></tr>
      <tr><td class="label">عرض الزري</td><td>${firstItem.zariWidth || '—'}</td><td class="label">البروج</td><td>${firstItem.brooj || '—'}</td></tr>
      <tr><td class="label">تنجيمة</td><td>${firstItem.tanjeema || '—'}</td><td class="label">خط الدكة</td><td>${firstItem.dakkaLine || '—'}</td></tr>
      <tr><td class="label">مكسر</td><td>${firstItem.mukassar || '—'}</td><td class="label">التكحيلة</td><td>${firstItem.takheela || '—'}</td></tr>
      <tr><td class="label">طول العميل</td><td>${firstItem.customerHeight || '—'}</td><td class="label">طول اليد</td><td>${firstItem.sleeveLength || '—'}</td></tr>
      <tr><td class="label">عرض الكتف</td><td>${firstItem.shoulderWidth || '—'}</td><td class="label">عرض الصدر</td><td>${firstItem.chestWidth || '—'}</td></tr>
      <tr><td class="label">طول الظهر</td><td>${firstItem.backLength || '—'}</td><td class="label">طول الأمام</td><td>${firstItem.frontLength || '—'}</td></tr>
      <tr><td class="label">موعد التسليم</td><td colspan="3">${order.dueDate ? dayjs(order.dueDate).format('DD/MM/YYYY') : '—'}</td></tr>
      ${order.branchNotes ? `<tr><td class="label">ملاحظات الفرع</td><td colspan="3">${order.branchNotes}</td></tr>` : ''}
    </table>
    </body></html>`;
  }

  // delivery slip
  return `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>سند تسليم</title>
  <style>body{font-family:Tahoma,Arial,sans-serif;padding:20px;max-width:400px;margin:0 auto}
  table{width:100%;border-collapse:collapse}td{padding:8px;border-bottom:1px solid #eee}
  .label{color:#7A5B35;font-size:13px}.value{font-weight:bold}
  .sig{border-top:2px dashed #D8A027;margin-top:40px;padding-top:12px;text-align:center;color:#7A5B35}
  </style></head><body>${logo}
  <h3 style="color:#D8A027;text-align:center">سند تسليم</h3>
  <table>
    <tr><td class="label">رقم الطلب</td><td class="value" dir="ltr">${order.orderNumber}</td></tr>
    <tr><td class="label">الفرع</td><td class="value">${order.branch?.name}</td></tr>
    <tr><td class="label">العميل</td><td class="value">${order.customer?.name}</td></tr>
    <tr><td class="label">الجوال</td><td class="value" dir="ltr">${order.customer?.mobile}</td></tr>
    <tr><td class="label">المبلغ المتبقي</td><td class="value">${order.remaining ? `${order.remaining} ر.س` : '—'}</td></tr>
    <tr><td class="label">تاريخ الاستلام</td><td class="value">${dayjs().format('DD/MM/YYYY')}</td></tr>
  </table>
  <div class="sig">توقيع المستلم</div>
  </body></html>`;
}
