// Chạy 1 lần thủ công để đăng ký PAYOS_WEBHOOK_URL với PayOS: `npm run confirm-webhook`.
// Yêu cầu PAYOS_WEBHOOK_URL trong .env phải là URL public thật (ngrok lúc dev, domain thật lúc prod)
// vì PayOS sẽ gửi 1 request kiểm tra tới URL này trước khi đăng ký thành công.
const payos = require('../config/payos');
const env = require('../config/env');

async function main() {
  console.log(`Đang đăng ký webhook: ${env.payos.webhookUrl}`);
  const result = await payos.webhooks.confirm(env.payos.webhookUrl);
  console.log('Đăng ký thành công:', result);
}

main().catch((err) => {
  console.error('Đăng ký webhook thất bại:', err);
  process.exit(1);
});
