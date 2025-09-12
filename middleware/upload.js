const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const ensureUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 头像上传配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
    ensureUploadDir(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const extension = path.extname(file.originalname);
    const filename = `avatar_${timestamp}_${random}${extension}`;
    cb(null, filename);
  }
});

// 头像上传过滤器
const avatarFilter = (req, file, cb) => {
  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持 JPG、PNG、GIF、WebP 格式的图片'), false);
  }
};

// 头像上传中间件
const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1 // 只允许上传1个文件
  }
}).single('avatar');

// 错误处理中间件
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '头像文件大小不能超过 2MB',
        code: 400
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '只能上传一个头像文件',
        code: 400
      });
    }
  }
  
  if (error.message.includes('只支持')) {
    return res.status(400).json({
      success: false,
      message: error.message,
      code: 400
    });
  }
  
  next(error);
};

module.exports = {
  uploadAvatar,
  handleUploadError
};
