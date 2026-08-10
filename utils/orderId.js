// seq (số nguyên tăng dần, lưu trong data/orders.json) là nguồn duy nhất cho cả
// orderId hiển thị và orderCode gửi PayOS — đảm bảo map 1-1, không cần bảng tra riêng.
function formatOrderId(seq) {
  return `TT-${String(seq).padStart(6, '0')}`;
}

function seqToOrderCode(seq) {
  return seq;
}

module.exports = { formatOrderId, seqToOrderCode };
