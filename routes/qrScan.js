/**
 * 扫码就餐登记路由
 * 提供扫码登记、历史查询、统计等功能
 */

const express = require('express');
const router = express.Router();
const qrScanController = require('../controllers/qrScanController');
const { authenticateToken, requireDeptAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../utils/validation');

/**
 * 用户扫码功能
 */

// 处理扫码就餐登记
router.post('/scan',
  authenticateToken,
  validate(schemas.qrScan.processScan),
  qrScanController.processQRScan
);

// 处理扫码就餐登记（GET请求，用于直接扫码跳转）
router.get('/scan',
  authenticateToken,
  qrScanController.processQRScanGet
);

// 处理扫码就餐登记（无需认证，基于二维码安全验证）
router.get('/scan-secure/:secureToken',
  qrScanController.processQRScanSecure
);

// 获取用户就餐登记历史
router.get('/history',
  authenticateToken,
  validate(schemas.qrScan.getHistory, 'query'),
  qrScanController.getUserRegistrationHistory
);

// 获取今日就餐概览
router.get('/today-overview',
  authenticateToken,
  qrScanController.getTodayOverview
);

/**
 * 管理员功能
 */

// 获取就餐统计信息
router.get('/statistics',
  authenticateToken,
  requireDeptAdmin,
  validate(schemas.qrScan.getStatistics, 'query'),
  qrScanController.getDiningStatistics
);

// 创建新的二维码
router.post('/qr-codes',
  authenticateToken,
  requireDeptAdmin,
  validate(schemas.qrScan.createQRCode),
  qrScanController.createQRCode
);

// 获取二维码列表
router.get('/qr-codes',
  authenticateToken,
  requireDeptAdmin,
  validate(schemas.qrScan.getQRCodes, 'query'),
  qrScanController.getQRCodes
);

// 获取二维码详情
router.get('/qr-codes/:qrId',
  authenticateToken,
  requireDeptAdmin,
  qrScanController.getQRCodeDetail
);

// 更新二维码状态
router.put('/qr-codes/:qrId/status',
  authenticateToken,
  requireDeptAdmin,
  validate(schemas.qrScan.updateQRCodeStatus),
  qrScanController.updateQRCodeStatus
);

// 生成二维码图片
router.get('/qr-codes/:qrCode/image',
  authenticateToken,
  qrScanController.generateQRCodeImage
);

// 生成包含接口URL的二维码图片
router.get('/qr-codes/:qrCode/image-with-url',
  authenticateToken,
  qrScanController.generateQRCodeWithURL
);

// 生成安全二维码图片
router.get('/qr-codes/:qrCode/image-secure',
  authenticateToken,
  qrScanController.generateSecureQRCode
);

// 生成微信小程序码
router.get('/qr-codes/:qrCode/image-wechat',
  authenticateToken,
  qrScanController.generateWechatMiniProgramCode
);

// 处理微信小程序扫码确认就餐
router.post('/wechat-scan',
  authenticateToken,
  validate(schemas.qrScan.processScan),
  qrScanController.processWechatQRScan
);

module.exports = router;
