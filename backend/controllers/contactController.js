const db = require('../config/db');
const nodemailer = require('nodemailer');

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
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE !== 'false';

  if (!host || !user || !pass) {
    throw new Error('SMTP settings missing. Configure SMTP_HOST, SMTP_USER, SMTP_PASS.');
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
exports.getAllMessages = (req, res) => {
  db.query(
    'SELECT * FROM contact_messages ORDER BY created_at DESC',
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    }
  );
};

// Get message by ID
exports.getMessageById = (req, res) => {
  const { id } = req.params;
  db.query(
    'SELECT * FROM contact_messages WHERE id = ?',
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      if (results.length === 0) {
        return res.status(404).json({ message: 'Message not found' });
      }
      res.json(results[0]);
    }
  );
};

// Add new message (public)
exports.addMessage = async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  // Validation
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
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
    } catch (emailError) {
      emailStatus = 'failed';
      console.error('Contact email error:', emailError.message);
    }

    return res.status(201).json({
      message:
        emailStatus === 'sent'
          ? 'Message submitted successfully. We will get back to you soon!'
          : 'Message received! We will get back to you soon.',
      id: result.insertId,
      emailStatus
    });
  } catch (err) {
    return res.status(500).json({ message: 'Error sending message', error: err.message });
  }
};

// Update message status (admin only)
exports.updateMessageStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};

  if (!['new', 'read', 'replied'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  db.query(
    'UPDATE contact_messages SET status = ? WHERE id = ?',
    [status, id],
    (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error updating message', error: err });
      }
      res.json({ message: 'Message status updated successfully' });
    }
  );
};

// Delete message (admin only)
exports.deleteMessage = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM contact_messages WHERE id = ?', [id], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Error deleting message', error: err });
    }
    res.json({ message: 'Message deleted successfully' });
  });
};
