const { MongoClient } = require('mongodb');
const env = require('./env');

const client = new MongoClient(env.mongodbUri);
let db;

async function connectDb() {
  if (db) return db;
  await client.connect();
  db = client.db('my_teu_tac');
  await Promise.all([
    db.collection('orders').createIndex({ orderId: 1 }, { unique: true }),
    db.collection('orders').createIndex({ orderCode: 1 }, { unique: true }),
    db.collection('orders').createIndex({ status: 1 }),
  ]);
  return db;
}

function getDb() {
  if (!db) throw new Error('DB chưa kết nối — gọi connectDb() trước');
  return db;
}

module.exports = { connectDb, getDb };
