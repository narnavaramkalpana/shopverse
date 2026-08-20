const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const generateInvoice = (order) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      
      // Header
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#4f46e5').text('ShopVerse', 50, 50);
      doc.fontSize(10).font('Helvetica').fillColor('#64748b').text('Your one-stop destination for quality products', 50, 80);
      
      // Invoice title
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#0f172a').text('INVOICE', 50, 120);
      
      // Order details
      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      doc.text(`Order ID: ${order.order_id}`, 50, 160);
      doc.text(`Date: ${new Date(order.placed_at || order.created_at).toLocaleDateString()}`, 50, 175);
      doc.text(`Status: ${order.status}`, 50, 190);
      doc.text(`Payment Status: ${order.payment_status}`, 50, 205);
      
      // Customer details
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a').text('Bill To:', 50, 235);
      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      doc.text(order.shipping_name, 50, 250);
      doc.text(order.shipping_address_line1, 50, 265);
      if (order.shipping_address_line2) doc.text(order.shipping_address_line2, 50, 280);
      doc.text(`${order.shipping_city}, ${order.shipping_state} ${order.shipping_pincode}`, 50, 295);
      doc.text(order.shipping_country, 50, 310);
      doc.text(`Phone: ${order.shipping_phone}`, 50, 325);
      
      // Table header
      const tableTop = 360;
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#ffffff');
      doc.rect(50, tableTop, 500, 25).fill('#4f46e5');
      doc.fillColor('#ffffff');
      doc.text('Product', 60, tableTop + 8);
      doc.text('Qty', 300, tableTop + 8);
      doc.text('Price', 350, tableTop + 8);
      doc.text('Total', 450, tableTop + 8);
      
      // Table rows
      let y = tableTop + 25;
      order.items.forEach((item, index) => {
        const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
        doc.rect(50, y, 500, 25).fill(bgColor);
        doc.fillColor('#334155').font('Helvetica');
        doc.text(item.product_name.substring(0, 40), 60, y + 5);
        doc.text(item.quantity.toString(), 310, y + 5);
        doc.text(`₹${item.product_price.toFixed(2)}`, 350, y + 5);
        doc.text(`₹${item.subtotal.toFixed(2)}`, 450, y + 5);
        y += 25;
      });
      
      // Totals
      y += 10;
      doc.fontSize(10).font('Helvetica').fillColor('#334155');
      doc.text(`Subtotal:`, 400, y);
      doc.text(`₹${order.subtotal.toFixed(2)}`, 500, y);
      
      if (order.discount > 0) {
        y += 20;
        doc.text(`Discount:`, 400, y);
        doc.text(`-₹${order.discount.toFixed(2)}`, 500, y);
      }
      
      if (order.coupon_discount > 0) {
        y += 20;
        doc.text(`Coupon (${order.coupon_code}):`, 400, y);
        doc.text(`-₹${order.coupon_discount.toFixed(2)}`, 500, y);
      }
      
      y += 20;
      doc.text(`Shipping:`, 400, y);
      doc.text(order.shipping === 0 ? 'Free' : `₹${order.shipping.toFixed(2)}`, 500, y);
      
      y += 20;
      doc.text(`Tax (18%):`, 400, y);
      doc.text(`₹${order.tax.toFixed(2)}`, 500, y);
      
      y += 25;
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text(`Grand Total:`, 400, y);
      doc.text(`₹${order.total.toFixed(2)}`, 500, y);
      
      // Footer
      doc.fontSize(8).font('Helvetica').fillColor('#64748b');
      doc.text('Thank you for shopping with ShopVerse!', 50, y + 50);
      doc.text('For support, contact us at support@shopverse.com', 50, y + 65);
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoice };