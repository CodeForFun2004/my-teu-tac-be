# Backend (Node.js) — PayOS / VietQR Checkout — Handoff Spec

Đây là spec để đưa cho một Claude Code session Node.js khác dựng **repo backend riêng** cho web bán hàng "Tễu Tạc". Repo FE (repo hiện tại) chỉ gọi REST API của backend này — FE **không** gọi PayOS trực tiếp.

## Mục tiêu & phạm vi

- Web bán hàng tĩnh, khách vãng lai (guest), không đăng nhập/tài khoản.
- Thanh toán **duy nhất qua VietQR thông qua PayOS** — không có COD, không có phương thức thanh toán nào khác.
- Sau khi PayOS xác nhận thanh toán qua webhook: (1) gửi email xác nhận cho khách hàng, (2) gửi email báo đơn mới cho admin/kế toán, (3) ghi 1 dòng dữ liệu đơn hàng đã xác nhận vào **file Excel** để kế toán quản lý — **không xây trang admin**.
- Ngoài phạm vi: tài khoản người dùng, lịch sử đơn hàng cho khách, trang quản trị nội bộ, voucher/khuyến mãi (FE hiện có ô nhập mã ưu đãi nhưng chỉ decorative, chưa có rule).

## Actor

- **Khách vãng lai** — duyệt web, đặt hàng, quét QR thanh toán. Không có tài khoản.
- **PayOS** — cổng thanh toán, tạo link/QR thanh toán, gọi webhook khi có giao dịch.
- **Kế toán** — không dùng web, chỉ mở file Excel được backend ghi.
- **FE (repo này)** — gọi API tạo đơn + poll trạng thái đơn, không xử lý logic thanh toán.

## User flow chính

1. Khách thêm sản phẩm vào giỏ hàng (xử lý hoàn toàn ở FE, Redux, không cần backend).
2. Tại `/cart`, khách điền thông tin giao hàng (họ tên, SĐT, email, tỉnh/thành, địa chỉ cụ thể, ghi chú) và bấm "Thanh toán qua VietQR".
3. FE gọi `POST /orders` với thông tin giao hàng + danh sách sản phẩm trong giỏ.
4. Backend tạo order ở trạng thái `pending`, gọi PayOS để tạo payment request/QR code, trả về cho FE: `orderId`, `qrCodeText` (nội dung để FE render QR — hoặc `checkoutUrl` nếu dùng trang thanh toán PayOS host sẵn), `totalAmount`, `expiresAt`.
5. FE điều hướng sang `/checkout/:orderId`, hiển thị QR và poll `GET /orders/:orderId/status` mỗi 5 giây.
6. Khách quét QR, chuyển khoản qua app ngân hàng.
7. PayOS gọi webhook về backend khi giao dịch thành công.
8. Backend xác thực webhook (chữ ký/checksum), đối chiếu số tiền, cập nhật order sang `paid`, rồi: gửi email khách + email admin, ghi dòng vào file Excel.
9. FE poll thấy status `paid` → hiển thị trang thành công.
10. Nếu quá thời gian hết hạn QR mà chưa thanh toán → backend tự chuyển order sang `expired` (job định kỳ hoặc kiểm tra lazy khi FE gọi status).

## Business rules & edge cases

- **Không có COD.** Mọi đơn phải qua PayOS/VietQR mới được coi là hoàn tất.
- Order ở trạng thái `pending` chưa phải là đơn đã bán — chỉ `paid` mới được ghi vào Excel và gửi email.
- Webhook PayOS phải được xác thực (checksum/signature theo tài liệu PayOS) trước khi tin — không cập nhật trạng thái đơn chỉ dựa vào request không xác thực được.
- Webhook phải **idempotent** — PayOS có thể gọi lại cùng một sự kiện nhiều lần; không được gửi email hoặc ghi Excel trùng lặp cho cùng 1 order đã `paid`.
- Đối chiếu số tiền webhook báo về với `totalAmount` của order trước khi đánh dấu `paid` — không tin tưởng mù quáng số tiền do client hoặc webhook cung cấp nếu có thể giả mạo.
- QR hết hạn sau một khoảng thời gian cấu hình được (FE mock hiện dùng 15 phút — backend nên dùng giá trị PayOS trả về hoặc cấu hình tương đương và FE sẽ đọc `expiresAt` từ response, không hardcode).
- Nếu tạo order thành công nhưng gọi PayOS thất bại: order nên ở trạng thái `failed`, không để FE kẹt ở màn hình chờ vô thời hạn.
- Giá sản phẩm: backend nên tự tính lại `totalAmount` từ `productId` + số lượng dựa trên dữ liệu giá phía backend (nếu backend có nguồn giá riêng) thay vì tin tưởng hoàn toàn `price` do FE gửi lên, để tránh khách sửa giá qua request. Nếu backend chưa có catalog riêng (giá hiện chỉ tồn tại ở FE mock `productApi.ts`), ít nhất cần ghi rõ giới hạn này và ưu tiên xây catalog phía backend sớm.
- File Excel: ghi append, không ghi đè các dòng cũ; cần tránh race condition khi nhiều webhook đến gần như đồng thời (dùng queue hoặc lock khi ghi file).

## Order lifecycle (state machine)

```
pending --(webhook xác nhận thành công)--> paid
pending --(hết hạn QR, chưa thanh toán)--> expired
pending --(PayOS báo lỗi / tạo payment request thất bại)--> failed
```

Không có trạng thái `cancelled` do khách hủy giữa chừng ở phạm vi hiện tại — có thể bổ sung sau nếu cần.

## Data model nháp

**Order**

| Field | Type | Ghi chú |
|---|---|---|
| orderId | string | ID nội bộ, trả về cho FE, dùng trong URL `/checkout/:orderId` |
| status | `"pending" \| "paid" \| "expired" \| "failed"` | |
| totalAmount | number | VNĐ, tổng tiền hàng (chưa có phí ship — FE hiện hiển thị "Tính ở bước sau") |
| qrCodeText | string | Nội dung QR (VietQR payload) hoặc để trống nếu dùng `checkoutUrl` thay thế |
| checkoutUrl | string (optional) | Nếu dùng trang thanh toán PayOS host sẵn thay vì tự render QR |
| expiresAt | ISO datetime string | |
| items | OrderLineItem[] | snapshot tại thời điểm đặt hàng |
| shippingInfo | ShippingInfo | xem bên dưới |
| payosTransactionId | string | mã giao dịch PayOS, dùng để đối chiếu webhook + ghi Excel |
| createdAt / paidAt | ISO datetime string | |

**OrderLineItem**: `{ productId: string; name: string; price: number; quantity: number }`

**ShippingInfo**: `{ fullName: string; phone: string; email: string; city: string; addressDetail: string; note?: string }`

Các type này phải khớp với `src/features/checkout/types/checkout.types.ts` trong repo FE — xem nguyên văn bên dưới để backend trả response đúng field name (camelCase, không đổi tên field).

```ts
// src/features/checkout/types/checkout.types.ts (repo FE, để tham chiếu)
export type OrderStatus = "pending" | "paid" | "expired" | "failed";

export interface ShippingInfo {
  fullName: string;
  phone: string;
  email: string;
  city: string;
  addressDetail: string;
  note?: string;
}

export interface OrderLineItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface CreateOrderPayload {
  shippingInfo: ShippingInfo;
  items: OrderLineItem[];
}

export interface PaymentOrder {
  orderId: string;
  status: OrderStatus;
  totalAmount: number;
  qrCodeText: string;
  expiresAt: string;
  items: OrderLineItem[];
}
```

## API cần thiết

FE hiện đang gọi qua một mock (`src/features/checkout/services/checkoutApi.ts`, lưu trong bộ nhớ, mất khi reload trang). Khi backend sẵn sàng, chỉ cần thay nội dung 2 hàm `createOrder`/`getOrderStatus` trong file đó bằng `axiosClient` gọi các endpoint dưới — không cần sửa slice hay page nào khác.

### `POST /orders`

Request:
```json
{
  "shippingInfo": { "fullName": "...", "phone": "...", "email": "...", "city": "...", "addressDetail": "...", "note": "..." },
  "items": [{ "productId": "2", "name": "Tễu Long", "price": 685000, "quantity": 1 }]
}
```

Response `201`:
```json
{
  "orderId": "TT-000123",
  "status": "pending",
  "totalAmount": 685000,
  "qrCodeText": "<VietQR payload từ PayOS>",
  "expiresAt": "2026-08-10T09:15:00.000Z",
  "items": [{ "productId": "2", "name": "Tễu Long", "price": 685000, "quantity": 1 }]
}
```

### `GET /orders/:orderId/status`

Response `200`: `{ "status": "pending" | "paid" | "expired" | "failed" }`

FE poll endpoint này mỗi 5 giây khi status còn `pending`.

### `GET /orders/:orderId` (cần bổ sung, FE mock hiện chưa gọi nhưng backend thật nên có)

Trả về full `PaymentOrder` — cần thiết để trang `/checkout/:orderId` **hoạt động đúng khi khách F5 lại trang** (mock hiện tại lưu trong bộ nhớ nên mất state khi reload; đây là giới hạn đã biết, backend thật phải khắc phục bằng cách cho FE gọi lại endpoint này khi mount).

### Webhook nội bộ — `POST /webhooks/payos` (PayOS gọi, FE không gọi)

- Xác thực chữ ký theo tài liệu PayOS trước khi xử lý.
- Idempotent theo `payosTransactionId`/`orderId`.
- Đối chiếu số tiền nhận được với `totalAmount` của order.
- Khi hợp lệ và khớp: cập nhật order `paid`, set `paidAt`, rồi trigger gửi email + ghi Excel (nên làm bất đồng bộ/qua queue để webhook trả response nhanh cho PayOS, tránh timeout/retry không cần thiết).

## Email

- **Khách hàng**: gửi tới `shippingInfo.email` khi order chuyển `paid`. Nội dung tối thiểu: mã đơn, danh sách sản phẩm + số lượng + giá, tổng tiền, thông tin giao hàng đã nhập, lời cảm ơn.
- **Admin/kế toán**: gửi tới một địa chỉ email cấu hình sẵn (env var `ADMIN_EMAIL`) khi order chuyển `paid`. Nội dung tối thiểu: mã đơn, tổng tiền, thông tin khách + địa chỉ giao hàng, mã giao dịch PayOS.
- Không gửi email cho order ở trạng thái `pending`/`expired`/`failed`.
- Dùng provider nào (SMTP, Resend, SendGrid...) tùy backend tự chọn — không có yêu cầu cụ thể từ phía FE.

## Ghi file Excel (thay cho trang admin)

- Mỗi khi order chuyển sang `paid`, append **1 dòng mới** vào một file `.xlsx` cố định trên server (đường dẫn cấu hình qua env var, ví dụ `EXCEL_FILE_PATH`).
- Cột đề xuất: `Mã đơn`, `Thời gian thanh toán`, `Họ tên`, `SĐT`, `Email`, `Tỉnh/Thành`, `Địa chỉ cụ thể`, `Ghi chú`, `Sản phẩm` (danh sách tên x số lượng), `Tổng tiền`, `Mã giao dịch PayOS`.
- Ghi an toàn khi có nhiều webhook gần như đồng thời (queue/lock ghi file tuần tự — tránh 2 process ghi đè nhau làm hỏng file).
- Thư viện gợi ý: `exceljs` (đọc file hiện có, append sheet, ghi lại) — quyết định cụ thể do backend tự chọn.

## Env vars cần có (gợi ý)

- `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` — theo tài liệu PayOS.
- `PAYOS_WEBHOOK_URL` — URL public backend đăng ký với PayOS.
- SMTP/email provider credentials + `ADMIN_EMAIL`.
- `EXCEL_FILE_PATH`.
- `CORS_ORIGIN` — origin của FE (dev: `http://localhost:5173` hoặc port Vite đang chạy; production: domain thật).
- `PORT`.

## Security notes

- Xác thực webhook signature — không tin bất kỳ request nào tới `/webhooks/payos` nếu chưa verify.
- Validate input ở `POST /orders` (email hợp lệ, phone hợp lệ, items không rỗng, quantity > 0).
- Rate-limit `POST /orders` để tránh spam tạo order/QR ảo.
- CORS chỉ mở cho origin của FE, không mở `*` ở production.

## Acceptance criteria

- [ ] `POST /orders` tạo order `pending`, gọi PayOS thành công, trả đúng shape `PaymentOrder` ở trên.
- [ ] `GET /orders/:orderId/status` trả đúng trạng thái hiện tại.
- [ ] `GET /orders/:orderId` trả full order (để FE có thể refresh trang thanh toán mà không mất dữ liệu).
- [ ] Webhook xác thực chữ ký, idempotent, đối chiếu số tiền trước khi đánh dấu `paid`.
- [ ] Order `paid` → gửi đúng 1 email khách + 1 email admin, không gửi trùng khi webhook bắn lại.
- [ ] Order `paid` → đúng 1 dòng mới trong file Excel, không trùng lặp, không hỏng dữ liệu các dòng cũ khi có nhiều đơn cùng lúc.
- [ ] Order không thanh toán trong thời gian QR hiệu lực → tự chuyển `expired`.
- [ ] Không có endpoint/luồng nào chấp nhận thanh toán COD.

## Liên kết

- FE checkout feature (mock hiện tại, sẽ thay bằng API thật): `src/features/checkout/` (types, `services/checkoutApi.ts`, `checkoutSlice.ts`, `CheckoutPage.tsx`)
- FE cart/shipping-info form: `src/features/cart/CartPage.tsx`
- `docs/backlog.md` — mục "checkout" trong roadmap repo FE
