const rateLimit = require('express-rate-limit');

// Chống spam tạo order/QR ảo — 10 request/phút/IP cho POST /orders.
const createOrderLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Bạn đang tạo đơn quá nhanh, vui lòng thử lại sau ít phút.' },
});

module.exports = { createOrderLimiter };
