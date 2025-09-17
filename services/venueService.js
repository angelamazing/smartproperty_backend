const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const TimeUtils = require('../utils/timeUtils');

/**
 * 球馆预约服务层
 * 处理用户端的场地预约相关业务逻辑
 */
class VenueService {
  constructor() {
    this.timeUtils = TimeUtils;
  }

  /**
   * 获取可用场地列表
   * @param {Object} db - 数据库连接
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Object>} 场地列表
   */
  async getAvailableVenues(db, filters = {}) {
    try {
      const { date, type, page = 1, pageSize = 20 } = filters;
      
      // 构建查询条件
      let whereClause = 'WHERE v.status = "active"';
      const params = [];
      
      if (date) {
        whereClause += ' AND v.openTime <= ? AND v.closeTime >= ?';
        params.push(date, date);
      }
      
      if (type) {
        whereClause += ' AND v.type = ?';
        params.push(type);
      }
      
      // 获取总数
      const [countResult] = await db.execute(
        `SELECT COUNT(*) as total FROM venues v ${whereClause}`,
        params
      );
      const total = countResult[0].total;
      
      // 获取分页数据
      const offset = (page - 1) * pageSize;
      const [venues] = await db.execute(
        `SELECT v.*, 
          (SELECT COUNT(*) FROM reservations r 
           WHERE r.venueId = v._id 
           AND r.reservationDate = ? 
           AND r.status IN ('confirmed', 'pending')) as today_reservations
         FROM venues v 
         ${whereClause} 
         ORDER BY v.sort ASC, v.createTime DESC 
         LIMIT ? OFFSET ?`,
        [...params, date || this.timeUtils.getBeijingTime().format('YYYY-MM-DD'), pageSize, offset]
      );
      
      return {
        list: venues,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      };
    } catch (error) {
      throw new Error(`获取场地列表失败: ${error.message}`);
    }
  }

  /**
   * 获取场地详细信息
   * @param {Object} db - 数据库连接
   * @param {string} venueId - 场地ID
   * @returns {Promise<Object>} 场地详情
   */
  async getVenueDetail(db, venueId) {
    try {
      const [venues] = await db.execute(
        'SELECT * FROM venues WHERE _id = ? AND status = "active"',
        [venueId]
      );
      
      if (venues.length === 0) {
        throw new Error('场地不存在或已关闭');
      }
      
      return venues[0];
    } catch (error) {
      throw new Error(`获取场地详情失败: ${error.message}`);
    }
  }

  /**
   * 获取场地时间安排
   * @param {Object} db - 数据库连接
   * @param {string} venueId - 场地ID
   * @param {string} date - 日期
   * @returns {Promise<Array>} 时间安排
   */
  async getVenueSchedule(db, venueId, date) {
    try {
      // 获取场地信息
      const venue = await this.getVenueDetail(db, venueId);
      
      // 生成时间段
      const schedule = this.generateTimeSlots(venue, date);
      
      // 获取已预约的时间段
      const [reservations] = await db.execute(
        `SELECT r.*, u.nickName as userName, u.phoneNumber
         FROM reservations r
         LEFT JOIN users u ON r.userId = u._id
         WHERE r.venueId = ? AND r.reservationDate = ? AND r.status IN ('confirmed', 'pending')
         ORDER BY r.startTime ASC`,
        [venueId, date]
      );
      
      // 标记已预约的时间段
      const bookedSlots = new Set();
      reservations.forEach(reservation => {
        const startTime = reservation.startTime;
        const endTime = reservation.endTime;
        
        schedule.forEach(slot => {
          if (this.isTimeOverlap(slot.startTime, slot.endTime, startTime, endTime)) {
            slot.status = 'booked';
            slot.reservation = {
              id: reservation._id,
              userName: reservation.userName,
              phoneNumber: reservation.phoneNumber,
              purpose: reservation.purpose,
              createTime: reservation.createTime
            };
          }
        });
      });
      
      return schedule;
    } catch (error) {
      throw new Error(`获取场地时间安排失败: ${error.message}`);
    }
  }

  /**
   * 生成时间段
   * @param {Object} venue - 场地信息
   * @param {string} date - 日期
   * @returns {Array} 时间段列表
   */
  generateTimeSlots(venue, date) {
    const slots = [];
    const openTime = moment(venue.openTime, 'HH:mm:ss');
    const closeTime = moment(venue.closeTime, 'HH:mm:ss');
    const slotDuration = 60; // 1小时一个时间段
    
    let currentTime = openTime.clone();
    
    while (currentTime.isBefore(closeTime)) {
      const endTime = currentTime.clone().add(slotDuration, 'minutes');
      
      if (endTime.isAfter(closeTime)) {
        break;
      }
      
      slots.push({
        id: `${venue._id}_${date}_${currentTime.format('HH:mm')}`,
        venueId: venue._id,
        date: date,
        startTime: currentTime.format('HH:mm'),
        endTime: endTime.format('HH:mm'),
        status: 'available',
        price: venue.pricePerHour || 0,
        duration: slotDuration
      });
      
      currentTime.add(slotDuration, 'minutes');
    }
    
    return slots;
  }

  /**
   * 检查时间是否重叠
   * @param {string} start1 - 开始时间1
   * @param {string} end1 - 结束时间1
   * @param {string} start2 - 开始时间2
   * @param {string} end2 - 结束时间2
   * @returns {boolean} 是否重叠
   */
  isTimeOverlap(start1, end1, start2, end2) {
    const s1 = moment(start1, 'HH:mm');
    const e1 = moment(end1, 'HH:mm');
    const s2 = moment(start2, 'HH:mm');
    const e2 = moment(end2, 'HH:mm');
    
    return s1.isBefore(e2) && s2.isBefore(e1);
  }

  /**
   * 提交场地预约
   * @param {Object} db - 数据库连接
   * @param {Object} reservationData - 预约数据
   * @param {Object} user - 用户信息
   * @returns {Promise<Object>} 预约结果
   */
  async submitReservation(db, reservationData, user) {
    try {
      const {
        venueId,
        date,
        startTime,
        endTime,
        purpose,
        remark = '',
        participants = []
      } = reservationData;
      
      // 验证场地是否存在
      const venue = await this.getVenueDetail(db, venueId);
      
      // 验证时间冲突
      await this.checkTimeConflict(db, venueId, date, startTime, endTime);
      
      // 验证预约时间是否在场地开放时间内
      this.validateBookingTime(venue, startTime, endTime);
      
      // 计算预约时长和价格
      const duration = this.calculateDuration(startTime, endTime);
      const totalAmount = this.calculatePrice(venue, duration);
      
      // 创建预约记录
      const reservationId = uuidv4();
      const now = this.timeUtils.getBeijingTime();
      
      await db.execute(
        `INSERT INTO reservations (
          _id, venueId, venueName, userId, reservationDate, startTime, endTime,
          duration, userName, phoneNumber, department, purpose, participants,
          participantCount, remark, totalAmount, status, createTime
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reservationId,
          venueId,
          venue.name,
          user.id,
          date,
          startTime,
          endTime,
          duration,
          user.nickName || user.name,
          user.phoneNumber,
          user.department || '',
          purpose,
          JSON.stringify(participants),
          participants.length + 1,
          remark,
          totalAmount,
          venue.requireApproval ? 'pending' : 'confirmed',
          now.toISOString()
        ]
      );
      
      return {
        reservationId,
        status: venue.requireApproval ? 'pending' : 'confirmed',
        totalAmount,
        message: venue.requireApproval ? '预约已提交，等待审核' : '预约成功'
      };
    } catch (error) {
      throw new Error(`提交预约失败: ${error.message}`);
    }
  }

  /**
   * 检查时间冲突
   * @param {Object} db - 数据库连接
   * @param {string} venueId - 场地ID
   * @param {string} date - 日期
   * @param {string} startTime - 开始时间
   * @param {string} endTime - 结束时间
   */
  async checkTimeConflict(db, venueId, date, startTime, endTime) {
    const [conflicts] = await db.execute(
      `SELECT _id FROM reservations 
       WHERE venueId = ? AND reservationDate = ? 
       AND status IN ('confirmed', 'pending')
       AND ((startTime < ? AND endTime > ?) OR (startTime < ? AND endTime >= ?))`,
      [venueId, date, endTime, startTime, endTime, startTime]
    );
    
    if (conflicts.length > 0) {
      throw new Error('该时间段已被预约，请选择其他时间');
    }
  }

  /**
   * 验证预约时间
   * @param {Object} venue - 场地信息
   * @param {string} startTime - 开始时间
   * @param {string} endTime - 结束时间
   */
  validateBookingTime(venue, startTime, endTime) {
    const venueOpenTime = moment(venue.openTime, 'HH:mm:ss');
    const venueCloseTime = moment(venue.closeTime, 'HH:mm:ss');
    const bookingStartTime = moment(startTime, 'HH:mm');
    const bookingEndTime = moment(endTime, 'HH:mm');
    
    if (bookingStartTime.isBefore(venueOpenTime) || bookingEndTime.isAfter(venueCloseTime)) {
      throw new Error(`预约时间必须在场地开放时间内（${venue.openTime} - ${venue.closeTime}）`);
    }
    
    const duration = this.calculateDuration(startTime, endTime);
    if (duration < (venue.minBookingHours || 1) * 60) {
      throw new Error(`预约时长不能少于${venue.minBookingHours || 1}小时`);
    }
    
    if (duration > (venue.maxBookingHours || 4) * 60) {
      throw new Error(`预约时长不能超过${venue.maxBookingHours || 4}小时`);
    }
  }

  /**
   * 计算预约时长（分钟）
   * @param {string} startTime - 开始时间
   * @param {string} endTime - 结束时间
   * @returns {number} 时长（分钟）
   */
  calculateDuration(startTime, endTime) {
    const start = moment(startTime, 'HH:mm');
    const end = moment(endTime, 'HH:mm');
    return end.diff(start, 'minutes');
  }

  /**
   * 计算价格
   * @param {Object} venue - 场地信息
   * @param {number} duration - 时长（分钟）
   * @returns {number} 总价格
   */
  calculatePrice(venue, duration) {
    const hourlyRate = venue.pricePerHour || 0;
    const hours = duration / 60;
    return Math.round(hourlyRate * hours * 100) / 100;
  }

  /**
   * 获取用户预约记录
   * @param {Object} db - 数据库连接
   * @param {string} userId - 用户ID
   * @param {Object} filters - 筛选条件
   * @returns {Promise<Object>} 预约记录
   */
  async getUserReservations(db, userId, filters = {}) {
    try {
      const { page = 1, pageSize = 20, status, date } = filters;
      
      let whereClause = 'WHERE r.userId = ?';
      const params = [userId];
      
      if (status) {
        whereClause += ' AND r.status = ?';
        params.push(status);
      }
      
      if (date) {
        whereClause += ' AND r.reservationDate = ?';
        params.push(date);
      }
      
      // 获取总数
      const [countResult] = await db.execute(
        `SELECT COUNT(*) as total FROM reservations r ${whereClause}`,
        params
      );
      const total = countResult[0].total;
      
      // 获取分页数据
      const offset = (page - 1) * pageSize;
      const [reservations] = await db.execute(
        `SELECT r.*, v.name as venueName, v.type as venueType, v.location
         FROM reservations r
         LEFT JOIN venues v ON r.venueId = v._id
         ${whereClause}
         ORDER BY r.createTime DESC
         LIMIT ? OFFSET ?`,
        [...params, pageSize, offset]
      );
      
      return {
        list: reservations,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      };
    } catch (error) {
      throw new Error(`获取预约记录失败: ${error.message}`);
    }
  }

  /**
   * 取消预约
   * @param {Object} db - 数据库连接
   * @param {string} reservationId - 预约ID
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 取消结果
   */
  async cancelReservation(db, reservationId, userId) {
    try {
      // 检查预约是否存在且属于当前用户
      const [reservations] = await db.execute(
        'SELECT * FROM reservations WHERE _id = ? AND userId = ?',
        [reservationId, userId]
      );
      
      if (reservations.length === 0) {
        throw new Error('预约不存在或无权限操作');
      }
      
      const reservation = reservations[0];
      
      // 检查是否可以取消
      if (reservation.status === 'cancelled') {
        throw new Error('预约已取消');
      }
      
      if (reservation.status === 'completed') {
        throw new Error('预约已完成，无法取消');
      }
      
      // 检查取消时间限制（提前2小时）
      const now = this.timeUtils.getBeijingTime();
      const reservationDateTime = moment(`${reservation.reservationDate} ${reservation.startTime}`);
      const hoursUntilReservation = reservationDateTime.diff(now, 'hours');
      
      if (hoursUntilReservation < 2) {
        throw new Error('预约开始前2小时内无法取消');
      }
      
      // 更新预约状态
      await db.execute(
        'UPDATE reservations SET status = "cancelled", updateTime = ? WHERE _id = ?',
        [now.toISOString(), reservationId]
      );
      
      return {
        reservationId,
        status: 'cancelled',
        message: '预约已取消'
      };
    } catch (error) {
      throw new Error(`取消预约失败: ${error.message}`);
    }
  }
}

module.exports = new VenueService();
