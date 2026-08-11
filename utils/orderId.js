// seq (số nguyên tăng dần, lưu trong data/orders.json) chỉ dùng để sinh orderId
// hiển thị nội bộ — orderCode gửi PayOS được sinh riêng trong orderStore.js vì
// phải duy nhất mãi mãi, không được phép reset như seq.
function formatOrderId(seq) {
  return `TT-${String(seq).padStart(6, '0')}`;
}

module.exports = { formatOrderId };
