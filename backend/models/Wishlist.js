const { pool } = require('../config/database');

class Wishlist {
  static async getOrCreateWishlist(userId) {
    let [rows] = await pool.query(`SELECT * FROM wishlists WHERE user_id = ?`, [userId]);
    
    if (!rows[0]) {
      const [result] = await pool.query(`INSERT INTO wishlists (user_id) VALUES (?)`, [userId]);
      rows = [{ id: result.insertId, user_id: userId }];
    }
    
    return rows[0];
  }

  static async getWishlistItems(userId) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const [rows] = await pool.query(
      `SELECT wi.*, p.name, p.price, p.discount_percent, p.stock, p.thumbnail,
       c.name as category_name
       FROM wishlist_items wi
       JOIN products p ON wi.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE wi.wishlist_id = ? AND p.status = 'ACTIVE'`,
      [wishlist.id]
    );
    return rows;
  }

  static async addItem(userId, productId) {
    const wishlist = await this.getOrCreateWishlist(userId);
    
    const [product] = await pool.query(`SELECT id FROM products WHERE id = ? AND status = 'ACTIVE'`, [productId]);
    if (!product[0]) throw new Error('Product not found');
    
    await pool.query(
      `INSERT IGNORE INTO wishlist_items (wishlist_id, product_id) VALUES (?, ?)`,
      [wishlist.id, productId]
    );
    
    return this.getWishlistItems(userId);
  }

  static async removeItem(userId, productId) {
    const wishlist = await this.getOrCreateWishlist(userId);
    await pool.query(`DELETE FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?`, [wishlist.id, productId]);
    return this.getWishlistItems(userId);
  }

  static async clearWishlist(userId) {
    const wishlist = await this.getOrCreateWishlist(userId);
    await pool.query(`DELETE FROM wishlist_items WHERE wishlist_id = ?`, [wishlist.id]);
    return [];
  }

  static async isInWishlist(userId, productId) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const [rows] = await pool.query(
      `SELECT 1 FROM wishlist_items WHERE wishlist_id = ? AND product_id = ?`,
      [wishlist.id, productId]
    );
    return rows.length > 0;
  }
}

module.exports = Wishlist;