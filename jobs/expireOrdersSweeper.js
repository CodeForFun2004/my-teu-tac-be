const orderService = require('../services/order.service');

const SWEEP_INTERVAL_MS = 60 * 1000;

function startExpireOrdersSweeper() {
  const timer = setInterval(() => {
    orderService.sweepExpiredOrders().catch((err) => {
      console.error('[expireOrdersSweeper] Quét order hết hạn thất bại:', err);
    });
  }, SWEEP_INTERVAL_MS);
  timer.unref();
  return timer;
}

module.exports = { startExpireOrdersSweeper };
