/**
 * invoiceService.js — Lightweight HTML invoice generation.
 * Removed Puppeteer to de-bloat the codebase.
 */

const { OrderService } = require('./orderService');
const pool = require('../db/pool');
const AppError = require('../utils/AppError');

const InvoiceService = {
  async generateInvoice(orderId, customerId) {
    const order = await OrderService.getOrderById(orderId, customerId);
    if (order.status === 'Cancelled' || order.status === 'Payment Failed') {
      throw new AppError(`Invoices are not available for orders with status: ${order.status}`, 400);
    }

    const { rows } = await pool.query(
      'SELECT c.full_name AS "customerName" FROM customer c JOIN orders o ON c.customer_id = o.customer_id WHERE o.order_id = $1',
      [orderId]
    );
    const customerName = rows.length > 0 ? rows[0].customerName : 'Customer';

    return this._buildHtml(order, customerName);
  },

  _buildHtml(order, customerName) {
    const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * Number(item.unitPrice)), 0);
    const shippingCost = Number(order.totalAmount) - subtotal;

    return `<!DOCTYPE html><html><head><title>Invoice - ${order.orderNumber}</title><style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
      .header { display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
      .header h1 { margin: 0; color: #b8860b; }
      .company-details, .invoice-details { font-size: 14px; }
      .invoice-details { text-align: right; }
      .bill-to { margin-bottom: 30px; font-size: 14px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
      th { background-color: #f8f9fa; text-align: left; padding: 12px; border-bottom: 2px solid #dee2e6; }
      td { padding: 12px; border-bottom: 1px solid #dee2e6; }
      .text-right { text-align: right; }
      .totals { width: 300px; float: right; }
      .totals table th { background: transparent; border-bottom: none; text-align: left; }
      .totals table td { border-bottom: 1px solid #eee; }
      .grand-total { font-size: 18px; font-weight: bold; background-color: #f8f9fa; color: #b8860b; }
      .print-btn { background: #b8860b; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 20px; }
      @media print { .print-btn { display: none; } }
    </style></head><body>
      <button class="print-btn" onclick="window.print()">Print Invoice</button>
      <div class="header">
        <div class="company-details"><h1>FASHION JEWELLERS</h1><p>123 Diamond Street<br>New York, NY 10001<br>contact@jewellery.com</p></div>
        <div class="invoice-details"><h2>INVOICE</h2><p><strong>Order #:</strong> ${order.orderNumber}<br><strong>Date:</strong> ${new Date(order.orderDate).toLocaleDateString()}<br><strong>Status:</strong> ${order.status}</p></div>
      </div>
      <div class="bill-to"><strong>Bill To:</strong><br>${customerName}<br>${order.shipping.street}<br>${order.shipping.city}, ${order.shipping.state} ${order.shipping.postalCode}<br>${order.shipping.country}</div>
      <table><thead><tr><th>Item</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead><tbody>
        ${order.items.map(item => `<tr><td>${item.name}</td><td class="text-right">${item.quantity}</td><td class="text-right">Rs. ${Number(item.unitPrice).toLocaleString()}</td><td class="text-right">Rs. ${(item.quantity * Number(item.unitPrice)).toLocaleString()}</td></tr>`).join('')}
      </tbody></table>
      <div class="totals"><table>
        <tr><th>Subtotal:</th><td class="text-right">Rs. ${subtotal.toLocaleString()}</td></tr>
        <tr><th>Shipping:</th><td class="text-right">Rs. ${shippingCost > 0 ? shippingCost.toLocaleString() : '0'}</td></tr>
        <tr class="grand-total"><th>Grand Total:</th><td class="text-right">PKR ${Number(order.totalAmount).toLocaleString()}</td></tr>
      </table></div>
    </body></html>`;
  }
};

module.exports = { InvoiceService };
