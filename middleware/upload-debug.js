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
    console.log('📁 文件保存目录:', uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const extension = path.extname(file.originalname);
    const filename = `avatar_${timestamp}_${random}${extension}`;
    console.log('📝 生成文件名:', filename);
    cb(null, filename);
  }
});

// 头像上传过滤器
const avatarFilter = (req, file, cb) => {
  console.log('🔍 文件信息:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });
  
  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    console.log('✅ 文件类型验证通过');
    cb(null, true);
  } else {
    console.log('❌ 文件类型验证失败:', file.mimetype);
    cb(new Error('只支持 JPG、PNG、GIF、WebP 格式的图片'), false);
  }
};

// 调试中间件 - 在 multer 之前执行
const debugUpload = (req, res, next) => {
  console.log('🔍 === 上传请求调试信息 ===');
  console.log('请求方法:', req.method);
  console.log('请求URL:', req.url);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Authorization:', req.headers.authorization ? '已设置' : '未设置');
  console.log('请求体类型:', typeof req.body);
  console.log('请求体内容:', req.body);
  console.log('文件对象:', req.file);
  console.log('================================');
  next();
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
  console.log('❌ === 上传错误处理 ===');
  console.log('错误类型:', error.constructor.name);
  console.log('错误消息:', error.message);
  console.log('错误代码:', error.code);
  console.log('错误堆栈:', error.stack);
  console.log('========================');
  
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
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: `意外的文件字段: ${error.field}`,
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
  
  // 处理 "Unexpected field" 错误
  if (error.message.includes('Unexpected field')) {
    return res.status(400).json({
      success: false,
      message: '文件字段名错误，请使用 "avatar" 字段',
      code: 400,
      expectedField: 'avatar',
      receivedFields: Object.keys(req.body || {})
    });
  }
  
  next(error);
};

// 成功上传后的中间件
const afterUpload = (req, res, next) => {
  console.log('✅ === 上传成功 ===');
  console.log('上传的文件:', req.file);
  console.log('文件路径:', req.file?.path);
  console.log('文件URL:', req.file ? `/uploads/avatars/${req.file.filename}` : '无');
  console.log('==================');
  next();
};

module.exports = {
  debugUpload,
  uploadAvatar,
  handleUploadError,
  afterUpload
};
