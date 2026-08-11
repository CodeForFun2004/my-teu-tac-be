const payos = require("../config/payos");
const env = require("../config/env");

// Log lỗi chi tiết từ PayOS SDK (thường là axios error) để biết chính xác
// nguyên nhân thất bại khi deploy (config sai, network bị chặn, chữ ký sai...).
function logPayosError(context, error) {
  console.error(`[PayOS] ${context} failed:`, {
    message: error.message,
    code: error.code,
    status: error.response?.status,
    responseData: error.response?.data,
    stack: error.stack,
  });
}

function logPayosConfigStatus() {
  const { clientId, apiKey, checksumKey, webhookUrl } = env.payos;
  console.log("[PayOS] Config check:", {
    clientId: clientId ? "set" : "MISSING",
    apiKey: apiKey ? "set" : "MISSING",
    checksumKey: checksumKey ? "set" : "MISSING",
    webhookUrl: webhookUrl || "MISSING",
  });
}

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
  logPayosConfigStatus();
  console.log("[PayOS] Creating payment link with params:", {
    orderCode,
    amount,
    description,
    items,
    shippingInfo,
    expiredAtUnixSeconds,
    returnUrl,
    cancelUrl,
  });
  try {
    const result = await payos.paymentRequests.create({
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
    console.log("[PayOS] Payment link created successfully:", {
      orderCode,
      paymentLinkId: result?.paymentLinkId,
      checkoutUrl: result?.checkoutUrl,
    });
    return result;
  } catch (error) {
    logPayosError(`createPaymentLink(orderCode=${orderCode})`, error);
    throw error;
  }
}

// Ném lỗi (InvalidSignatureError/WebhookError) nếu chữ ký sai — caller phải try/catch.
async function verifyWebhook(webhookBody) {
  console.log("[PayOS] Verifying webhook with body:", webhookBody);
  try {
    const result = await payos.webhooks.verify(webhookBody);
    console.log("[PayOS] Webhook verified successfully:", {
      orderCode: result?.orderCode,
    });
    return result;
  } catch (error) {
    logPayosError("verifyWebhook", error);
    throw error;
  }
}

async function confirmWebhookUrl(url) {
  console.log("[PayOS] Confirming webhook URL:", url);
  try {
    const result = await payos.webhooks.confirm(url);
    console.log("[PayOS] Webhook URL confirmed successfully:", url);
    return result;
  } catch (error) {
    logPayosError(`confirmWebhookUrl(url=${url})`, error);
    throw error;
  }
}

module.exports = { createPaymentLink, verifyWebhook, confirmWebhookUrl };
