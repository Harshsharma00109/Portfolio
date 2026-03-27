


const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Message = require('../models/message');
 
// ✅ PERFORMANCE FIX: Create transporter ONCE when server starts
// Previously this was inside the route handler — meaning a new SMTP
// connection was opened on every single form submission (3–8s delay).
// Moving it here reuses the same connection and is much faster.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // ✅ Keep the SMTP connection alive between requests
  pool: true,
  maxConnections: 3,
  maxMessages: 100
});
 
// ✅ Verify transporter config on startup (logs to Render console)
transporter.verify((error) => {
  if (error) {
    console.error('❌ Email transporter error:', error.message);
  } else {
    console.log('✅ Email transporter ready');
  }
});
 
// ✅ POST /api/contact
router.post('/', async (req, res) => {
  console.log("📩 Incoming request:", req.body);
 
  const { name, email, message } = req.body;
 
  // ✅ Validation
  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'All fields required'
    });
  }
 
  try {
    // ✅ Save to DB first
    const newMessage = new Message({ name, email, message });
    await newMessage.save();
    console.log("✅ Saved to MongoDB");
 
    // ✅ Send email — isolated so a failure doesn't return 500
    try {
      await transporter.sendMail({
        from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `New message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
        // ✅ HTML version looks nicer in your inbox
        html: `
          <h3>New Portfolio Message</h3>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `
      });
      console.log("✅ Email sent successfully");
    } catch (emailErr) {
      console.error("⚠️ Email failed (message still saved):", emailErr.message);
    }
 
    return res.status(200).json({
      success: true,
      msg: "Message sent successfully"
    });
 
  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({
      success: false,
      error: "Server error"
    });
  }
});
 
module.exports = router;
