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

  req.user = {
    id: decoded.sub,
    role: decoded.role,
    roleName: decoded.roleName || null,
    username: decoded.username || null,
    name: decoded.name || null,
  };
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

/**
 * employeeRoleMiddleware — Checks specific employee role names (e.g. 'Social Media Manager', 'Inventory Manager').
 * System Admin always has full access.
 */
function employeeRoleMiddleware(...allowedRoleNames) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, data: null, message: 'Unauthorized' });
    }
    // Admin is always authorized
    if (req.user.role === 'admin') return next();

    // Check specific employee role
    if (req.user.role === 'employee' && req.user.roleName && allowedRoleNames.includes(req.user.roleName)) {
      return next();
    }

    return res.status(403).json({
      success: false,
      data: null,
      message: 'Forbidden: You do not have permission to perform this action',
    });
  };
}

module.exports = { authMiddleware, roleMiddleware, employeeRoleMiddleware };
