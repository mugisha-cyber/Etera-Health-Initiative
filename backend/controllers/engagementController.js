const db = require('../config/db');

const query = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const TABLES = {
  posts: 'posts',
  research: 'research',
  reels: 'reels',
  videos: 'videos'
};

const ensureType = (type) => TABLES[type];

const ensureContentExists = async (type, id) => {
  const table = ensureType(type);
  if (!table) return false;
  const rows = await query(`SELECT id FROM ${table} WHERE id = ?`, [id]);
  return rows.length > 0;
};

exports.getStats = async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!ensureType(type)) {
      return res.status(400).json({ message: 'Invalid content type' });
    }

    const exists = await ensureContentExists(type, id);
    if (!exists) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const likeRows = await query(
      'SELECT COUNT(*) AS count FROM content_likes WHERE content_type = ? AND content_id = ?',
      [type, id]
    );
    const commentRows = await query(
      'SELECT COUNT(*) AS count FROM content_comments WHERE content_type = ? AND content_id = ?',
      [type, id]
    );

    let likedByUser = false;
    if (req.user?.id) {
      const liked = await query(
        'SELECT id FROM content_likes WHERE content_type = ? AND content_id = ? AND user_id = ?',
        [type, id, req.user.id]
      );
      likedByUser = liked.length > 0;
    }

    return res.json({
      likeCount: likeRows[0].count,
      commentCount: commentRows[0].count,
      likedByUser
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load stats', error: error.message });
  }
};

exports.toggleLike = async (req, res) => {
  try {
    const { type, id } = req.params;
    const userId = req.user?.id;
    if (!ensureType(type)) {
      return res.status(400).json({ message: 'Invalid content type' });
    }

    const exists = await ensureContentExists(type, id);
    if (!exists) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const existing = await query(
      'SELECT id FROM content_likes WHERE content_type = ? AND content_id = ? AND user_id = ?',
      [type, id, userId]
    );

    let liked = false;
    if (existing.length > 0) {
      await query('DELETE FROM content_likes WHERE id = ?', [existing[0].id]);
    } else {
      await query(
        'INSERT INTO content_likes (content_type, content_id, user_id) VALUES (?, ?, ?)',
        [type, id, userId]
      );
      liked = true;
    }

    const likeRows = await query(
      'SELECT COUNT(*) AS count FROM content_likes WHERE content_type = ? AND content_id = ?',
      [type, id]
    );

    return res.json({ liked, likeCount: likeRows[0].count });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update like', error: error.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!ensureType(type)) {
      return res.status(400).json({ message: 'Invalid content type' });
    }

    const exists = await ensureContentExists(type, id);
    if (!exists) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const comments = await query(
      `SELECT c.id, c.comment, c.created_at, u.username, u.full_name, u.profile_picture
       FROM content_comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.content_type = ? AND c.content_id = ?
       ORDER BY c.created_at DESC`,
      [type, id]
    );

    return res.json(comments);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load comments', error: error.message });
  }
};

exports.addComment = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { comment } = req.body || {};
    const userId = req.user?.id;

    if (!ensureType(type)) {
      return res.status(400).json({ message: 'Invalid content type' });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ message: 'Comment is required' });
    }

    const exists = await ensureContentExists(type, id);
    if (!exists) {
      return res.status(404).json({ message: 'Content not found' });
    }

    await query(
      'INSERT INTO content_comments (content_type, content_id, user_id, comment) VALUES (?, ?, ?, ?)',
      [type, id, userId, comment.trim()]
    );

    return res.status(201).json({ message: 'Comment added' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add comment', error: error.message });
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const { type, id, commentId } = req.params;

    if (!ensureType(type)) {
      return res.status(400).json({ message: 'Invalid content type' });
    }

    const exists = await ensureContentExists(type, id);
    if (!exists) {
      return res.status(404).json({ message: 'Content not found' });
    }

    const commentRows = await query(
      'SELECT id FROM content_comments WHERE id = ? AND content_type = ? AND content_id = ?',
      [commentId, type, id]
    );

    if (commentRows.length === 0) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    await query('DELETE FROM content_comments WHERE id = ?', [commentId]);
    return res.json({ message: 'Comment deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete comment', error: error.message });
  }
};
