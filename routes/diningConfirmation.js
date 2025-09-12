const express = require('express');
const router = express.Router();
const diningConfirmationController = require('../controllers/diningConfirmationController');
const { authenticateToken } = require('../middleware/auth');
const { roleMiddleware } = require('../middleware/role');

/**
 * 就餐确认相关路由
 * 处理报餐后的确认就餐功能
 */

// ==================== 用户功能 ====================

/**
 * 用户手动确认就餐
 * POST /api/dining-confirmation/manual/:orderId
 * 用户自己确认已就餐
 */
router.post('/manual/:orderId', 
  authenticateToken, 
  diningConfirmationController.confirmDiningManually.bind(diningConfirmationController)
);

/**
 * 获取用户就餐确认状态
 * GET /api/dining-confirmation/status
 * 获取用户指定日期的就餐确认状态
 */
router.get('/status', 
  authenticateToken, 
  diningConfirmationController.getUserDiningConfirmationStatus.bind(diningConfirmationController)
);

/**
 * 获取就餐确认历史记录
 * GET /api/dining-confirmation/history
 * 获取用户的就餐确认历史记录
 */
router.get('/history', 
  authenticateToken, 
  diningConfirmationController.getDiningConfirmationHistory.bind(diningConfirmationController)
);

// ==================== 管理员功能 ====================

/**
 * 管理员代确认就餐
 * POST /api/dining-confirmation/admin/:orderId
 * 管理员代为确认用户已就餐
 */
router.post('/admin/:orderId', 
  authenticateToken, 
  roleMiddleware(['dept_admin', 'sys_admin']),
  diningConfirmationController.confirmDiningByAdmin.bind(diningConfirmationController)
);

/**
 * 批量确认就餐
 * POST /api/dining-confirmation/batch
 * 管理员批量确认多个订单的就餐状态
 */
router.post('/batch', 
  authenticateToken, 
  roleMiddleware(['dept_admin', 'sys_admin']),
  diningConfirmationController.batchConfirmDining.bind(diningConfirmationController)
);

/**
 * 获取待确认就餐列表
 * GET /api/dining-confirmation/pending
 * 获取待确认就餐的订单列表（管理员功能）
 */
router.get('/pending', 
  authenticateToken, 
  roleMiddleware(['dept_admin', 'sys_admin']),
  diningConfirmationController.getPendingDiningConfirmations.bind(diningConfirmationController)
);

/**
 * 获取部门就餐确认统计
 * GET /api/dining-confirmation/stats
 * 获取部门就餐确认统计数据（管理员功能）
 */
router.get('/stats', 
  authenticateToken, 
  roleMiddleware(['dept_admin', 'sys_admin']),
  diningConfirmationController.getDepartmentDiningConfirmationStats.bind(diningConfirmationController)
);

module.exports = router;
