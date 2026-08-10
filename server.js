const app = require('./app');
const env = require('./config/env');
const { startExpireOrdersSweeper } = require('./jobs/expireOrdersSweeper');

startExpireOrdersSweeper();

app.listen(env.port, () => {
  console.log(`[server] Tễu Tạc backend đang chạy tại http://localhost:${env.port}`);
});
