const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const screenshotController = require('../controllers/screenshotController');

// Normalize req.file from either 'file' or 'image' field
const handleFileUpload = (req, res, next) => {
  const uploadHandler = upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'image', maxCount: 1 },
  ]);

  uploadHandler(req, res, (err) => {
    if (err) return next(err);
    if (req.files) {
      req.file = req.files.file?.[0] || req.files.image?.[0];
    }
    next();
  });
};

// Routes
router.post('/upload', handleFileUpload, screenshotController.uploadScreenshot);
router.get('/search', screenshotController.searchScreenshots);
router.get('/screenshots', screenshotController.getAllScreenshots);
router.get('/screenshots/:id', screenshotController.getScreenshotById);
router.delete('/screenshots/:id', screenshotController.deleteScreenshot);
router.get('/stats', screenshotController.getStats);

module.exports = router;
