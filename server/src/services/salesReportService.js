/**
 * salesReportService.js — Complete sales reporting and business analytics service.
 * Performs accurate SQL aggregation on PostgreSQL transactional tables:
 * orders, record_items, product, customer, payment, payment_method.
 */

const pool = require('../db/pool');

/**
 * Format a Date object to YYYY-MM-DD
 */
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse and normalize reporting period date boundaries.
 * Guarantees inclusive start and exclusive end boundaries: [start, end)
 * and calculates the immediately preceding equivalent comparison period.
 */
function parseDateRange(periodType = 'monthly', options = {}) {
  const now = new Date();
  let start, end, prevStart, prevEnd, grouping, periodLabel;

  switch (periodType.toLowerCase()) {
    case 'daily': {
      // Date in YYYY-MM-DD (defaults to today)
      const targetStr = options.date || formatDate(now);
      const [y, m, d] = targetStr.split('-').map(Number);
      start = new Date(y, m - 1, d, 0, 0, 0, 0);
      end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);

      // Preceding day
      prevStart = new Date(y, m - 1, d - 1, 0, 0, 0, 0);
      prevEnd = new Date(y, m - 1, d, 0, 0, 0, 0);

      grouping = 'hourly';
      periodLabel = `Daily Report — ${targetStr}`;
      break;
    }

    case 'weekly': {
      // Date within the week or weekStart
      const targetStr = options.date || options.weekStart || formatDate(now);
      const [y, m, d] = targetStr.split('-').map(Number);
      const ref = new Date(y, m - 1, d);
      // Adjust to Monday
      const dayOfWeek = ref.getDay(); // 0 is Sunday, 1 is Monday
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(y, m - 1, d + diffToMonday, 0, 0, 0, 0);
      const nextMonday = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000);

      start = monday;
      end = nextMonday;

      // Preceding week
      prevStart = new Date(monday.getTime() - 7 * 24 * 60 * 60 * 1000);
      prevEnd = monday;

      grouping = 'daily';
      const sunday = new Date(nextMonday.getTime() - 1);
      periodLabel = `Weekly Report — ${formatDate(monday)} to ${formatDate(sunday)}`;
      break;
    }

    case 'yearly': {
      const year = Number(options.year) || now.getFullYear();
      start = new Date(year, 0, 1, 0, 0, 0, 0);
      end = new Date(year + 1, 0, 1, 0, 0, 0, 0);

      // Preceding year
      prevStart = new Date(year - 1, 0, 1, 0, 0, 0, 0);
      prevEnd = start;

      grouping = 'monthly';
      periodLabel = `Yearly Report — ${year}`;
      break;
    }

    case 'custom': {
      const sStr = options.startDate || formatDate(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      const eStr = options.endDate || formatDate(now);
      const [sy, sm, sd] = sStr.split('-').map(Number);
      const [ey, em, ed] = eStr.split('-').map(Number);

      start = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      end = new Date(ey, em - 1, ed + 1, 0, 0, 0, 0);

      const diffMs = end.getTime() - start.getTime();
      prevStart = new Date(start.getTime() - diffMs);
      prevEnd = start;

      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
      if (diffDays <= 2) grouping = 'hourly';
      else if (diffDays <= 60) grouping = 'daily';
      else grouping = 'monthly';

      periodLabel = `Custom Report — ${sStr} to ${eStr}`;
      break;
    }

    case 'monthly':
    default: {
      const year = Number(options.year) || now.getFullYear();
      const month = Number(options.month) || (now.getMonth() + 1); // 1-12
      start = new Date(year, month - 1, 1, 0, 0, 0, 0);
      end = new Date(year, month, 1, 0, 0, 0, 0);

      // Preceding month
      prevStart = new Date(year, month - 2, 1, 0, 0, 0, 0);
      prevEnd = start;

      grouping = 'daily';
      const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      periodLabel = `Monthly Report — ${monthNames[month - 1]} ${year}`;
      break;
    }
  }

  return {
    periodType,
    start,
    end,
    prevStart,
    prevEnd,
    grouping,
    periodLabel,
    startDateStr: formatDate(start),
    endDateStr: formatDate(new Date(end.getTime() - 1)),
  };
}

const SalesReportService = {
  /**
   * Main reporting method that aggregates all business data for the specified period.
   */
  async getFullReport(periodType, options = {}) {
    const range = parseDateRange(periodType, options);
    const { start, end, prevStart, prevEnd, grouping } = range;

    const [
      summary,
      prevSummary,
      trends,
      statusDistribution,
      productSales,
      paymentAnalysis,
      recentOrders
    ] = await Promise.all([
      this.getSummary(start, end),
      this.getSummary(prevStart, prevEnd),
      this.getTrends(start, end, grouping),
      this.getOrderStatusDistribution(start, end),
      this.getProductSales(start, end),
      this.getPaymentAnalysis(start, end),
      this.getOrderDetails({ start, end, page: 1, pageSize: 10 })
    ]);

    // Comparison calculations
    const revenueDiff = summary.totalRevenue - prevSummary.totalRevenue;
    const revenueGrowthPct = prevSummary.totalRevenue > 0
      ? Number(((revenueDiff / prevSummary.totalRevenue) * 100).toFixed(2))
      : (summary.totalRevenue > 0 ? 100 : 0);

    const ordersDiff = summary.completedOrders - prevSummary.completedOrders;
    const ordersGrowthPct = prevSummary.completedOrders > 0
      ? Number(((ordersDiff / prevSummary.completedOrders) * 100).toFixed(2))
      : (summary.completedOrders > 0 ? 100 : 0);

    // Business Insights
    const insights = this.calculateInsights(trends, productSales, summary, revenueGrowthPct, range);

    return {
      periodInfo: {
        periodType: range.periodType,
        periodLabel: range.periodLabel,
        startDate: range.startDateStr,
        endDate: range.endDateStr,
        grouping: range.grouping,
        generatedAt: new Date().toISOString()
      },
      summary: {
        ...summary,
        returnedOrders: 0, // Schema does not contain returns table
        totalDiscounts: 0, // Schema does not contain discount column
        netSales: summary.totalRevenue,
        comparison: {
          previousRevenue: prevSummary.totalRevenue,
          previousCompletedOrders: prevSummary.completedOrders,
          revenueDiff,
          revenueGrowthPct,
          ordersDiff,
          ordersGrowthPct,
        }
      },
      trends,
      statusDistribution,
      productPerformance: {
        topSelling: productSales.slice(0, 5),
        lowestSelling: [...productSales.filter(p => p.quantitySold > 0)].reverse().slice(0, 5),
        allProducts: productSales,
        totalProductsCount: productSales.length
      },
      paymentAnalysis,
      profitAnalysis: {
        isAvailable: false,
        note: 'Cost price / purchase price fields are not tracked in the current database schema. In compliance with strict business reporting integrity, profit margins and COGS are not fabricated.'
      },
      insights,
      recentOrders
    };
  },

  /**
   * Summary KPI figures for date bounds [start, end)
   */
  async getSummary(start, end) {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE order_status = 'Delivered') AS completed_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE order_status = 'Delivered'), 0) AS completed_revenue,
        COUNT(*) FILTER (WHERE order_status IN ('Pending', 'Processing')) AS pending_orders,
        COUNT(*) FILTER (WHERE order_status = 'Shipped') AS shipped_orders,
        COUNT(*) FILTER (WHERE order_status IN ('Cancelled', 'Payment Failed')) AS cancelled_orders,
        COUNT(*) AS total_orders
      FROM orders
      WHERE order_date >= $1 AND order_date < $2
    `;

    const { rows: [summaryRow] } = await pool.query(query, [start, end]);

    // Total products sold in completed orders
    const itemsQuery = `
      SELECT COALESCE(SUM(ri.quantity), 0) AS total_products_sold
      FROM record_items ri
      JOIN orders o ON ri.order_id = o.order_id
      WHERE o.order_date >= $1 AND o.order_date < $2
        AND o.order_status = 'Delivered'
    `;
    const { rows: [itemRow] } = await pool.query(itemsQuery, [start, end]);

    const totalRevenue = Number(summaryRow.completed_revenue || 0);
    const completedOrders = parseInt(summaryRow.completed_orders || 0, 10);
    const totalProductsSold = parseInt(itemRow.total_products_sold || 0, 10);
    const avgOrderValue = completedOrders > 0 ? Number((totalRevenue / completedOrders).toFixed(2)) : 0;

    return {
      totalRevenue,
      completedOrders,
      totalProductsSold,
      avgOrderValue,
      pendingOrders: parseInt(summaryRow.pending_orders || 0, 10),
      shippedOrders: parseInt(summaryRow.shipped_orders || 0, 10),
      cancelledOrders: parseInt(summaryRow.cancelled_orders || 0, 10),
      totalOrders: parseInt(summaryRow.total_orders || 0, 10),
    };
  },

  /**
   * Sales & Order Trends over time grouped by hourly / daily / monthly
   */
  async getTrends(start, end, grouping) {
    let dateFormat, sqlExtract;
    if (grouping === 'hourly') {
      dateFormat = 'HH24:00';
      sqlExtract = "TO_CHAR(order_date, 'HH24:00')";
    } else if (grouping === 'monthly') {
      dateFormat = 'YYYY-MM';
      sqlExtract = "TO_CHAR(order_date, 'YYYY-MM')";
    } else {
      // default: daily
      dateFormat = 'YYYY-MM-DD';
      sqlExtract = "TO_CHAR(order_date, 'YYYY-MM-DD')";
    }

    const query = `
      SELECT
        ${sqlExtract} AS bucket,
        COUNT(*) FILTER (WHERE order_status = 'Delivered') AS completed_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE order_status = 'Delivered'), 0) AS revenue,
        COUNT(*) AS total_orders
      FROM orders
      WHERE order_date >= $1 AND order_date < $2
      GROUP BY bucket
      ORDER BY bucket ASC
    `;

    const { rows } = await pool.query(query, [start, end]);
    const dataMap = new Map();
    rows.forEach(r => {
      dataMap.set(r.bucket, {
        revenue: Number(r.revenue),
        completedOrders: parseInt(r.completed_orders, 10),
        totalOrders: parseInt(r.total_orders, 10)
      });
    });

    // Build continuous timeline array
    const points = [];
    if (grouping === 'hourly') {
      for (let h = 0; h < 24; h++) {
        const bucket = String(h).padStart(2, '0') + ':00';
        const existing = dataMap.get(bucket) || { revenue: 0, completedOrders: 0, totalOrders: 0 };
        points.push({ bucket, label: bucket, ...existing });
      }
    } else if (grouping === 'daily') {
      const cursor = new Date(start.getTime());
      while (cursor < end) {
        const bucket = formatDate(cursor);
        const existing = dataMap.get(bucket) || { revenue: 0, completedOrders: 0, totalOrders: 0 };
        points.push({
          bucket,
          label: cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          ...existing
        });
        cursor.setDate(cursor.getDate() + 1);
      }
    } else if (grouping === 'monthly') {
      const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cursor < end) {
        const m = String(cursor.getMonth() + 1).padStart(2, '0');
        const bucket = `${cursor.getFullYear()}-${m}`;
        const existing = dataMap.get(bucket) || { revenue: 0, completedOrders: 0, totalOrders: 0 };
        points.push({
          bucket,
          label: `${monthNames[cursor.getMonth()]} ${cursor.getFullYear()}`,
          ...existing
        });
        cursor.setMonth(cursor.getMonth() + 1);
      }
    }

    return points;
  },

  /**
   * Order Status Distribution (Completed, Pending, Shipped, Cancelled, Failed)
   */
  async getOrderStatusDistribution(start, end) {
    const query = `
      SELECT
        order_status AS status,
        COUNT(*) AS count,
        COALESCE(SUM(total_amount), 0) AS amount
      FROM orders
      WHERE order_date >= $1 AND order_date < $2
      GROUP BY order_status
      ORDER BY count DESC
    `;

    const { rows } = await pool.query(query, [start, end]);
    const totalCount = rows.reduce((acc, r) => acc + parseInt(r.count, 10), 0);

    return rows.map(r => ({
      status: r.status,
      count: parseInt(r.count, 10),
      amount: Number(r.amount),
      percentage: totalCount > 0 ? Number(((parseInt(r.count, 10) / totalCount) * 100).toFixed(1)) : 0
    }));
  },

  /**
   * Product-Wise Performance Analysis
   */
  async getProductSales(start, end, search = '', sortBy = 'quantitySold', sortDir = 'DESC') {
    let query = `
      SELECT
        p.product_id AS "productId",
        p.product_name AS "productName",
        p.base_price AS "basePrice",
        COALESCE(NULLIF(p.image_url, ''), '/uploads/' || p.product_name || '.png') AS "imageUrl",
        COALESCE(SUM(ri.quantity), 0) AS "quantitySold",
        COALESCE(AVG(ri.unit_price), p.base_price) AS "avgUnitPrice",
        COALESCE(SUM(ri.quantity * ri.unit_price), 0) AS "totalRevenue"
      FROM record_items ri
      JOIN orders o ON ri.order_id = o.order_id
      JOIN product p ON ri.product_id = p.product_id
      WHERE o.order_date >= $1 AND o.order_date < $2
        AND o.order_status = 'Delivered'
    `;

    const params = [start, end];
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (p.product_name ILIKE $${params.length} OR p.product_id ILIKE $${params.length})`;
    }

    query += ` GROUP BY p.product_id, p.product_name, p.base_price, p.image_url`;

    const validSortCols = {
      quantitySold: '"quantitySold"',
      totalRevenue: '"totalRevenue"',
      productName: '"productName"',
      basePrice: '"basePrice"'
    };
    const orderCol = validSortCols[sortBy] || '"quantitySold"';
    const direction = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY ${orderCol} ${direction}`;

    const { rows } = await pool.query(query, params);
    const totalRev = rows.reduce((sum, r) => sum + Number(r.totalRevenue), 0);

    return rows.map((r, idx) => ({
      rank: idx + 1,
      productId: r.productId,
      productName: r.productName,
      imageUrl: r.imageUrl,
      basePrice: Number(r.basePrice),
      avgUnitPrice: Number(r.avgUnitPrice),
      quantitySold: parseInt(r.quantitySold, 10),
      totalRevenue: Number(r.totalRevenue),
      revenueContributionPct: totalRev > 0 ? Number(((Number(r.totalRevenue) / totalRev) * 100).toFixed(1)) : 0
    }));
  },

  /**
   * Order Details & Transaction History with search, filter, pagination
   */
  async getOrderDetails({ start, end, search = '', status = '', paymentStatus = '', sortBy = 'orderDate', sortDir = 'DESC', page = 1, pageSize = 20 }) {
    const size = Math.min(Math.max(1, Number(pageSize) || 20), 100);
    const currentPage = Math.max(1, Number(page) || 1);
    const offset = (currentPage - 1) * size;

    const conditions = ['o.order_date >= $1', 'o.order_date < $2'];
    const params = [start, end];
    let idx = 3;

    if (status && status !== 'all') {
      conditions.push(`o.order_status = $${idx++}`);
      params.push(status);
    }

    if (paymentStatus && paymentStatus !== 'all') {
      conditions.push(`py.payment_status = $${idx++}`);
      params.push(paymentStatus);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(`(o.order_number ILIKE $${idx} OR o.order_id ILIKE $${idx} OR c.full_name ILIKE $${idx})`);
      params.push(term);
      idx++;
    }

    const whereClause = conditions.join(' AND ');

    // Total Count query
    const countSql = `
      SELECT COUNT(DISTINCT o.order_id) AS total
      FROM orders o
      JOIN customer c ON o.customer_id = c.customer_id
      LEFT JOIN payment py ON o.order_id = py.order_id
      WHERE ${whereClause}
    `;
    const countRes = await pool.query(countSql, params);
    const total = parseInt(countRes.rows[0].total, 10);
    const totalPages = Math.ceil(total / size);

    // Main records query
    const validSort = {
      orderDate: 'o.order_date',
      totalAmount: 'o.total_amount',
      orderNumber: 'o.order_number'
    };
    const orderCol = validSort[sortBy] || 'o.order_date';
    const direction = sortDir.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const dataSql = `
      SELECT
        o.order_id AS "orderId",
        o.order_number AS "orderNumber",
        o.order_date AS "orderDate",
        o.total_amount AS "totalAmount",
        o.order_status AS "orderStatus",
        c.full_name AS "customerName",
        c.email AS "customerEmail",
        COALESCE(pm.payment_type, 'Not Specified') AS "paymentMethod",
        COALESCE(py.payment_status, 'Pending') AS "paymentStatus",
        COALESCE(
          (SELECT json_agg(json_build_object(
            'productId', ri.product_id,
            'name', p.product_name,
            'quantity', ri.quantity,
            'unitPrice', ri.unit_price
          ))
          FROM record_items ri
          JOIN product p ON ri.product_id = p.product_id
          WHERE ri.order_id = o.order_id),
          '[]'::json
        ) AS items,
        (SELECT COALESCE(SUM(quantity), 0) FROM record_items r WHERE r.order_id = o.order_id) AS "totalQuantity"
      FROM orders o
      JOIN customer c ON o.customer_id = c.customer_id
      LEFT JOIN payment py ON o.order_id = py.order_id
      LEFT JOIN payment_method pm ON py.method_id = pm.method_id
      WHERE ${whereClause}
      ORDER BY ${orderCol} ${direction}
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const { rows } = await pool.query(dataSql, [...params, size, offset]);

    return {
      orders: rows.map(r => ({
        ...r,
        totalAmount: Number(r.totalAmount),
        totalQuantity: parseInt(r.totalQuantity, 10),
        itemsSummary: (r.items || []).map(i => `${i.name} (x${i.quantity})`).join(', ') || 'No Items'
      })),
      pagination: {
        page: currentPage,
        pageSize: size,
        total,
        totalPages
      }
    };
  },

  /**
   * Payment & Revenue Breakdown Analysis
   */
  async getPaymentAnalysis(start, end) {
    const query = `
      SELECT
        COALESCE(pm.payment_type, 'Other / Unknown') AS "paymentMethod",
        COUNT(p.payment_id) AS "transactionCount",
        COALESCE(SUM(CASE WHEN p.payment_status = 'Completed' THEN p.amount_paid ELSE 0 END), 0) AS "collectedAmount",
        COALESCE(SUM(CASE WHEN p.payment_status = 'Pending' THEN p.amount_paid ELSE 0 END), 0) AS "pendingAmount",
        COALESCE(SUM(CASE WHEN p.payment_status = 'Failed' THEN p.amount_paid ELSE 0 END), 0) AS "failedAmount",
        COALESCE(SUM(p.amount_paid), 0) AS "totalPaymentAmount"
      FROM payment p
      JOIN orders o ON p.order_id = o.order_id
      LEFT JOIN payment_method pm ON p.method_id = pm.method_id
      WHERE o.order_date >= $1 AND o.order_date < $2
      GROUP BY pm.payment_type
      ORDER BY "totalPaymentAmount" DESC
    `;

    const { rows } = await pool.query(query, [start, end]);

    let totalPaid = 0;
    let totalPending = 0;
    let totalFailed = 0;

    const methods = rows.map(r => {
      const collected = Number(r.collectedAmount);
      const pending = Number(r.pendingAmount);
      const failed = Number(r.failedAmount);
      const total = Number(r.totalPaymentAmount);
      totalPaid += collected;
      totalPending += pending;
      totalFailed += failed;

      return {
        paymentMethod: r.paymentMethod,
        transactionCount: parseInt(r.transactionCount, 10),
        collectedAmount: collected,
        pendingAmount: pending,
        failedAmount: failed,
        totalAmount: total,
      };
    });

    return {
      totalPaidAmount: totalPaid,
      totalPendingAmount: totalPending,
      totalFailedAmount: totalFailed,
      totalCollectedPercentage: (totalPaid + totalPending) > 0 ? Number(((totalPaid / (totalPaid + totalPending)) * 100).toFixed(1)) : 0,
      methods
    };
  },

  /**
   * Business Insights & Highlights
   */
  calculateInsights(trends, productSales, summary, growthPct, range) {
    // Best performing day/bucket in trends
    let bestBucket = null;
    let maxRev = -1;
    trends.forEach(t => {
      if (t.revenue > maxRev) {
        maxRev = t.revenue;
        bestBucket = t;
      }
    });

    // Top revenue product
    const topRevProd = productSales.length > 0 ? [...productSales].sort((a,b) => b.totalRevenue - a.totalRevenue)[0] : null;
    // Top quantity product
    const topQtyProd = productSales.length > 0 ? productSales[0] : null;

    // Daily average
    const diffDays = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000)));
    const avgDailySales = Number((summary.totalRevenue / diffDays).toFixed(2));

    return {
      bestPerformingPeriod: bestBucket && maxRev > 0 ? { label: bestBucket.label || bestBucket.bucket, revenue: bestBucket.revenue } : null,
      topRevenueProduct: topRevProd ? { name: topRevProd.productName, revenue: topRevProd.totalRevenue } : null,
      topQuantityProduct: topQtyProd ? { name: topQtyProd.productName, quantity: topQtyProd.quantitySold } : null,
      averageDailySales: avgDailySales,
      salesGrowthVsPrevious: growthPct,
      periodDays: diffDays
    };
  },

  /**
   * Generates a complete standalone printable HTML sales report with @media print styling.
   */
  generateHtmlReport(data) {
    const { periodInfo, summary, productPerformance, paymentAnalysis, insights, recentOrders } = data;
    const formatPKR = (val) => `PKR ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sales Report — ${periodInfo.periodLabel}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 18mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      background: #fff;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
      font-size: 13px;
    }
    .no-print-bar {
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .print-btn {
      background: #828E84;
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .print-btn:hover { background: #6b776d; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #828E84;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .company-name {
      font-size: 22px;
      font-weight: 800;
      color: #828E84;
      letter-spacing: 0.05em;
      margin: 0;
    }
    .report-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 4px 0 0;
    }
    .meta-details { text-align: right; font-size: 12px; color: #6b7280; }
    .meta-details strong { color: #111827; }

    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 6px;
      margin: 24px 0 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px 14px;
      background: #fafafa;
    }
    .kpi-card .label { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; }
    .kpi-card .value { font-size: 18px; font-weight: 700; color: #111827; margin-top: 4px; }
    .kpi-card .sub { font-size: 11px; color: #10b981; margin-top: 2px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 12px;
    }
    th {
      background-color: #f9fafb;
      color: #4b5563;
      text-align: left;
      padding: 8px 10px;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid #f3f4f6;
    }
    tr:nth-child(even) td { background-color: #fafbfc; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 600;
    }
    .badge-success { background: #d1fae5; color: #065f46; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-info { background: #dbeafe; color: #1e40af; }

    .page-break { page-break-before: always; }
    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #9ca3af;
    }

    @media print {
      body { padding: 0; }
      .no-print-bar { display: none !important; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div><strong>Sales Report Preview</strong> — Click "Print / Save as PDF" to generate your official PDF.</div>
    <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
  </div>

  <!-- Header -->
  <div class="header">
    <div>
      <h1 class="company-name">FASHION JEWELLERS</h1>
      <div class="report-title">SALES REPORT & BUSINESS ANALYTICS</div>
      <div style="font-size: 13px; font-weight: 600; color: #4b5563; margin-top: 4px;">${periodInfo.periodLabel}</div>
    </div>
    <div class="meta-details">
      <div><strong>Date Range:</strong> ${periodInfo.startDate} to ${periodInfo.endDate}</div>
      <div><strong>Generated:</strong> ${new Date(periodInfo.generatedAt).toLocaleString()}</div>
      <div><strong>Portal:</strong> Authorized Management Report</div>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="section-title">Sales Overview</div>
  <div class="grid-4">
    <div class="kpi-card">
      <div class="label">Total Revenue (Delivered)</div>
      <div class="value">${formatPKR(summary.totalRevenue)}</div>
      <div class="sub">${summary.comparison.revenueGrowthPct >= 0 ? '+' : ''}${summary.comparison.revenueGrowthPct}% vs prior period</div>
    </div>
    <div class="kpi-card">
      <div class="label">Completed Orders</div>
      <div class="value">${summary.completedOrders}</div>
      <div class="sub">${summary.comparison.ordersGrowthPct >= 0 ? '+' : ''}${summary.comparison.ordersGrowthPct}% vs prior period</div>
    </div>
    <div class="kpi-card">
      <div class="label">Total Products Sold</div>
      <div class="value">${summary.totalProductsSold} Units</div>
      <div class="sub">Across completed orders</div>
    </div>
    <div class="kpi-card">
      <div class="label">Average Order Value</div>
      <div class="value">${formatPKR(summary.avgOrderValue)}</div>
      <div class="sub">Per completed sale</div>
    </div>
  </div>

  <div class="grid-4">
    <div class="kpi-card">
      <div class="label">Pending Orders</div>
      <div class="value">${summary.pendingOrders}</div>
    </div>
    <div class="kpi-card">
      <div class="label">Shipped Orders</div>
      <div class="value">${summary.shippedOrders}</div>
    </div>
    <div class="kpi-card">
      <div class="label">Cancelled Orders</div>
      <div class="value">${summary.cancelledOrders}</div>
    </div>
    <div class="kpi-card">
      <div class="label">Net Sales Revenue</div>
      <div class="value">${formatPKR(summary.netSales)}</div>
    </div>
  </div>

  <!-- Business Insights -->
  <div class="section-title">Key Performance Insights</div>
  <table>
    <tbody>
      <tr>
        <td style="width: 30%; font-weight: 600;">Best Performing Period / Date</td>
        <td>${insights.bestPerformingPeriod ? `${insights.bestPerformingPeriod.label} (${formatPKR(insights.bestPerformingPeriod.revenue)})` : 'No completed sales in period'}</td>
      </tr>
      <tr>
        <td style="font-weight: 600;">Top Revenue Generating Product</td>
        <td>${insights.topRevenueProduct ? `${insights.topRevenueProduct.name} (${formatPKR(insights.topRevenueProduct.revenue)})` : 'None'}</td>
      </tr>
      <tr>
        <td style="font-weight: 600;">Top Volume Selling Product</td>
        <td>${insights.topQuantityProduct ? `${insights.topQuantityProduct.name} (${insights.topQuantityProduct.quantity} units)` : 'None'}</td>
      </tr>
      <tr>
        <td style="font-weight: 600;">Average Daily Sales</td>
        <td>${formatPKR(insights.averageDailySales)} / day</td>
      </tr>
      <tr>
        <td style="font-weight: 600;">Profit & COGS Tracking</td>
        <td style="color: #6b7280; font-style: italic;">Cost price fields not configured in product schema — profit margins not fabricated.</td>
      </tr>
    </tbody>
  </table>

  <!-- Product Performance Table -->
  <div class="section-title">Product Sales Performance</div>
  <table>
    <thead>
      <tr>
        <th style="width: 50px;">Rank</th>
        <th>Product ID</th>
        <th>Product Name</th>
        <th class="text-right">Unit Price</th>
        <th class="text-right">Qty Sold</th>
        <th class="text-right">Total Revenue</th>
        <th class="text-right">Revenue Share</th>
      </tr>
    </thead>
    <tbody>
      ${productPerformance.allProducts.length === 0 ? '<tr><td colspan="7" class="text-center" style="padding: 20px; color: #6b7280;">No product sales recorded in this period.</td></tr>' : ''}
      ${productPerformance.allProducts.map(p => `
        <tr>
          <td class="text-center font-bold">${p.rank}</td>
          <td><strong>${p.productId}</strong></td>
          <td>${p.productName}</td>
          <td class="text-right">${formatPKR(p.basePrice)}</td>
          <td class="text-right"><strong>${p.quantitySold}</strong></td>
          <td class="text-right font-bold">${formatPKR(p.totalRevenue)}</td>
          <td class="text-right">${p.revenueContributionPct}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- Payment Analysis -->
  <div class="section-title">Payment & Settlement Breakdown</div>
  <div class="grid-4" style="margin-bottom: 12px;">
    <div class="kpi-card">
      <div class="label">Total Collected (Cash/Bank)</div>
      <div class="value" style="color: #059669;">${formatPKR(paymentAnalysis.totalPaidAmount)}</div>
    </div>
    <div class="kpi-card">
      <div class="label">Pending Payments (COD/Unpaid)</div>
      <div class="value" style="color: #d97706;">${formatPKR(paymentAnalysis.totalPendingAmount)}</div>
    </div>
    <div class="kpi-card">
      <div class="label">Failed Payments</div>
      <div class="value" style="color: #dc2626;">${formatPKR(paymentAnalysis.totalFailedAmount)}</div>
    </div>
    <div class="kpi-card">
      <div class="label">Collection Rate</div>
      <div class="value">${paymentAnalysis.totalCollectedPercentage}%</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Payment Method</th>
        <th class="text-center">Transactions</th>
        <th class="text-right">Collected Amount</th>
        <th class="text-right">Pending Amount</th>
        <th class="text-right">Total Transacted</th>
      </tr>
    </thead>
    <tbody>
      ${paymentAnalysis.methods.length === 0 ? '<tr><td colspan="5" class="text-center" style="padding: 16px; color: #6b7280;">No payment transactions recorded in this period.</td></tr>' : ''}
      ${paymentAnalysis.methods.map(m => `
        <tr>
          <td><strong>${m.paymentMethod}</strong></td>
          <td class="text-center">${m.transactionCount}</td>
          <td class="text-right" style="color: #059669;">${formatPKR(m.collectedAmount)}</td>
          <td class="text-right" style="color: #d97706;">${formatPKR(m.pendingAmount)}</td>
          <td class="text-right font-bold">${formatPKR(m.totalAmount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Order Transaction History -->
  <div class="section-title">Order Transactions Sample (Up to 10 Records)</div>
  <table>
    <thead>
      <tr>
        <th>Order #</th>
        <th>Date</th>
        <th>Customer</th>
        <th>Products Purchased</th>
        <th>Payment</th>
        <th class="text-center">Order Status</th>
        <th class="text-right">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      ${recentOrders.orders.length === 0 ? '<tr><td colspan="7" class="text-center" style="padding: 20px; color: #6b7280;">No orders found in this reporting period.</td></tr>' : ''}
      ${recentOrders.orders.map(o => `
        <tr>
          <td><strong>${o.orderNumber || o.orderId}</strong></td>
          <td>${new Date(o.orderDate).toLocaleDateString()}</td>
          <td>${o.customerName}</td>
          <td style="font-size: 11px; max-width: 220px;">${o.itemsSummary}</td>
          <td>${o.paymentMethod} <br><span class="badge ${o.paymentStatus === 'Completed' ? 'badge-success' : 'badge-warning'}">${o.paymentStatus}</span></td>
          <td class="text-center">
            <span class="badge ${o.orderStatus === 'Delivered' ? 'badge-success' : o.orderStatus === 'Cancelled' ? 'badge-danger' : 'badge-info'}">
              ${o.orderStatus}
            </span>
          </td>
          <td class="text-right font-bold">${formatPKR(o.totalAmount)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <div>FASHION JEWELLERS &bull; Confidential Business Analytics Document</div>
    <div>Report Generated on ${new Date().toLocaleDateString()} &bull; Page 1 of 2</div>
  </div>

</body>
</html>`;
  }
};

module.exports = { SalesReportService, parseDateRange };
