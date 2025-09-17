const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { adminAuth } = require('../middleware/adminAuth');
const { body, query, param } = require('express-validator');
const { validate } = require('../middleware/validation');
const { uploadAvatar, handleUploadError, debugUpload, afterUpload } = require('../middleware/upload-debug');

// 导入管理员控制器
const adminController = require('../controllers/adminController');

// 权限验证中间件 - 所有管理员接口都需要管理员权限
router.use(authenticateToken);
router.use(adminAuth);

// ================================
// 1. 系统统计模块
// ================================

/**
 * @route GET /api/admin/system-stats
 * @desc 获取系统统计数据
 * @access Admin
 */
router.get('/system-stats', adminController.getSystemStats);



/**
 * @route GET /api/admin/system/status
 * @desc 获取系统状态
 * @access Admin
 */
router.get('/system/status', adminController.getSystemStatus);

// ================================
// 2. 菜单管理模块
// ================================

/**
 * @route POST /api/admin/menu/draft
 * @desc 保存菜单草稿
 * @access Admin
 */
router.post('/menu/draft', [
  body('date').notEmpty().withMessage('日期不能为空'),
  body('mealType').isIn(['breakfast', 'lunch', 'dinner']).withMessage('餐次类型无效'),
  body('dishes').isArray().withMessage('菜品列表必须是数组'),
  body('status').optional().isIn(['draft', 'published']).withMessage('状态无效'),
  validate
], adminController.saveMenuDraft);

/**
 * @route POST /api/admin/menu/publish
 * @desc 发布菜单
 * @access Admin
 */
router.post('/menu/publish', [
  body('date').notEmpty().withMessage('日期不能为空'),
  body('mealType').isIn(['breakfast', 'lunch', 'dinner']).withMessage('餐次类型无效'),
  body('dishes').isArray().withMessage('菜品列表必须是数组'),
  body('publishTime').optional().isISO8601().withMessage('发布时间格式无效'),
  body('effectiveTime').optional().isISO8601().withMessage('生效时间格式无效'),
  validate
], adminController.publishMenu);

/**
 * @route GET /api/admin/menu/history
 * @desc 获取菜单历史
 * @access Admin
 */
router.get('/menu/history', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('startDate').optional().isDate().withMessage('开始日期格式无效'),
  query('endDate').optional().isDate().withMessage('结束日期格式无效'),
  query('mealType').optional().isIn(['breakfast', 'lunch', 'dinner']).withMessage('餐次类型无效'),
  validate
], adminController.getMenuHistory);

/**
 * @route GET /api/admin/menu/templates
 * @desc 获取菜单模板
 * @access Admin
 */
router.get('/menu/templates', adminController.getMenuTemplates);

/**
 * @route GET /api/admin/menu/by-date
 * @desc 根据日期和餐次获取菜单
 * @access Admin
 */
router.get('/menu/by-date', [
  query('date').notEmpty().withMessage('日期不能为空'),
  query('mealType').isIn(['breakfast', 'lunch', 'dinner']).withMessage('餐次类型无效'),
  validate
], adminController.getMenuByDate);

/**
 * @route PUT /api/admin/menu/:menuId/revoke
 * @desc 撤回菜单
 * @access Admin
 */
router.put('/menu/:menuId/revoke', [
  param('menuId').notEmpty().withMessage('菜单ID不能为空'),
  validate
], adminController.revokeMenu);

/**
 * @route DELETE /api/admin/menu/:menuId
 * @desc 删除菜单
 * @access Admin
 */
router.delete('/menu/:menuId', [
  param('menuId').notEmpty().withMessage('菜单ID不能为空'),
  validate
], adminController.deleteMenu);

/**
 * @route DELETE /api/admin/menu/templates/:templateId
 * @desc 删除菜单模板
 * @access Admin
 */
router.delete('/menu/templates/:templateId', [
  param('templateId').notEmpty().withMessage('模板ID不能为空'),
  validate
], adminController.deleteMenuTemplate);

/**
 * @route GET /api/admin/menu/:menuId/dishes
 * @desc 获取菜单的菜品列表
 * @access Admin
 */
router.get('/menu/:menuId/dishes', [
  param('menuId').notEmpty().withMessage('菜单ID不能为空'),
  validate
], adminController.getMenuDishes);

/**
 * @route POST /api/admin/menu/:menuId/dishes
 * @desc 设置菜单菜品
 * @access Admin
 */
router.post('/menu/:menuId/dishes', [
  param('menuId').notEmpty().withMessage('菜单ID不能为空'),
  body('dishItems').isArray().withMessage('菜品项目必须是数组'),
  body('dishItems.*.dishId').notEmpty().withMessage('菜品ID不能为空'),
  body('dishItems.*.price').optional().isFloat({ min: 0 }).withMessage('价格必须大于等于0'),
  body('dishItems.*.sort').optional().isInt({ min: 0 }).withMessage('排序必须大于等于0'),
  validate
], adminController.setMenuDishes);

// ================================
// 3. 用户管理模块
// ================================

/**
 * @route GET /api/admin/users
 * @desc 获取用户列表
 * @access Admin
 */
router.get('/users', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('keyword').optional().isLength({ max: 50 }).withMessage('关键词长度不能超过50字符'),
  query('role').optional().isIn(['sys_admin', 'admin', 'user']).withMessage('角色类型无效'),
  query('status').optional().isIn(['active', 'inactive', 'pending', 'suspended']).withMessage('状态无效'),
  query('departmentId').optional().isLength({ max: 36 }).withMessage('部门ID格式无效'),
  validate
], adminController.getUsers);

/**
 * @route GET /api/admin/users/:userId
 * @desc 获取用户详情
 * @access Admin
 */
router.get('/users/:userId', [
  param('userId').notEmpty().withMessage('用户ID不能为空'),
  validate
], adminController.getUserDetail);

/**
 * @route POST /api/admin/users
 * @desc 创建用户
 * @access Admin
 */
router.post('/users', [
  body('realName').notEmpty().isLength({ max: 50 }).withMessage('真实姓名不能为空且不超过50字符'),
  body('phoneNumber').isMobilePhone('zh-CN').withMessage('手机号格式无效'),
  body('email').optional().isEmail().withMessage('邮箱格式无效'),
  body('gender').optional().isIn([0, 1, 2]).withMessage('性别参数无效'),
  body('departmentId').optional().isLength({ max: 36 }).withMessage('部门ID格式无效'),
  body('position').optional().isLength({ max: 100 }).withMessage('职位长度不能超过100字符'),
  body('employeeId').optional().isLength({ max: 20 }).withMessage('员工编号长度不能超过20字符'),
  body('roleId').optional().isLength({ max: 36 }).withMessage('角色ID格式无效'),
  body('joinDate').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) {
      return true; // 允许空值
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
  }).withMessage('入职日期格式无效'),
  body('password').isLength({ min: 6 }).withMessage('密码长度至少6位'),
  body('status').optional().isIn(['active', 'inactive', 'pending', 'suspended']).withMessage('状态无效'),
  body('remark').optional().isLength({ max: 200 }).withMessage('备注长度不能超过200字符'),
  validate
], adminController.createUser);

/**
 * @route PUT /api/admin/users/:userId
 * @desc 更新用户信息
 * @access Admin
 */
router.put('/users/:userId', [
  param('userId').notEmpty().withMessage('用户ID不能为空'),
  body('realName').optional().isLength({ max: 50 }).withMessage('真实姓名不能超过50字符'),
  body('phoneNumber').optional().isMobilePhone('zh-CN').withMessage('手机号格式无效'),
  body('email').optional().isEmail().withMessage('邮箱格式无效'),
  body('gender').optional().isIn([0, 1, 2]).withMessage('性别参数无效'),
  body('departmentId').optional().isLength({ max: 36 }).withMessage('部门ID格式无效'),
  body('position').optional().isLength({ max: 100 }).withMessage('职位长度不能超过100字符'),
  body('employeeId').optional().isLength({ max: 20 }).withMessage('员工编号长度不能超过20字符'),
  body('roleId').optional().isLength({ max: 36 }).withMessage('角色ID格式无效'),
  body('joinDate').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) {
      return true; // 允许空值
    }
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
  }).withMessage('入职日期格式无效'),
  body('password').optional().isLength({ min: 6 }).withMessage('密码长度至少6位'),
  body('resetPassword').optional().isBoolean().withMessage('重置密码参数必须是布尔值'),
  body('status').optional().isIn(['active', 'inactive', 'pending', 'suspended']).withMessage('状态无效'),
  body('remark').optional().isLength({ max: 200 }).withMessage('备注长度不能超过200字符'),
  validate
], adminController.updateUser);

/**
 * @route PUT /api/admin/users/:userId/status
 * @desc 更新用户状态
 * @access Admin
 */
router.put('/users/:userId/status', [
  param('userId').notEmpty().withMessage('用户ID不能为空'),
  body('status').isIn(['active', 'inactive', 'pending', 'suspended']).withMessage('状态无效'),
  body('reason').optional().isLength({ max: 200 }).withMessage('操作原因不能超过200字符'),
  validate
], adminController.updateUserStatus);

/**
 * @route DELETE /api/admin/users/:userId
 * @desc 删除用户
 * @access Admin
 */
router.delete('/users/:userId', [
  param('userId').notEmpty().withMessage('用户ID不能为空'),
  validate
], adminController.deleteUser);

/**
 * @route POST /api/admin/users/batch-delete
 * @desc 批量删除用户
 * @access Admin
 */
router.post('/users/batch-delete', [
  body('userIds').isArray({ min: 1 }).withMessage('用户ID列表不能为空'),
  body('userIds.*').notEmpty().withMessage('用户ID不能为空'),
  validate
], adminController.batchDeleteUsers);

/**
 * @route GET /api/admin/users/:userId/activities
 * @desc 获取用户活动记录
 * @access Admin
 */
router.get('/users/:userId/activities', [
  param('userId').notEmpty().withMessage('用户ID不能为空'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  validate
], adminController.getUserActivities);

// ================================
// 4. 角色和部门管理模块
// ================================

/**
 * @route GET /api/admin/roles
 * @desc 获取角色列表
 * @access Admin
 */
router.get('/roles', adminController.getRoles);

/**
 * @route GET /api/admin/roles/:roleId
 * @desc 获取角色详情
 * @access Admin
 */
router.get('/roles/:roleId', [
  param('roleId').notEmpty().withMessage('角色ID不能为空'),
  validate
], adminController.getRoleDetail);

/**
 * @route POST /api/admin/roles
 * @desc 创建角色
 * @access Admin
 */
router.post('/roles', [
  body('name').notEmpty().isLength({ max: 50 }).withMessage('角色名称不能为空且不超过50字符'),
  body('description').optional().isLength({ max: 200 }).withMessage('描述长度不能超过200字符'),
  body('permissions').optional().isArray().withMessage('权限列表必须是数组'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态无效'),
  validate
], adminController.createRole);

/**
 * @route PUT /api/admin/roles/:roleId
 * @desc 更新角色
 * @access Admin
 */
router.put('/roles/:roleId', [
  param('roleId').notEmpty().withMessage('角色ID不能为空'),
  body('name').optional().isLength({ max: 50 }).withMessage('角色名称不能超过50字符'),
  body('description').optional().isLength({ max: 200 }).withMessage('描述长度不能超过200字符'),
  body('permissions').optional().isArray().withMessage('权限列表必须是数组'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态无效'),
  validate
], adminController.updateRole);

/**
 * @route DELETE /api/admin/roles/:roleId
 * @desc 删除角色
 * @access Admin
 */
router.delete('/roles/:roleId', [
  param('roleId').notEmpty().withMessage('角色ID不能为空'),
  validate
], adminController.deleteRole);

/**
 * @route GET /api/admin/permissions
 * @desc 获取权限列表
 * @access Admin
 */
router.get('/permissions', adminController.getPermissions);

/**
 * @route PUT /api/admin/roles/:roleId/permissions
 * @desc 更新角色权限
 * @access Admin
 */
router.put('/roles/:roleId/permissions', [
  param('roleId').notEmpty().withMessage('角色ID不能为空'),
  body('permissionIds').isArray().withMessage('权限ID列表必须是数组'),
  validate
], adminController.updateRolePermissions);

/**
 * @route POST /api/admin/roles/assign
 * @desc 分配角色
 * @access Admin
 */
router.post('/roles/assign', [
  body('userId').notEmpty().withMessage('用户ID不能为空'),
  body('roleId').notEmpty().withMessage('角色ID不能为空'),
  validate
], adminController.assignRole);

/**
 * @route POST /api/admin/roles/batch-assign
 * @desc 批量分配角色
 * @access Admin
 */
router.post('/roles/batch-assign', [
  body('assignments').isArray({ min: 1 }).withMessage('分配列表不能为空'),
  body('assignments.*.userId').notEmpty().withMessage('用户ID不能为空'),
  body('assignments.*.roleId').notEmpty().withMessage('角色ID不能为空'),
  validate
], adminController.batchAssignRole);

/**
 * @route GET /api/admin/departments
 * @desc 获取部门列表
 * @access Admin
 */
router.get('/departments', adminController.getDepartments);

/**
 * @route POST /api/admin/departments
 * @desc 创建部门
 * @access Admin
 */
router.post('/departments', [
  body('name').notEmpty().isLength({ max: 100 }).withMessage('部门名称不能为空且不超过100字符'),
  body('description').optional().isLength({ max: 200 }).withMessage('描述长度不能超过200字符'),
  body('parentId').optional().isLength({ max: 36 }).withMessage('上级部门ID格式无效'),
  body('managerId').optional().isLength({ max: 36 }).withMessage('管理员ID格式无效'),
  body('sort').optional().isInt({ min: 0 }).withMessage('排序值必须为非负整数'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态无效'),
  validate
], adminController.createDepartment);

/**
 * @route PUT /api/admin/departments/:deptId
 * @desc 更新部门
 * @access Admin
 */
router.put('/departments/:deptId', [
  param('deptId').notEmpty().withMessage('部门ID不能为空'),
  body('name').optional().isLength({ max: 100 }).withMessage('部门名称不能超过100字符'),
  body('description').optional().isLength({ max: 200 }).withMessage('描述长度不能超过200字符'),
  body('parentId').optional().isLength({ max: 36 }).withMessage('上级部门ID格式无效'),
  body('managerId').optional().isLength({ max: 36 }).withMessage('管理员ID格式无效'),
  body('sort').optional().isInt({ min: 0 }).withMessage('排序值必须为非负整数'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态无效'),
  validate
], adminController.updateDepartment);

/**
 * @route DELETE /api/admin/departments/:deptId
 * @desc 删除部门
 * @access Admin
 */
router.delete('/departments/:deptId', [
  param('deptId').notEmpty().withMessage('部门ID不能为空'),
  validate
], adminController.deleteDepartment);

// ================================
// 5. 菜品管理模块
// ================================

/**
 * @route GET /api/admin/dishes
 * @desc 获取菜品列表
 * @access Admin
 */
router.get('/dishes', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('keyword').optional().isLength({ max: 50 }).withMessage('关键词长度不能超过50字符'),
  query('categoryId').optional().isLength({ max: 36 }).withMessage('分类ID格式无效'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('状态无效'),
  query('mealType').optional().isIn(['breakfast', 'lunch', 'dinner']).withMessage('餐次类型无效'),
  validate
], adminController.getDishes);

/**
 * @route GET /api/admin/dishes/meal/:mealType
 * @desc 按餐次类型获取菜品列表
 * @access Admin
 */
router.get('/dishes/meal/:mealType', [
  param('mealType').isIn(['breakfast', 'lunch', 'dinner']).withMessage('餐次类型无效'),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('keyword').optional().isLength({ max: 50 }).withMessage('关键词长度不能超过50字符'),
  query('categoryId').optional().isLength({ max: 36 }).withMessage('分类ID格式无效'),
  query('isRecommended').optional().isBoolean().withMessage('推荐标志必须是布尔值'),
  validate
], adminController.getDishesByMealType);

/**
 * @route POST /api/admin/dishes
 * @desc 创建菜品
 * @access Admin
 */
router.post('/dishes', [
  body('name').notEmpty().isLength({ max: 100 }).withMessage('菜品名称不能为空且不超过100字符'),
  body('categoryId').notEmpty().withMessage('分类ID不能为空'),
  body('description').optional().isLength({ max: 500 }).withMessage('描述长度不能超过500字符'),
  body('price').isFloat({ min: 0 }).withMessage('价格必须大于等于0'),
  body('image').optional().isURL().withMessage('图片URL格式无效'),
  body('calories').optional().isFloat({ min: 0 }).withMessage('卡路里必须大于等于0'),
  body('protein').optional().isFloat({ min: 0 }).withMessage('蛋白质必须大于等于0'),
  body('fat').optional().isFloat({ min: 0 }).withMessage('脂肪必须大于等于0'),
  body('carbohydrate').optional().isFloat({ min: 0 }).withMessage('碳水化合物必须大于等于0'),
  body('tags').optional().isArray().withMessage('标签必须是数组'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态无效'),
  body('isRecommended').optional().isBoolean().withMessage('推荐标志必须是布尔值'),
  body('mealTypes').optional().isArray().withMessage('餐次类型必须是数组'),
  body('mealTypes.*').optional().isIn(['breakfast', 'lunch', 'dinner']).withMessage('餐次类型值无效'),
  validate
], adminController.createDish);

/**
 * @route PUT /api/admin/dishes/:dishId
 * @desc 更新菜品
 * @access Admin
 */
router.put('/dishes/:dishId', [
  param('dishId').notEmpty().withMessage('菜品ID不能为空'),
  body('name').optional().isLength({ max: 100 }).withMessage('菜品名称不能超过100字符'),
  body('categoryId').optional().notEmpty().withMessage('分类ID不能为空'),
  body('description').optional().isLength({ max: 500 }).withMessage('描述长度不能超过500字符'),
  body('price').optional().isFloat({ min: 0 }).withMessage('价格必须大于等于0'),
  body('image').optional().isURL().withMessage('图片URL格式无效'),
  body('calories').optional().isFloat({ min: 0 }).withMessage('卡路里必须大于等于0'),
  body('protein').optional().isFloat({ min: 0 }).withMessage('蛋白质必须大于等于0'),
  body('fat').optional().isFloat({ min: 0 }).withMessage('脂肪必须大于等于0'),
  body('carbohydrate').optional().isFloat({ min: 0 }).withMessage('碳水化合物必须大于等于0'),
  body('tags').optional().isArray().withMessage('标签必须是数组'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态无效'),
  body('isRecommended').optional().isBoolean().withMessage('推荐标志必须是布尔值'),
  body('mealTypes').optional().isArray().withMessage('餐次类型必须是数组'),
  body('mealTypes.*').optional().isIn(['breakfast', 'lunch', 'dinner']).withMessage('餐次类型值无效'),
  validate
], adminController.updateDish);

/**
 * @route PUT /api/admin/dishes/:dishId/status
 * @desc 更新菜品状态
 * @access Admin
 */
router.put('/dishes/:dishId/status', [
  param('dishId').notEmpty().withMessage('菜品ID不能为空'),
  body('status').isIn(['active', 'inactive']).withMessage('状态无效'),
  validate
], adminController.updateDishStatus);

/**
 * @route DELETE /api/admin/dishes/:dishId
 * @desc 删除菜品
 * @access Admin
 */
router.delete('/dishes/:dishId', [
  param('dishId').notEmpty().withMessage('菜品ID不能为空'),
  validate
], adminController.deleteDish);

/**
 * @route POST /api/admin/dishes/batch-delete
 * @desc 批量删除菜品
 * @access Admin
 */
router.post('/dishes/batch-delete', [
  body('dishIds').isArray({ min: 1 }).withMessage('菜品ID列表不能为空'),
  body('dishIds.*').notEmpty().withMessage('菜品ID不能为空'),
  validate
], adminController.batchDeleteDishes);

/**
 * @route GET /api/admin/dishes/categories
 * @desc 获取菜品分类
 * @access Admin
 */
router.get('/dishes/categories', adminController.getDishCategories);

/**
 * @route POST /api/admin/dishes/categories
 * @desc 创建菜品分类
 * @access Admin
 */
router.post('/dishes/categories', [
  body('name').notEmpty().isLength({ max: 50 }).withMessage('分类名称不能为空且不超过50字符'),
  body('description').optional().isLength({ max: 200 }).withMessage('描述长度不能超过200字符'),
  body('icon').optional().isLength({ max: 10 }).withMessage('图标长度不能超过10字符'),
  body('color').optional().isLength({ max: 7 }).withMessage('颜色代码格式无效'),
  body('sort').optional().isInt({ min: 0 }).withMessage('排序值必须为非负整数'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态无效'),
  validate
], adminController.createDishCategory);

/**
 * @route GET /api/admin/dishes/nutrition-templates
 * @desc 获取营养模板
 * @access Admin
 */
router.get('/dishes/nutrition-templates', adminController.getNutritionTemplates);

/**
 * @route POST /api/admin/dishes/upload-image
 * @desc 上传菜品图片
 * @access Admin
 */
router.post('/dishes/upload-image', adminController.uploadDishImage);

// ================================
// 6. 场地管理模块
// ================================

/**
 * @route GET /api/admin/venues
 * @desc 获取场地列表
 * @access Admin
 */
router.get('/venues', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('keyword').optional().isLength({ max: 50 }).withMessage('关键词长度不能超过50字符'),
  query('type').optional().isLength({ max: 50 }).withMessage('类型长度不能超过50字符'),
  query('status').optional().isIn(['active', 'inactive', 'maintenance']).withMessage('状态无效'),
  validate
], adminController.getVenues);

/**
 * @route POST /api/admin/venues
 * @desc 创建场地
 * @access Admin
 */
router.post('/venues', [
  body('name').notEmpty().isLength({ max: 100 }).withMessage('场地名称不能为空且不超过100字符'),
  body('type').notEmpty().isLength({ max: 50 }).withMessage('场地类型不能为空且不超过50字符'),
  body('description').optional().isLength({ max: 500 }).withMessage('描述长度不能超过500字符'),
  body('location').optional().isLength({ max: 200 }).withMessage('位置信息不能超过200字符'),
  body('capacity').isInt({ min: 1 }).withMessage('容量必须大于0'),
  body('pricePerHour').isFloat({ min: 0 }).withMessage('每小时价格必须大于等于0'),
  body('features').optional().isArray().withMessage('设施特色必须是数组'),
  body('image').optional().isURL().withMessage('图片URL格式无效'),
  body('openTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('开放时间格式无效'),
  body('closeTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('关闭时间格式无效'),
  body('workingDays').isArray({ min: 1, max: 7 }).withMessage('工作日设置无效'),
  body('advanceBookingDays').isInt({ min: 1, max: 30 }).withMessage('提前预约天数必须在1-30之间'),
  body('minBookingHours').isInt({ min: 1 }).withMessage('最小预约时长必须大于0'),
  body('maxBookingHours').isInt({ min: 1 }).withMessage('最大预约时长必须大于0'),
  body('requireApproval').isBoolean().withMessage('是否需要审批必须是布尔值'),
  body('allowCancellation').isBoolean().withMessage('是否允许取消必须是布尔值'),
  body('status').optional().isIn(['active', 'inactive', 'maintenance']).withMessage('状态无效'),
  body('sort').optional().isInt({ min: 0 }).withMessage('排序值必须为非负整数'),
  validate
], adminController.createVenue);

/**
 * @route PUT /api/admin/venues/:venueId
 * @desc 更新场地
 * @access Admin
 */
router.put('/venues/:venueId', [
  param('venueId').notEmpty().withMessage('场地ID不能为空'),
  body('name').optional().isLength({ max: 100 }).withMessage('场地名称不能超过100字符'),
  body('type').optional().isLength({ max: 50 }).withMessage('场地类型不能超过50字符'),
  body('description').optional().isLength({ max: 500 }).withMessage('描述长度不能超过500字符'),
  body('location').optional().isLength({ max: 200 }).withMessage('位置信息不能超过200字符'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('容量必须大于0'),
  body('pricePerHour').optional().isFloat({ min: 0 }).withMessage('每小时价格必须大于等于0'),
  body('features').optional().isArray().withMessage('设施特色必须是数组'),
  body('image').optional().isURL().withMessage('图片URL格式无效'),
  body('openTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('开放时间格式无效'),
  body('closeTime').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('关闭时间格式无效'),
  body('workingDays').optional().isArray({ min: 1, max: 7 }).withMessage('工作日设置无效'),
  body('advanceBookingDays').optional().isInt({ min: 1, max: 30 }).withMessage('提前预约天数必须在1-30之间'),
  body('minBookingHours').optional().isInt({ min: 1 }).withMessage('最小预约时长必须大于0'),
  body('maxBookingHours').optional().isInt({ min: 1 }).withMessage('最大预约时长必须大于0'),
  body('requireApproval').optional().isBoolean().withMessage('是否需要审批必须是布尔值'),
  body('allowCancellation').optional().isBoolean().withMessage('是否允许取消必须是布尔值'),
  body('status').optional().isIn(['active', 'inactive', 'maintenance']).withMessage('状态无效'),
  body('sort').optional().isInt({ min: 0 }).withMessage('排序值必须为非负整数'),
  validate
], adminController.updateVenue);

/**
 * @route GET /api/admin/venues/:venueId/schedule
 * @desc 获取场地时间安排
 * @access Admin
 */
router.get('/venues/:venueId/schedule', [
  param('venueId').notEmpty().withMessage('场地ID不能为空'),
  query('date').isDate().withMessage('日期格式无效'),
  validate
], adminController.getVenueSchedule);

// ================================
// 7. 时间段管理模块
// ================================

/**
 * @route POST /api/admin/time-slots
 * @desc 创建时间段
 * @access Admin
 */
router.post('/time-slots', [
  body('venueId').notEmpty().withMessage('场地ID不能为空'),
  body('date').isDate().withMessage('日期格式无效'),
  body('startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('开始时间格式无效'),
  body('endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('结束时间格式无效'),
  body('status').optional().isIn(['available', 'booked', 'blocked']).withMessage('状态无效'),
  body('price').optional().isFloat({ min: 0 }).withMessage('价格必须大于等于0'),
  body('remark').optional().isLength({ max: 200 }).withMessage('备注长度不能超过200字符'),
  validate
], adminController.createTimeSlot);

/**
 * @route POST /api/admin/time-slots/batch
 * @desc 批量创建时间段
 * @access Admin
 */
router.post('/time-slots/batch', [
  body('*.venueId').notEmpty().withMessage('场地ID不能为空'),
  body('*.date').isDate().withMessage('日期格式无效'),
  body('*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('开始时间格式无效'),
  body('*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('结束时间格式无效'),
  body('*.status').optional().isIn(['available', 'booked', 'blocked']).withMessage('状态无效'),
  body('*.price').optional().isFloat({ min: 0 }).withMessage('价格必须大于等于0'),
  validate
], adminController.batchCreateTimeSlots);

// ================================
// 8. 预约管理模块
// ================================

/**
 * @route GET /api/admin/reservations
 * @desc 获取预约列表
 * @access Admin
 */
router.get('/reservations', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须大于0'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('date').optional().isDate().withMessage('日期格式无效'),
  query('venueName').optional().isLength({ max: 100 }).withMessage('场地名称长度不能超过100字符'),
  query('status').optional().isIn(['pending', 'confirmed', 'rejected', 'cancelled']).withMessage('状态无效'),
  validate
], adminController.getReservations);

/**
 * @route PUT /api/admin/reservations/:reservationId/confirm
 * @desc 确认预约
 * @access Admin
 */
router.put('/reservations/:reservationId/confirm', [
  param('reservationId').notEmpty().withMessage('预约ID不能为空'),
  validate
], adminController.confirmReservation);

/**
 * @route PUT /api/admin/reservations/:reservationId/reject
 * @desc 拒绝预约
 * @access Admin
 */
router.put('/reservations/:reservationId/reject', [
  param('reservationId').notEmpty().withMessage('预约ID不能为空'),
  body('reason').notEmpty().isLength({ max: 200 }).withMessage('拒绝原因不能为空且不超过200字符'),
  validate
], adminController.rejectReservation);

// ================================
// 9. 系统设置模块
// ================================

/**
 * @route GET /api/admin/system/config
 * @desc 获取系统配置
 * @access Admin
 */
router.get('/system/config', adminController.getSystemConfig);

/**
 * @route PUT /api/admin/system/config
 * @desc 更新系统配置
 * @access Admin
 */
router.put('/system/config', adminController.updateSystemConfig);

/**
 * @route GET /api/admin/system/verification-schemes
 * @desc 获取验证方案
 * @access Admin
 */
router.get('/system/verification-schemes', adminController.getVerificationSchemes);

// ================================
// 10. 数据统计模块
// ================================

/**
 * @route GET /api/admin/stats/overall
 * @desc 获取综合统计
 * @access Admin
 */
router.get('/stats/overall', [
  query('startDate').optional().isDate().withMessage('开始日期格式无效'),
  query('endDate').optional().isDate().withMessage('结束日期格式无效'),
  validate
], adminController.getOverallStats);

/**
 * @route GET /api/admin/stats/dining
 * @desc 获取用餐统计
 * @access Admin
 */
router.get('/stats/dining', [
  query('startDate').optional().isDate().withMessage('开始日期格式无效'),
  query('endDate').optional().isDate().withMessage('结束日期格式无效'),
  validate
], adminController.getDiningStats);

// ================================
// 11. 文件上传模块
// ================================

/**
 * @route POST /api/admin/venues/upload-image
 * @desc 上传场地图片
 * @access Admin
 */
router.post('/venues/upload-image', adminController.uploadVenueImage);

// 用户资料管理
router.get('/user/profile', adminAuth, adminController.getUserProfile);
router.put('/user/profile', adminAuth, adminController.updateUserProfile);
router.put('/user/avatar', adminAuth, adminController.updateUserAvatar);

// 文件上传
router.post('/upload/avatar', adminAuth, debugUpload, uploadAvatar, afterUpload, handleUploadError, adminController.uploadAvatar);

// ================================
// 12. 公告管理模块
// ================================

/**
 * @route GET /api/admin/notices
 * @desc 获取公告列表
 * @access Admin
 */
router.get('/notices', adminController.getNotices);

/**
 * @route GET /api/admin/notices/:noticeId
 * @desc 获取公告详情
 * @access Admin
 */
router.get('/notices/:noticeId', adminController.getNoticeDetail);

/**
 * @route POST /api/admin/notices
 * @desc 创建公告
 * @access Admin
 */
router.post('/notices', [
  body('title').notEmpty().isLength({ max: 200 }).withMessage('公告标题不能为空且不超过200字符'),
  body('content').notEmpty().withMessage('公告内容不能为空'),
  body('type').optional().isIn(['info', 'warning', 'error', 'success']).withMessage('公告类型无效'),
  body('priority').optional().isInt({ min: 0, max: 10 }).withMessage('优先级必须在0-10之间'),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('状态无效'),
  body('startTime').optional().isISO8601().withMessage('开始时间格式无效'),
  body('endTime').optional().isISO8601().withMessage('结束时间格式无效'),
  body('startDate').optional().isDate().withMessage('开始日期格式无效，请使用YYYY-MM-DD格式'),
  body('endDate').optional().isDate().withMessage('结束日期格式无效，请使用YYYY-MM-DD格式'),
  body('isSticky').optional().isBoolean().withMessage('置顶状态无效'),
  body('targetUsers').optional().isArray().withMessage('目标用户必须是数组'),
  validate
], adminController.createNotice);

/**
 * @route PUT /api/admin/notices/:noticeId
 * @desc 更新公告
 * @access Admin
 */
router.put('/notices/:noticeId', [
  param('noticeId').notEmpty().withMessage('公告ID不能为空'),
  body('title').optional().isLength({ max: 200 }).withMessage('公告标题不超过200字符'),
  body('content').optional().notEmpty().withMessage('公告内容不能为空'),
  body('type').optional().isIn(['info', 'warning', 'error', 'success']).withMessage('公告类型无效'),
  body('priority').optional().isInt({ min: 0, max: 10 }).withMessage('优先级必须在0-10之间'),
  body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('状态无效'),
  body('startTime').optional().isISO8601().withMessage('开始时间格式无效'),
  body('endTime').optional().isISO8601().withMessage('结束时间格式无效'),
  body('startDate').optional().isDate().withMessage('开始日期格式无效，请使用YYYY-MM-DD格式'),
  body('endDate').optional().isDate().withMessage('结束日期格式无效，请使用YYYY-MM-DD格式'),
  body('isSticky').optional().isBoolean().withMessage('置顶状态无效'),
  body('targetUsers').optional().isArray().withMessage('目标用户必须是数组'),
  validate
], adminController.updateNotice);

/**
 * @route DELETE /api/admin/notices/:noticeId
 * @desc 删除公告
 * @access Admin
 */
router.delete('/notices/:noticeId', [
  param('noticeId').notEmpty().withMessage('公告ID不能为空'),
  validate
], adminController.deleteNotice);

/**
 * @route POST /api/admin/notices/:noticeId/publish
 * @desc 发布公告
 * @access Admin
 */
router.post('/notices/:noticeId/publish', [
  param('noticeId').notEmpty().withMessage('公告ID不能为空'),
  validate
], adminController.publishNotice);

/**
 * @route POST /api/admin/notices/:noticeId/unpublish
 * @desc 取消发布公告
 * @access Admin
 */
router.post('/notices/:noticeId/unpublish', [
  param('noticeId').notEmpty().withMessage('公告ID不能为空'),
  validate
], adminController.unpublishNotice);

/**
 * @route DELETE /api/admin/notices/batch
 * @desc 批量删除公告
 * @access Admin
 */
router.delete('/notices/batch', [
  body('noticeIds').isArray({ min: 1 }).withMessage('请选择要删除的公告'),
  body('noticeIds.*').isUUID().withMessage('公告ID格式无效'),
  validate
], adminController.batchDeleteNotices);

module.exports = router;
