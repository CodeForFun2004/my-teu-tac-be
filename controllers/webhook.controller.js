const payosService = require('../services/payos.service');
const orderService = require('../services/order.service');
const emailService = require('../services/email.service');
const sheetService = require('../services/sheet.service');
const asyncHandler = require('../utils/asyncHandler');

const handlePayosWebhook = asyncHandler(async (req, res) => {
  let webhookData;
  try {
    webhookData = await payosService.verifyWebhook(req.body);
  } catch (err) {
    // Chữ ký sai — không xử lý nghiệp vụ, nhưng vẫn trả 200 để tránh PayOS retry storm.
    console.warn('[webhook] Chữ ký không hợp lệ, bỏ qua:', err.message);
    return res.status(200).json({ ok: true });
  }

  const { orderCode, amount, reference } = webhookData;
  const result = await orderService.markOrderPaid(orderCode, { amount, reference });

  if (result.status === 'not_found') {
    // Có thể là request test lúc payos.webhooks.confirm() đăng ký URL — không phải lỗi.
    console.warn(`[webhook] Không tìm thấy order cho orderCode=${orderCode}`);
  } else if (result.status === 'amount_mismatch') {
    console.error(
      `[webhook] Số tiền không khớp cho order ${result.order.orderId}: nhận ${amount}, kỳ vọng ${result.order.totalAmount}`,
    );
  } else if (result.status === 'paid') {
    const order = result.order;
    // Trả response cho PayOS ngay, không đợi email/sheet — tránh timeout/retry không cần thiết.
    Promise.allSettled([
      emailService.sendOrderConfirmationEmail(order),
      emailService.sendAdminOrderNotification(order),
      sheetService.appendOrderRow(order),
    ]).then((results) => {
      results.forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[webhook] Tác vụ hậu-thanh-toán #${i} thất bại cho ${order.orderId}:`, r.reason);
        }
      });
    });
  }
  // 'already_paid' -> idempotent, không làm gì thêm.

  res.status(200).json({ ok: true });
});

module.exports = { handlePayosWebhook };
