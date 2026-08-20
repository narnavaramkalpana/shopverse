const { pool } = require('../config/database');

class Address {
  static async create({ userId, name, phone, addressLine1, addressLine2, city, state, pincode, country = 'India', isDefault = false, addressType = 'HOME' }) {
    if (isDefault) {
      await pool.query(`UPDATE addresses SET is_default = FALSE WHERE user_id = ?`, [userId]);
    }
    
    const [result] = await pool.query(
      `INSERT INTO addresses (user_id, name, phone, address_line1, address_line2, city, state, pincode, country, is_default, address_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, phone, addressLine1, addressLine2, city, state, pincode, country, isDefault, addressType]
    );
    return this.findById(result.insertId);
  }

  static async findById(id) {
    const [rows] = await pool.query(`SELECT * FROM addresses WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  static async getUserAddresses(userId) {
    const [rows] = await pool.query(
      `SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );
    return rows;
  }

  static async update(id, userId, data) {
    const allowedFields = ['name', 'phone', 'address_line1', 'address_line2', 'city', 'state', 'pincode', 'country', 'is_default', 'address_type'];
    const updates = [];
    const values = [];
    
    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        if (key === 'is_default' && value) {
          await pool.query(`UPDATE addresses SET is_default = FALSE WHERE user_id = ?`, [userId]);
        }
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (updates.length === 0) return this.findById(id);
    
    values.push(id, userId);
    await pool.query(`UPDATE addresses SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`, values);
    return this.findById(id);
  }

  static async setDefault(id, userId) {
    await pool.query(`UPDATE addresses SET is_default = FALSE WHERE user_id = ?`, [userId]);
    await pool.query(`UPDATE addresses SET is_default = TRUE WHERE id = ? AND user_id = ?`, [id, userId]);
    return this.findById(id);
  }

  static async delete(id, userId) {
    const [rows] = await pool.query(`SELECT is_default FROM addresses WHERE id = ? AND user_id = ?`, [id, userId]);
    if (!rows[0]) return false;
    
    const wasDefault = rows[0].is_default;
    await pool.query(`DELETE FROM addresses WHERE id = ? AND user_id = ?`, [id, userId]);
    
    if (wasDefault) {
      const [remaining] = await pool.query(`SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [userId]);
      if (remaining[0]) {
        await pool.query(`UPDATE addresses SET is_default = TRUE WHERE id = ?`, [remaining[0].id]);
      }
    }
    
    return true;
  }

  static async getDefaultAddress(userId) {
    const [rows] = await pool.query(`SELECT * FROM addresses WHERE user_id = ? AND is_default = TRUE LIMIT 1`, [userId]);
    return rows[0] || null;
  }
}

module.exports = Address;