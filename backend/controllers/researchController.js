const db = require('../config/db');
const nodemailer = require('nodemailer');

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

const CONTACT_TO = process.env.CONTACT_TO || 'eliseusmugisha@gmail.com';
const NOTIFY_FROM = process.env.SMTP_FROM || `ETERA Health Initiative <${CONTACT_TO}>`;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:5000';

const resolvePublicUrl = (value) => {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  if (value.startsWith('/')) return `${PUBLIC_BASE_URL}${value}`;
  return `${PUBLIC_BASE_URL}/${value}`;
};

const notifyResearchSubscribers = async ({ title, summary, authors, contentUrl }) => {
  const users = await new Promise((resolve, reject) => {
    db.query('SELECT email FROM users WHERE subscribed = 1', (err, results) => {
      if (err) return reject(err);
      resolve(results || []);
    });
  });

  const recipients = users.map((user) => user.email).filter(Boolean);
  if (recipients.length === 0) return { sent: 0 };

  const transporter = buildTransporter();
  const resolvedUrl = resolvePublicUrl(contentUrl);
  const textBody = [
    `New research has been published on ETERA Health Initiative.`,
    '',
    `Title: ${title}`,
    `Authors: ${authors}`,
    '',
    summary ? `Summary: ${summary}` : '',
    '',
    resolvedUrl ? `Read more: ${resolvedUrl}` : ''
  ]
    .filter(Boolean)
    .join('\n');

  await transporter.sendMail({
    from: NOTIFY_FROM,
    to: CONTACT_TO,
    bcc: recipients,
    subject: `New Research: ${title}`,
    text: textBody,
    html: `
      <p>New research has been published on ETERA Health Initiative.</p>
      <p><strong>Title:</strong> ${title}</p>
      <p><strong>Authors:</strong> ${authors}</p>
      <p><strong>Summary:</strong> ${summary || 'Summary unavailable.'}</p>
      ${resolvedUrl ? `<p><a href="${resolvedUrl}">Read the full research</a></p>` : ''}
    `
  });

  return { sent: recipients.length };
};

// Get all research papers
exports.getAllResearch = async (req, res) => {
  try {
    const userId = req.user?.id;
    const adminRows = userId
      ? await new Promise((resolve, reject) => {
          db.query('SELECT role FROM users WHERE id = ?', [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results || []);
          });
        })
      : [];
    const isAdmin = adminRows[0]?.role === 'admin';
    let sql = 'SELECT * FROM research';
    const params = [];
    if (!isAdmin) {
      if (userId) {
        sql += ' WHERE status = ? OR uploaded_by = ?';
        params.push('approved', userId);
      } else {
        sql += ' WHERE status = ?';
        params.push('approved');
      }
    }
    sql += ' ORDER BY COALESCE(publication_date, created_at) DESC';
    db.query(sql, params, (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get research by ID
exports.getResearchById = async (req, res) => {
  try {
    const { id } = req.params;
    db.query('SELECT * FROM research WHERE id = ?', [id], async (err, results) => {
      if (err) return res.status(500).json({ error: err });
      if (results.length === 0) {
        return res.status(404).json({ message: 'Research paper not found' });
      }

      const research = results[0];
      const userId = req.user?.id;
      let admin = false;
      if (userId) {
        const rows = await new Promise((resolve, reject) => {
          db.query('SELECT role FROM users WHERE id = ?', [userId], (roleErr, roleRows) => {
            if (roleErr) return reject(roleErr);
            resolve(roleRows || []);
          });
        });
        admin = rows[0]?.role === 'admin';
      }

      const canView =
        research.status === 'approved' ||
        admin ||
        (userId && Number(research.uploaded_by) === Number(userId));
      if (!canView) {
        return res.status(403).json({ message: 'Research not available' });
      }
      res.json(research);
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get research by category
exports.getResearchByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user?.id;
    let admin = false;
    if (userId) {
      const rows = await new Promise((resolve, reject) => {
        db.query('SELECT role FROM users WHERE id = ?', [userId], (err, results) => {
          if (err) return reject(err);
          resolve(results || []);
        });
      });
      admin = rows[0]?.role === 'admin';
    }

    let sql = 'SELECT * FROM research WHERE category = ?';
    const params = [category];
    if (!admin) {
      if (userId) {
        sql += ' AND (status = ? OR uploaded_by = ?)';
        params.push('approved', userId);
      } else {
        sql += ' AND status = ?';
        params.push('approved');
      }
    }
    sql += ' ORDER BY COALESCE(publication_date, created_at) DESC';
    db.query(sql, params, (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get research by author
exports.getResearchByAuthor = async (req, res) => {
  try {
    const { author } = req.params;
    const userId = req.user?.id;
    let admin = false;
    if (userId) {
      const rows = await new Promise((resolve, reject) => {
        db.query('SELECT role FROM users WHERE id = ?', [userId], (err, results) => {
          if (err) return reject(err);
          resolve(results || []);
        });
      });
      admin = rows[0]?.role === 'admin';
    }

    let sql = 'SELECT * FROM research WHERE authors LIKE ?';
    const params = [`%${author}%`];
    if (!admin) {
      if (userId) {
        sql += ' AND (status = ? OR uploaded_by = ?)';
        params.push('approved', userId);
      } else {
        sql += ' AND status = ?';
        params.push('approved');
      }
    }
    sql += ' ORDER BY COALESCE(publication_date, created_at) DESC';
    db.query(sql, params, (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Add new research paper (admin only)
exports.addResearch = async (req, res) => {
  if (req.authError) {
    return res.status(401).json({ message: 'Session expired. Please log in again.' });
  }
  const { title, authors, summary, content_url, category, publication_date, guest_name, guest_email } =
    req.body || {};
  const uploadedDoc = req.file ? `/uploads/research/${req.file.filename}` : null;
  const resolvedContentUrl = uploadedDoc || content_url || null;

  if (!title || !authors || !summary) {
    return res.status(400).json({ message: 'Title, authors, and summary are required' });
  }

  if (!resolvedContentUrl) {
    return res.status(400).json({ message: 'Research file or link is required.' });
  }

  const userId = req.user?.id || null;
  if (!userId && (!guest_name || !guest_email)) {
    return res.status(400).json({ message: 'Name and email are required for guest uploads.' });
  }

  let admin = false;
  if (userId) {
    const rows = await new Promise((resolve, reject) => {
      db.query('SELECT role FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) return reject(err);
        resolve(results || []);
      });
    });
    admin = rows[0]?.role === 'admin';
  }

  const status = admin ? 'approved' : 'pending';
  const fileType = req.file?.mimetype || null;
  const fileSize = req.file?.size || null;

  db.query(
    `INSERT INTO research
      (title, authors, summary, content_url, category, publication_date, uploaded_by,
       guest_name, guest_email, status, file_type, file_size)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      authors,
      summary,
      resolvedContentUrl,
      category || null,
      publication_date || null,
      userId,
      guest_name || null,
      guest_email || null,
      status,
      fileType,
      fileSize
    ],
    async (err, results) => {
      if (err) return res.status(500).json({ error: err });

      let notification = { sent: 0 };
      if (status === 'approved') {
        try {
          notification = await notifyResearchSubscribers({
            title,
            summary,
            authors,
            contentUrl: resolvedContentUrl
          });
        } catch (notifyError) {
          console.error('Research notification error:', notifyError.message);
        }
      }

      res.status(201).json({
        message: admin ? 'Research published successfully' : 'Research submitted for review',
        id: results.insertId,
        status,
        notificationsSent: notification.sent
      });
    }
  );
};

// Update research paper
exports.updateResearch = (req, res) => {
  const { id } = req.params;
  const { title, authors, summary, content_url, category } = req.body || {};
  const uploadedDoc = req.file ? `/uploads/research/${req.file.filename}` : null;

  db.query('SELECT * FROM research WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Research paper not found' });
    }

    const current = rows[0];
    const nextTitle = title !== undefined ? title : current.title;
    const nextAuthors = authors !== undefined ? authors : current.authors;
    const nextSummary = summary !== undefined ? summary : current.summary;
    const nextContent = uploadedDoc || content_url || current.content_url;
    const nextCategory = category !== undefined ? category : current.category;
    const nextFileType = uploadedDoc ? req.file?.mimetype || null : current.file_type;
    const nextFileSize = uploadedDoc ? req.file?.size || null : current.file_size;

    db.query(
      'UPDATE research SET title = ?, authors = ?, summary = ?, content_url = ?, category = ?, file_type = ?, file_size = ? WHERE id = ?',
      [nextTitle, nextAuthors, nextSummary, nextContent, nextCategory, nextFileType, nextFileSize, id],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr });
        res.json({ message: 'Research paper updated successfully' });
      }
    );
  });
};

// Delete research paper (admin only)
exports.deleteResearch = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM research WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err });
    db.query(
      'DELETE FROM content_likes WHERE content_type = ? AND content_id = ?',
      ['research', id]
    );
    db.query(
      'DELETE FROM content_comments WHERE content_type = ? AND content_id = ?',
      ['research', id]
    );
    res.json({ message: 'Research paper deleted successfully' });
  });
};

exports.notifyResearchSubscribers = notifyResearchSubscribers;
