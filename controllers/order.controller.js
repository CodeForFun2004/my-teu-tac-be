const orderService = require('../services/order.service');
const asyncHandler = require('../utils/asyncHandler');

const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.body);
  res.status(201).json(order);
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.orderId);
  res.json(order);
});

const getOrderStatus = asyncHandler(async (req, res) => {
  const status = await orderService.getOrderStatus(req.params.orderId);
  res.json(status);
});

module.exports = { createOrder, getOrder, getOrderStatus };
