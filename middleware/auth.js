const jwt = require('jsonwebtoken');
const config = require('../config/database');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * JWT Token验证中间件
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return response.unauthorized(res, '缺少访问令牌');
    }
    
    // 验证Token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // 检查Token是否在数据库中存在且未过期
    const [tokenRows] = await req.db.execute(
      'SELECT ut.*, u.status, u.role FROM user_tokens ut JOIN users u ON ut.userId = u._id WHERE ut.token = ? AND ut.expireTime > NOW()',
      [token]
    );
    
    if (tokenRows.length === 0) {
      return response.unauthorized(res, 'Token无效或已过期');
    }
    
    const tokenInfo = tokenRows[0];
    
    // 检查用户状态
    if (tokenInfo.status !== 'active') {
      return response.unauthorized(res, '用户账号已被禁用');
    }
    
    // 更新Token最后使用时间
    await req.db.execute(
      'UPDATE user_tokens SET lastUsedTime = NOW() WHERE token = ?',
      [token]
    );
    
    // 将用户信息添加到请求对象
    req.user = {
      id: tokenInfo.userId,
      openid: tokenInfo.openid,
      phoneNumber: tokenInfo.phoneNumber,
      role: tokenInfo.role,
      status: tokenInfo.status,
      isTestUser: tokenInfo.isTestToken || false
    };
    
    logger.info(`认证成功: userId=${req.user.id}, role=${req.user.role}`);
    
    next();
  } catch (error) {
    logger.error('Token验证失败:', error);
    
    if (error.name === 'TokenExpiredError') {
      return response.unauthorized(res, 'Token已过期，请重新登录');
    } else if (error.name === 'JsonWebTokenError') {
      return response.unauthorized(res, 'Token格式无效');
    }
    
    return response.serverError(res, 'Token验证失败', error.message);
  }
};

/**
 * 角色权限验证中间件
 * @param {Array} allowedRoles - 允许的角色列表
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return response.unauthorized(res, '用户未登录');
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return response.forbidden(res, '权限不足，无法访问此资源');
    }
    
    next();
  };
};

/**
 * 可选的Token验证中间件（不强制要求登录）
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const [tokenRows] = await req.db.execute(
      'SELECT ut.*, u.status, u.role FROM user_tokens ut JOIN users u ON ut.userId = u._id WHERE ut.token = ? AND ut.expireTime > NOW()',
      [token]
    );
    
    if (tokenRows.length > 0) {
      const tokenInfo = tokenRows[0];
      if (tokenInfo.status === 'active') {
        req.user = {
          id: tokenInfo.userId,
          openid: tokenInfo.openid,
          phoneNumber: tokenInfo.phoneNumber,
          role: tokenInfo.role,
          status: tokenInfo.status,
          isTestUser: tokenInfo.isTestToken || false
        };
      } else {
        req.user = null;
      }
    } else {
      req.user = null;
    }
    
    next();
  } catch (error) {
    logger.error('可选Token验证失败:', error);
    req.user = null;
    next();
  }
};

/**
 * 部门管理员权限验证
 */
const requireDeptAdmin = (req, res, next) => {
  if (!req.user) {
    return response.unauthorized(res, '用户未登录');
  }
  
  if (!['dept_admin', 'sys_admin'].includes(req.user.role)) {
    return response.forbidden(res, '需要部门管理员权限');
  }
  
  next();
};

/**
 * 系统管理员权限验证
 */
const requireSysAdmin = (req, res, next) => {
  if (!req.user) {
    return response.unauthorized(res, '用户未登录');
  }
  
  if (req.user.role !== 'sys_admin') {
    return response.forbidden(res, '需要系统管理员权限');
  }
  
  next();
};


module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth,
  requireDeptAdmin,
  requireSysAdmin
};
