const { pool } = require('../config/database');

class Product {
  static async create({ name, description, price, discount_percent, stock, category_id, seller_id, brand, warranty_info, shipping_info, images = [] }) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
    const [result] = await pool.query(
      `INSERT INTO products (name, slug, description, price, discount_percent, stock, category_id, seller_id, brand, warranty_info, shipping_info, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [name, slug, description, price, discount_percent || 0, stock || 0, category_id, seller_id, brand, warranty_info, shipping_info]
    );
    
    const productId = result.insertId;
    
    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        await pool.query(
          `INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)`,
          [productId, images[i], i === 0, i]
        );
      }
    }
    
    return this.findById(productId);
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug,
       u.name as seller_name, u.email as seller_email
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN users u ON p.seller_id = u.id
       WHERE p.id = ?`,
      [id]
    );
    
    if (!rows[0]) return null;
    
    const product = rows[0];
    product.images = await this.getImages(productId);
    return product;
  }

  static async findBySlug(slug) {
    const [rows] = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ?`,
      [slug]
    );
    
    if (!rows[0]) return null;
    
    const product = rows[0];
    product.images = await this.getImages(product.id);
    return product;
  }

  static async getImages(productId) {
    const [rows] = await pool.query(
      `SELECT image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY sort_order ASC`,
      [productId]
    );
    return rows;
  }

  static async getAll({ 
    page = 1, 
    limit = 20, 
    category = '', 
    search = '', 
    minPrice = 0, 
    maxPrice = 0,
    sort = 'newest',
    status = 'ACTIVE',
    seller_id = null
  } = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (status) {
      whereClause += ' AND p.status = ?';
      params.push(status);
    }
    if (seller_id) {
      whereClause += ' AND p.seller_id = ?';
      params.push(seller_id);
    }
    if (category) {
      whereClause += ' AND c.slug = ?';
      params.push(category);
    }
    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (minPrice > 0) {
      whereClause += ' AND p.price >= ?';
      params.push(minPrice);
    }
    if (maxPrice > 0) {
      whereClause += ' AND p.price <= ?';
      params.push(maxPrice);
    }
    
    let orderBy = 'p.created_at DESC';
    switch (sort) {
      case 'price_asc': orderBy = 'p.price ASC'; break;
      case 'price_desc': orderBy = 'p.price DESC'; break;
      case 'rating': orderBy = 'p.rating_avg DESC'; break;
      case 'popularity': orderBy = 'p.sold_count DESC'; break;
      case 'newest': default: orderBy = 'p.created_at DESC'; break;
    }
    
    const [rows] = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug,
       (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) as thumbnail
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       ${whereClause}`,
      params
    );
    
    return {
      products: rows,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  static async update(id, data, sellerId = null) {
    const allowedFields = ['name', 'description', 'price', 'discount_percent', 'stock', 'category_id', 'brand', 'warranty_info', 'shipping_info', 'status'];
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        if (key === 'name') {
          const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();
          updates.push('slug = ?');
          values.push(slug);
        }
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length === 0) return this.findById(id);
    
    let query = `UPDATE products SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);
    
    if (sellerId) {
      query = `UPDATE products SET ${updates.join(', ')} WHERE id = ? AND seller_id = ?`;
      values.push(sellerId);
    }
    
    await pool.query(query, values);
    return this.findById(id);
  }

  static async updateImages(productId, images) {
    await pool.query(`DELETE FROM product_images WHERE product_id = ?`, [productId]);
    
    for (let i = 0; i < images.length; i++) {
      await pool.query(
        `INSERT INTO product_images (product_id, image_url, is_primary, sort_order) VALUES (?, ?, ?, ?)`,
        [productId, images[i], i === 0, i]
      );
    }
    
    return this.getImages(productId);
  }

  static async delete(id, sellerId = null) {
    let query = `DELETE FROM products WHERE id = ?`;
    const params = [id];
    
    if (sellerId) {
      query += ` AND seller_id = ?`;
      params.push(sellerId);
    }
    
    await pool.query(query, params);
    return true;
  }

  static async updateStock(productId, quantity) {
    await pool.query(
      `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`,
      [quantity, productId, quantity]
    );
    
    const [rows] = await pool.query(`SELECT stock FROM products WHERE id = ?`, [productId]);
    return rows[0]?.stock || 0;
  }

  static async incrementSoldCount(productId, quantity) {
    await pool.query(
      `UPDATE products SET sold_count = sold_count + ? WHERE id = ?`,
      [quantity, productId]
    );
  }

  static async updateRating(productId) {
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

  static async getLowStock(threshold = 5, sellerId = null) {
    let query = `SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.stock <= ? AND p.status = 'ACTIVE'`;
    const params = [threshold];
    
    if (sellerId) {
      query += ` AND p.seller_id = ?`;
      params.push(sellerId);
    }
    
    query += ` ORDER BY p.stock ASC`;
    const [rows] = await pool.query(query, params);
    return rows;
  }
}

module.exports = Product;