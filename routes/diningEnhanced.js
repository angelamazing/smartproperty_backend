const express = require('express');
const router = express.Router();
const diningControllerEnhanced = require('../controllers/diningControllerEnhanced');
const { authenticateToken } = require('../middleware/auth');
const { deptAdminAuth } = require('../middleware/adminAuth');
const { validateRequest } = require('../middleware/validation');
const { schemas } = require('../utils/validation');

/**
 * 增强版报餐路由
 * 支持部门级别的权限控制和报餐管理
 */

// 所有路由都需要身份验证
router.use(authenticateToken);

// ================================
// 公开接口（所有已登录用户）
// ================================

/**
 * @route GET /api/dining/enhanced/menu
 * @desc 获取菜单信息
 * @access 所有已登录用户
 */
router.get('/menu', diningControllerEnhanced.getMenu);

/**
 * @route GET /api/dining/enhanced/dept-members
 * @desc 获取部门成员列表
 * @access 所有已登录用户（只能查看自己部门的成员）
 */
router.get('/dept-members', diningControllerEnhanced.getDeptMembers);

// ================================
// 部门管理员专用接口
// ================================

/**
 * @route POST /api/dining/enhanced/department-order
 * @desc 部门报餐（部门管理员为部门成员报餐）
 * @access 部门管理员
 */
router.post('/department-order',
  deptAdminAuth,
  validateRequest(schemas.diningEnhanced.createDepartmentOrder),
  diningControllerEnhanced.createDepartmentOrder
);

/**
 * @route GET /api/dining/enhanced/department-orders
 * @desc 获取部门报餐记录
 * @access 部门管理员
 */
router.get('/department-orders', 
  deptAdminAuth,
  validateRequest(schemas.diningEnhanced.getDepartmentOrders),
  diningControllerEnhanced.getDepartmentOrders
);

/**
 * @route GET /api/dining/enhanced/department-stats
 * @desc 获取部门报餐统计
 * @access 部门管理员
 */
router.get('/department-stats',
  deptAdminAuth,
  validateRequest(schemas.diningEnhanced.getDepartmentStats),
  diningControllerEnhanced.getDepartmentOrderStats
);

/**
 * @route GET /api/dining/enhanced/department-overview
 * @desc 获取部门报餐概览（今日报餐情况）
 * @access 部门管理员
 */
router.get('/department-overview',
  deptAdminAuth,
  diningControllerEnhanced.getDepartmentOrderOverview
);

/**
 * @route POST /api/dining/enhanced/batch-orders
 * @desc 批量创建部门报餐订单（支持跨天、跨餐次）
 * @access 部门管理员
 */
router.post('/batch-orders',
  deptAdminAuth,
  validateRequest(schemas.batchDining.createBatchOrders),
  diningControllerEnhanced.createBatchDepartmentOrders
);

/**
 * @route POST /api/dining/enhanced/quick-batch-orders
 * @desc 快速批量报餐（为固定成员报多个餐次）
 * @access 部门管理员
 */
router.post('/quick-batch-orders',
  deptAdminAuth,
  validateRequest(schemas.batchDining.createQuickBatchOrders),
  diningControllerEnhanced.createQuickBatchOrders
);

module.exports = router;
