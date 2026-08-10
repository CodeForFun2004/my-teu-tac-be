const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^(0|\+84)\d{9,10}$/;

function validateCreateOrder(req, res, next) {
  const { shippingInfo, items } = req.body || {};

  if (!shippingInfo || typeof shippingInfo !== 'object') {
    return res.status(400).json({ error: 'Thiếu thông tin giao hàng' });
  }
  const { fullName, phone, email, city, addressDetail } = shippingInfo;
  if (!fullName || !String(fullName).trim()) {
    return res.status(400).json({ error: 'Họ tên không được để trống' });
  }
  if (!phone || !PHONE_RE.test(String(phone).trim())) {
    return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
  }
  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.status(400).json({ error: 'Email không hợp lệ' });
  }
  if (!city || !String(city).trim()) {
    return res.status(400).json({ error: 'Tỉnh/Thành không được để trống' });
  }
  if (!addressDetail || !String(addressDetail).trim()) {
    return res.status(400).json({ error: 'Địa chỉ cụ thể không được để trống' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Giỏ hàng trống' });
  }
  for (const item of items) {
    if (!item || !item.productId) {
      return res.status(400).json({ error: 'productId không hợp lệ' });
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: `Số lượng không hợp lệ cho sản phẩm ${item.productId}` });
    }
  }

  next();
}

module.exports = validateCreateOrder;
