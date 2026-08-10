# Hướng dẫn chạy dự án

## 1. Chạy local (dev)

Cần 3 terminal chạy song song.

**Terminal 1 — ngrok** (tạo URL public để PayOS gọi được webhook vào máy bạn):
```bash
ngrok http 1000
```
Copy dòng `Forwarding` (dạng `https://xxxx.ngrok-free.app` hoặc `.ngrok-free.dev`).

**Cập nhật `.env`** với URL vừa copy:
```
PUBLIC_BASE_URL=https://xxxx.ngrok-free.app
PAYOS_WEBHOOK_URL=https://xxxx.ngrok-free.app/webhooks/payos
```

**Terminal 2 — đăng ký webhook với PayOS** (chỉ cần chạy lại mỗi khi URL ngrok đổi):
```bash
npm run confirm-webhook
```
Thành công sẽ in ra thông tin tài khoản ngân hàng nhận tiền — nếu lỗi, kiểm tra lại `PAYOS_WEBHOOK_URL` trong `.env` và ngrok ở Terminal 1 còn chạy không.

**Terminal 3 — chạy backend**:
```bash
npm run dev
```
Server chạy ở `http://localhost:1000` (đúng `PORT` trong `.env`). FE gọi API vẫn dùng `http://localhost:1000` bình thường — chỉ webhook PayOS mới cần đi qua URL ngrok, không ảnh hưởng cách FE gọi `POST /orders`, `GET /orders/:id`, v.v.

**Test nhanh:**
```bash
curl http://localhost:1000/health
```

### Lưu ý
- ngrok bản miễn phí sinh URL **mới mỗi lần chạy lại lệnh `ngrok http 1000`** (trừ khi bạn trả phí để có reserved domain cố định). Mỗi lần URL đổi → phải sửa lại `.env` và chạy lại `npm run confirm-webhook`.
- Nếu chỉ cần test logic nghiệp vụ (không cần webhook thật từ PayOS gọi vào), có thể bỏ qua Terminal 1 & 2, chỉ chạy Terminal 3 rồi tự gửi request giả lập webhook có chữ ký hợp lệ (xem cách ký ở `services/payos.service.js` — dùng `payos.crypto.createSignatureFromObj(data, checksumKey)`).
- File `data/orders.json` là nơi lưu order — xoá file này để reset dữ liệu test local, server sẽ tự tạo lại file rỗng khi khởi động.

## 2. Deploy lên Render (khi triển khai thật)

### Setup service
- Tạo **Web Service** trên Render, connect repo Git.
- Build command: `npm install`
- Start command: `npm start` (chạy `node server.js`)
- Node version: 22.x (khớp yêu cầu của `@payos/node`, khai báo trong Render qua biến `NODE_VERSION=22` hoặc file `.node-version`/`engines` trong `package.json` nếu muốn ép chính xác).
- Render tự cấp biến `PORT` — code đã đọc `process.env.PORT` sẵn (`config/env.js`), **không cần sửa gì**.

### Env vars trên Render
Copy toàn bộ nội dung `.env` hiện tại vào mục **Environment** trên Render dashboard (không commit `.env` lên git — đã có trong `.gitignore`). Riêng các biến sau **phải đổi** thành domain thật thay vì localhost/ngrok:

| Biến | Giá trị mới |
|---|---|
| `PUBLIC_BASE_URL` | `https://<ten-app>.onrender.com` |
| `PAYOS_WEBHOOK_URL` | `https://<ten-app>.onrender.com/webhooks/payos` |
| `CORS_ORIGIN` | domain FE thật (vd `https://teutac.vn`) |
| `FE_RETURN_URL` | `https://teutac.vn/checkout/success` |
| `FE_CANCEL_URL` | `https://teutac.vn/cart` |

Các biến **giữ nguyên, không đổi**: `PAYOS_CLIENT_ID/API_KEY/CHECKSUM_KEY`, `EMAIL_USER/PASS`, `ADMIN_EMAIL`, `GOOGLE_SHEET_WEBHOOK_URL`, `GOOGLE_SHEET_WEBHOOK_SECRET`, `QR_EXPIRY_MINUTES`.

**Về phía Google Apps Script: không cần cấu hình lại gì cả.** Apps Script Web App là 1 endpoint HTTP độc lập, không quan tâm backend đang chạy ở localhost, ngrok hay Render — nó chỉ nhận `POST` kèm đúng `secret`. Chỉ backend đổi chỗ chạy, còn Sheet/Apps Script đứng yên.

### Đăng ký webhook thật sau khi deploy
Sau khi Render deploy xong và có domain `https://<ten-app>.onrender.com`, cần đăng ký URL này với PayOS (giống bước ngrok ở local nhưng làm 1 lần rồi thôi vì domain Render cố định):
- Cách an toàn nhất: mở **Shell** của service trên Render dashboard, chạy `npm run confirm-webhook` trực tiếp trên server (không cần đem `PAYOS_API_KEY`/`CHECKSUM_KEY` ra máy local).
- Hoặc chạy script này từ máy local với `.env` local trỏ tạm `PAYOS_WEBHOOK_URL` sang domain Render rồi `npm run confirm-webhook` — chỉ cần API key/checksum key đúng, không cần server chạy ở local.

### ⚠️ Hai điều cần biết trước khi deploy thật (ảnh hưởng trực tiếp đến việc nhận tiền)

**1. `data/orders.json` không persist trên Render (đĩa ephemeral).**
Mỗi lần Render redeploy/restart service, filesystem bị reset về đúng nội dung trong Git — nghĩa là toàn bộ order (kể cả đang `pending`) sẽ mất, và nếu Render tự scale ra nhiều instance thì mỗi instance có file riêng, dữ liệu không đồng bộ giữa các instance. Hai hướng xử lý:
- **Đơn giản, đủ cho quy mô hiện tại**: bật **Render Persistent Disk** (tính phí thêm theo dung lượng), mount vào thư mục chứa `data/`, và **chỉ chạy đúng 1 instance** (không bật auto-scale) để tránh xung đột ghi file giữa các instance.
- **Chuẩn hơn về sau**: khi lượng đơn tăng hoặc cần chạy nhiều instance, thay `store/orderStore.js` bằng 1 DB thật (SQLite trên Render Disk, hoặc Postgres managed của Render) — chưa cần làm ngay, chỉ ghi chú để biết giới hạn hiện tại.

**2. Gói Free của Render tự "ngủ" sau ~15 phút không có traffic.**
Request đầu tiên sau khi ngủ mất vài chục giây để server "thức dậy" — nếu đúng lúc đó PayOS gọi webhook báo thanh toán thành công, request có thể bị timeout và bạn mất thông báo thanh toán (khách đã trả tiền nhưng order không tự chuyển `paid`). Vì đây là service xử lý thanh toán thật (tiền thật), nên:
- Ưu tiên dùng gói trả phí "always-on" của Render cho service này, hoặc
- Nếu vẫn dùng gói Free, gắn thêm 1 cron ping `GET /health` mỗi 5–10 phút (vd qua cron-job.org hoặc UptimeRobot) để giữ server không ngủ — không lý tưởng bằng gói trả phí nhưng giảm rủi ro.

## 3. Checklist mỗi lần đổi domain public backend (ngrok mới / chuyển sang Render / đổi domain)

- [ ] Cập nhật `PUBLIC_BASE_URL` và `PAYOS_WEBHOOK_URL` trong `.env` (hoặc Environment trên Render).
- [ ] Restart server để load `.env` mới.
- [ ] Chạy `npm run confirm-webhook` để đăng ký lại URL webhook với PayOS.
- [ ] Test 1 đơn thật (hoặc giả lập webhook) để chắc chắn `paid` → email + Sheet vẫn chạy đúng.
- [ ] Không cần đụng gì đến Apps Script / Google Sheet.
