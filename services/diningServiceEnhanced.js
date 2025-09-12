const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const TimeUtils = require('../utils/timeUtils');
const logger = require('../utils/logger');

/**
 * 增强版报餐服务类
 * 支持部门级别的权限控制和报餐管理
 */
class DiningServiceEnhanced {
  /**
   * 获取菜单信息
   * @param {string} date - 日期 (YYYY-MM-DD)
   * @param {string} mealType - 餐次类型
   * @param {Object} db - 数据库连接
   */
  async getMenu(date, mealType, db) {
    try {
      const [menuRows] = await db.execute(
        'SELECT * FROM menus WHERE publishDate = ? AND mealType = ? AND publishStatus = "published"',
        [date, mealType]
      );
      
      if (menuRows.length === 0) {
        return null; // 该日期和餐次没有菜单
      }
      
      const menu = menuRows[0];
      
      // 解析菜品JSON数据
      if (menu.dishes && typeof menu.dishes === 'string') {
        try {
          menu.dishes = JSON.parse(menu.dishes);
        } catch (error) {
          logger.error('菜品数据解析失败:', error);
          menu.dishes = [];
        }
      }
      
      return menu;
    } catch (error) {
      logger.error('获取菜单信息失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取部门成员列表（增强版，支持权限控制）
   * @param {string} userId - 当前用户ID
   * @param {Object} db - 数据库连接
   * @param {Object} options - 查询选项
   */
  async getDeptMembers(userId, db, options = {}) {
    try {
      logger.info(`getDeptMembers调用: userId=${userId}, userId类型=${typeof userId}, db=${!!db}`);
      
      const { includeInactive = false, keyword = null } = options;
      
      // 先获取当前用户的部门信息和角色
      const [userRows] = await db.execute(`
        SELECT u.departmentId, u.role, d.name as departmentName
        FROM users u
        LEFT JOIN departments d ON u.departmentId = d._id
        WHERE u._id = ? AND u.status = 'active'
      `, [userId]);
      
      if (userRows.length === 0) {
        throw new Error('用户不存在');
      }
      
      const userInfo = userRows[0];
      
      logger.info(`用户信息: userId=${userId}, departmentId=${userInfo.departmentId}, role=${userInfo.role}`);
      
      if (!userInfo.departmentId) {
        logger.warn(`用户 ${userId} 没有设置部门ID`);
        return []; // 用户没有设置部门
      }
      
      // 构建查询条件
      let whereConditions = ['u.departmentId = ?'];
      const params = [userInfo.departmentId];
      
      logger.info(`查询参数: departmentId=${userInfo.departmentId}, includeInactive=${includeInactive}, keyword=${keyword}`);
      
      if (!includeInactive) {
        whereConditions.push('u.status = ?');
        params.push('active');
      }
      
      if (keyword) {
        whereConditions.push('(u.nickName LIKE ? OR u.phoneNumber LIKE ?)');
        const keywordParam = `%${keyword}%`;
        params.push(keywordParam, keywordParam);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      logger.info(`SQL查询: WHERE ${whereClause}`);
      logger.info(`参数数组: [${params.map(p => `"${p}"`).join(', ')}]`);
      
      // 获取同部门的所有成员
      const [memberRows] = await db.execute(`
        SELECT 
          u._id, u.nickName, u.avatarUrl, u.role, u.status, 
          u.phoneNumber, u.email
        FROM users u
        WHERE ${whereClause}
        ORDER BY u.role DESC, u.nickName
      `, params);
      
      return memberRows.map(member => ({
        _id: member._id,
        name: member.nickName,
        nickName: member.nickName, // 添加nickName字段以保持一致性
        realName: null,
        role: this.getRoleDisplayName(member.role),
        avatarUrl: member.avatarUrl || '',
        employeeId: null,
        position: null,
        phoneNumber: member.phoneNumber,
        email: member.email,
        status: member.status,
        isDepartmentAdmin: member.role === 'dept_admin'
      }));
    } catch (error) {
      logger.error('获取部门成员失败:', error);
      throw error;
    }
  }

  /**
   * 部门报餐（部门管理员为部门成员报餐）
   * @param {string} adminUserId - 部门管理员用户ID
   * @param {Object} orderData - 报餐数据
   * @param {Object} db - 数据库连接
   */
  async createDepartmentOrder(adminUserId, orderData, db) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      
      // 1. 验证管理员权限（部门管理员或系统管理员）
      const [adminRows] = await connection.execute(`
        SELECT u._id, u.role, u.departmentId, d.name as departmentName
        FROM users u
        LEFT JOIN departments d ON u.departmentId = d._id
        WHERE u._id = ? AND u.role IN ('dept_admin', 'sys_admin') AND u.status = 'active'
      `, [adminUserId]);
      
      if (adminRows.length === 0) {
        throw new Error('权限不足，需要部门管理员及以上权限才能为部门成员报餐');
      }
      
      const adminInfo = adminRows[0];
      
      // 2. 获取菜单信息（不强制要求菜单存在）
      const [menuRows] = await connection.execute(`
        SELECT * FROM menus 
        WHERE publishDate = ? AND mealType = ? AND publishStatus = 'published'
      `, [orderData.date, orderData.mealType]);
      
      // 菜单不存在时使用默认菜单信息，不再抛出错误
      const menu = menuRows.length > 0 ? menuRows[0] : {
        _id: null,
        publishDate: orderData.date,
        mealType: orderData.mealType,
        publishStatus: 'published'
      };
      
            // 3. 验证报餐成员是否属于同一部门
      const memberIds = orderData.members.map(m => m.userId);
      const [memberRows] = await connection.execute(`
        SELECT _id, nickName, departmentId
        FROM users 
        WHERE _id IN (${memberIds.map(() => '?').join(',')}) AND status = 'active'
      `, memberIds);
      
      if (memberRows.length !== memberIds.length) {
        throw new Error('部分用户不存在或状态异常');
      }
      
      // 检查所有成员是否属于同一部门
      const invalidMembers = memberRows.filter(member => member.departmentId !== adminInfo.departmentId);
      if (invalidMembers.length > 0) {
        throw new Error(`用户 ${invalidMembers.map(m => m.nickName).join(', ')} 不属于本部门，无法为其报餐`);
      }
      
      // 4. 检查当前报餐请求内部是否有重复用户
      const currentMemberIds = new Set();
      const internalDuplicates = [];
      memberIds.forEach(id => {
        if (currentMemberIds.has(id)) {
          internalDuplicates.push(id);
        } else {
          currentMemberIds.add(id);
        }
      });
      
      if (internalDuplicates.length > 0) {
        throw new Error(`报餐名单中存在重复用户: ${internalDuplicates.join(', ')}`);
      }
      
      // 5. 检查是否已经报餐（全局检查，不限制部门）
      const [existingOrders] = await connection.execute(`
        SELECT memberIds FROM dining_orders
        WHERE diningDate = ? AND mealType = ? AND status != 'cancelled'
      `, [orderData.date, orderData.mealType]);
      
      // 检查是否有重复报餐的用户
      const existingMemberIds = new Set();
      existingOrders.forEach(order => {
        if (order.memberIds) {
          try {
            // 如果已经是数组，直接使用
            if (Array.isArray(order.memberIds)) {
              order.memberIds.forEach(id => existingMemberIds.add(id));
            } else if (typeof order.memberIds === 'string') {
              // 尝试解析JSON格式
              try {
                const existingIds = JSON.parse(order.memberIds);
                existingIds.forEach(id => existingMemberIds.add(id));
              } catch (error) {
                // 如果JSON解析失败，尝试解析逗号分隔的字符串
                const existingIds = order.memberIds.split(',').map(id => id.trim()).filter(id => id);
                existingIds.forEach(id => existingMemberIds.add(id));
              }
            }
          } catch (parseError) {
            logger.warn('解析memberIds失败:', parseError);
          }
        }
      });
      
      const duplicateMembers = memberIds.filter(id => existingMemberIds.has(id));
      if (duplicateMembers.length > 0) {
        // 获取重复用户的姓名
        const duplicateUserNames = memberRows
          .filter(m => duplicateMembers.includes(m._id))
          .map(m => m.nickName);
        throw new Error(`用户 ${duplicateUserNames.join(', ')} 已经报餐，无法重复报餐`);
      }
      
      // 6. 计算菜单总金额
      let totalAmount = 0;
      if (menu._id) {
        const [dishRows] = await connection.execute(`
          SELECT md.price as menuPrice
          FROM menu_dishes md
          WHERE md.menuId = ?
        `, [menu._id]);
        
        totalAmount = dishRows.reduce((sum, dish) => sum + (parseFloat(dish.menuPrice) || 0), 0);
      }
      
      // 6. 创建报餐记录
      const orderId = uuidv4();
      const memberNames = memberRows.map(m => m.nickName);
      const now = TimeUtils.getBeijingTime().utc().toDate(); // 获取当前UTC时间用于存储
      
      await connection.execute(`
        INSERT INTO dining_orders (
          _id, menuId, deptId, deptName, registrantId, registrantName,
          userId, userName, memberIds, memberNames, memberCount, 
          diningDate, mealType, status, diningStatus, totalAmount, 
          remark, createTime, updateTime
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        menu._id,
        adminInfo.departmentId,
        adminInfo.departmentName,
        adminUserId,
        adminInfo.nickName || '部门管理员',
        adminUserId,  // userId
        adminInfo.nickName || '部门管理员',  // userName
        JSON.stringify(memberIds),
        JSON.stringify(memberNames),
        memberIds.length,
        orderData.date,
        orderData.mealType,
        'confirmed',
        'ordered',  // diningStatus
        totalAmount,
        orderData.remark || '',
        now, // createTime
        now  // updateTime
      ]);
      
      const orderResults = orderData.members.map(member => ({
        orderId,
        userId: member.userId,
        userName: memberRows.find(m => m._id === member.userId)?.nickName,
        status: 'confirmed'
      }));
      
      await connection.commit();
      
      logger.info(`部门报餐成功: ${adminInfo.departmentName}`, {
        adminUserId,
        departmentId: adminInfo.departmentId,
        orderCount: orderResults.length,
        date: orderData.date,
        mealType: orderData.mealType,
        timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        message: `成功为 ${orderResults.length} 名部门成员报餐`,
        orders: orderResults,
        departmentName: adminInfo.departmentName
      };
      
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('部门报餐失败:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * 批量创建部门报餐订单
   * @param {string} adminUserId - 部门管理员用户ID
   * @param {Array} orders - 批量报餐订单数组
   * @param {Object} db - 数据库连接
   */
  async createBatchDepartmentOrders(adminUserId, orders, db) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // 1. 验证管理员权限
      const [adminRows] = await connection.execute(`
        SELECT _id, nickName, departmentId, department, role
        FROM users 
        WHERE _id = ? AND role = 'dept_admin' AND status = 'active'
      `, [adminUserId]);
      
      if (adminRows.length === 0) {
        throw new Error('管理员权限不足');
      }
      
      const adminInfo = adminRows[0];
      const results = [];
      const errors = [];

      // 2. 处理每个订单
      for (let i = 0; i < orders.length; i++) {
        const orderData = orders[i];
        try {
          // 验证订单数据
          if (!orderData.date || !orderData.mealType || !orderData.members || !Array.isArray(orderData.members)) {
            throw new Error(`订单 ${i + 1}: 缺少必要参数`);
          }

          // 验证日期格式
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(orderData.date)) {
            throw new Error(`订单 ${i + 1}: 日期格式不正确`);
          }

          // 验证餐次类型
          if (!['breakfast', 'lunch', 'dinner'].includes(orderData.mealType)) {
            throw new Error(`订单 ${i + 1}: 餐次类型不正确`);
          }

          // 验证不能为过去的日期报餐
          const today = new Date().toISOString().split('T')[0];
          if (orderData.date < today) {
            throw new Error(`订单 ${i + 1}: 不能为过去的日期报餐`);
          }

          // 3. 获取菜单信息
          const [menuRows] = await connection.execute(`
            SELECT m._id, m.name, m.publishDate, m.mealType, m.publishStatus,
                   COALESCE(m.name, CONCAT('菜单信息缺失-', m.mealType, '-', m.publishDate)) as menuName
            FROM menus m
            WHERE m.publishDate = ? AND m.mealType = ? AND m.publishStatus = 'published'
          `, [orderData.date, orderData.mealType]);

          if (menuRows.length === 0) {
            throw new Error(`订单 ${i + 1}: 菜单尚未发布`);
          }

          const menu = menuRows[0];

          // 4. 验证成员
          const memberIds = orderData.members.map(m => m.userId);
          const [memberRows] = await connection.execute(`
            SELECT _id, nickName, departmentId, status
            FROM users 
            WHERE _id IN (${memberIds.map(() => '?').join(',')}) AND status = 'active'
          `, memberIds);
          
          if (memberRows.length !== memberIds.length) {
            throw new Error(`订单 ${i + 1}: 部分用户不存在或状态异常`);
          }
          
          // 检查所有成员是否属于同一部门
          const invalidMembers = memberRows.filter(member => member.departmentId !== adminInfo.departmentId);
          if (invalidMembers.length > 0) {
            throw new Error(`订单 ${i + 1}: 用户 ${invalidMembers.map(m => m.nickName).join(', ')} 不属于本部门，无法为其报餐`);
          }
          
          // 5. 检查当前报餐请求内部是否有重复用户
          const currentMemberIds = new Set();
          const internalDuplicates = [];
          memberIds.forEach(id => {
            if (currentMemberIds.has(id)) {
              internalDuplicates.push(id);
            } else {
              currentMemberIds.add(id);
            }
          });
          
          if (internalDuplicates.length > 0) {
            throw new Error(`订单 ${i + 1}: 报餐名单中存在重复用户: ${internalDuplicates.join(', ')}`);
          }
          
          // 6. 检查是否已经报餐（全局检查，不限制部门）
          const [existingOrders] = await connection.execute(`
            SELECT memberIds FROM dining_orders
            WHERE diningDate = ? AND mealType = ? AND status != 'cancelled'
          `, [orderData.date, orderData.mealType]);
          
          // 检查是否有重复报餐的用户
          const existingMemberIds = new Set();
          existingOrders.forEach(order => {
            if (order.memberIds) {
              try {
                // 如果已经是数组，直接使用
                if (Array.isArray(order.memberIds)) {
                  order.memberIds.forEach(id => existingMemberIds.add(id));
                } else if (typeof order.memberIds === 'string') {
                  // 尝试解析JSON格式
                  try {
                    const existingIds = JSON.parse(order.memberIds);
                    existingIds.forEach(id => existingMemberIds.add(id));
                  } catch (error) {
                    // 如果JSON解析失败，尝试解析逗号分隔的字符串
                    const existingIds = order.memberIds.split(',').map(id => id.trim()).filter(id => id);
                    existingIds.forEach(id => existingMemberIds.add(id));
                  }
                }
              } catch (parseError) {
                logger.warn('解析memberIds失败:', parseError);
              }
            }
          });
          
          const duplicateMembers = memberIds.filter(id => existingMemberIds.has(id));
          if (duplicateMembers.length > 0) {
            // 获取重复用户的姓名
            const duplicateUserNames = memberRows
              .filter(m => duplicateMembers.includes(m._id))
              .map(m => m.nickName);
            throw new Error(`订单 ${i + 1}: 用户 ${duplicateUserNames.join(', ')} 已经报餐，无法重复报餐`);
          }
          
          // 7. 计算菜单总金额
          let totalAmount = 0;
          if (menu._id) {
            const [dishRows] = await connection.execute(`
              SELECT md.price as menuPrice
              FROM menu_dishes md
              WHERE md.menuId = ?
            `, [menu._id]);
            
            totalAmount = dishRows.reduce((sum, dish) => sum + (parseFloat(dish.menuPrice) || 0), 0);
          }
          
          // 7. 创建报餐记录
          const orderId = uuidv4();
          const memberNames = memberRows.map(m => m.nickName);
          const now = TimeUtils.getBeijingTime().utc().toDate(); // 获取当前UTC时间用于存储
          
          await connection.execute(`
            INSERT INTO dining_orders (
              _id, menuId, deptId, deptName, registrantId, registrantName,
              userId, userName, memberIds, memberNames, memberCount, 
              diningDate, mealType, status, diningStatus, totalAmount, 
              remark, createTime, updateTime
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            orderId,
            menu._id,
            adminInfo.departmentId,
            adminInfo.department,
            adminUserId,
            adminInfo.nickName,
            adminUserId,  // userId
            adminInfo.nickName,  // userName
            JSON.stringify(memberIds),
            JSON.stringify(memberNames),
            memberIds.length,
            orderData.date,
            orderData.mealType,
            'pending',
            'ordered',  // diningStatus
            totalAmount,
            orderData.remark || '',
            now, // createTime
            now  // updateTime
          ]);

          results.push({
            orderId,
            date: orderData.date,
            mealType: orderData.mealType,
            memberCount: memberIds.length,
            totalAmount,
            status: 'pending'
          });

          logger.info(`批量报餐订单创建成功: ${orderId}, 日期: ${orderData.date}, 餐次: ${orderData.mealType}, 人数: ${memberIds.length}`);

        } catch (error) {
          errors.push({
            orderIndex: i + 1,
            date: orderData.date,
            mealType: orderData.mealType,
            error: error.message
          });
          logger.error(`批量报餐订单 ${i + 1} 创建失败:`, error);
        }
      }

      // 8. 提交事务
      await connection.commit();

      logger.info(`批量报餐完成: 成功 ${results.length} 个, 失败 ${errors.length} 个`);

      return {
        totalOrders: orders.length,
        successCount: results.length,
        failedCount: errors.length,
        orders: results,
        errors
      };

    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      logger.error('批量报餐失败:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * 快速批量报餐（为固定成员报多个餐次）
   * @param {string} adminUserId - 部门管理员用户ID
   * @param {Array} members - 成员列表
   * @param {Array} meals - 餐次列表
   * @param {string} remark - 备注
   * @param {Object} db - 数据库连接
   */
  async createQuickBatchOrders(adminUserId, members, meals, remark, db) {
    // 将快速批量报餐转换为标准批量报餐格式
    const orders = meals.map(meal => ({
      date: meal.date,
      mealType: meal.mealType,
      members: members,
      remark: remark
    }));

    return await this.createBatchDepartmentOrders(adminUserId, orders, db);
  }

  /**
   * 获取部门报餐记录
   * @param {string} adminUserId - 部门管理员用户ID
   * @param {Object} queryParams - 查询参数
   * @param {Object} db - 数据库连接
   */
  async getDepartmentOrders(adminUserId, queryParams, db) {
    try {
      const { 
        date, 
        mealType, 
        page = 1, 
        pageSize = 20,
        startDate,
        endDate
      } = queryParams;
      
      // 1. 验证管理员权限（部门管理员或系统管理员）
      const [adminRows] = await db.execute(`
        SELECT u._id, u.role, u.departmentId, d.name as departmentName
        FROM users u
        LEFT JOIN departments d ON u.departmentId = d._id
        WHERE u._id = ? AND u.role IN ('dept_admin', 'sys_admin') AND u.status = 'active'
      `, [adminUserId]);
      
      if (adminRows.length === 0) {
        throw new Error('权限不足，需要部门管理员及以上权限才能查看部门报餐记录');
      }
      
      const adminInfo = adminRows[0];
      
      // 2. 构建查询条件
      let whereConditions = ['do.deptId = ?'];
      const params = [adminInfo.departmentId];
      
      if (date) {
        whereConditions.push('do.diningDate = ?');
        params.push(date);
      }
      
      if (mealType) {
        whereConditions.push('do.mealType = ?');
        params.push(mealType);
      }
      
      if (startDate && endDate) {
        whereConditions.push('do.diningDate BETWEEN ? AND ?');
        params.push(startDate, endDate);
      } else if (startDate) {
        whereConditions.push('do.diningDate >= ?');
        params.push(startDate);
      } else if (endDate) {
        whereConditions.push('do.diningDate <= ?');
        params.push(endDate);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // 3. 获取总数
      const [countResult] = await db.execute(`
        SELECT COUNT(*) as total
        FROM dining_orders do
        WHERE ${whereClause}
      `, params);
      
      const total = countResult[0].total;
      
      // 4. 获取分页数据
      const offset = (page - 1) * pageSize;
      const [orders] = await db.execute(`
        SELECT 
          do._id, do.registrantId, do.registrantName, do.diningDate, do.mealType, do.createTime,
          do.status, do.memberIds, do.memberNames, do.memberCount, do.totalAmount,
          m.name as menuName
        FROM dining_orders do
        LEFT JOIN menus m ON do.menuId = m._id
        WHERE ${whereClause}
        ORDER BY do.diningDate DESC, do.createTime DESC
        LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}
      `, params);
      
      return {
        list: orders.map(order => ({
          _id: order._id,
          registrantId: order.registrantId,
          registrantName: order.registrantName,
          memberIds: this.parseJsonField(order.memberIds),
          memberNames: this.parseJsonField(order.memberNames),
          memberCount: order.memberCount,
          date: order.diningDate,
          mealType: order.mealType,
          menuName: order.menuName,
          orderTime: order.createTime,
          status: order.status,
          totalAmount: order.totalAmount
        })),
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        departmentName: adminInfo.departmentName
      };
      
    } catch (error) {
      logger.error('获取部门报餐记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取部门报餐统计
   * @param {string} adminUserId - 部门管理员用户ID
   * @param {Object} queryParams - 查询参数
   * @param {Object} db - 数据库连接
   */
  async getDepartmentOrderStats(adminUserId, queryParams, db) {
    try {
      const { startDate, endDate } = queryParams;
      
      // 1. 验证管理员权限（部门管理员或系统管理员）
      const [adminRows] = await db.execute(`
        SELECT u._id, u.role, u.departmentId, d.name as departmentName
        FROM users u
        LEFT JOIN departments d ON u.departmentId = d._id
        WHERE u._id = ? AND u.role IN ('dept_admin', 'sys_admin') AND u.status = 'active'
      `, [adminUserId]);
      
      if (adminRows.length === 0) {
        throw new Error('权限不足，需要部门管理员及以上权限才能查看部门报餐统计');
      }
      
      const adminInfo = adminRows[0];
      
      // 2. 构建查询条件
      let whereConditions = ['do.deptId = ?'];
      const params = [adminInfo.departmentId];
      
      if (startDate && endDate) {
        whereConditions.push('do.diningDate BETWEEN ? AND ?');
        params.push(startDate, endDate);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // 3. 获取统计数据
      const [stats] = await db.execute(`
        SELECT 
          COUNT(*) as totalOrders,
          SUM(do.memberCount) as totalMembers,
          COUNT(DISTINCT do.diningDate) as orderDays,
          SUM(CASE WHEN do.mealType = 'breakfast' THEN do.memberCount ELSE 0 END) as breakfastOrders,
          SUM(CASE WHEN do.mealType = 'lunch' THEN do.memberCount ELSE 0 END) as lunchOrders,
          SUM(CASE WHEN do.mealType = 'dinner' THEN do.memberCount ELSE 0 END) as dinnerOrders
        FROM dining_orders do
        WHERE ${whereClause}
      `, params);
      
      // 4. 获取唯一报餐用户数量
      const [uniqueUsersStats] = await db.execute(`
        SELECT COUNT(DISTINCT memberId) as uniqueUsers
        FROM (
          SELECT JSON_UNQUOTE(JSON_EXTRACT(do.memberIds, CONCAT('$[', numbers.n, ']'))) as memberId
          FROM dining_orders do
          CROSS JOIN (
            SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION 
            SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
          ) numbers
          WHERE ${whereClause}
            AND JSON_UNQUOTE(JSON_EXTRACT(do.memberIds, CONCAT('$[', numbers.n, ']'))) IS NOT NULL
        ) as member_list
      `, params);
      
      // 5. 获取部门成员总数
      const [memberCount] = await db.execute(`
        SELECT COUNT(*) as totalMembers
        FROM users
        WHERE departmentId = ? AND status = 'active'
      `, [adminInfo.departmentId]);
      
      return {
        departmentName: adminInfo.departmentName,
        totalMembers: memberCount[0].totalMembers,
        totalOrders: stats[0].totalOrders,
        uniqueUsers: uniqueUsersStats[0].uniqueUsers, // 使用正确的唯一用户数量
        orderDays: stats[0].orderDays,
        mealTypeStats: {
          breakfast: stats[0].breakfastOrders,
          lunch: stats[0].lunchOrders,
          dinner: stats[0].dinnerOrders
        },
        participationRate: memberCount[0].totalMembers > 0 
          ? Math.round((uniqueUsersStats[0].uniqueUsers / memberCount[0].totalMembers) * 100) 
          : 0
      };
      
    } catch (error) {
      logger.error('获取部门报餐统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取角色显示名称
   * @param {string} role - 角色代码
   */
  getRoleDisplayName(role) {
    const roleNames = {
      'user': '普通用户',
      'dept_admin': '部门管理员',
      'admin': '管理员',
      'sys_admin': '系统管理员'
    };
    return roleNames[role] || '未知角色';
  }

  /**
   * 解析JSON字段，处理数组和字符串格式
   * @param {any} field - 要解析的字段
   * @returns {Array} 解析后的数组
   */
  parseJsonField(field) {
    if (!field) return [];
    
    // 如果已经是数组，直接返回
    if (Array.isArray(field)) {
      return field;
    }
    
    // 如果是字符串，尝试解析JSON
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (error) {
        logger.error('解析JSON字段失败:', error);
        return [];
      }
    }
    
    return [];
  }

  /**
   * 获取指定部门的成员列表（系统管理员使用）
   * @param {string} departmentId - 部门ID
   * @param {Object} db - 数据库连接
   * @param {Object} options - 选项
   */
  async getDeptMembersForDept(departmentId, db, options = {}) {
    try {
      const { includeInactive = false, keyword = null } = options;
      
      // 构建查询条件
      let whereConditions = ['u.departmentId = ?'];
      const params = [departmentId];
      
      if (!includeInactive) {
        whereConditions.push('u.status = ?');
        params.push('active');
      }
      
      if (keyword) {
        whereConditions.push('(u.nickName LIKE ? OR u.phoneNumber LIKE ?)');
        const keywordParam = `%${keyword}%`;
        params.push(keywordParam, keywordParam);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // 获取部门成员
      const [memberRows] = await db.execute(`
        SELECT 
          u._id, u.nickName, u.avatarUrl, u.role, u.status, 
          u.phoneNumber, u.email
        FROM users u
        WHERE ${whereClause}
        ORDER BY u.role DESC, u.nickName
      `, params);
      
      return memberRows.map(member => ({
        _id: member._id,
        name: member.nickName,
        nickName: member.nickName,
        realName: null,
        role: this.getRoleDisplayName(member.role),
        avatarUrl: member.avatarUrl || '',
        employeeId: null,
        position: null,
        phoneNumber: member.phoneNumber,
        email: member.email,
        status: member.status,
        isDepartmentAdmin: member.role === 'dept_admin'
      }));
    } catch (error) {
      logger.error('获取部门成员失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定部门的报餐统计（系统管理员使用）
   * @param {string} departmentId - 部门ID
   * @param {Object} queryParams - 查询参数
   * @param {Object} db - 数据库连接
   */
  async getDepartmentOrderStatsForDept(departmentId, queryParams, db) {
    try {
      const { startDate, endDate } = queryParams;
      
      // 构建查询条件
      let whereConditions = ['do.deptId = ?'];
      const params = [departmentId];
      
      if (startDate && endDate) {
        whereConditions.push('do.diningDate BETWEEN ? AND ?');
        params.push(startDate, endDate);
      } else if (startDate) {
        whereConditions.push('do.diningDate >= ?');
        params.push(startDate);
      } else if (endDate) {
        whereConditions.push('do.diningDate <= ?');
        params.push(endDate);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // 获取统计数据
      const [stats] = await db.execute(`
        SELECT 
          COUNT(*) as totalOrders,
          SUM(do.memberCount) as totalMembers,
          COUNT(DISTINCT do.diningDate) as orderDays,
          SUM(CASE WHEN do.mealType = 'breakfast' THEN do.memberCount ELSE 0 END) as breakfastOrders,
          SUM(CASE WHEN do.mealType = 'lunch' THEN do.memberCount ELSE 0 END) as lunchOrders,
          SUM(CASE WHEN do.mealType = 'dinner' THEN do.memberCount ELSE 0 END) as dinnerOrders
        FROM dining_orders do
        WHERE ${whereClause}
      `, params);
      
      // 获取唯一报餐用户数量
      const [uniqueUsersStats] = await db.execute(`
        SELECT COUNT(DISTINCT memberId) as uniqueUsers
        FROM (
          SELECT JSON_UNQUOTE(JSON_EXTRACT(do.memberIds, CONCAT('$[', numbers.n, ']'))) as memberId
          FROM dining_orders do
          CROSS JOIN (
            SELECT 0 as n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION 
            SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9
          ) numbers
          WHERE ${whereClause}
            AND JSON_UNQUOTE(JSON_EXTRACT(do.memberIds, CONCAT('$[', numbers.n, ']'))) IS NOT NULL
        ) as member_list
      `, params);
      
      // 获取部门信息
      const [deptInfo] = await db.execute(`
        SELECT name as departmentName FROM departments WHERE _id = ?
      `, [departmentId]);
      
      // 获取部门成员总数
      const [memberCount] = await db.execute(`
        SELECT COUNT(*) as totalMembers
        FROM users
        WHERE departmentId = ? AND status = 'active'
      `, [departmentId]);
      
      return {
        departmentName: deptInfo[0]?.departmentName || '未知部门',
        totalMembers: memberCount[0].totalMembers,
        totalOrders: stats[0].totalOrders,
        uniqueUsers: uniqueUsersStats[0].uniqueUsers,
        orderDays: stats[0].orderDays,
        mealTypeStats: {
          breakfast: stats[0].breakfastOrders,
          lunch: stats[0].lunchOrders,
          dinner: stats[0].dinnerOrders
        },
        participationRate: memberCount[0].totalMembers > 0 
          ? Math.round((uniqueUsersStats[0].uniqueUsers / memberCount[0].totalMembers) * 100) 
          : 0
      };
      
    } catch (error) {
      logger.error('获取部门报餐统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定部门的报餐记录（系统管理员使用）
   * @param {string} departmentId - 部门ID
   * @param {Object} queryParams - 查询参数
   * @param {Object} db - 数据库连接
   */
  async getDepartmentOrdersForDept(departmentId, queryParams, db) {
    try {
      const { 
        date, 
        mealType, 
        page = 1, 
        pageSize = 20,
        startDate,
        endDate
      } = queryParams;
      
      // 构建查询条件
      let whereConditions = ['do.deptId = ?'];
      const params = [departmentId];
      
      if (date) {
        whereConditions.push('do.diningDate = ?');
        params.push(date);
      }
      
      if (mealType) {
        whereConditions.push('do.mealType = ?');
        params.push(mealType);
      }
      
      if (startDate && endDate) {
        whereConditions.push('do.diningDate BETWEEN ? AND ?');
        params.push(startDate, endDate);
      } else if (startDate) {
        whereConditions.push('do.diningDate >= ?');
        params.push(startDate);
      } else if (endDate) {
        whereConditions.push('do.diningDate <= ?');
        params.push(endDate);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // 获取总数
      const [countResult] = await db.execute(`
        SELECT COUNT(*) as total
        FROM dining_orders do
        WHERE ${whereClause}
      `, params);
      
      const total = countResult[0].total;
      
      // 获取分页数据
      const offset = (page - 1) * pageSize;
      const [orders] = await db.execute(`
        SELECT 
          do._id, do.registrantId, do.registrantName, do.diningDate, do.mealType, do.createTime,
          do.status, do.memberIds, do.memberNames, do.memberCount, do.totalAmount,
          m.name as menuName
        FROM dining_orders do
        LEFT JOIN menus m ON do.menuId = m._id
        WHERE ${whereClause}
        ORDER BY do.diningDate DESC, do.createTime DESC
        LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}
      `, params);
      
      return {
        list: orders.map(order => ({
          _id: order._id,
          registrantId: order.registrantId,
          registrantName: order.registrantName,
          memberIds: this.parseJsonField(order.memberIds),
          memberNames: this.parseJsonField(order.memberNames),
          memberCount: order.memberCount,
          date: order.diningDate,
          mealType: order.mealType,
          menuName: order.menuName,
          orderTime: order.createTime,
          status: order.status,
          totalAmount: order.totalAmount
        })),
        total,
        page,
        pageSize,
        hasMore: (page * pageSize) < total
      };
      
    } catch (error) {
      logger.error('获取部门报餐记录失败:', error);
      throw error;
    }
  }
}

module.exports = new DiningServiceEnhanced();
