const db = require('../config/db');

const query = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const { notifyResearchSubscribers } = require('./researchController');

const CONTENT_TABLES = {
  videos: 'videos',
  reels: 'reels',
  research: 'research'
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await query(
      'SELECT id, username, email, full_name, role, created_at FROM users ORDER BY created_at DESC'
    );
    const formatted = users.map((user) => ({
      ...user,
      admin: user.role === 'admin'
    }));
    return res.json(formatted);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const users = await query(
      'SELECT id, username, email, full_name, bio, profile_picture, role, created_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    return res.json({ ...user, admin: user.role === 'admin' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (Number(id) === Number(req.user?.id)) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    const result = await query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body || {};

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or user' });
    }

    if (Number(id) === Number(req.user?.id) && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot remove your own admin access.' });
    }

    await query('UPDATE users SET role = ? WHERE id = ?', [role, id]);

    const users = await query(
      'SELECT id, username, email, full_name, role, created_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = users[0];
    return res.json({
      message: 'User role updated',
      user: { ...user, admin: user.role === 'admin' }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update role', error: error.message });
  }
};

exports.updateContentStatus = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { status } = req.body || {};
    const table = CONTENT_TABLES[type];

    if (!table) {
      return res.status(400).json({ message: 'Invalid content type' });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const rows = await query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    await query(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id]);

    if (table === 'research' && status === 'approved') {
      try {
        const record = rows[0];
        await notifyResearchSubscribers({
          title: record.title,
          summary: record.summary,
          authors: record.authors,
          contentUrl: record.content_url
        });
      } catch (notifyError) {
        console.error('Research notification error:', notifyError.message);
      }
    }

    return res.json({ message: `Content marked as ${status}` });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update content status', error: error.message });
  }
};
