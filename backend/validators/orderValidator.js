const { body, query } = require('express-validator');

const createOrderValidator = [
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product_id').isInt({ min: 1 }).withMessage('Valid product ID required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('shipping_name').trim().notEmpty().withMessage('Shipping name is required'),
  body('shipping_phone').trim().notEmpty().withMessage('Shipping phone is required'),
  body('shipping_address_line1').trim().notEmpty().withMessage('Address is required'),
  body('shipping_city').trim().notEmpty().withMessage('City is required'),
  body('shipping_state').trim().notEmpty().withMessage('State is required'),
  body('shipping_pincode').trim().notEmpty().withMessage('Pincode is required'),
  body('shipping_address_line2').optional().trim(),
  body('shipping_country').optional().trim(),
  body('payment_method').trim().notEmpty().withMessage('Payment method is required'),
  body('coupon_code').optional().trim(),
  body('notes').optional().trim()
];

const updateOrderStatusValidator = [
  body('status').isIn(['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED']).withMessage('Invalid status')
];

const orderQueryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn(['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED']).withMessage('Invalid status')
];

module.exports = {
  createOrderValidator,
  updateOrderStatusValidator,
  orderQueryValidator
};