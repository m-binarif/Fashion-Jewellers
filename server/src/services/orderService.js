/**
 * orderService.js — Checkout, order listing, status updates.
 */

const pool = require('../db/pool');
const { getNextId } = require('../utils/idGenerator');
const { CartService } = require('./cartService');
const AppError = require('../utils/AppError');

const OrderService = {
  async checkout(customerId, shippingInfo, paymentMethodId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cart = await CartService.getCart(customerId);
      if (cart.items.length === 0) throw new AppError('Cart is empty', 400);

      // Verify payment method
      const { rows: methodRows } = await client.query('SELECT method_id FROM payment_method WHERE method_id = $1', [paymentMethodId]);
      if (methodRows.length === 0) throw new AppError('Invalid payment method', 400);

      // Generate order number
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const { rows: lastOrder } = await client.query(
        'SELECT order_number FROM orders WHERE order_number LIKE $1 ORDER BY order_number DESC LIMIT 1',
        [`ORD-${dateStr}-%`]
      );
      let seq = 1;
      if (lastOrder.length > 0) seq = parseInt(lastOrder[0].order_number.split('-')[2], 10) + 1;
      const orderNumber = `ORD-${dateStr}-${seq.toString().padStart(4, '0')}`;

      const { street, city, state, postalCode, country } = shippingInfo;
      if (!street || !city || !state || !postalCode || !country) throw new AppError('Incomplete shipping information', 400);

      const { rows: orderRows } = await client.query(
        `INSERT INTO orders (order_number, total_amount, order_status, customer_id, shipping_street, shipping_city, shipping_state, shipping_postal_code, shipping_country, order_date, status_updated_at)
         VALUES ($1, $2, 'Pending', $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING order_id`,
        [orderNumber, cart.subtotal, customerId, street, city, state, postalCode, country]
      );
      const orderId = orderRows[0].order_id;

      for (const item of cart.items) {
        const result = await client.query('UPDATE product SET quantity = quantity - $1 WHERE product_id = $2 AND quantity >= $1', [item.quantity, item.productId]);
        if (result.rowCount === 0) throw new AppError(`Insufficient stock for product ${item.name}`, 409);

        await client.query('INSERT INTO record_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)', [orderId, item.productId, item.quantity, item.unitPrice]);
      }

      await client.query('DELETE FROM holds WHERE cart_id = $1', [cart.cartId]);

      await client.query(
        'INSERT INTO payment (amount_paid, payment_status, order_id, method_id) VALUES ($1, $2, $3, $4)',
        [cart.subtotal, 'Pending', orderId, paymentMethodId]
      );

      await client.query('COMMIT');
      return { orderId, orderNumber, totalAmount: cart.subtotal, status: 'Pending' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getOrdersByCustomer(customerId) {
    const { rows } = await pool.query(
      `SELECT order_id AS id, order_number AS "orderNumber", order_date AS "orderDate",
              total_amount AS "totalAmount", order_status AS status,
              (SELECT COALESCE(SUM(quantity), 0) FROM record_items r WHERE r.order_id = orders.order_id) AS "itemCount"
       FROM orders WHERE customer_id = $1 ORDER BY order_date DESC LIMIT 100`,
      [customerId]
    );
    return rows;
  },

  async getOrderById(orderId, customerId = null) {
    let query = 'SELECT * FROM orders WHERE order_id = $1';
    const params = [orderId];
    if (customerId) { query += ' AND customer_id = $2'; params.push(customerId); }

    const { rows } = await pool.query(query, params);
    if (rows.length === 0) throw new AppError('Order not found', 404);
    const order = rows[0];

    const { rows: items } = await pool.query(
      `SELECT r.product_id AS "productId", p.product_name AS name, r.quantity, r.unit_price AS "unitPrice",
              COALESCE(NULLIF(p.image_url, ''), '/uploads/' || p.product_name || '.png') AS "imageUrl"
       FROM record_items r JOIN product p ON r.product_id = p.product_id WHERE r.order_id = $1`,
      [orderId]
    );

    return {
      id: order.order_id, orderNumber: order.order_number, orderDate: order.order_date,
      totalAmount: order.total_amount, status: order.order_status,
      shipping: { street: order.shipping_street, city: order.shipping_city, state: order.shipping_state, postalCode: order.shipping_postal_code, country: order.shipping_country },
      items
    };
  },

  async updateStatus(orderId, status) {
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Payment Failed'];
    if (!validStatuses.includes(status)) throw new AppError('Invalid order status', 400);

    const { rows } = await pool.query('SELECT order_status FROM orders WHERE order_id = $1', [orderId]);
    if (rows.length === 0) throw new AppError('Order not found', 404);
    if (['Delivered', 'Cancelled'].includes(rows[0].order_status)) throw new AppError(`Cannot change status of a ${rows[0].order_status.toLowerCase()} order`, 400);

    const result = await pool.query('UPDATE orders SET order_status = $1, status_updated_at = NOW() WHERE order_id = $2', [status, orderId]);
    if (result.rowCount === 0) throw new AppError('Order not found', 404);
    return this.getOrderById(orderId);
  },

  async getAdminOrders({ page = 1, pageSize = 20, search = '', status = '' } = {}) {
    const size = Math.min(Math.max(1, Number(pageSize) || 20), 100);
    const currentPage = Math.max(1, Number(page) || 1);
    const offset = (currentPage - 1) * size;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (status) { conditions.push(`o.order_status = $${idx++}`); params.push(status); }
    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      conditions.push(`(o.order_number ILIKE $${idx++} OR c.full_name ILIKE $${idx++})`);
      params.push(term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) AS total FROM orders o JOIN customer c ON o.customer_id = c.customer_id ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / size);

    const { rows } = await pool.query(
      `SELECT o.order_id AS id, o.order_number AS "orderNumber", o.order_date AS "orderDate",
              o.total_amount AS "totalAmount", o.order_status AS status, c.full_name AS "customerName",
              c.phone_number AS "customerPhone",
              o.shipping_street AS street, o.shipping_city AS city,
              o.shipping_state AS state, o.shipping_postal_code AS "postalCode",
              o.shipping_country AS country,
              (SELECT COALESCE(SUM(quantity), 0) FROM record_items r WHERE r.order_id = o.order_id) AS "itemCount"
       FROM orders o JOIN customer c ON o.customer_id = c.customer_id
       ${whereClause} ORDER BY o.order_date DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, size, offset]
    );

    return { orders: rows, total, page: currentPage, pageSize: size, totalPages };
  }
};

module.exports = { OrderService };
