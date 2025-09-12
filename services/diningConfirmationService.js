const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const TimeUtils = require('../utils/timeUtils');
const logger = require('../utils/logger');

/**
 * 就餐确认服务类
 * 处理报餐后的确认就餐相关业务逻辑
 */
class DiningConfirmationService {
  
  /**
   * 手动确认就餐（用户自己确认）
   * @param {string} userId - 用户ID
   * @param {string} orderId - 订单ID
   * @param {string} confirmationType - 确认类型：manual/qr/admin
   * @param {Object} db - 数据库连接
   */
  async confirmDiningManually(userId, orderId, confirmationType = 'manual', db) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // 1. 验证订单是否存在且用户有权限操作（登记人或成员）
      const [orderRows] = await connection.execute(
        `SELECT do._id, do.registrantId, do.diningDate, do.mealType, do.status, do.diningStatus,
                do.memberIds, do.memberNames, do.registrantName,
                u.nickName as userName
         FROM dining_orders do
         LEFT JOIN users u ON do.registrantId = u._id
         WHERE do._id = ?`,
        [orderId]
      );

      if (orderRows.length === 0) {
        throw new Error('订单不存在');
      }

      const order = orderRows[0];
      
      // 检查用户权限：必须是登记人或成员
      const isRegistrant = order.registrantId === userId;
      
      // 处理memberIds数据格式（可能是JSON数组或逗号分隔字符串）
      let memberIds = [];
      try {
        if (typeof order.memberIds === 'string') {
          // 尝试解析为JSON
          memberIds = JSON.parse(order.memberIds);
        } else if (Array.isArray(order.memberIds)) {
          memberIds = order.memberIds;
        } else if (order.memberIds && order.memberIds.includes(',')) {
          // 如果是逗号分隔的字符串，转换为数组
          memberIds = order.memberIds.split(',').map(id => id.trim());
        }
      } catch (e) {
        // 如果JSON解析失败，尝试按逗号分割
        if (order.memberIds && order.memberIds.includes(',')) {
          memberIds = order.memberIds.split(',').map(id => id.trim());
        }
      }
      
      const isMember = memberIds.includes(userId);
      
      if (!isRegistrant && !isMember) {
        throw new Error('订单不存在或无权操作');
      }

      // 2. 检查订单状态
      if (order.status === 'cancelled') {
        throw new Error('订单已取消，无法确认就餐');
      }

      if (order.diningStatus === 'dined') {
        throw new Error('该订单已确认就餐');
      }

      // 3. 检查确认时间是否合理（不能提前太多确认）
      const diningDate = moment(order.diningDate).tz('Asia/Shanghai');
      const now = TimeUtils.getBeijingTime();  // 使用统一的时间工具类
      
      // 如果是当天，检查是否在合理时间范围内
      if (diningDate.isSame(now, 'day')) {
        const mealType = order.mealType;
        
        // 使用统一的时间验证方法
        if (!TimeUtils.isInDiningTime(mealType, now)) {
          throw new Error(`当前时间不在${TimeUtils.getMealTypeName(mealType)}就餐时间内`);
        }
      }

      // 4. 更新订单状态
      const utcActualDiningTime = now.utc().toDate();  // 转换为UTC时间存储
      
      await connection.execute(
        `UPDATE dining_orders 
         SET diningStatus = 'dined', 
             actualDiningTime = ?,
             updateTime = NOW()
         WHERE _id = ?`,
        [utcActualDiningTime, orderId]
      );

      // 5. 记录确认就餐日志
      const logId = uuidv4();
      // 获取当前用户信息
      const [currentUserRows] = await connection.execute(
        'SELECT nickName FROM users WHERE _id = ?',
        [userId]
      );
      const currentUserName = currentUserRows.length > 0 ? currentUserRows[0].nickName : '未知用户';
      
      await connection.execute(
        `INSERT INTO dining_confirmation_logs 
         (_id, orderId, userId, userName, confirmationType, confirmationTime, remark)
         VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
        [logId, orderId, userId, currentUserName, confirmationType, '用户手动确认就餐']
      );

      await connection.commit();

      logger.info(`用户 ${userId} 手动确认就餐成功: 订单 ${orderId}`);

      return {
        orderId,
        confirmationType,
        actualDiningTime: TimeUtils.toISOString(utcActualDiningTime),
        message: '确认就餐成功'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('手动确认就餐失败:', error);
      throw error;
    } finally {
      if (connection) {
        // 检查connection是否有release方法
        if (typeof connection.release === 'function') {
          connection.release();
        } else if (typeof connection.end === 'function') {
          // 如果是直接连接，使用end方法
          await connection.end();
        }
      }
    }
  }

  /**
   * 管理员代确认就餐
   * @param {string} adminId - 管理员ID
   * @param {string} orderId - 订单ID
   * @param {string} remark - 备注
   * @param {Object} db - 数据库连接
   */
  async confirmDiningByAdmin(adminId, orderId, remark, db) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // 1. 验证订单是否存在
      const [orderRows] = await connection.execute(
        `SELECT do._id, do.userId, do.diningDate, do.mealType, do.status, do.diningStatus,
                u.nickName as userName
         FROM dining_orders do
         LEFT JOIN users u ON do.userId = u._id
         WHERE do._id = ?`,
        [orderId]
      );

      if (orderRows.length === 0) {
        throw new Error('订单不存在');
      }

      const order = orderRows[0];

      // 2. 检查订单状态
      if (order.status === 'cancelled') {
        throw new Error('订单已取消，无法确认就餐');
      }

      if (order.diningStatus === 'dined') {
        throw new Error('该订单已确认就餐');
      }

      // 3. 更新订单状态
      const now = TimeUtils.getBeijingTime();
      const utcActualDiningTime = now.utc().toDate();  // 转换为UTC时间存储
      
      await connection.execute(
        `UPDATE dining_orders 
         SET diningStatus = 'dined', 
             actualDiningTime = ?,
             updateTime = NOW()
         WHERE _id = ?`,
        [utcActualDiningTime, orderId]
      );

      // 4. 记录确认就餐日志
      const logId = uuidv4();
      await connection.execute(
        `INSERT INTO dining_confirmation_logs 
         (_id, orderId, userId, userName, confirmationType, confirmationTime, remark, confirmedBy)
         VALUES (?, ?, ?, ?, 'admin', NOW(), ?, ?)`,
        [logId, orderId, order.userId, order.userName, remark || '管理员代确认就餐', adminId]
      );

      await connection.commit();

      logger.info(`管理员 ${adminId} 代确认就餐成功: 订单 ${orderId}`);

      return {
        orderId,
        confirmationType: 'admin',
        actualDiningTime: TimeUtils.toISOString(utcActualDiningTime),
        confirmedBy: adminId,
        message: '管理员代确认就餐成功'
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('管理员代确认就餐失败:', error);
      throw error;
    } finally {
      if (connection) {
        // 检查connection是否有release方法
        if (typeof connection.release === 'function') {
          connection.release();
        } else if (typeof connection.end === 'function') {
          // 如果是直接连接，使用end方法
          await connection.end();
        }
      }
    }
  }

  /**
   * 批量确认就餐（管理员功能）
   * @param {string} adminId - 管理员ID
   * @param {Array} orderIds - 订单ID数组
   * @param {string} remark - 备注
   * @param {Object} db - 数据库连接
   */
  async batchConfirmDining(adminId, orderIds, remark, db) {
    const results = {
      successCount: 0,
      totalCount: orderIds.length,
      errors: []
    };

    for (const orderId of orderIds) {
      try {
        await this.confirmDiningByAdmin(adminId, orderId, remark, db);
        results.successCount++;
      } catch (error) {
        results.errors.push({
          orderId,
          error: error.message
        });
      }
    }

    logger.info(`管理员 ${adminId} 批量确认就餐完成: 成功 ${results.successCount}/${results.totalCount}`);

    return results;
  }

  /**
   * 获取用户就餐确认状态
   * @param {string} userId - 用户ID
   * @param {string} date - 查询日期 (YYYY-MM-DD)
   * @param {Object} db - 数据库连接
   */
  async getUserDiningConfirmationStatus(userId, date, db) {
    try {
      const queryDate = date || moment().tz('Asia/Shanghai').format('YYYY-MM-DD');
      
      // 获取用户基本信息
      const [userRows] = await db.execute(
        'SELECT _id, nickName, department FROM users WHERE _id = ?',
        [userId]
      );
      
      if (userRows.length === 0) {
        throw new Error('用户不存在');
      }
      
      const user = userRows[0];
      
      // 获取用户当天的报餐记录及确认状态
      // 需要检查两种情况：1. registrantId字段匹配 2. memberIds字段包含该用户
      const [orderRows] = await db.execute(
        `SELECT 
          do._id as orderId,
          do.mealType,
          do.status,
          do.diningStatus,
          do.actualDiningTime,
          do.createTime as registerTime,
          do.remark,
          do.memberIds
        FROM dining_orders do
        WHERE do.diningDate = ? 
        AND (do.registrantId = ? OR JSON_CONTAINS(do.memberIds, JSON_QUOTE(?)))
        AND do.status != 'cancelled'
        ORDER BY do.mealType, do.createTime DESC`,
        [queryDate, userId, userId]
      );
      
      // 构建餐次确认状态
      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      const mealConfirmationStatus = {};
      
      // 初始化所有餐次状态
      mealTypes.forEach(mealType => {
        mealConfirmationStatus[mealType] = {
          isRegistered: false,
          orderId: null,
          status: null,
          diningStatus: null,
          statusText: '未报餐',
          confirmationText: '未确认',
          actualDiningTime: null,
          registerTime: null,
          remark: null
        };
      });
      
      // 处理报餐记录 - 按餐次分组，每个餐次只取最新的记录
      const mealOrders = {};
      orderRows.forEach(order => {
        const mealType = order.mealType;
        if (!mealOrders[mealType] || new Date(order.registerTime) > new Date(mealOrders[mealType].registerTime)) {
          mealOrders[mealType] = order;
        }
      });
      
      // 更新确认状态
      Object.keys(mealOrders).forEach(mealType => {
        const order = mealOrders[mealType];
        const statusMap = {
          'pending': '待确认',
          'confirmed': '已确认',
          'completed': '已完成',
          'cancelled': '已取消'
        };
        
        const diningStatusMap = {
          'ordered': '已报餐',
          'dined': '已就餐',
          'cancelled': '已取消'
        };
        
        mealConfirmationStatus[mealType] = {
          isRegistered: true,
          orderId: order.orderId,
          status: order.status,
          diningStatus: order.diningStatus,
          statusText: statusMap[order.status] || '未知状态',
          confirmationText: diningStatusMap[order.diningStatus] || '未确认',
          actualDiningTime: order.actualDiningTime ? TimeUtils.toISOString(order.actualDiningTime) : null,
          registerTime: order.registerTime ? TimeUtils.toISOString(order.registerTime) : null,
          remark: order.remark
        };
      });
      
      // 计算汇总统计
      const summary = {
        totalRegistered: Object.values(mealConfirmationStatus).filter(status => status.isRegistered).length,
        totalConfirmed: Object.values(mealConfirmationStatus).filter(status => status.diningStatus === 'dined').length,
        pendingConfirmation: Object.values(mealConfirmationStatus).filter(status => 
          status.isRegistered && status.diningStatus === 'ordered'
        ).length,
        unregisteredCount: Object.values(mealConfirmationStatus).filter(status => !status.isRegistered).length
      };
      
      return {
        userId: user._id,
        userName: user.nickName,
        department: user.department,
        queryDate: queryDate,
        mealConfirmationStatus,
        summary
      };
      
    } catch (error) {
      logger.error('获取用户就餐确认状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取就餐确认历史记录
   * @param {string} userId - 用户ID
   * @param {Object} filters - 筛选条件
   * @param {number} page - 页码
   * @param {number} pageSize - 每页大小
   * @param {Object} db - 数据库连接
   */
  async getDiningConfirmationHistory(userId, filters, page, pageSize, db) {
    try {
      // 基础查询条件 - 检查用户是登记人或成员
      let whereClause = 'WHERE (do.registrantId = ? OR JSON_CONTAINS(do.memberIds, JSON_QUOTE(?)))';
      let whereValues = [userId, userId];
      
      // 构建筛选条件
      if (filters.date && filters.date.trim() !== '') {
        whereClause += ' AND do.diningDate = ?';
        whereValues.push(filters.date);
      } else if (filters.startDate && filters.endDate && 
                 filters.startDate.trim() !== '' && filters.endDate.trim() !== '') {
        whereClause += ' AND do.diningDate BETWEEN ? AND ?';
        whereValues.push(filters.startDate, filters.endDate);
      }
      
      if (filters.diningStatus && filters.diningStatus.trim() !== '') {
        whereClause += ' AND do.diningStatus = ?';
        whereValues.push(filters.diningStatus);
      }
      
      // 查询总数
      const countSql = `SELECT COUNT(*) as total FROM dining_orders do ${whereClause}`;
      const [countResult] = await db.execute(countSql, whereValues);
      const total = countResult[0].total;
      
      // 查询记录列表
      const offset = (page - 1) * pageSize;
      const listSql = `
        SELECT 
          do._id as orderId,
          do.diningDate,
          do.mealType,
          do.status,
          do.diningStatus,
          do.actualDiningTime,
          do.createTime as registerTime,
          do.remark,
          dcl.confirmationType,
          dcl.confirmationTime,
          dcl.confirmedBy
        FROM dining_orders do
        LEFT JOIN dining_confirmation_logs dcl ON do._id = dcl.orderId
        ${whereClause}
        ORDER BY do.createTime DESC
        LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}
      `;
      
      const [records] = await db.execute(listSql, whereValues);
      
      // 处理记录数据
      const processedRecords = records.map(record => ({
        orderId: record.orderId,
        diningDate: record.diningDate,
        mealType: record.mealType,
        mealTypeName: this.getMealTypeName(record.mealType),
        status: record.status,
        diningStatus: record.diningStatus,
        statusText: this.getStatusText(record.status),
        confirmationText: this.getDiningStatusText(record.diningStatus),
        actualDiningTime: record.actualDiningTime ? TimeUtils.toISOString(record.actualDiningTime) : null,
        registerTime: record.registerTime ? TimeUtils.toISOString(record.registerTime) : null,
        remark: record.remark,
        confirmationType: record.confirmationType,
        confirmationTime: record.confirmationTime,
        confirmedBy: record.confirmedBy
      }));
      
      return {
        records: processedRecords,
        total,
        page,
        pageSize,
        hasMore: (page * pageSize) < total
      };
    } catch (error) {
      logger.error('获取就餐确认历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取部门就餐确认统计（管理员功能）
   * @param {string} date - 查询日期
   * @param {string} departmentId - 部门ID（可选）
   * @param {Object} db - 数据库连接
   */
  async getDepartmentDiningConfirmationStats(date, departmentId, db) {
    try {
      const queryDate = date || moment().tz('Asia/Shanghai').format('YYYY-MM-DD');
      
      let whereClause = 'WHERE do.diningDate = ? AND do.status != "cancelled"';
      let whereValues = [queryDate];
      
      if (departmentId) {
        whereClause += ' AND do.deptId = ?';
        whereValues.push(departmentId);
      }
      
      // 按餐次统计
      const [mealStats] = await db.execute(
        `SELECT 
          do.mealType,
          COUNT(*) as totalOrders,
          SUM(CASE WHEN do.diningStatus = 'ordered' THEN 1 ELSE 0 END) as pendingConfirmation,
          SUM(CASE WHEN do.diningStatus = 'dined' THEN 1 ELSE 0 END) as confirmedDining,
          SUM(CASE WHEN do.diningStatus = 'cancelled' THEN 1 ELSE 0 END) as cancelledOrders
        FROM dining_orders do
        ${whereClause}
        GROUP BY do.mealType
        ORDER BY do.mealType`,
        whereValues
      );
      
      // 按部门统计
      const [deptStats] = await db.execute(
        `SELECT 
          do.deptName,
          COUNT(*) as totalOrders,
          SUM(CASE WHEN do.diningStatus = 'ordered' THEN 1 ELSE 0 END) as pendingConfirmation,
          SUM(CASE WHEN do.diningStatus = 'dined' THEN 1 ELSE 0 END) as confirmedDining,
          SUM(CASE WHEN do.diningStatus = 'cancelled' THEN 1 ELSE 0 END) as cancelledOrders
        FROM dining_orders do
        ${whereClause}
        GROUP BY do.deptName
        ORDER BY do.deptName`,
        whereValues
      );
      
      // 总体统计
      const [totalStats] = await db.execute(
        `SELECT 
          COUNT(*) as totalOrders,
          SUM(CASE WHEN do.diningStatus = 'ordered' THEN 1 ELSE 0 END) as pendingConfirmation,
          SUM(CASE WHEN do.diningStatus = 'dined' THEN 1 ELSE 0 END) as confirmedDining,
          SUM(CASE WHEN do.diningStatus = 'cancelled' THEN 1 ELSE 0 END) as cancelledOrders
        FROM dining_orders do
        ${whereClause}`,
        whereValues
      );
      
      return {
        queryDate,
        totalStats: totalStats[0],
        mealStats: mealStats.map(stat => ({
          ...stat,
          mealTypeName: this.getMealTypeName(stat.mealType)
        })),
        departmentStats: deptStats
      };
    } catch (error) {
      logger.error('获取部门就餐确认统计失败:', error);
      throw error;
    }
  }

  // ==================== 私有方法 ====================
  
  /**
   * 获取餐次类型中文名称
   * @param {string} mealType - 餐次类型
   */
  getMealTypeName(mealType) {
    const mealTypeMap = {
      'breakfast': '早餐',
      'lunch': '午餐',
      'dinner': '晚餐'
    };
    return mealTypeMap[mealType] || mealType;
  }

  /**
   * 获取状态中文名称
   * @param {string} status - 状态
   */
  getStatusText(status) {
    const statusMap = {
      'pending': '待确认',
      'confirmed': '已确认',
      'completed': '已完成',
      'cancelled': '已取消'
    };
    return statusMap[status] || '未知状态';
  }

  /**
   * 获取就餐状态中文名称
   * @param {string} diningStatus - 就餐状态
   */
  getDiningStatusText(diningStatus) {
    const diningStatusMap = {
      'ordered': '已报餐',
      'dined': '已就餐',
      'cancelled': '已取消'
    };
    return diningStatusMap[diningStatus] || '未确认';
  }
}

module.exports = new DiningConfirmationService();
