const fs = require('fs');
const path = require('path');
const multer = require('multer');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// Multer is the middleware that parses multipart/form-data.
// If the route uses the wrong field name or skips multer, req.body will be undefined.
// That is why the route order and exact field names matter for uploads.
const createStorage = (subdir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '..', 'uploads', subdir);
      ensureDir(uploadPath);
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '');
      const safeExt = ext.length <= 10 ? ext : '';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
      cb(null, unique);
    }
  });

const videoFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('video/')) {
    return cb(null, true);
  }
  return cb(new Error('Only video files are allowed.'));
};

const documentFilter = (req, file, cb) => {
  if (
    file.mimetype === 'application/pdf' ||
    file.mimetype === 'application/msword' ||
    file.mimetype ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return cb(null, true);
  }
  return cb(new Error('Only PDF or Word documents are allowed.'));
};

const imageFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    return cb(null, true);
  }
  return cb(new Error('Only image files are allowed.'));
};

const createUploader = (subdir, fileFilter, limits = {}) =>
  multer({
    storage: createStorage(subdir),
    fileFilter,
    limits
  });

const uploadVideo = createUploader('videos', videoFilter, {
  fileSize: 1024 * 1024 * 100
});

const uploadReel = createUploader('reels', videoFilter, {
  fileSize: 1024 * 1024 * 100
});

const uploadResearch = createUploader('research', documentFilter, {
  fileSize: 1024 * 1024 * 50
});

const uploadProfile = createUploader('profiles', imageFilter, {
  fileSize: 1024 * 1024 * 5
});

const uploadGallery = createUploader('gallery', imageFilter, {
  fileSize: 1024 * 1024 * 8
});

module.exports = {
  uploadVideo,
  uploadReel,
  uploadResearch,
  uploadProfile,
  uploadGallery
};
