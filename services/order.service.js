const env = require('../config/env');
const orderStore = require('../store/orderStore');
const payosService = require('./payos.service');
const { getProductById } = require('../data/products');
const { formatOrderId } = require('../utils/orderId');

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

function buildLineItemsFromCatalog(items) {
  return items.map((item) => {
    const product = getProductById(item.productId);
    if (!product) {
      throw new HttpError(400, `Sản phẩm không tồn tại: ${item.productId}`);
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new HttpError(400, `Số lượng không hợp lệ cho sản phẩm ${item.productId}`);
    }
    return { productId: product.id, name: product.name, price: product.price, quantity };
  });
}

function toPublicOrder(order) {
  return {
    orderId: order.orderId,
    status: order.status,
    totalAmount: order.totalAmount,
    qrCodeText: order.qrCodeText,
    checkoutUrl: order.checkoutUrl,
    expiresAt: order.expiresAt,
    items: order.items,
  };
}

async function applyLazyExpiry(order) {
  if (order.status === 'pending' && new Date(order.expiresAt).getTime() < Date.now()) {
    const updated = await orderStore.updateOrder(order.orderId, (current) =>
      current.status === 'pending' ? { ...current, status: 'expired' } : null,
    );
    return updated || order;
  }
  return order;
}

async function createOrder({ shippingInfo, items }) {
  if (!items || items.length === 0) {
    throw new HttpError(400, 'Giỏ hàng trống');
  }
  const lineItems = buildLineItemsFromCatalog(items);
  const totalAmount = lineItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const expiresAt = new Date(Date.now() + env.qrExpiryMinutes * 60 * 1000);

  const order = await orderStore.createOrder((seq, orderCode) => ({
    orderId: formatOrderId(seq),
    orderCode,
    status: 'pending',
    totalAmount,
    items: lineItems,
    shippingInfo,
    qrCodeText: '',
    checkoutUrl: '',
    payosPaymentLinkId: '',
    payosTransactionId: '',
    expiresAt: expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
    paidAt: null,
  }));

  try {
    const paymentLink = await payosService.createPaymentLink({
      orderCode: order.orderCode,
      amount: order.totalAmount,
      description: `Don hang ${order.orderId}`,
      items: lineItems.map((i) => ({ name: i.name, quantity: i.quantity, price: i.price })),
      shippingInfo,
      expiredAtUnixSeconds: Math.floor(expiresAt.getTime() / 1000),
      returnUrl: `${env.feReturnUrl}/${order.orderId}`,
      cancelUrl: env.feCancelUrl,
    });

    const updated = await orderStore.updateOrder(order.orderId, (current) => ({
      ...current,
      qrCodeText: paymentLink.qrCode,
      checkoutUrl: paymentLink.checkoutUrl,
      payosPaymentLinkId: paymentLink.paymentLinkId,
      expiresAt: paymentLink.expiredAt
        ? new Date(paymentLink.expiredAt * 1000).toISOString()
        : current.expiresAt,
    }));

    return toPublicOrder(updated);
  } catch (err) {
    await orderStore.updateOrder(order.orderId, (current) => ({ ...current, status: 'failed' }));
    if (err instanceof HttpError) throw err;
    const failure = new HttpError(502, 'Không tạo được liên kết thanh toán PayOS, vui lòng thử lại.');
    failure.cause = err;
    throw failure;
  }
}

async function getOrder(orderId) {
  const order = await orderStore.getOrder(orderId);
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  const current = await applyLazyExpiry(order);
  return toPublicOrder(current);
}

async function getOrderStatus(orderId) {
  const order = await orderStore.getOrder(orderId);
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  const current = await applyLazyExpiry(order);
  return { status: current.status };
}

// Trả về { status: 'paid' | 'already_paid' | 'amount_mismatch' | 'not_found', order }
// 'paid' nghĩa là lệnh gọi này vừa thực hiện transition — chỉ khi đó mới gửi email/ghi sheet.
async function markOrderPaid(orderCode, { amount, reference }) {
  const existing = await orderStore.getOrderByOrderCode(orderCode);
  if (!existing) return { status: 'not_found', order: null };
  if (existing.status === 'paid') return { status: 'already_paid', order: existing };
  if (existing.totalAmount !== amount) return { status: 'amount_mismatch', order: existing };

  let transitioned = false;
  const result = await orderStore.updateOrder(existing.orderId, (current) => {
    if (current.status === 'paid') return null; // đã có lần gọi khác xử lý xong trước
    transitioned = true;
    return {
      ...current,
      status: 'paid',
      paidAt: new Date().toISOString(),
      payosTransactionId: reference,
    };
  });

  return { status: transitioned ? 'paid' : 'already_paid', order: result };
}

async function sweepExpiredOrders() {
  const pending = await orderStore.listPendingOrders();
  const now = Date.now();
  await Promise.all(
    pending
      .filter((o) => new Date(o.expiresAt).getTime() < now)
      .map((o) =>
        orderStore.updateOrder(o.orderId, (current) =>
          current.status === 'pending' ? { ...current, status: 'expired' } : null,
        ),
      ),
  );
}

module.exports = {
  HttpError,
  createOrder,
  getOrder,
  getOrderStatus,
  markOrderPaid,
  sweepExpiredOrders,
};
