const db = require('../config/db');

const query = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

const isAdmin = async (userId) => {
  if (!userId) return false;
  const rows = await query('SELECT role FROM users WHERE id = ?', [userId]);
  return rows[0]?.role === 'admin';
};

// Get all videos
exports.getAllVideos = async (req, res) => {
  try {
    const userId = req.user?.id;
    const admin = await isAdmin(userId);
    let sql = 'SELECT * FROM videos';
    const params = [];
    if (!admin) {
      if (userId) {
        sql += ' WHERE status = ? OR uploaded_by = ?';
        params.push('approved', userId);
      } else {
        sql += ' WHERE status = ?';
        params.push('approved');
      }
    }
    sql += ' ORDER BY created_at DESC';
    const results = await query(sql, params);
    res.json(results);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get video by ID
exports.getVideoById = async (req, res) => {
  try {
    const { id } = req.params;
    const results = await query('SELECT * FROM videos WHERE id = ?', [id]);
    if (results.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const video = results[0];
    const userId = req.user?.id;
    const admin = await isAdmin(userId);
    const canView =
      video.status === 'approved' || admin || (userId && Number(video.uploaded_by) === Number(userId));

    if (!canView) {
      return res.status(403).json({ message: 'Video not available' });
    }

    db.query('UPDATE videos SET views = views + 1 WHERE id = ?', [id]);
    res.json(video);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get videos by category
exports.getVideosByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const userId = req.user?.id;
    const admin = await isAdmin(userId);
    let sql = 'SELECT * FROM videos WHERE category = ?';
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
    sql += ' ORDER BY created_at DESC';
    const results = await query(sql, params);
    res.json(results);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Add new video (admin only)
exports.addVideo = async (req, res) => {
  try {
    if (req.authError) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    const {
      title,
      description,
      thumbnail_url,
      video_url,
      duration,
      category,
      guest_name,
      guest_email
    } = req.body || {};
    const uploadedVideo = req.file ? `/uploads/videos/${req.file.filename}` : null;
    const resolvedVideoUrl = uploadedVideo || video_url;

    if (!title) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    if (!resolvedVideoUrl) {
      return res.status(400).json({ message: 'Video file is required.' });
    }

    const userId = req.user?.id || null;
    if (!userId && (!guest_name || !guest_email)) {
      return res.status(400).json({ message: 'Name and email are required for guest uploads.' });
    }

    const admin = await isAdmin(userId);
    const status = admin ? 'approved' : 'pending';
    const fileType = req.file?.mimetype || null;
    const fileSize = req.file?.size || null;

    const result = await query(
      `INSERT INTO videos
        (title, description, thumbnail_url, video_url, duration, category, uploaded_by,
         guest_name, guest_email, status, file_type, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        thumbnail_url || null,
        resolvedVideoUrl,
        duration || null,
        category || null,
        userId,
        guest_name || null,
        guest_email || null,
        status,
        fileType,
        fileSize
      ]
    );

    res.status(201).json({
      message: admin ? 'Video published successfully' : 'Video submitted for review',
      id: result.insertId,
      status
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Update video
exports.updateVideo = (req, res) => {
  const { id } = req.params;
  const { title, description, thumbnail_url, video_url, duration, category } = req.body || {};
  const uploadedVideo = req.file ? `/uploads/videos/${req.file.filename}` : null;

  db.query('SELECT * FROM videos WHERE id = ?', [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const current = rows[0];
    const nextVideoUrl = uploadedVideo || video_url || current.video_url;
    const nextTitle = title !== undefined ? title : current.title;
    const nextDescription = description !== undefined ? description : current.description;
    const nextThumbnail = thumbnail_url !== undefined ? thumbnail_url : current.thumbnail_url;
    const nextDuration = duration !== undefined ? duration : current.duration;
    const nextCategory = category !== undefined ? category : current.category;
    const nextFileType = uploadedVideo ? req.file?.mimetype || null : current.file_type;
    const nextFileSize = uploadedVideo ? req.file?.size || null : current.file_size;

    db.query(
      'UPDATE videos SET title = ?, description = ?, thumbnail_url = ?, video_url = ?, duration = ?, category = ?, file_type = ?, file_size = ? WHERE id = ?',
      [
        nextTitle,
        nextDescription,
        nextThumbnail,
        nextVideoUrl,
        nextDuration,
        nextCategory,
        nextFileType,
        nextFileSize,
        id
      ],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr });
        res.json({ message: 'Video updated successfully' });
      }
    );
  });
};

// Delete video (admin only)
exports.deleteVideo = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM videos WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err });
    db.query(
      'DELETE FROM content_likes WHERE content_type = ? AND content_id = ?',
      ['videos', id]
    );
    db.query(
      'DELETE FROM content_comments WHERE content_type = ? AND content_id = ?',
      ['videos', id]
    );
    res.json({ message: 'Video deleted successfully' });
  });
};
