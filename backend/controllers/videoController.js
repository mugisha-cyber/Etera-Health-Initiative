const db = require('../config/db');
const fs = require('fs');
const path = require('path');

const query = (sql, params) =>
  new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });

let cachedVideoSchema = null;

const parseEnumValues = (type) => {
  const match = String(type || '').match(/^enum\((.*)\)$/i);
  if (!match) return [];
  const body = match[1];
  // Values are quoted and comma-separated: 'a','b','c'
  return body
    .split(',')
    .map((part) => part.trim().replace(/^'/, '').replace(/'$/, ''))
    .filter(Boolean);
};

const getVideoSchema = async () => {
  if (cachedVideoSchema) return cachedVideoSchema;

  const columns = await query('SHOW COLUMNS FROM videos', []);
  const fieldSet = new Set(columns.map((col) => col.Field));
  const statusType = columns.find((col) => col.Field === 'status')?.Type;
  const allowedStatusValues = parseEnumValues(statusType);

  const videoUrlColumn = fieldSet.has('video_url')
    ? 'video_url'
    : fieldSet.has('file_path')
      ? 'file_path'
      : null;
  const thumbnailColumn = fieldSet.has('thumbnail_url')
    ? 'thumbnail_url'
    : fieldSet.has('thumbnail')
      ? 'thumbnail'
      : null;

  const mapStatus = (desired) => {
    if (allowedStatusValues.length === 0) return desired;
    if (allowedStatusValues.includes(desired)) return desired;

    // Legacy schema mapping
    if (allowedStatusValues.includes('published') && allowedStatusValues.includes('draft')) {
      if (desired === 'approved') return 'published';
      if (desired === 'pending' || desired === 'rejected') return 'draft';
    }

    // Fallback to first allowed value
    return allowedStatusValues[0];
  };

  cachedVideoSchema = {
    fields: fieldSet,
    videoUrlColumn,
    thumbnailColumn,
    hasCategory: fieldSet.has('category'),
    hasDuration: fieldSet.has('duration'),
    hasFileType: fieldSet.has('file_type'),
    hasFileSize: fieldSet.has('file_size'),
    hasGuestName: fieldSet.has('guest_name'),
    hasGuestEmail: fieldSet.has('guest_email'),
    mapStatus,
    statusApproved: mapStatus('approved'),
    statusPending: mapStatus('pending')
  };
  return cachedVideoSchema;
};

const enrichVideoRow = (row, schema) => {
  if (!row || typeof row !== 'object') return row;
  const next = { ...row };
  if (next.video_url === undefined && schema.videoUrlColumn && next[schema.videoUrlColumn]) {
    next.video_url = next[schema.videoUrlColumn];
  }
  if (next.thumbnail_url === undefined && schema.thumbnailColumn && next[schema.thumbnailColumn]) {
    next.thumbnail_url = next[schema.thumbnailColumn];
  }
  return next;
};

const deleteLocalUpload = (publicPath) => {
  if (!publicPath || typeof publicPath !== 'string') return;
  if (!publicPath.startsWith('/uploads/videos/')) return;
  const filename = path.basename(publicPath);
  if (!filename || filename === '.' || filename === '..') return;
  const diskPath = path.join(__dirname, '..', 'uploads', 'videos', filename);
  try {
    if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
  } catch (_) {
    // Best-effort cleanup only.
  }
};

const resolveUserIsAdmin = async (userId) => {
  if (!userId) return false;
  const rows = await query('SELECT role FROM users WHERE id = ?', [userId]);
  return rows[0]?.role === 'admin';
};

// Get all videos
exports.getAllVideos = async (req, res) => {
  try {
    const schema = await getVideoSchema();
    const userId = req.user?.id;
    const isAdmin = await resolveUserIsAdmin(userId);

    let sql = 'SELECT * FROM videos';
    const params = [];
    if (!isAdmin) {
      if (userId) {
        sql += ' WHERE status = ? OR uploaded_by = ?';
        params.push(schema.statusApproved, userId);
      } else {
        sql += ' WHERE status = ?';
        params.push(schema.statusApproved);
      }
    }
    sql += ' ORDER BY created_at DESC';

    const results = await query(sql, params);
    return res.json(results.map((row) => enrichVideoRow(row, schema)));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch videos', error: error.message });
  }
};

// Get videos by category
exports.getVideosByCategory = async (req, res) => {
  try {
    const schema = await getVideoSchema();
    if (!schema.hasCategory) {
      return res.status(400).json({ message: 'Video categories are not enabled in this database schema.' });
    }

    const { category } = req.params;
    const userId = req.user?.id;
    const isAdmin = await resolveUserIsAdmin(userId);

    let sql = 'SELECT * FROM videos WHERE category = ?';
    const params = [category];
    if (!isAdmin) {
      if (userId) {
        sql += ' AND (status = ? OR uploaded_by = ?)';
        params.push(schema.statusApproved, userId);
      } else {
        sql += ' AND status = ?';
        params.push(schema.statusApproved);
      }
    }
    sql += ' ORDER BY created_at DESC';

    const results = await query(sql, params);
    return res.json(results.map((row) => enrichVideoRow(row, schema)));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch videos', error: error.message });
  }
};

// Get video by ID
exports.getVideoById = async (req, res) => {
  try {
    const schema = await getVideoSchema();
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }

    const rows = await query('SELECT * FROM videos WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const video = rows[0];
    const userId = req.user?.id;
    const isAdmin = await resolveUserIsAdmin(userId);

    const canView =
      video.status === schema.statusApproved ||
      isAdmin ||
      (userId && Number(video.uploaded_by) === Number(userId));
    if (!canView) {
      return res.status(403).json({ message: 'Video not available' });
    }

    return res.json(enrichVideoRow(video, schema));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch video', error: error.message });
  }
};

// Add new video (admin publishes, user submits for moderation)
exports.addVideo = async (req, res) => {
  try {
    if (req.authError) {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

    const schema = await getVideoSchema();
    const { title, description, category, duration, video_url, videoUrl, thumbnail_url, thumbnailUrl, guest_name, guest_email } =
      req.body || {};

    const uploadedVideo = req.file ? `/uploads/videos/${req.file.filename}` : null;
    const resolvedVideoUrl = uploadedVideo || video_url || videoUrl || null;
    const resolvedThumbnail = thumbnail_url || thumbnailUrl || null;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!resolvedVideoUrl) {
      return res.status(400).json({ message: 'Video file or URL is required' });
    }

    const userId = req.user?.id || null;
    if (!userId && (!guest_name || !guest_email)) {
      return res.status(400).json({ message: 'Name and email are required for guest uploads.' });
    }

    const isAdmin = await resolveUserIsAdmin(userId);
    const status = isAdmin ? schema.statusApproved : schema.statusPending;

    const videoColumn = schema.videoUrlColumn;
    if (!videoColumn) {
      return res.status(500).json({ message: 'Video storage column not found in database schema.' });
    }

    const columns = ['title', 'description', videoColumn, 'uploaded_by', 'status'];
    const values = [title, description || null, resolvedVideoUrl, userId, status];

    if (schema.thumbnailColumn) {
      columns.push(schema.thumbnailColumn);
      values.push(resolvedThumbnail);
    }

    if (schema.hasCategory) {
      columns.push('category');
      values.push(category || null);
    }

    if (schema.hasDuration) {
      columns.push('duration');
      values.push(duration ? Number(duration) : null);
    }

    if (schema.hasGuestName) {
      columns.push('guest_name');
      values.push(guest_name || null);
    }

    if (schema.hasGuestEmail) {
      columns.push('guest_email');
      values.push(guest_email || null);
    }

    if (schema.hasFileType) {
      columns.push('file_type');
      values.push(req.file?.mimetype || null);
    }

    if (schema.hasFileSize) {
      columns.push('file_size');
      values.push(req.file?.size || null);
    }

    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO videos (${columns.join(', ')}) VALUES (${placeholders})`;
    const result = await query(sql, values);

    return res.status(201).json({
      message: isAdmin ? 'Video published successfully' : 'Video submitted for review',
      id: result.insertId,
      status
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to add video', error: error.message });
  }
};

// Update video
exports.updateVideo = async (req, res) => {
  try {
    const schema = await getVideoSchema();
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }

    const rows = await query('SELECT * FROM videos WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const current = rows[0];
    const { title, description, category, duration, video_url, videoUrl, thumbnail_url, thumbnailUrl } =
      req.body || {};
    const uploadedVideo = req.file ? `/uploads/videos/${req.file.filename}` : null;

    const videoColumn = schema.videoUrlColumn;
    if (!videoColumn) {
      return res.status(500).json({ message: 'Video storage column not found in database schema.' });
    }

    const currentVideoUrl = current[videoColumn] || current.video_url || null;
    const nextVideoUrl = uploadedVideo || video_url || videoUrl || currentVideoUrl;
    const nextTitle = title !== undefined ? title : current.title;
    const nextDescription = description !== undefined ? description : current.description;

    const updates = ['title = ?', 'description = ?', `${videoColumn} = ?`];
    const params = [nextTitle, nextDescription, nextVideoUrl];

    if (schema.thumbnailColumn) {
      const currentThumb = current[schema.thumbnailColumn] || current.thumbnail_url || null;
      const nextThumb = thumbnail_url || thumbnailUrl || currentThumb;
      updates.push(`${schema.thumbnailColumn} = ?`);
      params.push(nextThumb);
    }

    if (schema.hasCategory && category !== undefined) {
      updates.push('category = ?');
      params.push(category);
    }

    if (schema.hasDuration && duration !== undefined) {
      updates.push('duration = ?');
      params.push(duration ? Number(duration) : null);
    }

    if (schema.hasFileType && uploadedVideo) {
      updates.push('file_type = ?');
      params.push(req.file?.mimetype || null);
    }

    if (schema.hasFileSize && uploadedVideo) {
      updates.push('file_size = ?');
      params.push(req.file?.size || null);
    }

    params.push(id);
    await query(`UPDATE videos SET ${updates.join(', ')} WHERE id = ?`, params);

    if (uploadedVideo && currentVideoUrl && currentVideoUrl !== uploadedVideo) {
      deleteLocalUpload(currentVideoUrl);
    }

    return res.json({ message: 'Video updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update video', error: error.message });
  }
};

// Delete video
exports.deleteVideo = async (req, res) => {
  try {
    const schema = await getVideoSchema();
    const { id } = req.params;
    if (!id || isNaN(id)) {
      return res.status(400).json({ message: 'Invalid video ID' });
    }

    const rows = await query('SELECT * FROM videos WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const current = rows[0];
    const videoColumn = schema.videoUrlColumn;
    const currentVideoUrl = videoColumn ? current[videoColumn] : current.video_url;

    await query('DELETE FROM videos WHERE id = ?', [id]);
    await query('DELETE FROM content_likes WHERE content_type = ? AND content_id = ?', ['videos', id]);
    await query('DELETE FROM content_comments WHERE content_type = ? AND content_id = ?', ['videos', id]);

    deleteLocalUpload(currentVideoUrl);

    return res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete video', error: error.message });
  }
};

