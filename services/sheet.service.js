const env = require('../config/env');

function summarizeItems(items) {
  return items.map((i) => `${i.name} x${i.quantity}`).join(', ');
}

async function postToAppsScript(payload) {
  const res = await fetch(env.googleSheet.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Apps Script trả về HTTP ${res.status}`);
  return res.json().catch(() => ({}));
}

// Append 1 dòng vào Google Sheet của kế toán qua Apps Script Web App.
// Không throw ra ngoài: order đã "paid" rồi, lỗi ở bước này chỉ log, không rollback order.
async function appendOrderRow(order) {
  if (!env.googleSheet.webhookUrl) {
    console.warn('[sheet.service] GOOGLE_SHEET_WEBHOOK_URL chưa cấu hình, bỏ qua ghi Sheet.');
    return;
  }

  const payload = {
    secret: env.googleSheet.webhookSecret,
    orderId: order.orderId,
    paidAt: order.paidAt,
    fullName: order.shippingInfo.fullName,
    phone: order.shippingInfo.phone,
    email: order.shippingInfo.email,
    city: order.shippingInfo.city,
    addressDetail: order.shippingInfo.addressDetail,
    note: order.shippingInfo.note || '',
    itemsSummary: summarizeItems(order.items),
    totalAmount: order.totalAmount,
    payosTransactionId: order.payosTransactionId,
  };

  try {
    await postToAppsScript(payload);
  } catch (err) {
    try {
      await postToAppsScript(payload); // 1 lần retry cho lỗi mạng thoáng qua
    } catch (retryErr) {
      console.error(`[sheet.service] Ghi Google Sheet thất bại cho order ${order.orderId}:`, retryErr.message);
    }
  }
}

module.exports = { appendOrderRow };
