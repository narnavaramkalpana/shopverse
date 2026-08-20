const { pool } = require('../config/database');

class Category {
  static async create({ name, description, image_url, sort_order = 0 }) {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const [result] = await pool.query(
      `INSERT INTO categories (name, slug, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [name, slug, description, image_url, sort_order]
    );
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query(`SELECT * FROM categories WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  static async findBySlug(slug) {
    const [rows] = await pool.query(`SELECT * FROM categories WHERE slug = ?`, [slug]);
    return rows[0] || null;
  }

  static async getAll({ activeOnly = true } = {}) {
    let query = 'SELECT * FROM categories';
    if (activeOnly) query += ' WHERE is_active = TRUE';
    query += ' ORDER BY sort_order ASC, name ASC';
    const [rows] = await pool.query(query);
    return rows;
  }

  static async update(id, data) {
    const allowedFields = ['name', 'description', 'image_url', 'is_active', 'sort_order'];
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        if (key === 'name') {
          const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          updates.push('slug = ?');
          values.push(slug);
        }
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length === 0) return this.findById(id);
    
    values.push(id);
    await pool.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async delete(id) {
    await pool.query(`DELETE FROM categories WHERE id = ?`, [id]);
    return true;
  }
}

module.exports = Category;