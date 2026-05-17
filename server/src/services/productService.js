/**
 * productService.js — Product CRUD, featured, new arrivals, categories, materials.
 */

const pool = require('../db/pool');
const { getNextId } = require('../utils/idGenerator');
const AppError = require('../utils/AppError');

const PRODUCT_SELECT = `
  SELECT
    p.product_id        AS id,
    p.product_name      AS name,
    p.description,
    p.base_price        AS price,
    p.quantity,
    p.last_stock_update AS "lastStockUpdate",
    p.origin,
    p.weight,
    p.image_url         AS "imageUrl",
    p.category_id       AS "categoryId",
    c.category_name     AS "categoryName",
    p.material_id       AS "materialId",
    m.material          AS "materialName",
    p.type_id           AS "typeId",
    t.type_name         AS "typeName",
    p.supplier_id       AS "supplierId",
    s.supplier_name     AS "supplierName",
    (p.is_active = 1)   AS "isActive",
    p.created_at        AS "createdAt",
    (SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0.0) FROM review r WHERE r.product_id = p.product_id) AS "avgRating",
    (SELECT COUNT(*) FROM review r WHERE r.product_id = p.product_id) AS "reviewCount"
  FROM product p
  JOIN category c ON p.category_id = c.category_id
  JOIN material m ON p.material_id = m.material_id
  JOIN type     t ON p.type_id     = t.type_id
  JOIN supplier s ON p.supplier_id = s.supplier_id
`;

const ProductService = {
  async create(data) {
    const { name, description = null, price, quantity = 0, origin = null, weight = null, categoryId, materialId, typeId, supplierId } = data;

    if (!name || typeof name !== 'string' || name.trim().length === 0) throw new AppError('Product name is required', 400);
    if (price === undefined || price === null || Number(price) <= 0) throw new AppError('Price must be greater than 0', 400);
    if (!categoryId) throw new AppError('Category ID is required', 400);
    if (!materialId) throw new AppError('Material ID is required', 400);
    if (!typeId) throw new AppError('Type ID is required', 400);
    if (!supplierId) throw new AppError('Supplier ID is required', 400);

    const imageFilename = name.trim().toLowerCase().replace(/ /g, '_') + '.png';
    const imageUrl = `/uploads/${imageFilename}`;

    const { rows } = await pool.query(
      'INSERT INTO product (product_name, description, base_price, quantity, is_active, origin, weight, image_url, category_id, material_id, type_id, supplier_id) VALUES ($1, $2, $3, $4, 1, $5, $6, $7, $8, $9, $10, $11) RETURNING product_id',
      [name.trim(), description, Number(price), Number(quantity), origin, weight, imageUrl, categoryId, materialId, typeId, supplierId]
    );
    const productId = rows[0].product_id;

    return this.getById(productId);
  },

  async getById(productId) {
    const { rows } = await pool.query(`${PRODUCT_SELECT} WHERE p.product_id = $1`, [productId]);
    if (rows.length === 0) throw new AppError(`Product '${productId}' not found`, 404);
    return rows[0];
  },

  async list({ page = 1, pageSize = 12, categoryId, category, materialId, isActive, search, minPrice, maxPrice } = {}) {
    const size = Math.min(Math.max(1, Number(pageSize) || 12), 100);
    const currentPage = Math.max(1, Number(page) || 1);
    const offset = (currentPage - 1) * size;

    const conditions = [];
    const params = [];
    let idx = 1;

    if (categoryId) { conditions.push(`p.category_id = $${idx++}`); params.push(categoryId); }
    else if (category) {
      let catVal = category.trim();
      const lower = catVal.toLowerCase();
      if (lower === 'bracelet' || lower === 'bracelets') {
        catVal = 'Bracelets';
      }
      conditions.push(`c.category_name ILIKE $${idx++}`);
      params.push(catVal);
    }
    if (materialId) { conditions.push(`p.material_id = $${idx++}`); params.push(materialId); }
    if (isActive !== undefined && isActive !== null && isActive !== '') {
      conditions.push(`p.is_active = $${idx++}`); params.push(isActive ? 1 : 0);
    }
    if (search && search.trim().length > 0) {
      const words = search.trim().split(/\s+/);
      const wordConds = words.map(word => {
        const term = `%${word}%`;
        const c = `(p.product_name ILIKE $${idx++} OR p.description ILIKE $${idx++} OR m.material ILIKE $${idx++})`;
        params.push(term, term, term);
        return c;
      });
      conditions.push(`(${wordConds.join(' AND ')})`);
    }
    if (minPrice !== undefined && minPrice !== null && minPrice !== '') { conditions.push(`p.base_price >= $${idx++}`); params.push(Number(minPrice)); }
    if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') { conditions.push(`p.base_price <= $${idx++}`); params.push(Number(maxPrice)); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM product p JOIN category c ON p.category_id = c.category_id JOIN material m ON p.material_id = m.material_id JOIN type t ON p.type_id = t.type_id ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / size);

    const dataParams = [...params, size, offset];
    const { rows } = await pool.query(
      `${PRODUCT_SELECT} ${whereClause} ORDER BY p.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      dataParams
    );

    return { products: rows, total, page: currentPage, pageSize: size, totalPages };
  },

  async partialUpdate(productId, updates) {
    await this.getById(productId);

    const FIELD_MAP = {
      name: 'product_name', description: 'description', price: 'base_price',
      origin: 'origin', weight: 'weight', categoryId: 'category_id',
      materialId: 'material_id', typeId: 'type_id', quantity: 'quantity',
      isActive: 'is_active', imageUrl: 'image_url', supplierId: 'supplier_id'
    };

    const setClauses = [];
    const params = [];
    let idx = 1;

    for (const [key, column] of Object.entries(FIELD_MAP)) {
      if (!(key in updates)) continue;
      let value = updates[key];

      if (key === 'name') {
        if (!value || typeof value !== 'string' || value.trim().length === 0) throw new AppError('Product name cannot be empty', 400);
        value = value.trim();
        if (!('imageUrl' in updates)) {
          const imageFilename = value.trim().toLowerCase().replace(/ /g, '_') + '.png';
          setClauses.push(`image_url = $${idx++}`);
          params.push(`/uploads/${imageFilename}`);
        }
      }
      if (key === 'price' && Number(value) <= 0) throw new AppError('Price must be greater than 0', 400);
      if (key === 'quantity' && Number(value) < 0) throw new AppError('Quantity must be 0 or greater', 400);
      if (key === 'isActive') value = value ? 1 : 0;
      if (key === 'price' || key === 'quantity') value = Number(value);

      setClauses.push(`${column} = $${idx++}`);
      params.push(value);
    }

    if (setClauses.length === 0) throw new AppError('No valid fields provided for update', 400);

    // Update last_stock_update if quantity changed
    if ('quantity' in updates) {
      setClauses.push(`last_stock_update = CURRENT_TIMESTAMP`);
    }

    params.push(productId);
    await pool.query(`UPDATE product SET ${setClauses.join(', ')} WHERE product_id = $${idx}`, params);
    return this.getById(productId);
  },

  async softDelete(productId) {
    await this.getById(productId);
    await pool.query('UPDATE product SET is_active = 0 WHERE product_id = $1', [productId]);
    return this.getById(productId);
  },

  async getFeatured() {
    const categories = ['Sets', 'Bracelets', 'Earrings', 'Rings'];
    const products = [];

    for (const catName of categories) {
      const { rows } = await pool.query(
        `${PRODUCT_SELECT} WHERE p.is_active = 1 AND c.category_name = $1 ORDER BY p.created_at ASC LIMIT 1`,
        [catName]
      );
      if (rows.length > 0) {
        products.push(rows[0]);
      }
    }
    return products;
  },

  async getNewArrivals() {
    const { rows } = await pool.query(`${PRODUCT_SELECT} WHERE p.is_active = 1 AND p.created_at >= NOW() - INTERVAL '30 days' ORDER BY p.created_at DESC LIMIT 8`);
    return rows;
  },

  async getCategories() {
    const { rows } = await pool.query('SELECT category_id AS id, category_name AS name FROM category ORDER BY category_name ASC');
    return rows;
  },

  async getMaterials() {
    const { rows } = await pool.query('SELECT material_id AS id, material AS name FROM material ORDER BY material ASC');
    return rows;
  },
};

module.exports = { ProductService };
