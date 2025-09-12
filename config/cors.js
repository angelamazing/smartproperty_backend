/**
 * CORS配置文件
 * 支持环境变量配置，便于不同环境的部署
 */

const logger = require('../utils/logger');

/**
 * 获取CORS配置
 * @param {string} env - 环境变量 NODE_ENV
 * @returns {Object} CORS配置对象
 */
function getCorsConfig(env = 'development') {
  // 基础允许的域名列表
  const baseOrigins = [
    // 本地开发环境
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

  // 从环境变量获取允许的域名
  const envOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

  // 合并所有允许的域名
  const allowedOrigins = [...baseOrigins, ...envOrigins];

  // 生产环境添加默认的生产域名
  if (env === 'production') {
    const productionOrigins = [
      'https://your-domain.com',
      'https://www.your-domain.com',
      'https://admin.your-domain.com',
      'https://app.your-domain.com'
    ];
    allowedOrigins.push(...productionOrigins);
  }

  return {
    origin: function (origin, callback) {
      // 允许没有origin的请求（比如同源请求、Postman等工具）
      if (!origin) return callback(null, true);
      
      // 检查是否在允许列表中
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        // 记录被阻止的请求
        logger.warn('CORS blocked origin:', {
          origin: origin,
          timestamp: new Date().toISOString(),
          environment: env,
          allowedOrigins: allowedOrigins
        });
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: false, // 修复CORS问题：当使用 * 作为 Origin 时，不能设置 credentials: true
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept'],
    optionsSuccessStatus: 200 // 某些浏览器需要这个
  };
}

/**
 * 获取允许的域名列表（用于日志记录）
 * @returns {Array} 允许的域名列表
 */
function getAllowedOrigins() {
  const baseOrigins = [
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

  const envOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
    : [];

  return [...baseOrigins, ...envOrigins];
}

module.exports = {
  getCorsConfig,
  getAllowedOrigins
};
