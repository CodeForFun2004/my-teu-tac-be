const express = require('express');
const orderController = require('../controllers/order.controller');
const validateCreateOrder = require('../middlewares/validateCreateOrder');
const { createOrderLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

router.post('/', createOrderLimiter, validateCreateOrder, orderController.createOrder);
router.get('/:orderId/status', orderController.getOrderStatus);
router.get('/:orderId', orderController.getOrder);

module.exports = router;
