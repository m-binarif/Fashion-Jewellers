/**
 * SalesReport.jsx — Complete Sales Report & Business Analytics Module.
 * Shared and accessible by both Admin Portal and Inventory Manager Employee Portal.
 * Pure database-driven analytics with date filters, SVG charts, product performance,
 * order history, payment analysis, profit transparency, and PDF / Print export.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

// Helper for formatting currency consistently
const formatPKR = (val) =>
  `PKR ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Helper for formatting date to YYYY-MM-DD
const toDateInputStr = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};

// SVG Line / Area Trend Chart
const SvgTrendChart = ({ data = [], height = 240 }) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        No trend data for this period
      </div>
    );
  }

  const padding = { top: 20, right: 30, bottom: 40, left: 60 };
  const width = 800; // viewBox internal width

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 100);
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padding.top + chartH - (d.revenue / maxRevenue) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`
    : '';

  // Y-axis grid ticks (4 intervals)
  const yTicks = [0, 0.33, 0.66, 1].map((pct) => ({
    val: Math.round(maxRevenue * pct),
    y: padding.top + chartH - pct * chartH,
  }));

  // X-axis label interval to prevent overlap
  const step = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, display: 'block' }}>
        <defs>
          <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y Axis Grid lines */}
        {yTicks.map((t, idx) => (
          <g key={idx}>
            <line
              x1={padding.left}
              y1={t.y}
              x2={width - padding.right}
              y2={t.y}
              stroke="var(--border-color)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
            <text
              x={padding.left - 8}
              y={t.y + 4}
              fontSize="10"
              fill="var(--text-secondary)"
              textAnchor="end"
            >
              {t.val >= 1000 ? `${(t.val / 1000).toFixed(0)}k` : t.val}
            </text>
          </g>
        ))}

        {/* Shaded Area */}
        {areaD && <path d={areaD} fill="url(#revenueAreaGrad)" />}

        {/* Line */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points & X-Axis Labels */}
        {points.map((p, i) => (
          <g key={i}>
            {/* Show label every 'step' points */}
            {(i % step === 0 || i === points.length - 1) && (
              <text
                x={p.x}
                y={padding.top + chartH + 18}
                fontSize="10"
                fill="var(--text-secondary)"
                textAnchor="middle"
              >
                {p.label || p.bucket}
              </text>
            )}

            {/* Clickable/hoverable point circle */}
            <circle
              cx={p.x}
              cy={p.y}
              r={hoverIndex === i ? 6 : p.revenue > 0 ? 3.5 : 2}
              fill={hoverIndex === i ? '#fff' : 'var(--accent-primary)'}
              stroke="var(--accent-primary)"
              strokeWidth={hoverIndex === i ? 2.5 : 1}
              style={{ cursor: 'pointer', transition: 'r 0.15s ease' }}
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          </g>
        ))}
      </svg>

      {/* Tooltip on hover */}
      {hoverIndex !== null && points[hoverIndex] && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: `${Math.min(Math.max((points[hoverIndex].x / width) * 100, 10), 85)}%`,
            transform: 'translateX(-50%)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '11px',
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          <strong>{points[hoverIndex].label || points[hoverIndex].bucket}</strong>
          <div>Revenue: <strong>{formatPKR(points[hoverIndex].revenue)}</strong></div>
          <div>Completed Orders: <strong>{points[hoverIndex].completedOrders}</strong></div>
        </div>
      )}
    </div>
  );
};

// SVG Donut Chart for Status & Payment distributions
const SvgDonutChart = ({ items = [], totalLabel = 'Total', size = 180 }) => {
  const total = items.reduce((sum, item) => sum + (Number(item.value) || 0), 0);

  if (total === 0) {
    return (
      <div style={{ height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        No distribution data
      </div>
    );
  }

  const center = size / 2;
  const radius = size * 0.38;
  const strokeWidth = size * 0.18;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const slices = items.map((item) => {
    const val = Number(item.value) || 0;
    const pct = val / total;
    const strokeDasharray = `${pct * circumference} ${circumference}`;
    const strokeDashoffset = -accumulated * circumference;
    accumulated += pct;
    return { ...item, pct, strokeDasharray, strokeDashoffset };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        {slices.map((slice, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={slice.color || '#828E84'}
            strokeWidth={strokeWidth}
            strokeDasharray={slice.strokeDasharray}
            strokeDashoffset={slice.strokeDashoffset}
            style={{ transition: 'stroke-dasharray 0.3s ease' }}
          />
        ))}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', minWidth: 150 }}>
        {items.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color || '#828E84', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-primary)' }}>{item.label}</span>
            </div>
            <strong style={{ color: 'var(--text-primary)' }}>
              {item.displayValue || item.value} ({((Number(item.value) / total) * 100).toFixed(0)}%)
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ icon, label, value, sub, color = 'var(--accent-primary)', comparison }) => (
  <div
    className="card"
    style={{
      padding: '1.25rem 1.4rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      borderLeft: `4px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      backgroundColor: 'var(--bg-secondary)',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{icon}</span>
    </div>

    <div style={{ marginTop: '0.75rem', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>
      {value}
    </div>

    {sub && (
      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
        {sub}
      </div>
    )}

    {comparison && (
      <div
        style={{
          marginTop: '0.45rem',
          fontSize: '0.75rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          color: comparison.pct >= 0 ? '#10b981' : '#ef4444',
        }}
      >
        <span>{comparison.pct >= 0 ? '▲' : '▼'}</span>
        <span>{Math.abs(comparison.pct)}% vs previous period</span>
      </div>
    )}
  </div>
);

// Order Detail Modal
const OrderDetailModal = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrintInvoice = () => {
    const token =
      sessionStorage.getItem('employee_token') ||
      localStorage.getItem('admin_token') ||
      localStorage.getItem('token');
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/orders/${order.orderId}/invoice?token=${token}`;
    window.open(url, '_blank');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          backgroundColor: 'var(--bg-secondary)',
          padding: '1.75rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Order #{order.orderNumber || order.orderId}</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Placed on {new Date(order.orderDate).toLocaleString()}</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Customer Details</div>
            <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{order.customerName}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{order.customerEmail}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Status & Payment</div>
            <div style={{ marginTop: '0.2rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="badge badge-info" style={{ padding: '0.2rem 0.6rem', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600, background: 'rgba(130,142,132,0.15)', color: 'var(--accent-primary)' }}>
                {order.orderStatus}
              </span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>via {order.paymentMethod} ({order.paymentStatus})</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem' }}>Items Purchased</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left' }}>Item</th>
              <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Unit Price</th>
              <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((it, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '0.6rem 0.75rem' }}>{it.name}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center' }}>{it.quantity}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>{formatPKR(it.unitPrice)}</td>
                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: 600 }}>{formatPKR(it.quantity * Number(it.unitPrice))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
          <button onClick={handlePrintInvoice} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
            <span>🧾</span> View & Print Invoice
          </button>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Order Amount: </span>
            <strong style={{ fontSize: '1.15rem', color: 'var(--accent-primary)' }}>{formatPKR(order.totalAmount)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main SalesReport Component
const SalesReport = () => {
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  // Filter states
  const [periodType, setPeriodType] = useState('monthly'); // 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  const [selectedDate, setSelectedDate] = useState(() => toDateInputStr(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toDateInputStr(d);
  });
  const [customEnd, setCustomEnd] = useState(() => toDateInputStr(new Date()));

  // Order Details table states
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersData, setOrdersData] = useState({ orders: [], pagination: { page: 1, pageSize: 15, total: 0, totalPages: 1 } });
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [orderPage, setOrderPage] = useState(1);
  const [selectedOrderForModal, setSelectedOrderForModal] = useState(null);

  // Product table search & sort
  const [productSearch, setProductSearch] = useState('');
  const [productSortBy, setProductSortBy] = useState('quantitySold'); // 'quantitySold' | 'totalRevenue' | 'productName'
  const [productSortDir, setProductSortDir] = useState('DESC');
  const [productViewTab, setProductViewTab] = useState('all'); // 'all' | 'top' | 'lowest'

  // Fetch full report
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        periodType,
        date: selectedDate,
        weekStart: selectedDate,
        month: selectedMonth,
        year: selectedYear,
        startDate: customStart,
        endDate: customEnd,
      };

      const res = await api.get('/sales-report', { params });
      if (res.data.success) {
        setReport(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load sales report:', err);
      showError(err.response?.data?.message || 'Failed to load sales report');
    } finally {
      setLoading(false);
    }
  }, [periodType, selectedDate, selectedMonth, selectedYear, customStart, customEnd, showError]);

  // Fetch Order Details table (supports server-side pagination & searching)
  const fetchOrderDetails = useCallback(async (page = 1) => {
    try {
      setOrdersLoading(true);
      const params = {
        periodType,
        date: selectedDate,
        weekStart: selectedDate,
        month: selectedMonth,
        year: selectedYear,
        startDate: customStart,
        endDate: customEnd,
        search: orderSearch,
        status: orderStatusFilter,
        paymentStatus: paymentStatusFilter,
        page,
        pageSize: 15,
      };

      const res = await api.get('/sales-report/orders', { params });
      if (res.data.success) {
        setOrdersData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [periodType, selectedDate, selectedMonth, selectedYear, customStart, customEnd, orderSearch, orderStatusFilter, paymentStatusFilter]);

  // Initial and reactive load
  useEffect(() => {
    fetchReport();
    fetchOrderDetails(1);
    setOrderPage(1);
  }, [fetchReport, fetchOrderDetails]);

  // Handler for opening the export HTML / PDF view
  const handleExportPdf = () => {
    const token =
      sessionStorage.getItem('employee_token') ||
      localStorage.getItem('admin_token') ||
      localStorage.getItem('token');
    const params = new URLSearchParams({
      periodType,
      date: selectedDate,
      weekStart: selectedDate,
      month: String(selectedMonth),
      year: String(selectedYear),
      startDate: customStart,
      endDate: customEnd,
      token,
    });

    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/sales-report/export-html?${params.toString()}`;
    window.open(url, '_blank');
    showSuccess('Opening official printable sales report...');
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered and sorted products for display
  const displayedProducts = useMemo(() => {
    if (!report?.productPerformance?.allProducts) return [];
    let list = [...report.productPerformance.allProducts];

    if (productViewTab === 'top') {
      list = list.slice(0, 5);
    } else if (productViewTab === 'lowest') {
      list = [...list.filter((p) => p.quantitySold > 0)].reverse().slice(0, 5);
    }

    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter((p) => p.productName.toLowerCase().includes(q) || p.productId.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      let valA = a[productSortBy];
      let valB = b[productSortBy];
      if (typeof valA === 'string') return productSortDir === 'ASC' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      return productSortDir === 'ASC' ? valA - valB : valB - valA;
    });

    return list;
  }, [report, productViewTab, productSearch, productSortBy, productSortDir]);

  // Status donut data
  const statusDonutData = useMemo(() => {
    const colors = {
      Delivered: '#10b981',
      Shipped: '#3b82f6',
      Processing: '#8b5cf6',
      Pending: '#f59e0b',
      Cancelled: '#ef4444',
      'Payment Failed': '#dc2626',
    };
    return (report?.statusDistribution || []).map((s) => ({
      label: s.status,
      value: s.count,
      color: colors[s.status] || '#6b7280',
      displayValue: `${s.count} orders`,
    }));
  }, [report]);

  // Payment donut data
  const paymentDonutData = useMemo(() => {
    const colors = ['#828E84', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    return (report?.paymentAnalysis?.methods || []).map((m, idx) => ({
      label: m.paymentMethod,
      value: m.totalAmount,
      color: colors[idx % colors.length],
      displayValue: formatPKR(m.totalAmount),
    }));
  }, [report]);

  const summary = report?.summary;
  const insights = report?.insights;

  return (
    <div style={{ maxWidth: 1300, margin: '0 auto' }}>
      {/* 1. Header Bar */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>Sales Report & Business Analytics</h2>
          <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {report?.periodInfo?.periodLabel || 'Database-Driven Sales Intelligence'} &bull; Real-time PostgreSQL aggregation
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={handlePrint} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1rem', fontSize: '0.85rem' }}>
            <span>🖨️</span> Print Report
          </button>
          <button onClick={handleExportPdf} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}>
            <span>📄</span> Download PDF Report
          </button>
        </div>
      </div>

      {/* 2. Period Filter Selector Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', backgroundColor: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          {/* Period Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.25rem', borderRadius: '8px' }}>
            {[
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly' },
              { id: 'monthly', label: 'Monthly' },
              { id: 'yearly', label: 'Yearly' },
              { id: 'custom', label: 'Custom Range' },
            ].map((tab) => {
              const active = periodType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setPeriodType(tab.id)}
                  style={{
                    padding: '0.45rem 0.95rem',
                    fontSize: '0.82rem',
                    fontWeight: active ? 600 : 400,
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: active ? 'var(--accent-primary)' : 'transparent',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Dynamic Filter Controls according to active period */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {periodType === 'daily' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Select Date:</span>
                <input
                  type="date"
                  className="form-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                />
              </div>
            )}

            {periodType === 'weekly' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Week Of:</span>
                <input
                  type="date"
                  className="form-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                />
              </div>
            )}

            {periodType === 'monthly' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Month & Year:</span>
                <select
                  className="form-input"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                >
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December',
                  ].map((mName, i) => (
                    <option key={i + 1} value={i + 1}>
                      {mName}
                    </option>
                  ))}
                </select>
                <select
                  className="form-input"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                >
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periodType === 'yearly' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Year:</span>
                <select
                  className="form-input"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                >
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {periodType === 'custom' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>From:</span>
                <input
                  type="date"
                  className="form-input"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>To:</span>
                <input
                  type="date"
                  className="form-input"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                />
              </div>
            )}

            <button
              onClick={() => {
                fetchReport();
                fetchOrderDetails(1);
              }}
              className="btn btn-outline"
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {loading && !report && (
        <div style={{ padding: '5rem', textAlign: 'center' }}>
          <div className="loader" style={{ margin: '0 auto' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Aggregating transactional sales data...</p>
        </div>
      )}

      {report && (
        <>
          {/* 3. Sales Overview Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            <SummaryCard
              icon="💰"
              label="Total Revenue"
              value={formatPKR(summary?.totalRevenue)}
              sub="From completed (delivered) orders"
              color="#10b981"
              comparison={summary?.comparison ? { pct: summary.comparison.revenueGrowthPct } : null}
            />
            <SummaryCard
              icon="✅"
              label="Completed Orders"
              value={summary?.completedOrders ?? 0}
              sub={`Out of ${summary?.totalOrders ?? 0} total placed`}
              color="var(--accent-primary)"
              comparison={summary?.comparison ? { pct: summary.comparison.ordersGrowthPct } : null}
            />
            <SummaryCard
              icon="💎"
              label="Products Sold"
              value={`${summary?.totalProductsSold ?? 0} Units`}
              sub="Items delivered to customers"
              color="#3b82f6"
            />
            <SummaryCard
              icon="📈"
              label="Average Order Value"
              value={formatPKR(summary?.avgOrderValue)}
              sub="Eligible Revenue / Completed Orders"
              color="#8b5cf6"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Net Sales Revenue</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.3rem' }}>{formatPKR(summary?.netSales)}</div>
            </div>
            <div className="card" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Pending Orders</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.3rem' }}>{summary?.pendingOrders ?? 0}</div>
            </div>
            <div className="card" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Shipped In-Transit</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.3rem' }}>{summary?.shippedOrders ?? 0}</div>
            </div>
            <div className="card" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Cancelled / Failed</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444', marginTop: '0.3rem' }}>{summary?.cancelledOrders ?? 0}</div>
            </div>
            <div className="card" style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Discounts & Returns</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-secondary)', marginTop: '0.3rem' }}>PKR 0.00</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Schema has no discount/return fields</div>
            </div>
          </div>

          {/* 4. Sales Trends & Visual Analytics Charts */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Left: Revenue Trend Chart */}
            <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Revenue Over Time</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Aggregated by {report.periodInfo.grouping} performance
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                  Total: {formatPKR(summary?.totalRevenue)}
                </div>
              </div>
              <SvgTrendChart data={report.trends} height={250} />
            </div>

            {/* Right: Order Status Distribution Donut */}
            <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Order Status Breakdown</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Distribution across active orders</span>
              </div>
              <div style={{ margin: '1.5rem 0' }}>
                <SvgDonutChart items={statusDonutData} size={180} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', textAlign: 'center' }}>
                Total Orders in Selected Period: <strong>{summary?.totalOrders ?? 0}</strong>
              </div>
            </div>
          </div>

          {/* 5. Business Highlights & Insights Card */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', backgroundColor: 'var(--bg-secondary)', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.2rem' }}>💡</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Sales & Business Insights</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Best Performing Date/Bucket</span>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                  {insights?.bestPerformingPeriod ? `${insights.bestPerformingPeriod.label} (${formatPKR(insights.bestPerformingPeriod.revenue)})` : 'No sales recorded'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Highest Revenue Product</span>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                  {insights?.topRevenueProduct ? `${insights.topRevenueProduct.name} (${formatPKR(insights.topRevenueProduct.revenue)})` : 'None'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Highest Volume Sold</span>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                  {insights?.topQuantityProduct ? `${insights.topQuantityProduct.name} (${insights.topQuantityProduct.quantity} units)` : 'None'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 600 }}>Average Daily Sales</span>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                  {formatPKR(insights?.averageDailySales)} / day
                </div>
              </div>
            </div>
          </div>

          {/* 6. Product-Wise Performance Analysis */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', backgroundColor: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Product-Wise Sales Analysis</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Performance ranked by sales volume and revenue generation
                </span>
              </div>

              {/* Sub tabs & Search */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.2rem', borderRadius: '6px' }}>
                  {['all', 'top', 'lowest'].map((subTab) => (
                    <button
                      key={subTab}
                      onClick={() => setProductViewTab(subTab)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.78rem',
                        fontWeight: productViewTab === subTab ? 600 : 400,
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: productViewTab === subTab ? 'var(--accent-primary)' : 'transparent',
                        color: productViewTab === subTab ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      {subTab === 'all' ? 'All Products' : subTab === 'top' ? 'Top Selling' : 'Lowest Selling'}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  className="form-input"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', width: 200 }}
                />
              </div>
            </div>

            {displayedProducts.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No product sales found matching the selected criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center', width: 60 }}>Rank</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Product</th>
                      <th
                        style={{ padding: '0.75rem 1rem', textAlign: 'right', cursor: 'pointer' }}
                        onClick={() => {
                          setProductSortBy('basePrice');
                          setProductSortDir(productSortDir === 'ASC' ? 'DESC' : 'ASC');
                        }}
                      >
                        Unit Price {productSortBy === 'basePrice' && (productSortDir === 'ASC' ? '▲' : '▼')}
                      </th>
                      <th
                        style={{ padding: '0.75rem 1rem', textAlign: 'right', cursor: 'pointer' }}
                        onClick={() => {
                          setProductSortBy('quantitySold');
                          setProductSortDir(productSortDir === 'ASC' ? 'DESC' : 'ASC');
                        }}
                      >
                        Qty Sold {productSortBy === 'quantitySold' && (productSortDir === 'ASC' ? '▲' : '▼')}
                      </th>
                      <th
                        style={{ padding: '0.75rem 1rem', textAlign: 'right', cursor: 'pointer' }}
                        onClick={() => {
                          setProductSortBy('totalRevenue');
                          setProductSortDir(productSortDir === 'ASC' ? 'DESC' : 'ASC');
                        }}
                      >
                        Total Revenue {productSortBy === 'totalRevenue' && (productSortDir === 'ASC' ? '▲' : '▼')}
                      </th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left', width: 140 }}>Revenue Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedProducts.map((p) => (
                      <tr key={p.productId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 600 }}>#{p.rank}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.productName}</div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>ID: {p.productId}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>{formatPKR(p.basePrice)}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>{p.quantitySold}</td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                          {formatPKR(p.totalRevenue)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: 6, backgroundColor: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(p.revenueContributionPct, 100)}%`, height: '100%', backgroundColor: 'var(--accent-primary)' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{p.revenueContributionPct}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 7. Payment & Revenue Settlement Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Payment Settlements</h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Collected vs outstanding payments</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ padding: '1rem', borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase' }}>Paid & Collected</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#10b981', marginTop: '0.2rem' }}>
                    {formatPKR(report.paymentAnalysis?.totalPaidAmount)}
                  </div>
                </div>
                <div style={{ padding: '1rem', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, textTransform: 'uppercase' }}>Unpaid / Pending COD</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.2rem' }}>
                    {formatPKR(report.paymentAnalysis?.totalPendingAmount)}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Collection Rate: <strong>{report.paymentAnalysis?.totalCollectedPercentage}%</strong> of total payment volume.
              </div>
            </div>

            <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--bg-secondary)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Payment Method Distribution</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Breakdown by payment gateways</span>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <SvgDonutChart items={paymentDonutData} size={160} />
              </div>
            </div>
          </div>

          {/* 8. Profit Analysis Notice */}
          <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '2rem', backgroundColor: 'var(--bg-secondary)', borderLeft: '4px solid #828E84' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
              <div>
                <strong style={{ fontSize: '0.9rem' }}>Profit & Cost of Goods Sold (COGS) Analytics Status</strong>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {report.profitAnalysis?.note}
                </p>
              </div>
            </div>
          </div>

          {/* 9. Order Transaction History Table */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', backgroundColor: 'var(--bg-secondary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Order Transaction History</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Detailed itemized records for this reporting window
                </span>
              </div>

              {/* Search & Filters */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Search Order # or Customer..."
                  className="form-input"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', width: 220 }}
                />

                <select
                  className="form-input"
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  <option value="all">All Order Statuses</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Processing">Processing</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <select
                  className="form-input"
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                >
                  <option value="all">All Payment Statuses</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
            </div>

            {ordersLoading ? (
              <div style={{ padding: '3rem', textAlign: 'center' }}>
                <div className="loader" style={{ margin: '0 auto' }} />
              </div>
            ) : ordersData.orders.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No orders match the selected filters.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Order #</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Date</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Customer</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Purchased Items</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Payment</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Total Amount</th>
                      <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersData.orders.map((o) => (
                      <tr
                        key={o.orderId}
                        style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}
                        onClick={() => setSelectedOrderForModal(o)}
                      >
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{o.orderNumber || o.orderId}</td>
                        <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>
                          {new Date(o.orderDate).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: 600 }}>{o.customerName}</div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{o.customerEmail}</span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', maxWidth: 220, color: 'var(--text-secondary)' }}>
                          {o.itemsSummary}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div>{o.paymentMethod}</div>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: o.paymentStatus === 'Completed' ? '#10b981' : '#f59e0b',
                            }}
                          >
                            ● {o.paymentStatus}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: 12,
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor:
                                o.orderStatus === 'Delivered'
                                  ? 'rgba(16,185,129,0.12)'
                                  : o.orderStatus === 'Cancelled'
                                  ? 'rgba(239,68,68,0.12)'
                                  : 'rgba(59,130,246,0.12)',
                              color:
                                o.orderStatus === 'Delivered'
                                  ? '#10b981'
                                  : o.orderStatus === 'Cancelled'
                                  ? '#ef4444'
                                  : '#3b82f6',
                            }}
                          >
                            {o.orderStatus}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {formatPKR(o.totalAmount)}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedOrderForModal(o)}
                            className="btn btn-outline"
                            style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination Controls */}
                {ordersData.pagination.totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', padding: '0.5rem 0' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Showing Page {ordersData.pagination.page} of {ordersData.pagination.totalPages} ({ordersData.pagination.total} total orders)
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                        disabled={orderPage <= 1}
                        onClick={() => {
                          const p = Math.max(1, orderPage - 1);
                          setOrderPage(p);
                          fetchOrderDetails(p);
                        }}
                      >
                        Previous
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem' }}
                        disabled={orderPage >= ordersData.pagination.totalPages}
                        onClick={() => {
                          const p = orderPage + 1;
                          setOrderPage(p);
                          fetchOrderDetails(p);
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Order Detail Modal */}
      {selectedOrderForModal && (
        <OrderDetailModal
          order={selectedOrderForModal}
          onClose={() => setSelectedOrderForModal(null)}
        />
      )}
    </div>
  );
};

export default SalesReport;
