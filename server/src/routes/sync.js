/**
 * sync.js — Real-Time Server-Sent Events (SSE) route.
 * Establishes persistent HTTP stream with connected clients for live data updates.
 */

const express = require('express');
const { addClient, removeClient } = require('../utils/eventHub');

const router = express.Router();

// GET /api/v1/sync/events
router.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(': connected\n\n');

  const client = { res, id: Date.now() };
  addClient(client);

  // Send periodic ping every 25s to keep connection alive through proxies
  const keepAliveInterval = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (_) {
      clearInterval(keepAliveInterval);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
    removeClient(client);
  });
});

module.exports = router;
