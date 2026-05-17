/**
 * customerService.js — Customer profile, registration, password, admin management.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { getNextId } = require('../utils/idGenerator');
const AppError = require('../utils/AppError');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const CustomerService = {
  async register(data) {
    const { email, password, fullName, phone, country, address } = data;

    const { rows: existing } = await pool.query('SELECT customer_id FROM customer WHERE email = $1', [email]);
    if (existing.length > 0) throw new AppError('Email already in use', 409);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const customerId = await getNextId(pool, 'customer', 'customer_id', 'C');

    await pool.query(
      'INSERT INTO customer (customer_id, full_name, email, country, phone_number, address, password_hash, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, 1)',
      [customerId, fullName, email, country || 'Unknown', phone, address || '', passwordHash]
    );

    const user = { id: customerId, role: 'customer', name: fullName };
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { token, user };
  },

  async getProfile(customerId) {
    const { rows } = await pool.query(
      `SELECT customer_id AS id, full_name AS name, email, country, phone_number AS phone, address,
              (is_active = 1) AS "isActive", created_at AS "createdAt",
              (SELECT COUNT(*) FROM orders WHERE customer_id = customer.customer_id) AS "orderCount",
              (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = customer.customer_id AND order_status NOT IN ('Cancelled', 'Payment Failed')) AS "totalSpent"
       FROM customer WHERE customer_id = $1`,
      [customerId]
    );
    if (rows.length === 0) throw new AppError('Customer not found', 404);
    return rows[0];
  },

  async updateProfile(customerId, updates) {
    const { fullName, phone, address, country } = updates;

    if (phone !== undefined) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) throw new AppError('Phone number must contain 10-15 digits', 400);
    }

    const fields = [];
    const values = [];
    let idx = 1;

    if (fullName !== undefined) { fields.push(`full_name = $${idx++}`); values.push(fullName); }
    if (phone !== undefined) { fields.push(`phone_number = $${idx++}`); values.push(phone); }
    if (address !== undefined) { fields.push(`address = $${idx++}`); values.push(address); }
    if (country !== undefined) { fields.push(`country = $${idx++}`); values.push(country); }

    if (fields.length === 0) return this.getProfile(customerId);

    values.push(customerId);
    await pool.query(`UPDATE customer SET ${fields.join(', ')} WHERE customer_id = $${idx}`, values);
    return this.getProfile(customerId);
  },

  async changePassword(customerId, currentPassword, newPassword) {
    const { rows } = await pool.query('SELECT password_hash FROM customer WHERE customer_id = $1', [customerId]);
    if (rows.length === 0) throw new AppError('Customer not found', 404);

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) throw new AppError('Current password is incorrect', 401);

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query('UPDATE customer SET password_hash = $1 WHERE customer_id = $2', [newHash, customerId]);
  },

  async deactivate(customerId) {
    const { rows } = await pool.query('SELECT customer_id FROM customer WHERE customer_id = $1', [customerId]);
    if (rows.length === 0) throw new AppError('Customer not found', 404);
    await pool.query('UPDATE customer SET is_active = 0 WHERE customer_id = $1', [customerId]);
  },

  async getAdminCustomers({ page = 1, pageSize = 25, search = '' } = {}) {
    const size = Math.min(Math.max(1, Number(pageSize) || 25), 100);
    const currentPage = Math.max(1, Number(page) || 1);
    const offset = (currentPage - 1) * size;

    let whereClause = '';
    const params = [];
    let idx = 1;

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      whereClause = `WHERE full_name ILIKE $${idx++} OR email ILIKE $${idx++}`;
      params.push(term, term);
    }

    const countResult = await pool.query(`SELECT COUNT(*) AS total FROM customer ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / size);

    const { rows } = await pool.query(
      `SELECT customer_id AS id, full_name AS name, email, phone_number AS phone, (is_active = 1) AS "isActive", created_at AS "createdAt",
              (SELECT COUNT(*) FROM orders WHERE customer_id = customer.customer_id) AS "orderCount",
              (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = customer.customer_id AND order_status NOT IN ('Cancelled', 'Payment Failed')) AS "totalSpent"
       FROM customer ${whereClause} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, size, offset]
    );

    return { customers: rows, total, page: currentPage, pageSize: size, totalPages };
  },

  async updateStatus(customerId, isActive) {
    const { rows } = await pool.query('SELECT customer_id FROM customer WHERE customer_id = $1', [customerId]);
    if (rows.length === 0) throw new AppError('Customer not found', 404);
    await pool.query('UPDATE customer SET is_active = $1 WHERE customer_id = $2', [isActive ? 1 : 0, customerId]);
    return this.getProfile(customerId);
  },
};

module.exports = { CustomerService };
