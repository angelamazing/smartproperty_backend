const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validate, schemas } = require('../utils/validation');
const venueController = require('../controllers/venueController');

/**
 * 球馆预约路由
 * 提供用户端的场地预约相关功能
 */

// ================================
// 场地管理相关接口
// ================================

/**
 * @route GET /api/venue/list
 * @desc 获取可用场地列表
 * @access Private
 */
router.get('/list',
  authenticateToken,
  validate(schemas.venue.getVenues, 'query'),
  venueController.getAvailableVenues
);

/**
 * @route GET /api/venue/types
 * @desc 获取场地类型列表
 * @access Private
 */
router.get('/types',
  authenticateToken,
  venueController.getVenueTypes
);

/**
 * @route GET /api/venue/:venueId
 * @desc 获取场地详细信息
 * @access Private
 */
router.get('/:venueId',
  authenticateToken,
  venueController.getVenueDetail
);

/**
 * @route GET /api/venue/:venueId/schedule
 * @desc 获取场地时间安排
 * @access Private
 */
router.get('/:venueId/schedule',
  authenticateToken,
  validate(schemas.venue.getVenueSchedule, 'query'),
  venueController.getVenueSchedule
);

// ================================
// 预约管理相关接口
// ================================

/**
 * @route POST /api/venue/reservation
 * @desc 提交场地预约
 * @access Private
 */
router.post('/reservation',
  authenticateToken,
  validate(schemas.venue.submitReservation),
  venueController.submitReservation
);

/**
 * @route GET /api/venue/reservations
 * @desc 获取用户预约记录
 * @access Private
 */
router.get('/reservations',
  authenticateToken,
  validate(schemas.venue.getUserReservations, 'query'),
  venueController.getUserReservations
);

/**
 * @route GET /api/venue/reservation/:reservationId
 * @desc 获取预约详情
 * @access Private
 */
router.get('/reservation/:reservationId',
  authenticateToken,
  venueController.getReservationDetail
);

/**
 * @route DELETE /api/venue/reservation/:reservationId
 * @desc 取消预约
 * @access Private
 */
router.delete('/reservation/:reservationId',
  authenticateToken,
  venueController.cancelReservation
);

// ================================
// 工具接口
// ================================

/**
 * @route GET /api/venue/check-availability
 * @desc 检查时间段可用性
 * @access Private
 */
router.get('/check-availability',
  authenticateToken,
  validate(schemas.venue.checkTimeAvailability, 'query'),
  venueController.checkTimeAvailability
);

module.exports = router;
