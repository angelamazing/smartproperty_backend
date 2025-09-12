const { validationResult } = require('express-validator');
const { ResponseHelper } = require('../utils/response');

/**
 * 验证中间件 - 检查请求参数验证结果
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return ResponseHelper.error(res, '参数验证失败', 400, {
      errors: errorMessages
    });
  }
  
  next();
};

/**
 * 自定义验证函数 - 检查是否为有效的UUID
 */
const isValidUUID = (value) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

/**
 * 自定义验证函数 - 检查是否为有效的手机号
 */
const isValidPhoneNumber = (value) => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(value);
};

/**
 * 自定义验证函数 - 检查是否为有效的邮箱
 */
const isValidEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

/**
 * 自定义验证函数 - 检查时间格式 HH:MM
 */
const isValidTime = (value) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(value);
};

/**
 * 自定义验证函数 - 检查日期格式 YYYY-MM-DD
 */
const isValidDate = (value) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) return false;
  
  const date = new Date(value);
  return date instanceof Date && !isNaN(date);
};

/**
 * 自定义验证函数 - 检查JSON格式
 */
const isValidJSON = (value) => {
  try {
    JSON.parse(value);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * 分页参数验证中间件
 */
const validatePagination = (req, res, next) => {
  const { page = 1, pageSize = 20 } = req.query;
  
  const pageNum = parseInt(page);
  const pageSizeNum = parseInt(pageSize);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return ResponseHelper.error(res, '页码必须是大于0的整数', 400);
  }
  
  if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
    return ResponseHelper.error(res, '每页数量必须是1-100之间的整数', 400);
  }
  
  req.pagination = {
    page: pageNum,
    pageSize: pageSizeNum
  };
  
  next();
};

/**
 * 文件上传验证中间件
 */
const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return ResponseHelper.error(res, '请选择要上传的文件', 400);
    }
    
    const file = req.file;
    
    // 检查文件类型
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
      return ResponseHelper.error(res, `不支持的文件类型，仅支持: ${allowedTypes.join(', ')}`, 400);
    }
    
    // 检查文件大小
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return ResponseHelper.error(res, `文件大小不能超过 ${maxSizeMB}MB`, 400);
    }
    
    next();
  };
};

/**
 * 批量操作验证中间件
 */
const validateBatchOperation = (maxItems = 100) => {
  return (req, res, next) => {
    const items = req.body;
    
    if (!Array.isArray(items)) {
      return ResponseHelper.error(res, '请求数据必须是数组格式', 400);
    }
    
    if (items.length === 0) {
      return ResponseHelper.error(res, '批量操作数据不能为空', 400);
    }
    
    if (items.length > maxItems) {
      return ResponseHelper.error(res, `批量操作数量不能超过 ${maxItems} 项`, 400);
    }
    
    next();
  };
};

/**
 * 时间范围验证中间件
 */
const validateTimeRange = (req, res, next) => {
  const { startTime, endTime } = req.body;
  
  if (startTime && endTime) {
    if (!isValidTime(startTime) || !isValidTime(endTime)) {
      return ResponseHelper.error(res, '时间格式无效，请使用 HH:MM 格式', 400);
    }
    
    // 将时间转换为分钟数进行比较
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    if (startMinutes >= endMinutes) {
      return ResponseHelper.error(res, '开始时间必须早于结束时间', 400);
    }
  }
  
  next();
};

/**
 * 日期范围验证中间件
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate && endDate) {
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return ResponseHelper.error(res, '日期格式无效，请使用 YYYY-MM-DD 格式', 400);
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start > end) {
      return ResponseHelper.error(res, '开始日期不能晚于结束日期', 400);
    }
    
    // 检查日期范围不能超过一年
    const oneYear = 365 * 24 * 60 * 60 * 1000;
    if (end - start > oneYear) {
      return ResponseHelper.error(res, '查询时间范围不能超过一年', 400);
    }
  }
  
  next();
};

/**
 * 预约时间验证中间件
 */
const validateReservationTime = (req, res, next) => {
  const { reservationDate, startTime, endTime } = req.body;
  
  if (!isValidDate(reservationDate)) {
    return ResponseHelper.error(res, '预约日期格式无效', 400);
  }
  
  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return ResponseHelper.error(res, '时间格式无效，请使用 HH:MM 格式', 400);
  }
  
  const reservationDateTime = new Date(`${reservationDate}T${startTime}:00`);
  const endDateTime = new Date(`${reservationDate}T${endTime}:00`);
  const now = new Date();
  
  // 检查预约时间不能是过去的时间
  if (reservationDateTime <= now) {
    return ResponseHelper.error(res, '预约时间不能是过去的时间', 400);
  }
  
  // 检查结束时间晚于开始时间
  if (endDateTime <= reservationDateTime) {
    return ResponseHelper.error(res, '结束时间必须晚于开始时间', 400);
  }
  
  // 检查预约时长不能超过最大限制（例如8小时）
  const maxDuration = 8 * 60 * 60 * 1000; // 8小时
  if (endDateTime - reservationDateTime > maxDuration) {
    return ResponseHelper.error(res, '单次预约时长不能超过8小时', 400);
  }
  
  next();
};

/**
 * 工具函数：将时间字符串转换为分钟数
 */
function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 密码强度验证
 */
const validatePasswordStrength = (password) => {
  // 至少6位，包含字母和数字
  const minLength = 6;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  if (password.length < minLength) {
    return '密码长度至少为6位';
  }
  
  if (!hasLetter || !hasNumber) {
    return '密码必须包含字母和数字';
  }
  
  return null; // 验证通过
};

/**
 * 用户输入安全验证中间件（防止XSS）
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // 移除潜在的HTML标签和脚本
        obj[key] = obj[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                           .replace(/<[^>]*>/g, '')
                           .trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };
  
  if (req.body) {
    sanitize(req.body);
  }
  
  if (req.query) {
    sanitize(req.query);
  }
  
  next();
};

/**
 * 通用请求验证中间件生成器
 * @param {Object} schema - Joi验证模式
 * @param {string} source - 验证源 ('body', 'query', 'params')
 */
const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });
    
    if (error) {
      const errorMessages = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      return ResponseHelper.error(res, '参数验证失败', 400, {
        errors: errorMessages
      });
    }
    
    // 将验证后的值重新赋值给请求对象
    req[source] = value;
    next();
  };
};

module.exports = {
  validate,
  validateRequest,
  validatePagination,
  validateFileUpload,
  validateBatchOperation,
  validateTimeRange,
  validateDateRange,
  validateReservationTime,
  validatePasswordStrength,
  sanitizeInput,
  
  // 验证函数
  isValidUUID,
  isValidPhoneNumber,
  isValidEmail,
  isValidTime,
  isValidDate,
  isValidJSON
};
