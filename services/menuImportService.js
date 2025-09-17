const XLSX = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const TimeUtils = require('../utils/timeUtils');

/**
 * 菜单批量导入服务
 * 支持Excel文件解析和批量菜单创建
 */
class MenuImportService {
  
  /**
   * 解析Excel文件并转换为JSON数据
   * @param {Buffer} fileBuffer - Excel文件缓冲区
   * @returns {Object} 解析结果
   */
  parseExcelFile(fileBuffer) {
    try {
      // 读取Excel文件
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      
      // 获取第一个工作表
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error('Excel文件中没有找到工作表');
      }
      
      const worksheet = workbook.Sheets[sheetName];
      
      // 将工作表转换为JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // 使用数组格式
        defval: '', // 空单元格默认值
        raw: false // 将所有值转为字符串
      });
      
      if (jsonData.length < 2) {
        throw new Error('Excel文件数据不足，至少需要包含标题行和数据行');
      }
      
      // 解析标题行
      const headers = jsonData[0];
      const dataRows = jsonData.slice(1);
      
      // 验证必要的列
      const requiredColumns = ['日期', '餐次类型', '菜品名称'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      
      if (missingColumns.length > 0) {
        throw new Error(`Excel文件缺少必要的列: ${missingColumns.join(', ')}`);
      }
      
      // 获取列索引
      const columnIndexes = {
        date: headers.indexOf('日期'),
        mealType: headers.indexOf('餐次类型'),
        dishName: headers.indexOf('菜品名称'),
        dishPrice: headers.indexOf('菜品价格'),
        dishCategory: headers.indexOf('菜品分类'),
        sort: headers.indexOf('排序'),
        remark: headers.indexOf('备注')
      };
      
      // 转换数据行为对象数组
      const parsedData = [];
      const errors = [];
      
      dataRows.forEach((row, index) => {
        const rowNumber = index + 2; // Excel行号（从2开始）
        
        try {
          // 跳过完全空白的行
          if (row.every(cell => !cell || cell.toString().trim() === '')) {
            return;
          }
          
          const rowData = {
            date: this.parseDate(row[columnIndexes.date]),
            mealType: this.parseMealType(row[columnIndexes.mealType]),
            dishName: this.parseString(row[columnIndexes.dishName]),
            dishPrice: this.parsePrice(row[columnIndexes.dishPrice]),
            dishCategory: this.parseString(row[columnIndexes.dishCategory]),
            sort: this.parseNumber(row[columnIndexes.sort]) || 0,
            remark: this.parseString(row[columnIndexes.remark]) || ''
          };
          
          // 验证必填字段
          if (!rowData.date || !rowData.mealType || !rowData.dishName) {
            throw new Error(`第${rowNumber}行：日期、餐次类型、菜品名称不能为空`);
          }
          
          parsedData.push({
            ...rowData,
            rowNumber
          });
          
        } catch (error) {
          errors.push({
            row: rowNumber,
            error: error.message
          });
        }
      });
      
      return {
        success: true,
        data: parsedData,
        errors: errors,
        summary: {
          totalRows: dataRows.length,
          validRows: parsedData.length,
          errorRows: errors.length
        }
      };
      
    } catch (error) {
      logger.error('Excel文件解析失败:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        errors: []
      };
    }
  }
  
  /**
   * 批量创建菜单
   * @param {Object} db - 数据库连接
   * @param {Array} menuData - 菜单数据数组
   * @param {string} adminId - 管理员ID
   * @param {Object} options - 导入选项
   * @returns {Object} 创建结果
   */
  async batchCreateMenus(db, menuData, adminId, options = {}) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // 按日期和餐次分组数据
      const groupedMenus = this.groupMenuData(menuData);
      
      const results = {
        success: [],
        failed: [],
        summary: {
          totalMenus: Object.keys(groupedMenus).length,
          successCount: 0,
          failedCount: 0
        }
      };
      
      // 处理每个菜单组合
      for (const menuKey in groupedMenus) {
        const [date, mealType] = menuKey.split('_');
        const dishes = groupedMenus[menuKey];
        
        try {
          // 检查菜单是否已存在
          const [existing] = await connection.execute(
            'SELECT _id, publishStatus FROM menus WHERE publishDate = ? AND mealType = ?',
            [date, mealType]
          );
          
          let menuId;
          const now = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
          
          if (existing.length > 0 && !options.overwrite) {
            throw new Error(`${date} ${this.getMealTypeName(mealType)}菜单已存在，请选择覆盖选项或删除现有菜单`);
          }
          
          if (existing.length > 0 && options.overwrite) {
            // 覆盖现有菜单
            menuId = existing[0]._id;
            
            if (existing[0].publishStatus === 'published') {
              throw new Error(`${date} ${this.getMealTypeName(mealType)}菜单已发布，无法覆盖`);
            }
            
            // 删除现有菜品关联
            await connection.execute('DELETE FROM menu_dishes WHERE menuId = ?', [menuId]);
            
            // 更新菜单信息
            await connection.execute(
              'UPDATE menus SET description = ?, publisherId = ?, updateTime = ? WHERE _id = ?',
              [options.description || '', adminId, now, menuId]
            );
            
          } else {
            // 创建新菜单
            menuId = uuidv4();
            
            await connection.execute(
              'INSERT INTO menus (_id, publishDate, mealType, description, publishStatus, publisherId, createTime, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [menuId, date, mealType, options.description || '', 'published', adminId, now, now]
            );
          }
          
          // 创建菜品关联
          for (let i = 0; i < dishes.length; i++) {
            const dish = dishes[i];
            
            // 查找菜品ID
            const dishId = await this.findOrCreateDish(connection, dish);
            
            await connection.execute(
              'INSERT INTO menu_dishes (_id, menuId, dishId, price, sort, createTime) VALUES (?, ?, ?, ?, ?, ?)',
              [uuidv4(), menuId, dishId, dish.dishPrice || 0, dish.sort || i + 1, now]
            );
          }
          
          results.success.push({
            date,
            mealType,
            mealTypeName: this.getMealTypeName(mealType),
            menuId,
            dishCount: dishes.length,
            action: existing.length > 0 ? 'updated' : 'created'
          });
          
          results.summary.successCount++;
          
        } catch (error) {
          logger.error(`创建菜单失败 ${menuKey}:`, error);
          
          results.failed.push({
            date,
            mealType,
            mealTypeName: this.getMealTypeName(mealType),
            error: error.message,
            dishCount: dishes.length
          });
          
          results.summary.failedCount++;
        }
      }
      
      // 记录批量导入操作日志
      const logId = require('uuid').v4();
      const logSql = `
        INSERT INTO activity_logs (_id, userId, action, resourceType, resourceId, details, ipAddress, createTime)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      await connection.execute(logSql, [
        logId,
        adminId,
        'batch_import_menu',
        'menus',
        'batch_import_' + Date.now(),
        JSON.stringify({
          summary: results.summary,
          success: results.success,
          failed: results.failed,
          filename: options.filename || 'Excel导入',
          success: results.summary.failedCount === 0
        }),
        '127.0.0.1' // 实际应该从请求中获取
      ]);
      
      await connection.commit();
      
      logger.info('批量创建菜单完成', {
        adminId,
        totalMenus: results.summary.totalMenus,
        successCount: results.summary.successCount,
        failedCount: results.summary.failedCount
      });
      
      return results;
      
    } catch (error) {
      await connection.rollback();
      logger.error('批量创建菜单失败:', error);
      throw new Error(`批量创建菜单失败: ${error.message}`);
      
    } finally {
      connection.release();
    }
  }
  
  /**
   * 按日期和餐次分组菜单数据
   * @param {Array} menuData - 菜单数据
   * @returns {Object} 分组后的数据
   */
  groupMenuData(menuData) {
    const grouped = {};
    
    menuData.forEach(item => {
      const key = `${item.date}_${item.mealType}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });
    
    // 按sort字段排序每个组内的菜品
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => (a.sort || 0) - (b.sort || 0));
    });
    
    return grouped;
  }
  
  /**
   * 查找或创建菜品
   * @param {Object} connection - 数据库连接
   * @param {Object} dishData - 菜品数据
   * @returns {string} 菜品ID
   */
  async findOrCreateDish(connection, dishData) {
    // 先查找是否存在同名菜品
    const [existing] = await connection.execute(
      'SELECT _id FROM dishes WHERE name = ? AND status = "active"',
      [dishData.dishName]
    );
    
    if (existing.length > 0) {
      return existing[0]._id;
    }
    
    // 如果不存在，创建新菜品
    const dishId = uuidv4();
    const now = TimeUtils.toUTCForStorage(TimeUtils.getBeijingTime());
    
    // 查找或创建默认分类
    let categoryId = null;
    if (dishData.dishCategory) {
      const [categoryResult] = await connection.execute(
        'SELECT _id FROM dish_categories WHERE name = ? AND status = "active"',
        [dishData.dishCategory]
      );
      
      if (categoryResult.length > 0) {
        categoryId = categoryResult[0]._id;
      } else {
        // 创建新分类
        categoryId = uuidv4();
        await connection.execute(
          'INSERT INTO dish_categories (_id, name, description, status, createTime, updateTime) VALUES (?, ?, ?, ?, ?, ?)',
          [categoryId, dishData.dishCategory, `自动创建的分类：${dishData.dishCategory}`, 'active', now, now]
        );
      }
    }
    
    // 创建菜品
    await connection.execute(
      'INSERT INTO dishes (_id, name, categoryId, price, description, status, createTime, updateTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [dishId, dishData.dishName, categoryId, dishData.dishPrice || 0, dishData.remark || '', 'active', now, now]
    );
    
    return dishId;
  }
  
  /**
   * 解析日期字符串
   * @param {string} dateStr - 日期字符串
   * @returns {string} 格式化的日期
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    try {
      // 支持多种日期格式
      const str = dateStr.toString().trim();
      
      // YYYY-MM-DD 格式
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
      }
      
      // YYYY/MM/DD 格式
      if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
        return str.replace(/\//g, '-');
      }
      
      // Excel日期数字格式
      if (/^\d+$/.test(str)) {
        const date = XLSX.SSF.parse_date_code(parseInt(str));
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
      
      // 尝试解析其他格式
      const date = new Date(str);
      if (isNaN(date.getTime())) {
        throw new Error(`无效的日期格式: ${str}`);
      }
      
      return date.toISOString().split('T')[0];
      
    } catch (error) {
      throw new Error(`日期解析失败: ${dateStr}`);
    }
  }
  
  /**
   * 解析餐次类型
   * @param {string} mealTypeStr - 餐次类型字符串
   * @returns {string} 标准化的餐次类型
   */
  parseMealType(mealTypeStr) {
    if (!mealTypeStr) return null;
    
    const str = mealTypeStr.toString().trim().toLowerCase();
    
    const mealTypeMap = {
      '早餐': 'breakfast',
      '早饭': 'breakfast',
      'breakfast': 'breakfast',
      '中餐': 'lunch',
      '午餐': 'lunch',
      '午饭': 'lunch',
      'lunch': 'lunch',
      '晚餐': 'dinner',
      '晚饭': 'dinner',
      'dinner': 'dinner'
    };
    
    const mealType = mealTypeMap[str];
    if (!mealType) {
      throw new Error(`无效的餐次类型: ${mealTypeStr}，支持的类型：早餐、中餐、晚餐`);
    }
    
    return mealType;
  }
  
  /**
   * 解析字符串
   * @param {*} value - 值
   * @returns {string} 字符串
   */
  parseString(value) {
    if (value === null || value === undefined) return '';
    return value.toString().trim();
  }
  
  /**
   * 解析价格
   * @param {*} value - 价格值
   * @returns {number} 价格数字
   */
  parsePrice(value) {
    if (!value) return 0;
    
    const str = value.toString().trim();
    const price = parseFloat(str.replace(/[^0-9.]/g, ''));
    
    if (isNaN(price)) return 0;
    return Math.max(0, price);
  }
  
  /**
   * 解析数字
   * @param {*} value - 数字值
   * @returns {number} 数字
   */
  parseNumber(value) {
    if (!value) return 0;
    
    const num = parseInt(value.toString().trim());
    return isNaN(num) ? 0 : num;
  }
  
  /**
   * 获取餐次类型中文名称
   * @param {string} mealType - 餐次类型
   * @returns {string} 中文名称
   */
  getMealTypeName(mealType) {
    const names = {
      'breakfast': '早餐',
      'lunch': '中餐',
      'dinner': '晚餐'
    };
    return names[mealType] || mealType;
  }
  
  /**
   * 生成Excel导入模板
   * @returns {Buffer} Excel文件缓冲区
   */
  generateExcelTemplate() {
    try {
      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      
      // 创建示例数据 - 支持工作日菜单（周一到周五）
      const sampleData = [
        // 标题行
        ['日期', '餐次类型', '菜品名称', '菜品价格', '菜品分类', '排序', '备注'],
        // 周一示例数据
        ['2025-09-23', '早餐', '小笼包', '8.00', '面点', '1', '上海风味'],
        ['2025-09-23', '早餐', '豆浆', '3.00', '饮品', '2', '原味豆浆'],
        ['2025-09-23', '中餐', '红烧肉', '25.00', '荤菜', '1', '经典川菜'],
        ['2025-09-23', '中餐', '青菜豆腐', '12.00', '素菜', '2', '清淡爽口'],
        ['2025-09-23', '晚餐', '蒸蛋', '8.00', '蛋类', '1', '嫩滑蒸蛋'],
        // 周二示例数据
        ['2025-09-24', '早餐', '包子', '6.00', '面点', '1', '猪肉大葱'],
        ['2025-09-24', '早餐', '小米粥', '4.00', '粥类', '2', '营养小米粥'],
        ['2025-09-24', '中餐', '糖醋里脊', '22.00', '荤菜', '1', '酸甜可口'],
        ['2025-09-24', '中餐', '炒青菜', '10.00', '素菜', '2', '时令青菜'],
        ['2025-09-24', '晚餐', '鸡蛋汤', '8.00', '汤类', '1', '营养鸡蛋汤'],
        // 周三示例数据
        ['2025-09-25', '早餐', '油条', '3.00', '面点', '1', '香脆油条'],
        ['2025-09-25', '早餐', '豆腐脑', '4.00', '豆制品', '2', '嫩滑豆腐脑'],
        ['2025-09-25', '中餐', '宫保鸡丁', '20.00', '荤菜', '1', '川菜经典'],
        ['2025-09-25', '中餐', '麻婆豆腐', '15.00', '豆制品', '2', '麻辣鲜香'],
        ['2025-09-25', '晚餐', '紫菜蛋花汤', '6.00', '汤类', '1', '清淡营养'],
        // 周四示例数据
        ['2025-09-26', '早餐', '煎饼', '5.00', '面点', '1', '山东煎饼'],
        ['2025-09-26', '早餐', '牛奶', '3.00', '饮品', '2', '纯牛奶'],
        ['2025-09-26', '中餐', '鱼香肉丝', '18.00', '荤菜', '1', '经典川菜'],
        ['2025-09-26', '中餐', '凉拌黄瓜', '8.00', '凉菜', '2', '清爽开胃'],
        ['2025-09-26', '晚餐', '西红柿鸡蛋汤', '7.00', '汤类', '1', '家常汤品'],
        // 周五示例数据
        ['2025-09-27', '早餐', '烧饼', '4.00', '面点', '1', '芝麻烧饼'],
        ['2025-09-27', '早餐', '八宝粥', '5.00', '粥类', '2', '营养八宝粥'],
        ['2025-09-27', '中餐', '回锅肉', '24.00', '荤菜', '1', '四川名菜'],
        ['2025-09-27', '中餐', '蒜蓉菠菜', '9.00', '素菜', '2', '绿色健康'],
        ['2025-09-27', '晚餐', '冬瓜汤', '5.00', '汤类', '1', '清热降火']
        // 注意：周六周日不提供菜单，所以不填写
        // 系统支持任意日期的菜单导入，不要求连续
      ];
      
      // 创建工作表
      const worksheet = XLSX.utils.aoa_to_sheet(sampleData);
      
      // 设置列宽
      const colWidths = [
        { wch: 12 }, // 日期
        { wch: 10 }, // 餐次类型
        { wch: 15 }, // 菜品名称
        { wch: 10 }, // 菜品价格
        { wch: 10 }, // 菜品分类
        { wch: 8 },  // 排序
        { wch: 20 }  // 备注
      ];
      worksheet['!cols'] = colWidths;
      
      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '菜单导入模板');
      
      // 生成Excel文件缓冲区
      const excelBuffer = XLSX.write(workbook, {
        type: 'buffer',
        bookType: 'xlsx'
      });
      
      return excelBuffer;
      
    } catch (error) {
      logger.error('生成Excel模板失败:', error);
      throw new Error(`生成Excel模板失败: ${error.message}`);
    }
  }
  
  /**
   * 验证导入数据
   * @param {Array} data - 导入数据
   * @param {Object} options - 验证选项
   * @returns {Object} 验证结果
   */
  validateImportData(data, options = {}) {
    const errors = [];
    const warnings = [];
    
    // 检查数据是否为空
    if (!data || data.length === 0) {
      errors.push('导入数据为空');
      return { valid: false, errors, warnings };
    }
    
    // 检查日期范围
    const dates = [...new Set(data.map(item => item.date))].sort();
    const dateRange = {
      start: dates[0],
      end: dates[dates.length - 1],
      count: dates.length
    };
    
    // 检查是否有过去的日期
    const today = new Date().toISOString().split('T')[0];
    const pastDates = dates.filter(date => date < today);
    if (pastDates.length > 0 && !options.allowPastDates) {
      errors.push(`包含过去的日期: ${pastDates.join(', ')}`);
    }
    
    // 检查餐次类型分布
    const mealTypeStats = {};
    data.forEach(item => {
      const key = `${item.date}_${item.mealType}`;
      if (!mealTypeStats[key]) {
        mealTypeStats[key] = 0;
      }
      mealTypeStats[key]++;
    });
    
    // 检查是否有重复的菜品
    const duplicates = [];
    Object.keys(mealTypeStats).forEach(key => {
      const [date, mealType] = key.split('_');
      const items = data.filter(item => item.date === date && item.mealType === mealType);
      const dishNames = items.map(item => item.dishName);
      const uniqueNames = [...new Set(dishNames)];
      
      if (dishNames.length !== uniqueNames.length) {
        duplicates.push(`${date} ${this.getMealTypeName(mealType)}存在重复菜品`);
      }
    });
    
    if (duplicates.length > 0) {
      warnings.push(...duplicates);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      statistics: {
        totalItems: data.length,
        dateRange,
        mealTypeStats: Object.keys(mealTypeStats).length,
        uniqueDishes: [...new Set(data.map(item => item.dishName))].length
      }
    };
  }
}

module.exports = new MenuImportService();
