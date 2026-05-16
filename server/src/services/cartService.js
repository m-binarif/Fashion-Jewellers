/**
 * cartService.js — Cart operations: get, add, update, remove, clear.
 */

const pool = require('../db/pool');
const { getNextId } = require('../utils/idGenerator');
const AppError = require('../utils/AppError');

const CartService = {
  async _getOrCreateCart(customerId) {
    const { rows } = await pool.query('SELECT cart_id FROM cart WHERE customer_id = $1', [customerId]);
    if (rows.length > 0) return rows[0].cart_id;

    const cartId = await getNextId(pool, 'cart', 'cart_id', 'CRT');
    await pool.query('INSERT INTO cart (cart_id, customer_id) VALUES ($1, $2)', [cartId, customerId]);
    return cartId;
  },

  async getCart(customerId) {
    const cartId = await this._getOrCreateCart(customerId);

    const { rows: items } = await pool.query(
      `SELECT h.product_id AS "productId", p.product_name AS name, p.base_price AS "unitPrice",
              h.quantity, (p.base_price * h.quantity) AS "lineTotal", p.stock_quantity AS "stockQuantity",
              COALESCE(NULLIF(p.image_url, ''), '/uploads/' || p.product_name || '.png') AS "imageUrl"
       FROM holds h JOIN product p ON h.product_id = p.product_id WHERE h.cart_id = $1`,
      [cartId]
    );

    const subtotal = items.reduce((sum, item) => sum + Number(item.lineTotal), 0);
    return {
      cartId,
      items: items.map(item => ({ ...item, unitPrice: Number(item.unitPrice), lineTotal: Number(item.lineTotal) })),
      subtotal
    };
  },

  async addItem(customerId, productId, quantity = 1) {
    if (quantity <= 0) throw new AppError('Quantity must be greater than 0', 400);

    const cartId = await this._getOrCreateCart(customerId);

    const { rows: productRows } = await pool.query('SELECT stock_quantity, is_active FROM product WHERE product_id = $1', [productId]);
    if (productRows.length === 0) throw new AppError('Product not found', 404);
    if (!productRows[0].is_active) throw new AppError('Product is not active', 400);

    const { rows: holdRows } = await pool.query('SELECT quantity FROM holds WHERE cart_id = $1 AND product_id = $2', [cartId, productId]);
    const currentQty = holdRows.length > 0 ? holdRows[0].quantity : 0;
    const newQty = currentQty + quantity;

    if (newQty > productRows[0].stock_quantity) throw new AppError('Insufficient stock', 400);

    if (holdRows.length > 0) {
      await pool.query('UPDATE holds SET quantity = $1 WHERE cart_id = $2 AND product_id = $3', [newQty, cartId, productId]);
    } else {
      const cartItemId = await getNextId(pool, 'holds', 'cart_item_id', 'CI');
      await pool.query('INSERT INTO holds (cart_id, product_id, cart_item_id, quantity) VALUES ($1, $2, $3, $4)', [cartId, productId, cartItemId, newQty]);
    }

    return this.getCart(customerId);
  },

  async updateQuantity(customerId, productId, quantity) {
    if (quantity <= 0) throw new AppError('Quantity must be greater than 0', 400);

    const cartId = await this._getOrCreateCart(customerId);

    const { rows: productRows } = await pool.query('SELECT stock_quantity FROM product WHERE product_id = $1', [productId]);
    if (productRows.length === 0) throw new AppError('Product not found', 404);
    if (quantity > productRows[0].stock_quantity) throw new AppError('Insufficient stock', 400);

    const { rows: holdRows } = await pool.query('SELECT quantity FROM holds WHERE cart_id = $1 AND product_id = $2', [cartId, productId]);
    if (holdRows.length === 0) throw new AppError('Item not found in cart', 404);

    await pool.query('UPDATE holds SET quantity = $1 WHERE cart_id = $2 AND product_id = $3', [quantity, cartId, productId]);
    return this.getCart(customerId);
  },

  async removeItem(customerId, productId) {
    const cartId = await this._getOrCreateCart(customerId);
    await pool.query('DELETE FROM holds WHERE cart_id = $1 AND product_id = $2', [cartId, productId]);
    return this.getCart(customerId);
  },

  async clearCart(customerId) {
    const cartId = await this._getOrCreateCart(customerId);
    await pool.query('DELETE FROM holds WHERE cart_id = $1', [cartId]);
    return this.getCart(customerId);
  }
};

module.exports = { CartService };
