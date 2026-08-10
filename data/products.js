// Nguồn giá chuẩn phía backend — khớp id với FE (src/data hoặc productApi.ts mock).
// Backend luôn tính totalAmount từ đây, không tin price do FE gửi lên trong POST /orders.
const PRODUCTS = [
  { id: "1", slug: "teu-original", name: "Tễu Original", price: 5800 },
  { id: "2", slug: "teu-long", name: "Tễu Long", price: 6850 },
  { id: "3", slug: "teu-lan", name: "Tễu Lân", price: 6400 },
  { id: "4", slug: "teu-quy", name: "Tễu Quy", price: 6400 },
  { id: "5", slug: "teu-phung", name: "Tễu Phụng", price: 6850 },
];

const PRODUCTS_BY_ID = new Map(PRODUCTS.map((p) => [p.id, p]));

function getProductById(id) {
  return PRODUCTS_BY_ID.get(String(id));
}

module.exports = { PRODUCTS, getProductById };
