const { ResponseHelper } = require('../utils/response');

/**
 * 管理员权限验证中间件
 * 检查用户是否具有管理员权限
 */
const adminAuth = (req, res, next) => {
  try {
    // 检查用户是否已通过基本身份验证
    if (!req.user) {
      return ResponseHelper.error(res, '请先登录', 401);
    }

    // 检查用户状态
    if (req.user.status !== 'active') {
      return ResponseHelper.error(res, '用户状态异常，无法访问管理功能', 403);
    }

    // 检查用户角色权限
    const { role } = req.user;
    
    // 允许的管理员角色
    const adminRoles = ['sys_admin', 'admin', 'dept_admin'];
    
    if (!adminRoles.includes(role)) {
      return ResponseHelper.error(res, '权限不足，需要管理员权限', 403);
    }

    // 将管理员级别添加到请求对象中，供后续使用
    req.adminLevel = getAdminLevel(role);
    
    next();
  } catch (error) {
    console.error('管理员权限验证失败:', error);
    return ResponseHelper.error(res, '权限验证失败', 500);
  }
};

/**
 * 系统管理员权限验证中间件
 * 只允许系统管理员访问
 */
const sysAdminAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return ResponseHelper.error(res, '请先登录', 401);
    }

    if (req.user.status !== 'active') {
      return ResponseHelper.error(res, '用户状态异常，无法访问系统管理功能', 403);
    }

    if (req.user.role !== 'sys_admin') {
      return ResponseHelper.error(res, '权限不足，需要系统管理员权限', 403);
    }

    next();
  } catch (error) {
    console.error('系统管理员权限验证失败:', error);
    return ResponseHelper.error(res, '权限验证失败', 500);
  }
};

/**
 * 部门管理员权限验证中间件
 * 允许部门管理员和以上级别访问
 */
const deptAdminAuth = (req, res, next) => {
  try {
    if (!req.user) {
      return ResponseHelper.error(res, '请先登录', 401);
    }

    if (req.user.status !== 'active') {
      return ResponseHelper.error(res, '用户状态异常，无法访问部门管理功能', 403);
    }

    const allowedRoles = ['sys_admin', 'admin', 'dept_admin'];
    if (!allowedRoles.includes(req.user.role)) {
      return ResponseHelper.error(res, '权限不足，需要部门管理员及以上权限', 403);
    }

    next();
  } catch (error) {
    console.error('部门管理员权限验证失败:', error);
    return ResponseHelper.error(res, '权限验证失败', 500);
  }
};

/**
 * 特定权限验证中间件生成器
 * @param {string|Array} requiredPermissions - 需要的权限
 */
const requirePermission = (requiredPermissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return ResponseHelper.error(res, '请先登录', 401);
      }

      if (req.user.status !== 'active') {
        return ResponseHelper.error(res, '用户状态异常，无法执行此操作', 403);
      }

      // 系统管理员拥有所有权限
      if (req.user.role === 'sys_admin') {
        return next();
      }

      // 检查用户权限
      const userPermissions = req.user.permissions || [];
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      
      const hasPermission = permissions.some(permission => 
        userPermissions.includes(permission)
      );

      if (!hasPermission) {
        return ResponseHelper.error(res, '权限不足，无法执行此操作', 403);
      }

      next();
    } catch (error) {
      console.error('权限验证失败:', error);
      return ResponseHelper.error(res, '权限验证失败', 500);
    }
  };
};

/**
 * 资源所有权验证中间件生成器
 * @param {string} resourceField - 资源标识字段名
 * @param {string} ownerField - 所有者字段名
 */
const requireOwnership = (resourceField = 'id', ownerField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return ResponseHelper.error(res, '请先登录', 401);
      }

      // 系统管理员和普通管理员可以访问所有资源
      if (['sys_admin', 'admin'].includes(req.user.role)) {
        return next();
      }

      // 部门管理员只能访问本部门的资源
      if (req.user.role === 'dept_admin') {
        // 这里可以根据实际业务逻辑添加部门权限检查
        return next();
      }

      // 普通用户只能访问自己的资源
      const resourceId = req.params[resourceField] || req.body[resourceField];
      const resourceOwnerId = req.body[ownerField] || req.user.id;

      if (req.user.id !== resourceOwnerId) {
        return ResponseHelper.error(res, '权限不足，只能访问自己的资源', 403);
      }

      next();
    } catch (error) {
      console.error('资源所有权验证失败:', error);
      return ResponseHelper.error(res, '权限验证失败', 500);
    }
  };
};

/**
 * 获取管理员级别
 * @param {string} role - 用户角色
 * @returns {number} 管理员级别 (数字越大权限越高)
 */
function getAdminLevel(role) {
  const levels = {
    'user': 0,
    'dept_admin': 1,
    'admin': 2,
    'sys_admin': 3
  };
  return levels[role] || 0;
}

/**
 * 检查是否可以管理目标用户
 * @param {Object} currentUser - 当前用户
 * @param {Object} targetUser - 目标用户
 * @returns {boolean} 是否可以管理
 */
function canManageUser(currentUser, targetUser) {
  const currentLevel = getAdminLevel(currentUser.role);
  const targetLevel = getAdminLevel(targetUser.role);
  
  // 只能管理级别低于自己的用户
  return currentLevel > targetLevel;
}

/**
 * 用户管理权限验证中间件
 * 确保只能管理级别低于自己的用户
 */
const userManagementAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return ResponseHelper.error(res, '请先登录', 401);
    }

    // 系统管理员拥有所有权限
    if (req.user.role === 'sys_admin') {
      return next();
    }

    // 对于创建用户，检查要创建的用户角色
    if (req.method === 'POST' && req.body.role) {
      const currentLevel = getAdminLevel(req.user.role);
      const targetLevel = getAdminLevel(req.body.role);
      
      if (currentLevel <= targetLevel) {
        return ResponseHelper.error(res, '权限不足，无法创建该级别的用户', 403);
      }
    }

    // 对于更新和删除用户，需要在控制器中进一步验证目标用户信息
    next();
  } catch (error) {
    console.error('用户管理权限验证失败:', error);
    return ResponseHelper.error(res, '权限验证失败', 500);
  }
};

module.exports = {
  adminAuth,
  sysAdminAuth,
  deptAdminAuth,
  requirePermission,
  requireOwnership,
  userManagementAuth,
  getAdminLevel,
  canManageUser
};
