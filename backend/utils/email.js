const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('Email not configured, skipping:', { to, subject });
    return { success: false, message: 'Email not configured' };
  }
  
  try {
    const info = await transporter.sendMail({
      from: `"ShopVerse" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send failed:', error);
    return { success: false, error: error.message };
  }
};

const sendWelcomeEmail = async (email, name) => {
  return sendEmail({
    to: email,
    subject: 'Welcome to ShopVerse!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4f46e5;">Welcome to ShopVerse, ${name}!</h1>
        <p>Thank you for registering with ShopVerse. Your account has been created successfully.</p>
        <p>Start exploring our wide range of products and enjoy exclusive deals!</p>
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 16px;">Shop Now</a>
      </div>
    `
  });
};

const sendOrderConfirmationEmail = async (email, order) => {
  return sendEmail({
    to: email,
    subject: `Order Confirmed - ${order.order_id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4f46e5;">Order Confirmed!</h1>
        <p>Hi ${order.user_name},</p>
        <p>Your order <strong>${order.order_id}</strong> has been confirmed.</p>
        <p><strong>Total:</strong> ₹${order.total.toFixed(2)}</p>
        <p>We'll notify you when your order ships.</p>
      </div>
    `
  });
};

const sendOrderStatusEmail = async (email, order, status) => {
  const statusMessages = {
    'SHIPPED': 'Your order has been shipped!',
    'OUT_FOR_DELIVERY': 'Your order is out for delivery!',
    'DELIVERED': 'Your order has been delivered!',
    'CANCELLED': 'Your order has been cancelled.'
  };
  
  return sendEmail({
    to: email,
    subject: `Order Update - ${order.order_id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #4f46e5;">${statusMessages[status] || 'Order Status Update'}</h1>
        <p>Hi ${order.user_name},</p>
        <p>Your order <strong>${order.order_id}</strong> status: <strong>${status}</strong></p>
        ${status === 'SHIPPED' ? '<p>Tracking information will be available soon.</p>' : ''}
      </div>
    `
  });
};

const sendSellerApprovalEmail = async (email, name, approved) => {
  return sendEmail({
    to: email,
    subject: approved ? 'Seller Application Approved!' : 'Seller Application Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: ${approved ? '#10b981' : '#ef4444'};">
          ${approved ? 'Seller Application Approved!' : 'Seller Application Update'}
        </h1>
        <p>Hi ${name},</p>
        <p>${approved ? 'Congratulations! Your seller application has been approved. You can now start adding products.' : 'We regret to inform you that your seller application was not approved at this time.'}</p>
      </div>
    `
  });
};

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendSellerApprovalEmail
};