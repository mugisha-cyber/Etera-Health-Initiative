const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

// Public route for sending messages
router.post('/', contactController.addMessage);

// Admin routes (require authentication)
router.get('/', verifyToken, requireAdmin, contactController.getAllMessages);
router.get('/:id', verifyToken, requireAdmin, contactController.getMessageById);
router.put('/:id', verifyToken, requireAdmin, contactController.updateMessageStatus);
router.delete('/:id', verifyToken, requireAdmin, contactController.deleteMessage);

module.exports = router;
