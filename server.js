const app = require('./app');
const env = require('./config/env');
const { connectDb } = require('./config/db');
const { startExpireOrdersSweeper } = require('./jobs/expireOrdersSweeper');

connectDb()
  .then(() => {
    startExpireOrdersSweeper();
    app.listen(env.port, () => {
      console.log(`[server] Tễu Tạc backend đang chạy tại http://localhost:${env.port}`);
    });
  })
  .catch((err) => {
    console.error('[server] Không kết nối được MongoDB, dừng khởi động:', err);
    process.exit(1);
  });
