const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { requireOwnerOrAdmin } = require('../middleware/ownership');
const { uploadVideo } = require('../middleware/upload');

// Public routes
router.get('/', optionalAuth, videoController.getAllVideos);
router.get('/category/:category', optionalAuth, videoController.getVideosByCategory);
router.get('/:id', optionalAuth, videoController.getVideoById);

// Authenticated create (user or admin)
// Multer must run on this route to populate req.body for multipart/form-data.
router.post('/', optionalAuth, uploadVideo.single('videoFile'), videoController.addVideo);
// Owner or admin updates
router.put(
  '/:id',
  verifyToken,
  requireOwnerOrAdmin('videos'),
  uploadVideo.single('videoFile'),
  videoController.updateVideo
);
router.delete('/:id', verifyToken, requireOwnerOrAdmin('videos'), videoController.deleteVideo);

module.exports = router;
