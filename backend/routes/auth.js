const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const { uploadProfile } = require('../middleware/upload');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/reset-password', authController.resetPassword);

// Protected routes
router.get('/verify', verifyToken, authController.verifyToken);
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);
router.put('/profile/picture', verifyToken, uploadProfile.single('profilePicture'), authController.updateProfilePicture);
router.put('/subscription', verifyToken, authController.updateSubscription);

module.exports = router;


