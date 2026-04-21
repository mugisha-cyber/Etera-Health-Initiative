const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsController');
const { verifyToken } = require('../middleware/auth');
const { requireOwnerOrAdmin } = require('../middleware/ownership');

// Public routes
router.get('/', postsController.getAllPosts);
router.get('/:id', postsController.getPostById);

// Authenticated create
router.post('/', verifyToken, postsController.addPost);

// Owner or admin updates
router.put('/:id', verifyToken, requireOwnerOrAdmin('posts'), postsController.updatePost);
router.delete('/:id', verifyToken, requireOwnerOrAdmin('posts'), postsController.deletePost);

module.exports = router;
