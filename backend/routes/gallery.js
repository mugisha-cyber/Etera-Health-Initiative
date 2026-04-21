const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/galleryController');
const { verifyToken } = require('../middleware/auth');
const { uploadGallery } = require('../middleware/upload');
const { requireAdmin } = require('../middleware/admin');

// Public routes
router.get('/', galleryController.getAllGallery);
router.get('/event/:event', galleryController.getGalleryByEvent);
router.get('/:id', galleryController.getGalleryById);

// Authenticated users (admin + user) can add gallery
router.post('/', verifyToken, uploadGallery.single('imageFile'), galleryController.addGallery);
router.put('/:id', verifyToken, requireAdmin, galleryController.updateGallery);
router.delete('/:id', verifyToken, requireAdmin, galleryController.deleteGallery);

module.exports = router;


