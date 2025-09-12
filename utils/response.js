/**
 * 统一响应格式工具类
 */

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {number} statusCode - HTTP状态码
 */
const success = (res, data = null, message = '操作成功', statusCode = 200) => {
  const response = {
    success: true,
    message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * 失败响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {string|Object} error - 错误详情
 * @param {number} statusCode - HTTP状态码
 */
const error = (res, message = '操作失败', error = null, statusCode = 400) => {
  const response = {
    success: false,
    message
  };
  
  if (error !== null) {
    response.error = error;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * 分页响应
 * @param {Object} res - Express响应对象
 * @param {Array} records - 记录列表
 * @param {number} total - 总记录数
 * @param {number} page - 当前页码
 * @param {number} pageSize - 每页大小
 * @param {string} message - 响应消息
 */
const pagination = (res, records, total, page, pageSize, message = '查询成功') => {
  const hasMore = (page * pageSize) < total;
  
  return res.json({
    success: true,
    message,
    data: {
      records,
      total,
      page,
      pageSize,
      hasMore,
      totalPages: Math.ceil(total / pageSize)
    }
  });
};

/**
 * 认证失败响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const unauthorized = (res, message = '用户未登录或Token无效') => {
  return res.status(401).json({
    success: false,
    message,
    error: 'Unauthorized'
  });
};

/**
 * 权限不足响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const forbidden = (res, message = '权限不足') => {
  return res.status(403).json({
    success: false,
    message,
    error: 'Forbidden'
  });
};

/**
 * 资源不存在响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
const notFound = (res, message = '资源不存在') => {
  return res.status(404).json({
    success: false,
    message,
    error: 'Not Found'
  });
};

/**
 * 服务器错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {string|Object} error - 错误详情
 */
const serverError = (res, message = '服务器内部错误', error = null) => {
  return res.status(500).json({
    success: false,
    message,
    error: error || 'Internal Server Error'
  });
};

/**
 * 参数验证错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {Object} validationErrors - 验证错误详情
 */
const validationError = (res, message = '参数验证失败', validationErrors = null) => {
  return res.status(422).json({
    success: false,
    message,
    error: 'Validation Error',
    validationErrors
  });
};

/**
 * 响应助手类 - 提供统一的响应格式
 */
class ResponseHelper {
  /**
   * 成功响应
   * @param {Object} res - Express响应对象
   * @param {*} data - 响应数据
   * @param {string} message - 响应消息
   * @param {number} code - 响应码
   */
  static success(res, data = null, message = '操作成功', code = 200) {
    const response = {
      success: true,
      message,
      code: code.toString(),
      timestamp: new Date().toISOString()
    };
    
    if (data !== null) {
      response.data = data;
    }
    
    return res.status(code).json(response);
  }

  /**
   * 错误响应
   * @param {Object} res - Express响应对象
   * @param {string} message - 错误消息
   * @param {number} code - 错误码
   * @param {*} error - 错误详情
   */
  static error(res, message = '操作失败', code = 400, error = null) {
    const response = {
      success: false,
      message,
      code: code.toString(),
      timestamp: new Date().toISOString()
    };
    
    if (error !== null) {
      response.error = error;
    }
    
    return res.status(code).json(response);
  }

  /**
   * 分页响应
   * @param {Object} res - Express响应对象
   * @param {Object} data - 分页数据对象
   * @param {string} message - 响应消息
   */
  static paginated(res, data, message = '查询成功') {
    return this.success(res, data, message);
  }
}

module.exports = {
  success,
  error,
  pagination,
  unauthorized,
  forbidden,
  notFound,
  serverError,
  validationError,
  ResponseHelper
};
