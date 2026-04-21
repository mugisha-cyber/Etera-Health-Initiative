const express = require('express');
const router = express.Router();
const engagementController = require('../controllers/engagementController');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

router.get('/:type/:id/stats', optionalAuth, engagementController.getStats);
router.post('/:type/:id/like', verifyToken, engagementController.toggleLike);
router.get('/:type/:id/comments', engagementController.getComments);
router.post('/:type/:id/comments', verifyToken, engagementController.addComment);
router.delete('/:type/:id/comments/:commentId', verifyToken, requireAdmin, engagementController.deleteComment);

module.exports = router;
