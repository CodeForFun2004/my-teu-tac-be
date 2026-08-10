const express = require('express');
const webhookController = require('../controllers/webhook.controller');

const router = express.Router();

router.post('/payos', webhookController.handlePayosWebhook);

module.exports = router;
