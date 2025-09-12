const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const authMiddleware = require('../middlewares/auth');

/**
 * 部门管理相关路由
 */

// 获取部门列表
router.get('/departments', authMiddleware, departmentController.getDepartments);

// 获取部门详情
router.get('/departments/:deptId', authMiddleware, departmentController.getDepartmentDetail);

// 创建部门（仅系统管理员可访问）
router.post('/departments', authMiddleware.checkAdmin, departmentController.createDepartment);

// 更新部门（仅系统管理员可访问）
router.put('/departments/:deptId', authMiddleware.checkAdmin, departmentController.updateDepartment);

// 设置部门管理员（仅系统管理员可访问）
router.put('/departments/:deptId/managers/:userId', authMiddleware.checkAdmin, departmentController.setDepartmentManager);

// 获取用户管理的部门
router.get('/user/managed-department', authMiddleware, departmentController.getUserManagedDepartment);

// 验证用户是否为部门管理员
router.get('/user/is-manager', authMiddleware, departmentController.isDepartmentManager);

// 获取部门成员列表
router.get('/departments/:deptId/members', authMiddleware, departmentController.getDepartmentMembers);

module.exports = router;