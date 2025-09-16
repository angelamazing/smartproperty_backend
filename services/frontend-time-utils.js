/**
 * 前端时间处理工具类
 * 统一处理从后端接收的UTC时间，并转换为北京时间显示
 * 
 * 使用方法：
 * 1. 安装依赖：npm install dayjs
 * 2. 导入工具类：import { TimeUtils } from './frontend-time-utils.js'
 * 3. 使用工具类方法处理时间
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

// 配置插件
dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

/**
 * 前端时间处理工具类
 * 统一处理从后端接收的UTC时间，并转换为北京时间显示
 */
export class TimeUtils {
  /**
   * 解析后端时间字符串为dayjs对象
   * @param {string} timeString - 后端UTC时间字符串
   * @returns {dayjs|null} dayjs对象，如果输入无效则返回null
   */
  static parseTime(timeString) {
    if (!timeString) return null;
    return dayjs(timeString);
  }

  /**
   * 格式化UTC时间为北京时间字符串
   * @param {string|Date} time - UTC时间字符串或Date对象
   * @param {string} format - 格式类型
   * @returns {string} 格式化后的北京时间字符串
   */
  static formatTime(time, format = 'YYYY-MM-DD HH:mm:ss') {
    if (!time) return '';
    // 将UTC时间转换为北京时间显示
    return dayjs(time).utcOffset(8).format(format);
  }

  /**
   * 获取相对时间（如：3分钟前、2小时前）
   * @param {string|Date} time - UTC时间字符串或Date对象
   * @returns {string} 相对时间字符串
   */
  static getRelativeTime(time) {
    if (!time) return '';
    return dayjs(time).fromNow();
  }

  /**
   * 将北京时间转换为UTC时间用于提交给后端
   * @param {string|Date} beijingTime - 北京时间
   * @returns {string} ISO 8601格式的UTC时间字符串
   */
  static toUTCForSubmit(beijingTime) {
    if (!beijingTime) return '';
    // 判断输入是否为日期时间字符串
    if (typeof beijingTime === 'string') {
      // 尝试解析不同格式的日期时间
      let parsed;
      if (beijingTime.includes('T')) {
        // ISO格式字符串
        parsed = dayjs(beijingTime);
      } else if (beijingTime.includes(' ')) {
        // YYYY-MM-DD HH:mm:ss格式
        parsed = dayjs(beijingTime, 'YYYY-MM-DD HH:mm:ss');
      } else if (beijingTime.length === 10) {
        // YYYY-MM-DD格式
        parsed = dayjs(beijingTime, 'YYYY-MM-DD');
      } else {
        // 其他格式，尝试自动解析
        parsed = dayjs(beijingTime);
      }
      
      if (parsed.isValid()) {
        // 转换为UTC时间
        return parsed.utc().toISOString();
      }
      return '';
    }
    
    // 如果是Date对象，直接转换
    return dayjs(beijingTime).utc().toISOString();
  }

  /**
   * 获取当前日期字符串（YYYY-MM-DD格式）
   * @returns {string} 当前日期
   */
  static getCurrentDate() {
    return dayjs().utcOffset(8).format('YYYY-MM-DD');
  }

  /**
   * 获取当前时间字符串（HH:mm格式）
   * @returns {string} 当前时间
   */
  static getCurrentTime() {
    return dayjs().utcOffset(8).format('HH:mm');
  }

  /**
   * 验证时间格式是否有效
   * @param {string} timeString - 时间字符串
   * @returns {boolean} 是否有效
   */
  static isValidTime(timeString) {
    if (!timeString) return false;
    return dayjs(timeString).isValid();
  }

  /**
   * 计算两个时间之间的差值（分钟）
   * @param {string|Date} startTime - 开始时间
   * @param {string|Date} endTime - 结束时间
   * @returns {number} 时间差（分钟）
   */
  static getTimeDiff(startTime, endTime) {
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);
    
    if (!start || !end) return 0;
    
    return end.diff(start, 'minute');
  }

  /**
   * 检查日期是否为今天
   * @param {string|Date} date - 日期
   * @returns {boolean} 是否为今天
   */
  static isToday(date) {
    if (!date) return false;
    const targetDate = this.parseTime(date);
    const today = dayjs().utcOffset(8);
    
    return targetDate && targetDate.isSame(today, 'day');
  }

  /**
   * 检查日期是否为过去
   * @param {string|Date} date - 日期
   * @returns {boolean} 是否为过去
   */
  static isPastDate(date) {
    if (!date) return false;
    const targetDate = this.parseTime(date);
    const today = dayjs().utcOffset(8).startOf('day');
    
    return targetDate && targetDate.isBefore(today);
  }

  /**
   * 检查日期是否为未来
   * @param {string|Date} date - 日期
   * @returns {boolean} 是否为未来
   */
  static isFutureDate(date) {
    if (!date) return false;
    const targetDate = this.parseTime(date);
    const today = dayjs().utcOffset(8).endOf('day');
    
    return targetDate && targetDate.isAfter(today);
  }

  /**
   * 安全的时间格式化，包含错误处理
   * @param {string|Date} time - 时间
   * @param {string} format - 格式
   * @returns {string} 格式化后的时间字符串或占位符
   */
  static safeFormatTime(time, format = 'YYYY-MM-DD HH:mm:ss') {
    try {
      if (!time) return '--';
      if (!this.isValidTime(time)) return '无效时间';
      return this.formatTime(time, format);
    } catch (error) {
      console.error('时间格式化错误:', error);
      return '--';
    }
  }

  /**
   * 处理不同时区的时间显示
   * @param {string|Date} time - 时间
   * @param {string} timezone - 时区，默认Asia/Shanghai
   * @param {string} format - 格式
   * @returns {string} 格式化后的时间字符串
   */
  static formatTimeWithTimezone(time, timezone = 'Asia/Shanghai', format = 'YYYY-MM-DD HH:mm:ss') {
    try {
      if (!time) return '--';
      
      // 使用Intl.DateTimeFormat处理时区转换
      const date = new Date(time);
      const options = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };
      
      const formatter = new Intl.DateTimeFormat('zh-CN', options);
      const parts = formatter.formatToParts(date);
      
      // 构建自定义格式
      const formatted = format
        .replace('YYYY', parts.find(p => p.type === 'year').value)
        .replace('MM', parts.find(p => p.type === 'month').value)
        .replace('DD', parts.find(p => p.type === 'day').value)
        .replace('HH', parts.find(p => p.type === 'hour').value)
        .replace('mm', parts.find(p => p.type === 'minute').value)
        .replace('ss', parts.find(p => p.type === 'second').value);
      
      return formatted;
    } catch (error) {
      console.error('时区转换错误:', error);
      return this.safeFormatTime(time, format);
    }
  }

  /**
   * 获取指定日期的开始时间（00:00:00）
   * @param {string|Date} date - 日期
   * @returns {string} 该日期开始时间的UTC字符串
   */
  static getDayStartTime(date) {
    if (!date) return '';
    const targetDate = dayjs(date);
    if (!targetDate.isValid()) return '';
    
    return targetDate.startOf('day').utc().toISOString();
  }

  /**
   * 获取指定日期的结束时间（23:59:59）
   * @param {string|Date} date - 日期
   * @returns {string} 该日期结束时间的UTC字符串
   */
  static getDayEndTime(date) {
    if (!date) return '';
    const targetDate = dayjs(date);
    if (!targetDate.isValid()) return '';
    
    return targetDate.endOf('day').utc().toISOString();
  }

  /**
   * 获取指定日期的前一天
   * @param {string|Date} date - 日期
   * @param {string} format - 返回格式
   * @returns {string} 前一天的日期字符串
   */
  static getPreviousDay(date, format = 'YYYY-MM-DD') {
    if (!date) return '';
    const targetDate = this.parseTime(date);
    
    return targetDate ? targetDate.subtract(1, 'day').format(format) : '';
  }

  /**
   * 获取指定日期的后一天
   * @param {string|Date} date - 日期
   * @param {string} format - 返回格式
   * @returns {string} 后一天的日期字符串
   */
  static getNextDay(date, format = 'YYYY-MM-DD') {
    if (!date) return '';
    const targetDate = this.parseTime(date);
    
    return targetDate ? targetDate.add(1, 'day').format(format) : '';
  }

  /**
   * 获取日期范围数组
   * @param {string|Date} startDate - 开始日期
   * @param {string|Date} endDate - 结束日期
   * @param {string} format - 返回格式
   * @returns {string[]} 日期数组
   */
  static getDateRange(startDate, endDate, format = 'YYYY-MM-DD') {
    const start = this.parseTime(startDate);
    const end = this.parseTime(endDate);
    
    if (!start || !end || start.isAfter(end)) return [];
    
    const dates = [];
    let current = start;
    
    while (current.isBefore(end) || current.isSame(end, 'day')) {
      dates.push(current.format(format));
      current = current.add(1, 'day');
    }
    
    return dates;
  }

  /**
   * 获取时间状态信息
   * @param {string|Date} time - 时间
   * @returns {Object} 时间状态对象 {status, text, color}
   */
  static getTimeStatus(time) {
    if (!time) return { status: 'invalid', text: '--', color: 'gray' };
    
    const targetTime = this.parseTime(time);
    const now = dayjs();
    const diff = now.diff(targetTime, 'minute');
    
    if (diff < 5) return { status: 'new', text: '刚刚', color: 'green' };
    if (diff < 30) return { status: 'recent', text: `${diff}分钟前`, color: 'blue' };
    if (diff < 60) return { status: 'old', text: `${Math.floor(diff / 60)}小时前`, color: 'orange' };
    if (diff < 1440) return { status: 'very-old', text: `${Math.floor(diff / 1440)}天前`, color: 'red' };
    
    return { status: 'past', text: this.formatTime(time, 'YYYY-MM-DD'), color: 'gray' };
  }
}

/**
 * 时间格式化缓存工具类
 * 用于优化大量数据的时间格式化性能
 */
export class TimeCache {
  static cache = new Map();
  static maxSize = 1000; // 缓存最大条目数
  
  /**
   * 格式化时间并缓存结果
   * @param {string|Date} time - 时间
   * @param {string} format - 格式
   * @returns {string} 格式化后的时间
   */
  static format(time, format) {
    if (!time) return '';
    
    const key = `${time}_${format}`;
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // 缓存大小控制
    if (this.cache.size >= this.maxSize) {
      // 删除最早添加的缓存项
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    const formatted = TimeUtils.formatTime(time, format);
    this.cache.set(key, formatted);
    return formatted;
  }
  
  /**
   * 清除缓存
   */
  static clear() {
    this.cache.clear();
  }
  
  /**
   * 获取缓存大小
   * @returns {number} 缓存条目数
   */
  static getSize() {
    return this.cache.size;
  }
}

export default TimeUtils;
