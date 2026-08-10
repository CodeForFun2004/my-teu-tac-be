# Kế hoạch build backend Tễu Tạc (VietQR/PayOS + Email + Google Sheet)

> Nguồn spec gốc: [`backend-payos-handoff.md`](./backend-payos-handoff.md). File này là kế hoạch triển khai cụ thể, có 1 điểm **lệch** so với spec gốc (ghi Google Sheet online thay vì file `.xlsx` local) theo yêu cầu mới nhất của chủ dự án — xem mục "Điểm lệch so với spec gốc".

## Điểm lệch so với spec gốc

Spec gốc đề xuất dùng `exceljs` ghi file `.xlsx` cố định trên server. Theo yêu cầu mới: dùng **Google Apps Script Web App** (chạy dưới tài khoản kế toán `huydq04forwork@gmail.com`) để ghi dữ liệu vào **Google Sheet online** — kế toán xem/xuất báo cáo trực tiếp trên Sheet mà không cần SSH vào server lấy file. Backend gọi Apps Script Web App qua HTTP POST giống hệt cách gọi 1 webhook nội bộ. Toàn bộ acceptance criteria về "1 dòng mới, không trùng lặp, an toàn khi ghi đồng thời" vẫn giữ nguyên, chỉ đổi nơi lưu.

## Kiến trúc tổng quan

```
PayOS ──webhook──▶ POST /webhooks/payos ──▶ verify signature ──▶ đối chiếu amount
                                                    │
                                                    ▼ (idempotent, chỉ khi hợp lệ + chưa xử lý)
                                     order.status = paid, paidAt = now
                                                    │
                              ┌─────────────────────┼─────────────────────┐
                              ▼                      ▼                     ▼
                  email khách hàng          email kế toán           POST → Google Apps Script
                  (nodemailer/Gmail)     (huydq04forwork@gmail.com)   Web App → append row Sheet
```

- Không dùng DB server (Postgres/Mongo...). Order lưu trong `data/orders.json`, đọc/ghi qua 1 write-queue tuần tự trong process (đủ an toàn cho quy mô shop nhỏ, tránh race khi nhiều webhook đến gần như đồng thời).
- Giá sản phẩm lấy từ catalog cứng phía backend (`data/products.js`, copy từ 5 sản phẩm bạn cung cấp) — **không** tin `price` do FE gửi lên, chống sửa giá qua request.
- `orderCode` gửi cho PayOS phải là **số nguyên** (yêu cầu bắt buộc của PayOS SDK) — sinh từ 1 counter tuần tự lưu trong `data/orders.json`, map 1-1 với `orderId` dạng `TT-000123` trả về cho FE.

## Cấu trúc thư mục sẽ thêm

```
my-teu-tac-be/
├── .env                        # bổ sung biến mới (xem mục Env vars)
├── .gitignore                  # mới — loại trừ node_modules, .env, data/orders.json
├── server.js                   # entrypoint, chỉ listen(), import app.js
├── app.js                      # mới — khởi tạo express app, middleware, mount routes
├── config/
│   ├── env.js                  # đọc + validate toàn bộ process.env 1 chỗ, fail-fast nếu thiếu
│   ├── payos.js                # khởi tạo PayOS client (singleton)
│   └── mailer.js                # khởi tạo nodemailer transporter (singleton)
├── data/
│   ├── products.js             # catalog cứng 5 sản phẩm (nguồn giá chuẩn)
│   └── orders.json             # runtime DB dạng JSON — KHÔNG commit (gitignore)
├── store/
│   └── orderStore.js           # CRUD order trên orders.json + write-queue tuần tự
├── services/
│   ├── payos.service.js        # tạo payment link, verify webhook, (script) confirm webhook URL
│   ├── email.service.js        # rewrite: sendOrderConfirmationEmail (khách) + sendAdminOrderNotification (kế toán), theo màu DESIGN.md
│   ├── sheet.service.js        # gọi Google Apps Script Web App để append order vào Sheet
│   └── order.service.js        # business logic: createOrder, getOrder, markOrderPaid, expire sweep
├── controllers/
│   ├── order.controller.js     # POST /orders, GET /orders/:id, GET /orders/:id/status
│   └── webhook.controller.js   # POST /webhooks/payos
├── routes/
│   ├── order.routes.js
│   ├── webhook.routes.js
│   └── index.js                 # gộp router, mount vào app.js
├── middlewares/
│   ├── errorHandler.js         # error handler tập trung, không leak stack trace ra response
│   ├── validateCreateOrder.js  # validate shippingInfo + items của POST /orders
│   └── rateLimiter.js          # rate-limit riêng cho POST /orders
├── utils/
│   ├── orderId.js              # sinh orderId "TT-000123" + orderCode số nguyên tương ứng
│   └── asyncHandler.js         # wrap async controller, forward lỗi vào errorHandler
├── jobs/
│   └── expireOrdersSweeper.js  # setInterval quét order pending quá expiresAt → expired
└── scripts/
    └── confirmPayosWebhook.js  # chạy 1 lần thủ công: đăng ký PAYOS_WEBHOOK_URL với PayOS
```

Các thư mục `config/`, `controllers/`, `middlewares/`, `routes/`, `services/`, `utils/`, `public/` đã có sẵn (rỗng, trừ `services/email.service.js` sẽ được viết lại hoàn toàn).

`bcryptjs` và `jsonwebtoken` trong `package.json` hiện không dùng (dự án không có tài khoản/đăng nhập theo đúng phạm vi spec) — sẽ gỡ khỏi `package.json` để tránh nhiễu.

## Dependencies

Thêm:
- `@payos/node` — SDK chính thức PayOS bản mới nhất (yêu cầu Node ≥ 20 — máy bạn đang chạy Node 22, đủ điều kiện). API: `payos.paymentRequests.create()`, `payos.webhooks.verify()`, `payos.webhooks.confirm()`.
- `express-rate-limit` — rate-limit `POST /orders`.

Không thêm (cố tình giữ nhẹ):
- Không cần `axios` — Node 22 có `fetch` built-in, dùng để gọi Apps Script Web App.
- Không cần `exceljs` (đổi sang Google Sheet).
- Không cần ORM/DB driver (dùng JSON file).

Gỡ bỏ: `bcryptjs`, `jsonwebtoken` (không dùng).

## Env vars cần bổ sung vào `.env`

Đã có sẵn: `PORT`, `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `EMAIL_USER`, `EMAIL_PASS`.

Cần thêm:

```
NODE_ENV=development

# Email người nhận
ADMIN_EMAIL=huydq04forwork@gmail.com

# CORS — origin thật của FE (Vite dev mặc định 5173, đổi khi bạn deploy)
CORS_ORIGIN=http://localhost:5173

# URL public của chính backend này — PayOS cần để gọi webhook, và dùng làm return/cancel URL
# Lúc dev local: dùng ngrok (vd https://xxxx.ngrok-free.app), lúc deploy: domain thật
PUBLIC_BASE_URL=http://localhost:1000
PAYOS_WEBHOOK_URL=${PUBLIC_BASE_URL}/webhooks/payos

# URL FE để PayOS redirect sau khi thanh toán xong/hủy trên checkoutUrl (nếu bạn dùng checkoutUrl thay vì tự render QR)
FE_RETURN_URL=http://localhost:5173/checkout/success
FE_CANCEL_URL=http://localhost:5173/cart

# Google Apps Script Web App (mục AppScript setup bên dưới)
GOOGLE_SHEET_WEBHOOK_URL=
GOOGLE_SHEET_WEBHOOK_SECRET=

# Thời hạn QR (phút) nếu PayOS không trả expiredAt — fallback
QR_EXPIRY_MINUTES=15
```

Lưu ý: `.env` hiện KHÔNG có trong `.gitignore` vì repo chưa có `.gitignore` — sẽ tạo `.gitignore` để `.env` không bao giờ bị commit (file này đang chứa API key PayOS + app password Gmail thật).

## Thiết kế chi tiết từng phần

### 1. Order storage (`store/orderStore.js`)
- Đọc toàn bộ `data/orders.json` vào memory khi khởi động (`{ nextSeq: number, orders: { [orderId]: Order } }`).
- Mọi thao tác ghi (create, updateStatus, markPaid) đi qua 1 promise-chain nội bộ (`queue = queue.then(() => ...)`) để tuần tự hoá ghi file — không cần thư viện lock ngoài vì Node đơn luồng, chỉ cần tránh 2 lần `fs.writeFile` chồng nhau.
- Ghi file bằng write-then-rename (ghi ra `orders.json.tmp` rồi `fs.rename`) để không bao giờ để file ở trạng thái hỏng nếu process bị kill giữa chừng.

### 2. Catalog & tính giá (`data/products.js`, `order.service.js`)
- 5 sản phẩm bạn cung cấp (`teu-original`, `teu-long`, `teu-lan`, `teu-quy`, `teu-phung`) với `id`, `name`, `price`.
- `POST /orders`: với mỗi item trong request, backend tra `productId` trong catalog, lấy `price` chuẩn (bỏ qua `price` FE gửi lên), validate `productId` tồn tại + `quantity > 0` (integer). Tính lại `totalAmount = Σ price_catalog * quantity`. Trả về `items` trong response dùng `name`/`price` từ catalog (khớp field name với FE type, giá trị lấy từ backend).

### 3. Tạo order + gọi PayOS (`order.service.js`, `payos.service.js`)
1. Validate `shippingInfo` (email hợp lệ, phone hợp lệ VN, các field required không rỗng) + `items` không rỗng.
2. Sinh `orderId` (`TT-000123`) + `orderCode` (số nguyên, cùng seq) qua `utils/orderId.js`.
3. Tính `totalAmount` từ catalog.
4. Lưu order `status: pending` vào store.
5. Gọi `payos.paymentRequests.create({ orderCode, amount: totalAmount, description, returnUrl: FE_RETURN_URL, cancelUrl: FE_CANCEL_URL, buyerName, buyerEmail, buyerPhone, expiredAt, items })`.
   - Nếu PayOS trả lỗi → cập nhật order `status: failed`, trả lỗi rõ ràng cho FE (không để FE treo).
   - Nếu thành công → lưu `qrCodeText` (field `qrCode` từ response), `checkoutUrl`, `payosPaymentLinkId`, `expiresAt` vào order.
6. Trả `PaymentOrder` đúng shape spec cho FE.

### 4. Webhook (`webhook.controller.js`, `payos.service.js`)
1. `payos.webhooks.verify(req.body)` — nếu throw (chữ ký sai) → trả `200` với body báo lỗi nhẹ nhưng **không** xử lý tiếp (không để lộ chi tiết, không cập nhật order). PayOS khuyến nghị luôn trả 200 nhanh để tránh retry storm, nhưng chỉ xử lý nghiệp vụ khi verify hợp lệ.
2. Lấy `orderCode` từ `data.orderCode` đã verify → tìm order tương ứng trong store.
3. Idempotency: nếu order đã `status === 'paid'` → trả `200 { ok: true }` ngay, không gửi lại email/không ghi lại Sheet.
4. Đối chiếu `data.amount === order.totalAmount` — nếu lệch, log cảnh báo, không đánh dấu `paid`.
5. Nếu khớp: `orderStore.markPaid(orderId, { paidAt, payosTransactionId: data.reference })`, sau đó **song song** (`Promise.allSettled`, lỗi 1 bên không chặn bên kia):
   - `emailService.sendOrderConfirmationEmail(order)`
   - `emailService.sendAdminOrderNotification(order)`
   - `sheetService.appendOrderRow(order)`
6. Trả `200` cho PayOS ngay sau khi `markPaid` xong (không đợi email/sheet) để tránh timeout — 3 tác vụ trên chạy "fire and forget" nhưng có log lỗi nếu fail (không throw làm crash webhook handler).

### 5. Email (`services/email.service.js`)
- Viết lại hoàn toàn 2 hàm hiện tại (`sendOTPEmail`, `sendResetPasswordEmail` — không còn phù hợp phạm vi dự án, sẽ xoá) thành:
  - `sendOrderConfirmationEmail(order)` → gửi tới `order.shippingInfo.email`.
  - `sendAdminOrderNotification(order)` → gửi tới `process.env.ADMIN_EMAIL`.
- Theme email lấy từ `docs/DESIGN.md` ("Imperial Heritage Modern"): nền `#06402B` (Forest Green) cho khối chính, viền 1px `#D4AF37` (Imperial Gold), chữ `#FFF8E7` (Warm Cream), badge/tổng tiền nhấn `#B22222` (Deep Red). Email HTML dùng bảng + inline style (bắt buộc cho tương thích Gmail/Outlook), font-family fallback `Georgia, serif` cho tiêu đề và `Helvetica, Arial, sans-serif` cho nội dung (Playfair Display/Be Vietnam Pro không load được trong hầu hết email client, nên chỉ mô phỏng tinh thần bằng màu sắc + serif tiêu đề, không import font thật).
  - Ghi rõ ràng đây là giả lập phong cách "Imperial Heritage" cho email, không phải bản 100% giống web.
- Nội dung email khách: mã đơn, bảng sản phẩm (tên/số lượng/giá), tổng tiền, thông tin giao hàng, lời cảm ơn bằng tiếng Việt.
- Nội dung email kế toán: mã đơn, tổng tiền, thông tin khách + địa chỉ, mã giao dịch PayOS, link nhanh tới Google Sheet (nếu bạn cho biết link Sheet, tôi gắn cứng vào template).

### 6. Google Sheet qua Apps Script (`services/sheet.service.js`)
- `appendOrderRow(order)`: `fetch(process.env.GOOGLE_SHEET_WEBHOOK_URL, { method: 'POST', body: JSON.stringify({ secret: GOOGLE_SHEET_WEBHOOK_SECRET, orderId, paidAt, ...shippingInfo, itemsSummary, totalAmount, payosTransactionId }) })`.
- Có retry đơn giản (1 lần) nếu request fail do mạng — vì đây không phải đường xác nhận thanh toán (order đã `paid` rồi), lỗi ở bước này chỉ log, không rollback order.

### 7. Expiry sweeper (`jobs/expireOrdersSweeper.js`)
- `setInterval` mỗi 60s: quét toàn bộ order `status === 'pending'` có `expiresAt < now` → chuyển `expired`.
- Đồng thời check "lazy" ngay trong `GET /orders/:id/status` và `GET /orders/:id`: nếu đọc thấy order pending đã hết hạn thì chuyển expired tại chỗ trước khi trả response (đúng theo spec "job định kỳ hoặc kiểm tra lazy").

### 8. Bảo mật
- CORS chỉ mở `CORS_ORIGIN` (không dùng `*`).
- `express-rate-limit` trên `POST /orders` (vd 10 request / phút / IP).
- Validate input chặt ở `POST /orders`.
- Webhook: luôn verify chữ ký trước khi đọc `req.body` nghiệp vụ.
- `.env` vào `.gitignore` ngay từ đầu.
- `config/env.js` fail-fast khi thiếu biến bắt buộc lúc khởi động (thay vì lỗi mơ hồ lúc runtime).

## Các bước thực thi (theo thứ tự)

1. Viết `.gitignore`, cập nhật `.env` (thêm biến mới, giữ nguyên biến cũ).
2. Cập nhật `package.json`: thêm `@payos/node`, `express-rate-limit`; gỡ `bcryptjs`, `jsonwebtoken`; thêm script `dev` (`nodemon server.js`) và `start` (`node server.js`).
3. `npm install`.
4. `config/env.js`, `config/payos.js`, `config/mailer.js`.
5. `data/products.js`.
6. `utils/orderId.js`, `utils/asyncHandler.js`.
7. `store/orderStore.js`.
8. `services/payos.service.js`, `services/order.service.js`.
9. `services/email.service.js` (viết lại hoàn toàn).
10. `services/sheet.service.js`.
11. `middlewares/validateCreateOrder.js`, `middlewares/rateLimiter.js`, `middlewares/errorHandler.js`.
12. `controllers/order.controller.js`, `controllers/webhook.controller.js`.
13. `routes/order.routes.js`, `routes/webhook.routes.js`, `routes/index.js`.
14. `jobs/expireOrdersSweeper.js`.
15. `app.js`, `server.js`.
16. `scripts/confirmPayosWebhook.js` (chạy thủ công sau khi có `PUBLIC_BASE_URL` thật/ngrok).
17. Test thủ công toàn luồng: tạo order → giả lập webhook (script gửi request ký đúng chữ ký test) → kiểm tra order chuyển `paid`, email gửi đúng, Sheet có dòng mới, gọi lại webhook lần 2 → không gửi trùng.
18. Hướng dẫn bạn setup Google Apps Script (mục riêng bên dưới) — phần này bạn phải tự làm trên trình duyệt vì cần đăng nhập Google.

## Hướng dẫn setup Google Apps Script (bạn tự thực hiện)

Mục tiêu: có 1 Web App URL để backend POST dữ liệu đơn hàng vào, ghi thẳng vào Google Sheet dưới tài khoản kế toán.

1. Đăng nhập trình duyệt bằng **huydq04forwork@gmail.com**.
2. Vào Google Sheets → tạo Sheet mới, đặt tên vd `Tễu Tạc - Đơn hàng`.
3. Trong Sheet: **Extensions → Apps Script** (mở trình soạn Apps Script gắn với chính Sheet này).
4. Xoá hết code mẫu trong `Code.gs`, dán đoạn code tôi sẽ cung cấp ở bước build (`sheet.service.js` đi kèm 1 file `docs/appsscript/Code.gs` để bạn copy — tôi sẽ tạo file này khi build, nội dung: đọc `secret` trong body, so với Script Property `WEBHOOK_SECRET`, nếu khớp thì append 1 dòng vào sheet `Orders`, có check trùng `orderId` trước khi ghi để idempotent).
5. **Project Settings** (biểu tượng bánh răng bên trái) → **Script Properties** → **Add script property**: key `WEBHOOK_SECRET`, value = 1 chuỗi ngẫu nhiên bạn tự đặt (vd 32 ký tự) — **giá trị này phải giống hệt** `GOOGLE_SHEET_WEBHOOK_SECRET` trong `.env` phía backend.
6. **Deploy → New deployment**:
   - Type: chọn **Web app**.
   - Description: tuỳ ý (vd "Order webhook v1").
   - Execute as: **Me (huydq04forwork@gmail.com)**.
   - Who has access: **Anyone** — bắt buộc vì backend gọi server-to-server, không có phiên đăng nhập Google để Apps Script xác thực; bảo mật thay vào đó dựa vào `WEBHOOK_SECRET` ở bước 5.
   - Bấm **Deploy**, cấp quyền (authorize) khi được hỏi (đăng nhập lại bằng đúng tài khoản kế toán).
   - Copy **Web app URL** dạng `https://script.google.com/macros/s/XXXXX/exec`.
7. Dán URL đó vào `.env` → `GOOGLE_SHEET_WEBHOOK_URL`, và chuỗi bí mật ở bước 5 vào `GOOGLE_SHEET_WEBHOOK_SECRET`.
8. Test nhanh bằng lệnh sau (thay `<URL>` và `<SECRET>`), phải thấy 1 dòng mới xuất hiện trong Sheet `Orders`:
   ```bash
   curl -X POST "<URL>" -H "Content-Type: application/json" -d '{"secret":"<SECRET>","orderId":"TT-TEST01","paidAt":"2026-08-10T10:00:00.000Z","fullName":"Test","phone":"0900000000","email":"test@example.com","city":"Hà Nội","addressDetail":"123 test","note":"","itemsSummary":"Tễu Long x1","totalAmount":685000,"payosTransactionId":"TEST123"}'
   ```
9. **Mỗi lần sửa lại `Code.gs` sau này**: vào **Deploy → Manage deployments → chọn deployment hiện tại → biểu tượng bút sửa → Version: New version → Deploy**. Không tạo deployment mới nếu muốn giữ nguyên URL cũ (tạo deployment mới sẽ sinh URL khác, phải cập nhật lại `.env`).
10. Sheet này chính là công cụ "xuất báo cáo online" cho kế toán — họ chỉ cần mở link Sheet (share quyền Viewer/Editor cho ai cần) để xem/lọc/pivot, không cần đụng vào code hay server.

## Xác nhận trước khi build

Tôi sẽ build theo đúng thứ tự 18 bước trên. Điểm cần bạn xác nhận lại (nếu muốn đổi, nói trước khi tôi bắt đầu viết code):

- Port BE: giữ `1000` như `.env` hiện tại?
- CORS_ORIGIN mặc định `http://localhost:5173` (Vite) — đúng port FE bạn đang chạy chứ?
- `PAYOS_WEBHOOK_URL`/`PUBLIC_BASE_URL`: lúc dev chưa có domain public, tôi để placeholder `http://localhost:1000` — bạn cần chạy `ngrok http 1000` (hoặc tương đương) rồi chạy `scripts/confirmPayosWebhook.js` để đăng ký webhook thật với PayOS khi test webhook thật; nếu chỉ test nội bộ bằng cách tự POST giả webhook thì không cần bước này ngay.
