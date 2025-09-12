/**
 * 通用工具函数库
 * 提供常用的辅助功能
 */

const moment = require('moment');

/**
 * 生成UUID
 * @returns {string} UUID字符串
 */
function generateUUID() {
  return require('uuid').v4();
}

/**
 * 格式化日期
 * @param {Date|string} date - 日期对象或字符串
 * @param {string} format - 格式化模式，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'YYYY-MM-DD HH:mm:ss') {
  return moment(date).format(format);
}

/**
 * 获取当前时间戳
 * @returns {number} 时间戳
 */
function getCurrentTimestamp() {
  return Date.now();
}

/**
 * 生成随机字符串
 * @param {number} length - 字符串长度，默认8
 * @returns {string} 随机字符串
 */
function generateRandomString(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 验证手机号格式
 * @param {string} phone - 手机号
 * @returns {boolean} 是否有效
 */
function validatePhone(phone) {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱
 * @returns {boolean} 是否有效
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 深度克隆对象
 * @param {Object} obj - 要克隆的对象
 * @returns {Object} 克隆后的对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

/**
 * 安全的JSON解析
 * @param {string} jsonString - JSON字符串
 * @param {*} defaultValue - 解析失败时的默认值
 * @returns {*} 解析结果或默认值
 */
function safeJsonParse(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    return defaultValue;
  }
}

/**
 * 分页参数处理
 * @param {Object} query - 查询参数
 * @param {number} defaultPage - 默认页码
 * @param {number} defaultSize - 默认页大小
 * @param {number} maxSize - 最大页大小
 * @returns {Object} 处理后的分页参数
 */
function processPagination(query, defaultPage = 1, defaultSize = 20, maxSize = 100) {
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
 * 数组去重
 * @param {Array} array - 要去重的数组
 * @param {string} key - 对象数组的去重键
 * @returns {Array} 去重后的数组
 */
function uniqueArray(array, key = null) {
  if (!Array.isArray(array)) return [];
  
  if (key) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
  
  return [...new Set(array)];
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 生成订单号
 * @param {string} prefix - 前缀，默认 'ORD'
 * @returns {string} 订单号
 */
function generateOrderNumber(prefix = 'ORD') {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * 验证身份证号
 * @param {string} idCard - 身份证号
 * @returns {boolean} 是否有效
 */
function validateIdCard(idCard) {
  const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  return idCardRegex.test(idCard);
}

/**
 * 计算两个日期之间的天数差
 * @param {Date|string} date1 - 日期1
 * @param {Date|string} date2 - 日期2
 * @returns {number} 天数差
 */
function daysBetween(date1, date2) {
  const d1 = moment(date1).startOf('day');
  const d2 = moment(date2).startOf('day');
  return d2.diff(d1, 'days');
}

/**
 * 检查字符串是否为空或只包含空格
 * @param {string} str - 要检查的字符串
 * @returns {boolean} 是否为空
 */
function isEmptyString(str) {
  return !str || str.trim().length === 0;
}

/**
 * 生成验证码
 * @param {number} length - 验证码长度，默认6
 * @returns {string} 验证码
 */
function generateVerificationCode(length = 6) {
  return Math.random().toString().substr(2, length);
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间，默认300ms
 * @returns {Function} 防抖后的函数
 */
function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 限制时间，默认300ms
 * @returns {Function} 节流后的函数
 */
function throttle(func, limit = 300) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

module.exports = {
  generateUUID,
  formatDate,
  getCurrentTimestamp,
  generateRandomString,
  validatePhone,
  validateEmail,
  deepClone,
  safeJsonParse,
  processPagination,
  uniqueArray,
  formatFileSize,
  generateOrderNumber,
  validateIdCard,
  daysBetween,
  isEmptyString,
  generateVerificationCode,
  debounce,
  throttle
};
