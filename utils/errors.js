const logger = require('./logger');

/**
 * 应用错误基类
 * 统一错误处理机制
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;

    // 保持堆栈跟踪
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * 转换为JSON格式
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

/**
 * 业务错误类
 * 用于业务逻辑相关的错误
 */
class BusinessError extends AppError {
  constructor(message, errorCode = 'BUSINESS_ERROR', details = null) {
    super(message, 400, errorCode, details);
  }
}

/**
 * 验证错误类
 * 用于参数验证相关的错误
 */
class ValidationError extends AppError {
  constructor(message, validationErrors = [], errorCode = 'VALIDATION_ERROR') {
    super(message, 422, errorCode, validationErrors);
  }
}

/**
 * 认证错误类
 * 用于身份认证相关的错误
 */
class AuthenticationError extends AppError {
  constructor(message = '认证失败', errorCode = 'AUTHENTICATION_ERROR') {
    super(message, 401, errorCode);
  }
}

/**
 * 授权错误类
 * 用于权限授权相关的错误
 */
class AuthorizationError extends AppError {
  constructor(message = '权限不足', errorCode = 'AUTHORIZATION_ERROR') {
    super(message, 403, errorCode);
  }
}

/**
 * 资源未找到错误类
 */
class NotFoundError extends AppError {
  constructor(message = '资源未找到', errorCode = 'NOT_FOUND') {
    super(message, 404, errorCode);
  }
}

/**
 * 冲突错误类
 * 用于资源冲突相关的错误
 */
class ConflictError extends AppError {
  constructor(message = '资源冲突', errorCode = 'CONFLICT') {
    super(message, 409, errorCode);
  }
}

/**
 * 数据库错误类
 */
class DatabaseError extends AppError {
  constructor(message = '数据库操作失败', errorCode = 'DATABASE_ERROR', details = null) {
    super(message, 500, errorCode, details);
  }
}

/**
 * 外部服务错误类
 */
class ExternalServiceError extends AppError {
  constructor(message = '外部服务调用失败', errorCode = 'EXTERNAL_SERVICE_ERROR', details = null) {
    super(message, 502, errorCode, details);
  }
}

/**
 * 错误处理工具类
 */
class ErrorHandler {
  
  /**
   * 处理应用错误
   * @param {Error} error - 错误对象
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {Function} next - 下一个中间件
   */
  static handle(error, req, res, next) {
    let appError = error;

    // 如果不是AppError，转换为AppError
    if (!(error instanceof AppError)) {
      appError = new AppError(
        error.message || '服务器内部错误',
        500,
        'INTERNAL_ERROR',
        process.env.NODE_ENV === 'development' ? error.stack : null
      );
    }

    // 记录错误日志
    ErrorHandler.logError(appError, req);

    // 发送错误响应
    ErrorHandler.sendErrorResponse(appError, res);
  }

  /**
   * 记录错误日志
   * @param {AppError} error - 应用错误
   * @param {Object} req - 请求对象
   */
  static logError(error, req) {
    const logData = {
      error: error.toJSON(),
      request: {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        params: req.params,
        query: req.query,
        user: req.user ? { id: req.user.id, role: req.user.role } : null
      }
    };

    if (error.statusCode >= 500) {
      logger.error('服务器错误:', logData);
    } else {
      logger.warn('客户端错误:', logData);
    }
  }

  /**
   * 发送错误响应
   * @param {AppError} error - 应用错误
   * @param {Object} res - 响应对象
   */
  static sendErrorResponse(error, res) {
    const response = {
      success: false,
      message: error.message,
      error: error.errorCode,
      timestamp: error.timestamp
    };

    // 在开发环境下包含详细信息
    if (process.env.NODE_ENV === 'development') {
      response.details = error.details;
      response.stack = error.stack;
    }

    res.status(error.statusCode).json(response);
  }

  /**
   * 异步错误包装器
   * 用于包装异步路由处理函数
   * @param {Function} fn - 异步函数
   * @returns {Function} 包装后的函数
   */
  static asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * 创建业务错误
   * @param {string} message - 错误消息
   * @param {string} errorCode - 错误代码
   * @param {Object} details - 详细信息
   * @returns {BusinessError} 业务错误
   */
  static createBusinessError(message, errorCode = 'BUSINESS_ERROR', details = null) {
    return new BusinessError(message, errorCode, details);
  }

  /**
   * 创建验证错误
   * @param {string} message - 错误消息
   * @param {Array} validationErrors - 验证错误数组
   * @returns {ValidationError} 验证错误
   */
  static createValidationError(message, validationErrors = []) {
    return new ValidationError(message, validationErrors);
  }

  /**
   * 创建数据库错误
   * @param {Error} dbError - 数据库错误
   * @param {string} operation - 操作名称
   * @returns {DatabaseError} 数据库错误
   */
  static createDatabaseError(dbError, operation = '数据库操作') {
    const message = `${operation}失败: ${dbError.message}`;
    return new DatabaseError(message, 'DATABASE_ERROR', {
      operation,
      originalError: dbError.message
    });
  }
}

/**
 * 错误代码常量
 */
const ERROR_CODES = {
  // 业务错误
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_CONFIRMED: 'ORDER_ALREADY_CONFIRMED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  INVALID_DINING_TIME: 'INVALID_DINING_TIME',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  MENU_NOT_FOUND: 'MENU_NOT_FOUND',
  
  // 验证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // 认证授权错误
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  
  // 数据库错误
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  QUERY_FAILED: 'QUERY_FAILED',
  TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  
  // 外部服务错误
  REDIS_CONNECTION_FAILED: 'REDIS_CONNECTION_FAILED',
  EMAIL_SERVICE_FAILED: 'EMAIL_SERVICE_FAILED',
  SMS_SERVICE_FAILED: 'SMS_SERVICE_FAILED'
};

module.exports = {
  AppError,
  BusinessError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError,
  ErrorHandler,
  ERROR_CODES
};
