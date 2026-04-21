const db = require('../config/db');
const logger = require('../config/logger');

const query = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

// Get all posts
exports.getAllPosts = async (req, res) => {
  try {
    const results = await query('SELECT * FROM posts ORDER BY created_at DESC', []);
    res.json(results);
  } catch (error) {
    logger.error('Error fetching posts', error);
    res.status(500).json({ message: 'Failed to fetch posts', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Get post by ID
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const results = await query('SELECT * FROM posts WHERE id = ?', [id]);
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.json(results[0]);
  } catch (error) {
    logger.error('Error fetching post', error);
    res.status(500).json({ message: 'Failed to fetch post', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Add new post (admin or user)
exports.addPost = async (req, res) => {
  try {
    const { title, body, category } = req.body || {};

    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    const results = await query(
      'INSERT INTO posts (title, body, category, uploaded_by) VALUES (?, ?, ?, ?)',
      [title, body, category || null, req.user?.id || null]
    );
    
    res.status(201).json({
      message: 'Post created successfully',
      id: results.insertId
    });
  } catch (error) {
    logger.error('Error creating post', error);
    res.status(500).json({ message: 'Failed to create post', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Update post
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, category } = req.body || {};

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    const rows = await query('SELECT * FROM posts WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const current = rows[0];
    const nextTitle = title !== undefined ? title : current.title;
    const nextBody = body !== undefined ? body : current.body;
    const nextCategory = category !== undefined ? category : current.category;

    await query(
      'UPDATE posts SET title = ?, body = ?, category = ? WHERE id = ?',
      [nextTitle, nextBody, nextCategory, id]
    );
    
    res.json({ message: 'Post updated successfully' });
  } catch (error) {
    logger.error('Error updating post', error);
    res.status(500).json({ message: 'Failed to update post', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// Delete post
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid post ID' });
    }

    // Verify post exists
    const rows = await query('SELECT * FROM posts WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Delete related data
    await query('DELETE FROM content_likes WHERE content_type = ? AND content_id = ?', ['posts', id]);
    await query('DELETE FROM content_comments WHERE content_type = ? AND content_id = ?', ['posts', id]);
    
    // Delete post
    await query('DELETE FROM posts WHERE id = ?', [id]);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    logger.error('Error deleting post', error);
    res.status(500).json({ message: 'Failed to delete post', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};
