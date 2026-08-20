const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create({ name, email, password, phone, role = 'CUSTOMER' }) {
    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)`,
      [name, email.toLowerCase(), hashedPassword, phone, role]
    );
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, role, status, email_verified, created_at, updated_at 
       FROM users WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async findByEmail(email) {
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );
    return rows[0] || null;
  }

  static async findByEmailWithPassword(email) {
    const [rows] = await pool.query(
      `SELECT * FROM users WHERE email = ?`,
      [email.toLowerCase()]
    );
    return rows[0] || null;
  }

  static async update(id, data) {
    const allowedFields = ['name', 'phone', 'role', 'status', 'email_verified'];
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
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  static async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(`UPDATE users SET password = ? WHERE id = ?`, [hashedPassword, id]);
    return true;
  }

  static async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password);
  }

  static async getAll({ page = 1, limit = 20, search = '', role = '', status = '' } = {}) {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }
    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }
    
    const [rows] = await pool.query(
      `SELECT id, name, email, phone, role, status, email_verified, created_at 
       FROM users ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    
    return {
      users: rows,
      total: countResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].total / limit)
    };
  }

  static async delete(id) {
    await pool.query(`DELETE FROM users WHERE id = ?`, [id]);
    return true;
  }

  static async block(id) {
    return this.update(id, { status: 'BLOCKED' });
  }

  static async unblock(id) {
    return this.update(id, { status: 'ACTIVE' });
  }

  static async changeRole(id, role) {
    return this.update(id, { role });
  }
}

module.exports = User;