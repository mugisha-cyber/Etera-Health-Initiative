const db = require('../config/db');
const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const query = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const buildTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  const secure =
    process.env.SMTP_SECURE === undefined ? port === 465 : process.env.SMTP_SECURE === 'true';

  if (!host || !user || !pass) {
    throw new Error('SMTP settings missing. Configure SMTP_HOST, SMTP_USER, SMTP_PASSWORD.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
};

const CONTACT_TO = process.env.CONTACT_TO || 'eterahealthinitiative@gmail.com';
const CONTACT_FROM = process.env.SMTP_FROM || `ETERA Health Initiative <${CONTACT_TO}>`;

// Get all messages (admin only)
exports.getAllMessages = async (req, res) => {
  try {
    const results = await query('SELECT * FROM contact_messages ORDER BY created_at DESC', []);
    res.json(results);
  } catch (error) {
    logger.error('Error fetching contact messages', error);
    res.status(500).json({ message: 'Failed to fetch messages', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Get message by ID
exports.getMessageById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    const results = await query('SELECT * FROM contact_messages WHERE id = ?', [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json(results[0]);
  } catch (error) {
    logger.error('Error fetching contact message', error);
    res.status(500).json({ message: 'Failed to fetch message', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Add new message (public)
exports.addMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};

    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Please provide name, email, and message' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const result = await query(
      'INSERT INTO contact_messages (name, email, subject, message, status) VALUES (?, ?, ?, ?, ?)',
      [name, email, subject || null, message, 'new']
    );

    let emailStatus = 'skipped';
    try {
      const transporter = buildTransporter();
      await transporter.sendMail({
        from: CONTACT_FROM,
        to: CONTACT_TO,
        replyTo: email,
        subject: subject ? `Contact: ${subject}` : 'New Contact Message from ETERA Website',
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
        html: `
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message.replace(/\n/g, '<br/>')}</p>
        `
      });
      emailStatus = 'sent';
      logger.info('Contact email sent successfully');
    } catch (emailError) {
      emailStatus = 'failed';
      logger.warn('Contact email failed to send', emailError.message);
    }

    return res.status(201).json({
      message: emailStatus === 'sent' 
        ? 'Message submitted successfully. We will get back to you soon!' 
        : 'Message received! We will get back to you soon.',
      id: result.insertId,
      emailStatus
    });
  } catch (error) {
    logger.error('Error creating contact message', error);
    res.status(500).json({ message: 'Failed to submit message', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Update message status (admin only)
exports.updateMessageStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    if (!['new', 'read', 'replied'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be one of: new, read, replied' });
    }

    // Verify message exists
    const rows = await query('SELECT * FROM contact_messages WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await query('UPDATE contact_messages SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Message status updated successfully' });
  } catch (error) {
    logger.error('Error updating contact message status', error);
    res.status(500).json({ message: 'Failed to update message', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Delete message (admin only)
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid message ID' });
    }

    // Verify message exists
    const rows = await query('SELECT * FROM contact_messages WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Message not found' });
    }

    await query('DELETE FROM contact_messages WHERE id = ?', [id]);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    logger.error('Error deleting contact message', error);
    res.status(500).json({ message: 'Failed to delete message', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};
