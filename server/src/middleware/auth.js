/**
 * auth.js — Authentication middleware.
 * Verifies JWT and attaches req.user. Checks is_active for customers.
 */

const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET;

function extractToken(req) {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (header && header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.query && req.query.token) return req.query.token;
  return null;
}

async function authMiddleware(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });
  }

  // Check is_active for customer role
  if (decoded.role === 'customer') {
    try {
      const { rows } = await pool.query('SELECT is_active FROM customer WHERE customer_id = $1', [decoded.sub]);
      if (rows.length === 0 || !rows[0].is_active) {
        return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });
      }
    } catch {
      return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });
    }
  }

  req.user = { id: decoded.sub, role: decoded.role };
  next();
}

function roleMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, data: null, message: 'Forbidden' });
    }
    next();
  };
}

module.exports = { authMiddleware, roleMiddleware };
