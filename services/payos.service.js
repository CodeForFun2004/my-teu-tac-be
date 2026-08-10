const payos = require('../config/payos');

async function createPaymentLink({
  orderCode,
  amount,
  description,
  items,
  shippingInfo,
  expiredAtUnixSeconds,
  returnUrl,
  cancelUrl,
}) {
  return payos.paymentRequests.create({
    orderCode,
    amount,
    description,
    returnUrl,
    cancelUrl,
    items,
    buyerName: shippingInfo.fullName,
    buyerEmail: shippingInfo.email,
    buyerPhone: shippingInfo.phone,
    buyerAddress: `${shippingInfo.addressDetail}, ${shippingInfo.city}`,
    expiredAt: expiredAtUnixSeconds,
  });
}

// Ném lỗi (InvalidSignatureError/WebhookError) nếu chữ ký sai — caller phải try/catch.
async function verifyWebhook(webhookBody) {
  return payos.webhooks.verify(webhookBody);
}

async function confirmWebhookUrl(url) {
  return payos.webhooks.confirm(url);
}

module.exports = { createPaymentLink, verifyWebhook, confirmWebhookUrl };
