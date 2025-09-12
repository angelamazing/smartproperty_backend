const moment = require('moment-timezone');

/**
 * 时间处理工具类
 * 统一处理报餐系统中的时间转换和格式化
 */
class TimeUtils {
  
  /**
   * 获取当前北京时间
   * @returns {moment} 北京时间
   */
  static getBeijingTime() {
    return moment().tz('Asia/Shanghai');
  }

  /**
   * 将北京时间转换为UTC时间用于存储
   * @param {Date|moment|string} beijingTime - 北京时间
   * @returns {Date} UTC时间
   */
  static toUTCForStorage(beijingTime) {
    if (!beijingTime) {
      return null;
    }
    // 如果输入的是字符串，先解析为北京时间，再转换为UTC
    if (typeof beijingTime === 'string') {
      return moment.tz(beijingTime, 'Asia/Shanghai').utc().toDate();
    }
    return moment(beijingTime).tz('Asia/Shanghai').utc().toDate();
  }

  /**
   * 将UTC时间转换为北京时间用于显示
   * @param {Date|string} utcTime - UTC时间
   * @returns {string} 北京时间字符串 (YYYY-MM-DD HH:mm:ss)
   */
  static toBeijingForDisplay(utcTime) {
    if (!utcTime) {
      return null;
    }
    return moment(utcTime).tz('Asia/Shanghai').format('YYYY-MM-DD HH:mm:ss');
  }

  /**
   * 将UTC时间转换为ISO 8601格式用于API返回
   * @param {Date|string} utcTime - UTC时间
   * @returns {string} ISO 8601格式的UTC时间字符串
   */
  static toISOString(utcTime) {
    if (!utcTime) {
      return null;
    }
    // 直接返回UTC时间的ISO格式，因为数据库存储的就是UTC时间
    return moment(utcTime).utc().toISOString();
  }

  /**
   * 将UTC时间转换为北京时间的ISO 8601格式用于API返回
   * @param {Date|string} utcTime - UTC时间
   * @returns {string} 北京时间的ISO 8601格式字符串
   */
  static toBeijingISOString(utcTime) {
    if (!utcTime) {
      return null;
    }
    // 将UTC时间转换为北京时间，然后格式化为ISO字符串
    const beijingTime = moment(utcTime).tz('Asia/Shanghai');
    // 使用+08:00时区标识符，而不是Z（UTC标识符）
    return beijingTime.format('YYYY-MM-DDTHH:mm:ss.SSS[+08:00]');
  }

  /**
   * 将UTC时间转换为北京时间用于显示（仅时间部分）
   * @param {Date|string} utcTime - UTC时间
   * @returns {string} 北京时间字符串 (HH:mm:ss)
   */
  static toBeijingTimeOnly(utcTime) {
    if (!utcTime) {
      return null;
    }
    return moment(utcTime).tz('Asia/Shanghai').format('HH:mm:ss');
  }

  /**
   * 将UTC时间转换为北京时间用于显示（仅日期部分）
   * @param {Date|string} utcTime - UTC时间
   * @returns {string} 北京时间字符串 (YYYY-MM-DD)
   */
  static toBeijingDateOnly(utcTime) {
    if (!utcTime) {
      return null;
    }
    return moment(utcTime).tz('Asia/Shanghai').format('YYYY-MM-DD');
  }

  /**
   * 获取餐次类型
   * @param {Date|moment|string} time - 时间
   * @returns {string|null} 餐次类型 (breakfast/lunch/dinner) 或 null
   */
  static getMealTypeByTime(time) {
    if (!time) {
      return null;
    }
    
    // 如果输入是字符串，先解析为北京时间
    let beijingTime;
    if (typeof time === 'string') {
      // 判断字符串格式，如果是ISO格式则先转换为北京时间
      if (time.includes('T') && time.includes('Z')) {
        // UTC时间格式，转换为北京时间
        beijingTime = moment(time).tz('Asia/Shanghai');
      } else {
        // 本地时间格式，直接解析为北京时间
        beijingTime = moment.tz(time, 'Asia/Shanghai');
      }
    } else {
      // Date对象或moment对象，转换为北京时间
      beijingTime = moment(time).tz('Asia/Shanghai');
    }
    
    const hour = beijingTime.hour();
    
    if (hour >= 6 && hour < 10) {
      return 'breakfast';
    } else if (hour >= 11 && hour < 14) {
      return 'lunch';
    } else if (hour >= 17 && hour < 20) {
      return 'dinner';
    }
    return null;
  }

  /**
   * 获取餐次类型名称
   * @param {string} mealType - 餐次类型
   * @returns {string} 餐次类型名称
   */
  static getMealTypeName(mealType) {
    const mealTypeNames = {
      'breakfast': '早餐',
      'lunch': '午餐',
      'dinner': '晚餐'
    };
    return mealTypeNames[mealType] || '未知餐次';
  }

  /**
   * 检查是否在就餐时间内
   * @param {string} mealType - 餐次类型
   * @param {Date|moment|string} time - 时间，默认为当前时间
   * @returns {boolean} 是否在就餐时间内
   */
  static isInDiningTime(mealType, time = null) {
    const checkTime = time ? moment(time).tz('Asia/Shanghai') : this.getBeijingTime();
    const hour = checkTime.hour();
    
    const mealTimeRanges = {
      'breakfast': { start: 6, end: 10 },
      'lunch': { start: 11, end: 14 },
      'dinner': { start: 17, end: 20 }
    };
    
    const timeRange = mealTimeRanges[mealType];
    return timeRange && hour >= timeRange.start && hour <= timeRange.end;
  }

  /**
   * 检查是否在指定餐次的就餐时间范围内
   * @param {string} mealType - 餐次类型
   * @param {Date|moment|string} time - 时间
   * @returns {boolean} 是否在就餐时间范围内
   */
  static isInMealTimeRange(mealType, time) {
    if (!mealType || !time) {
      return false;
    }
    
    const beijingTime = moment(time).tz('Asia/Shanghai');
    const hour = beijingTime.hour();
    
    const mealTimeRanges = {
      'breakfast': { start: 6, end: 10 },
      'lunch': { start: 11, end: 14 },
      'dinner': { start: 17, end: 20 }
    };
    
    const timeRange = mealTimeRanges[mealType];
    return timeRange && hour >= timeRange.start && hour <= timeRange.end;
  }

  /**
   * 获取当前餐次类型
   * @returns {string|null} 当前餐次类型
   */
  static getCurrentMealType() {
    return this.getMealTypeByTime(this.getBeijingTime());
  }

  /**
   * 检查日期是否为今天
   * @param {string|Date|moment} date - 日期
   * @returns {boolean} 是否为今天
   */
  static isToday(date) {
    if (!date) {
      return false;
    }
    const beijingDate = moment(date).tz('Asia/Shanghai');
    const today = this.getBeijingTime();
    return beijingDate.isSame(today, 'day');
  }

  /**
   * 检查日期是否为过去
   * @param {string|Date|moment} date - 日期
   * @returns {boolean} 是否为过去
   */
  static isPastDate(date) {
    if (!date) {
      return false;
    }
    const beijingDate = moment(date).tz('Asia/Shanghai');
    const today = this.getBeijingTime();
    return beijingDate.isBefore(today, 'day');
  }

  /**
   * 检查日期是否为未来
   * @param {string|Date|moment} date - 日期
   * @returns {boolean} 是否为未来
   */
  static isFutureDate(date) {
    if (!date) {
      return false;
    }
    const beijingDate = moment(date).tz('Asia/Shanghai');
    const today = this.getBeijingTime();
    return beijingDate.isAfter(today, 'day');
  }

  /**
   * 格式化时间为友好的显示格式
   * @param {Date|string} time - 时间
   * @param {string} format - 格式，默认为 'YYYY-MM-DD HH:mm:ss'
   * @returns {string} 格式化后的时间字符串
   */
  static formatTime(time, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!time) {
      return null;
    }
    return moment(time).tz('Asia/Shanghai').format(format);
  }

  /**
   * 获取时间差描述
   * @param {Date|string} time - 时间
   * @returns {string} 时间差描述
   */
  static getTimeDiffDescription(time) {
    if (!time) {
      return null;
    }
    
    const beijingTime = moment(time).tz('Asia/Shanghai');
    const now = this.getBeijingTime();
    
    const diffMinutes = now.diff(beijingTime, 'minutes');
    const diffHours = now.diff(beijingTime, 'hours');
    const diffDays = now.diff(beijingTime, 'days');
    
    if (diffMinutes < 1) {
      return '刚刚';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return beijingTime.format('YYYY-MM-DD');
    }
  }

  /**
   * 验证时间格式是否正确
   * @param {string} timeString - 时间字符串
   * @param {string} format - 期望的格式
   * @returns {boolean} 格式是否正确
   */
  static isValidTimeFormat(timeString, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!timeString) {
      return false;
    }
    return moment(timeString, format, true).isValid();
  }

  /**
   * 解析时间字符串
   * @param {string} timeString - 时间字符串
   * @param {string} format - 时间格式
   * @returns {moment|null} 解析后的时间对象
   */
  static parseTime(timeString, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!timeString) {
      return null;
    }
    
    const parsed = moment(timeString, format, true);
    return parsed.isValid() ? parsed.tz('Asia/Shanghai') : null;
  }

  /**
   * 获取时间范围描述
   * @param {string} mealType - 餐次类型
   * @returns {string} 时间范围描述
   */
  static getMealTimeRangeDescription(mealType) {
    const mealTimeRanges = {
      'breakfast': '06:00-10:00',
      'lunch': '11:00-14:00',
      'dinner': '17:00-20:00'
    };
    
    return mealTimeRanges[mealType] || '未知时间范围';
  }

  /**
   * 检查是否可以报餐
   * @param {string} date - 报餐日期
   * @returns {boolean} 是否可以报餐
   */
  static canRegisterMeal(date) {
    if (!date) {
      return false;
    }
    
    const beijingDate = moment(date).tz('Asia/Shanghai');
    const today = this.getBeijingTime();
    
    // 不能为过去的日期报餐
    if (beijingDate.isBefore(today, 'day')) {
      return false;
    }
    
    return true;
  }

  /**
   * 检查是否可以确认就餐
   * @param {string} date - 就餐日期
   * @param {string} mealType - 餐次类型
   * @returns {boolean} 是否可以确认就餐
   */
  static canConfirmDining(date, mealType) {
    if (!date || !mealType) {
      return false;
    }
    
    const beijingDate = moment(date).tz('Asia/Shanghai');
    const today = this.getBeijingTime();
    
    // 如果是今天，检查是否在就餐时间内
    if (beijingDate.isSame(today, 'day')) {
      return this.isInDiningTime(mealType);
    }
    
    // 如果是过去的日期，不允许确认就餐
    if (beijingDate.isBefore(today, 'day')) {
      return false;
    }
    
    // 未来的日期暂时允许确认就餐（可以根据业务需求调整）
    return true;
  }
}

module.exports = TimeUtils;
