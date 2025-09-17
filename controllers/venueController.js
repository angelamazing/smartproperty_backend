const venueService = require('../services/venueService');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 球馆预约控制器
 * 处理用户端的场地预约相关请求
 */
class VenueController {
  /**
   * 获取可用场地列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getAvailableVenues(req, res) {
    try {
      const { date, type, page = 1, pageSize = 20 } = req.query;
      
      const result = await venueService.getAvailableVenues(req.db, {
        date,
        type,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      });
      
      return response.success(res, result, '获取场地列表成功');
    } catch (error) {
      logger.error('获取场地列表失败:', error);
      return response.serverError(res, '获取场地列表失败', error.message);
    }
  }

  /**
   * 获取场地详细信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getVenueDetail(req, res) {
    try {
      const { venueId } = req.params;
      
      if (!venueId) {
        return response.badRequest(res, '场地ID不能为空');
      }
      
      const venue = await venueService.getVenueDetail(req.db, venueId);
      
      return response.success(res, venue, '获取场地详情成功');
    } catch (error) {
      logger.error('获取场地详情失败:', error);
      return response.serverError(res, '获取场地详情失败', error.message);
    }
  }

  /**
   * 获取场地时间安排
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getVenueSchedule(req, res) {
    try {
      const { venueId } = req.params;
      const { date } = req.query;
      
      if (!venueId) {
        return response.badRequest(res, '场地ID不能为空');
      }
      
      if (!date) {
        return response.badRequest(res, '日期不能为空');
      }
      
      const schedule = await venueService.getVenueSchedule(req.db, venueId, date);
      
      return response.success(res, schedule, '获取场地时间安排成功');
    } catch (error) {
      logger.error('获取场地时间安排失败:', error);
      return response.serverError(res, '获取场地时间安排失败', error.message);
    }
  }

  /**
   * 提交场地预约
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async submitReservation(req, res) {
    try {
      const {
        venueId,
        date,
        startTime,
        endTime,
        purpose,
        remark = '',
        participants = []
      } = req.body;
      
      // 验证必填字段
      if (!venueId || !date || !startTime || !endTime || !purpose) {
        return response.badRequest(res, '必填字段不能为空');
      }
      
      const result = await venueService.submitReservation(req.db, {
        venueId,
        date,
        startTime,
        endTime,
        purpose,
        remark,
        participants
      }, req.user);
      
      return response.success(res, result, result.message);
    } catch (error) {
      logger.error('提交预约失败:', error);
      return response.serverError(res, '提交预约失败', error.message);
    }
  }

  /**
   * 获取用户预约记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserReservations(req, res) {
    try {
      const { page = 1, pageSize = 20, status, date } = req.query;
      
      const result = await venueService.getUserReservations(req.db, req.user.id, {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        status,
        date
      });
      
      return response.success(res, result, '获取预约记录成功');
    } catch (error) {
      logger.error('获取预约记录失败:', error);
      return response.serverError(res, '获取预约记录失败', error.message);
    }
  }

  /**
   * 取消预约
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async cancelReservation(req, res) {
    try {
      const { reservationId } = req.params;
      
      if (!reservationId) {
        return response.badRequest(res, '预约ID不能为空');
      }
      
      const result = await venueService.cancelReservation(req.db, reservationId, req.user.id);
      
      return response.success(res, result, result.message);
    } catch (error) {
      logger.error('取消预约失败:', error);
      return response.serverError(res, '取消预约失败', error.message);
    }
  }

  /**
   * 获取预约详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getReservationDetail(req, res) {
    try {
      const { reservationId } = req.params;
      
      if (!reservationId) {
        return response.badRequest(res, '预约ID不能为空');
      }
      
      // 查询预约详情
      const [reservations] = await req.db.execute(
        `SELECT r.*, v.name as venueName, v.type as venueType, v.location, v.pricePerHour
         FROM reservations r
         LEFT JOIN venues v ON r.venueId = v._id
         WHERE r._id = ? AND r.userId = ?`,
        [reservationId, req.user.id]
      );
      
      if (reservations.length === 0) {
        return response.notFound(res, '预约不存在或无权限查看');
      }
      
      const reservation = reservations[0];
      
      // 解析参与人员信息
      if (reservation.participants) {
        try {
          reservation.participants = JSON.parse(reservation.participants);
        } catch (e) {
          reservation.participants = [];
        }
      }
      
      return response.success(res, reservation, '获取预约详情成功');
    } catch (error) {
      logger.error('获取预约详情失败:', error);
      return response.serverError(res, '获取预约详情失败', error.message);
    }
  }

  /**
   * 检查时间段可用性
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async checkTimeAvailability(req, res) {
    try {
      const { venueId, date, startTime, endTime } = req.query;
      
      if (!venueId || !date || !startTime || !endTime) {
        return response.badRequest(res, '必填参数不能为空');
      }
      
      try {
        await venueService.checkTimeConflict(req.db, venueId, date, startTime, endTime);
        
        return response.success(res, { available: true }, '时间段可用');
      } catch (error) {
        if (error.message.includes('已被预约')) {
          return response.success(res, { available: false, reason: error.message }, '时间段不可用');
        }
        throw error;
      }
    } catch (error) {
      logger.error('检查时间段可用性失败:', error);
      return response.serverError(res, '检查时间段可用性失败', error.message);
    }
  }

  /**
   * 获取场地类型列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getVenueTypes(req, res) {
    try {
      const [types] = await req.db.execute(
        'SELECT DISTINCT type, COUNT(*) as count FROM venues WHERE status = "active" GROUP BY type ORDER BY type'
      );
      
      const typeList = types.map(type => ({
        value: type.type,
        label: this.getVenueTypeLabel(type.type),
        count: type.count
      }));
      
      return response.success(res, typeList, '获取场地类型成功');
    } catch (error) {
      logger.error('获取场地类型失败:', error);
      return response.serverError(res, '获取场地类型失败', error.message);
    }
  }

  /**
   * 获取场地类型标签
   * @param {string} type - 场地类型
   * @returns {string} 类型标签
   */
  getVenueTypeLabel(type) {
    const typeLabels = {
      'badminton': '羽毛球',
      'pingpong': '乒乓球',
      'basketball': '篮球',
      'meeting': '会议室',
      'other': '其他'
    };
    
    return typeLabels[type] || type;
  }
}

module.exports = new VenueController();
