const { pool } = require('../config/database');

class Cart {
  static async getOrCreateCart(userId) {
    let [rows] = await pool.query(`SELECT * FROM carts WHERE user_id = ?`, [userId]);
    
    if (!rows[0]) {
      const [result] = await pool.query(`INSERT INTO carts (user_id) VALUES (?)`, [userId]);
      rows = [{ id: result.insertId, user_id: userId }];
    }
    
    return rows[0];
  }

  static async getCartItems(userId) {
    const cart = await this.getOrCreateCart(userId);
    const [rows] = await pool.query(
      `SELECT ci.*, p.name, p.price, p.discount_percent, p.stock, p.thumbnail,
       c.name as category_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE ci.cart_id = ? AND p.status = 'ACTIVE' AND p.stock > 0`,
      [cart.id]
    );
    return rows;
  }

  static async addItem(userId, productId, quantity = 1) {
    const cart = await this.getOrCreateCart(userId);
    
    const [product] = await pool.query(`SELECT stock FROM products WHERE id = ? AND status = 'ACTIVE'`, [productId]);
    if (!product[0]) throw new Error('Product not found');
    if (product[0].stock < quantity) throw new Error('Insufficient stock');
    
    await pool.query(
      `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [cart.id, productId, quantity, quantity]
    );
    
    return this.getCartItems(userId);
  }

  static async updateQuantity(userId, productId, quantity) {
    const cart = await this.getOrCreateCart(userId);
    
    if (quantity <= 0) {
      await pool.query(`DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?`, [cart.id, productId]);
    } else {
      const [product] = await pool.query(`SELECT stock FROM products WHERE id = ?`, [productId]);
      if (!product[0] || product[0].stock < quantity) throw new Error('Insufficient stock');
      
      await pool.query(
        `UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?`,
        [quantity, cart.id, productId]
      );
    }
    
    return this.getCartItems(userId);
  }

  static async removeItem(userId, productId) {
    const cart = await this.getOrCreateCart(userId);
    await pool.query(`DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?`, [cart.id, productId]);
    return this.getCartItems(userId);
  }

  static async clearCart(userId) {
    const cart = await this.getOrCreateCart(userId);
    await pool.query(`DELETE FROM cart_items WHERE cart_id = ?`, [cart.id]);
    return [];
  }

  static async mergeGuestCart(userId, guestCartItems) {
    const cart = await this.getOrCreateCart(userId);
    
    for (const item of guestCartItems) {
      const [product] = await pool.query(`SELECT stock FROM products WHERE id = ? AND status = 'ACTIVE'`, [item.productId]);
      if (product[0] && product[0].stock >= item.quantity) {
        await pool.query(
          `INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
          [cart.id, item.productId, item.quantity, item.quantity]
        );
      }
    }
    
    return this.getCartItems(userId);
  }

  static async getSummary(userId) {
    const items = await this.getCartItems(userId);
    let subtotal = 0;
    
    for (const item of items) {
      const price = item.price * (1 - (item.discount_percent || 0) / 100);
      subtotal += price * item.quantity;
    }
    
    return { items, subtotal };
  }
}

module.exports = Cart;