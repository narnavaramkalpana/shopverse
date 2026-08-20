const { pool } = require('../config/database');

class Review {
  static async create({ productId, userId, orderId, rating, title, comment }) {
    const isVerified = orderId ? true : false;
    
    const [result] = await pool.query(
      `INSERT INTO reviews (product_id, user_id, order_id, rating, title, comment, is_verified_purchase, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED')`,
      [productId, userId, orderId, rating, title, comment, isVerified]
    );
    
    await this.updateProductRating(productId);
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT r.*, u.name as user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async getProductReviews(productId, { page = 1, limit = 10 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT r.*, u.name as user_name FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.product_id = ? AND r.status = 'APPROVED'
       ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      [productId, limit, offset]
    );
    
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM reviews WHERE product_id = ? AND status = 'APPROVED'`,
      [productId]
    );
    
    return {
      reviews: rows,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  static async getUserReviewForProduct(userId, productId) {
    const [rows] = await pool.query(
      `SELECT * FROM reviews WHERE user_id = ? AND product_id = ?`,
      [userId, productId]
    );
    return rows[0] || null;
  }

  static async update(id, userId, { rating, title, comment }) {
    await pool.query(
      `UPDATE reviews SET rating = ?, title = ?, comment = ? WHERE id = ? AND user_id = ?`,
      [rating, title, comment, id, userId]
    );
    
    const review = await this.findById(id);
    await this.updateProductRating(review.product_id);
    return review;
  }

  static async delete(id, userId) {
    const review = await this.findById(id);
    if (!review) return false;
    if (review.user_id !== userId) throw new Error('Unauthorized');
    
    await pool.query(`DELETE FROM reviews WHERE id = ?`, [id]);
    await this.updateProductRating(review.product_id);
    return true;
  }

  static async updateProductRating(productId) {
    const [rows] = await pool.query(
      `SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ? AND status = 'APPROVED'`,
      [productId]
    );
    
    const avgRating = rows[0].avg_rating ? parseFloat(rows[0].avg_rating).toFixed(2) : 0;
    const count = rows[0].count || 0;
    
    await pool.query(
      `UPDATE products SET rating_avg = ?, rating_count = ? WHERE id = ?`,
      [avgRating, count, productId]
    );
  }

  static async canUserReview(userId, productId) {
    const [rows] = await pool.query(
      `SELECT o.id FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ? AND oi.product_id = ? AND o.status = 'DELIVERED' AND o.payment_status = 'SUCCESS'
       AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.user_id = ? AND r.product_id = ? AND r.order_id = o.id)
       LIMIT 1`,
      [userId, productId, userId, productId]
    );
    return rows.length > 0 ? rows[0].id : null;
  }
}

module.exports = Review;