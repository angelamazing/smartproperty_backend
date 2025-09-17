const menuImportService = require('../services/menuImportService');
const { ResponseHelper } = require('../utils/response');
const logger = require('../utils/logger');
const multer = require('multer');
const path = require('path');

/**
 * 菜单批量导入控制器
 */
class MenuImportController {
  
  /**
   * 上传并解析Excel文件
   */
  async uploadAndParseExcel(req, res) {
    try {
      if (!req.file) {
        return ResponseHelper.error(res, '请选择要上传的Excel文件', 400);
      }
      
      const file = req.file;
      
      // 验证文件类型
      const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel' // .xls
      ];
      
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return ResponseHelper.error(res, '文件格式不支持，请上传Excel文件(.xlsx或.xls)', 400);
      }
      
      // 验证文件大小（最大5MB）
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        return ResponseHelper.error(res, '文件大小超过限制，最大支持5MB', 400);
      }
      
      logger.info('开始解析Excel文件', {
        filename: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        userId: req.user.id
      });
      
      // 解析Excel文件
      const parseResult = menuImportService.parseExcelFile(file.buffer);
      
      if (!parseResult.success) {
        return ResponseHelper.error(res, parseResult.error, 400);
      }
      
      // 验证解析后的数据
      const validationResult = menuImportService.validateImportData(parseResult.data, {
        allowPastDates: false
      });
      
      const response = {
        parseResult: {
          success: parseResult.success,
          summary: parseResult.summary,
          errors: parseResult.errors
        },
        validation: validationResult,
        preview: parseResult.data.slice(0, 50), // 预览前50条数据
        filename: file.originalname,
        fileSize: file.size
      };
      
      if (parseResult.errors.length > 0) {
        response.message = `文件解析完成，但有 ${parseResult.errors.length} 行数据存在错误`;
      } else if (validationResult.warnings.length > 0) {
        response.message = `文件解析成功，但有 ${validationResult.warnings.length} 个警告`;
      } else {
        response.message = '文件解析成功';
      }
      
      ResponseHelper.success(res, response, response.message);
      
    } catch (error) {
      logger.error('Excel文件解析失败:', error);
      ResponseHelper.error(res, '文件解析失败：' + error.message, 500);
    }
  }
  
  /**
   * 批量导入菜单
   */
  async batchImportMenus(req, res) {
    try {
      const { menuData, options = {} } = req.body;
      const adminId = req.user.id;
      
      // 验证请求参数
      if (!menuData || !Array.isArray(menuData) || menuData.length === 0) {
        return ResponseHelper.error(res, '菜单数据不能为空', 400);
      }
      
      // 限制批量导入数量
      if (menuData.length > 1000) {
        return ResponseHelper.error(res, '单次导入数据量过大，最多支持1000条记录', 400);
      }
      
      logger.info('开始批量导入菜单', {
        adminId,
        dataCount: menuData.length,
        options
      });
      
      // 再次验证数据
      const validationResult = menuImportService.validateImportData(menuData, {
        allowPastDates: options.allowPastDates || false
      });
      
      if (!validationResult.valid) {
        return ResponseHelper.error(res, '数据验证失败：' + validationResult.errors.join(', '), 400);
      }
      
      // 执行批量导入
      const importResult = await menuImportService.batchCreateMenus(
        req.db, 
        menuData, 
        adminId, 
        {
          ...options,
          overwrite: true, // 启用覆盖模式
          filename: req.body.filename || 'Excel导入'
        }
      );
      
      // 构建响应数据
      const response = {
        summary: importResult.summary,
        success: importResult.success,
        failed: importResult.failed,
        validation: validationResult
      };
      
      // 确定响应消息
      let message;
      if (importResult.summary.failedCount === 0) {
        message = `批量导入成功，共创建 ${importResult.summary.successCount} 个菜单`;
      } else if (importResult.summary.successCount === 0) {
        message = `批量导入失败，${importResult.summary.failedCount} 个菜单创建失败`;
      } else {
        message = `批量导入部分成功，成功 ${importResult.summary.successCount} 个，失败 ${importResult.summary.failedCount} 个`;
      }
      
      ResponseHelper.success(res, response, message);
      
    } catch (error) {
      logger.error('批量导入菜单失败:', error);
      ResponseHelper.error(res, '批量导入失败：' + error.message, 500);
    }
  }
  
  /**
   * 下载Excel导入模板
   */
  async downloadTemplate(req, res) {
    try {
      logger.info('生成Excel导入模板', { userId: req.user.id });
      
      // 生成Excel模板
      const templateBuffer = menuImportService.generateExcelTemplate();
      
      // 设置响应头
      const filename = `菜单导入模板_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Content-Length', templateBuffer.length);
      
      // 发送文件
      res.send(templateBuffer);
      
      logger.info('Excel模板下载成功', { 
        userId: req.user.id,
        filename,
        size: templateBuffer.length 
      });
      
    } catch (error) {
      logger.error('下载Excel模板失败:', error);
      ResponseHelper.error(res, '模板下载失败：' + error.message, 500);
    }
  }
  
  /**
   * 获取导入历史记录
   */
  async getImportHistory(req, res) {
    try {
      const { page = 1, pageSize = 20 } = req.query;
      const adminId = req.user.id;
      
      // 查询导入历史（从活动日志中获取）
      const offset = (parseInt(page) - 1) * parseInt(pageSize);
      const [historyRows] = await req.db.execute(`
        SELECT
          _id,
          userId,
          action,
          resourceType,
          resourceId,
          JSON_EXTRACT(details, '$') as details,
          ipAddress,
          createTime
        FROM activity_logs
        WHERE userId = ? AND action = ?
        ORDER BY createTime DESC
        LIMIT ${parseInt(pageSize)} OFFSET ${offset}
      `, [adminId, 'batch_import_menu']);
      
      // 获取总数
      const [countResult] = await req.db.execute(`
        SELECT COUNT(*) as total
        FROM activity_logs 
        WHERE userId = ? AND action = ?
      `, [adminId, 'batch_import_menu']);
      
      const total = countResult[0].total;
      
      // 处理历史记录数据
      const history = historyRows.map(row => {
        let details = {};
        try {
          // details字段已经是对象，不需要JSON.parse
          details = row.details || {};
        } catch (e) {
          details = { error: '解析详情失败' };
        }
        
        return {
          id: row._id,
          importTime: row.createTime,
          summary: details.summary || {},
          filename: details.filename || '未知文件',
          status: details.success ? 'success' : 'failed',
          ipAddress: row.ipAddress
        };
      });
      
      const response = {
        list: history,
        pagination: {
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
      
      ResponseHelper.success(res, response, '获取导入历史成功');
      
    } catch (error) {
      logger.error('获取导入历史失败:', error);
      ResponseHelper.error(res, '获取导入历史失败：' + error.message, 500);
    }
  }
  
  /**
   * 预览导入数据
   */
  async previewImportData(req, res) {
    try {
      const { menuData } = req.body;
      
      if (!menuData || !Array.isArray(menuData)) {
        return ResponseHelper.error(res, '菜单数据格式错误', 400);
      }
      
      // 按日期和餐次分组预览数据
      const groupedData = menuImportService.groupMenuData(menuData);
      
      const preview = [];
      for (const menuKey in groupedData) {
        const [date, mealType] = menuKey.split('_');
        const dishes = groupedData[menuKey];
        
        // 检查是否已存在菜单
        const [existing] = await req.db.execute(
          'SELECT _id, publishStatus FROM menus WHERE publishDate = ? AND mealType = ?',
          [date, mealType]
        );
        
        preview.push({
          date,
          mealType,
          mealTypeName: menuImportService.getMealTypeName(mealType),
          dishCount: dishes.length,
          dishes: dishes.map(dish => ({
            name: dish.dishName,
            price: dish.dishPrice,
            category: dish.dishCategory,
            sort: dish.sort
          })),
          existingMenu: existing.length > 0 ? {
            id: existing[0]._id,
            status: existing[0].publishStatus
          } : null,
          action: existing.length > 0 ? 'update' : 'create'
        });
      }
      
      // 按日期排序
      preview.sort((a, b) => {
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        const mealOrder = { 'breakfast': 1, 'lunch': 2, 'dinner': 3 };
        return mealOrder[a.mealType] - mealOrder[b.mealType];
      });
      
      const summary = {
        totalMenus: preview.length,
        newMenus: preview.filter(p => p.action === 'create').length,
        updateMenus: preview.filter(p => p.action === 'update').length,
        totalDishes: preview.reduce((sum, p) => sum + p.dishCount, 0),
        dateRange: {
          start: preview.length > 0 ? preview[0].date : null,
          end: preview.length > 0 ? preview[preview.length - 1].date : null
        }
      };
      
      ResponseHelper.success(res, {
        preview,
        summary
      }, '数据预览生成成功');
      
    } catch (error) {
      logger.error('预览导入数据失败:', error);
      ResponseHelper.error(res, '预览数据失败：' + error.message, 500);
    }
  }
}

// 配置文件上传中间件
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('文件格式不支持，请上传Excel文件'), false);
    }
  }
});

const menuImportController = new MenuImportController();

module.exports = {
  uploadAndParseExcel: menuImportController.uploadAndParseExcel.bind(menuImportController),
  downloadTemplate: menuImportController.downloadTemplate.bind(menuImportController),
  previewImportData: menuImportController.previewImportData.bind(menuImportController),
  batchImportMenus: menuImportController.batchImportMenus.bind(menuImportController),
  getImportHistory: menuImportController.getImportHistory.bind(menuImportController),
  uploadMiddleware: upload.single('excel')
};
