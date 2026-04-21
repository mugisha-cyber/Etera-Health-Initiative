const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

router.get('/dashboard', contentController.getDashboardContent);

module.exports = router;
