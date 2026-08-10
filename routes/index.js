const express = require('express');

const router = express.Router();

router.use('/orders', require('./order.routes'));
router.use('/webhooks', require('./webhook.routes'));

module.exports = router;
