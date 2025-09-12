const logger = require('./logger');

/**
 * 事务装饰器 - 统一事务处理逻辑
 * 自动处理数据库事务的开始、提交和回滚
 */
class TransactionDecorator {
  
  /**
   * 执行带事务的操作
   * @param {Function} operation - 需要事务的操作函数
   * @param {Object} db - 数据库连接池
   * @param {string} operationName - 操作名称（用于日志）
   * @returns {Promise} 操作结果
   */
  static async executeWithTransaction(operation, db, operationName = 'Unknown') {
    let connection;
    try {
      // 获取数据库连接
      connection = await db.getConnection();
      
      // 开始事务
      await connection.beginTransaction();
      logger.info(`开始事务: ${operationName}`);
      
      // 执行操作
      const result = await operation(connection);
      
      // 提交事务
      await connection.commit();
      logger.info(`事务提交成功: ${operationName}`);
      
      return result;
    } catch (error) {
      // 回滚事务
      if (connection) {
        await connection.rollback();
        logger.error(`事务回滚: ${operationName}`, error);
      }
      throw error;
    } finally {
      // 释放连接
      if (connection) {
        connection.release();
        logger.debug(`数据库连接已释放: ${operationName}`);
      }
    }
  }

  /**
   * 创建事务中间件
   * 将数据库连接注入到请求对象中
   * @param {Object} db - 数据库连接池
   * @returns {Function} Express中间件
   */
  static createTransactionMiddleware(db) {
    return async (req, res, next) => {
      try {
        // 将数据库连接池注入到请求对象
        req.db = db;
        next();
      } catch (error) {
        logger.error('事务中间件错误:', error);
        return res.status(500).json({
          success: false,
          message: '数据库连接失败',
          error: 'DATABASE_CONNECTION_ERROR'
        });
      }
    };
  }

  /**
   * 包装服务方法，自动添加事务支持
   * @param {Function} serviceMethod - 服务方法
   * @param {string} methodName - 方法名称
   * @returns {Function} 包装后的方法
   */
  static wrapServiceMethod(serviceMethod, methodName) {
    return async function(...args) {
      // 最后一个参数应该是数据库连接
      const db = args[args.length - 1];
      
      return await TransactionDecorator.executeWithTransaction(
        async (connection) => {
          // 将连接替换为事务连接
          const newArgs = [...args];
          newArgs[newArgs.length - 1] = connection;
          
          return await serviceMethod.apply(this, newArgs);
        },
        db,
        methodName
      );
    };
  }

  /**
   * 批量包装服务方法
   * @param {Object} service - 服务对象
   * @param {Array} methodNames - 需要包装的方法名称数组
   * @returns {Object} 包装后的服务对象
   */
  static wrapServiceMethods(service, methodNames) {
    const wrappedService = { ...service };
    
    methodNames.forEach(methodName => {
      if (typeof service[methodName] === 'function') {
        wrappedService[methodName] = TransactionDecorator.wrapServiceMethod(
          service[methodName],
          methodName
        );
      }
    });
    
    return wrappedService;
  }
}

/**
 * 事务装饰器工厂函数
 * 简化事务装饰器的使用
 */
const withTransaction = (operationName) => {
  return (target, propertyName, descriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args) {
      const db = args[args.length - 1];
      
      return await TransactionDecorator.executeWithTransaction(
        async (connection) => {
          const newArgs = [...args];
          newArgs[newArgs.length - 1] = connection;
          return await originalMethod.apply(this, newArgs);
        },
        db,
        `${target.constructor.name}.${propertyName}`
      );
    };
    
    return descriptor;
  };
};

module.exports = {
  TransactionDecorator,
  withTransaction
};
