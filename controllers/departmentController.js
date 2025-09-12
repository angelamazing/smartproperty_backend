const departmentService = require('../services/departmentService');
const { ResponseHelper } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 部门管理控制器
 * 处理部门管理相关的HTTP请求
 */
class DepartmentController {
  /**
   * 获取部门列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDepartments(req, res) {
    try {
      const { status, includeManager } = req.query;
      
      const departments = await departmentService.getDepartments(req.db, {
        status: status || 'active',
        includeManager: includeManager !== 'false'
      });
      
      return ResponseHelper.success(res, departments, '获取部门列表成功');
    } catch (error) {
      logger.error('获取部门列表失败:', error);
      return ResponseHelper.error(res, '获取部门列表失败', 500);
    }
  }

  /**
   * 获取部门详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDepartmentById(req, res) {
    try {
      const { departmentId } = req.params;
      
      const department = await departmentService.getDepartmentById(req.db, departmentId);
      
      if (!department) {
        return ResponseHelper.error(res, '部门不存在', 404);
      }
      
      return ResponseHelper.success(res, department, '获取部门详情成功');
    } catch (error) {
      logger.error('获取部门详情失败:', error);
      return ResponseHelper.error(res, '获取部门详情失败', 500);
    }
  }

  /**
   * 获取部门成员列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDepartmentMembers(req, res) {
    try {
      const { departmentId } = req.params;
      const { page, pageSize, status, role, keyword } = req.query;
      
      // 检查部门是否存在
      const department = await departmentService.getDepartmentById(req.db, departmentId);
      if (!department) {
        return ResponseHelper.error(res, '部门不存在', 404);
      }
      
      // 权限检查：部门管理员只能查看自己部门的成员
      if (req.user.role === 'dept_admin' && req.user.departmentId !== departmentId) {
        return ResponseHelper.error(res, '权限不足，只能查看本部门成员', 403);
      }
      
      const result = await departmentService.getDepartmentMembers(req.db, departmentId, {
        page: parseInt(page) || 1,
        pageSize: parseInt(pageSize) || 20,
        status: status || 'active',
        role,
        keyword
      });
      
      return ResponseHelper.success(res, result, '获取部门成员成功');
    } catch (error) {
      logger.error('获取部门成员失败:', error);
      return ResponseHelper.error(res, '获取部门成员失败', 500);
    }
  }

  /**
   * 获取当前用户的部门信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getMyDepartment(req, res) {
    try {
      const userDepartment = await departmentService.getUserDepartment(req.db, req.user.id);
      
      if (!userDepartment) {
        return ResponseHelper.error(res, '用户未分配部门', 404);
      }
      
      return ResponseHelper.success(res, userDepartment, '获取部门信息成功');
    } catch (error) {
      logger.error('获取用户部门信息失败:', error);
      return ResponseHelper.error(res, '获取部门信息失败', 500);
    }
  }

  /**
   * 验证部门管理员权限
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async checkDepartmentAdmin(req, res) {
    try {
      const { departmentId } = req.params;
      
      const result = await departmentService.isDepartmentAdmin(req.db, req.user.id, departmentId);
      
      return ResponseHelper.success(res, result, '权限验证完成');
    } catch (error) {
      logger.error('验证部门管理员权限失败:', error);
      return ResponseHelper.error(res, '权限验证失败', 500);
    }
  }

  /**
   * 创建部门（系统管理员权限）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createDepartment(req, res) {
    try {
      const departmentData = req.body;
      
      // 验证必填字段
      if (!departmentData.name || !departmentData.code) {
        return ResponseHelper.error(res, '部门名称和编码不能为空', 400);
      }
      
      const department = await departmentService.createDepartment(
        req.db, 
        departmentData, 
        req.user.id
      );
      
      return ResponseHelper.success(res, department, '创建部门成功');
    } catch (error) {
      logger.error('创建部门失败:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return ResponseHelper.error(res, '部门编码已存在', 400);
      }
      
      return ResponseHelper.error(res, '创建部门失败', 500);
    }
  }

  /**
   * 更新部门信息（系统管理员权限）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updateDepartment(req, res) {
    try {
      const { departmentId } = req.params;
      const updateData = req.body;
      
      // 检查部门是否存在
      const existingDepartment = await departmentService.getDepartmentById(req.db, departmentId);
      if (!existingDepartment) {
        return ResponseHelper.error(res, '部门不存在', 404);
      }
      
      const updatedDepartment = await departmentService.updateDepartment(
        req.db,
        departmentId,
        updateData,
        req.user.id
      );
      
      return ResponseHelper.success(res, updatedDepartment, '更新部门成功');
    } catch (error) {
      logger.error('更新部门失败:', error);
      
      if (error.code === 'ER_DUP_ENTRY') {
        return ResponseHelper.error(res, '部门编码已存在', 400);
      }
      
      return ResponseHelper.error(res, '更新部门失败', 500);
    }
  }

  /**
   * 获取部门统计数据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDepartmentStats(req, res) {
    try {
      const stats = await departmentService.getDepartmentStats(req.db);
      
      return ResponseHelper.success(res, stats, '获取部门统计数据成功');
    } catch (error) {
      logger.error('获取部门统计数据失败:', error);
      return ResponseHelper.error(res, '获取部门统计数据失败', 500);
    }
  }

  /**
   * 获取部门管理员的部门信息
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getMyDepartmentInfo(req, res) {
    try {
      // 只有部门管理员及以上权限可以访问此接口
      if (!['dept_admin', 'sys_admin'].includes(req.user.role)) {
        return ResponseHelper.error(res, '权限不足，需要部门管理员及以上权限', 403);
      }
      
      console.log('getMyDepartmentInfo调试信息:');
      console.log('req.user:', JSON.stringify(req.user, null, 2));
      console.log('req.user.id:', req.user.id);
      
      const userDepartment = await departmentService.getUserDepartment(req.db, req.user.id);
      
      console.log('getUserDepartment结果:', JSON.stringify(userDepartment, null, 2));
      
      if (!userDepartment) {
        return ResponseHelper.error(res, '用户未分配部门', 404);
      }
      
      // 获取部门成员列表（不包含分页，用于统计）
      const members = await departmentService.getDepartmentMembers(req.db, userDepartment.departmentId, {
        page: 1,
        pageSize: 1000 // 获取所有成员
      });
      
      const result = {
        ...userDepartment,
        memberCount: members.total,
        members: members.list.slice(0, 10) // 只返回前10个成员作为预览
      };
      
      return ResponseHelper.success(res, result, '获取部门信息成功');
    } catch (error) {
      logger.error('获取部门管理员部门信息失败:', error);
      return ResponseHelper.error(res, '获取部门信息失败', 500);
    }
  }
}

module.exports = new DepartmentController();