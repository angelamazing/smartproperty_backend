const config = require('../config/database');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 开发环境验证中间件
 * 确保某些接口只在开发环境可用
 */
const validateDevEnvironment = (req, res, next) => {
  // 检查是否为开发环境
  if (config.server.env !== 'development') {
    logger.warn(`非开发环境访问测试接口: ${req.method} ${req.path} - ${req.ip}`);
    
    return response.error(res, '该接口仅在开发环境可用', null, 403);
  }
  
  // 检查测试登录是否启用
  if (!config.testLogin.enabled) {
    logger.warn(`测试登录功能已禁用: ${req.method} ${req.path} - ${req.ip}`);
    
    return response.error(res, '测试登录功能已禁用', null, 403);
  }
  
  next();
};

module.exports = {
  validateDevEnvironment
};
