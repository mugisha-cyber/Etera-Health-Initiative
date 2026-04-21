const db = require('../config/db');

// Get all gallery items
exports.getAllGallery = (req, res) => {
  db.query(
    'SELECT * FROM gallery ORDER BY event_date DESC',
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    }
  );
};

// Get gallery item by ID
exports.getGalleryById = (req, res) => {
  const { id } = req.params;
  db.query(
    'SELECT * FROM gallery WHERE id = ?',
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      if (results.length === 0) {
        return res.status(404).json({ message: 'Gallery item not found' });
      }
      res.json(results[0]);
    }
  );
};

// Get gallery items by event
exports.getGalleryByEvent = (req, res) => {
  const { event } = req.params;
  db.query(
    'SELECT * FROM gallery WHERE event_title LIKE ? ORDER BY event_date DESC',
    [`%${event}%`],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.json(results);
    }
  );
};

// Add new gallery item (admin + user)
exports.addGallery = (req, res) => {
  const { image_url, description, event_title, event_date, event_location } = req.body || {};
  const uploadedImage = req.file ? `/uploads/gallery/${req.file.filename}` : null;
  const resolvedImageUrl = uploadedImage || image_url;

  if (!resolvedImageUrl) {
    return res.status(400).json({ message: 'Image URL is required' });
  }

  db.query(
    'INSERT INTO gallery (image_url, description, event_title, event_date, event_location, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)',
    [
      resolvedImageUrl,
      description || null,
      event_title || null,
      event_date || null,
      event_location || null,
      req.user?.id || null
    ],
    (err, results) => {
      if (err) return res.status(500).json({ error: err });
      res.status(201).json({
        message: 'Gallery item added successfully',
        id: results.insertId
      });
    }
  );
};

// Update gallery item
exports.updateGallery = (req, res) => {
  const { id } = req.params;
  const { image_url, description, event_title, event_date, event_location } = req.body || {};

  db.query(
    'UPDATE gallery SET image_url = ?, description = ?, event_title = ?, event_date = ?, event_location = ? WHERE id = ?',
    [image_url, description, event_title, event_date, event_location, id],
    (err) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: 'Gallery item updated successfully' });
    }
  );
};

// Delete gallery item (admin only)
exports.deleteGallery = (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM gallery WHERE id = ?', [id], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: 'Gallery item deleted successfully' });
  });
};

