/**
 * supplierService.js — Supplier management.
 */

const pool = require('../db/pool');
const { getNextId } = require('../utils/idGenerator');
const AppError = require('../utils/AppError');

const SupplierService = {
  async getAdminSuppliers() {
    const { rows } = await pool.query(
      'SELECT supplier_id AS id, supplier_name AS name, supplier_type AS type, email, phone_number AS phone, (is_active = 1) AS "isActive" FROM supplier ORDER BY supplier_name ASC'
    );
    return rows;
  },

  async createSupplier(data) {
    const { name, email, phone, type } = data;
    if (!name || !email) throw new AppError('Name and email are required', 400);

    const { rows: existing } = await pool.query('SELECT supplier_id FROM supplier WHERE email = $1', [email]);
    if (existing.length > 0) throw new AppError('Email already in use', 409);

    const supplierId = await getNextId(pool, 'supplier', 'supplier_id', 'SUP');

    await pool.query(
      'INSERT INTO supplier (supplier_id, supplier_name, supplier_type, email, phone_number, is_active) VALUES ($1, $2, $3, $4, $5, 1)',
      [supplierId, name, type || 'Supplier', email, phone || null]
    );
    return { id: supplierId, name, email, type, phone };
  },

  async updateSupplier(supplierId, data) {
    const { name, email, phone, type, isActive } = data;
    if (!name || !email) throw new AppError('Name and email are required', 400);

    const { rows: existing } = await pool.query('SELECT supplier_id FROM supplier WHERE email = $1 AND supplier_id <> $2', [email, supplierId]);
    if (existing.length > 0) throw new AppError('Email already in use', 409);

    const statusVal = (isActive === true || isActive === 1) ? 1 : 0;

    const result = await pool.query(
      'UPDATE supplier SET supplier_name = $1, supplier_type = $2, email = $3, phone_number = $4, is_active = $5 WHERE supplier_id = $6',
      [name, type || 'Supplier', email, phone || null, statusVal, supplierId]
    );

    if (result.rowCount === 0) throw new AppError('Supplier not found', 404);

    return { id: supplierId, name, email, type, phone, isActive };
  },

  async deleteSupplier(supplierId) {
    const result = await pool.query('UPDATE supplier SET is_active = 0 WHERE supplier_id = $1', [supplierId]);
    if (result.rowCount === 0) throw new AppError('Supplier not found', 404);
  },

  async updateStatus(supplierId, isActive) {
    const result = await pool.query('UPDATE supplier SET is_active = $1 WHERE supplier_id = $2', [isActive ? 1 : 0, supplierId]);
    if (result.rowCount === 0) throw new AppError('Supplier not found', 404);
  },

  async updateProductStock(supplierId, productId, newQuantity) {
    if (newQuantity < 0) throw new AppError('Quantity cannot be negative', 400);

    const result = await pool.query(
      'UPDATE product SET quantity = $1, last_stock_update = CURRENT_TIMESTAMP WHERE product_id = $2 AND supplier_id = $3',
      [newQuantity, productId, supplierId]
    );

    if (result.rowCount === 0) throw new AppError('Product not found or not assigned to this supplier', 404);
  }
};

module.exports = { SupplierService };
