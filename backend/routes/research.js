const express = require('express');
const router = express.Router();
const researchController = require('../controllers/researchController');
const { verifyToken, optionalAuth } = require('../middleware/auth');
const { requireOwnerOrAdmin } = require('../middleware/ownership');
const { uploadResearch } = require('../middleware/upload');

// Public routes
router.get('/', optionalAuth, researchController.getAllResearch);
router.get('/category/:category', optionalAuth, researchController.getResearchByCategory);
router.get('/author/:author', optionalAuth, researchController.getResearchByAuthor);
router.get('/:id', optionalAuth, researchController.getResearchById);

// Authenticated create
// Multer must run on this route to populate req.body for multipart/form-data.
router.post('/', optionalAuth, uploadResearch.single('researchFile'), researchController.addResearch);

// Owner or admin updates
router.put(
  '/:id',
  verifyToken,
  requireOwnerOrAdmin('research'),
  uploadResearch.single('researchFile'),
  researchController.updateResearch
);
router.delete('/:id', verifyToken, requireOwnerOrAdmin('research'), researchController.deleteResearch);

module.exports = router;
