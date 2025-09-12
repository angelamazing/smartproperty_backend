const moment = require('moment');
const logger = require('../utils/logger');
const { monitorDatabaseOperation } = require('../middleware/performance');

/**
 * 系统服务类
 */
class SystemService {
  /**
   * 获取今日统计数据
   * @param {Object} db - 数据库连接
   */
  async getTodayStats(db) {
    try {
      const today = moment().format('YYYY-MM-DD');
      
      // 获取今日报餐次数
      const [diningResult] = await monitorDatabaseOperation(
        () => db.execute(
          'SELECT COUNT(*) as count FROM dining_orders WHERE DATE(diningDate) = ? AND status != "cancelled"',
          [today]
        ),
        'getTodayStats_dining'
      )();
      
      // 获取今日预约次数
      const [reservationResult] = await monitorDatabaseOperation(
        () => db.execute(
          'SELECT COUNT(*) as count FROM reservations WHERE DATE(reservationDate) = ? AND status != "cancelled"',
          [today]
        ),
        'getTodayStats_reservation'
      )();
      
      // 获取今日验证次数
      const [verificationResult] = await monitorDatabaseOperation(
        () => db.execute(
          'SELECT COUNT(*) as count FROM dining_verifications WHERE DATE(verificationTime) = ? AND status = "verified"',
          [today]
        ),
        'getTodayStats_verification'
      )();
      
      // 获取今日菜单数量
      const [menuResult] = await monitorDatabaseOperation(
        () => db.execute(
          'SELECT COUNT(*) as count FROM menus WHERE DATE(publishDate) = ? AND publishStatus = "published"',
          [today]
        ),
        'getTodayStats_menu'
      )();
      
      return {
        diningCount: diningResult[0].count || 0,
        reservationCount: reservationResult[0].count || 0,
        verificationCount: verificationResult[0].count || 0,
        menuCount: menuResult[0].count || 0,
        date: today
      };
    } catch (error) {
      logger.error('获取今日统计数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取今日菜单
   * @param {Object} db - 数据库连接
   */
  async getTodayMenu(db) {
    try {
      const today = moment().format('YYYY-MM-DD');
      
      const [menuRows] = await db.execute(
        `SELECT m.*, 
                GROUP_CONCAT(d.name) as dishNames,
                GROUP_CONCAT(d.price) as dishPrices
         FROM menus m
         LEFT JOIN menu_dishes md ON m._id = md.menuId
         LEFT JOIN dishes d ON md.dishId = d._id
         WHERE DATE(m.publishDate) = ? AND m.publishStatus = 'published'
         GROUP BY m._id
         ORDER BY m.mealType`,
        [today]
      );
      
      if (menuRows.length === 0) {
        return {
          message: '今日暂无菜单',
          menus: []
        };
      }
      
      // 处理菜单数据
      const menus = menuRows.map(menu => ({
        _id: menu._id,
        mealType: menu.mealType,
        mealTime: this.getMealTime(menu.mealType),
        publishDate: menu.publishDate,
        dishes: this.parseDishes(menu.dishNames, menu.dishPrices),
        description: menu.description || '',
        capacity: menu.capacity || 0,
        currentOrders: menu.currentOrders || 0
      }));
      
      return {
        date: today,
        menus: menus
      };
    } catch (error) {
      logger.error('获取今日菜单失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取最近活动
   * @param {Object} db - 数据库连接
   * @param {number} limit - 限制数量
   */
  async getRecentActivities(db, limit = 10) {
    try {
      // 确保limit是数字类型
      const limitNum = parseInt(limit) || 10;
      
      // 获取最近的报餐活动
      const [diningActivities] = await db.execute(
        `SELECT 'dining' as type, 
                do.diningDate as date,
                do.mealType,
                u.nickName as userName,
                do.status,
                '报餐' as action
         FROM dining_orders do
         JOIN users u ON do.registrantId = u._id
         WHERE do.createTime > DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY do.createTime DESC
         LIMIT ${limitNum}`
      );
      
      // 获取最近的预约活动
      const [reservationActivities] = await db.execute(
        `SELECT 'reservation' as type,
                r.reservationDate as date,
                r.venueName,
                u.nickName as userName,
                r.status,
                '场地预约' as action
         FROM reservations r
         JOIN users u ON r.userId = u._id
         WHERE r.createTime > DATE_SUB(NOW(), INTERVAL 7 DAY)
         ORDER BY r.createTime DESC
         LIMIT ${limitNum}`
      );
      
      // 合并并排序活动
      const allActivities = [...diningActivities, ...reservationActivities]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limitNum);
      
      return allActivities;
    } catch (error) {
      logger.error('获取最近活动失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取系统公告
   * @param {Object} db - 数据库连接
   */
  async getSystemNotice(db) {
    try {
      // 获取最新的系统公告
      const [noticeRows] = await db.execute(
        `SELECT * FROM system_notices 
         WHERE status = 'active' AND publishTime <= NOW()
         ORDER BY publishTime DESC
         LIMIT 1`
      );
      
      if (noticeRows.length === 0) {
        return {
          content: '系统运行正常，暂无重要公告',
          time: new Date().toISOString(),
          type: 'info'
        };
      }
      
      const notice = noticeRows[0];
      return {
        content: notice.content,
        time: notice.publishTime,
        type: notice.type || 'info',
        title: notice.title || '系统公告'
      };
    } catch (error) {
      logger.error('获取系统公告失败:', error);
      // 如果表不存在，返回默认公告
      return {
        content: '系统运行正常',
        time: new Date().toISOString(),
        type: 'info'
      };
    }
  }
  
  /**
   * 获取餐次时间
   * @param {string} mealType - 餐次类型
   */
  getMealTime(mealType) {
    const mealTimes = {
      'breakfast': '07:00-09:00',
      'lunch': '11:30-13:00',
      'dinner': '17:30-19:00'
    };
    return mealTimes[mealType] || '待定';
  }
  
  /**
   * 解析菜品信息
   * @param {string} dishNames - 菜品名称（逗号分隔）
   * @param {string} dishPrices - 菜品价格（逗号分隔）
   */
  parseDishes(dishNames, dishPrices) {
    if (!dishNames || !dishPrices) {
      return [];
    }
    
    const names = dishNames.split(',');
    const prices = dishPrices.split(',');
    
    return names.map((name, index) => ({
      name: name.trim(),
      price: parseFloat(prices[index]) || 0
    }));
  }
  
  /**
   * 批量更新菜单状态（使用事务）
   * @param {Object} db - 数据库连接
   * @param {Array} menuIds - 菜单ID数组
   * @param {string} newStatus - 新状态
   * @param {string} userId - 操作人ID
   */
  async batchUpdateMenuStatus(db, menuIds, newStatus, userId) {
    let connection;
    try {
      // 获取独立连接用于事务
      connection = await db.getConnection();
      await connection.beginTransaction();
      
      logger.info('开始批量更新菜单状态', {
        menuIds,
        newStatus,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 批量更新菜单状态
      const updateMenuSql = `
        UPDATE menus 
        SET publishStatus = ?, updateTime = NOW(), updateBy = ?
        WHERE _id IN (${menuIds.map(() => '?').join(',')})
      `;
      
      const [menuResult] = await connection.execute(
        updateMenuSql,
        [newStatus, userId, ...menuIds]
      );
      
      // 记录操作日志
      const logSql = `
        INSERT INTO activity_logs (_id, userId, action, resourceType, resourceId, details, ipAddress, createTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      for (const menuId of menuIds) {
        const logId = require('uuid').v4();
        await connection.execute(logSql, [
          logId,
          userId,
          'batch_update_menu_status',
          'menus',
          menuId,
          JSON.stringify({ oldStatus: 'published', newStatus }),
          '127.0.0.1' // 实际应该从请求中获取
        ]);
      }
      
      // 提交事务
      await connection.commit();
      
      logger.info('批量更新菜单状态成功', {
        updatedCount: menuResult.affectedRows,
        menuIds,
        newStatus,
        userId
      });
      
      return {
        success: true,
        updatedCount: menuResult.affectedRows,
        message: `成功更新 ${menuResult.affectedRows} 个菜单状态`
      };
      
    } catch (error) {
      // 回滚事务
      if (connection) {
        await connection.rollback();
      }
      
      logger.error('批量更新菜单状态失败:', {
        error: error.message,
        menuIds,
        newStatus,
        userId,
        stack: error.stack
      });
      
      throw new Error(`批量更新菜单状态失败: ${error.message}`);
      
    } finally {
      // 释放连接
      if (connection) {
        connection.release();
      }
    }
  }
  
  /**
   * 创建菜单（使用事务）
   * @param {Object} db - 数据库连接
   * @param {Object} menuData - 菜单数据
   * @param {Array} dishIds - 菜品ID数组
   * @param {string} userId - 创建人ID
   */
  async createMenuWithDishes(db, menuData, dishIds, userId) {
    let connection;
    try {
      // 获取独立连接用于事务
      connection = await db.getConnection();
      await connection.beginTransaction();
      
      logger.info('开始创建菜单', {
        menuData: { ...menuData, dishIds },
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 创建菜单
      const menuId = require('uuid').v4();
      const createMenuSql = `
        INSERT INTO menus (_id, publishDate, mealType, mealTime, publishStatus, publisherId, capacity, createTime, updateTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      await connection.execute(createMenuSql, [
        menuId,
        menuData.publishDate,
        menuData.mealType,
        menuData.mealTime,
        menuData.publishStatus || 'draft',
        userId,
        menuData.capacity || 0
      ]);
      
      // 创建菜单菜品关联
      if (dishIds && dishIds.length > 0) {
        const createMenuDishSql = `
          INSERT INTO menu_dishes (_id, menuId, dishId, price, sort, createTime)
          VALUES (?, ?, ?, ?, ?, NOW())
        `;
        
        for (let i = 0; i < dishIds.length; i++) {
          const menuDishId = require('uuid').v4();
          await connection.execute(createMenuDishSql, [
            menuDishId,
            menuId,
            dishIds[i],
            menuData.dishPrices?.[i] || 0,
            i + 1
          ]);
        }
      }
      
      // 记录操作日志
      const logId = require('uuid').v4();
      const logSql = `
        INSERT INTO activity_logs (_id, userId, action, resourceType, resourceId, details, ipAddress, createTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      await connection.execute(logSql, [
        logId,
        userId,
        'create_menu',
        'menus',
        menuId,
        JSON.stringify({ menuData, dishIds }),
        '127.0.0.1'
      ]);
      
      // 提交事务
      await connection.commit();
      
      logger.info('创建菜单成功', {
        menuId,
        dishCount: dishIds?.length || 0,
        userId
      });
      
      return {
        success: true,
        menuId,
        message: '菜单创建成功'
      };
      
    } catch (error) {
      // 回滚事务
      if (connection) {
        await connection.rollback();
      }
      
      logger.error('创建菜单失败:', {
        error: error.message,
        menuData,
        dishIds,
        userId,
        stack: error.stack
      });
      
      throw new Error(`创建菜单失败: ${error.message}`);
      
    } finally {
      // 释放连接
      if (connection) {
        connection.release();
      }
    }
  }
}

module.exports = new SystemService();
