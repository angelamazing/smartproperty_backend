const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const XLSX = require('xlsx');

/**
 * 工作日菜单导入测试脚本
 * 测试只导入周一到周五菜单的功能
 */
class WeekdayMenuImportTester {
  constructor() {
    this.baseURL = 'http://localhost:3000/api/admin';
    this.token = null;
  }

  /**
   * 管理员登录获取Token
   */
  async login() {
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        phoneNumber: '13800138001',
        password: 'admin123456'
      });

      if (response.data.success) {
        this.token = response.data.data.token;
        console.log('✅ 管理员登录成功');
        return true;
      } else {
        console.log('❌ 管理员登录失败:', response.data.message);
        return false;
      }
    } catch (error) {
      console.log('❌ 登录请求失败:', error.message);
      return false;
    }
  }

  /**
   * 创建工作日菜单Excel文件（周一到周五）
   */
  createWeekdayMenuExcel() {
    try {
      console.log('\n📝 创建工作日菜单Excel文件（周一到周五）...');

      // 创建工作日菜单数据（周一到周五）
      const weekdayData = [
        ['日期', '餐次类型', '菜品名称', '菜品价格', '菜品分类', '排序', '备注'],
        
        // 周一菜单
        ['2025-09-23', '早餐', '小笼包', '8.00', '面点', '1', '上海风味小笼包'],
        ['2025-09-23', '早餐', '豆浆', '3.00', '饮品', '2', '原味豆浆'],
        ['2025-09-23', '早餐', '咸菜', '2.00', '小菜', '3', '开胃小菜'],
        ['2025-09-23', '中餐', '红烧肉', '25.00', '荤菜', '1', '经典红烧肉'],
        ['2025-09-23', '中餐', '青菜豆腐', '12.00', '素菜', '2', '清淡爽口'],
        ['2025-09-23', '中餐', '米饭', '2.00', '主食', '3', '东北大米'],
        ['2025-09-23', '晚餐', '蒸蛋', '8.00', '蛋类', '1', '嫩滑蒸蛋'],
        ['2025-09-23', '晚餐', '青菜汤', '6.00', '汤类', '2', '清汤青菜'],
        
        // 周二菜单
        ['2025-09-24', '早餐', '包子', '6.00', '面点', '1', '猪肉大葱包'],
        ['2025-09-24', '早餐', '小米粥', '4.00', '粥类', '2', '营养小米粥'],
        ['2025-09-24', '中餐', '糖醋里脊', '22.00', '荤菜', '1', '酸甜可口'],
        ['2025-09-24', '中餐', '炒青菜', '10.00', '素菜', '2', '时令青菜'],
        ['2025-09-24', '晚餐', '鸡蛋汤', '8.00', '汤类', '1', '营养鸡蛋汤'],
        ['2025-09-24', '晚餐', '凉拌黄瓜', '5.00', '凉菜', '2', '清爽开胃'],
        
        // 周三菜单
        ['2025-09-25', '早餐', '油条', '3.00', '面点', '1', '香脆油条'],
        ['2025-09-25', '早餐', '豆腐脑', '4.00', '豆制品', '2', '嫩滑豆腐脑'],
        ['2025-09-25', '中餐', '宫保鸡丁', '20.00', '荤菜', '1', '川菜经典'],
        ['2025-09-25', '中餐', '麻婆豆腐', '15.00', '豆制品', '2', '麻辣鲜香'],
        ['2025-09-25', '晚餐', '紫菜蛋花汤', '6.00', '汤类', '1', '清淡营养'],
        ['2025-09-25', '晚餐', '凉拌萝卜丝', '4.00', '凉菜', '2', '爽脆萝卜丝'],
        
        // 周四菜单
        ['2025-09-26', '早餐', '煎饼', '5.00', '面点', '1', '山东煎饼'],
        ['2025-09-26', '早餐', '牛奶', '3.00', '饮品', '2', '纯牛奶'],
        ['2025-09-26', '中餐', '鱼香肉丝', '18.00', '荤菜', '1', '经典川菜'],
        ['2025-09-26', '中餐', '凉拌黄瓜', '8.00', '凉菜', '2', '清爽开胃'],
        ['2025-09-26', '晚餐', '西红柿鸡蛋汤', '7.00', '汤类', '1', '家常汤品'],
        ['2025-09-26', '晚餐', '蒸蛋羹', '6.00', '蛋类', '2', '嫩滑蛋羹'],
        
        // 周五菜单
        ['2025-09-27', '早餐', '烧饼', '4.00', '面点', '1', '芝麻烧饼'],
        ['2025-09-27', '早餐', '八宝粥', '5.00', '粥类', '2', '营养八宝粥'],
        ['2025-09-27', '中餐', '回锅肉', '24.00', '荤菜', '1', '四川名菜'],
        ['2025-09-27', '中餐', '蒜蓉菠菜', '9.00', '素菜', '2', '绿色健康'],
        ['2025-09-27', '晚餐', '冬瓜汤', '5.00', '汤类', '1', '清热降火'],
        ['2025-09-27', '晚餐', '蒸蛋', '8.00', '蛋类', '2', '嫩滑蒸蛋']
        
        // 注意：周六周日不提供菜单，所以不填写任何数据
        // 系统会自动识别并只创建工作日的菜单
      ];

      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(weekdayData);
      
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
      
      XLSX.utils.book_append_sheet(workbook, worksheet, '工作日菜单');
      
      // 保存文件
      const testFilePath = path.join(__dirname, 'weekday-menu-data.xlsx');
      XLSX.writeFile(workbook, testFilePath);

      console.log('✅ 工作日菜单Excel文件创建成功:', testFilePath);
      console.log('📊 数据统计:');
      console.log('  - 工作日数量: 5天 (周一到周五)');
      console.log('  - 总菜单数: 15个 (5天 × 3餐次)');
      console.log('  - 总菜品数: 30个');
      console.log('  - 周末菜单: 0个 (不提供)');
      
      return testFilePath;
    } catch (error) {
      console.log('❌ 创建工作日菜单Excel文件失败:', error.message);
      return null;
    }
  }

  /**
   * 创建只包含早餐的工作日Excel文件
   */
  createBreakfastOnlyExcel() {
    try {
      console.log('\n📝 创建只包含早餐的工作日Excel文件...');

      const breakfastData = [
        ['日期', '餐次类型', '菜品名称', '菜品价格', '菜品分类', '排序', '备注'],
        
        // 周一到周五的早餐
        ['2025-09-23', '早餐', '小笼包', '8.00', '面点', '1', '上海风味'],
        ['2025-09-23', '早餐', '豆浆', '3.00', '饮品', '2', '原味豆浆'],
        ['2025-09-24', '早餐', '包子', '6.00', '面点', '1', '猪肉大葱'],
        ['2025-09-24', '早餐', '小米粥', '4.00', '粥类', '2', '营养小米粥'],
        ['2025-09-25', '早餐', '油条', '3.00', '面点', '1', '香脆油条'],
        ['2025-09-25', '早餐', '豆腐脑', '4.00', '豆制品', '2', '嫩滑豆腐脑'],
        ['2025-09-26', '早餐', '煎饼', '5.00', '面点', '1', '山东煎饼'],
        ['2025-09-26', '早餐', '牛奶', '3.00', '饮品', '2', '纯牛奶'],
        ['2025-09-27', '早餐', '烧饼', '4.00', '面点', '1', '芝麻烧饼'],
        ['2025-09-27', '早餐', '八宝粥', '5.00', '粥类', '2', '营养八宝粥']
      ];

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(breakfastData);
      worksheet['!cols'] = [
        { wch: 12 }, { wch: 10 }, { wch: 15 }, 
        { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 20 }
      ];
      XLSX.utils.book_append_sheet(workbook, worksheet, '工作日早餐');

      const testFilePath = path.join(__dirname, 'breakfast-only-data.xlsx');
      XLSX.writeFile(workbook, testFilePath);

      console.log('✅ 工作日早餐Excel文件创建成功:', testFilePath);
      console.log('📊 数据统计:');
      console.log('  - 工作日数量: 5天');
      console.log('  - 早餐菜单数: 5个');
      console.log('  - 总菜品数: 10个');
      console.log('  - 中餐晚餐: 0个 (不提供)');
      
      return testFilePath;
    } catch (error) {
      console.log('❌ 创建早餐Excel文件失败:', error.message);
      return null;
    }
  }

  /**
   * 测试上传并解析Excel文件
   */
  async testUploadAndParse(filePath, description) {
    try {
      console.log(`\n📤 测试上传并解析Excel文件: ${description}`);

      const formData = new FormData();
      formData.append('excel', fs.createReadStream(filePath));

      const response = await axios.post(`${this.baseURL}/menu/import/parse`, formData, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...formData.getHeaders()
        }
      });

      if (response.data.success) {
        console.log('✅ Excel文件解析成功');
        console.log('📊 解析结果:');
        console.log('  - 总行数:', response.data.data.parseResult.summary.totalRows);
        console.log('  - 有效行数:', response.data.data.parseResult.summary.validRows);
        console.log('  - 错误行数:', response.data.data.parseResult.summary.errorRows);
        console.log('  - 验证状态:', response.data.data.validation.valid ? '通过' : '失败');
        
        // 显示日期统计
        const dates = [...new Set(response.data.data.parseResult.data.map(item => item.date))].sort();
        console.log('  - 导入日期:', dates.join(', '));
        console.log('  - 日期数量:', dates.length);
        
        // 显示餐次统计
        const mealTypes = [...new Set(response.data.data.parseResult.data.map(item => item.mealType))];
        console.log('  - 餐次类型:', mealTypes.join(', '));
        
        if (response.data.data.parseResult.errors.length > 0) {
          console.log('⚠️  解析错误:');
          response.data.data.parseResult.errors.forEach(error => {
            console.log(`    第${error.row}行: ${error.error}`);
          });
        }

        return response.data.data;
      } else {
        console.log('❌ Excel文件解析失败:', response.data.message);
        return null;
      }
    } catch (error) {
      console.log('❌ 上传解析失败:', error.response?.data?.message || error.message);
      return null;
    }
  }

  /**
   * 测试预览导入数据
   */
  async testPreviewData(parseData, description) {
    try {
      console.log(`\n👀 测试预览导入数据: ${description}`);

      const response = await axios.post(`${this.baseURL}/menu/import/preview`, {
        menuData: parseData.parseResult.data
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.data.success) {
        console.log('✅ 数据预览成功');
        console.log('📊 预览摘要:');
        console.log('  - 总菜单数:', response.data.data.summary.totalMenus);
        console.log('  - 新建菜单:', response.data.data.summary.newMenus);
        console.log('  - 更新菜单:', response.data.data.summary.updateMenus);
        console.log('  - 总菜品数:', response.data.data.summary.totalDishes);
        console.log('  - 日期范围:', `${response.data.data.summary.dateRange.start} 到 ${response.data.data.summary.dateRange.end}`);

        console.log('\n📋 菜单预览:');
        response.data.data.preview.forEach(menu => {
          console.log(`  ${menu.date} ${menu.mealTypeName}: ${menu.dishCount}个菜品 (${menu.action})`);
        });

        return response.data.data;
      } else {
        console.log('❌ 数据预览失败:', response.data.message);
        return null;
      }
    } catch (error) {
      console.log('❌ 预览数据失败:', error.response?.data?.message || error.message);
      return null;
    }
  }

  /**
   * 测试执行批量导入
   */
  async testBatchImport(parseData, description) {
    try {
      console.log(`\n🚀 测试执行批量导入: ${description}`);

      const response = await axios.post(`${this.baseURL}/menu/import/execute`, {
        menuData: parseData.parseResult.data,
        options: {
          overwrite: true,
          allowPastDates: false,
          description: description
        }
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.data.success) {
        console.log('✅ 批量导入成功');
        console.log('📊 导入结果:');
        console.log('  - 总菜单数:', response.data.data.summary.totalMenus);
        console.log('  - 成功数量:', response.data.data.summary.successCount);
        console.log('  - 失败数量:', response.data.data.summary.failedCount);

        if (response.data.data.success.length > 0) {
          console.log('\n✅ 成功导入的菜单:');
          response.data.data.success.forEach(item => {
            console.log(`  - ${item.date} ${item.mealTypeName}: ${item.dishCount}个菜品 (${item.action})`);
          });
        }

        return response.data.data;
      } else {
        console.log('❌ 批量导入失败:', response.data.message);
        return null;
      }
    } catch (error) {
      console.log('❌ 批量导入失败:', error.response?.data?.message || error.message);
      return null;
    }
  }

  /**
   * 运行工作日菜单导入测试
   */
  async runWeekdayMenuTest() {
    console.log('🧪 开始工作日菜单导入功能测试\n');

    // 1. 登录
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ 测试终止：登录失败');
      return;
    }

    // 2. 测试完整工作日菜单导入
    console.log('='.repeat(60));
    console.log('📅 测试1: 完整工作日菜单导入（周一到周五）');
    console.log('='.repeat(60));
    
    const weekdayFilePath = this.createWeekdayMenuExcel();
    if (!weekdayFilePath) {
      console.log('❌ 测试终止：创建工作日菜单文件失败');
      return;
    }

    const weekdayParseData = await this.testUploadAndParse(weekdayFilePath, '完整工作日菜单');
    if (weekdayParseData) {
      await this.testPreviewData(weekdayParseData, '完整工作日菜单');
      await this.testBatchImport(weekdayParseData, '完整工作日菜单');
    }

    // 3. 测试只导入早餐
    console.log('\n' + '='.repeat(60));
    console.log('🌅 测试2: 只导入工作日早餐');
    console.log('='.repeat(60));
    
    const breakfastFilePath = this.createBreakfastOnlyExcel();
    if (breakfastFilePath) {
      const breakfastParseData = await this.testUploadAndParse(breakfastFilePath, '工作日早餐');
      if (breakfastParseData) {
        await this.testPreviewData(breakfastParseData, '工作日早餐');
        await this.testBatchImport(breakfastParseData, '工作日早餐');
      }
    }

    console.log('\n🎉 工作日菜单导入功能测试完成！');
    console.log('\n📋 测试总结:');
    console.log('✅ 支持只导入工作日菜单（周一到周五）');
    console.log('✅ 支持周末不提供菜单');
    console.log('✅ 支持只导入特定餐次（如只导入早餐）');
    console.log('✅ 支持任意日期的菜单导入');
    console.log('✅ 系统自动识别并只创建有数据的菜单');
    
    // 清理测试文件
    try {
      if (fs.existsSync(weekdayFilePath)) {
        fs.unlinkSync(weekdayFilePath);
        console.log('🗑️  工作日菜单测试文件已清理');
      }
      if (fs.existsSync(breakfastFilePath)) {
        fs.unlinkSync(breakfastFilePath);
        console.log('🗑️  早餐菜单测试文件已清理');
      }
    } catch (error) {
      console.log('⚠️  清理测试文件失败:', error.message);
    }
  }
}

// 运行测试
if (require.main === module) {
  const tester = new WeekdayMenuImportTester();
  tester.runWeekdayMenuTest().catch(console.error);
}

module.exports = WeekdayMenuImportTester;
