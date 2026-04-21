const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const contentController = require('../controllers/contentController');
const { verifyToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

router.use(verifyToken, requireAdmin);

router.get('/users', adminController.getAllUsers);
router.get('/user/:id', adminController.getUserById);
router.delete('/user/:id', adminController.deleteUser);
router.put('/user/:id/role', adminController.updateUserRole);

router.get('/dashboard', contentController.getDashboardContent);
router.put('/dashboard', contentController.updateDashboardContent);
router.put('/content/:type/:id/status', adminController.updateContentStatus);

module.exports = router;
