/**
 * catchAsync.js
 * Wraps async route handlers to catch errors and pass them to the global error handler.
 */
module.exports = fn => (req, res, next) => {
  fn(req, res, next).catch(next);
};
