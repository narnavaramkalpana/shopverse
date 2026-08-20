const { pool } = require('../config/database');

class Coupon {
  static async create({ code, description, discountType, discountValue, minOrderAmount, maxDiscountAmount, usageLimit, userLimit, startDate, expiryDate }) {
    const [result] = await pool.query(
      `INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount_amount, usage_limit, user_limit, start_date, expiry_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [code.toUpperCase(), description, discountType, discountValue, minOrderAmount || 0, maxDiscountAmount, usageLimit || 0, userLimit || 1, startDate, expiryDate]
    );
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query(`SELECT * FROM coupons WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  static async findByCode(code) {
    const [rows] = await pool.query(`SELECT * FROM coupons WHERE code = ?`, [code.toUpperCase()]);
    return rows[0] || null;
  }

  static async getAll({ page = 1, limit = 20, status = '' } = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    const [rows] = await pool.query(
      `SELECT * FROM coupons ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM coupons ${whereClause}`, params);
    
    return {
      coupons: rows,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  static async update(id, data) {
    const allowedFields = ['description', 'discount_type', 'discount_value', 'min_order_amount', 'max_discount_amount', 'usage_limit', 'user_limit', 'start_date', 'expiry_date', 'status'];
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length === 0) return this.findById(id);
    
    values.push(id);
    await pool.query(`UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async delete(id) {
    await pool.query(`DELETE FROM coupons WHERE id = ?`, [id]);
    return true;
  }

  static async validate(code, userId, orderAmount) {
    const coupon = await this.findByCode(code);
    if (!coupon) return { valid: false, message: 'Invalid coupon code' };
    
    if (coupon.status !== 'ACTIVE') return { valid: false, message: 'Coupon is not active' };
    
    const now = new Date();
    if (coupon.start_date && new Date(coupon.start_date) > now) return { valid: false, message: 'Coupon has not started yet' };
    if (coupon.expiry_date && new Date(coupon.expiry_date) < now) return { valid: false, message: 'Coupon has expired' };
    
    if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) return { valid: false, message: 'Coupon usage limit exceeded' };
    
    if (orderAmount < coupon.min_order_amount) return { valid: false, message: `Minimum order amount of ₹${coupon.min_order_amount} required` };
    
    const [userUsage] = await pool.query(
      `SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = ? AND user_id = ?`,
      [coupon.id, userId]
    );
    
    if (userUsage[0].count >= coupon.user_limit) return { valid: false, message: 'You have already used this coupon the maximum number of times' };
    
    let discount = 0;
    if (coupon.discount_type === 'PERCENTAGE') {
      discount = (orderAmount * coupon.discount_value) / 100;
      if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
        discount = coupon.max_discount_amount;
      }
    } else {
      discount = coupon.discount_value;
    }
    
    if (discount > orderAmount) discount = orderAmount;
    
    return { valid: true, discount, coupon };
  }

  static async useCoupon(couponId, userId, orderId) {
    await pool.query(
      `INSERT INTO coupon_usage (coupon_id, user_id, order_id) VALUES (?, ?, ?)`,
      [couponId, userId, orderId]
    );
    await pool.query(`UPDATE coupons SET used_count = used_count + 1 WHERE id = ?`, [couponId]);
    return true;
  }
}

module.exports = Coupon;