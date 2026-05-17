/**
 * authService.js — Login, logout, register, changePassword.
 */

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { getNextId } = require('../utils/idGenerator');
const AppError = require('../utils/AppError');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 12;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

async function findUserByEmail(email) {
  // Customer
  const c = await pool.query('SELECT customer_id AS id, full_name AS name, password_hash AS "passwordHash", is_active AS "isActive" FROM customer WHERE email = $1', [email]);
  if (c.rows.length > 0) return { ...c.rows[0], role: 'customer' };

  // Admin — from env vars (no DB table needed)
  if (email === process.env.ADMIN_EMAIL) {
    return {
      id: 'ADM001',
      name: process.env.ADMIN_NAME || 'System Admin',
      passwordHash: process.env.ADMIN_PASSWORD_HASH,
      isActive: 1,
      role: 'admin',
    };
  }

  // Employee
  const e = await pool.query(
    'SELECT e.employee_id AS id, e.emp_name AS name, e.password AS "passwordHash", e.is_active AS "isActive" FROM employee e WHERE e.email = $1',
    [email]
  );
  if (e.rows.length > 0) return { ...e.rows[0], role: 'employee' };

  return null;
}

const AuthService = {
  async login(email, password) {
    const user = await findUserByEmail(email);
    if (!user) throw new AppError('Invalid email or password', 401);
    if (!user.isActive) throw new AppError('Account is inactive', 401);

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new AppError('Invalid email or password', 401);

    const token = jwt.sign({ sub: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { token, user: { id: user.id, role: user.role, name: user.name } };
  },

  async logout() {
    // No-op: token blacklisting removed. Tokens expire naturally.
  },

  async register(data) {
    const { email, password, fullName, phone, country, address } = data;

    const { rows: existing } = await pool.query('SELECT customer_id FROM customer WHERE email = $1', [email]);
    if (existing.length > 0) throw new AppError('Email already in use', 409);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const { rows } = await pool.query(
      'INSERT INTO customer (full_name, email, country, phone_number, address, password_hash, is_active) VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING customer_id',
      [fullName, email, country || 'Unknown', phone, address || '', passwordHash]
    );
    const customerId = rows[0].customer_id;

    const user = { id: customerId, role: 'customer', name: fullName };
    const token = jwt.sign({ sub: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { token, user };
  },

  async changePassword(userId, currentPassword, newPassword) {
    const { rows } = await pool.query('SELECT password_hash FROM customer WHERE customer_id = $1', [userId]);
    if (rows.length === 0) throw new AppError('User not found', 404);

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) throw new AppError('Current password is incorrect', 401);

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query('UPDATE customer SET password_hash = $1 WHERE customer_id = $2', [newHash, userId]);
  },
};

module.exports = { AuthService };
