const fs = require('fs/promises');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'orders.json');

let state = { nextSeq: 1, orders: {} };
let orderCodeIndex = new Map(); // orderCode(number) -> orderId(string)
let loaded = false;

// Write-queue tuần tự: mọi thao tác đổi state (create/update) chạy nối tiếp nhau,
// tránh 2 webhook đến gần như đồng thời ghi đè lên nhau (Node đơn luồng nên chỉ cần
// tuần tự hoá các đoạn có `await` bên trong, không cần lock ngoài).
let queue = Promise.resolve();
function enqueue(task) {
  const run = queue.then(task, task);
  queue = run.then(
    () => {},
    () => {},
  );
  return run;
}

function rebuildIndex() {
  orderCodeIndex = new Map();
  for (const order of Object.values(state.orders)) {
    orderCodeIndex.set(order.orderCode, order.orderId);
  }
}

async function ensureLoaded() {
  if (loaded) return;
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    state = JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
    state = { nextSeq: 1, orders: {} };
    await persist();
  }
  rebuildIndex();
  loaded = true;
}

async function persist() {
  const tmpFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(state, null, 2), 'utf8');
  await fs.rename(tmpFile, DATA_FILE);
}

// buildFn(seq) => order object đầy đủ (orderId/orderCode phải được sinh từ seq bên trong buildFn)
async function createOrder(buildFn) {
  return enqueue(async () => {
    await ensureLoaded();
    const seq = state.nextSeq;
    state.nextSeq += 1;
    const order = buildFn(seq);
    state.orders[order.orderId] = order;
    orderCodeIndex.set(order.orderCode, order.orderId);
    await persist();
    return order;
  });
}

// patchFn(currentOrder) => order object đã cập nhật, hoặc null để bỏ qua (vd order đã paid rồi)
async function updateOrder(orderId, patchFn) {
  return enqueue(async () => {
    await ensureLoaded();
    const existing = state.orders[orderId];
    if (!existing) return null;
    const updated = patchFn(existing);
    if (!updated) return existing;
    state.orders[orderId] = updated;
    await persist();
    return updated;
  });
}

async function getOrder(orderId) {
  await ensureLoaded();
  return state.orders[orderId] || null;
}

async function getOrderByOrderCode(orderCode) {
  await ensureLoaded();
  const orderId = orderCodeIndex.get(orderCode);
  return orderId ? state.orders[orderId] : null;
}

async function listPendingOrders() {
  await ensureLoaded();
  return Object.values(state.orders).filter((o) => o.status === 'pending');
}

module.exports = {
  createOrder,
  updateOrder,
  getOrder,
  getOrderByOrderCode,
  listPendingOrders,
};
