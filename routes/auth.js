const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validate, schemas } = require('../utils/validation');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const { validateDevEnvironment } = require('../middleware/devEnvironment');
const response = require('../utils/response');
const logger = require('../utils/logger');

// 统一的错误处理包装器
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
  logger.error('认证路由错误:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id
  });
  
  if (err.name === 'ValidationError') {
    return response.badRequest(res, '参数验证失败', err.message);
  }
  
  if (err.name === 'UnauthorizedError') {
    return response.unauthorized(res, '认证失败', err.message);
  }
  
  return response.serverError(res, '服务器内部错误', err.message);
};

/**
 * 认证路由
 */

// 微信授权登录
router.post('/wechat-login', 
  validate(schemas.auth.wechatLogin),
  asyncHandler(authController.wechatLogin)
);

// 手机号验证码登录
router.post('/phone-login',
  validate(schemas.auth.phoneLogin),
  asyncHandler(authController.phoneLogin)
);

// 手机号密码登录
router.post('/phone-password-login',
  validate(schemas.auth.phonePasswordLogin),
  asyncHandler(authController.phonePasswordLogin)
);

// 发送验证码
router.post('/send-verification-code',
  validate(schemas.auth.sendVerificationCode),
  asyncHandler(authController.sendVerificationCode)
);

// Token验证
router.post('/validate-token',
  validate(schemas.auth.validateToken),
  asyncHandler(authController.validateToken)
);

// 测试登录（仅开发环境）
router.post('/test-login',
  validateDevEnvironment,
  asyncHandler(authController.testLogin)
);

// 部门管理员测试登录（仅开发环境）
router.post('/test-login-admin',
  validateDevEnvironment,
  asyncHandler(authController.testLoginAdmin)
);

// 系统管理员测试登录（仅开发环境）
router.post('/test-login-sys-admin',
  validateDevEnvironment,
  asyncHandler(authController.testLoginSysAdmin)
);

// 指定部门的部门管理员测试登录（仅开发环境）
router.post('/test-login-dept-admin',
  validateDevEnvironment,
  asyncHandler(authController.testLoginDeptAdmin)
);

// 用户登出
router.post('/logout',
  optionalAuth,
  asyncHandler(authController.logout)
);

// 刷新Token
router.post('/refresh-token',
  asyncHandler(authController.refreshToken)
);

// 注册错误处理中间件
router.use(errorHandler);

module.exports = router;
