const { BusinessError, NotFoundError, ConflictError, ERROR_CODES } = require('./errors');
const moment = require('moment-timezone');
const TimeUtils = require('./timeUtils');
const logger = require('./logger');

/**
 * 公共函数工具类
 * 提取重复的业务逻辑，减少代码冗余
 */
class CommonUtils {

  /**
   * 验证订单状态
   * @param {Object} order - 订单对象
   * @param {string} requiredStatus - 需要的状态
   * @param {string} operation - 操作名称
   */
  static validateOrderStatus(order, requiredStatus = null, operation = '操作') {
    if (!order) {
      throw new NotFoundError('订单不存在', ERROR_CODES.ORDER_NOT_FOUND);
    }

    if (order.status === 'cancelled') {
      throw new BusinessError('订单已取消，无法执行此操作', ERROR_CODES.ORDER_CANCELLED);
    }

    if (requiredStatus && order.diningStatus === requiredStatus) {
      const statusText = requiredStatus === 'dined' ? '已确认就餐' : '已报餐';
      throw new ConflictError(`该订单${statusText}`, ERROR_CODES.ORDER_ALREADY_CONFIRMED);
    }
  }

  /**
   * 验证用户权限
   * @param {Object} user - 用户对象
   * @param {Array} allowedRoles - 允许的角色
   * @param {string} operation - 操作名称
   */
  static validateUserPermission(user, allowedRoles, operation = '操作') {
    if (!user) {
      throw new BusinessError('用户未登录', ERROR_CODES.AUTHENTICATION_ERROR);
    }

    if (!allowedRoles.includes(user.role)) {
      throw new BusinessError(`需要${allowedRoles.join('或')}权限`, ERROR_CODES.INSUFFICIENT_PERMISSIONS);
    }
  }

  /**
   * 验证就餐时间
   * @param {string} diningDate - 就餐日期
   * @param {string} mealType - 餐次类型
   * @param {boolean} allowFlexible - 是否允许灵活时间
   */
  static validateDiningTime(diningDate, mealType, allowFlexible = false) {
    const diningMoment = moment(diningDate).tz('Asia/Shanghai');
    const now = TimeUtils.getBeijingTime();

    // 如果是当天，检查是否在合理时间范围内
    if (diningMoment.isSame(now, 'day')) {
      if (!allowFlexible && !TimeUtils.isInDiningTime(mealType, now)) {
        const timeRange = TimeUtils.getMealTimeRangeDescription(mealType);
        throw new BusinessError(
          `不在${TimeUtils.getMealTypeName(mealType)}时间范围内（${timeRange}）`,
          ERROR_CODES.INVALID_DINING_TIME
        );
      }
    }

    // 不能提前太多确认（超过1天）
    if (diningMoment.isAfter(now.add(1, 'day'))) {
      throw new BusinessError('不能提前超过1天确认就餐', ERROR_CODES.INVALID_DINING_TIME);
    }
  }

  /**
   * 获取餐次名称
   * @param {string} mealType - 餐次类型
   * @returns {string} 餐次名称
   */
  static getMealTypeName(mealType) {
    const mealTypeMap = {
      'breakfast': '早餐',
      'lunch': '午餐',
      'dinner': '晚餐'
    };
    return mealTypeMap[mealType] || mealType;
  }

  /**
   * 获取状态文本
   * @param {string} status - 状态
   * @param {string} type - 类型（order/dining）
   * @returns {string} 状态文本
   */
  static getStatusText(status, type = 'order') {
    if (type === 'order') {
      const statusMap = {
        'pending': '待确认',
        'confirmed': '已确认',
        'cancelled': '已取消'
      };
      return statusMap[status] || status;
    } else if (type === 'dining') {
      const statusMap = {
        'ordered': '已报餐',
        'dined': '已就餐',
        'cancelled': '已取消'
      };
      return statusMap[status] || status;
    }
    return status;
  }

  /**
   * 格式化时间
   * @param {Date|string} time - 时间
   * @param {string} format - 格式
   * @returns {string} 格式化后的时间
   */
  static formatTime(time, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!time) return null;
    return moment(time).format(format);
  }

  /**
   * 检查用户是否属于同一部门
   * @param {Array} users - 用户数组
   * @param {string} departmentId - 部门ID
   * @returns {Object} 检查结果
   */
  static validateUsersDepartment(users, departmentId) {
    const invalidUsers = users.filter(user => user.departmentId !== departmentId);
    
    if (invalidUsers.length > 0) {
      return {
        valid: false,
        invalidUsers: invalidUsers.map(u => u.nickName),
        message: `用户 ${invalidUsers.map(u => u.nickName).join(', ')} 不属于本部门`
      };
    }

    return { valid: true };
  }

  /**
   * 检查重复报餐
   * @param {Array} memberIds - 成员ID数组
   * @param {Array} existingOrders - 现有订单数组
   * @returns {Object} 检查结果
   */
  static checkDuplicateOrders(memberIds, existingOrders) {
    const existingMemberIds = new Set();
    
    existingOrders.forEach(order => {
      if (order.memberIds) {
        try {
          const existingIds = JSON.parse(order.memberIds);
          existingIds.forEach(id => existingMemberIds.add(id));
        } catch (error) {
          logger.warn('解析memberIds失败:', error);
        }
      }
    });

    const duplicateMembers = memberIds.filter(id => existingMemberIds.has(id));
    
    if (duplicateMembers.length > 0) {
      return {
        hasDuplicates: true,
        duplicateMemberIds: duplicateMembers,
        message: `用户 ${duplicateMembers.join(', ')} 已经报餐，无法重复报餐`
      };
    }

    return { hasDuplicates: false };
  }

  /**
   * 生成确认日志数据
   * @param {string} orderId - 订单ID
   * @param {string} userId - 用户ID
   * @param {string} userName - 用户姓名
   * @param {string} confirmationType - 确认类型
   * @param {string} remark - 备注
   * @returns {Object} 日志数据
   */
  static generateConfirmationLog(orderId, userId, userName, confirmationType, remark = null) {
    return {
      orderId,
      userId,
      userName,
      confirmationType,
      confirmationTime: new Date(),
      remark,
      ipAddress: null, // 可以从请求中获取
      userAgent: null  // 可以从请求中获取
    };
  }

  /**
   * 计算统计数据
   * @param {Array} records - 记录数组
   * @param {string} statusField - 状态字段名
   * @returns {Object} 统计数据
   */
  static calculateStats(records, statusField = 'diningStatus') {
    const stats = {
      total: records.length,
      ordered: 0,
      dined: 0,
      cancelled: 0
    };

    records.forEach(record => {
      const status = record[statusField];
      if (status === 'ordered') stats.ordered++;
      else if (status === 'dined') stats.dined++;
      else if (status === 'cancelled') stats.cancelled++;
    });

    stats.confirmationRate = stats.total > 0 ? (stats.dined / stats.total * 100).toFixed(2) : '0.00';
    
    return stats;
  }

  /**
   * 分页处理
   * @param {Object} query - 查询参数
   * @param {number} defaultPage - 默认页码
   * @param {number} defaultSize - 默认页大小
   * @param {number} maxSize - 最大页大小
   * @returns {Object} 分页参数
   */
  static processPagination(query, defaultPage = 1, defaultSize = 20, maxSize = 100) {
    const page = Math.max(1, parseInt(query.page) || defaultPage);
    const size = Math.min(maxSize, Math.max(1, parseInt(query.size) || defaultSize));
    
    return {
      page,
      size,
      offset: (page - 1) * size,
      limit: size
    };
  }

  /**
   * 生成分页响应
   * @param {Array} records - 记录数组
   * @param {number} total - 总记录数
   * @param {number} page - 当前页码
   * @param {number} size - 页大小
   * @returns {Object} 分页响应
   */
  static generatePaginationResponse(records, total, page, size) {
    const totalPages = Math.ceil(total / size);
    
    return {
      records,
      pagination: {
        page,
        size,
        total,
        totalPages,
        hasMore: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * 安全解析JSON
   * @param {string} jsonString - JSON字符串
   * @param {*} defaultValue - 默认值
   * @returns {*} 解析结果
   */
  static safeParseJSON(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      logger.warn('JSON解析失败:', error);
      return defaultValue;
    }
  }

  /**
   * 深度克隆对象
   * @param {*} obj - 要克隆的对象
   * @returns {*} 克隆后的对象
   */
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
      return obj.map(item => this.deepClone(item));
    }
    
    if (typeof obj === 'object') {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
  }

  /**
   * 生成唯一ID
   * @param {string} prefix - 前缀
   * @returns {string} 唯一ID
   */
  static generateUniqueId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  /**
   * 验证手机号格式
   * @param {string} phone - 手机号
   * @returns {boolean} 是否有效
   */
  static validatePhone(phone) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * 验证邮箱格式
   * @param {string} email - 邮箱
   * @returns {boolean} 是否有效
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 脱敏手机号
   * @param {string} phone - 手机号
   * @returns {string} 脱敏后的手机号
   */
  static maskPhone(phone) {
    if (!phone || phone.length !== 11 || !this.validatePhone(phone)) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  /**
   * 脱敏邮箱
   * @param {string} email - 邮箱
   * @returns {string} 脱敏后的邮箱
   */
  static maskEmail(email) {
    if (!email || !email.includes('@')) return email;
    const [username, domain] = email.split('@');
    const maskedUsername = username.length > 2 
      ? username.substr(0, 2) + '*'.repeat(username.length - 2)
      : username;
    return `${maskedUsername}@${domain}`;
  }
}

module.exports = CommonUtils;
