const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticateToken } = require('../middleware/auth');
const { adminAuth, sysAdminAuth } = require('../middleware/adminAuth');
const { validateRequest } = require('../middleware/validation');
const { schemas } = require('../utils/validation');

/**
 * 部门管理路由
 * 提供部门管理相关的API接口
 */

// 所有路由都需要身份验证
router.use(authenticateToken);

// ================================
// 公开接口（所有已登录用户）
// ================================

/**
 * @route GET /api/department/list
 * @desc 获取部门列表
 * @access 所有已登录用户
 */
router.get('/list', departmentController.getDepartments);

/**
 * @route GET /api/department/my
 * @desc 获取当前用户的部门信息
 * @access 所有已登录用户
 */
router.get('/my', departmentController.getMyDepartment);

/**
 * @route GET /api/department/:departmentId
 * @desc 获取部门详情
 * @access 所有已登录用户
 */
router.get('/:departmentId', departmentController.getDepartmentById);

/**
 * @route GET /api/department/:departmentId/members
 * @desc 获取部门成员列表
 * @access 部门管理员（只能查看本部门）或系统管理员
 */
router.get('/:departmentId/members', departmentController.getDepartmentMembers);

/**
 * @route GET /api/department/:departmentId/check-admin
 * @desc 验证当前用户是否为指定部门的管理员
 * @access 所有已登录用户
 */
router.get('/:departmentId/check-admin', departmentController.checkDepartmentAdmin);

// ================================
// 部门管理员专用接口
// ================================

/**
 * @route GET /api/department/admin/my-info
 * @desc 获取部门管理员的部门详细信息
 * @access 部门管理员
 */
router.get('/admin/my-info', departmentController.getMyDepartmentInfo);

// ================================
// 系统管理员专用接口
// ================================

/**
 * @route POST /api/department
 * @desc 创建部门
 * @access 系统管理员
 */
router.post('/', 
  sysAdminAuth,
  validateRequest(schemas.department.createDepartment),
  departmentController.createDepartment
);

/**
 * @route PUT /api/department/:departmentId
 * @desc 更新部门信息
 * @access 系统管理员
 */
router.put('/:departmentId',
  sysAdminAuth,
  validateRequest(schemas.department.updateDepartment),
  departmentController.updateDepartment
);

/**
 * @route GET /api/department/admin/stats
 * @desc 获取部门统计数据
 * @access 系统管理员
 */
router.get('/admin/stats', sysAdminAuth, departmentController.getDepartmentStats);

module.exports = router;
