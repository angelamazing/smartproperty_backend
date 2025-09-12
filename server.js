const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql2/promise');
const path = require('path');
const logger = require('./utils/logger');
const config = require('./config/database');
const { performanceMonitor } = require('./middleware/performance');
const { getCorsConfig } = require('./config/cors');

// 导入路由模块
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const diningRoutes = require('./routes/dining');
const diningEnhancedRoutes = require('./routes/diningEnhanced');
const diningConfirmationRoutes = require('./routes/diningConfirmation');
const qrScanRoutes = require('./routes/qrScan');
const reservationRoutes = require('./routes/reservation');
const venueRoutes = require('./routes/venue');
const verificationRoutes = require('./routes/verification');
const systemRoutes = require('./routes/system');
const adminRoutes = require('./routes/admin');
const dishRoutes = require('./routes/dishes');
const roleRoutes = require('./routes/roles');
const departmentRoutes = require('./routes/department');

const app = express();
const PORT = process.env.PORT || 3000;

// 设置服务器超时配置
app.use((req, res, next) => {
  // 设置请求超时为30秒
  req.setTimeout(30000, () => {
    logger.error('请求超时:', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: '请求超时',
        error: 'Request timeout'
      });
    }
  });
  
  // 设置响应超时为30秒
  res.setTimeout(30000, () => {
    logger.error('响应超时:', {
      method: req.method,
      url: req.url,
      ip: req.ip
    });
    if (!res.headersSent) {
      res.status(408).json({
        success: false,
        message: '响应超时',
        error: 'Response timeout'
      });
    }
  });
  
  next();
});

// 数据库连接池
let dbPool;

// 中间件配置
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "http://localhost:*", "https://localhost:*"],
      fontSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", "http://localhost:*", "https://localhost:*"],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: []
    }
  }
})); // 安全中间件

// CORS 配置 - 允许所有域名访问
app.use(cors({
  origin: true, // 允许所有域名
  credentials: false, // 当允许所有域名时，不能设置credentials为true
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
  optionsSuccessStatus: 200
})); // 跨域中间件
app.use(express.json({ limit: '10mb' })); // JSON解析中间件
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL编码解析

// 静态文件服务配置
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
  setHeaders: (res, path) => {
    // 设置CORS头 - 允许所有域名
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
    res.set('Cache-Control', 'public, max-age=31536000'); // 缓存1年
    
    // 处理OPTIONS请求
    if (res.req.method === 'OPTIONS') {
      res.status(200).end();
    }
  }
}));

app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    // 设置CORS头 - 允许所有域名
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
  }
}));

// 速率限制中间件
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 200, // 限制每个IP在窗口时间内最多100次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    error: '请求频率超限'
  }
});
app.use(limiter);

// 数据库连接中间件
app.use(async (req, res, next) => {
  try {
    if (!dbPool) {
      dbPool = mysql.createPool(config.database);
      logger.info('数据库连接池创建成功');
    }
    req.db = dbPool;
    next();
  } catch (error) {
    logger.error('数据库连接失败:', error);
    res.status(500).json({
      success: false,
      message: '数据库连接失败',
      error: error.message
    });
  }
});

// 全局CORS中间件
app.use((req, res, next) => {
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080', 
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://127.0.0.1:5175'
  ];
  
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
  // 注意：当使用 * 作为 Origin 时，不能设置 credentials: true
  // res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

// 性能监控中间件
app.use(performanceMonitor);

// 请求日志中间件
app.use((req, res, next) => {
  const startTime = Date.now();
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// 头像访问路由
app.get('/avatar/:filename', (req, res) => {
  const filename = req.params.filename;
  const avatarPath = path.join(__dirname, 'public', 'uploads', 'avatars', filename);
  
  // 设置CORS头 - 允许所有域名
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
  res.set('Cache-Control', 'public, max-age=31536000');
  
  // 检查文件是否存在
  if (require('fs').existsSync(avatarPath)) {
    res.sendFile(avatarPath);
  } else {
    res.status(404).json({
      success: false,
      message: '头像文件不存在'
    });
  }
});

// 静态文件API路由（推荐使用）
app.get('/api/static/uploads/avatars/:filename', (req, res) => {
  const filename = req.params.filename;
  const avatarPath = path.join(__dirname, 'public', 'uploads', 'avatars', filename);
  
  // 设置CORS头 - 允许所有域名
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
  res.set('Cache-Control', 'public, max-age=31536000');
  
  // 检查文件是否存在
  if (require('fs').existsSync(avatarPath)) {
    res.sendFile(avatarPath);
  } else {
    res.status(404).json({
      success: false,
      message: '头像文件不存在'
    });
  }
});

// 路由配置
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dining', diningRoutes);
app.use('/api/dining/enhanced', diningEnhancedRoutes);
app.use('/api/dining-confirmation', diningConfirmationRoutes);
app.use('/api/qr-scan', qrScanRoutes);
app.use('/api/department', departmentRoutes);
app.use('/api/reservation', reservationRoutes);
app.use('/api/venue', venueRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/admin/dishes', dishRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/roles', roleRoutes);

// 健康检查接口
app.get('/health', async (req, res) => {
  try {
    // 检查数据库连接
    const connection = await req.db.getConnection();
    await connection.ping();
    connection.release();
    
    res.json({
      success: true,
      message: '服务运行正常',
      timestamp: new Date().toISOString(),
      database: '已连接'
    });
  } catch (error) {
    logger.error('健康检查失败:', error);
    res.status(500).json({
      success: false,
      message: '服务异常',
      error: error.message
    });
  }
});

// 404错误处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在',
    path: req.originalUrl
  });
});

// 全局错误处理中间件
app.use((error, req, res, next) => {
  logger.error('服务器错误:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? error.stack : '服务器错误'
  });
});

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('收到SIGTERM信号，开始优雅关闭服务器...');
  
  if (dbPool) {
    await dbPool.end();
    logger.info('数据库连接池已关闭');
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('收到SIGINT信号，开始优雅关闭服务器...');
  
  if (dbPool) {
    await dbPool.end();
    logger.info('数据库连接池已关闭');
  }
  
  process.exit(0);
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`智慧物业管理系统后端服务启动成功，端口: ${PORT}`);
  logger.info(`健康检查地址: http://localhost:${PORT}/health`);
});

module.exports = app;
