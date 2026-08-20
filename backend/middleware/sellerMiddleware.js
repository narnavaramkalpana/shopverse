const SellerProfile = require('../models/SellerProfile');

const sellerMiddleware = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  
  if (req.user.role !== 'SELLER' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Seller access required' });
  }
  
  if (req.user.role === 'SELLER') {
    const sellerProfile = await SellerProfile.findByUserId(req.user.id);
    if (!sellerProfile || sellerProfile.status !== 'APPROVED') {
      return res.status(403).json({ success: false, message: 'Seller account not approved' });
    }
    req.sellerProfile = sellerProfile;
  }
  
  next();
};

module.exports = sellerMiddleware;