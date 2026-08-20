const User = require('../models/User');
const Address = require('../models/Address');
const { Order } = require('../models/Order');
const Wishlist = require('../models/Wishlist');
const Cart = require('../models/Cart');
const Review = require('../models/Review');
const Notification = require('../models/Notification');
const { generateInvoice } = require('../utils/invoice');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    const addresses = await Address.getUserAddresses(req.user.id);
    const defaultAddress = await Address.getDefaultAddress(req.user.id);
    
    res.json({
      success: true,
      data: {
        user,
        addresses,
        defaultAddress
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to get profile' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;
    const user = await User.update(req.user.id, { name, phone });
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

const getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const result = await Order.getUserOrders(req.user.id, { page: parseInt(page), limit: parseInt(limit), status });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Failed to get orders' });
  }
};

const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (order.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    res.json({
      success: true,
      data: { order }
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Failed to get order' });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const order = await Order.cancel(req.params.id, req.user.id);
    
    await Notification.createOrderNotification(req.user.id, req.params.id, 'CANCELLED');
    
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    
    if (order.user_id !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    if (order.payment_status !== 'SUCCESS') {
      return res.status(400).json({ success: false, message: 'Invoice available only for paid orders' });
    }
    
    const pdfBuffer = await generateInvoice(order);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.order_id}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate invoice' });
  }
};

const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.getUserAddresses(req.user.id);
    res.json({ success: true, data: { addresses } });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ success: false, message: 'Failed to get addresses' });
  }
};

const createAddress = async (req, res) => {
  try {
    const address = await Address.create({ userId: req.user.id, ...req.body });
    res.status(201).json({ success: true, message: 'Address added', data: { address } });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ success: false, message: 'Failed to add address' });
  }
};

const updateAddress = async (req, res) => {
  try {
    const address = await Address.update(req.params.id, req.user.id, req.body);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }
    res.json({ success: true, message: 'Address updated', data: { address } });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ success: false, message: 'Failed to update address' });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const deleted = await Address.delete(req.params.id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }
    res.json({ success: true, message: 'Address deleted' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete address' });
  }
};

const setDefaultAddress = async (req, res) => {
  try {
    const address = await Address.setDefault(req.params.id, req.user.id);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }
    res.json({ success: true, message: 'Default address updated', data: { address } });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({ success: false, message: 'Failed to set default address' });
  }
};

const getWishlist = async (req, res) => {
  try {
    const items = await Wishlist.getWishlistItems(req.user.id);
    res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to get wishlist' });
  }
};

const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const items = await Wishlist.addItem(req.user.id, productId);
    res.json({ success: true, message: 'Added to wishlist', data: { items } });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(400).json({ success: false, message: error.message });
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const items = await Wishlist.removeItem(req.user.id, req.params.productId);
    res.json({ success: true, message: 'Removed from wishlist', data: { items } });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove from wishlist' });
  }
};

const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const result = await Notification.getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      unreadOnly: unreadOnly === 'true'
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, message: 'Failed to get notifications' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    await Notification.markAsRead(req.params.id, req.user.id);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification' });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.markAllAsRead(req.user.id);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notifications' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getOrders,
  getOrderById,
  cancelOrder,
  downloadInvoice,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};