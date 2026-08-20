const { pool } = require('../config/database');

class Notification {
  static async create({ userId, type, title, message, referenceId, referenceType }) {
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id, reference_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, type, title, message, referenceId, referenceType]
    );
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query(`SELECT * FROM notifications WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  static async getUserNotifications(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE user_id = ?';
    const params = [userId];
    
    if (unreadOnly) {
      whereClause += ' AND is_read = FALSE';
    }
    
    const [rows] = await pool.query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
      params
    );
    
    const [unreadCount] = await pool.query(
      `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE`,
      [userId]
    );
    
    return {
      notifications: rows,
      total: countResult[0].total,
      unreadCount: unreadCount[0].count,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  static async markAsRead(id, userId) {
    await pool.query(`UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`, [id, userId]);
    return this.findById(id);
  }

  static async markAllAsRead(userId) {
    await pool.query(`UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE`, [userId]);
    return true;
  }

  static async delete(id, userId) {
    await pool.query(`DELETE FROM notifications WHERE id = ? AND user_id = ?`, [id, userId]);
    return true;
  }

  static async createOrderNotification(userId, orderId, status) {
    const messages = {
      'PLACED': { title: 'Order Placed', message: 'Your order has been placed successfully.' },
      'CONFIRMED': { title: 'Order Confirmed', message: 'Your order has been confirmed and is being processed.' },
      'PACKED': { title: 'Order Packed', message: 'Your order has been packed and will be shipped soon.' },
      'SHIPPED': { title: 'Order Shipped', message: 'Your order has been shipped and is on the way.' },
      'OUT_FOR_DELIVERY': { title: 'Out for Delivery', message: 'Your order is out for delivery.' },
      'DELIVERED': { title: 'Order Delivered', message: 'Your order has been delivered successfully.' },
      'CANCELLED': { title: 'Order Cancelled', message: 'Your order has been cancelled.' }
    };
    
    const msg = messages[status] || { title: 'Order Update', message: `Your order status has been updated to ${status}.` };
    return this.create({ userId, type: 'ORDER', title: msg.title, message: msg.message, referenceId: orderId, referenceType: 'ORDER' });
  }

  static async createSellerNotification(sellerId, type, data) {
    const messages = {
      'NEW_ORDER': { title: 'New Order Received', message: `You have a new order #${data.orderId}` },
      'PRODUCT_APPROVED': { title: 'Product Approved', message: `Your product "${data.productName}" has been approved.` },
      'PRODUCT_REJECTED': { title: 'Product Rejected', message: `Your product "${data.productName}" was rejected.` },
      'LOW_STOCK': { title: 'Low Stock Alert', message: `Product "${data.productName}" is running low (${data.stock} left).` },
      'SELLER_APPROVED': { title: 'Seller Account Approved', message: 'Your seller application has been approved!' },
      'SELLER_REJECTED': { title: 'Seller Application Rejected', message: 'Your seller application was rejected.' }
    };
    
    const msg = messages[type] || { title: 'Notification', message: 'You have a new notification.' };
    return this.create({ userId: sellerId, type, title: msg.title, message: msg.message, referenceId: data.referenceId, referenceType: type });
  }
}

module.exports = Notification;