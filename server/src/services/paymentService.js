/**
 * paymentService.js — Payment status updates, admin listing.
 */

const pool = require('../db/pool');
const AppError = require('../utils/AppError');

const PaymentService = {
  async updateStatus(paymentId, status) {
    const validStatuses = ['Pending', 'Completed', 'Failed'];
    if (!validStatuses.includes(status)) throw new AppError('Invalid payment status', 400);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: paymentRows } = await client.query('SELECT payment_status, order_id FROM payment WHERE payment_id = $1 FOR UPDATE', [paymentId]);
      if (paymentRows.length === 0) throw new AppError('Payment not found', 404);

      const payment = paymentRows[0];
      if (payment.payment_status === status) {
        await client.query('COMMIT');
        return this.getPaymentById(paymentId);
      }

      await client.query('UPDATE payment SET payment_status = $1 WHERE payment_id = $2', [status, paymentId]);

      let newOrderStatus = null;
      if (status === 'Completed') newOrderStatus = 'Processing';
      else if (status === 'Failed') newOrderStatus = 'Payment Failed';

      if (newOrderStatus) {
        const result = await client.query("UPDATE orders SET order_status = $1, status_updated_at = NOW() WHERE order_id = $2 AND order_status = 'Pending'", [newOrderStatus, payment.order_id]);
        if (result.rowCount === 0 && status === 'Completed') {
          const { rows: check } = await client.query('SELECT order_status FROM orders WHERE order_id = $1', [payment.order_id]);
          if (check.length > 0 && check[0].order_status !== newOrderStatus) throw new AppError('Failed to update Order status due to conflict', 500);
        }
      }

      await client.query('COMMIT');
      return this.getPaymentById(paymentId);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getAdminPayments({ page = 1, pageSize = 20, search = '', status = '', method = '' } = {}) {
    const size = Math.min(Math.max(1, Number(pageSize) || 20), 100);
    const currentPage = Math.max(1, Number(page) || 1);
    const offset = (currentPage - 1) * size;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) { conditions.push(`p.payment_status = $${idx++}`); params.push(status); }
    if (method) { conditions.push(`p.method_id = $${idx++}`); params.push(method); }
    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      conditions.push(`(o.order_number ILIKE $${idx++} OR c.full_name ILIKE $${idx++})`);
      params.push(term, term);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) AS total FROM payment p JOIN orders o ON p.order_id = o.order_id JOIN customer c ON o.customer_id = c.customer_id ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);

    const { rows } = await pool.query(
      `SELECT p.payment_id AS id, p.payment_date AS "paymentDate", p.amount_paid AS "amountPaid", p.currency_code AS "currencyCode", p.payment_status AS status, o.order_number AS "orderNumber", c.full_name AS "customerName", m.payment_type AS "paymentType"
       FROM payment p JOIN orders o ON p.order_id = o.order_id JOIN customer c ON o.customer_id = c.customer_id JOIN payment_method m ON p.method_id = m.method_id
       ${whereClause} ORDER BY p.payment_date DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, size, offset]
    );

    return { payments: rows, total, page: currentPage, pageSize: size, totalPages: Math.ceil(total / size) };
  },

  async getPaymentById(paymentId) {
    const { rows } = await pool.query(
      `SELECT p.payment_id AS id, p.payment_date AS "paymentDate", p.amount_paid AS "amountPaid", p.currency_code AS "currencyCode", p.payment_status AS status, o.order_number AS "orderNumber", c.full_name AS "customerName", m.payment_type AS "paymentType"
       FROM payment p JOIN orders o ON p.order_id = o.order_id JOIN customer c ON o.customer_id = c.customer_id JOIN payment_method m ON p.method_id = m.method_id
       WHERE p.payment_id = $1`, [paymentId]
    );
    if (rows.length === 0) throw new AppError('Payment not found', 404);
    return rows[0];
  }
};

module.exports = { PaymentService };
