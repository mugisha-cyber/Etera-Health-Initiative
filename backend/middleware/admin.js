const db = require('../config/db');

const query = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

exports.requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const results = await query('SELECT role FROM users WHERE id = ?', [userId]);
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (results[0].role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ message: 'Admin check failed', error: error.message });
  }
};
