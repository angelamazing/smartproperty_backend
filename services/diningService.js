const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const TimeUtils = require('../utils/timeUtils');
const logger = require('../utils/logger');

/**
 * 日常报餐服务类
 */
class DiningService {
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
   * 获取部门成员列表
   * @param {string} userId - 当前用户ID
   * @param {Object} db - 数据库连接
   */
  async getDeptMembers(userId, db) {
    try {
      // 先获取当前用户的部门信息
      const [userRows] = await db.execute(
        'SELECT department FROM users WHERE _id = ?',
        [userId]
      );
      
      if (userRows.length === 0) {
        throw new Error('用户不存在');
      }
      
      const userDepartment = userRows[0].department;
      
      if (!userDepartment) {
        return []; // 用户没有设置部门
      }
      
      // 获取同部门的所有成员
      const [memberRows] = await db.execute(
        `SELECT _id, nickName, avatarUrl, role, status
         FROM users 
         WHERE department = ? AND status = 'active'
         ORDER BY role DESC, nickName`,
        [userDepartment]
      );
      
      return memberRows.map(member => ({
        _id: member._id,
        name: member.nickName,
        role: this.getRoleDisplayName(member.role),
        avatarUrl: member.avatarUrl || ''
      }));
    } catch (error) {
      logger.error('获取部门成员失败:', error);
      throw error;
    }
  }
  
  /**
   * 提交部门报餐
   * @param {string} userId - 报餐人ID
   * @param {string} date - 用餐日期
   * @param {string} mealType - 餐次类型
   * @param {Array} memberIds - 报餐成员ID列表
   * @param {string} remark - 备注
   * @param {Object} db - 数据库连接
   */
  async submitDeptOrder(userId, date, mealType, memberIds, remark, db) {
    try {
      // 1. 验证报餐日期（不能是过去的日期）
      const today = TimeUtils.getBeijingTime().format('YYYY-MM-DD');
      if (TimeUtils.isPastDate(date)) {
        throw new Error('不能为过去的日期报餐');
      }
      
      // 2. 可选：检查菜单是否存在（不作为强制条件）
      // const menu = await this.getMenu(date, mealType, db);
      // 允许在没有发布菜单的情况下也能报餐
      
      // 3. 获取报餐人信息
      const [userRows] = await db.execute(
        'SELECT nickName, department, departmentId FROM users WHERE _id = ?',
        [userId]
      );
      
      if (userRows.length === 0) {
        throw new Error('报餐人不存在');
      }
      
      const registrant = userRows[0];
      
      // 4. 验证成员是否都存在且属于同一部门
      const [memberRows] = await db.execute(
        `SELECT _id, nickName, department, departmentId FROM users 
         WHERE _id IN (${memberIds.map(() => '?').join(',')}) AND status = 'active'`,
        memberIds
      );
      
      if (memberRows.length !== memberIds.length) {
        throw new Error('部分成员不存在或已被禁用');
      }
      
      // 验证所有成员都属于同一部门
      const departmentIds = [...new Set(memberRows.map(m => m.departmentId))];
      if (departmentIds.length > 1 || departmentIds[0] !== registrant.departmentId) {
        throw new Error('只能为同部门成员报餐');
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
        throw new Error(`报餐名单中存在重复用户: ${internalDuplicates.join(', ')}`);
      }
      
      // 6. 检查是否已经报过餐
      const [existingOrders] = await db.execute(
        `SELECT _id, memberIds FROM dining_orders 
         WHERE diningDate = ? AND mealType = ? AND status != 'cancelled'`,
        [date, mealType]
      );
      
      // 检查是否有重复报餐的用户
      const existingMemberIds = new Set();
      existingOrders.forEach(order => {
        if (order.memberIds) {
          try {
            const existingIds = JSON.parse(order.memberIds);
            existingIds.forEach(id => existingMemberIds.add(id));
          } catch (error) {
            logger.warn('解析memberIds失败:', error);
          }
        }
      });
      
      const duplicateMembers = memberIds.filter(id => existingMemberIds.has(id));
      if (duplicateMembers.length > 0) {
        throw new Error(`用户 ${duplicateMembers.join(', ')} 已经报餐，无法重复报餐`);
      }
      
      // 7. 创建报餐记录
      const orderId = uuidv4();
      const memberNames = memberRows.map(m => m.nickName);
      const now = TimeUtils.getBeijingTime().utc().toDate(); // 获取当前UTC时间用于存储
      
      await db.execute(
        `INSERT INTO dining_orders 
         (_id, deptId, deptName, registrantId, userId, userName, memberIds, memberNames, memberCount, 
          diningDate, mealType, status, diningStatus, remark, createTime, updateTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'ordered', ?, ?, ?)`,
        [
          orderId,
          registrant.departmentId,
          registrant.department,
          userId,
          userId, // 用户ID
          registrant.nickName, // 用户姓名
          JSON.stringify(memberIds),
          JSON.stringify(memberNames),
          memberIds.length,
          date,
          mealType,
          remark || '',
          now, // createTime
          now  // updateTime
        ]
      );
      
      logger.info(`部门报餐提交成功: ${orderId}, 报餐人: ${userId}, 人数: ${memberIds.length}`);
      
      return {
        orderId,
        successCount: memberIds.length,
        totalCount: memberIds.length
      };
    } catch (error) {
      logger.error('提交部门报餐失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取报餐记录
   * @param {string} userId - 用户ID
   * @param {Object} filters - 筛选条件
   * @param {number} page - 页码
   * @param {number} pageSize - 每页大小
   * @param {Object} db - 数据库连接
   */
  async getDiningRecords(userId, filters, page, pageSize, db) {
    try {
      // 基础查询条件
      let whereClause = 'WHERE registrantId = ?';
      let whereValues = [userId];
      
      // 构建筛选条件 - 改进空值判断
      if (filters.date && filters.date.trim() !== '') {
        // 单日查询
        whereClause += ' AND diningDate = ?';
        whereValues.push(filters.date);
      } else if (filters.startDate && filters.endDate && 
                 filters.startDate.trim() !== '' && filters.endDate.trim() !== '') {
        // 时间段查询
        whereClause += ' AND diningDate BETWEEN ? AND ?';
        whereValues.push(filters.startDate, filters.endDate);
      } else if (filters.startDate && filters.startDate.trim() !== '') {
        // 开始日期查询
        whereClause += ' AND diningDate >= ?';
        whereValues.push(filters.startDate);
      } else if (filters.endDate && filters.endDate.trim() !== '') {
        // 结束日期查询
        whereClause += ' AND diningDate <= ?';
        whereValues.push(filters.endDate);
      }
      
      if (filters.status && filters.status.trim() !== '') {
        whereClause += ' AND status = ?';
        whereValues.push(filters.status);
      }
      
      // 查询总数
      const countSql = `SELECT COUNT(*) as total FROM dining_orders ${whereClause}`;
      const [countResult] = await db.execute(countSql, whereValues);
      const total = countResult[0].total;
      
      // 查询记录列表
      const offset = (page - 1) * pageSize;
      const listSql = `
        SELECT _id, diningDate, mealType, memberCount, memberNames, status, createTime, remark
        FROM dining_orders ${whereClause}
        ORDER BY createTime DESC
        LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}
      `;
      
      const [records] = await db.execute(listSql, whereValues);
      
      // 处理记录数据
      const processedRecords = records.map(record => ({
        ...record,
        memberNames: this.parseMemberNames(record.memberNames)
      }));
      
      return {
        records: processedRecords,
        total,
        page,
        pageSize,
        hasMore: (page * pageSize) < total
      };
    } catch (error) {
      logger.error('获取报餐记录失败:', error);
      throw error;
    }
  }
  
  /**
   * 取消报餐
   * @param {string} orderId - 订单ID
   * @param {string} userId - 用户ID
   * @param {Object} db - 数据库连接
   */
  async cancelDiningOrder(orderId, userId, db) {
    try {
      // 1. 检查订单是否存在且属于当前用户
      const [orderRows] = await db.execute(
        'SELECT * FROM dining_orders WHERE _id = ? AND registrantId = ?',
        [orderId, userId]
      );
      
      if (orderRows.length === 0) {
        throw new Error('订单不存在或无权操作');
      }
      
      const order = orderRows[0];
      
      // 2. 检查订单状态
      if (order.status === 'cancelled') {
        throw new Error('订单已经取消');
      }
      
      if (order.status === 'completed') {
        throw new Error('已完成的订单不能取消');
      }
      
      // 3. 检查是否可以取消（用餐日期前一天22:00之前可以取消）
      const cancelDeadline = moment(order.diningDate).subtract(1, 'day').hour(22).minute(0).second(0);
      if (moment().isAfter(cancelDeadline)) {
        throw new Error('超过取消时限，无法取消订单');
      }
      
      // 4. 更新订单状态
      await db.execute(
        'UPDATE dining_orders SET status = "cancelled", updateTime = NOW() WHERE _id = ?',
        [orderId]
      );
      
      logger.info(`报餐订单取消成功: ${orderId}`);
      return true;
    } catch (error) {
      logger.error('取消报餐订单失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取今日报餐统计（管理员功能）
   * @param {string} date - 日期
   * @param {Object} db - 数据库连接
   */
  async getTodayDiningStats(date, db) {
    try {
      const [stats] = await db.execute(
        `SELECT 
           mealType,
           COUNT(*) as orderCount,
           SUM(memberCount) as totalPeople,
           SUM(CASE WHEN status = 'confirmed' THEN memberCount ELSE 0 END) as confirmedPeople
         FROM dining_orders 
         WHERE diningDate = ? AND status != 'cancelled'
         GROUP BY mealType`,
        [date]
      );
      
      return stats;
    } catch (error) {
      logger.error('获取今日报餐统计失败:', error);
      throw error;
    }
  }
  
  /**
   * 确认报餐订单（管理员功能）
   * @param {string} orderId - 订单ID
   * @param {string} adminId - 管理员ID
   * @param {Object} db - 数据库连接
   */
  async confirmDiningOrder(orderId, adminId, db) {
    try {
      const [result] = await db.execute(
        'UPDATE dining_orders SET status = "confirmed", updateTime = NOW() WHERE _id = ? AND status = "pending"',
        [orderId]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('订单不存在或状态不正确');
      }
      
      logger.info(`管理员 ${adminId} 确认报餐订单: ${orderId}`);
      return true;
    } catch (error) {
      logger.error('确认报餐订单失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取报餐记录详情
   * @param {string} recordId - 记录ID
   * @param {string} currentUserId - 当前用户ID
   * @param {string} userRole - 用户角色
   * @param {string} userDepartment - 用户部门
   * @param {Object} db - 数据库连接
   */
  async getRecordDetail(recordId, currentUserId, userRole, userDepartment, db) {
    try {
      // 1. 查询报餐记录
      const [recordRows] = await db.execute(
        `SELECT _id, deptId, deptName, registrantId, memberIds, memberNames, memberCount,
                diningDate, mealType, status, remark, createTime, updateTime
         FROM dining_orders WHERE _id = ?`,
        [recordId]
      );
      
      if (recordRows.length === 0) {
        throw new Error('RECORD_NOT_FOUND');
      }
      
      const record = recordRows[0];
      
      // 2. 权限检查
      if (!this.hasPermission(record, currentUserId, userRole, userDepartment)) {
        throw new Error('PERMISSION_DENIED');
      }
      
      // 3. 解析成员ID列表
      let memberIds = [];
      try {
        memberIds = JSON.parse(record.memberIds || '[]');
      } catch (error) {
        logger.error('解析成员ID失败:', error);
        memberIds = [];
      }
      
      // 4. 查询成员详细信息
      let memberDetails = [];
      if (memberIds.length > 0) {
        const [memberRows] = await db.execute(
          `SELECT _id, nickName as name, department, role, avatarUrl
           FROM users 
           WHERE _id IN (${memberIds.map(() => '?').join(',')})`,
          memberIds
        );
        
        // 处理成员信息，保持与memberIds相同的顺序
        memberDetails = memberIds.map(id => {
          const member = memberRows.find(m => m._id === id);
          if (member) {
            return {
              _id: member._id,
              name: member.name,
              department: member.department || '未知部门',
              role: this.getRoleDisplayName(member.role),
              avatarUrl: member.avatarUrl || ''
            };
          } else {
            // 处理已删除的用户
            return {
              _id: id,
              name: '已删除用户',
              department: '未知部门',
              role: '员工',
              avatarUrl: ''
            };
          }
        });
      }
      
      // 5. 查询提交人信息
      let submittedBy = null;
      if (record.registrantId) {
        const [submitterRows] = await db.execute(
          `SELECT _id, nickName as name, department, role
           FROM users WHERE _id = ?`,
          [record.registrantId]
        );
        
        if (submitterRows.length > 0) {
          const submitter = submitterRows[0];
          submittedBy = {
            _id: submitter._id,
            name: submitter.name,
            department: submitter.department || '未知部门',
            role: this.getRoleDisplayName(submitter.role)
          };
        } else {
          submittedBy = {
            _id: record.registrantId,
            name: '未知用户',
            department: '未知部门',
            role: '员工'
          };
        }
      }
      
      // 6. 组装响应数据
      const memberNames = this.parseMemberNames(record.memberNames);
      
      return {
        _id: record._id,
        diningDate: record.diningDate,
        mealType: record.mealType,
        memberCount: record.memberCount,
        memberNames: memberNames,
        memberDetails: memberDetails,
        status: record.status,
        remark: record.remark || '',
        createTime: record.createTime,
        submittedBy: submittedBy
      };
    } catch (error) {
      logger.error('获取报餐记录详情失败:', error);
      throw error;
    }
  }

  // ==================== 私有方法 ====================
  
  /**
   * 检查是否有权限查看记录
   * @param {Object} record - 报餐记录
   * @param {string} currentUserId - 当前用户ID
   * @param {string} userRole - 用户角色
   * @param {string} userDepartment - 用户部门
   */
  hasPermission(record, currentUserId, userRole, userDepartment) {
    // 系统管理员可以查看所有记录
    if (userRole === 'sys_admin') {
      return true;
    }
    
    // 部门管理员可以查看本部门记录
    if (userRole === 'dept_admin') {
      return record.deptName === userDepartment;
    }
    
    // 普通用户只能查看自己相关的记录
    let memberIds = [];
    try {
      memberIds = JSON.parse(record.memberIds || '[]');
    } catch (error) {
      memberIds = [];
    }
    
    return record.registrantId === currentUserId || memberIds.includes(currentUserId);
  }
  
  /**
   * 获取角色显示名称
   * @param {string} role - 角色代码
   */
  getRoleDisplayName(role) {
    const roleMap = {
      'user': '员工',
      'dept_admin': '部门管理员',
      'sys_admin': '系统管理员'
    };
    
    return roleMap[role] || '员工';
  }
  
  /**
   * 解析成员姓名JSON数据
   * @param {string} memberNamesJson - 成员姓名JSON字符串
   */
  parseMemberNames(memberNamesJson) {
    if (!memberNamesJson) return [];
    
    // 如果已经是数组，直接返回
    if (Array.isArray(memberNamesJson)) {
      return memberNamesJson;
    }
    
    // 如果是字符串，尝试解析JSON
    if (typeof memberNamesJson === 'string') {
      try {
        return JSON.parse(memberNamesJson);
      } catch (error) {
        logger.error('解析成员姓名失败:', error);
        return [];
      }
    }
    
    return [];
  }

  /**
   * 获取个人报餐状态
   * @param {string} userId - 用户ID
   * @param {string} date - 查询日期 (YYYY-MM-DD)
   * @param {Object} db - 数据库连接
   */
  async getPersonalDiningStatus(userId, date, db) {
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
      
      // 获取用户当天的报餐记录
      const [orderRows] = await db.execute(
        `SELECT 
          do._id as orderId,
          do.menuId,
          do.mealType,
          do.status,
          do.diningStatus,
          do.actualDiningTime,
          do.totalAmount,
          do.remark,
          do.createTime as registerTime,
          do.registrantName,
          COALESCE(m.name, CONCAT('菜单-', DATE_FORMAT(m.publishDate, '%Y-%m-%d'), '-', 
            CASE m.mealType 
              WHEN 'breakfast' THEN '早餐'
              WHEN 'lunch' THEN '午餐' 
              WHEN 'dinner' THEN '晚餐'
              ELSE m.mealType
            END)) as menuName,
          m.publishStatus
        FROM dining_orders do
        LEFT JOIN menus m ON do.menuId = m._id
        WHERE do.diningDate = ? 
        AND JSON_CONTAINS(do.memberIds, ?)
        ORDER BY do.mealType, do.createTime DESC`,
        [queryDate, `"${userId}"`]
      );
      
      // 获取当天所有可用菜单
      const [menuRows] = await db.execute(
        `SELECT 
          m._id as menuId,
          COALESCE(m.name, CONCAT('菜单-', DATE_FORMAT(m.publishDate, '%Y-%m-%d'), '-', 
            CASE m.mealType 
              WHEN 'breakfast' THEN '早餐'
              WHEN 'lunch' THEN '午餐' 
              WHEN 'dinner' THEN '晚餐'
              ELSE m.mealType
            END)) as menuName,
          m.mealType,
          m.publishStatus,
          m.publishDate
        FROM menus m
        WHERE m.publishDate = ? AND m.publishStatus = 'published'
        ORDER BY m.mealType`,
        [queryDate]
      );
      
      // 构建餐次状态
      const mealTypes = ['breakfast', 'lunch', 'dinner'];
      const mealStatus = {};
      const availableMenus = {};
      
      // 初始化所有餐次状态
      mealTypes.forEach(mealType => {
        mealStatus[mealType] = {
          isRegistered: false,
          status: null,
          diningStatus: null,
          statusText: '未报餐',
          confirmationText: '未确认',
          orderId: null,
          menuId: null,
          menuName: null,
          dishes: [],
          totalAmount: 0.00,
          registerTime: null,
          actualDiningTime: null,
          registrantName: null,
          remark: null
        };
      });
      
      // 处理报餐记录
      orderRows.forEach(order => {
        const mealType = order.mealType;
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
        
        mealStatus[mealType] = {
          isRegistered: true,
          status: order.status,
          diningStatus: order.diningStatus,
          statusText: statusMap[order.status] || '未知状态',
          confirmationText: diningStatusMap[order.diningStatus] || '未确认',
          orderId: order.orderId,
          menuId: order.menuId,
          menuName: order.menuName || `菜单-${queryDate}-${mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '午餐' : '晚餐'}`,
          dishes: [], // 稍后填充菜品信息
          totalAmount: parseFloat(order.totalAmount) || 0.00,
          registerTime: order.registerTime ? TimeUtils.toISOString(order.registerTime) : null,
          actualDiningTime: order.actualDiningTime ? TimeUtils.toISOString(order.actualDiningTime) : null,
          registrantName: order.registrantName,
          remark: order.remark
        };
      });
      
      // 处理可用菜单
      menuRows.forEach(menu => {
        availableMenus[menu.mealType] = {
          menuId: menu.menuId,
          menuName: menu.menuName,
          publishStatus: menu.publishStatus,
          dishes: [] // 稍后填充菜品信息
        };
      });
      
      // 为已报餐的餐次获取菜品信息
      for (const mealType of mealTypes) {
        if (mealStatus[mealType].isRegistered && mealStatus[mealType].menuId) {
          try {
            const [dishRows] = await db.execute(
              `SELECT 
                d._id as dishId,
                d.name as dishName,
                d.image as dishImage,
                d.price as originalPrice,
                md.price as menuPrice,
                md.sort
              FROM menu_dishes md
              LEFT JOIN dishes d ON md.dishId = d._id
              WHERE md.menuId = ?
              ORDER BY md.sort ASC, d.name ASC`,
              [mealStatus[mealType].menuId]
            );
            
            mealStatus[mealType].dishes = dishRows.map(dish => ({
              dishId: dish.dishId,
              dishName: dish.dishName,
              dishImage: dish.dishImage,
              originalPrice: parseFloat(dish.originalPrice) || 0.00,
              menuPrice: parseFloat(dish.menuPrice) || 0.00,
              sort: parseInt(dish.sort) || 0
            }));
            
            // 重新计算总金额（如果数据库中的totalAmount为0）
            if (mealStatus[mealType].totalAmount === 0) {
              const calculatedTotal = mealStatus[mealType].dishes.reduce((sum, dish) => sum + dish.menuPrice, 0);
              mealStatus[mealType].totalAmount = calculatedTotal;
            }
          } catch (error) {
            logger.error(`获取${mealType}菜品信息失败:`, error);
            mealStatus[mealType].dishes = [];
          }
        }
      }
      
      // 为可用菜单获取菜品信息
      for (const mealType of mealTypes) {
        if (availableMenus[mealType] && availableMenus[mealType].menuId) {
          try {
            const [dishRows] = await db.execute(
              `SELECT 
                d._id as dishId,
                d.name as dishName,
                d.image as dishImage,
                d.price as originalPrice,
                md.price as menuPrice,
                md.sort
              FROM menu_dishes md
              LEFT JOIN dishes d ON md.dishId = d._id
              WHERE md.menuId = ?
              ORDER BY md.sort ASC, d.name ASC`,
              [availableMenus[mealType].menuId]
            );
            
            availableMenus[mealType].dishes = dishRows.map(dish => ({
              dishId: dish.dishId,
              dishName: dish.dishName,
              dishImage: dish.dishImage,
              originalPrice: parseFloat(dish.originalPrice) || 0.00,
              menuPrice: parseFloat(dish.menuPrice) || 0.00,
              sort: parseInt(dish.sort) || 0
            }));
          } catch (error) {
            logger.error(`获取${mealType}可用菜单菜品信息失败:`, error);
            availableMenus[mealType].dishes = [];
          }
        }
      }
      
      // 计算汇总统计
      const summary = {
        totalRegistered: Object.values(mealStatus).filter(status => status.isRegistered).length,
        totalAmount: Object.values(mealStatus).reduce((sum, status) => sum + status.totalAmount, 0),
        confirmedCount: Object.values(mealStatus).filter(status => status.status === 'confirmed').length,
        pendingCount: Object.values(mealStatus).filter(status => status.status === 'pending').length,
        unregisteredCount: Object.values(mealStatus).filter(status => !status.isRegistered).length,
        diningConfirmedCount: Object.values(mealStatus).filter(status => status.diningStatus === 'dined').length,
        diningPendingCount: Object.values(mealStatus).filter(status => 
          status.isRegistered && status.diningStatus === 'ordered'
        ).length
      };
      
      return {
        userId: user._id,
        userName: user.nickName,
        department: user.department,
        queryDate: queryDate,
        mealStatus,
        summary,
        availableMenus
      };
      
    } catch (error) {
      logger.error('获取个人报餐状态失败:', error);
      throw error;
    }
  }
}

module.exports = new DiningService();
