const { pool } = require('../config/database');

class SellerProfile {
  static async create({ userId, businessName, businessDescription, businessAddress, gstNumber, panNumber }) {
    const [result] = await pool.query(
      `INSERT INTO seller_profiles (user_id, business_name, business_description, business_address, gst_number, pan_number, status)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING')`,
      [userId, businessName, businessDescription, businessAddress, gstNumber, panNumber]
    );
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query(`SELECT * FROM seller_profiles WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  static async findByUserId(userId) {
    const [rows] = await pool.query(`SELECT * FROM seller_profiles WHERE user_id = ?`, [userId]);
    return rows[0] || null;
  }

  static async update(userId, data) {
    const allowedFields = ['business_name', 'business_description', 'business_address', 'gst_number', 'pan_number', 
      'bank_account_name', 'bank_account_number', 'bank_ifsc', 'bank_name'];
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length === 0) return this.findByUserId(userId);
    
    values.push(userId);
    await pool.query(`UPDATE seller_profiles SET ${updates.join(', ')} WHERE user_id = ?`, values);
    return this.findByUserId(userId);
  }

  static async updateStatus(userId, status) {
    await pool.query(`UPDATE seller_profiles SET status = ? WHERE user_id = ?`, [status, userId]);
    return this.findByUserId(userId);
  }

  static async getAll({ page = 1, limit = 20, status = '' } = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND sp.status = ?';
      params.push(status);
    }
    
    const [rows] = await pool.query(
      `SELECT sp.*, u.name, u.email, u.phone, u.created_at as user_created
       FROM seller_profiles sp
       JOIN users u ON sp.user_id = u.id
       ${whereClause}
       ORDER BY sp.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM seller_profiles sp JOIN users u ON sp.user_id = u.id ${whereClause}`,
      params
    );
    
    return {
      sellers: rows,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  static async getAnalytics(sellerId) {
    const [ordersResult] = await pool.query(
      `SELECT COUNT(*) as total_orders, 
       SUM(oi.subtotal) as total_revenue,
       COUNT(CASE WHEN oi.status = 'DELIVERED' THEN 1 END) as delivered_orders,
       COUNT(CASE WHEN oi.status IN ('PLACED', 'CONFIRMED', 'PACKED') THEN 1 END) as pending_orders
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE oi.seller_id = ?`,
      [sellerId]
    );
    
    const [productsResult] = await pool.query(
      `SELECT COUNT(*) as total_products,
       COUNT(CASE WHEN stock <= 5 AND stock > 0 THEN 1 END) as low_stock,
       COUNT(CASE WHEN stock = 0 THEN 1 END) as out_of_stock
       FROM products WHERE seller_id = ? AND status = 'ACTIVE'`,
      [sellerId]
    );
    
    const [topProducts] = await pool.query(
      `SELECT p.id, p.name, p.price, p.stock, SUM(oi.quantity) as sold_count, SUM(oi.subtotal) as revenue
       FROM products p
       JOIN order_items oi ON p.id = oi.product_id
       WHERE p.seller_id = ?
       GROUP BY p.id
       ORDER BY sold_count DESC LIMIT 5`,
      [sellerId]
    );
    
    const [monthlySales] = await pool.query(
      `SELECT DATE_FORMAT(o.created_at, '%Y-%m') as month, SUM(oi.subtotal) as revenue, COUNT(DISTINCT o.id) as orders
       FROM order_items oi
       JOIN orders o ON oi.order_id = o.id
       WHERE oi.seller_id = ? AND o.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(o.created_at, '%Y-%m')
       ORDER BY month ASC`,
      [sellerId]
    );
    
    return {
      totalOrders: ordersResult[0].total_orders || 0,
      totalRevenue: ordersResult[0].total_revenue || 0,
      deliveredOrders: ordersResult[0].delivered_orders || 0,
      pendingOrders: ordersResult[0].pending_orders || 0,
      totalProducts: productsResult[0].total_products || 0,
      lowStockProducts: productsResult[0].low_stock || 0,
      outOfStockProducts: productsResult[0].out_of_stock || 0,
      topProducts,
      monthlySales
    };
  }
}

module.exports = SellerProfile;