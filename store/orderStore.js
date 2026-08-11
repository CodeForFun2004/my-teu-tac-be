const { getDb } = require('../config/db');

// Write-queue tuần tự: mọi thao tác đổi state (create/update) chạy nối tiếp nhau,
// tránh 2 webhook đến gần như đồng thời ghi đè lên nhau (Render hiện chạy đúng 1
// instance nên serialize trong process là đủ; nếu sau này scale nhiều instance thì
// cần thiết kế lại phần updateOrder theo hướng atomic Mongo query).
let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.then(
    () => {},
    () => {},
  );
  return run;
}

function ordersCollection() {
  return getDb().collection('orders');
}

function countersCollection() {
  return getDb().collection('counters');
}

// orderCode gửi PayOS phải duy nhất mãi mãi (PayOS nhớ vĩnh viễn, kể cả sau khi
// service Render bị redeploy/restart). Dùng Date.now() thay vì đếm từ 1 vì thời
// gian không bao giờ lùi lại; seq/orderCode được tăng atomic ngay trong Mongo.
async function nextSeqAndOrderCode() {
  const now = Date.now();
  const result = await countersCollection().findOneAndUpdate(
    { _id: 'orders' },
    [
      { $set: { seq: { $add: [{ $ifNull: ['$seq', 0] }, 1] } } },
      { $set: { orderCode: { $add: [{ $max: [{ $ifNull: ['$orderCode', 0] }, now] }, 1] } } },
    ],
    { upsert: true, returnDocument: 'after' },
  );
  return { seq: result.seq, orderCode: result.orderCode };
}

// buildFn(seq, orderCode) => order object đầy đủ (orderId sinh từ seq, orderCode đã được sinh sẵn duy nhất)
async function createOrder(buildFn) {
  return enqueue(async () => {
    const { seq, orderCode } = await nextSeqAndOrderCode();
    const order = buildFn(seq, orderCode);
    await ordersCollection().insertOne({ ...order });
    return order;
  });
}

// patchFn(currentOrder) => order object đã cập nhật, hoặc null để bỏ qua (vd order đã paid rồi)
async function updateOrder(orderId, patchFn) {
  return enqueue(async () => {
    const existing = await ordersCollection().findOne({ orderId });
    if (!existing) return null;
    const updated = patchFn(existing);
    if (!updated) return existing;
    await ordersCollection().replaceOne({ orderId }, { ...updated });
    return updated;
  });
}

async function getOrder(orderId) {
  return ordersCollection().findOne({ orderId });
}

async function getOrderByOrderCode(orderCode) {
  return ordersCollection().findOne({ orderCode });
}

async function listPendingOrders() {
  return ordersCollection().find({ status: 'pending' }).toArray();
}

module.exports = {
  createOrder,
  updateOrder,
  getOrder,
  getOrderByOrderCode,
  listPendingOrders,
};
