const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const { upload } = require('../middleware/uploadMiddleware');

const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, minPrice, maxPrice, sort = 'newest' } = req.query;
    
    const result = await Product.getAll({
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      search,
      minPrice: parseFloat(minPrice) || 0,
      maxPrice: parseFloat(maxPrice) || 0,
      sort,
      status: 'ACTIVE'
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Failed to get products' });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (product.status !== 'ACTIVE' && req.user?.role !== 'ADMIN' && req.user?.id !== product.seller_id) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    const reviews = await Review.getProductReviews(product.id, { page: 1, limit: 5 });
    const canReview = req.user ? await Review.canUserReview(req.user.id, product.id) : null;
    
    res.json({
      success: true,
      data: {
        product,
        reviews: reviews.reviews,
        canReview: !!canReview
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Failed to get product' });
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (product.status !== 'ACTIVE' && req.user?.role !== 'ADMIN' && req.user?.id !== product.seller_id) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    const reviews = await Review.getProductReviews(product.id, { page: 1, limit: 5 });
    const canReview = req.user ? await Review.canUserReview(req.user.id, product.id) : null;
    
    res.json({
      success: true,
      data: {
        product,
        reviews: reviews.reviews,
        canReview: !!canReview
      }
    });
  } catch (error) {
    console.error('Get product by slug error:', error);
    res.status(500).json({ success: false, message: 'Failed to get product' });
  }
};

const createProduct = async (req, res) => {
  try {
    const images = req.files ? req.files.map(f => `/uploads/products/${f.filename}`) : [];
    
    const product = await Product.create({
      ...req.body,
      seller_id: req.user.id,
      images
    });
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully. Pending admin approval.',
      data: { product }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const images = req.files ? req.files.map(f => `/uploads/products/${f.filename}`) : [];
    
    let product = await Product.update(req.params.id, req.body, req.user.role !== 'ADMIN' ? req.user.id : null);
    
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    
    if (images.length > 0) {
      await Product.updateImages(product.id, images);
      product = await Product.findById(product.id);
    }
    
    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.delete(req.params.id, req.user.role !== 'ADMIN' ? req.user.id : null);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Product not found or unauthorized' });
    }
    
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
};

const getSellerProducts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const result = await Product.getAll({
      page: parseInt(page),
      limit: parseInt(limit),
      status: status || 'ACTIVE',
      seller_id: req.user.id
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get seller products error:', error);
    res.status(500).json({ success: false, message: 'Failed to get products' });
  }
};

const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.getLowStock(5, req.user.id);
    res.json({ success: true, data: { products } });
  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ success: false, message: 'Failed to get low stock products' });
  }
};

const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No images uploaded' });
    }
    
    const images = req.files.map(f => `/uploads/products/${f.filename}`);
    res.json({ success: true, message: 'Images uploaded', data: { images } });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload images' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerProducts,
  getLowStockProducts,
  uploadImages
};