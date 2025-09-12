const logger = require('../utils/logger');

/**
 * 数据库性能监控中间件
 */
const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  
  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { method, path } = req;
    const statusCode = res.statusCode;
    
    // 记录慢查询（超过500ms的请求）
    if (duration > 500) {
      logger.warn(`慢查询检测: ${method} ${path} - ${statusCode} - ${duration}ms`);
    }
    
    // 记录所有请求的性能数据
    logger.info(`性能监控: ${method} ${path} - ${statusCode} - ${duration}ms`);
    
    // 如果响应时间过长，记录详细信息
    if (duration > 1000) {
      logger.error(`响应时间过长: ${method} ${path} - ${duration}ms - 状态码: ${statusCode}`);
    }
  });
  
  next();
};

/**
 * 数据库查询性能监控装饰器
 * @param {Function} fn - 要监控的函数
 * @param {string} operationName - 操作名称
 */
const monitorDatabaseOperation = (fn, operationName) => {
  return async (...args) => {
    const startTime = Date.now();
    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;
      
      // 记录数据库操作性能
      if (duration > 100) {
        logger.warn(`数据库操作较慢: ${operationName} - ${duration}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`数据库操作失败: ${operationName} - ${duration}ms - 错误: ${error.message}`);
      throw error;
    }
  };
};

/**
 * 缓存管理类
 */
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // 过期时间
    this.defaultTTL = 5 * 60 * 1000; // 默认5分钟
  }
  
  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（毫秒）
   */
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttl);
    
    // 清理过期缓存
    this.cleanup();
  }
  
  /**
   * 获取缓存
   * @param {string} key - 缓存键
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }
    
    const expireTime = this.ttl.get(key);
    if (Date.now() > expireTime) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }
  
  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }
  
  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    for (const [key, expireTime] of this.ttl.entries()) {
      if (now > expireTime) {
        this.cache.delete(key);
        this.ttl.delete(key);
      }
    }
  }
  
  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    this.ttl.clear();
  }
  
  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: process.memoryUsage()
    };
  }
}

// 创建全局缓存实例
const globalCache = new CacheManager();

/**
 * 缓存中间件
 * @param {string} key - 缓存键
 * @param {number} ttl - 过期时间（毫秒）
 */
const cacheMiddleware = (key, ttl = 5 * 60 * 1000) => {
  return async (req, res, next) => {
    // 生成缓存键
    const cacheKey = `${key}_${req.method}_${req.path}_${JSON.stringify(req.query)}`;
    
    // 尝试从缓存获取
    const cachedData = globalCache.get(cacheKey);
    if (cachedData) {
      logger.info(`缓存命中: ${cacheKey}`);
      return res.json(cachedData);
    }
    
    // 缓存未命中，继续处理
    const originalJson = res.json;
    res.json = function(data) {
      // 缓存响应数据
      globalCache.set(cacheKey, data, ttl);
      logger.info(`缓存设置: ${cacheKey}`);
      
      // 调用原始方法
      return originalJson.call(this, data);
    };
    
    next();
  };
};

module.exports = {
  performanceMonitor,
  monitorDatabaseOperation,
  globalCache,
  cacheMiddleware
};
