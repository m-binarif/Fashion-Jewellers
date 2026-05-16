/**
 * supplierService.js — Supplier management, materials, stock updates.
 */

const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { getNextId } = require('../utils/idGenerator');
const AppError = require('../utils/AppError');

const SupplierService = {
  async getAdminSuppliers() {
    const { rows } = await pool.query(
      'SELECT supplier_id AS id, supplier_name AS name, supplier_type AS type, email, phone_number AS phone, is_active AS "isActive", created_at AS "createdAt" FROM supplier ORDER BY created_at DESC'
    );
    return rows;
  },

  async createSupplier(data) {
    const { name, email, phone, type, password } = data;
    if (!name || !email || !password) throw new AppError('Name, email, and password are required', 400);

    const { rows: existing } = await pool.query('SELECT supplier_id FROM supplier WHERE email = $1', [email]);
    if (existing.length > 0) throw new AppError('Email already in use', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const supplierId = await getNextId(pool, 'supplier', 'supplier_id', 'SUP');

    await pool.query(
      'INSERT INTO supplier (supplier_id, supplier_name, supplier_type, email, phone_number, password_hash, is_active) VALUES ($1, $2, $3, $4, $5, $6, 1)',
      [supplierId, name, type || 'Supplier', email, phone || null, passwordHash]
    );
    return { id: supplierId, name, email, type, phone };
  },

  async deleteSupplier(supplierId) {
    const result = await pool.query('UPDATE supplier SET is_active = 0 WHERE supplier_id = $1', [supplierId]);
    if (result.rowCount === 0) throw new AppError('Supplier not found', 404);
  },

  async updateStatus(supplierId, isActive) {
    const result = await pool.query('UPDATE supplier SET is_active = $1 WHERE supplier_id = $2', [isActive ? 1 : 0, supplierId]);
    if (result.rowCount === 0) throw new AppError('Supplier not found', 404);
  },

  async getMaterials(supplierId) {
    const { rows } = await pool.query(
      `SELECT sm.sm_id AS id, sm.material_id AS "materialId", m.material AS name, sm.quantity, sm.unit_of_measure AS "unitOfMeasure",
              STRING_AGG(p.product_name, ', ') AS "linkedProducts"
       FROM supplier_materials sm JOIN material m ON sm.material_id = m.material_id
       LEFT JOIN product p ON sm.material_id = p.material_id AND p.is_active = 1
       WHERE sm.supplier_id = $1
       GROUP BY sm.sm_id, sm.material_id, m.material, sm.quantity, sm.unit_of_measure`,
      [supplierId]
    );
    return rows.map(row => ({ ...row, quantity: Number(row.quantity), linkedProducts: row.linkedProducts ? row.linkedProducts.split(', ') : [] }));
  },

  async addMaterial(supplierId, data) {
    const { materialId, quantity, unitOfMeasure } = data;
    if (!materialId || !quantity || !unitOfMeasure) throw new AppError('materialId, quantity, and unitOfMeasure are required', 400);
    if (Number(quantity) <= 0) throw new AppError('Quantity must be greater than 0', 400);

    const { rows: existing } = await pool.query('SELECT sm_id FROM supplier_materials WHERE supplier_id = $1 AND material_id = $2', [supplierId, materialId]);
    if (existing.length > 0) throw new AppError('Material already added for this supplier', 409);

    const smId = await getNextId(pool, 'supplier_materials', 'sm_id', 'SM');
    await pool.query('INSERT INTO supplier_materials (sm_id, supplier_id, material_id, quantity, unit_of_measure) VALUES ($1, $2, $3, $4, $5)', [smId, supplierId, materialId, Number(quantity), unitOfMeasure]);
    return { id: smId, materialId, quantity: Number(quantity), unitOfMeasure };
  },

  async updateMaterialQuantity(supplierId, smId, quantity) {
    if (Number(quantity) <= 0) throw new AppError('Quantity must be greater than 0', 400);
    const result = await pool.query('UPDATE supplier_materials SET quantity = $1 WHERE sm_id = $2 AND supplier_id = $3', [Number(quantity), smId, supplierId]);
    if (result.rowCount === 0) throw new AppError('Supplier material not found', 404);
  },

  async deleteMaterial(supplierId, smId) {
    const { rows: smRows } = await pool.query('SELECT material_id FROM supplier_materials WHERE sm_id = $1 AND supplier_id = $2', [smId, supplierId]);
    if (smRows.length === 0) throw new AppError('Supplier material not found', 404);

    const { rows: products } = await pool.query('SELECT product_name FROM product WHERE material_id = $1 AND is_active = 1', [smRows[0].material_id]);
    if (products.length > 0) throw new AppError(`Cannot delete material. Used in: ${products.map(p => p.product_name).join(', ')}`, 409);

    await pool.query('DELETE FROM supplier_materials WHERE sm_id = $1 AND supplier_id = $2', [smId, supplierId]);
  },

  async updateProductStock(supplierId, productId, newQuantity) {
    if (newQuantity < 0) throw new AppError('Quantity cannot be negative', 400);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query('SELECT product_id FROM product WHERE product_id = $1', [productId]);
      if (rows.length === 0) throw new AppError('Product not found', 404);

      await client.query('UPDATE inventory SET product_quantity = $1, last_stock_update = CURRENT_DATE WHERE product_id = $2', [newQuantity, productId]);
      await client.query('UPDATE product SET stock_quantity = $1 WHERE product_id = $2', [newQuantity, productId]);
      await client.query('INSERT INTO supplier_stock_logs (supplier_id, product_id, new_quantity) VALUES ($1, $2, $3)', [supplierId, productId, newQuantity]);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
};

module.exports = { SupplierService };
