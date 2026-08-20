const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class Order {
  static generateOrderId() {
    return `SV-${Math.floor(10000 + Math.random() * 90000)}-${new Date().getFullYear()}`;
  }

  static async create(orderData) {
    const orderId = this.generateOrderId();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const [orderResult] = await connection.query(
        `INSERT INTO orders (
          order_id, user_id, status, subtotal, discount, shipping, tax, total,
          coupon_code, coupon_discount, payment_status, payment_method,
          shipping_name, shipping_phone, shipping_address_line1, shipping_address_line2,
          shipping_city, shipping_state, shipping_pincode, shipping_country, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId, orderData.userId, 'PLACED', orderData.subtotal, orderData.discount,
          orderData.shipping, orderData.tax, orderData.total,
          orderData.couponCode, orderData.couponDiscount, 'PENDING', orderData.paymentMethod,
          orderData.shippingName, orderData.shippingPhone, orderData.shippingAddress1,
          orderData.shippingAddress2, orderData.shippingCity, orderData.shippingState,
          orderData.shippingPincode, orderData.shippingCountry, orderData.notes
        ]
      );
      
      const orderDbId = orderResult.insertId;
      
      for (const item of orderData.items) {
        const price = item.price * (1 - (item.discount_percent || 0) / 100);
        const subtotal = price * item.quantity;
        
        await connection.query(
          `INSERT INTO order_items (order_id, product_id, seller_id, product_name, product_price, product_discount, quantity, subtotal, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PLACED')`,
          [orderDbId, item.productId, item.sellerId, item.name, item.price, item.discount_percent || 0, item.quantity, subtotal]
        );
        
        await connection.query(
          `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
          [item.quantity, item.productId, item.quantity]
        );
      }
      
      await connection.commit();
      return this.findById(orderDbId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.id = ?`,
      [id]
    );
    
    if (!rows[0]) return null;
    
    const order = rows[0];
    order.items = await OrderItem.findByOrderId(order.id);
    return order;
  }

  static async findByOrderId(orderId) {
    const [rows] = await pool.query(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.order_id = ?`,
      [orderId]
    );
    
    if (!rows[0]) return null;
    
    const order = rows[0];
    order.items = await OrderItem.findByOrderId(order.id);
    return order;
  }

  static async getUserOrders(userId, { page = 1, limit = 10, status = '' } = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE o.user_id = ?';
    const params = [userId];
    
    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }
    
    const [rows] = await pool.query(
      `SELECT o.* FROM orders o ${whereClause} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      params
    );
    
    for (const order of rows) {
      order.items = await OrderItem.findByOrderId(order.id);
    }
    
    return {
      orders: rows,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  static async getSellerOrders(sellerId, { page = 1, limit = 10, status = '' } = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE oi.seller_id = ?';
    const params = [sellerId];
    
    if (status) {
      whereClause += ' AND oi.status = ?';
      params.push(status);
    }
    
    const [rows] = await pool.query(
      `SELECT DISTINCT o.*, u.name as user_name, u.email as user_email
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const [countResult] = await pool.query(
      `SELECT COUNT(DISTINCT o.id) as total FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       ${whereClause}`,
      params
    );
    
    for (const order of rows) {
      order.items = await OrderItem.findByOrderId(order.id, sellerId);
    }
    
    return {
      orders: rows,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  static async getAllOrders({ page = 1, limit = 20, status = '', search = '' } = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }
    if (search) {
      whereClause += ' AND (o.order_id LIKE ? OR u.name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const [rows] = await pool.query(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ${whereClause}
       ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM orders o
       JOIN users u ON o.user_id = u.id
       ${whereClause}`,
      params
    );
    
    for (const order of rows) {
      order.items = await OrderItem.findByOrderId(order.id);
    }
    
    return {
      orders: rows,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  static async updateStatus(orderId, status) {
    const updates = ['status = ?'];
    const values = [status];
    
    const statusTimestamps = {
      'CONFIRMED': 'confirmed_at',
      'SHIPPED': 'shipped_at',
      'DELIVERED': 'delivered_at',
      'CANCELLED': 'cancelled_at'
    };
    
    if (statusTimestamps[status]) {
      updates.push(`${statusTimestamps[status]} = CURRENT_TIMESTAMP`);
    }
    
    values.push(orderId);
    await pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, values);
    
    await pool.query(`UPDATE order_items SET status = ? WHERE order_id = ?`, [status, orderId]);
    
    return this.findById(orderId);
  }

  static async updatePaymentStatus(orderId, paymentStatus, paymentData = {}) {
    const updates = ['payment_status = ?'];
    const values = [paymentStatus];
    
    if (paymentData.paymentId) {
      updates.push('payment_id = ?');
      values.push(paymentData.paymentId);
    }
    if (paymentData.paymentMethod) {
      updates.push('payment_method = ?');
      values.push(paymentData.paymentMethod);
    }
    
    values.push(orderId);
    await pool.query(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`, values);
    
    if (paymentStatus === 'SUCCESS') {
      await pool.query(`UPDATE order_items SET status = 'CONFIRMED' WHERE order_id = ?`, [orderId]);
    }
    
    return this.findById(orderId);
  }

  static async cancel(orderId, userId) {
    const order = await this.findById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.user_id !== userId) throw new Error('Unauthorized');
    
    const cancellableStatuses = ['PLACED', 'CONFIRMED'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new Error('Order cannot be cancelled at this stage');
    }
    
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      
      for (const item of order.items) {
        await connection.query(
          `UPDATE products SET stock = stock + ? WHERE id = ?`,
          [item.quantity, item.product_id]
        );
      }
      
      await connection.query(`UPDATE orders SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP WHERE id = ?`, [orderId]);
      await connection.query(`UPDATE order_items SET status = 'CANCELLED' WHERE order_id = ?`, [orderId]);
      
      await connection.commit();
      return this.findById(orderId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

class OrderItem {
  static async findByOrderId(orderId, sellerId = null) {
    let query = `SELECT oi.*, p.thumbnail FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?`;
    const params = [orderId];
    
    if (sellerId) {
      query += ` AND oi.seller_id = ?`;
      params.push(sellerId);
    }
    
    const [rows] = await pool.query(query, params);
    return rows;
  }

  static async updateStatus(orderItemId, status, sellerId = null) {
    let query = `UPDATE order_items SET status = ? WHERE id = ?`;
    const params = [status, orderItemId];
    
    if (sellerId) {
      query += ` AND seller_id = ?`;
      params.push(sellerId);
    }
    
    await pool.query(query, params);
    
    const [rows] = await pool.query(`SELECT * FROM order_items WHERE id = ?`, [orderItemId]);
    return rows[0];
  }

  static async getSellerOrderItems(sellerId, orderId) {
    const [rows] = await pool.query(
      `SELECT oi.*, p.thumbnail FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ? AND oi.seller_id = ?`,
      [orderId, sellerId]
    );
    return rows;
  }
}

module.exports = { Order, OrderItem };