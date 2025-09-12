const logger = require('../utils/logger');

/**
 * 角色权限中间件
 * 验证用户是否具有指定的角色权限
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // 检查用户是否已认证
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: '未授权访问',
          error: 'UNAUTHORIZED'
        });
      }

      const userRole = req.user.role;
      
      // 检查用户角色是否在允许的角色列表中
      if (!allowedRoles.includes(userRole)) {
        logger.warn(`用户 ${req.user.id} 尝试访问需要 ${allowedRoles.join('或')} 权限的接口，当前角色: ${userRole}`);
        
        return res.status(403).json({
          success: false,
          message: '权限不足',
          error: 'FORBIDDEN',
          requiredRoles: allowedRoles,
          currentRole: userRole
        });
      }

      // 权限验证通过，继续执行
      logger.info(`用户 ${req.user.id} (${userRole}) 访问权限验证通过`);
      next();
    } catch (error) {
      logger.error('角色权限中间件错误:', error);
      return res.status(500).json({
        success: false,
        message: '权限验证失败',
        error: 'INTERNAL_ERROR'
      });
    }
  };
};

/**
 * 部门管理员权限中间件
 * 验证用户是否为部门管理员或更高级别
 */
const deptAdminMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
        error: 'UNAUTHORIZED'
      });
    }

    const userRole = req.user.role;
    const allowedRoles = ['gi', 'sys_admin', 'verifier'];
    
    if (!allowedRoles.includes(userRole)) {
      logger.warn(`用户 ${req.user.id} 尝试访问部门管理员接口，当前角色: ${userRole}`);
      
      return res.status(403).json({
        success: false,
        message: '需要部门管理员权限',
        error: 'FORBIDDEN',
        requiredRoles: allowedRoles,
        currentRole: userRole
      });
    }

    next();
  } catch (error) {
    logger.error('部门管理员权限中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '权限验证失败',
      error: 'INTERNAL_ERROR'
    });
  }
};

/**
 * 系统管理员权限中间件
 * 验证用户是否为系统管理员
 */
const sysAdminMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
        error: 'UNAUTHORIZED'
      });
    }

    const userRole = req.user.role;
    
    if (userRole !== 'sys_admin') {
      logger.warn(`用户 ${req.user.id} 尝试访问系统管理员接口，当前角色: ${userRole}`);
      
      return res.status(403).json({
        success: false,
        message: '需要系统管理员权限',
        error: 'FORBIDDEN',
        requiredRole: 'sys_admin',
        currentRole: userRole
      });
    }

    next();
  } catch (error) {
    logger.error('系统管理员权限中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '权限验证失败',
      error: 'INTERNAL_ERROR'
    });
  }
};


/**
 * 检查用户是否为同部门成员
 */
const sameDepartmentMiddleware = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未授权访问',
        error: 'UNAUTHORIZED'
      });
    }

    const currentUserDept = req.user.department;
    const targetUserId = req.params.userId;
    
    // 如果是系统管理员，跳过部门检查
    if (req.user.role === 'sys_admin') {
      return next();
    }

    // 如果操作的是自己，允许
    if (targetUserId === req.user.id) {
      return next();
    }

    // 需要检查目标用户是否在同一部门
    // 这里需要在具体的控制器中实现部门检查逻辑
    req.requireDepartmentCheck = true;
    next();
  } catch (error) {
    logger.error('同部门权限中间件错误:', error);
    return res.status(500).json({
      success: false,
      message: '权限验证失败',
      error: 'INTERNAL_ERROR'
    });
  }
};

module.exports = {
  roleMiddleware,
  deptAdminMiddleware,
  sysAdminMiddleware,
  sameDepartmentMiddleware
};
