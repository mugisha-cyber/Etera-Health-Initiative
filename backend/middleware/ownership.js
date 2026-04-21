const db = require('../config/db');

const query = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const TABLES = {
  videos: 'videos',
  reels: 'reels',
  research: 'research',
  posts: 'posts'
};

exports.requireOwnerOrAdmin = (tableKey) => async (req, res, next) => {
  try {
    const table = TABLES[tableKey];
    if (!table) {
      return res.status(500).json({ message: 'Ownership check misconfigured' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const rows = await query(`SELECT uploaded_by FROM ${table} WHERE id = ?`, [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    if (Number(rows[0].uploaded_by) === Number(userId)) {
      return next();
    }

    const users = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (users.length > 0 && users[0].role === 'admin') {
      return next();
    }

    return res.status(403).json({ message: 'Not authorized to modify this content' });
  } catch (error) {
    return res.status(500).json({ message: 'Ownership check failed', error: error.message });
  }
};
