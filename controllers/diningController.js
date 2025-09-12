const diningService = require('../services/diningService');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 日常报餐控制器
 */
class DiningController {
  /**
   * 获取菜单信息
   */
  async getMenu(req, res) {
    try {
      const { date, mealType } = req.query;
      
      const menu = await diningService.getMenu(date, mealType, req.db);
      
      if (!menu) {
        return response.notFound(res, '该日期和餐次的菜单尚未');
      }
      
      return response.success(res, menu, '获取菜单成功');
    } catch (error) {
      logger.error('获取菜单失败:', error);
      return response.serverError(res, '获取菜单失败', error.message);
    }
  }
  
  /**
   * 获取部门成员
   */
  async getDeptMembers(req, res) {
    try {
      const userId = req.user.id;
      
      const members = await diningService.getDeptMembers(userId, req.db);
      
      return response.success(res, members, '获取部门成员成功');
    } catch (error) {
      logger.error('获取部门成员失败:', error);
      
      if (error.message === '用户不存在') {
        return response.notFound(res, '用户不存在');
      }
      
      return response.serverError(res, '获取部门成员失败', error.message);
    }
  }
  
  /**
   * 提交部门报餐
   */
  async submitDeptOrder(req, res) {
    try {
      const userId = req.user.id;
      const { date, mealType, memberIds, remark } = req.body;
      
      const result = await diningService.submitDeptOrder(userId, date, mealType, memberIds, remark, req.db);
      
      logger.info(`部门报餐提交成功: 用户 ${userId}, 订单 ${result.orderId}`);
      
      return response.success(res, result, '报餐提交成功');
    } catch (error) {
      logger.error('提交部门报餐失败:', error);
      
      if (error.message.includes('不能为过去的日期报餐')) {
        return response.error(res, error.message, null, 400);
      } else if (error.message.includes('菜单尚未发布')) {
        return response.error(res, error.message, null, 404);
      } else if (error.message.includes('不存在') || error.message.includes('已被禁用')) {
        return response.error(res, error.message, null, 400);
      } else if (error.message.includes('只能为同部门成员报餐')) {
        return response.forbidden(res, error.message);
      } else if (error.message.includes('已经报过餐了')) {
        return response.error(res, error.message, null, 409);
      }
      
      return response.serverError(res, '报餐提交失败', error.message);
    }
  }
  
  /**
   * 获取报餐记录
   */
  async getDiningRecords(req, res) {
    try {
      const userId = req.user.id;
      const { date, startDate, endDate, status, page = 1, pageSize = 20 } = req.query;
      
      // 确保参数为有效值或空字符串
      const filters = { 
        date: date || '', 
        startDate: startDate || '',
        endDate: endDate || '',
        status: status || '' 
      };
      
      // 确保分页参数是有效数字
      const pageNum = parseInt(page) || 1;
      const pageSizeNum = parseInt(pageSize) || 20;
      
      const result = await diningService.getDiningRecords(userId, filters, pageNum, pageSizeNum, req.db);
      
      return response.pagination(res, result.records, result.total, result.page, result.pageSize, '获取报餐记录成功');
    } catch (error) {
      logger.error('获取报餐记录失败:', error);
      return response.serverError(res, '获取报餐记录失败', error.message);
    }
  }
  
  /**
   * 取消报餐订单
   */
  async cancelDiningOrder(req, res) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;
      
      await diningService.cancelDiningOrder(orderId, userId, req.db);
      
      logger.info(`用户 ${userId} 取消报餐订单: ${orderId}`);
      
      return response.success(res, null, '订单取消成功');
    } catch (error) {
      logger.error('取消报餐订单失败:', error);
      
      if (error.message.includes('不存在') || error.message.includes('无权操作')) {
        return response.notFound(res, error.message);
      } else if (error.message.includes('已经取消') || error.message.includes('不能取消')) {
        return response.error(res, error.message, null, 400);
      } else if (error.message.includes('超过取消时限')) {
        return response.error(res, error.message, null, 403);
      }
      
      return response.serverError(res, '订单取消失败', error.message);
    }
  }
  
  /**
   * 获取今日报餐统计（管理员功能）
   */
  async getTodayDiningStats(req, res) {
    try {
      const { date } = req.query;
      const statsDate = date || moment().tz('Asia/Shanghai').format('YYYY-MM-DD');
      
      const stats = await diningService.getTodayDiningStats(statsDate, req.db);
      
      return response.success(res, stats, '获取报餐统计成功');
    } catch (error) {
      logger.error('获取报餐统计失败:', error);
      return response.serverError(res, '获取报餐统计失败', error.message);
    }
  }
  
  /**
   * 确认报餐订单（管理员功能）
   */
  async confirmDiningOrder(req, res) {
    try {
      const adminId = req.user.id;
      const { orderId } = req.params;
      
      await diningService.confirmDiningOrder(orderId, adminId, req.db);
      
      logger.info(`管理员 ${adminId} 确认报餐订单: ${orderId}`);
      
      return response.success(res, null, '订单确认成功');
    } catch (error) {
      logger.error('确认报餐订单失败:', error);
      
      if (error.message.includes('不存在') || error.message.includes('状态不正确')) {
        return response.error(res, error.message, null, 400);
      }
      
      return response.serverError(res, '订单确认失败', error.message);
    }
  }
  
  /**
   * 批量确认报餐订单（管理员功能）
   */
  async batchConfirmDiningOrders(req, res) {
    try {
      const adminId = req.user.id;
      const { orderIds } = req.body;
      
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return response.error(res, '订单ID列表不能为空', null, 400);
      }
      
      let successCount = 0;
      const errors = [];
      
      // 批量处理
      for (const orderId of orderIds) {
        try {
          await diningService.confirmDiningOrder(orderId, adminId, req.db);
          successCount++;
        } catch (error) {
          errors.push({
            orderId,
            error: error.message
          });
        }
      }
      
      logger.info(`管理员 ${adminId} 批量确认报餐订单，成功: ${successCount}, 失败: ${errors.length}`);
      
      return response.success(res, {
        successCount,
        totalCount: orderIds.length,
        errors
      }, `批量确认完成，成功 ${successCount} 个`);
    } catch (error) {
      logger.error('批量确认报餐订单失败:', error);
      return response.serverError(res, '批量确认订单失败', error.message);
    }
  }
  
  /**
   * 获取报餐记录详情
   */
  async getRecordDetail(req, res) {
    try {
      const userId = req.user.id;
      const { recordId } = req.params;
      
      // 验证recordId格式
      if (!recordId || recordId.trim() === '') {
        return response.error(res, '记录ID格式不正确', 'INVALID_RECORD_ID', 400);
      }
      
      // 获取用户信息（用于权限检查）
      const [userRows] = await req.db.execute(
        'SELECT department, role FROM users WHERE _id = ?',
        [userId]
      );
      
      if (userRows.length === 0) {
        return response.unauthorized(res, '用户信息无效');
      }
      
      const user = userRows[0];
      const userDepartment = user.department;
      const userRole = user.role;
      
      const recordDetail = await diningService.getRecordDetail(recordId, userId, userRole, userDepartment, req.db);
      
      return response.success(res, recordDetail, '获取报餐记录详情成功');
    } catch (error) {
      logger.error('获取报餐记录详情失败:', error);
      
      if (error.message === 'RECORD_NOT_FOUND') {
        return response.notFound(res, '报餐记录不存在');
      } else if (error.message === 'PERMISSION_DENIED') {
        return response.forbidden(res, '没有权限查看此记录');
      } else if (error.message.includes('记录ID格式不正确')) {
        return response.error(res, '记录ID格式不正确', 'INVALID_RECORD_ID', 400);
      }
      
      return response.serverError(res, '获取报餐记录详情失败', error.message);
    }
  }

  /**
   * 获取个人报餐状态
   */
  async getPersonalDiningStatus(req, res) {
    try {
      const userId = req.user.id;
      const { date } = req.query;
      
      // 验证日期格式
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return response.badRequest(res, '日期格式不正确，请使用YYYY-MM-DD格式');
      }
      
      const status = await diningService.getPersonalDiningStatus(userId, date, req.db);
      
      return response.success(res, status, '获取个人报餐状态成功');
    } catch (error) {
      logger.error('获取个人报餐状态失败:', error);
      
      if (error.message === '用户不存在') {
        return response.notFound(res, '用户不存在');
      }
      
      return response.serverError(res, '获取个人报餐状态失败', error.message);
    }
  }
}

module.exports = new DiningController();
