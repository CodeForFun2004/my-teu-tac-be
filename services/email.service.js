const transporter = require('../config/mailer');
const env = require('../config/env');

// Bảng màu "Imperial Heritage Modern" (docs/DESIGN.md). Email client không load được
// Playfair Display/Be Vietnam Pro nên dùng font-stack web-safe (Georgia cho tiêu đề,
// Helvetica/Arial cho nội dung) để giữ tinh thần premium qua màu sắc thay vì font thật.
const COLORS = {
  forestGreen: '#06402B',
  surfaceContainer: '#1e1c12',
  imperialGold: '#D4AF37',
  warmCream: '#FFF8E7',
  deepRed: '#B22222',
  onSurfaceVariant: '#c0c9c1',
};

function formatCurrency(amount) {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
}

function itemsRowsHtml(items) {
  return items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid rgba(212,175,55,0.25);color:${COLORS.warmCream};font-family:Helvetica,Arial,sans-serif;font-size:14px;">${item.name}</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(212,175,55,0.25);color:${COLORS.onSurfaceVariant};font-family:Helvetica,Arial,sans-serif;font-size:14px;text-align:center;">x${item.quantity}</td>
        <td style="padding:10px 0;border-bottom:1px solid rgba(212,175,55,0.25);color:${COLORS.warmCream};font-family:Helvetica,Arial,sans-serif;font-size:14px;text-align:right;">${formatCurrency(item.price * item.quantity)}</td>
      </tr>`,
    )
    .join('');
}

function emailShell({ title, badge, bodyHtml }) {
  return `
  <div style="background-color:#100e06;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background-color:${COLORS.forestGreen};border:1px solid ${COLORS.imperialGold};border-radius:6px;overflow:hidden;">
      <div style="padding:28px 32px;border-bottom:1px solid rgba(212,175,55,0.4);">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:${COLORS.warmCream};letter-spacing:0.02em;">Tễu Tạc</div>
        ${badge ? `<span style="display:inline-block;margin-top:10px;padding:4px 12px;background-color:${COLORS.deepRed};color:${COLORS.warmCream};font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;border-radius:2px;">${badge}</span>` : ''}
      </div>
      <div style="padding:28px 32px;">
        <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${COLORS.warmCream};margin:0 0 16px;">${title}</h1>
        ${bodyHtml}
      </div>
      <div style="padding:20px 32px;border-top:1px solid rgba(212,175,55,0.3);">
        <p style="margin:0;font-size:12px;color:${COLORS.onSurfaceVariant};font-family:Helvetica,Arial,sans-serif;">
          © ${new Date().getFullYear()} Tễu Tạc Store — Cần hỗ trợ? Liên hệ ${env.email.adminEmail}
        </p>
      </div>
    </div>
  </div>`;
}

// Gửi cho khách khi order chuyển "paid".
async function sendOrderConfirmationEmail(order) {
  const { shippingInfo } = order;
  const bodyHtml = `
    <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:${COLORS.warmCream};line-height:22px;margin:0 0 20px;">
      Cảm ơn <strong>${shippingInfo.fullName}</strong> đã đặt hàng tại Tễu Tạc. Đơn hàng
      <strong style="color:${COLORS.imperialGold};">${order.orderId}</strong> đã thanh toán thành công qua VietQR.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <thead>
        <tr>
          <th style="text-align:left;padding-bottom:8px;border-bottom:1px solid ${COLORS.imperialGold};color:${COLORS.imperialGold};font-family:Helvetica,Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Sản phẩm</th>
          <th style="text-align:center;padding-bottom:8px;border-bottom:1px solid ${COLORS.imperialGold};color:${COLORS.imperialGold};font-family:Helvetica,Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">SL</th>
          <th style="text-align:right;padding-bottom:8px;border-bottom:1px solid ${COLORS.imperialGold};color:${COLORS.imperialGold};font-family:Helvetica,Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Thành tiền</th>
        </tr>
      </thead>
      <tbody>${itemsRowsHtml(order.items)}</tbody>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${COLORS.warmCream};">Tổng tiền</td>
        <td style="text-align:right;font-family:Helvetica,Arial,sans-serif;font-size:18px;font-weight:700;color:${COLORS.deepRed};">${formatCurrency(order.totalAmount)}</td>
      </tr>
    </table>
    <div style="border:1px solid rgba(212,175,55,0.4);border-radius:4px;padding:16px 18px;">
      <p style="margin:0 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:${COLORS.imperialGold};">Thông tin giao hàng</p>
      <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:${COLORS.warmCream};line-height:20px;">
        ${shippingInfo.fullName} · ${shippingInfo.phone}<br/>
        ${shippingInfo.addressDetail}, ${shippingInfo.city}
        ${shippingInfo.note ? `<br/><em style="color:${COLORS.onSurfaceVariant};">Ghi chú: ${shippingInfo.note}</em>` : ''}
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Tễu Tạc Store" <${env.email.user}>`,
    to: shippingInfo.email,
    subject: `Xác nhận thanh toán đơn hàng ${order.orderId} — Tễu Tạc`,
    html: emailShell({ title: 'Thanh toán thành công', badge: 'Đã xác nhận', bodyHtml }),
  });
}

// Gửi cho kế toán khi order chuyển "paid".
async function sendAdminOrderNotification(order) {
  const { shippingInfo } = order;
  const bodyHtml = `
    <p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:${COLORS.warmCream};line-height:22px;margin:0 0 20px;">
      Đơn hàng mới đã thanh toán qua VietQR/PayOS.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr><td style="padding:4px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.onSurfaceVariant};">Mã đơn</td><td style="padding:4px 0;text-align:right;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.warmCream};font-weight:700;">${order.orderId}</td></tr>
      <tr><td style="padding:4px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.onSurfaceVariant};">Tổng tiền</td><td style="padding:4px 0;text-align:right;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.deepRed};font-weight:700;">${formatCurrency(order.totalAmount)}</td></tr>
      <tr><td style="padding:4px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.onSurfaceVariant};">Mã giao dịch PayOS</td><td style="padding:4px 0;text-align:right;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.warmCream};">${order.payosTransactionId}</td></tr>
      <tr><td style="padding:4px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.onSurfaceVariant};">Khách hàng</td><td style="padding:4px 0;text-align:right;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.warmCream};">${shippingInfo.fullName} · ${shippingInfo.phone}</td></tr>
      <tr><td style="padding:4px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.onSurfaceVariant};">Email khách</td><td style="padding:4px 0;text-align:right;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.warmCream};">${shippingInfo.email}</td></tr>
      <tr><td style="padding:4px 0;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.onSurfaceVariant};">Địa chỉ giao hàng</td><td style="padding:4px 0;text-align:right;font-family:Helvetica,Arial,sans-serif;font-size:13px;color:${COLORS.warmCream};">${shippingInfo.addressDetail}, ${shippingInfo.city}</td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th style="text-align:left;padding-bottom:8px;border-bottom:1px solid ${COLORS.imperialGold};color:${COLORS.imperialGold};font-family:Helvetica,Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Sản phẩm</th>
          <th style="text-align:center;padding-bottom:8px;border-bottom:1px solid ${COLORS.imperialGold};color:${COLORS.imperialGold};font-family:Helvetica,Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">SL</th>
          <th style="text-align:right;padding-bottom:8px;border-bottom:1px solid ${COLORS.imperialGold};color:${COLORS.imperialGold};font-family:Helvetica,Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;">Thành tiền</th>
        </tr>
      </thead>
      <tbody>${itemsRowsHtml(order.items)}</tbody>
    </table>
  `;

  await transporter.sendMail({
    from: `"Tễu Tạc Store" <${env.email.user}>`,
    to: env.email.adminEmail,
    subject: `[Đơn mới] ${order.orderId} — ${formatCurrency(order.totalAmount)}`,
    html: emailShell({ title: 'Đơn hàng đã thanh toán', badge: 'Kế toán', bodyHtml }),
  });
}

module.exports = { sendOrderConfirmationEmail, sendAdminOrderNotification };
