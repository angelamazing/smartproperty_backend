const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { validate, schemas } = require('../utils/validation');
const { authenticateToken, requireDeptAdmin, requireSysAdmin } = require('../middleware/auth');

/**
 * 用户路由
 * 所有路由都需要用户登录
 */

// 获取当前用户统计数据
router.get('/stats',
  authenticateToken,
  userController.getUserStats
);

// 获取当前用户信息
router.get('/info',
  authenticateToken,
  userController.getCurrentUserInfo
);

// 更新用户头像
router.put('/avatar',
  authenticateToken,
  validate(schemas.user.updateUserAvatar),
  userController.updateUserAvatar
);

// 更新用户资料
router.put('/profile',
  authenticateToken,
  validate(schemas.user.updateUserProfile),
  userController.updateUserProfile
);

// 修改用户密码
router.put('/change-password',
  authenticateToken,
  (req, res, next) => {
    // 验证请求体
    const { error } = require('joi').object({
      oldPassword: require('joi').string().min(6).required().messages({
        'string.min': '旧密码长度至少6位',
        'any.required': '旧密码不能为空'
      }),
      newPassword: require('joi').string().min(6).max(20).required().messages({
        'string.min': '新密码长度至少6位',
        'string.max': '新密码长度不能超过20位',
        'any.required': '新密码不能为空'
      })
    }).validate(req.body);
    
    if (error) {
      return require('../utils/response').validationError(res, '参数验证失败', error.details);
    }
    
    next();
  },
  userController.changePassword
);

// ==================== 管理员功能 ====================

// 获取用户列表（部门管理员及以上权限）
router.get('/list',
  authenticateToken,
  requireDeptAdmin,
  userController.getUserList
);

// 获取指定用户信息（部门管理员及以上权限）
router.get('/:userId',
  authenticateToken,
  requireDeptAdmin,
  userController.getUserInfo
);

// 更新用户状态（部门管理员及以上权限）
router.put('/:userId/status',
  authenticateToken,
  requireDeptAdmin,
  (req, res, next) => {
    // 验证请求体
    const { error } = require('joi').object({
      status: require('joi').string().valid('active', 'inactive').required()
    }).validate(req.body);
    
    if (error) {
      return require('../utils/response').validationError(res, '参数验证失败', error.details);
    }
    
    next();
  },
  userController.updateUserStatus
);

// 批量更新用户状态（部门管理员及以上权限）
router.put('/batch/status',
  authenticateToken,
  requireDeptAdmin,
  (req, res, next) => {
    // 验证请求体
    const { error } = require('joi').object({
      userIds: require('joi').array().items(require('joi').string()).min(1).required(),
      status: require('joi').string().valid('active', 'inactive').required()
    }).validate(req.body);
    
    if (error) {
      return require('../utils/response').validationError(res, '参数验证失败', error.details);
    }
    
    next();
  },
  userController.batchUpdateUserStatus
);

// ==================== 系统管理员功能 ====================

// 更新用户角色（系统管理员权限）
router.put('/:userId/role',
  authenticateToken,
  requireSysAdmin,
  (req, res, next) => {
    // 验证请求体
    const { error } = require('joi').object({
      role: require('joi').string().valid('user', 'admin', 'dept_admin', 'sys_admin').required()
    }).validate(req.body);
    
    if (error) {
      return require('../utils/response').validationError(res, '参数验证失败', error.details);
    }
    
    next();
  },
  userController.updateUserRole
);

// 重置用户密码（系统管理员权限）
router.put('/:userId/reset-password',
  authenticateToken,
  requireSysAdmin,
  (req, res, next) => {
    // 验证请求体
    const { error } = require('joi').object({
      newPassword: require('joi').string().min(6).max(20).required().messages({
        'string.min': '新密码长度至少6位',
        'string.max': '新密码长度不能超过20位',
        'any.required': '新密码不能为空'
      })
    }).validate(req.body);
    
    if (error) {
      return require('../utils/response').validationError(res, '参数验证失败', error.details);
    }
    
    next();
  },
  userController.resetPassword
);

// 删除用户（系统管理员权限）
router.delete('/:userId',
  authenticateToken,
  requireSysAdmin,
  userController.deleteUser
);

module.exports = router;
