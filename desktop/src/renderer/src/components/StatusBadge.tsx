interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  DRAFT:                        { label: 'مسودة',                     color: '#7A5B35', bg: '#F7F1E6', dot: '#9E8672' },
  RECEIVED_AT_BRANCH:           { label: 'في الفرع',                   color: '#1D4ED8', bg: '#EFF6FF', dot: '#3B82F6' },
  SENT_TO_FACTORY:              { label: 'أُرسل للمصنع',               color: '#6D28D9', bg: '#F5F3FF', dot: '#7C3AED' },
  ACCEPTED_BY_FACTORY:          { label: 'قيد التجهيز',                color: '#B45309', bg: '#FFFBEB', dot: '#F59E0B' },
  IN_PREPARATION:               { label: 'قيد التجهيز',                color: '#B45309', bg: '#FFFBEB', dot: '#F59E0B' },
  IN_CUTTING:                   { label: 'قيد التجهيز',                color: '#B45309', bg: '#FEF3C7', dot: '#D97706' },
  IN_EMBROIDERY:                { label: 'قيد التجهيز',                color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6' },
  IN_FINISHING:                 { label: 'قيد التجهيز',                color: '#0369A1', bg: '#F0F9FF', dot: '#0EA5E9' },
  READY_AT_FACTORY:             { label: 'قيد التجهيز',                color: '#166534', bg: '#F0FDF4', dot: '#16A34A' },
  SENT_TO_BRANCH:               { label: 'أُرسل للمحل',                color: '#0F766E', bg: '#F0FDFA', dot: '#14B8A6' },
  RECEIVED_AT_BRANCH_CONFIRMED: { label: 'تم الاستلام من المصنع',       color: '#0F766E', bg: '#CCFBF1', dot: '#0D9488' },
  CUSTOMER_NOTIFIED:            { label: 'تم إشعار العميل',            color: '#0369A1', bg: '#E0F2FE', dot: '#0284C7' },
  DELIVERED_TO_CUSTOMER:        { label: 'تم التسليم للعميل',          color: '#166534', bg: '#DCFCE7', dot: '#22C55E' },
  COMPLETED:                    { label: 'مكتمل',                     color: '#14532D', bg: '#F0FDF4', dot: '#15803D' },
  CANCELLED:                    { label: 'ملغي',                      color: '#991B1B', bg: '#FEF2F2', dot: '#EF4444' },
  ON_HOLD:                      { label: 'موقوف / مراجعة',            color: '#92400E', bg: '#FFFBEB', dot: '#F59E0B' },
};

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const info = STATUS_MAP[status] || { label: status, color: '#7A5B35', bg: '#F7F1E6', dot: '#9E8672' };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
      style={{ color: info.color, backgroundColor: info.bg }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: size === 'sm' ? 6 : 8, height: size === 'sm' ? 6 : 8, backgroundColor: info.dot }}
      />
      {info.label}
    </span>
  );
}

export { STATUS_MAP };
