require('dotenv').config({ quiet: true });

const REQUIRED_VARS = [
  'PAYOS_CLIENT_ID',
  'PAYOS_API_KEY',
  'PAYOS_CHECKSUM_KEY',
  'EMAIL_USER',
  'EMAIL_PASS',
  'ADMIN_EMAIL',
  'CORS_ORIGIN',
  'PUBLIC_BASE_URL',
  'PAYOS_WEBHOOK_URL',
  'FE_RETURN_URL',
  'FE_CANCEL_URL',
  'MONGODB_URI',
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Thiếu biến môi trường bắt buộc trong .env: ${missing.join(', ')}`);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,

  payos: {
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    webhookUrl: process.env.PAYOS_WEBHOOK_URL,
  },

  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    adminEmail: process.env.ADMIN_EMAIL,
  },

  mongodbUri: process.env.MONGODB_URI,

  corsOrigin: process.env.CORS_ORIGIN,
  publicBaseUrl: process.env.PUBLIC_BASE_URL,
  feReturnUrl: process.env.FE_RETURN_URL,
  feCancelUrl: process.env.FE_CANCEL_URL,

  googleSheet: {
    webhookUrl: process.env.GOOGLE_SHEET_WEBHOOK_URL || '',
    webhookSecret: process.env.GOOGLE_SHEET_WEBHOOK_SECRET || '',
  },

  qrExpiryMinutes: Number(process.env.QR_EXPIRY_MINUTES) || 15,
};
