const adminService = require('../services/adminService');
const { ResponseHelper, pagination, notFound } = require('../utils/response');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

// ================================
// 1. 系统统计模块
// ================================

/**
 * 获取系统统计数据
 */
const getSystemStats = async (req, res) => {
  try {
    if (!req.db) {
      logger.error('req.db is undefined');
      return ResponseHelper.error(res, '数据库连接不可用', 500);
    }
    
    const stats = await adminService.getSystemStats(req.db);
    ResponseHelper.success(res, stats, '获取系统统计数据成功');
  } catch (error) {
    logger.error('获取系统统计数据失败:', error);
    ResponseHelper.error(res, '获取系统统计数据失败', 500);
  }
};

/**
 * 获取系统状态
 */
const getSystemStatus = async (req, res) => {
  try {
    const status = await adminService.getSystemStatus(req.db);
    ResponseHelper.success(res, status, '获取系统状态成功');
  } catch (error) {
    logger.error('获取系统状态失败:', error);
    ResponseHelper.error(res, '获取系统状态失败', 500);
  }
};

// ================================
// 2. 菜单管理模块
// ================================

/**
 * 保存菜单草稿
 */
const saveMenuDraft = async (req, res) => {
  try {
    const menuData = {
      ...req.body,
      adminId: req.user.id,
      status: 'draft'
    };
    
    const menu = await adminService.saveMenuDraft(req.db, menuData);
    ResponseHelper.success(res, menu, '菜单草稿保存成功');
  } catch (error) {
    logger.error('保存菜单草稿失败:', error);
    ResponseHelper.error(res, error.message || '保存菜单草稿失败', 500);
  }
};

/**
 * 发布菜单
 */
const publishMenu = async (req, res) => {
  try {
    const menuData = {
      ...req.body,
      adminId: req.user.id,
      status: 'published',
      publishTime: new Date()
    };
    
    const menu = await adminService.publishMenu(req.db, menuData);
    ResponseHelper.success(res, menu, '菜单发布成功');
  } catch (error) {
    logger.error('发布菜单失败:', error);
    ResponseHelper.error(res, error.message || '发布菜单失败', 500);
  }
};

/**
 * 获取菜单历史
 */
const getMenuHistory = async (req, res) => {
  try {
    console.log('=== getMenuHistory 开始执行 ===');
    console.log('req.db:', !!req.db);
    console.log('req.user:', req.user);
    
    const { page = 1, pageSize = 20, startDate, endDate, mealType } = req.query;
    
    const filters = {
      startDate,
      endDate,
      mealType
    };
    
    console.log('调用参数:', { page, pageSize, filters });
    
    const result = await adminService.getMenuHistory(req.db, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      filters
    });
    
    console.log('adminService 返回结果:', result);
    
    ResponseHelper.success(res, result, '获取菜单历史成功');
  } catch (error) {
    console.error('=== getMenuHistory 错误详情 ===');
    console.error('错误消息:', error.message);
    console.error('错误堆栈:', error.stack);
    logger.error('获取菜单历史失败:', error);
    ResponseHelper.error(res, '获取菜单历史失败', 500);
  }
};

/**
 * 根据日期和餐次获取菜单
 */
const getMenuByDate = async (req, res) => {
  try {
    const { date, mealType } = req.query;
    
    if (!date || !mealType) {
      return ResponseHelper.badRequest(res, '日期和餐次参数不能为空');
    }
    
    const menu = await adminService.getMenuByDate(req.db, { date, mealType });
    
    if (!menu) {
      return ResponseHelper.success(res, null, '该日期和餐次没有菜单');
    }
    
    ResponseHelper.success(res, menu, '获取菜单成功');
  } catch (error) {
    logger.error('获取指定日期菜单失败:', error);
    ResponseHelper.error(res, error.message || '获取菜单失败', 500);
  }
};

/**
 * 获取菜单模板
 */
const getMenuTemplates = async (req, res) => {
  try {
    const templates = await adminService.getMenuTemplates(req.db);
    ResponseHelper.success(res, templates, '获取菜单模板成功');
  } catch (error) {
    logger.error('获取菜单模板失败:', error);
    ResponseHelper.error(res, '获取菜单模板失败', 500);
  }
};

/**
 * 撤回菜单
 */
const revokeMenu = async (req, res) => {
  try {
    const { menuId } = req.params;
    
    await adminService.revokeMenu(req.db, menuId, req.user.id);
    ResponseHelper.success(res, null, '菜单撤回成功');
  } catch (error) {
    logger.error('撤回菜单失败:', error);
    ResponseHelper.error(res, error.message || '撤回菜单失败', 500);
  }
};

/**
 * 删除菜单模板
 */
const deleteMenuTemplate = async (req, res) => {
  try {
    const { templateId } = req.params;
    
    await adminService.deleteMenuTemplate(req.db, templateId);
    ResponseHelper.success(res, null, '删除菜单模板成功');
  } catch (error) {
    logger.error('删除菜单模板失败:', error);
    ResponseHelper.error(res, error.message || '删除菜单模板失败', 500);
  }
};

/**
 * 获取菜单的菜品列表
 */
const getMenuDishes = async (req, res) => {
  try {
    const { menuId } = req.params;
    
    const dishes = await adminService.getMenuDishes(req.db, menuId);
    ResponseHelper.success(res, dishes, '获取菜单菜品成功');
  } catch (error) {
    logger.error('获取菜单菜品失败:', error);
    ResponseHelper.error(res, error.message || '获取菜单菜品失败', 500);
  }
};

/**
 * 设置菜单菜品
 */
const setMenuDishes = async (req, res) => {
  try {
    const { menuId } = req.params;
    const { dishItems } = req.body;
    
    if (!Array.isArray(dishItems)) {
      return ResponseHelper.error(res, '菜品项目必须是数组', 400);
    }
    
    const result = await adminService.setMenuDishes(req.db, menuId, dishItems);
    ResponseHelper.success(res, result, '菜单菜品设置成功');
  } catch (error) {
    logger.error('设置菜单菜品失败:', error);
    ResponseHelper.error(res, error.message || '设置菜单菜品失败', 500);
  }
};

// ================================
// 3. 用户管理模块
// ================================

/**
 * 获取用户列表
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, role, status, departmentId } = req.query;
    
    const filters = {
      keyword,
      role,
      status,
      departmentId
    };
    
    const result = await adminService.getUsers(req.db, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      filters
    });
    
    ResponseHelper.success(res, result, '获取用户列表成功');
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    ResponseHelper.error(res, '获取用户列表失败', 500);
  }
};

/**
 * 获取用户详情
 */
const getUserDetail = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await adminService.getUserDetail(req.db, userId);
    ResponseHelper.success(res, user, '获取用户详情成功');
  } catch (error) {
    logger.error('获取用户详情失败:', error);
    ResponseHelper.error(res, error.message || '获取用户详情失败', 500);
  }
};

/**
 * 创建用户
 */
const createUser = async (req, res) => {
  try {
    const userData = {
      ...req.body,
      createBy: req.user.id
    };
    
    const user = await adminService.createUser(req.db, userData);
    ResponseHelper.success(res, user, '创建用户成功');
  } catch (error) {
    logger.error('创建用户失败:', error);
    ResponseHelper.error(res, error.message || '创建用户失败', 500);
  }
};

/**
 * 更新用户信息
 */
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = {
      ...req.body,
      updateBy: req.user.id
    };
    
    const user = await adminService.updateUser(req.db, userId, userData);
    ResponseHelper.success(res, user, '更新用户信息成功');
  } catch (error) {
    logger.error('更新用户信息失败:', error);
    ResponseHelper.error(res, error.message || '更新用户信息失败', 500);
  }
};

/**
 * 更新用户状态
 */
const updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, reason } = req.body;
    
    await adminService.updateUserStatus(req.db, userId, status, reason, req.user.id);
    ResponseHelper.success(res, null, '更新用户状态成功');
  } catch (error) {
    logger.error('更新用户状态失败:', error);
    ResponseHelper.error(res, error.message || '更新用户状态失败', 500);
  }
};

/**
 * 删除用户
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    await adminService.deleteUser(req.db, userId, req.user.id);
    ResponseHelper.success(res, null, '删除用户成功');
  } catch (error) {
    logger.error('删除用户失败:', error);
    ResponseHelper.error(res, error.message || '删除用户失败', 500);
  }
};

/**
 * 批量删除用户
 */
const batchDeleteUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    const result = await adminService.batchDeleteUsers(req.db, userIds, req.user.id);
    ResponseHelper.success(res, result, '批量删除用户成功');
  } catch (error) {
    logger.error('批量删除用户失败:', error);
    ResponseHelper.error(res, error.message || '批量删除用户失败', 500);
  }
};

/**
 * 获取用户活动记录
 */
const getUserActivities = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, pageSize = 10 } = req.query;
    
    const result = await adminService.getUserActivities(req.db, userId, {
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
    
    ResponseHelper.success(res, result, '获取用户活动记录成功');
  } catch (error) {
    logger.error('获取用户活动记录失败:', error);
    ResponseHelper.error(res, '获取用户活动记录失败', 500);
  }
};

/**
 * 获取用户资料
 */
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userProfile = await adminService.getUserProfile(userId);
    
    ResponseHelper.success(res, userProfile, '获取用户资料成功');
  } catch (error) {
    logger.error('获取用户资料失败:', error);
    ResponseHelper.error(res, '获取用户资料失败', 500);
  }
};

/**
 * 更新用户资料
 */
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;
    
    const updatedProfile = await adminService.updateUserProfile(userId, updateData, req.db);
    
    ResponseHelper.success(res, updatedProfile, '更新用户资料成功');
  } catch (error) {
    logger.error('更新用户资料失败:', error);
    ResponseHelper.error(res, '更新用户资料失败', 500);
  }
};

/**
 * 更新用户头像
 */
const updateUserAvatar = async (req, res) => {
  try {
    const userId = req.user.id;
    const { avatarUrl } = req.body;
    
    if (!avatarUrl) {
      return ResponseHelper.error(res, '头像URL不能为空', 400);
    }
    
    const updatedProfile = await adminService.updateUserAvatar(userId, avatarUrl);
    
    ResponseHelper.success(res, updatedProfile, '更新头像成功');
  } catch (error) {
    logger.error('更新头像失败:', error);
    ResponseHelper.error(res, '更新头像失败', 500);
  }
};

// ================================
// 4. 角色和部门管理模块
// ================================

/**
 * 获取角色列表
 */
const getRoles = async (req, res) => {
  try {
    const roles = await adminService.getRoles(req.db);
    ResponseHelper.success(res, roles, '获取角色列表成功');
  } catch (error) {
    logger.error('获取角色列表失败:', error);
    ResponseHelper.error(res, '获取角色列表失败', 500);
  }
};

/**
 * 获取角色详情
 */
const getRoleDetail = async (req, res) => {
  try {
    const { roleId } = req.params;
    
    const role = await adminService.getRoleDetail(req.db, roleId);
    ResponseHelper.success(res, role, '获取角色详情成功');
  } catch (error) {
    logger.error('获取角色详情失败:', error);
    if (error.message === '角色不存在') {
      ResponseHelper.error(res, '角色不存在', 404);
    } else {
      ResponseHelper.error(res, '获取角色详情失败', 500);
    }
  }
};

/**
 * 创建角色
 */
const createRole = async (req, res) => {
  try {
    const roleData = {
      ...req.body,
      createBy: req.user.id
    };
    
    const role = await adminService.createRole(req.db, roleData);
    ResponseHelper.success(res, role, '创建角色成功');
  } catch (error) {
    logger.error('创建角色失败:', error);
    ResponseHelper.error(res, error.message || '创建角色失败', 500);
  }
};

/**
 * 更新角色
 */
const updateRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const roleData = {
      ...req.body,
      updateBy: req.user.id
    };
    
    const role = await adminService.updateRole(req.db, roleId, roleData);
    ResponseHelper.success(res, role, '更新角色成功');
  } catch (error) {
    logger.error('更新角色失败:', error);
    ResponseHelper.error(res, error.message || '更新角色失败', 500);
  }
};

/**
 * 删除角色
 */
const deleteRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    
    await adminService.deleteRole(req.db, roleId);
    ResponseHelper.success(res, null, '删除角色成功');
  } catch (error) {
    logger.error('删除角色失败:', error);
    ResponseHelper.error(res, error.message || '删除角色失败', 500);
  }
};

/**
 * 获取权限列表
 */
const getPermissions = async (req, res) => {
  try {
    const permissions = await adminService.getPermissions(req.db);
    ResponseHelper.success(res, permissions, '获取权限列表成功');
  } catch (error) {
    logger.error('获取权限列表失败:', error);
    ResponseHelper.error(res, '获取权限列表失败', 500);
  }
};

/**
 * 更新角色权限
 */
const updateRolePermissions = async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissionIds } = req.body;
    
    if (!Array.isArray(permissionIds)) {
      return ResponseHelper.error(res, '权限ID列表格式错误', 400);
    }
    
    const result = await adminService.updateRolePermissions(req.db, roleId, permissionIds, req.user.id);
    ResponseHelper.success(res, result, '更新角色权限成功');
  } catch (error) {
    logger.error('更新角色权限失败:', error);
    if (error.message === '角色不存在') {
      ResponseHelper.error(res, '角色不存在', 404);
    } else {
      ResponseHelper.error(res, '更新角色权限失败', 500);
    }
  }
};

/**
 * 分配角色
 */
const assignRole = async (req, res) => {
  try {
    const { userId, roleId } = req.body;
    
    if (!userId || !roleId) {
      return ResponseHelper.error(res, '用户ID和角色ID不能为空', 400);
    }
    
    await adminService.assignRole(req.db, userId, roleId, req.user.id);
    ResponseHelper.success(res, null, '分配角色成功');
  } catch (error) {
    logger.error('分配角色失败:', error);
    ResponseHelper.error(res, error.message || '分配角色失败', 500);
  }
};

/**
 * 批量分配角色
 */
const batchAssignRole = async (req, res) => {
  try {
    const { assignments } = req.body;
    
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return ResponseHelper.error(res, '分配列表不能为空', 400);
    }
    
    const result = await adminService.batchAssignRole(req.db, assignments, req.user.id);
    ResponseHelper.success(res, result, '批量分配角色完成');
  } catch (error) {
    logger.error('批量分配角色失败:', error);
    ResponseHelper.error(res, '批量分配角色失败', 500);
  }
};

/**
 * 获取部门列表
 */
const getDepartments = async (req, res) => {
  try {
    const departments = await adminService.getDepartments(req.db);
    ResponseHelper.success(res, departments, '获取部门列表成功');
  } catch (error) {
    logger.error('获取部门列表失败:', error);
    ResponseHelper.error(res, '获取部门列表失败', 500);
  }
};

/**
 * 创建部门
 */
const createDepartment = async (req, res) => {
  try {
    const deptData = {
      ...req.body,
      createBy: req.user.id
    };
    
    const department = await adminService.createDepartment(req.db, deptData);
    ResponseHelper.success(res, department, '创建部门成功');
  } catch (error) {
    logger.error('创建部门失败:', error);
    ResponseHelper.error(res, error.message || '创建部门失败', 500);
  }
};

/**
 * 更新部门
 */
const updateDepartment = async (req, res) => {
  try {
    const { deptId } = req.params;
    const deptData = {
      ...req.body,
      updateBy: req.user.id
    };
    
    const department = await adminService.updateDepartment(req.db, deptId, deptData);
    ResponseHelper.success(res, department, '更新部门成功');
  } catch (error) {
    logger.error('更新部门失败:', error);
    ResponseHelper.error(res, error.message || '更新部门失败', 500);
  }
};

/**
 * 删除部门
 */
const deleteDepartment = async (req, res) => {
  try {
    const { deptId } = req.params;
    
    await adminService.deleteDepartment(req.db, deptId);
    ResponseHelper.success(res, null, '删除部门成功');
  } catch (error) {
    logger.error('删除部门失败:', error);
    ResponseHelper.error(res, error.message || '删除部门失败', 500);
  }
};

// ================================
// 5. 菜品管理模块
// ================================

/**
 * 获取菜品列表
 */
const getDishes = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, categoryId, status } = req.query;
    
    const filters = {
      keyword,
      categoryId,
      status
    };
    
    const result = await adminService.getDishes(req.db, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      filters
    });
    
    ResponseHelper.success(res, result, '获取菜品列表成功');
  } catch (error) {
    logger.error('获取菜品列表失败:', error);
    ResponseHelper.error(res, '获取菜品列表失败', 500);
  }
};

/**
 * 创建菜品
 */
const createDish = async (req, res) => {
  try {
    const dishData = {
      ...req.body,
      createBy: req.user.id
    };
    
    const dish = await adminService.createDish(req.db, dishData);
    ResponseHelper.success(res, dish, '创建菜品成功');
  } catch (error) {
    logger.error('创建菜品失败:', error);
    ResponseHelper.error(res, error.message || '创建菜品失败', 500);
  }
};

/**
 * 更新菜品
 */
const updateDish = async (req, res) => {
  try {
    const { dishId } = req.params;
    const dishData = {
      ...req.body,
      updateBy: req.user.id
    };
    
    const dish = await adminService.updateDish(req.db, dishId, dishData);
    ResponseHelper.success(res, dish, '更新菜品成功');
  } catch (error) {
    logger.error('更新菜品失败:', error);
    ResponseHelper.error(res, error.message || '更新菜品失败', 500);
  }
};

/**
 * 更新菜品状态
 */
const updateDishStatus = async (req, res) => {
  try {
    const { dishId } = req.params;
    const { status } = req.body;
    
    await adminService.updateDishStatus(req.db, dishId, status);
    ResponseHelper.success(res, null, '更新菜品状态成功');
  } catch (error) {
    logger.error('更新菜品状态失败:', error);
    ResponseHelper.error(res, error.message || '更新菜品状态失败', 500);
  }
};

/**
 * 删除菜品
 */
const deleteDish = async (req, res) => {
  try {
    const { dishId } = req.params;
    
    await adminService.deleteDish(req.db, dishId);
    ResponseHelper.success(res, null, '删除菜品成功');
  } catch (error) {
    logger.error('删除菜品失败:', error);
    ResponseHelper.error(res, error.message || '删除菜品失败', 500);
  }
};

/**
 * 批量删除菜品
 */
const batchDeleteDishes = async (req, res) => {
  try {
    const { dishIds } = req.body;
    
    const result = await adminService.batchDeleteDishes(req.db, dishIds);
    ResponseHelper.success(res, result, '批量删除菜品成功');
  } catch (error) {
    logger.error('批量删除菜品失败:', error);
    ResponseHelper.error(res, error.message || '批量删除菜品失败', 500);
  }
};

/**
 * 获取菜品分类
 */
const getDishCategories = async (req, res) => {
  try {
    const categories = await adminService.getDishCategories(req.db);
    ResponseHelper.success(res, categories, '获取菜品分类成功');
  } catch (error) {
    logger.error('获取菜品分类失败:', error);
    ResponseHelper.error(res, '获取菜品分类失败', 500);
  }
};

/**
 * 创建菜品分类
 */
const createDishCategory = async (req, res) => {
  try {
    const categoryData = {
      ...req.body,
      createBy: req.user.id
    };
    
    const category = await adminService.createDishCategory(req.db, categoryData);
    ResponseHelper.success(res, category, '创建菜品分类成功');
  } catch (error) {
    logger.error('创建菜品分类失败:', error);
    ResponseHelper.error(res, error.message || '创建菜品分类失败', 500);
  }
};

/**
 * 获取营养模板
 */
const getNutritionTemplates = async (req, res) => {
  try {
    const templates = await adminService.getNutritionTemplates(req.db);
    ResponseHelper.success(res, templates, '获取营养模板成功');
  } catch (error) {
    logger.error('获取营养模板失败:', error);
    ResponseHelper.error(res, '获取营养模板失败', 500);
  }
};

/**
 * 上传菜品图片
 */
const uploadDishImage = async (req, res) => {
  try {
    // 这里需要实现文件上传逻辑
    // 暂时返回模拟数据
    const result = {
      url: 'https://example.com/dish-image.jpg',
      fileId: 'dish_' + Date.now(),
      size: req.file ? req.file.size : 0,
      type: req.file ? req.file.mimetype : 'image/jpeg'
    };
    
    ResponseHelper.success(res, result, '上传菜品图片成功');
  } catch (error) {
    logger.error('上传菜品图片失败:', error);
    ResponseHelper.error(res, '上传菜品图片失败', 500);
  }
};

// ================================
// 6. 场地管理模块
// ================================

/**
 * 获取场地列表
 */
const getVenues = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, type, status } = req.query;
    
    const filters = {
      keyword,
      type,
      status
    };
    
    const result = await adminService.getVenues(req.db, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      filters
    });
    
    ResponseHelper.success(res, result, '获取场地列表成功');
  } catch (error) {
    logger.error('获取场地列表失败:', error);
    ResponseHelper.error(res, '获取场地列表失败', 500);
  }
};

/**
 * 创建场地
 */
const createVenue = async (req, res) => {
  try {
    const venueData = {
      ...req.body,
      createBy: req.user.id
    };
    
    const venue = await adminService.createVenue(req.db, venueData);
    ResponseHelper.success(res, venue, '创建场地成功');
  } catch (error) {
    logger.error('创建场地失败:', error);
    ResponseHelper.error(res, error.message || '创建场地失败', 500);
  }
};

/**
 * 更新场地
 */
const updateVenue = async (req, res) => {
  try {
    const { venueId } = req.params;
    const venueData = {
      ...req.body,
      updateBy: req.user.id
    };
    
    const venue = await adminService.updateVenue(req.db, venueId, venueData);
    ResponseHelper.success(res, venue, '更新场地成功');
  } catch (error) {
    logger.error('更新场地失败:', error);
    ResponseHelper.error(res, error.message || '更新场地失败', 500);
  }
};

/**
 * 获取场地时间安排
 */
const getVenueSchedule = async (req, res) => {
  try {
    const { venueId } = req.params;
    const { date } = req.query;
    
    const schedule = await adminService.getVenueSchedule(req.db, venueId, date);
    ResponseHelper.success(res, schedule, '获取场地时间安排成功');
  } catch (error) {
    logger.error('获取场地时间安排失败:', error);
    ResponseHelper.error(res, '获取场地时间安排失败', 500);
  }
};

// ================================
// 7. 时间段管理模块
// ================================

/**
 * 创建时间段
 */
const createTimeSlot = async (req, res) => {
  try {
    const slotData = {
      ...req.body,
      createBy: req.user.id
    };
    
    const timeSlot = await adminService.createTimeSlot(req.db, slotData);
    ResponseHelper.success(res, timeSlot, '创建时间段成功');
  } catch (error) {
    logger.error('创建时间段失败:', error);
    ResponseHelper.error(res, error.message || '创建时间段失败', 500);
  }
};

/**
 * 批量创建时间段
 */
const batchCreateTimeSlots = async (req, res) => {
  try {
    const slots = req.body.map(slot => ({
      ...slot,
      createBy: req.user.id
    }));
    
    const result = await adminService.batchCreateTimeSlots(req.db, slots);
    ResponseHelper.success(res, result, '批量创建时间段成功');
  } catch (error) {
    logger.error('批量创建时间段失败:', error);
    ResponseHelper.error(res, error.message || '批量创建时间段失败', 500);
  }
};

// ================================
// 8. 预约管理模块
// ================================

/**
 * 获取预约列表
 */
const getReservations = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, date, venueName, status } = req.query;
    
    const filters = {
      date,
      venueName,
      status
    };
    
    const result = await adminService.getReservations(req.db, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      filters
    });
    
    ResponseHelper.success(res, result, '获取预约列表成功');
  } catch (error) {
    logger.error('获取预约列表失败:', error);
    ResponseHelper.error(res, '获取预约列表失败', 500);
  }
};

/**
 * 确认预约
 */
const confirmReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    
    await adminService.confirmReservation(req.db, reservationId, req.user.id);
    ResponseHelper.success(res, null, '确认预约成功');
  } catch (error) {
    logger.error('确认预约失败:', error);
    ResponseHelper.error(res, error.message || '确认预约失败', 500);
  }
};

/**
 * 拒绝预约
 */
const rejectReservation = async (req, res) => {
  try {
    const { reservationId } = req.params;
    const { reason } = req.body;
    
    await adminService.rejectReservation(req.db, reservationId, reason, req.user.id);
    ResponseHelper.success(res, null, '拒绝预约成功');
  } catch (error) {
    logger.error('拒绝预约失败:', error);
    ResponseHelper.error(res, error.message || '拒绝预约失败', 500);
  }
};

// ================================
// 9. 系统设置模块
// ================================

/**
 * 获取系统配置
 */
const getSystemConfig = async (req, res) => {
  try {
    const config = await adminService.getSystemConfig(req.db);
    ResponseHelper.success(res, config, '获取系统配置成功');
  } catch (error) {
    logger.error('获取系统配置失败:', error);
    ResponseHelper.error(res, '获取系统配置失败', 500);
  }
};

/**
 * 更新系统配置
 */
const updateSystemConfig = async (req, res) => {
  try {
    const configData = {
      ...req.body,
      updateBy: req.user.id
    };
    
    const config = await adminService.updateSystemConfig(req.db, configData);
    ResponseHelper.success(res, config, '更新系统配置成功');
  } catch (error) {
    logger.error('更新系统配置失败:', error);
    ResponseHelper.error(res, error.message || '更新系统配置失败', 500);
  }
};

/**
 * 获取验证方案
 */
const getVerificationSchemes = async (req, res) => {
  try {
    const schemes = await adminService.getVerificationSchemes(req.db);
    ResponseHelper.success(res, schemes, '获取验证方案成功');
  } catch (error) {
    logger.error('获取验证方案失败:', error);
    ResponseHelper.error(res, '获取验证方案失败', 500);
  }
};

// ================================
// 10. 数据统计模块
// ================================

/**
 * 获取综合统计
 */
const getOverallStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await adminService.getOverallStats(req.db, { startDate, endDate });
    ResponseHelper.success(res, stats, '获取综合统计成功');
  } catch (error) {
    logger.error('获取综合统计失败:', error);
    ResponseHelper.error(res, '获取综合统计失败', 500);
  }
};

/**
 * 获取用餐统计
 */
const getDiningStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await adminService.getDiningStats(req.db, { startDate, endDate });
    ResponseHelper.success(res, stats, '获取用餐统计成功');
  } catch (error) {
    logger.error('获取用餐统计失败:', error);
    ResponseHelper.error(res, '获取用餐统计失败', 500);
  }
};

// ================================
// 11. 文件上传模块
// ================================

/**
 * 上传场地图片
 */
const uploadVenueImage = async (req, res) => {
  try {
    // 这里需要实现文件上传逻辑
    // 暂时返回模拟数据
    const result = {
      url: 'https://example.com/venue-image.jpg',
      fileId: 'venue_' + Date.now(),
      size: req.file ? req.file.size : 0,
      type: req.file ? req.file.mimetype : 'image/jpeg'
    };
    
    ResponseHelper.success(res, result, '上传场地图片成功');
  } catch (error) {
    logger.error('上传场地图片失败:', error);
    ResponseHelper.error(res, '上传场地图片失败', 500);
  }
};

/**
 * 上传头像
 */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return ResponseHelper.error(res, '请选择要上传的头像文件', null, 400);
    }
    
    const file = req.file;
    
    // 生成访问URL (multer已经保存了文件)
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${baseUrl}/uploads/avatars/${file.filename}`;
    
    // 更新用户头像
    const userId = req.user.id;
    await adminService.updateUserAvatar(userId, avatarUrl, req.db);
    
    console.log(`✅ 头像上传成功: ${file.path}`);
    
    ResponseHelper.success(res, { 
      avatarUrl,
      fileName: file.filename,
      fileSize: file.size,
      mimeType: file.mimetype,
      originalName: file.originalname
    }, '头像上传成功');
    
  } catch (error) {
    console.error('头像上传失败:', error);
    ResponseHelper.error(res, '头像上传失败', 500);
  }
};

// ================================
// 公告管理模块
// ================================

/**
 * 获取公告列表
 */
const getNotices = async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, type, keyword } = req.query;
    
    const filters = {
      status,
      type,
      keyword
    };
    
    const result = await adminService.getNotices(filters, parseInt(page), parseInt(pageSize), req.db);
    
    pagination(res, result.records, result.total, result.page, result.pageSize, '获取公告列表成功');
  } catch (error) {
    logger.error('获取公告列表失败:', error);
    ResponseHelper.error(res, '获取公告列表失败', 500);
  }
};

/**
 * 获取公告详情
 */
const getNoticeDetail = async (req, res) => {
  try {
    const { noticeId } = req.params;
    
    const notice = await adminService.getNoticeDetail(noticeId, req.db);
    
    ResponseHelper.success(res, notice, '获取公告详情成功');
  } catch (error) {
    logger.error('获取公告详情失败:', error);
    
    if (error.message === '公告不存在') {
      notFound(res, '公告不存在');
    } else {
      ResponseHelper.error(res, '获取公告详情失败', 500);
    }
  }
};

/**
 * 创建公告
 */
const createNotice = async (req, res) => {
  try {
    const noticeData = {
      ...req.body,
      publisherId: req.user.id,
      publisherName: req.user.nickName || req.user.realName
    };
    
    const notice = await adminService.createNotice(noticeData, req.db);
    
    ResponseHelper.success(res, notice, '公告创建成功');
  } catch (error) {
    logger.error('创建公告失败:', error);
    ResponseHelper.error(res, error.message || '创建公告失败', 500);
  }
};

/**
 * 更新公告
 */
const updateNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    const updateData = req.body;
    
    const notice = await adminService.updateNotice(noticeId, updateData, req.user.id, req.db);
    
    ResponseHelper.success(res, notice, '公告更新成功');
  } catch (error) {
    logger.error('更新公告失败:', error);
    
    if (error.message === '公告不存在') {
      notFound(res, '公告不存在');
    } else {
      ResponseHelper.error(res, error.message || '更新公告失败', 500);
    }
  }
};

/**
 * 删除公告
 */
const deleteNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    
    await adminService.deleteNotice(noticeId, req.user.id, req.db);
    
    ResponseHelper.success(res, null, '公告删除成功');
  } catch (error) {
    logger.error('删除公告失败:', error);
    
    if (error.message === '公告不存在') {
      notFound(res, '公告不存在');
    } else {
      ResponseHelper.error(res, error.message || '删除公告失败', 500);
    }
  }
};

/**
 * 发布公告
 */
const publishNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    
    const notice = await adminService.publishNotice(noticeId, req.user.id, req.db);
    
    ResponseHelper.success(res, notice, '公告发布成功');
  } catch (error) {
    logger.error('发布公告失败:', error);
    
    if (error.message === '公告不存在') {
      notFound(res, '公告不存在');
    } else {
      ResponseHelper.error(res, error.message || '发布公告失败', 500);
    }
  }
};

/**
 * 取消发布公告
 */
const unpublishNotice = async (req, res) => {
  try {
    const { noticeId } = req.params;
    
    const notice = await adminService.unpublishNotice(noticeId, req.user.id, req.db);
    
    ResponseHelper.success(res, notice, '公告取消发布成功');
  } catch (error) {
    logger.error('取消发布公告失败:', error);
    
    if (error.message === '公告不存在') {
      notFound(res, '公告不存在');
    } else {
      ResponseHelper.error(res, error.message || '取消发布公告失败', 500);
    }
  }
};

/**
 * 批量删除公告
 */
const batchDeleteNotices = async (req, res) => {
  try {
    const { noticeIds } = req.body;
    
    if (!Array.isArray(noticeIds) || noticeIds.length === 0) {
      return ResponseHelper.error(res, '请选择要删除的公告', 400);
    }
    
    const result = await adminService.batchDeleteNotices(noticeIds, req.user.id, req.db);
    
    ResponseHelper.success(res, result, '批量删除公告成功');
  } catch (error) {
    logger.error('批量删除公告失败:', error);
    ResponseHelper.error(res, error.message || '批量删除公告失败', 500);
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
  getPermissions,
  updateRolePermissions,
  assignRole,
  batchAssignRole,
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
  uploadDishImage,
  
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
  
  // 文件上传模块
  uploadVenueImage,
  uploadAvatar,
  
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
