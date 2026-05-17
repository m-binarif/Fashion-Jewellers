require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, data: null, message: 'Server is running' });
});

// API routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/products', require('./routes/products'));
app.use('/api/v1/categories', require('./routes/categories'));
app.use('/api/v1/materials', require('./routes/materials'));
app.use('/api/v1/customers', require('./routes/customers'));
app.use('/api/v1/admin/customers', require('./routes/adminCustomers'));
app.use('/api/v1/admin/suppliers', require('./routes/adminSuppliers'));
app.use('/api/v1/admin/employees', require('./routes/adminEmployees'));
app.use('/api/v1/cart', require('./routes/cart'));
app.use('/api/v1/orders', require('./routes/orders'));
app.use('/api/v1/admin/orders', require('./routes/adminOrders'));
app.use('/api/v1/admin/payments', require('./routes/payments'));
app.use('/api/v1/admin/stats', require('./routes/adminStats'));
app.use('/api/v1/reviews', require('./routes/reviews'));
app.use('/api/reviews', require('./routes/reviews'));

// Global error handler
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  if (status === 500) console.error('Server error:', err);
  res.status(status).json({ success: false, data: null, message: err.message || 'Internal server error' });
});



app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const result = await pool.query('SELECT NOW() AS now');
    console.log(`PostgreSQL connected — DB time: ${result.rows[0]?.now}`);
  } catch (err) {
    console.error('PostgreSQL connection FAILED:', err.message);
  }
});

module.exports = app;