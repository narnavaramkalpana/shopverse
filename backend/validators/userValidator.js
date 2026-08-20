const { body, query } = require('express-validator');

const updateProfileValidator = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('phone').optional().isMobilePhone('en-IN').withMessage('Valid Indian phone number required')
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
];

const addressValidator = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required').isMobilePhone('en-IN').withMessage('Valid Indian phone number required'),
  body('address_line1').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('state').trim().notEmpty().withMessage('State is required'),
  body('pincode').trim().notEmpty().withMessage('Pincode is required').isPostalCode('IN').withMessage('Valid Indian pincode required'),
  body('address_line2').optional().trim(),
  body('country').optional().trim(),
  body('address_type').optional().isIn(['HOME', 'WORK', 'OTHER']).withMessage('Invalid address type'),
  body('is_default').optional().isBoolean().withMessage('is_default must be boolean')
];

module.exports = {
  updateProfileValidator,
  changePasswordValidator,
  addressValidator
};