const { body, query } = require('express-validator');

const createProductValidator = [
  body('name').trim().notEmpty().withMessage('Product name is required').isLength({ min: 3, max: 200 }).withMessage('Name must be between 3 and 200 characters'),
  body('description').trim().notEmpty().withMessage('Description is required').isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('discount_percent').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
  body('stock').isInt({ min: 0 }).withMessage('Valid stock quantity is required'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category is required'),
  body('brand').optional().trim().isLength({ max: 100 }).withMessage('Brand name too long'),
  body('warranty_info').optional().trim(),
  body('shipping_info').optional().trim()
];

const updateProductValidator = [
  body('name').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Name must be between 3 and 200 characters'),
  body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Valid price is required'),
  body('discount_percent').optional().isFloat({ min: 0, max: 100 }).withMessage('Discount must be between 0 and 100'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Valid stock quantity is required'),
  body('category_id').optional().isInt({ min: 1 }).withMessage('Valid category is required'),
  body('brand').optional().trim().isLength({ max: 100 }),
  body('warranty_info').optional().trim(),
  body('shipping_info').optional().trim()
];

const productQueryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('category').optional().trim(),
  query('search').optional().trim(),
  query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
  query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
  query('sort').optional().isIn(['newest', 'price_asc', 'price_desc', 'rating', 'popularity']).withMessage('Invalid sort option'),
  query('status').optional().isIn(['DRAFT', 'PENDING', 'ACTIVE', 'REJECTED', 'INACTIVE']).withMessage('Invalid status')
];

module.exports = {
  createProductValidator,
  updateProductValidator,
  productQueryValidator
};