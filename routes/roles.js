const express = require('express');
const router = express.Router();
const { authenticateToken, requireSysAdmin } = require('../middleware/auth');
const response = require('../utils/response');
const logger = require('../utils/logger');

// 导入角色服务
const roleService = require('../services/roleService');

/**
 * 角色管理路由
 * 需要系统管理员权限
 */

// 获取角色列表
router.get('/', 
  authenticateToken,
  requireSysAdmin,
  async (req, res) => {
    try {
      const { page = 1, size = 20, keyword, status } = req.query;
      
      const params = {
        page: parseInt(page),
        size: Math.min(parseInt(size), 100),
        keyword,
        status
      };
      
      const roles = await roleService.getRoleList(req.db, params);
      return response.success(res, roles, '获取角色列表成功');
    } catch (error) {
      logger.error('获取角色列表失败:', error);
      return response.serverError(res, '获取角色列表失败', error.message);
    }
  }
);

// 获取角色详情
router.get('/:roleId',
  authenticateToken,
  requireSysAdmin,
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const role = await roleService.getRoleDetail(req.db, roleId);
      
      if (!role) {
        return response.notFound(res, '角色不存在');
      }
      
      return response.success(res, role, '获取角色详情成功');
    } catch (error) {
      logger.error('获取角色详情失败:', error);
      return response.serverError(res, '获取角色详情失败', error.message);
    }
  }
);

// 创建角色
router.post('/',
  authenticateToken,
  requireSysAdmin,
  async (req, res) => {
    try {
      const roleData = req.body;
      const userId = req.user._id;
      
      const result = await roleService.createRole(req.db, roleData, userId);
      return response.success(res, result, '角色创建成功');
    } catch (error) {
      logger.error('创建角色失败:', error);
      return response.serverError(res, '创建角色失败', error.message);
    }
  }
);

// 更新角色
router.put('/:roleId',
  authenticateToken,
  requireSysAdmin,
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const roleData = req.body;
      const userId = req.user._id;
      
      const result = await roleService.updateRole(req.db, roleId, roleData, userId);
      return response.success(res, result, '角色更新成功');
    } catch (error) {
      logger.error('更新角色失败:', error);
      return response.serverError(res, '更新角色失败', error.message);
    }
  }
);

// 删除角色
router.delete('/:roleId',
  authenticateToken,
  requireSysAdmin,
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const userId = req.user._id;
      
      const result = await roleService.deleteRole(req.db, roleId, userId);
      return response.success(res, result, '角色删除成功');
    } catch (error) {
      logger.error('删除角色失败:', error);
      return response.serverError(res, '删除角色失败', error.message);
    }
  }
);

// 获取角色权限
router.get('/:roleId/permissions',
  authenticateToken,
  requireSysAdmin,
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const permissions = await roleService.getRolePermissions(req.db, roleId);
      return response.success(res, permissions, '获取角色权限成功');
    } catch (error) {
      logger.error('获取角色权限失败:', error);
      return response.serverError(res, '获取角色权限失败', error.message);
    }
  }
);

// 更新角色权限
router.put('/:roleId/permissions',
  authenticateToken,
  requireSysAdmin,
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const { permissions } = req.body;
      const userId = req.user._id;
      
      if (!Array.isArray(permissions)) {
        return response.badRequest(res, '权限数据格式错误');
      }
      
      const result = await roleService.updateRolePermissions(req.db, roleId, permissions, userId);
      return response.success(res, result, '角色权限更新成功');
    } catch (error) {
      logger.error('更新角色权限失败:', error);
      return response.serverError(res, '更新角色权限失败', error.message);
    }
  }
);

// 获取权限列表
router.get('/permissions/list',
  authenticateToken,
  requireSysAdmin,
  async (req, res) => {
    try {
      const permissions = await roleService.getPermissionList(req.db);
      return response.success(res, permissions, '获取权限列表成功');
    } catch (error) {
      logger.error('获取权限列表失败:', error);
      return response.serverError(res, '获取权限列表失败', error.message);
    }
  }
);

// 批量分配角色
router.post('/batch/assign',
  authenticateToken,
  requireSysAdmin,
  async (req, res) => {
    try {
      const { userIds, roleId } = req.body;
      const operatorId = req.user._id;
      
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return response.badRequest(res, '用户ID列表不能为空');
      }
      
      if (!roleId) {
        return response.badRequest(res, '角色ID不能为空');
      }
      
      const result = await roleService.batchAssignRole(req.db, userIds, roleId, operatorId);
      return response.success(res, result, '批量分配角色成功');
    } catch (error) {
      logger.error('批量分配角色失败:', error);
      return response.serverError(res, '批量分配角色失败', error.message);
    }
  }
);

// 获取角色用户列表
router.get('/:roleId/users',
  authenticateToken,
  requireSysAdmin,
  async (req, res) => {
    try {
      const { roleId } = req.params;
      const { page = 1, size = 20 } = req.query;
      
      const params = {
        page: parseInt(page),
        size: Math.min(parseInt(size), 100)
      };
      
      const users = await roleService.getRoleUsers(req.db, roleId, params);
      return response.success(res, users, '获取角色用户列表成功');
    } catch (error) {
      logger.error('获取角色用户列表失败:', error);
      return response.serverError(res, '获取角色用户列表失败', error.message);
    }
  }
);

module.exports = router;
