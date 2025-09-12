const diningConfirmationService = require('../services/diningConfirmationService');
const response = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 就餐确认控制器
 * 处理报餐后的确认就餐相关请求
 */
class DiningConfirmationController {

  /**
   * 用户手动确认就餐
   */
  async confirmDiningManually(req, res) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;
      const { confirmationType = 'manual' } = req.body;

      // 验证参数
      if (!orderId || orderId.trim() === '') {
        return response.badRequest(res, '订单ID不能为空');
      }

      const result = await diningConfirmationService.confirmDiningManually(
        userId, 
        orderId, 
        confirmationType, 
        req.db
      );

      logger.info(`用户 ${userId} 手动确认就餐成功: 订单 ${orderId}`);

      return response.success(res, result, '确认就餐成功');
    } catch (error) {
      logger.error('手动确认就餐失败:', error);

      if (error.message.includes('订单不存在') || error.message.includes('无权操作')) {
        return response.notFound(res, error.message);
      } else if (error.message.includes('已确认就餐') || error.message.includes('已取消')) {
        return response.error(res, error.message, null, 400);
      } else if (error.message.includes('不在就餐时间内')) {
        return response.error(res, error.message, null, 400);
      }

      return response.serverError(res, '确认就餐失败', error.message);
    }
  }

  /**
   * 管理员代确认就餐
   */
  async confirmDiningByAdmin(req, res) {
    try {
      const adminId = req.user.id;
      const { orderId } = req.params;
      const { remark } = req.body;

      // 验证参数
      if (!orderId || orderId.trim() === '') {
        return response.badRequest(res, '订单ID不能为空');
      }

      const result = await diningConfirmationService.confirmDiningByAdmin(
        adminId, 
        orderId, 
        remark, 
        req.db
      );

      logger.info(`管理员 ${adminId} 代确认就餐成功: 订单 ${orderId}`);

      return response.success(res, result, '管理员代确认就餐成功');
    } catch (error) {
      logger.error('管理员代确认就餐失败:', error);

      if (error.message.includes('订单不存在')) {
        return response.notFound(res, error.message);
      } else if (error.message.includes('已确认就餐') || error.message.includes('已取消')) {
        return response.error(res, error.message, null, 400);
      }

      return response.serverError(res, '管理员代确认就餐失败', error.message);
    }
  }

  /**
   * 批量确认就餐（管理员功能）
   */
  async batchConfirmDining(req, res) {
    try {
      const adminId = req.user.id;
      const { orderIds, remark } = req.body;

      // 验证参数
      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        return response.badRequest(res, '订单ID列表不能为空');
      }

      if (orderIds.length > 50) {
        return response.badRequest(res, '批量确认订单数量不能超过50个');
      }

      const result = await diningConfirmationService.batchConfirmDining(
        adminId, 
        orderIds, 
        remark, 
        req.db
      );

      logger.info(`管理员 ${adminId} 批量确认就餐完成: 成功 ${result.successCount}/${result.totalCount}`);

      return response.success(res, result, `批量确认完成，成功 ${result.successCount} 个`);
    } catch (error) {
      logger.error('批量确认就餐失败:', error);
      return response.serverError(res, '批量确认就餐失败', error.message);
    }
  }

  /**
   * 获取用户就餐确认状态
   */
  async getUserDiningConfirmationStatus(req, res) {
    try {
      const userId = req.user.id;
      const { date } = req.query;

      // 验证日期格式
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return response.badRequest(res, '日期格式不正确，请使用YYYY-MM-DD格式');
      }

      const status = await diningConfirmationService.getUserDiningConfirmationStatus(
        userId, 
        date, 
        req.db
      );

      return response.success(res, status, '获取就餐确认状态成功');
    } catch (error) {
      logger.error('获取就餐确认状态失败:', error);

      if (error.message === '用户不存在') {
        return response.notFound(res, '用户不存在');
      }

      return response.serverError(res, '获取就餐确认状态失败', error.message);
    }
  }

  /**
   * 获取就餐确认历史记录
   */
  async getDiningConfirmationHistory(req, res) {
    try {
      const userId = req.user.id;
      const { 
        date, 
        startDate, 
        endDate, 
        diningStatus, 
        page = 1, 
        pageSize = 20 
      } = req.query;

      // 确保参数为有效值或空字符串
      const filters = { 
        date: date || '', 
        startDate: startDate || '',
        endDate: endDate || '',
        diningStatus: diningStatus || '' 
      };

      // 确保分页参数是有效数字
      const pageNum = parseInt(page) || 1;
      const pageSizeNum = parseInt(pageSize) || 20;

      const result = await diningConfirmationService.getDiningConfirmationHistory(
        userId, 
        filters, 
        pageNum, 
        pageSizeNum, 
        req.db
      );

      return response.pagination(
        res, 
        result.records, 
        result.total, 
        result.page, 
        result.pageSize, 
        '获取就餐确认历史成功'
      );
    } catch (error) {
      logger.error('获取就餐确认历史失败:', error);
      return response.serverError(res, '获取就餐确认历史失败', error.message);
    }
  }

  /**
   * 获取部门就餐确认统计（管理员功能）
   */
  async getDepartmentDiningConfirmationStats(req, res) {
    try {
      const { date, departmentId } = req.query;

      // 验证日期格式
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return response.badRequest(res, '日期格式不正确，请使用YYYY-MM-DD格式');
      }

      const stats = await diningConfirmationService.getDepartmentDiningConfirmationStats(
        date, 
        departmentId, 
        req.db
      );

      return response.success(res, stats, '获取部门就餐确认统计成功');
    } catch (error) {
      logger.error('获取部门就餐确认统计失败:', error);
      return response.serverError(res, '获取部门就餐确认统计失败', error.message);
    }
  }

  /**
   * 获取待确认就餐列表（管理员功能）
   */
  async getPendingDiningConfirmations(req, res) {
    try {
      const { 
        date, 
        departmentId, 
        mealType, 
        page = 1, 
        pageSize = 20 
      } = req.query;

      // 验证日期格式
      if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return response.badRequest(res, '日期格式不正确，请使用YYYY-MM-DD格式');
      }

      const queryDate = date || moment().tz('Asia/Shanghai').format('YYYY-MM-DD');

      // 构建查询条件
      let whereClause = `WHERE do.diningDate = ? AND do.status != 'cancelled' AND do.diningStatus = 'ordered'`;
      let whereValues = [queryDate];

      if (departmentId) {
        whereClause += ' AND do.deptId = ?';
        whereValues.push(departmentId);
      }

      if (mealType) {
        whereClause += ' AND do.mealType = ?';
        whereValues.push(mealType);
      }

      // 查询总数
      const countSql = `SELECT COUNT(*) as total FROM dining_orders do ${whereClause}`;
      const [countResult] = await req.db.execute(countSql, whereValues);
      const total = countResult[0].total;

      // 查询记录列表
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const listSql = `
        SELECT 
          do._id as orderId,
          do.deptName,
          do.userId,
          do.userName,
          do.mealType,
          do.diningDate,
          do.createTime as registerTime,
          do.remark,
          u.nickName as currentUserName,
          u.department as currentUserDept
        FROM dining_orders do
        LEFT JOIN users u ON do.userId = u._id
        ${whereClause}
        ORDER BY do.createTime DESC
        LIMIT ${parseInt(pageSize)} OFFSET ${parseInt(offset)}
      `;

      const [records] = await req.db.execute(listSql, whereValues);

      // 处理记录数据
      const processedRecords = records.map(record => ({
        orderId: record.orderId,
        deptName: record.deptName,
        userId: record.userId,
        userName: record.currentUserName || record.userName,
        mealType: record.mealType,
        mealTypeName: this.getMealTypeName(record.mealType),
        diningDate: record.diningDate,
        registerTime: record.registerTime,
        remark: record.remark,
        currentUserDept: record.currentUserDept
      }));

      return response.pagination(
        res, 
        processedRecords, 
        total, 
        parseInt(page), 
        parseInt(pageSize), 
        '获取待确认就餐列表成功'
      );
    } catch (error) {
      logger.error('获取待确认就餐列表失败:', error);
      return response.serverError(res, '获取待确认就餐列表失败', error.message);
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 获取餐次类型中文名称
   * @param {string} mealType - 餐次类型
   */
  getMealTypeName(mealType) {
    const mealTypeMap = {
      'breakfast': '早餐',
      'lunch': '午餐',
      'dinner': '晚餐'
    };
    return mealTypeMap[mealType] || mealType;
  }
}

module.exports = new DiningConfirmationController();
