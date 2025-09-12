const diningServiceEnhanced = require('../services/diningServiceEnhanced');
const { ResponseHelper } = require('../utils/response');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

/**
 * 增强版报餐控制器
 * 支持部门级别的权限控制和报餐管理
 */
class DiningControllerEnhanced {
  /**
   * 获取菜单信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getMenu(req, res) {
    try {
      const { date, mealType } = req.query;
      
      const targetDate = date || moment().tz('Asia/Shanghai').format('YYYY-MM-DD');
      const menu = await diningServiceEnhanced.getMenu(targetDate, mealType, req.db);
      
      if (!menu) {
        return ResponseHelper.success(res, {
          date: targetDate,
          mealType: mealType || 'all',
          menus: []
        }, '该日期暂无菜单');
      }
      
      return ResponseHelper.success(res, {
        date: targetDate,
        mealType: mealType || 'all',
        menus: [menu]
      }, '获取菜单成功');
    } catch (error) {
      logger.error('获取菜单失败:', error);
      return ResponseHelper.error(res, '获取菜单失败', 500);
    }
  }

  /**
   * 获取部门成员列表（增强版）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDeptMembers(req, res) {
    try {
      const { includeInactive, keyword } = req.query;
      
      logger.info(`控制器getDeptMembers: req.user=${JSON.stringify(req.user)}, req.user.id=${req.user?.id}`);
      
      const members = await diningServiceEnhanced.getDeptMembers(req.user.id, req.db, {
        includeInactive: includeInactive === 'true',
        keyword
      });
      
      return ResponseHelper.success(res, members, '获取部门成员成功');
    } catch (error) {
      logger.error('获取部门成员失败:', error);
      return ResponseHelper.error(res, '获取部门成员失败', 500);
    }
  }

  /**
   * 部门报餐（部门管理员为部门成员报餐）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createDepartmentOrder(req, res) {
    try {
      const orderData = req.body;
      
      // 验证必填字段
      if (!orderData.date || !orderData.mealType || !orderData.members || !Array.isArray(orderData.members)) {
        return ResponseHelper.error(res, '报餐数据不完整', 400);
      }
      
      if (orderData.members.length === 0) {
        return ResponseHelper.error(res, '请选择要报餐的成员', 400);
      }
      
      // 验证成员数据格式
      for (const member of orderData.members) {
        if (!member.userId) {
          return ResponseHelper.error(res, '成员数据格式错误', 400);
        }
      }
      
      const result = await diningServiceEnhanced.createDepartmentOrder(
        req.user.id, 
        orderData, 
        req.db
      );
      
      return ResponseHelper.success(res, result, result.message);
    } catch (error) {
      logger.error('部门报餐失败:', error);
      
      if (error.message.includes('权限不足') || error.message.includes('不属于本部门')) {
        return ResponseHelper.error(res, error.message, 403);
      }
      
      if (error.message.includes('已经报餐')) {
        return ResponseHelper.error(res, error.message, 400);
      }
      
      return ResponseHelper.error(res, '部门报餐失败', 500);
    }
  }

  /**
   * 获取部门报餐记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDepartmentOrders(req, res) {
    try {
      const { date, mealType, page, pageSize, startDate, endDate } = req.query;
      
      const result = await diningServiceEnhanced.getDepartmentOrders(req.user.id, {
        date,
        mealType,
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 20,
        startDate,
        endDate
      }, req.db);
      
      return ResponseHelper.success(res, result, '获取部门报餐记录成功');
    } catch (error) {
      logger.error('获取部门报餐记录失败:', error);
      
      if (error.message.includes('权限不足')) {
        return ResponseHelper.error(res, error.message, 403);
      }
      
      return ResponseHelper.error(res, '获取部门报餐记录失败', 500);
    }
  }

  /**
   * 获取部门报餐统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDepartmentOrderStats(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      // 检查是否为系统管理员
      const isSysAdmin = req.user.role === 'sys_admin';
      
      if (isSysAdmin) {
        // 系统管理员：获取所有部门的报餐统计
        return await getAllDepartmentsStats(req, res, { startDate, endDate });
      } else {
        // 部门管理员：获取本部门的报餐统计
        const stats = await diningServiceEnhanced.getDepartmentOrderStats(req.user.id, {
          startDate,
          endDate
        }, req.db);
        
        return ResponseHelper.success(res, stats, '获取部门报餐统计成功');
      }
    } catch (error) {
      logger.error('获取部门报餐统计失败:', error);
      
      if (error.message.includes('权限不足')) {
        return ResponseHelper.error(res, error.message, 403);
      }
      
      return ResponseHelper.error(res, '获取部门报餐统计失败', 500);
    }
  }



  /**
   * 获取部门报餐概览（今日报餐情况）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDepartmentOrderOverview(req, res) {
    try {
      const today = moment().tz('Asia/Shanghai').format('YYYY-MM-DD');
      
      // 检查是否为系统管理员
      const isSysAdmin = req.user.role === 'sys_admin';
      
      if (isSysAdmin) {
        // 系统管理员：获取所有部门的报餐概览
        return await getAllDepartmentsOverview(req, res, today);
      } else {
        // 部门管理员：获取本部门的报餐概览
        return await getSingleDepartmentOverview(req, res, today);
      }
    } catch (error) {
      logger.error('获取部门报餐概览失败:', error);
      
      if (error.message.includes('权限不足')) {
        return ResponseHelper.error(res, error.message, 403);
      }
      
      return ResponseHelper.error(res, '获取部门报餐概览失败', 500);
    }
  }

  /**
   * 批量创建部门报餐订单
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createBatchDepartmentOrders(req, res) {
    try {
      const adminUserId = req.user.id;
      const { orders } = req.body;

      if (!orders || !Array.isArray(orders) || orders.length === 0) {
        return ResponseHelper.error(res, '订单列表不能为空', 400);
      }

      if (orders.length > 20) {
        return ResponseHelper.error(res, '单次最多只能提交20个订单', 400);
      }

      const result = await diningServiceEnhanced.createBatchDepartmentOrders(adminUserId, orders, req.db);

      logger.info(`批量报餐提交成功: 管理员 ${adminUserId}, 总订单: ${result.totalOrders}, 成功: ${result.successCount}, 失败: ${result.failedCount}`);

      return ResponseHelper.success(res, result, '批量报餐提交完成');
    } catch (error) {
      logger.error('批量报餐提交失败:', error);
      
      if (error.message.includes('管理员权限不足')) {
        return ResponseHelper.error(res, error.message, 403);
      }
      
      return ResponseHelper.error(res, '批量报餐提交失败', 500);
    }
  }

  /**
   * 快速批量报餐（为固定成员报多个餐次）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createQuickBatchOrders(req, res) {
    try {
      const adminUserId = req.user.id;
      const { members, meals, remark } = req.body;

      if (!members || !Array.isArray(members) || members.length === 0) {
        return ResponseHelper.error(res, '成员列表不能为空', 400);
      }

      if (!meals || !Array.isArray(meals) || meals.length === 0) {
        return ResponseHelper.error(res, '餐次列表不能为空', 400);
      }

      if (meals.length > 10) {
        return ResponseHelper.error(res, '单次最多只能选择10个餐次', 400);
      }

      const result = await diningServiceEnhanced.createQuickBatchOrders(adminUserId, members, meals, remark, req.db);

      logger.info(`快速批量报餐提交成功: 管理员 ${adminUserId}, 成员: ${members.length}, 餐次: ${meals.length}, 成功: ${result.successCount}, 失败: ${result.failedCount}`);

      return ResponseHelper.success(res, result, '快速批量报餐提交完成');
    } catch (error) {
      logger.error('快速批量报餐提交失败:', error);
      
      if (error.message.includes('管理员权限不足')) {
        return ResponseHelper.error(res, error.message, 403);
      }
      
      return ResponseHelper.error(res, '快速批量报餐提交失败', 500);
    }
  }

}

/**
 * 获取单个部门的报餐概览（部门管理员）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {string} today - 今日日期
 */
async function getSingleDepartmentOverview(req, res, today) {
  // 获取今日报餐统计
  const todayStats = await diningServiceEnhanced.getDepartmentOrderStats(req.user.id, {
    startDate: today,
    endDate: today
  }, req.db);
  
  // 获取部门成员列表
  const members = await diningServiceEnhanced.getDeptMembers(req.user.id, req.db, {
    includeInactive: false
  });
  
  // 获取今日报餐记录
  const todayOrders = await diningServiceEnhanced.getDepartmentOrders(req.user.id, {
    date: today,
    page: 1,
    pageSize: 1000
  }, req.db);
    
    // 构建报餐状态
    const memberOrderStatus = members.map(member => {
      // 查找包含该成员的所有报餐记录
      const orders = todayOrders.list.filter(o => 
        o.memberIds && o.memberIds.includes(member._id)
      );
      
      // 构建所有报餐信息
      const allOrderInfo = orders.map(order => ({
        mealType: order.mealType,
        orderTime: order.orderTime,
        status: order.status
      }));
      
      return {
        _id: member._id,
        nickName: member.nickName, // 统一使用nickName字段
        name: member.name,     // 保留name字段以兼容性
        role: member.role,
        avatarUrl: member.avatarUrl,
        phoneNumber: member.phoneNumber,
        email: member.email,
        status: member.status,
        isDepartmentAdmin: member.isDepartmentAdmin,
        hasOrdered: orders.length > 0,
        orderInfo: allOrderInfo.length > 0 ? allOrderInfo : null,
        // 为了向后兼容，保留单个orderInfo字段（取第一个）
        singleOrderInfo: allOrderInfo.length > 0 ? allOrderInfo[0] : null
      };
    });
    
  return ResponseHelper.success(res, {
    date: today,
    departmentName: todayStats.departmentName,
    totalMembers: todayStats.totalMembers,
    todayStats: {
      totalOrders: todayStats.totalOrders,
      uniqueUsers: todayStats.uniqueUsers,
      participationRate: todayStats.participationRate,
      mealTypeStats: todayStats.mealTypeStats
    },
    members: memberOrderStatus
  }, '获取部门报餐概览成功');
}

/**
 * 获取所有部门的报餐概览（系统管理员）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {string} today - 今日日期
 */
async function getAllDepartmentsOverview(req, res, today) {
  // 获取所有部门列表
  const [departments] = await req.db.execute(`
    SELECT _id, name, code FROM departments WHERE status = 'active' ORDER BY name
  `);
  
  const allDepartmentsData = [];
  let totalStats = {
    totalOrders: 0,
    uniqueUsers: 0,
    totalMembers: 0,
    mealTypeStats: {
      breakfast: 0,
      lunch: 0,
      dinner: 0
    }
  };
  
  // 为每个部门获取报餐概览
  for (const dept of departments) {
    try {
      // 获取部门今日报餐统计
      const deptStats = await diningServiceEnhanced.getDepartmentOrderStatsForDept(dept._id, {
        startDate: today,
        endDate: today
      }, req.db);
      
      // 获取部门成员列表
      const deptMembers = await diningServiceEnhanced.getDeptMembersForDept(dept._id, req.db, {
        includeInactive: false
      });
      
      // 获取部门今日报餐记录
      const deptOrders = await diningServiceEnhanced.getDepartmentOrdersForDept(dept._id, {
        date: today,
        page: 1,
        pageSize: 1000
      }, req.db);
      
      // 构建部门成员报餐状态
      const memberOrderStatus = deptMembers.map(member => {
        const orders = deptOrders.list.filter(o => 
          o.memberIds && o.memberIds.includes(member._id)
        );
        
        const allOrderInfo = orders.map(order => ({
          mealType: order.mealType,
          orderTime: order.orderTime,
          status: order.status
        }));
        
        return {
          _id: member._id,
          nickName: member.nickName,
          name: member.name,
          role: member.role,
          avatarUrl: member.avatarUrl,
          phoneNumber: member.phoneNumber,
          email: member.email,
          status: member.status,
          isDepartmentAdmin: member.isDepartmentAdmin,
          hasOrdered: orders.length > 0,
          orderInfo: allOrderInfo.length > 0 ? allOrderInfo : null,
          singleOrderInfo: allOrderInfo.length > 0 ? allOrderInfo[0] : null
        };
      });
      
      allDepartmentsData.push({
        departmentId: dept._id,
        departmentName: dept.name,
        departmentCode: dept.code,
        totalMembers: deptStats.totalMembers,
        todayStats: {
          totalOrders: deptStats.totalOrders,
          uniqueUsers: deptStats.uniqueUsers,
          participationRate: deptStats.participationRate,
          mealTypeStats: deptStats.mealTypeStats
        },
        members: memberOrderStatus
      });
      
      // 累加总统计
      totalStats.totalOrders += deptStats.totalOrders;
      totalStats.uniqueUsers += deptStats.uniqueUsers;
      totalStats.totalMembers += deptStats.totalMembers;
      totalStats.mealTypeStats.breakfast += parseInt(deptStats.mealTypeStats.breakfast) || 0;
      totalStats.mealTypeStats.lunch += parseInt(deptStats.mealTypeStats.lunch) || 0;
      totalStats.mealTypeStats.dinner += parseInt(deptStats.mealTypeStats.dinner) || 0;
      
    } catch (error) {
      logger.error(`获取部门 ${dept.name} 报餐概览失败:`, error);
      // 继续处理其他部门，不中断整个流程
    }
  }
  
  // 计算总参与率
  totalStats.participationRate = totalStats.totalMembers > 0 
    ? Math.round((totalStats.uniqueUsers / totalStats.totalMembers) * 100) 
    : 0;
  
  return ResponseHelper.success(res, {
    date: today,
    viewType: 'all_departments',
    totalStats: totalStats,
    departments: allDepartmentsData
  }, '获取所有部门报餐概览成功');
}

/**
 * 获取所有部门的报餐统计（系统管理员）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Object} queryParams - 查询参数
 */
async function getAllDepartmentsStats(req, res, queryParams) {
  try {
    // 获取所有部门列表
    const [departments] = await req.db.execute(`
      SELECT _id, name, code FROM departments WHERE status = 'active' ORDER BY name
    `);
    
    const allDepartmentsStats = [];
    let totalStats = {
      totalOrders: 0,
      uniqueUsers: 0,
      totalMembers: 0,
      orderDays: 0,
      mealTypeStats: {
        breakfast: 0,
        lunch: 0,
        dinner: 0
      }
    };
    
    // 为每个部门获取报餐统计
    for (const dept of departments) {
      try {
        const deptStats = await diningServiceEnhanced.getDepartmentOrderStatsForDept(dept._id, queryParams, req.db);
        
        allDepartmentsStats.push({
          departmentId: dept._id,
          departmentName: dept.name,
          departmentCode: dept.code,
          ...deptStats
        });
        
        // 累加总统计
        totalStats.totalOrders += deptStats.totalOrders;
        totalStats.uniqueUsers += deptStats.uniqueUsers;
        totalStats.totalMembers += deptStats.totalMembers;
        totalStats.orderDays += deptStats.orderDays;
        totalStats.mealTypeStats.breakfast += parseInt(deptStats.mealTypeStats.breakfast) || 0;
        totalStats.mealTypeStats.lunch += parseInt(deptStats.mealTypeStats.lunch) || 0;
        totalStats.mealTypeStats.dinner += parseInt(deptStats.mealTypeStats.dinner) || 0;
        
      } catch (error) {
        logger.error(`获取部门 ${dept.name} 报餐统计失败:`, error);
        // 继续处理其他部门，不中断整个流程
      }
    }
    
    // 计算总参与率
    totalStats.participationRate = totalStats.totalMembers > 0 
      ? Math.round((totalStats.uniqueUsers / totalStats.totalMembers) * 100) 
      : 0;
    
    return ResponseHelper.success(res, {
      viewType: 'all_departments',
      totalStats: totalStats,
      departments: allDepartmentsStats
    }, '获取所有部门报餐统计成功');
    
  } catch (error) {
    logger.error('获取所有部门报餐统计失败:', error);
    throw error;
  }
}

module.exports = new DiningControllerEnhanced();
