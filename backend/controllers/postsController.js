const db = require('../config/db');

// Get all posts
exports.getAllPosts = (req, res) => {
  db.query(
    'SELECT * FROM posts ORDER BY created_at DESC',
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    }
  );
};

// Get post by ID
exports.getPostById = (req, res) => {
  const { id } = req.params;
  db.query(
    'SELECT * FROM posts WHERE id = ?',
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      if (results.length === 0) {
        return res.status(404).json({ message: 'Post not found' });
      }
      res.json(results[0]);
    }
  );
};

// Add new post (admin or user)
exports.addPost = (req, res) => {
  const { title, body, category } = req.body || {};

  if (!title || !body) {
    return res.status(400).json({ message: 'Title and body are required' });
  }

  db.query(
    'INSERT INTO posts (title, body, category, uploaded_by) VALUES (?, ?, ?, ?)',
    [title, body, category || null, req.user?.id || null],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.status(201).json({
        message: 'Post created successfully',
        id: results.insertId
      });
    }
  );
};

// Update post
exports.updatePost = (req, res) => {
  const { id } = req.params;
  const { title, body, category } = req.body || {};

  db.query('SELECT * FROM posts WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const current = rows[0];
    const nextTitle = title !== undefined ? title : current.title;
    const nextBody = body !== undefined ? body : current.body;
    const nextCategory = category !== undefined ? category : current.category;

    db.query(
      'UPDATE posts SET title = ?, body = ?, category = ? WHERE id = ?',
      [nextTitle, nextBody, nextCategory, id],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr });
        res.json({ message: 'Post updated successfully' });
      }
    );
  });
};

// Delete post
exports.deletePost = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM posts WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err });
    db.query(
      'DELETE FROM content_likes WHERE content_type = ? AND content_id = ?',
      ['posts', id]
    );
    db.query(
      'DELETE FROM content_comments WHERE content_type = ? AND content_id = ?',
      ['posts', id]
    );
    res.json({ message: 'Post deleted successfully' });
  });
};
