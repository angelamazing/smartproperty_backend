const express = require('express');
const router = express.Router();
const { authenticateToken, requireDeptAdmin } = require('../middleware/auth');
const response = require('../utils/response');
const logger = require('../utils/logger');

// 导入菜品服务
const dishService = require('../services/dishService');

/**
 * 菜品管理路由
 */

// 获取菜品列表
router.get('/', 
  async (req, res) => {
    try {
      const { page = 1, size = 20, categoryId, keyword, status, minPrice, maxPrice } = req.query;
      
      const params = {
        page: parseInt(page),
        size: Math.min(parseInt(size), 100),
        categoryId,
        keyword,
        status,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
      };
      
      const dishes = await dishService.getDishList(req.db, params);
      return response.success(res, dishes, '获取菜品列表成功');
    } catch (error) {
      logger.error('获取菜品列表失败:', error);
      return response.serverError(res, '获取菜品列表失败', error.message);
    }
  }
);

// 获取菜品详情
router.get('/:dishId',
  authenticateToken,
  async (req, res) => {
    try {
      const { dishId } = req.params;
      const dish = await dishService.getDishDetail(req.db, dishId);
      
      if (!dish) {
        return response.notFound(res, '菜品不存在');
      }
      
      return response.success(res, dish, '获取菜品详情成功');
    } catch (error) {
      logger.error('获取菜品详情失败:', error);
      return response.serverError(res, '获取菜品详情失败', error.message);
    }
  }
);

// 创建菜品（管理员功能）
router.post('/',
  authenticateToken,
  requireDeptAdmin,
  async (req, res) => {
    try {
      const dishData = req.body;
      const userId = req.user._id;
      
      const result = await dishService.createDish(req.db, dishData, userId);
      return response.success(res, result, '菜品创建成功');
    } catch (error) {
      logger.error('创建菜品失败:', error);
      return response.serverError(res, '创建菜品失败', error.message);
    }
  }
);

// 更新菜品（管理员功能）
router.put('/:dishId',
  authenticateToken,
  requireDeptAdmin,
  async (req, res) => {
    try {
      const { dishId } = req.params;
      const dishData = req.body;
      const userId = req.user._id;
      
      const result = await dishService.updateDish(req.db, dishId, dishData, userId);
      return response.success(res, result, '菜品更新成功');
    } catch (error) {
      logger.error('更新菜品失败:', error);
      return response.serverError(res, '更新菜品失败', error.message);
    }
  }
);

// 删除菜品（管理员功能）
router.delete('/:dishId',
  authenticateToken,
  requireDeptAdmin,
  async (req, res) => {
    try {
      const { dishId } = req.params;
      const userId = req.user._id;
      
      const result = await dishService.deleteDish(req.db, dishId, userId);
      return response.success(res, result, '菜品删除成功');
    } catch (error) {
      logger.error('删除菜品失败:', error);
      return response.serverError(res, '删除菜品失败', error.message);
    }
  }
);

// 批量更新菜品状态（管理员功能）
router.put('/batch/status',
  authenticateToken,
  requireDeptAdmin,
  async (req, res) => {
    try {
      const { dishIds, status } = req.body;
      const userId = req.user._id;
      
      if (!Array.isArray(dishIds) || dishIds.length === 0) {
        return response.badRequest(res, '菜品ID列表不能为空');
      }
      
      if (!['active', 'inactive'].includes(status)) {
        return response.badRequest(res, '状态值无效');
      }
      
      const result = await dishService.batchUpdateDishStatus(req.db, dishIds, status, userId);
      return response.success(res, result, '批量更新菜品状态成功');
    } catch (error) {
      logger.error('批量更新菜品状态失败:', error);
      return response.serverError(res, '批量更新菜品状态失败', error.message);
    }
  }
);

// 上传菜品图片（管理员功能）
router.post('/:dishId/image',
  authenticateToken,
  requireDeptAdmin,
  async (req, res) => {
    try {
      const { dishId } = req.params;
      const userId = req.user._id;
      
      // 这里需要添加文件上传中间件
      // 暂时返回模拟数据
      const result = await dishService.uploadDishImage(req.db, dishId, 'temp_image_url', userId);
      return response.success(res, result, '菜品图片上传成功');
    } catch (error) {
      logger.error('上传菜品图片失败:', error);
      return response.serverError(res, '上传菜品图片失败', error.message);
    }
  }
);

// 菜品分类管理
router.get('/categories',
  async (req, res) => {
    try {
      const categories = await dishService.getDishCategories(req.db);
      return response.success(res, categories, '获取菜品分类成功');
    } catch (error) {
      logger.error('获取菜品分类失败:', error);
      return response.serverError(res, '获取菜品分类失败', error.message);
    }
  }
);

// 创建菜品分类（管理员功能）
router.post('/categories',
  authenticateToken,
  requireDeptAdmin,
  async (req, res) => {
    try {
      const categoryData = req.body;
      const userId = req.user._id;
      
      const result = await dishService.createDishCategory(req.db, categoryData, userId);
      return response.success(res, result, '菜品分类创建成功');
    } catch (error) {
      logger.error('创建菜品分类失败:', error);
      return response.serverError(res, '创建菜品分类失败', error.message);
    }
  }
);

// 更新菜品分类（管理员功能）
router.put('/categories/:categoryId',
  authenticateToken,
  requireDeptAdmin,
  async (req, res) => {
    try {
      const { categoryId } = req.params;
      const categoryData = req.body;
      const userId = req.user._id;
      
      const result = await dishService.updateDishCategory(req.db, categoryId, categoryData, userId);
      return response.success(res, result, '菜品分类更新成功');
    } catch (error) {
      logger.error('更新菜品分类失败:', error);
      return response.serverError(res, '更新菜品分类失败', error.message);
    }
  }
);

module.exports = router;
