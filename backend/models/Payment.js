const { pool } = require('../config/database');

class Payment {
  static async create(paymentData) {
    const [result] = await pool.query(
      `INSERT INTO payments (
        payment_id, order_id, user_id, amount, currency, status, method, gateway,
        gateway_order_id, gateway_payment_id, gateway_signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        paymentData.paymentId, paymentData.orderId, paymentData.userId,
        paymentData.amount, paymentData.currency || 'INR', paymentData.status || 'PENDING',
        paymentData.method, paymentData.gateway || 'razorpay',
        paymentData.gatewayOrderId, paymentData.gatewayPaymentId, paymentData.gatewaySignature
      ]
    );
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query(`SELECT * FROM payments WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  static async findByPaymentId(paymentId) {
    const [rows] = await pool.query(`SELECT * FROM payments WHERE payment_id = ?`, [paymentId]);
    return rows[0] || null;
  }

  static async findByOrderId(orderId) {
    const [rows] = await pool.query(`SELECT * FROM payments WHERE order_id = ?`, [orderId]);
    return rows[0] || null;
  }

  static async updateStatus(paymentId, status, gatewayData = {}) {
    const updates = ['status = ?'];
    const values = [status];
    
    if (gatewayData.gatewayPaymentId) {
      updates.push('gateway_payment_id = ?');
      values.push(gatewayData.gatewayPaymentId);
    }
    if (gatewayData.gatewaySignature) {
      updates.push('gateway_signature = ?');
      values.push(gatewayData.gatewaySignature);
    }
    
    values.push(paymentId);
    await pool.query(`UPDATE payments SET ${updates.join(', ')} WHERE payment_id = ?`, values);
    return this.findByPaymentId(paymentId);
  }

  static async processRefund(paymentId, refundId, refundAmount) {
    await pool.query(
      `UPDATE payments SET refund_id = ?, refund_amount = ?, refund_status = 'PROCESSED', status = 'REFUNDED' WHERE payment_id = ?`,
      [refundId, refundAmount, paymentId]
    );
    return this.findByPaymentId(paymentId);
  }

  static async getUserPayments(userId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT p.*, o.order_id FROM payments p JOIN orders o ON p.order_id = o.id WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );
    
    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM payments WHERE user_id = ?`, [userId]);
    
    return {
      payments: rows,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }
}

module.exports = Payment;