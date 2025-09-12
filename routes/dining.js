const express = require('express');
const router = express.Router();
const diningController = require('../controllers/diningController');
const { validate, schemas } = require('../utils/validation');
const { authenticateToken, requireDeptAdmin } = require('../middleware/auth');

/**
 * 日常报餐路由
 */

// 获取菜单信息
router.get('/menu',
  authenticateToken,
  validate(schemas.dining.getMenu, 'query'),
  diningController.getMenu
);

// 获取部门成员
router.get('/dept-members',
  authenticateToken,
  diningController.getDeptMembers
);

// 提交部门报餐
router.post('/dept-order',
  authenticateToken,
  validate(schemas.dining.submitDeptOrder),
  diningController.submitDeptOrder
);

// 获取报餐记录
router.get('/records',
  authenticateToken,
  validate(schemas.dining.getDiningRecords, 'query'),
  diningController.getDiningRecords
);

// 获取报餐记录详情
router.get('/records/:recordId/detail',
  authenticateToken,
  diningController.getRecordDetail
);

// 获取个人报餐状态
router.get('/personal-status',
  authenticateToken,
  diningController.getPersonalDiningStatus
);

// 取消报餐订单
router.put('/orders/:orderId/cancel',
  authenticateToken,
  diningController.cancelDiningOrder
);

// ==================== 管理员功能 ====================

// 获取报餐统计（管理员功能）
router.get('/stats',
  authenticateToken,
  requireDeptAdmin,
  diningController.getTodayDiningStats
);

// 确认报餐订单（管理员功能）
router.put('/orders/:orderId/confirm',
  authenticateToken,
  requireDeptAdmin,
  diningController.confirmDiningOrder
);

// 批量确认报餐订单（管理员功能）
router.put('/orders/batch/confirm',
  authenticateToken,
  requireDeptAdmin,
  (req, res, next) => {
    // 验证请求体
    const { error } = require('joi').object({
      orderIds: require('joi').array().items(require('joi').string()).min(1).required()
    }).validate(req.body);
    
    if (error) {
      return require('../utils/response').validationError(res, '参数验证失败', error.details);
    }
    
    next();
  },
  diningController.batchConfirmDiningOrders
);

module.exports = router;
