const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const logger = require('../utils/logger');

// ================================
// 1. 系统统计模块
// ================================

/**
 * 获取系统统计数据
 */
const getSystemStats = async (db) => {
  try {
    // 获取总用户数
    const [userResult] = await db.execute('SELECT COUNT(*) as total FROM users WHERE status = "active"');
    const totalUsers = userResult[0].total;

    // 获取今日订单数
    const today = moment().tz('Asia/Shanghai').format('YYYY-MM-DD');
    const [orderResult] = await db.execute(
      'SELECT COUNT(*) as total FROM dining_orders WHERE DATE(createTime) = ?',
      [today]
    );
    const todayOrders = orderResult[0].total;

    // 获取场地总数
    const [venueResult] = await db.execute('SELECT COUNT(*) as total FROM venues WHERE status = "open"');
    const totalVenues = venueResult[0].total;

    // 获取今日预约数
    const [reservationResult] = await db.execute(
      'SELECT COUNT(*) as total FROM reservations WHERE reservationDate = ? AND status != "cancelled"',
      [today]
    );
    const todayReservations = reservationResult[0].total;

    // 计算月度增长率
    const lastMonth = moment().tz('Asia/Shanghai').subtract(1, 'month').format('YYYY-MM');
    const currentMonth = moment().tz('Asia/Shanghai').format('YYYY-MM');

    // 用户增长率
    const [lastMonthUsers] = await db.execute(
      'SELECT COUNT(*) as total FROM users WHERE DATE_FORMAT(createTime, "%Y-%m") = ?',
      [lastMonth]
    );
    const [currentMonthUsers] = await db.execute(
      'SELECT COUNT(*) as total FROM users WHERE DATE_FORMAT(createTime, "%Y-%m") = ?',
      [currentMonth]
    );
    
    const userGrowth = lastMonthUsers[0].total > 0 
      ? ((currentMonthUsers[0].total - lastMonthUsers[0].total) / lastMonthUsers[0].total * 100).toFixed(1)
      : 0;

    return {
      totalUsers,
      todayOrders,
      totalVenues,
      todayReservations,
      monthlyGrowth: {
        users: parseFloat(userGrowth),
        orders: 8.7, // 示例数据
        reservations: 12.3 // 示例数据
      }
    };
  } catch (error) {
    throw new Error(`获取系统统计数据失败: ${error.message}`);
  }
};

/**
 * 获取系统状态
 */
const getSystemStatus = async (db) => {
  try {
    let dbStatus = true;
    let apiStatus = true;
    
    try {
      await db.execute('SELECT 1');
    } catch (err) {
      dbStatus = false;
    }

    return {
      status: {
        apiStatus,
        dbStatus,
        storageStatus: true,
        functionStatus: true
      },
      info: {
        version: '1.0.0',
        dbVersion: 'MySQL 8.0',
        serverTime: new Date().toISOString(),
        uptime: '72天3小时',
        memoryUsage: '45%'
      }
    };
  } catch (error) {
    throw new Error(`获取系统状态失败: ${error.message}`);
  }
};

// ================================
// 2. 菜单管理模块
// ================================

/**
 * 保存菜单草稿
 */
const saveMenuDraft = async (db, menuData) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { date, mealType, dishes, description, adminId } = menuData;
    
    // 检查是否已存在相同日期和餐次的菜单
    const [existing] = await connection.execute(
      'SELECT _id, publishStatus FROM menus WHERE publishDate = ? AND mealType = ?',
      [date, mealType]
    );
    
    let menuId;
    
    if (existing.length > 0) {
      // 如果存在，更新现有菜单
      menuId = existing[0]._id;
      const existingStatus = existing[0].publishStatus;
      
      if (existingStatus === 'published') {
        throw new Error('当日该餐次菜单已发布，请先撤回后再编辑');
      }
      
      // 更新菜单基本信息
      await connection.execute(
        'UPDATE menus SET description = ?, publisherId = ?, updateTime = NOW() WHERE _id = ?',
        [description, adminId, menuId]
      );
      
      // 删除现有菜品关联
      await connection.execute('DELETE FROM menu_dishes WHERE menuId = ?', [menuId]);
      
      console.log(`更新现有菜单草稿: ${menuId}`);
    } else {
      // 如果不存在，创建新菜单
      menuId = uuidv4();
      
      await connection.execute(
        'INSERT INTO menus (_id, publishDate, mealType, description, publishStatus, publisherId, createTime) VALUES (?, ?, ?, ?, ?, ?, NOW())',
        [menuId, date, mealType, description, 'draft', adminId]
      );
      
      console.log(`创建新菜单草稿: ${menuId}`);
    }
    
    // 保存菜单菜品关联
    if (dishes && dishes.length > 0) {
      for (const dish of dishes) {
        await connection.execute(
          'INSERT INTO menu_dishes (_id, menuId, dishId, price, sort, createTime) VALUES (?, ?, ?, ?, ?, NOW())',
          [uuidv4(), menuId, dish.dishId, dish.price || 0, dish.sort || 0]
        );
      }
    }
    
    await connection.commit();
    
    return { id: menuId, ...menuData };
  } catch (error) {
    await connection.rollback();
    throw new Error(`保存菜单草稿失败: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * 发布菜单
 */
const publishMenu = async (db, menuData) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { date, mealType } = menuData;
    
    // 检查是否已有当日菜单
    const [existing] = await connection.execute(
      'SELECT _id, publishStatus FROM menus WHERE publishDate = ? AND mealType = ?',
      [date, mealType]
    );
    
    if (existing.length > 0) {
      const existingStatus = existing[0].publishStatus;
      
      if (existingStatus === 'published') {
        throw new Error('当日该餐次菜单已发布，请先撤回');
      }
      
      // 如果存在草稿，直接发布现有菜单
      const menuId = existing[0]._id;
      
      await connection.execute(
        'UPDATE menus SET publishStatus = "published", updateTime = NOW() WHERE _id = ?',
        [menuId]
      );
      
      await connection.commit();
      return { id: menuId, ...menuData };
    }
    
    // 如果不存在，创建新菜单并发布
    const result = await saveMenuDraft(db, { ...menuData, status: 'published' });
    
    // 更新状态为已发布
    await connection.execute(
      'UPDATE menus SET publishStatus = "published" WHERE _id = ?',
      [result.id]
    );
    
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * 获取菜单的菜品列表
 */
const getMenuDishes = async (db, menuId) => {
  try {
    const sql = `
      SELECT 
        md._id,
        md.menuId,
        md.dishId,
        md.price,
        md.sort,
        d.name as dishName,
        d.description as dishDescription,
        d.image as dishImage,
        dc.name as categoryName
      FROM menu_dishes md
      LEFT JOIN dishes d ON md.dishId = d._id
      LEFT JOIN dish_categories dc ON d.categoryId = dc._id
      WHERE md.menuId = ?
      ORDER BY md.sort ASC
    `;
    
    const [dishes] = await db.execute(sql, [menuId]);
    return dishes;
  } catch (error) {
    throw new Error(`获取菜单菜品失败: ${error.message}`);
  }
};

/**
 * 设置菜单菜品
 */
const setMenuDishes = async (db, menuId, dishItems) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 删除现有菜品关联
    await connection.execute('DELETE FROM menu_dishes WHERE menuId = ?', [menuId]);
    
    // 插入新的菜品关联
    if (dishItems && dishItems.length > 0) {
      const insertSql = `
        INSERT INTO menu_dishes (_id, menuId, dishId, price, sort, createTime) 
        VALUES (UUID(), ?, ?, ?, ?, NOW())
      `;
      
      for (const item of dishItems) {
        await connection.execute(insertSql, [
          menuId,
          item.dishId,
          item.price || 0,
          item.sort || 0
        ]);
      }
    }
    
    await connection.commit();
    return { success: true, message: '菜单菜品设置成功' };
    
  } catch (error) {
    await connection.rollback();
    throw new Error(`设置菜单菜品失败: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * 获取菜单历史
 */
const getMenuHistory = async (db, { page, pageSize, filters }) => {
  let connection;
  try {
    connection = await db.getConnection();
    
    // 构建查询条件
    let whereConditions = [];
    const params = [];
    
    if (filters.startDate) {
      whereConditions.push('m.publishDate >= ?');
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      whereConditions.push('m.publishDate <= ?');
      params.push(filters.endDate);
    }
    
    if (filters.mealType) {
      whereConditions.push('m.mealType = ?');
      params.push(filters.mealType);
    }
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM menus m ${whereClause}`;
    const [countResult] = await connection.execute(countSql, params);
    const total = countResult[0].total;
    
    // 获取分页数据
    const offset = (page - 1) * pageSize;
    const limit = parseInt(pageSize);
    const offsetValue = parseInt(offset);
    
    const dataSql = `
      SELECT 
        m._id, 
        COALESCE(m.name, CONCAT('菜单-', DATE_FORMAT(m.publishDate, '%Y-%m-%d'), '-', 
          CASE m.mealType 
            WHEN 'breakfast' THEN '早餐'
            WHEN 'lunch' THEN '午餐' 
            WHEN 'dinner' THEN '晚餐'
            ELSE m.mealType
          END)) as name,
        m.publishDate, 
        m.mealType, 
        COALESCE(NULLIF(m.description, ''), '暂无描述') as description,
        m.publishStatus, 
        m.publisherId, 
        m.createTime, 
        COALESCE(u.nickName, '未知用户') as publish_by_name,
        (SELECT COUNT(*) FROM menu_dishes md WHERE md.menuId = m._id) as dish_count,
        (SELECT SUM(md.price) FROM menu_dishes md WHERE md.menuId = m._id) as total_price
      FROM menus m 
      LEFT JOIN users u ON m.publisherId = u._id 
      ${whereClause} 
      ORDER BY m.publishDate DESC, m.createTime DESC 
      LIMIT ${limit} OFFSET ${offsetValue}
    `;
    
    const [menus] = await connection.execute(dataSql, params);
    
    // 为每个菜单获取菜品信息
    const enrichedMenus = await Promise.all(menus.map(async (menu) => {
      try {
        // 获取菜单菜品信息
        const [dishes] = await connection.execute(`
          SELECT 
            d._id as dishId,
            d.name as dishName,
            d.image as dishImage,
            d.price as originalPrice,
            md.price as menuPrice,
            md.sort,
            dc.name as categoryName
          FROM menu_dishes md
          LEFT JOIN dishes d ON md.dishId = d._id
          LEFT JOIN dish_categories dc ON d.categoryId = dc._id
          WHERE md.menuId = ?
          ORDER BY md.sort ASC, d.name ASC
        `, [menu._id]);
        
        // 格式化餐次显示
        const mealTypeMap = {
          'breakfast': '早餐',
          'lunch': '午餐',
          'dinner': '晚餐'
        };
        
        // 格式化状态显示
        const statusMap = {
          'draft': '草稿',
          'published': '已发布',
          'revoked': '已撤回'
        };
        
        return {
          ...menu,
          mealTypeDisplay: mealTypeMap[menu.mealType] || menu.mealType,
          publishStatusDisplay: statusMap[menu.publishStatus] || menu.publishStatus,
          dishCount: parseInt(menu.dish_count) || 0,
          totalPrice: parseFloat(menu.total_price) || 0,
          dishes: dishes.map(dish => ({
            dishId: dish.dishId,
            dishName: dish.dishName,
            dishImage: dish.dishImage,
            originalPrice: parseFloat(dish.originalPrice) || 0,
            menuPrice: parseFloat(dish.menuPrice) || 0,
            categoryName: dish.categoryName,
            sort: parseInt(dish.sort) || 0
          })),
          // 添加统计信息
          stats: {
            dishCount: dishes.length,
            totalPrice: dishes.reduce((sum, dish) => sum + (parseFloat(dish.menuPrice) || 0), 0),
            hasImage: dishes.some(dish => dish.dishImage),
            categories: [...new Set(dishes.map(dish => dish.categoryName).filter(Boolean))]
          }
        };
      } catch (error) {
        console.error(`获取菜单 ${menu._id} 菜品信息失败:`, error);
        return {
          ...menu,
          mealTypeDisplay: menu.mealType,
          publishStatusDisplay: menu.publishStatus,
          dishCount: 0,
          totalPrice: 0,
          dishes: [],
          stats: {
            dishCount: 0,
            totalPrice: 0,
            hasImage: false,
            categories: []
          }
        };
      }
    }));
    
    return {
      list: enrichedMenus,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      // 添加汇总统计
      summary: {
        totalMenus: total,
        publishedMenus: enrichedMenus.filter(m => m.publishStatus === 'published').length,
        draftMenus: enrichedMenus.filter(m => m.publishStatus === 'draft').length,
        totalDishes: enrichedMenus.reduce((sum, m) => sum + m.stats.dishCount, 0),
        averageDishCount: enrichedMenus.length > 0 ? 
          Math.round(enrichedMenus.reduce((sum, m) => sum + m.stats.dishCount, 0) / enrichedMenus.length * 100) / 100 : 0
      }
    };
  } catch (error) {
    throw new Error(`获取菜单历史失败: ${error.message}`);
  } finally {
    if (connection) connection.release();
  }
};

/**
 * 根据日期和餐次获取菜单
 */
const getMenuByDate = async (db, { date, mealType }) => {
  try {
    const sql = `
      SELECT 
        m._id, m.name, m.publishDate, m.mealType, m.description, 
        m.publishStatus, m.publisherId, m.createTime,
        u.nickName as publish_by_name
      FROM menus m 
      LEFT JOIN users u ON m.publisherId = u._id 
      WHERE m.publishDate = ? AND m.mealType = ?
      ORDER BY m.createTime DESC
      LIMIT 1
    `;
    
    const [menus] = await db.execute(sql, [date, mealType]);
    
    if (menus.length === 0) {
      return null;
    }
    
    const menu = menus[0];
    
    // 获取菜单菜品
    const menuDishes = await getMenuDishes(db, menu._id);
    
    return {
      ...menu,
      dishes: menuDishes
    };
  } catch (error) {
    throw new Error(`获取指定日期菜单失败: ${error.message}`);
  }
};

/**
 * 获取菜单模板
 */
const getMenuTemplates = async (db) => {
  try {
    // 检查表是否存在
    const [tables] = await db.execute('SHOW TABLES LIKE "menu_templates"');
    if (tables.length === 0) {
      // 表不存在，返回空数组
      return [];
    }
    
    const [templates] = await db.execute(
      'SELECT * FROM menu_templates WHERE status = "active" ORDER BY createTime DESC'
    );
    
    return templates;
  } catch (error) {
    // 如果查询失败，返回空数组而不是抛出错误
    console.warn('获取菜单模板时出现问题，返回空数组:', error.message);
    return [];
  }
};

/**
 * 撤回菜单
 */
const revokeMenu = async (db, menuId, adminId) => {
  try {
    const [result] = await db.execute(
      'UPDATE menus SET publishStatus = "revoked", updateTime = NOW(), updateBy = ? WHERE _id = ? AND publishStatus = "published"',
      [adminId, menuId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('菜单不存在或状态不允许撤回');
    }
  } catch (error) {
    throw new Error(`撤回菜单失败: ${error.message}`);
  }
};

/**
 * 删除菜单模板
 */
const deleteMenuTemplate = async (db, templateId) => {
  try {
    const [result] = await db.execute(
      'UPDATE menu_templates SET status = "deleted", updateTime = NOW() WHERE _id = ?',
      [templateId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('菜单模板不存在');
    }
  } catch (error) {
    throw new Error(`删除菜单模板失败: ${error.message}`);
  }
};

// ================================
// 3. 用户管理模块
// ================================

/**
 * 获取用户列表
 */
const getUsers = async (db, { page, pageSize, filters }) => {
  try {
    let whereClause = 'WHERE u.status != "deleted"';
    const params = [];
    
    if (filters.keyword) {
      whereClause += ' AND (u.nickName LIKE ? OR u.phoneNumber LIKE ? OR u.email LIKE ?)';
      const keyword = `%${filters.keyword}%`;
      params.push(keyword, keyword, keyword);
    }
    
    if (filters.role) {
      whereClause += ' AND u.role = ?';
      params.push(filters.role);
    }
    
    if (filters.status) {
      whereClause += ' AND u.status = ?';
      params.push(filters.status);
    }
    
    if (filters.departmentId) {
      whereClause += ' AND u.departmentId = ?';
      params.push(filters.departmentId);
    }
    
    // 获取总数
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    
    // 获取分页数据
    const offset = (page - 1) * pageSize;
    const [users] = await db.execute(
      `SELECT u.*, d.name as department_name 
       FROM users u 
       LEFT JOIN departments d ON u.departmentId = d._id 
       ${whereClause} 
       ORDER BY u.createTime DESC 
       LIMIT ${pageSize} OFFSET ${offset}`
    );
    
    // 移除敏感信息
    const safeUsers = users.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });
    
    return {
      list: safeUsers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    throw new Error(`获取用户列表失败: ${error.message}`);
  }
};

/**
 * 获取用户详情
 */
const getUserDetail = async (db, userId) => {
  try {
    const [users] = await db.execute(
      `SELECT u.*, d.name as department_name 
       FROM users u 
       LEFT JOIN departments d ON u.departmentId = d._id 
       WHERE u._id = ? AND u.status != "deleted"`,
      [userId]
    );
    
    if (users.length === 0) {
      throw new Error('用户不存在');
    }
    
    const { password, ...user } = users[0];
    
    // 暂时跳过权限查询，因为相关表可能不存在
    // TODO: 如果后续需要权限功能，需要创建相应的表
    user.permissions = [];
    
    return user;
  } catch (error) {
    throw new Error(`获取用户详情失败: ${error.message}`);
  }
};

/**
 * 创建用户
 */
const createUser = async (db, userData) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const {
      realName, phoneNumber, email, gender, departmentId,
      roleId, password, status = 'active', createBy
    } = userData;
    
    // 检查手机号是否已存在
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE phoneNumber = ? AND status != "deleted"',
      [phoneNumber]
    );
    
    if (existing.length > 0) {
      throw new Error('手机号已存在');
    }
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    // 创建用户
    await db.execute(
      `INSERT INTO users (
        _id, nickName, phoneNumber, email, gender, departmentId,
        role, password, status, createBy, createTime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId, realName, phoneNumber, email, gender, departmentId,
        roleId || 'user', hashedPassword, status, createBy
      ]
    );
    
    await connection.commit();
    
    return { id: userId, realName, phoneNumber, email, status };
  } catch (error) {
    await connection.rollback();
    throw new Error(`创建用户失败: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * 更新用户信息
 */
const updateUser = async (db, userId, userData) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const updateFields = [];
    const updateValues = [];
    
    // 构建更新字段（只包含用户表中实际存在的字段）
    const allowedFields = [
      'nickName', 'phoneNumber', 'email', 'gender', 'departmentId',
      'role', 'status', 'department', 'avatarUrl', 'password'
    ];
    
    // 特殊处理departmentId字段，验证外键约束
    if (userData.departmentId) {
      const [deptCheck] = await connection.execute('SELECT _id FROM departments WHERE _id = ?', [userData.departmentId]);
      if (deptCheck.length === 0) {
        throw new Error(`部门ID ${userData.departmentId} 不存在`);
      }
    }
    
    // 特殊处理role字段，验证角色是否有效
    if (userData.role) {
      const validRoles = ['user', 'admin', 'dept_admin', 'sys_admin'];
      if (!validRoles.includes(userData.role)) {
        throw new Error(`无效的用户角色: ${userData.role}，有效角色为: ${validRoles.join(', ')}`);
      }
    }
    
    allowedFields.forEach(field => {
      if (userData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(userData[field]);
      }
    });
    
    // 处理密码更新
    if (userData.password && userData.resetPassword) {
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      updateFields.push('password = ?');
      updateValues.push(hashedPassword);
    }
    
    if (updateFields.length === 0) {
      throw new Error('没有可更新的字段');
    }
    
    updateFields.push('updateTime = NOW()');
    updateValues.push(userId);
    
    const [result] = await connection.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE _id = ? AND status != "deleted"`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      throw new Error('用户不存在或已被删除');
    }
    
    await connection.commit();
    
    // 返回更新后的用户信息
    return await getUserDetail(db, userId);
  } catch (error) {
    await connection.rollback();
    throw new Error(`更新用户信息失败: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * 更新用户状态
 */
const updateUserStatus = async (db, userId, status, reason, adminId) => {
  try {
    const [result] = await db.execute(
      'UPDATE users SET status = ?, updateTime = NOW() WHERE _id = ? AND status != "deleted"',
      [status, userId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('用户不存在或已被删除');
    }
    
    // 记录状态变更日志
    await db.execute(
      'INSERT INTO user_activity_logs (id, userId, action, description, createTime, createBy) VALUES (?, ?, ?, ?, NOW(), ?)',
      [uuidv4(), userId, 'status_change', `状态变更为${status}，原因：${reason || '无'}`, adminId]
    );
  } catch (error) {
    throw new Error(`更新用户状态失败: ${error.message}`);
  }
};

/**
 * 删除用户
 */
const deleteUser = async (db, userId, adminId) => {
  try {
    // 先检查用户是否存在
    const [userCheck] = await db.execute(
      'SELECT * FROM users WHERE _id = ?',
      [userId]
    );
    
    if (userCheck.length === 0) {
      throw new Error('用户不存在');
    }
    
    // 如果用户已被标记为inactive，则直接返回成功
    if (userCheck[0].status === 'inactive') {
      return { message: '用户已被删除' };
    }
    
    // 更新用户状态
    const [result] = await db.execute(
      'UPDATE users SET status = "inactive", updateTime = NOW() WHERE _id = ?',
      [userId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('更新用户状态失败');
    }
  } catch (error) {
    throw new Error(`删除用户失败: ${error.message}`);
  }
};

/**
 * 批量删除用户
 */
const batchDeleteUsers = async (db, userIds, adminId) => {
  try {
    // 使用传入的db连接直接执行事务操作
    // 先检查所有用户是否存在
    const placeholders = userIds.map(() => '?').join(',');
    const [existingUsers] = await db.execute(
      `SELECT _id, status FROM users WHERE _id IN (${placeholders})`,
      [...userIds]
    );
    
    // 检查不存在的用户
    const existingIds = new Set(existingUsers.map(user => user._id));
    const nonExistingIds = userIds.filter(id => !existingIds.has(id));
    
    if (nonExistingIds.length > 0) {
      throw new Error(`用户不存在: ${nonExistingIds.join(', ')}`);
    }
    
    // 更新活跃用户的状态
    const activeUserIds = existingUsers
      .filter(user => user.status !== 'inactive')
      .map(user => user._id);
    
    let successCount = 0;
    if (activeUserIds.length > 0) {
      const activePlaceholders = activeUserIds.map(() => '?').join(',');
      const [result] = await db.execute(
        `UPDATE users SET status = "inactive", updateTime = NOW() WHERE _id IN (${activePlaceholders})`,
        [...activeUserIds]
      );
      successCount = result.affectedRows;
    }
    
    return {
      successCount: successCount,
      totalCount: userIds.length,
      alreadyDeletedCount: userIds.length - activeUserIds.length
    };
  } catch (error) {
    throw new Error(`批量删除用户失败: ${error.message}`);
  }
};

/**
 * 获取用户活动记录
 */
const getUserActivities = async (db, userId, { page, pageSize }) => {
  try {
    // 获取总数
    const [countResult] = await db.execute(
      'SELECT COUNT(*) as total FROM user_activity_logs WHERE userId = ?',
      [userId]
    );
    const total = countResult[0].total;
    
    // 获取分页数据
    const offset = (page - 1) * pageSize;
    const [activities] = await db.execute(
      'SELECT * FROM user_activity_logs WHERE userId = ? ORDER BY createTime DESC LIMIT ? OFFSET ?',
      [userId, pageSize, offset]
    );
    
    return {
      list: activities,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    throw new Error(`获取用户活动记录失败: ${error.message}`);
  }
};

/**
 * 获取用户资料
 */
const getUserProfile = async (userId, db) => {
  let connection;
  try {
    connection = await db.getConnection();
    
    const [rows] = await connection.execute(
      `SELECT 
        u._id,
        u.nickName,
        u.phoneNumber,
        u.email,
        u.avatarUrl,
        u.role,
        u.department,
        u.departmentId,
        u.status,
        u.createTime,
        u.updateTime,
        u.lastLoginTime,
        u.gender,
        u.country,
        u.province,
        u.city,
        u.language
      FROM users u
      WHERE u._id = ? AND u.status = 'active'`,
      [userId]
    );
    
    if (rows.length === 0) {
      throw new Error('用户不存在');
    }
    
    return rows[0];
  } catch (error) {
    logger.error('获取用户资料失败:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * 更新用户资料
 */
const updateUserProfile = async (userId, updateData, db) => {
  let connection;
  try {
    connection = await db.getConnection();
    
    // 验证必填字段
    const { nickName, email, phoneNumber, department, departmentId } = updateData;
    
    if (!nickName) {
      throw new Error('昵称不能为空');
    }
    
    // 检查邮箱是否已被其他用户使用（如果提供了邮箱）
    if (email) {
      const [existingUsers] = await connection.execute(
        'SELECT _id FROM users WHERE email = ? AND _id != ?',
        [email, userId]
      );
      
      if (existingUsers.length > 0) {
        throw new Error('该邮箱已被其他用户使用');
      }
    }
    
    // 检查手机号是否已被其他用户使用（如果提供了手机号）
    if (phoneNumber) {
      const [existingUsers] = await connection.execute(
        'SELECT _id FROM users WHERE phoneNumber = ? AND _id != ?',
        [phoneNumber, userId]
      );
      
      if (existingUsers.length > 0) {
        throw new Error('该手机号已被其他用户使用');
      }
    }
    
    // 更新用户资料
    const [result] = await connection.execute(
      `UPDATE users 
       SET nickName = ?, email = ?, phoneNumber = ?, department = ?, departmentId = ?, updateTime = NOW()
       WHERE _id = ?`,
      [nickName, email || null, phoneNumber || null, department || null, departmentId || null, userId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('用户不存在或更新失败');
    }
    
    // 返回更新后的用户资料
    return await getUserProfile(userId, db);
  } catch (error) {
    logger.error('更新用户资料失败:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

/**
 * 更新用户头像
 */
const updateUserAvatar = async (userId, avatarUrl, db) => {
  let connection;
  try {
    connection = await db.getConnection();
    
    // 更新头像
    const [result] = await connection.execute(
      'UPDATE users SET avatarUrl = ?, updateTime = NOW() WHERE _id = ?',
      [avatarUrl, userId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('用户不存在或更新失败');
    }
    
    // 返回更新后的用户资料
    return await getUserProfile(userId, db);
  } catch (error) {
    logger.error('更新用户头像失败:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

// ================================
// 4. 角色和部门管理模块
// ================================

/**
 * 获取角色列表
 */
const getRoles = async (db) => {
  try {
    const [roles] = await db.execute(
      `SELECT r.*, COUNT(u._id) as user_count 
       FROM roles r 
       LEFT JOIN users u ON r.name COLLATE utf8mb4_unicode_ci = u.role COLLATE utf8mb4_unicode_ci AND u.status != "deleted"
       WHERE r.status = "active" 
       GROUP BY r.id 
       ORDER BY r.create_time DESC`
    );
    
    // 为每个角色获取权限信息
    const rolesWithPermissions = await Promise.all(
      roles.map(async (role) => {
        try {
          // 获取角色权限
          const [permissions] = await db.execute(
            `SELECT p.* FROM permissions p 
             JOIN role_permissions rp ON p.id = rp.permission_id 
             WHERE rp.role_id = ? AND p.status = 'active'
             ORDER BY p.module, p.action`,
            [role.id]
          );
          
          return {
            ...role,
            permissions: permissions || [],
            permissionCount: permissions ? permissions.length : 0
          };
        } catch (error) {
          // 如果权限表不存在或查询失败，返回空权限数组
          return {
            ...role,
            permissions: [],
            permissionCount: 0
          };
        }
      })
    );
    
    return rolesWithPermissions;
  } catch (error) {
    throw new Error(`获取角色列表失败: ${error.message}`);
  }
};

/**
 * 获取角色详情
 */
const getRoleDetail = async (db, roleId) => {
  try {
    // 获取角色基本信息
    const [roles] = await db.execute(
      'SELECT * FROM roles WHERE id = ? AND status = "active"',
      [roleId]
    );
    
    if (roles.length === 0) {
      throw new Error('角色不存在');
    }
    
    const role = roles[0];
    
    // 获取角色权限
    let permissions = [];
    try {
      const [permissionResult] = await db.execute(
        `SELECT p.* FROM permissions p 
         JOIN role_permissions rp ON p.id = rp.permission_id 
         WHERE rp.role_id = ? AND p.status = 'active'
         ORDER BY p.module, p.action`,
        [roleId]
      );
      permissions = permissionResult || [];
    } catch (error) {
      // 如果权限表不存在，返回空数组
      permissions = [];
    }
    
    // 获取角色下的用户列表
    let assignedUsers = [];
    try {
      const [users] = await db.execute(
        `SELECT _id, nickName, realName, phoneNumber, departmentId, status, createTime
         FROM users 
         WHERE role = ? AND status != "deleted"
         ORDER BY createTime DESC`,
        [role.name]
      );
      assignedUsers = users || [];
    } catch (error) {
      assignedUsers = [];
    }
    
    return {
      ...role,
      permissions,
      permissionCount: permissions.length,
      assignedUsers,
      userCount: assignedUsers.length
    };
  } catch (error) {
    throw new Error(`获取角色详情失败: ${error.message}`);
  }
};

/**
 * 创建角色
 */
const createRole = async (db, roleData) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { name, description, permissions = [], status = 'active', createBy } = roleData;
    const roleId = uuidv4();
    
    // 创建角色
    await db.execute(
      'INSERT INTO roles (id, name, description, status, create_time, create_by) VALUES (?, ?, ?, ?, NOW(), ?)',
      [roleId, name, description, status, createBy]
    );
    
    // 分配权限
    if (permissions.length > 0) {
      const permissionValues = permissions.map(permId => [roleId, permId]);
      await db.execute(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
        [permissionValues]
      );
    }
    
    await connection.commit();
    
    return { id: roleId, name, description, status };
  } catch (error) {
    await connection.rollback();
    throw new Error(`创建角色失败: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * 更新角色
 */
const updateRole = async (db, roleId, roleData) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { name, description, permissions, status, updateBy } = roleData;
    
    // 更新角色基本信息
    const updateFields = [];
    const updateValues = [];
    
    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (description) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    
    if (updateFields.length > 0) {
      updateFields.push('update_time = NOW()');
      updateFields.push('update_by = ?');
      updateValues.push(updateBy);
      updateValues.push(roleId);
      
      await db.execute(
        `UPDATE roles SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }
    
    // 更新权限
    if (permissions) {
      // 删除原有权限
      await db.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
      
      // 添加新权限
      if (permissions.length > 0) {
        const permissionValues = permissions.map(permId => [roleId, permId]);
        await db.execute(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
          [permissionValues]
        );
      }
    }
    
    await connection.commit();
    
    return { id: roleId, ...roleData };
  } catch (error) {
    await connection.rollback();
    throw new Error(`更新角色失败: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * 删除角色
 */
const deleteRole = async (db, roleId) => {
  try {
    // 检查是否有用户使用该角色
    const [users] = await db.execute(
      'SELECT COUNT(*) as count FROM users WHERE role = (SELECT name FROM roles WHERE id = ?) AND status != "deleted"',
      [roleId]
    );
    
    if (users[0].count > 0) {
      throw new Error('该角色正在被使用，无法删除');
    }
    
    // 删除角色权限关联（如果表存在）
    try {
      await db.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    } catch (error) {
      // 如果表不存在，忽略错误
      console.log('role_permissions表不存在，跳过权限删除');
    }
    
    // 删除角色
    await db.execute('UPDATE roles SET status = "deleted", update_time = NOW() WHERE id = ?', [roleId]);
    
  } catch (error) {
    throw new Error(`删除角色失败: ${error.message}`);
  }
};

/**
 * 获取权限列表
 */
const getPermissions = async (db) => {
  try {
    const [permissions] = await db.execute(
      `SELECT * FROM permissions 
       WHERE status = 'active' 
       ORDER BY module, action`
    );
    
    // 按模块分组
    const groupedPermissions = permissions.reduce((acc, permission) => {
      const module = permission.module || 'other';
      if (!acc[module]) {
        acc[module] = [];
      }
      acc[module].push(permission);
      return acc;
    }, {});
    
    return {
      permissions: permissions || [],
      groupedPermissions
    };
  } catch (error) {
    // 如果权限表不存在，返回空数组
    return {
      permissions: [],
      groupedPermissions: {}
    };
  }
};

/**
 * 更新角色权限
 */
const updateRolePermissions = async (db, roleId, permissionIds, adminId) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 检查角色是否存在
    const [roles] = await db.execute('SELECT * FROM roles WHERE id = ? AND status = "active"', [roleId]);
    if (roles.length === 0) {
      throw new Error('角色不存在');
    }
    
    // 删除原有权限
    await db.execute('DELETE FROM role_permissions WHERE role_id = ?', [roleId]);
    
    // 添加新权限
    if (permissionIds && permissionIds.length > 0) {
      const permissionValues = permissionIds.map(permId => [roleId, permId]);
      await db.execute(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
        [permissionValues]
      );
    }
    
    // 更新角色更新时间
    await db.execute(
      'UPDATE roles SET update_time = NOW(), update_by = ? WHERE id = ?',
      [adminId, roleId]
    );
    
    await connection.commit();
    
    return {
      roleId,
      permissionCount: permissionIds ? permissionIds.length : 0,
      updateTime: new Date()
    };
  } catch (error) {
    await connection.rollback();
    throw new Error(`更新角色权限失败: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * 分配角色
 */
const assignRole = async (db, userId, roleId, adminId) => {
  try {
    // 获取角色名称
    const [roles] = await db.execute('SELECT name FROM roles WHERE id = ? AND status = "active"', [roleId]);
    
    if (roles.length === 0) {
      throw new Error('角色不存在或已禁用');
    }
    
    const roleName = roles[0].name;
    
    // 更新用户角色
    const [result] = await db.execute(
      'UPDATE users SET role = ?, updateTime = NOW(), updateBy = ? WHERE _id = ? AND status != "deleted"',
      [roleName, adminId, userId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('用户不存在或已被删除');
    }
  } catch (error) {
    throw new Error(`分配角色失败: ${error.message}`);
  }
};

/**
 * 批量分配角色
 */
const batchAssignRole = async (db, assignments, adminId) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const results = [];
    
    for (const assignment of assignments) {
      const { userId, roleId } = assignment;
      
      try {
        // 获取角色名称
        const [roles] = await db.execute('SELECT name FROM roles WHERE id = ? AND status = "active"', [roleId]);
        
        if (roles.length === 0) {
          results.push({ userId, roleId, success: false, error: '角色不存在' });
          continue;
        }
        
        const roleName = roles[0].name;
        
        // 更新用户角色
        const [result] = await db.execute(
          'UPDATE users SET role = ?, updateTime = NOW(), updateBy = ? WHERE _id = ? AND status != "deleted"',
          [roleName, adminId, userId]
        );
        
        if (result.affectedRows === 0) {
          results.push({ userId, roleId, success: false, error: '用户不存在' });
        } else {
          results.push({ userId, roleId, success: true, roleName });
        }
      } catch (error) {
        results.push({ userId, roleId, success: false, error: error.message });
      }
    }
    
    await connection.commit();
    
    return {
      total: assignments.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    await connection.rollback();
    throw new Error(`批量分配角色失败: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * 获取部门列表
 */
const getDepartments = async (db) => {
  try {
    const [departments] = await db.execute(
      `SELECT d.*, u.nickName as manager_name, COUNT(ud._id) as user_count 
       FROM departments d 
       LEFT JOIN users u ON d.managerId = u._id 
       LEFT JOIN users ud ON d._id = ud.departmentId AND ud.status != "deleted"
       WHERE d.status = "active" 
       GROUP BY d._id 
       ORDER BY d.sort ASC, d.createTime DESC`
    );
    
    return departments;
  } catch (error) {
    throw new Error(`获取部门列表失败: ${error.message}`);
  }
};

/**
 * 创建部门
 */
const createDepartment = async (db, deptData) => {
  try {
    const { name, description, parentId, managerId, sort = 0, status = 'active', createBy } = deptData;
    const deptId = uuidv4();
    
    await db.execute(
      'INSERT INTO departments (_id, name, description, parentId, managerId, sort, status, createTime, createBy) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)',
      [deptId, name, description, parentId, managerId, sort, status, createBy]
    );
    
    return { id: deptId, name, description, status };
  } catch (error) {
    throw new Error(`创建部门失败: ${error.message}`);
  }
};

/**
 * 更新部门
 */
const updateDepartment = async (db, deptId, deptData) => {
  try {
    const updateFields = [];
    const updateValues = [];
    
    const allowedFields = ['name', 'description', 'parentId', 'managerId', 'sort', 'status'];
    
    allowedFields.forEach(field => {
      if (deptData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(deptData[field]);
      }
    });
    
    if (updateFields.length === 0) {
      throw new Error('没有可更新的字段');
    }
    
    updateFields.push('updateTime = NOW()');
    updateFields.push('updateBy = ?');
    updateValues.push(deptData.updateBy);
    updateValues.push(deptId);
    
    const [result] = await db.execute(
      `UPDATE departments SET ${updateFields.join(', ')} WHERE _id = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      throw new Error('部门不存在');
    }
    
    return { id: deptId, ...deptData };
  } catch (error) {
    throw new Error(`更新部门失败: ${error.message}`);
  }
};

/**
 * 删除部门
 */
const deleteDepartment = async (db, deptId) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 检查是否有子部门
    const [children] = await db.execute(
      'SELECT COUNT(*) as count FROM departments WHERE parentId = ? AND status = "active"',
      [deptId]
    );
    
    if (children[0].count > 0) {
      throw new Error('存在子部门，无法删除');
    }
    
    // 检查是否有用户
    const [users] = await db.execute(
      'SELECT COUNT(*) as count FROM users WHERE departmentId = ? AND status != "deleted"',
      [deptId]
    );
    
    if (users[0].count > 0) {
      throw new Error('部门下存在用户，无法删除');
    }
    
    // 删除部门
    await db.execute('UPDATE departments SET status = "deleted", updateTime = NOW() WHERE _id = ?', [deptId]);
    
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// ================================
// 5. 菜品管理模块
// ================================

/**
 * 获取菜品列表
 */
const getDishes = async (db, { page, pageSize, filters }) => {
  try {
    let whereClause = 'WHERE d.status != "deleted"';
    const params = [];
    
    if (filters.keyword) {
      whereClause += ' AND d.name LIKE ?';
      params.push(`%${filters.keyword}%`);
    }
    
    if (filters.categoryId) {
      whereClause += ' AND d.categoryId = ?';
      params.push(filters.categoryId);
    }
    
    if (filters.status) {
      whereClause += ' AND d.status = ?';
      params.push(filters.status);
    }
    
    // 获取总数
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM dishes d ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    
    // 获取分页数据
    const offset = (page - 1) * pageSize;
    const [dishes] = await db.execute(
      `SELECT d.*, dc.name as category_name 
       FROM dishes d 
       LEFT JOIN dish_categories dc ON d.categoryId = dc._id 
       ${whereClause} 
       ORDER BY d.createTime DESC 
       LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}`
    );
    
    return {
      list: dishes,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    throw new Error(`获取菜品列表失败: ${error.message}`);
  }
};

/**
 * 创建菜品
 */
const createDish = async (db, dishData) => {
  try {
    const {
      name, categoryId, description, price, image, calories, protein,
      fat, carbohydrate, tags = [], status = 'active', isRecommended = false, createBy
    } = dishData;
    
    const dishId = uuidv4();
    
    // 处理 undefined 值，转换为 null
    const safeDescription = description || null;
    const safeImage = image || null;
    const safeCalories = calories !== undefined ? calories : null;
    const safeProtein = protein !== undefined ? protein : null;
    const safeFat = fat !== undefined ? fat : null;
    const safeCarbohydrate = carbohydrate !== undefined ? carbohydrate : null;
    const safeCreateBy = createBy || null;
    
    await db.execute(
      `INSERT INTO dishes (
        _id, name, categoryId, description, price, image, calories, protein,
        fat, carbohydrate, tags, status, isRecommended, createTime, createBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        dishId, 
        name, 
        categoryId, 
        safeDescription, 
        price || 0, 
        safeImage, 
        safeCalories, 
        safeProtein,
        safeFat, 
        safeCarbohydrate, 
        JSON.stringify(tags), 
        status, 
        isRecommended ? 1 : 0, 
        safeCreateBy
      ]
    );
    
    return { id: dishId, name, price: price || 0, status };
  } catch (error) {
    throw new Error(`创建菜品失败: ${error.message}`);
  }
};

/**
 * 更新菜品
 */
const updateDish = async (db, dishId, dishData) => {
  try {
    const updateFields = [];
    const updateValues = [];
    
    const allowedFields = [
      'name', 'categoryId', 'description', 'price', 'image', 'calories',
      'protein', 'fat', 'carbohydrate', 'status', 'isRecommended'
    ];
    
    allowedFields.forEach(field => {
      if (dishData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        // 处理 undefined 值，转换为 null
        let value = dishData[field];
        if (value === undefined) {
          value = null;
        } else if (field === 'isRecommended') {
          value = value ? 1 : 0;
        }
        updateValues.push(value);
      }
    });
    
    if (dishData.tags) {
      updateFields.push('tags = ?');
      updateValues.push(JSON.stringify(dishData.tags));
    }
    
    if (updateFields.length === 0) {
      throw new Error('没有可更新的字段');
    }
    
    updateFields.push('updateTime = NOW()');
    updateFields.push('updateBy = ?');
    updateValues.push(dishData.updateBy);
    updateValues.push(dishId);
    
    const [result] = await db.execute(
      `UPDATE dishes SET ${updateFields.join(', ')} WHERE _id = ? AND status != "deleted"`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      throw new Error('菜品不存在或已被删除');
    }
    
    return { id: dishId, ...dishData };
  } catch (error) {
    throw new Error(`更新菜品失败: ${error.message}`);
  }
};

/**
 * 更新菜品状态
 */
const updateDishStatus = async (db, dishId, status) => {
  try {
    const [result] = await db.execute(
      'UPDATE dishes SET status = ?, updateTime = NOW() WHERE _id = ? AND status != "deleted"',
      [status, dishId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('菜品不存在或已被删除');
    }
  } catch (error) {
    throw new Error(`更新菜品状态失败: ${error.message}`);
  }
};

/**
 * 删除菜品
 */
const deleteDish = async (db, dishId) => {
  try {
    const [result] = await db.execute(
      'UPDATE dishes SET status = "deleted", updateTime = NOW() WHERE _id = ?',
      [dishId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('菜品不存在');
    }
  } catch (error) {
    throw new Error(`删除菜品失败: ${error.message}`);
  }
};

/**
 * 批量删除菜品
 */
const batchDeleteDishes = async (db, dishIds) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const placeholders = dishIds.map(() => '?').join(',');
    const [result] = await db.execute(
      `UPDATE dishes SET status = "deleted", updateTime = NOW() WHERE id IN (${placeholders})`,
      dishIds
    );
    
    await connection.commit();
    
    return {
      successCount: result.affectedRows,
      totalCount: dishIds.length
    };
  } catch (error) {
    await connection.rollback();
    throw new Error(`批量删除菜品失败: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * 获取菜品分类
 */
const getDishCategories = async (db) => {
  try {
    const [categories] = await db.execute(
      `SELECT dc.*, COUNT(d._id) as dish_count 
       FROM dish_categories dc 
       LEFT JOIN dishes d ON dc._id = d.categoryId AND d.status = "active"
       WHERE dc.status = "active" 
       GROUP BY dc._id 
       ORDER BY dc.sort ASC, dc.createTime DESC`
    );
    
    return categories;
  } catch (error) {
    throw new Error(`获取菜品分类失败: ${error.message}`);
  }
};

/**
 * 创建菜品分类
 */
const createDishCategory = async (db, categoryData) => {
  try {
    const { name, description, icon, color, sort = 0, status = 'active', createBy } = categoryData;
    const categoryId = uuidv4();
    
    await db.execute(
      'INSERT INTO dish_categories (_id, name, description, icon, color, sort, status, createTime, createBy) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)',
      [categoryId, name, description, icon, color, sort, status, createBy]
    );
    
    return { id: categoryId, name, description, status };
  } catch (error) {
    throw new Error(`创建菜品分类失败: ${error.message}`);
  }
};

/**
 * 获取营养模板
 */
const getNutritionTemplates = async (db) => {
  try {
    const [templates] = await db.execute(
      'SELECT * FROM nutrition_templates WHERE status = "active" ORDER BY createTime DESC'
    );
    
    return templates;
  } catch (error) {
    throw new Error(`获取营养模板失败: ${error.message}`);
  }
};

// ================================
// 6. 场地管理模块
// ================================

/**
 * 获取场地列表
 */
const getVenues = async (db, { page, pageSize, filters }) => {
  try {
    let whereClause = 'WHERE status != "deleted"';
    const params = [];
    
    if (filters.keyword) {
      whereClause += ' AND name LIKE ?';
      params.push(`%${filters.keyword}%`);
    }
    
    if (filters.type) {
      whereClause += ' AND type = ?';
      params.push(filters.type);
    }
    
    if (filters.status) {
      whereClause += ' AND status = ?';
      params.push(filters.status);
    }
    
    // 获取总数
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM venues ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    
    // 获取分页数据
    const offset = (page - 1) * pageSize;
    const [venues] = await db.execute(
      `SELECT v.*, 
        (SELECT COUNT(*) FROM reservations r WHERE r.venueId = v._id AND DATE(r.date) = CURDATE() AND r.status = 'confirmed') as today_reservations,
        75 as utilization_rate
       FROM venues v 
       ${whereClause} 
       ORDER BY v.sort ASC, v.createTime DESC 
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    
    return {
      list: venues,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    throw new Error(`获取场地列表失败: ${error.message}`);
  }
};

/**
 * 创建场地
 */
const createVenue = async (db, venueData) => {
  try {
    const {
      name, type, description, location, capacity, pricePerHour, features = [],
      image, openTime, closeTime, workingDays = [], advanceBookingDays,
      minBookingHours, maxBookingHours, requireApproval, allowCancellation,
      status = 'active', sort = 0, createBy
    } = venueData;
    
    const venueId = uuidv4();
    
    await db.execute(
      `INSERT INTO venues (
        id, name, type, description, location, capacity, price_per_hour, features,
        image, open_time, close_time, working_days, advance_booking_days,
        min_booking_hours, max_booking_hours, require_approval, allow_cancellation,
        status, sort, createTime, createBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
      [
        venueId, name, type, description, location, capacity, pricePerHour, JSON.stringify(features),
        image, openTime, closeTime, JSON.stringify(workingDays), advanceBookingDays,
        minBookingHours, maxBookingHours, requireApproval, allowCancellation,
        status, sort, createBy
      ]
    );
    
    return { id: venueId, name, type, status };
  } catch (error) {
    throw new Error(`创建场地失败: ${error.message}`);
  }
};

/**
 * 更新场地
 */
const updateVenue = async (db, venueId, venueData) => {
  try {
    const updateFields = [];
    const updateValues = [];
    
    const allowedFields = [
      'name', 'type', 'description', 'location', 'capacity', 'price_per_hour',
      'image', 'open_time', 'close_time', 'advance_booking_days',
      'min_booking_hours', 'max_booking_hours', 'require_approval', 'allow_cancellation',
      'status', 'sort'
    ];
    
    allowedFields.forEach(field => {
      if (venueData[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        updateValues.push(venueData[field]);
      }
    });
    
    if (venueData.features) {
      updateFields.push('features = ?');
      updateValues.push(JSON.stringify(venueData.features));
    }
    
    if (venueData.workingDays) {
      updateFields.push('working_days = ?');
      updateValues.push(JSON.stringify(venueData.workingDays));
    }
    
    if (updateFields.length === 0) {
      throw new Error('没有可更新的字段');
    }
    
    updateFields.push('updateTime = NOW()');
    updateFields.push('updateBy = ?');
    updateValues.push(venueData.updateBy);
    updateValues.push(venueId);
    
    const [result] = await db.execute(
      `UPDATE venues SET ${updateFields.join(', ')} WHERE _id = ? AND status != "deleted"`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      throw new Error('场地不存在或已被删除');
    }
    
    return { id: venueId, ...venueData };
  } catch (error) {
    throw new Error(`更新场地失败: ${error.message}`);
  }
};

/**
 * 获取场地时间安排
 */
const getVenueSchedule = async (db, venueId, date) => {
  try {
    const [slots] = await db.execute(
      `SELECT ts.*, r._id as reservation_id, r.userId, u.nickName as user_name, u.phoneNumber,
        r.totalPrice, r.createTime as reservation_time
       FROM time_slots ts
       LEFT JOIN reservations r ON ts._id = r.timeSlotId AND r.status = 'confirmed'
       LEFT JOIN users u ON r.userId = u._id
       WHERE ts.venueId = ? AND ts.date = ?
       ORDER BY ts.startTime ASC`,
      [venueId, date]
    );
    
    return slots.map(slot => ({
      id: slot.id,
      venueId: slot.venueId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: slot.reservation_id ? 'booked' : slot.status,
      price: slot.price,
      reservation: slot.reservation_id ? {
        id: slot.reservation_id,
        userName: slot.user_name,
        phoneNumber: slot.phoneNumber,
        totalPrice: slot.totalPrice,
        createTime: slot.reservation_time
      } : null
    }));
  } catch (error) {
    throw new Error(`获取场地时间安排失败: ${error.message}`);
  }
};

// ================================
// 7. 时间段管理模块
// ================================

/**
 * 创建时间段
 */
const createTimeSlot = async (db, slotData) => {
  try {
    const { venueId, date, startTime, endTime, status = 'available', price, remark, createBy } = slotData;
    const slotId = uuidv4();
    
    // 检查时间段是否冲突
    const [existing] = await db.execute(
      'SELECT id FROM time_slots WHERE venueId = ? AND date = ? AND ((startTime <= ? AND endTime > ?) OR (startTime < ? AND endTime >= ?))',
      [venueId, date, startTime, startTime, endTime, endTime]
    );
    
    if (existing.length > 0) {
      throw new Error('时间段存在冲突');
    }
    
    await db.execute(
      'INSERT INTO time_slots (_id, venueId, date, startTime, endTime, status, price, remark, createTime, createBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)',
      [slotId, venueId, date, startTime, endTime, status, price, remark, createBy]
    );
    
    return { id: slotId, venueId, date, startTime, endTime, status };
  } catch (error) {
    throw new Error(`创建时间段失败: ${error.message}`);
  }
};

/**
 * 批量创建时间段
 */
const batchCreateTimeSlots = async (db, slots) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    let successCount = 0;
    const errors = [];
    
    for (const slotData of slots) {
      try {
        await createTimeSlot(connection, slotData);
        successCount++;
      } catch (error) {
        errors.push(`${slotData.date} ${slotData.startTime}-${slotData.endTime}: ${error.message}`);
      }
    }
    
    await connection.commit();
    
    return {
      successCount,
      totalCount: slots.length,
      errors
    };
  } catch (error) {
    await connection.rollback();
    throw new Error(`批量创建时间段失败: ${error.message}`);
  } finally {
    connection.release();
  }
};

// ================================
// 8. 预约管理模块
// ================================

/**
 * 获取预约列表
 */
const getReservations = async (db, { page, pageSize, filters }) => {
  try {
    let whereClause = 'WHERE r.status != "deleted"';
    const params = [];
    
    if (filters.date) {
      whereClause += ' AND DATE(r.date) = ?';
      params.push(filters.date);
    }
    
    if (filters.venueName) {
      whereClause += ' AND v.name LIKE ?';
      params.push(`%${filters.venueName}%`);
    }
    
    if (filters.status) {
      whereClause += ' AND r.status = ?';
      params.push(filters.status);
    }
    
    // 获取总数
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM reservations r 
       LEFT JOIN venues v ON r.venueId = v.id 
       ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    
    // 获取分页数据
    const offset = (page - 1) * pageSize;
    const [reservations] = await db.execute(
      `SELECT r.*, v.name as venue_name, u.nickName as user_name, u.phoneNumber
       FROM reservations r
       LEFT JOIN venues v ON r.venueId = v._id
       LEFT JOIN users u ON r.userId = u._id
       ${whereClause}
       ORDER BY r.create_time DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    
    return {
      list: reservations,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  } catch (error) {
    throw new Error(`获取预约列表失败: ${error.message}`);
  }
};

/**
 * 确认预约
 */
const confirmReservation = async (db, reservationId, adminId) => {
  try {
    const [result] = await db.execute(
      'UPDATE reservations SET status = "confirmed", updateTime = NOW(), updateBy = ? WHERE _id = ? AND status = "pending"',
      [adminId, reservationId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('预约不存在或状态不允许确认');
    }
  } catch (error) {
    throw new Error(`确认预约失败: ${error.message}`);
  }
};

/**
 * 拒绝预约
 */
const rejectReservation = async (db, reservationId, reason, adminId) => {
  try {
    const [result] = await db.execute(
      'UPDATE reservations SET status = "rejected", reject_reason = ?, updateTime = NOW(), updateBy = ? WHERE _id = ? AND status = "pending"',
      [reason, adminId, reservationId]
    );
    
    if (result.affectedRows === 0) {
      throw new Error('预约不存在或状态不允许拒绝');
    }
  } catch (error) {
    throw new Error(`拒绝预约失败: ${error.message}`);
  }
};

// ================================
// 9. 系统设置模块
// ================================

/**
 * 获取系统配置
 */
const getSystemConfig = async (db) => {
  try {
    const [configs] = await db.execute('SELECT * FROM system_configs ORDER BY category, sort');
    
    const result = {
      basic: {},
      business: {}
    };
    
    configs.forEach(config => {
      const category = config.category || 'basic';
      if (!result[category]) {
        result[category] = {};
      }
      result[category][config.key] = config.value;
    });
    
    return result;
  } catch (error) {
    throw new Error(`获取系统配置失败: ${error.message}`);
  }
};

/**
 * 更新系统配置
 */
const updateSystemConfig = async (db, configData) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    for (const [category, configs] of Object.entries(configData)) {
      if (typeof configs === 'object') {
        for (const [key, value] of Object.entries(configs)) {
          await db.execute(
            'INSERT INTO system_configs (category, key, value, updateTime) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE value = ?, updateTime = NOW()',
            [category, key, value, value]
          );
        }
      }
    }
    
    await connection.commit();
    
    return configData;
  } catch (error) {
    await connection.rollback();
    throw new Error(`更新系统配置失败: ${error.message}`);
  } finally {
    connection.release();
  }
};

/**
 * 获取验证方案
 */
const getVerificationSchemes = async (db) => {
  try {
    const [schemes] = await db.execute(
      'SELECT * FROM verification_schemes WHERE status = "active" ORDER BY sort ASC'
    );
    
    return schemes.map(scheme => ({
      id: scheme.id,
      name: scheme.name,
      description: scheme.description,
      type: scheme.type,
      isEnabled: scheme.is_enabled,
      config: JSON.parse(scheme.config || '{}')
    }));
  } catch (error) {
    throw new Error(`获取验证方案失败: ${error.message}`);
  }
};

// ================================
// 9. 公告管理模块
// ================================

/**
 * 获取公告列表
 */
const getNotices = async (filters, page, pageSize, db) => {
  try {
    const offset = (page - 1) * pageSize;
    let whereConditions = [];
    let params = [];
    
    // 状态筛选
    if (filters.status) {
      whereConditions.push('status = ?');
      params.push(filters.status);
    }
    
    // 类型筛选
    if (filters.type) {
      whereConditions.push('type = ?');
      params.push(filters.type);
    }
    
    // 关键词搜索
    if (filters.keyword) {
      whereConditions.push('(title LIKE ? OR content LIKE ?)');
      params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
    }
    
    // 构建WHERE子句
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    
    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM system_notices${whereClause ? ' ' + whereClause : ''}`;
    const [countResult] = await db.execute(countSql, params);
    const total = countResult[0].total;
    
    // 获取列表数据
    const listSql = `SELECT 
      _id,
      title,
      content,
      type,
      priority,
      status,
      startTime,
      endTime,
      isSticky,
      viewCount,
      publisherId,
      publisherName,
      publishTime,
      createTime,
      updateTime
     FROM system_notices${whereClause ? ' ' + whereClause : ''}
     ORDER BY isSticky DESC, priority DESC, publishTime DESC, createTime DESC
     LIMIT ? OFFSET ?`;
    
    const allParams = [...params, parseInt(pageSize), parseInt(offset)];
    
    // 使用query方法而不是execute方法
    let result;
    if (allParams.length === 0) {
      result = await db.query(listSql);
    } else {
      result = await db.query(listSql, allParams);
    }
    const rows = result[0] || [];
    
    return {
      records: rows || [],
      total,
      page,
      pageSize
    };
  } catch (error) {
    throw new Error(`获取公告列表失败: ${error.message}`);
  }
};

/**
 * 获取公告详情
 */
const getNoticeDetail = async (noticeId, db) => {
  try {
    const result = await db.query(
      `SELECT 
        _id,
        title,
        content,
        type,
        priority,
        status,
        startTime,
        endTime,
        targetUsers,
        isSticky,
        viewCount,
        publisherId,
        publisherName,
        publishTime,
        createTime,
        updateTime
       FROM system_notices 
       WHERE _id = ?`,
      [noticeId]
    );
    
    const rows = result[0] || [];
    
    if (rows.length === 0) {
      throw new Error('公告不存在');
    }
    
    return rows[0];
  } catch (error) {
    if (error.message === '公告不存在') {
      throw error;
    }
    throw new Error(`获取公告详情失败: ${error.message}`);
  }
};

/**
 * 创建公告
 */
const createNotice = async (noticeData, db) => {
  try {
    const noticeId = require('uuid').v4();
    const now = new Date();
    
    const insertData = {
      _id: noticeId,
      title: noticeData.title,
      content: noticeData.content,
      type: noticeData.type || 'info',
      priority: noticeData.priority || 0,
      status: noticeData.status || 'draft',
      startTime: noticeData.startTime || null,
      endTime: noticeData.endTime || null,
      targetUsers: noticeData.targetUsers ? JSON.stringify(noticeData.targetUsers) : null,
      isSticky: noticeData.isSticky ? 1 : 0,
      publisherId: noticeData.publisherId || null,
      publisherName: noticeData.publisherName || null,
      publishTime: noticeData.status === 'published' ? now : null,
      createTime: now,
      updateTime: now
    };
    
    await db.execute(
      `INSERT INTO system_notices (
        _id, title, content, type, priority, status, 
        startTime, endTime, targetUsers, isSticky, 
        publisherId, publisherName, publishTime, createTime, updateTime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        insertData._id,
        insertData.title,
        insertData.content,
        insertData.type,
        insertData.priority,
        insertData.status,
        insertData.startTime || null,
        insertData.endTime || null,
        insertData.targetUsers ? JSON.stringify(insertData.targetUsers) : null,
        insertData.isSticky ? 1 : 0,
        insertData.publisherId,
        insertData.publisherName,
        insertData.publishTime || null,
        insertData.createTime,
        insertData.updateTime
      ]
    );
    
    return {
      _id: noticeId,
      ...insertData,
      targetUsers: noticeData.targetUsers
    };
  } catch (error) {
    throw new Error(`创建公告失败: ${error.message}`);
  }
};

/**
 * 更新公告
 */
const updateNotice = async (noticeId, updateData, userId, db) => {
  try {
    // 检查公告是否存在
    const existingNotice = await getNoticeDetail(noticeId, db);
    
    const updateFields = [];
    const updateValues = [];
    
    // 构建更新字段
    if (updateData.title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(updateData.title);
    }
    if (updateData.content !== undefined) {
      updateFields.push('content = ?');
      updateValues.push(updateData.content);
    }
    if (updateData.type !== undefined) {
      updateFields.push('type = ?');
      updateValues.push(updateData.type);
    }
    if (updateData.priority !== undefined) {
      updateFields.push('priority = ?');
      updateValues.push(updateData.priority);
    }
    if (updateData.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updateData.status);
    }
    if (updateData.startTime !== undefined) {
      updateFields.push('startTime = ?');
      updateValues.push(updateData.startTime);
    }
    if (updateData.endTime !== undefined) {
      updateFields.push('endTime = ?');
      updateValues.push(updateData.endTime);
    }
    if (updateData.targetUsers !== undefined) {
      updateFields.push('targetUsers = ?');
      updateValues.push(JSON.stringify(updateData.targetUsers));
    }
    if (updateData.isSticky !== undefined) {
      updateFields.push('isSticky = ?');
      updateValues.push(updateData.isSticky);
    }
    
    if (updateFields.length === 0) {
      throw new Error('没有需要更新的字段');
    }
    
    updateFields.push('updateTime = NOW()');
    updateValues.push(noticeId);
    
    await db.execute(
      `UPDATE system_notices SET ${updateFields.join(', ')} WHERE _id = ?`,
      updateValues
    );
    
    // 返回更新后的公告信息
    return await getNoticeDetail(noticeId, db);
  } catch (error) {
    if (error.message === '公告不存在' || error.message === '没有需要更新的字段') {
      throw error;
    }
    throw new Error(`更新公告失败: ${error.message}`);
  }
};

/**
 * 删除公告
 */
const deleteNotice = async (noticeId, userId, db) => {
  try {
    // 检查公告是否存在
    await getNoticeDetail(noticeId, db);
    
    await db.execute(
      'DELETE FROM system_notices WHERE _id = ?',
      [noticeId]
    );
    
    return true;
  } catch (error) {
    if (error.message === '公告不存在') {
      throw error;
    }
    throw new Error(`删除公告失败: ${error.message}`);
  }
};

/**
 * 发布公告
 */
const publishNotice = async (noticeId, userId, db) => {
  try {
    const notice = await getNoticeDetail(noticeId, db);
    
    if (notice.status === 'published') {
      throw new Error('公告已经发布');
    }
    
    await db.execute(
      'UPDATE system_notices SET status = ?, publishTime = NOW(), updateTime = NOW() WHERE _id = ?',
      ['published', noticeId]
    );
    
    return await getNoticeDetail(noticeId, db);
  } catch (error) {
    if (error.message === '公告不存在' || error.message === '公告已经发布') {
      throw error;
    }
    throw new Error(`发布公告失败: ${error.message}`);
  }
};

/**
 * 取消发布公告
 */
const unpublishNotice = async (noticeId, userId, db) => {
  try {
    const notice = await getNoticeDetail(noticeId, db);
    
    if (notice.status !== 'published') {
      throw new Error('公告未发布，无法取消发布');
    }
    
    await db.execute(
      'UPDATE system_notices SET status = ?, updateTime = NOW() WHERE _id = ?',
      ['draft', noticeId]
    );
    
    return await getNoticeDetail(noticeId, db);
  } catch (error) {
    if (error.message === '公告不存在' || error.message === '公告未发布，无法取消发布') {
      throw error;
    }
    throw new Error(`取消发布公告失败: ${error.message}`);
  }
};

/**
 * 批量删除公告
 */
const batchDeleteNotices = async (noticeIds, userId, db) => {
  try {
    let successCount = 0;
    const errors = [];
    
    for (const noticeId of noticeIds) {
      try {
        await deleteNotice(noticeId, userId, db);
        successCount++;
      } catch (error) {
        errors.push({
          noticeId,
          error: error.message
        });
      }
    }
    
    return {
      successCount,
      totalCount: noticeIds.length,
      errors
    };
  } catch (error) {
    throw new Error(`批量删除公告失败: ${error.message}`);
  }
};

// ================================
// 10. 数据统计模块
// ================================

/**
 * 获取综合统计
 */
const getOverallStats = async (db, { startDate, endDate }) => {
  try {
    const start = startDate || moment().tz('Asia/Shanghai').format('YYYY-MM-01');
    const end = endDate || moment().tz('Asia/Shanghai').format('YYYY-MM-DD');
    
    // 获取用户统计
    const [userStats] = await db.execute(
      'SELECT COUNT(*) as total FROM users WHERE createTime BETWEEN ? AND ? AND status != "deleted"',
      [start, end]
    );
    
    // 获取订单统计
    const [orderStats] = await db.execute(
      'SELECT COUNT(*) as total FROM dining_orders WHERE createTime BETWEEN ? AND ?',
      [start, end]
    );
    
    // 获取预约统计
    const [reservationStats] = await db.execute(
      'SELECT COUNT(*) as total FROM reservations WHERE createTime BETWEEN ? AND ? AND status != "cancelled"',
      [start, end]
    );
    
    // 获取验证统计
    const [verificationStats] = await db.execute(
      'SELECT COUNT(*) as total FROM verification_records WHERE createTime BETWEEN ? AND ?',
      [start, end]
    );
    
    return {
      totalUsers: userStats[0].total,
      totalOrders: orderStats[0].total,
      totalReservations: reservationStats[0].total,
      totalVerifications: verificationStats[0].total
    };
  } catch (error) {
    throw new Error(`获取综合统计失败: ${error.message}`);
  }
};

/**
 * 获取用餐统计
 */
const getDiningStats = async (db, { startDate, endDate }) => {
  try {
    const today = moment().tz('Asia/Shanghai').format('YYYY-MM-DD');
    const weekStart = moment().tz('Asia/Shanghai').startOf('week').format('YYYY-MM-DD');
    const monthStart = moment().tz('Asia/Shanghai').format('YYYY-MM-01');
    
    // 今日用餐统计
    const [todayStats] = await db.execute(
      'SELECT COUNT(*) as count FROM verification_records WHERE DATE(createTime) = ? AND status = "verified"',
      [today]
    );
    
    // 本周用餐统计
    const [weekStats] = await db.execute(
      'SELECT COUNT(*) as count FROM verification_records WHERE DATE(createTime) >= ? AND status = "verified"',
      [weekStart]
    );
    
    // 本月用餐统计
    const [monthStats] = await db.execute(
      'SELECT COUNT(*) as count FROM verification_records WHERE DATE(createTime) >= ? AND status = "verified"',
      [monthStart]
    );
    
    return {
      todayCount: todayStats[0].count,
      weekCount: weekStats[0].count,
      monthCount: monthStats[0].count,
      averageDaily: Math.round(monthStats[0].count / moment().date())
    };
  } catch (error) {
    throw new Error(`获取用餐统计失败: ${error.message}`);
  }
};

module.exports = {
  // 系统统计模块
  getSystemStats,
  getSystemStatus,
  
  // 菜单管理模块
  saveMenuDraft,
  publishMenu,
  getMenuHistory,
  getMenuTemplates,
  revokeMenu,
  deleteMenuTemplate,
  getMenuDishes,
  setMenuDishes,
  getMenuByDate,
  
  // 用户管理模块
  getUsers,
  getUserDetail,
  createUser,
  updateUser,
  updateUserStatus,
  deleteUser,
  batchDeleteUsers,
  getUserActivities,
  getUserProfile,
  updateUserProfile,
  updateUserAvatar,
  
  // 角色和部门管理模块
  getRoles,
  getRoleDetail,
  createRole,
  updateRole,
  deleteRole,
  assignRole,
  batchAssignRole,
  getPermissions,
  updateRolePermissions,
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  
  // 菜品管理模块
  getDishes,
  createDish,
  updateDish,
  updateDishStatus,
  deleteDish,
  batchDeleteDishes,
  getDishCategories,
  createDishCategory,
  getNutritionTemplates,
  
  // 场地管理模块
  getVenues,
  createVenue,
  updateVenue,
  getVenueSchedule,
  
  // 时间段管理模块
  createTimeSlot,
  batchCreateTimeSlots,
  
  // 预约管理模块
  getReservations,
  confirmReservation,
  rejectReservation,
  
  // 系统设置模块
  getSystemConfig,
  updateSystemConfig,
  getVerificationSchemes,
  
  // 数据统计模块
  getOverallStats,
  getDiningStats,
  
  // 公告管理模块
  getNotices,
  getNoticeDetail,
  createNotice,
  updateNotice,
  deleteNotice,
  publishNotice,
  unpublishNotice,
  batchDeleteNotices
};
