const express = require('express');
const router = express.Router();
const { authenticateToken, requireDeptAdmin } = require('../middleware/auth');
const response = require('../utils/response');
const systemService = require('../services/systemService');
const logger = require('../utils/logger');

/**
 * 系统管理路由
 */

// 获取今日统计
router.get('/today-stats',
  authenticateToken,
  async (req, res) => {
    try {
      const stats = await systemService.getTodayStats(req.db);
      return response.success(res, stats, '获取今日统计成功');
    } catch (error) {
      logger.error('获取今日统计失败:', error);
      return response.serverError(res, '获取今日统计失败', error.message);
    }
  }
);

// 获取今日菜单
router.get('/today-menu',
  authenticateToken,
  async (req, res) => {
    try {
      const menu = await systemService.getTodayMenu(req.db);
      return response.success(res, menu, '获取今日菜单成功');
    } catch (error) {
      logger.error('获取今日菜单失败:', error);
      return response.serverError(res, '获取今日菜单失败', error.message);
    }
  }
);

// 获取最近活动
router.get('/recent-activities',
  authenticateToken,
  requireDeptAdmin,
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;
      const activities = await systemService.getRecentActivities(req.db, parseInt(limit));
      return response.success(res, activities, '获取最近活动成功');
    } catch (error) {
      logger.error('获取最近活动失败:', error);
      return response.serverError(res, '获取最近活动失败', error.message);
    }
  }
);

// 获取系统公告
router.get('/notice',
  authenticateToken,
  async (req, res) => {
    try {
      const notice = await systemService.getSystemNotice(req.db);
      return response.success(res, notice, '获取系统公告成功');
    } catch (error) {
      logger.error('获取系统公告失败:', error);
      return response.serverError(res, '获取系统公告失败', error.message);
    }
  }
);

module.exports = router;
