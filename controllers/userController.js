const userService = require('../services/userService');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 用户控制器
 */
class UserController {
  /**
   * 获取用户统计数据
   */
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;
      
      const stats = await userService.getUserStats(userId, req.db);
      
      return response.success(res, stats, '获取用户统计数据成功');
    } catch (error) {
      logger.error('获取用户统计数据失败:', error);
      return response.serverError(res, '获取用户统计数据失败', error.message);
    }
  }
  
  /**
   * 更新用户头像
   */
  async updateUserAvatar(req, res) {
    try {
      const userId = req.user.id;
      const { avatarUrl } = req.body;
      
      await userService.updateUserAvatar(userId, avatarUrl, req.db);
      
      logger.info(`用户 ${userId} 更新头像成功`);
      return response.success(res, null, '头像更新成功');
    } catch (error) {
      logger.error('更新用户头像失败:', error);
      
      if (error.message === '用户不存在') {
        return response.notFound(res, '用户不存在');
      }
      
      return response.serverError(res, '头像更新失败', error.message);
    }
  }
  
  /**
   * 更新用户资料
   */
  async updateUserProfile(req, res) {
    try {
      const userId = req.user.id;
      const profileData = req.body;
      
      await userService.updateUserProfile(userId, profileData, req.db);
      
      logger.info(`用户 ${userId} 更新资料成功`);
      return response.success(res, null, '资料更新成功');
    } catch (error) {
      logger.error('更新用户资料失败:', error);
      
      if (error.message === '用户不存在') {
        return response.notFound(res, '用户不存在');
      } else if (error.message.includes('已被其他用户使用')) {
        return response.error(res, error.message, null, 409);
      } else if (error.message === '没有需要更新的字段') {
        return response.error(res, error.message, null, 400);
      }
      
      return response.serverError(res, '资料更新失败', error.message);
    }
  }
  
  /**
   * 获取当前用户信息
   */
  async getCurrentUserInfo(req, res) {
    try {
      const userId = req.user.id;
      
      const userInfo = await userService.getUserInfo(userId, req.db);
      
      return response.success(res, userInfo, '获取用户信息成功');
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      
      if (error.message === '用户不存在') {
        return response.notFound(res, '用户不存在');
      }
      
      return response.serverError(res, '获取用户信息失败', error.message);
    }
  }
  
  /**
   * 修改用户密码
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { oldPassword, newPassword } = req.body;
      
      await userService.changePassword(userId, oldPassword, newPassword, req.db);
      
      logger.info(`用户 ${userId} 修改密码成功`);
      return response.success(res, null, '密码修改成功');
    } catch (error) {
      logger.error('修改用户密码失败:', error);
      
      if (error.message === '用户不存在') {
        return response.notFound(res, '用户不存在');
      } else if (error.message === '旧密码不正确') {
        return response.error(res, '旧密码不正确', null, 400);
      }
      
      return response.serverError(res, '密码修改失败', error.message);
    }
  }
  
  /**
   * 重置用户密码（管理员功能）
   */
  async resetPassword(req, res) {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;
      const adminId = req.user.id;
      
      await userService.resetPassword(userId, newPassword, adminId, req.db);
      
      logger.info(`管理员 ${adminId} 重置用户 ${userId} 密码成功`);
      return response.success(res, {
        userId,
        resetTime: new Date().toISOString(),
        resetBy: adminId
      }, '用户密码重置成功');
    } catch (error) {
      logger.error('重置用户密码失败:', error);
      
      if (error.message === '用户不存在') {
        return response.notFound(res, '用户不存在');
      }
      
      return response.serverError(res, '密码重置失败', error.message);
    }
  }
  
  /**
   * 获取用户列表（管理员功能）
   */
  async getUserList(req, res) {
    try {
      const { role, status, department, keyword, page = 1, pageSize = 20 } = req.query;
      
      const filters = {
        role,
        status,
        department,
        keyword
      };
      
      const result = await userService.getUserList(filters, parseInt(page), parseInt(pageSize), req.db);
      
      return response.pagination(res, result.records, result.total, result.page, result.pageSize, '获取用户列表成功');
    } catch (error) {
      logger.error('获取用户列表失败:', error);
      return response.serverError(res, '获取用户列表失败', error.message);
    }
  }
  
  /**
   * 获取指定用户信息（管理员功能）
   */
  async getUserInfo(req, res) {
    try {
      const { userId } = req.params;
      
      const userInfo = await userService.getUserInfo(userId, req.db);
      
      return response.success(res, userInfo, '获取用户信息成功');
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      
      if (error.message === '用户不存在') {
        return response.notFound(res, '用户不存在');
      }
      
      return response.serverError(res, '获取用户信息失败', error.message);
    }
  }
  
  /**
   * 更新用户状态（管理员功能）
   */
  async updateUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      const adminId = req.user.id;
      
      // 验证状态值
      if (!['active', 'inactive'].includes(status)) {
        return response.error(res, '无效的用户状态', null, 400);
      }
      
      await userService.updateUserStatus(userId, status, adminId, req.db);
      
      logger.info(`管理员 ${adminId} 更新用户 ${userId} 状态为 ${status}`);
      return response.success(res, null, '用户状态更新成功');
    } catch (error) {
      logger.error('更新用户状态失败:', error);
      
      if (error.message === '用户不存在') {
        return response.notFound(res, '用户不存在');
      } else if (error.message.includes('不能修改')) {
        return response.forbidden(res, error.message);
      }
      
      return response.serverError(res, '用户状态更新失败', error.message);
    }
  }
  
  /**
   * 更新用户角色（系统管理员功能）
   */
  async updateUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const adminId = req.user.id;
      
      // 验证角色值
      if (!['user', 'admin', 'dept_admin', 'sys_admin'].includes(role)) {
        return response.error(res, '无效的用户角色', null, 400);
      }
      
      await userService.updateUserRole(userId, role, adminId, req.db);
      
      logger.info(`系统管理员 ${adminId} 更新用户 ${userId} 角色为 ${role}`);
      return response.success(res, null, '用户角色更新成功');
    } catch (error) {
      logger.error('更新用户角色失败:', error);
      
      if (error.message === '用户不存在') {
        return response.notFound(res, '用户不存在');
      }
      
      return response.serverError(res, '用户角色更新失败', error.message);
    }
  }
  
  /**
   * 删除用户（系统管理员功能）
   */
  async deleteUser(req, res) {
    try {
      const { userId } = req.params;
      const adminId = req.user.id;
      
      await userService.deleteUser(userId, adminId, req.db);
      
      logger.info(`系统管理员 ${adminId} 删除用户 ${userId}`);
      return response.success(res, null, '用户删除成功');
    } catch (error) {
      logger.error('删除用户失败:', error);
      
      if (error.message === '用户不存在') {
        return response.notFound(res, '用户不存在');
      } else if (error.message.includes('不能删除')) {
        return response.forbidden(res, error.message);
      }
      
      return response.serverError(res, '用户删除失败', error.message);
    }
  }
  
  /**
   * 批量更新用户状态（管理员功能）
   */
  async batchUpdateUserStatus(req, res) {
    try {
      const { userIds, status } = req.body;
      const adminId = req.user.id;
      
      // 验证参数
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return response.error(res, '用户ID列表不能为空', null, 400);
      }
      
      if (!['active', 'inactive'].includes(status)) {
        return response.error(res, '无效的用户状态', null, 400);
      }
      
      let successCount = 0;
      const errors = [];
      
      // 批量处理
      for (const userId of userIds) {
        try {
          await userService.updateUserStatus(userId, status, adminId, req.db);
          successCount++;
        } catch (error) {
          errors.push({
            userId,
            error: error.message
          });
        }
      }
      
      logger.info(`管理员 ${adminId} 批量更新用户状态，成功: ${successCount}, 失败: ${errors.length}`);
      
      return response.success(res, {
        successCount,
        totalCount: userIds.length,
        errors
      }, `批量更新完成，成功 ${successCount} 个`);
    } catch (error) {
      logger.error('批量更新用户状态失败:', error);
      return response.serverError(res, '批量更新用户状态失败', error.message);
    }
  }
}

module.exports = new UserController();
