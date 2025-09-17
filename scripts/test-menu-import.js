const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const XLSX = require('xlsx');

/**
 * 菜单批量导入功能测试脚本
 */
class MenuImportTester {
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
        phoneNumber: '13800138001', // 管理员手机号
        password: 'admin123456'     // 管理员密码
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
   * 获取请求头
   */
  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 测试下载Excel模板
   */
  async testDownloadTemplate() {
    try {
      console.log('\n📥 测试下载Excel模板...');

      const response = await axios.get(`${this.baseURL}/menu/import/template`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        },
        responseType: 'arraybuffer'
      });

      if (response.status === 200) {
        const templatePath = path.join(__dirname, 'menu-import-template.xlsx');
        fs.writeFileSync(templatePath, response.data);
        console.log('✅ Excel模板下载成功:', templatePath);
        return templatePath;
      } else {
        console.log('❌ 模板下载失败');
        return null;
      }
    } catch (error) {
      console.log('❌ 下载模板失败:', error.message);
      return null;
    }
  }

  /**
   * 创建测试Excel文件
   */
  createTestExcel() {
    try {
      console.log('\n📝 创建测试Excel文件...');

      // 创建测试数据
      const testData = [
        ['日期', '餐次类型', '菜品名称', '菜品价格', '菜品分类', '排序', '备注'],
        ['2025-09-20', '早餐', '小笼包', '8.00', '面点', '1', '上海风味小笼包'],
        ['2025-09-20', '早餐', '豆浆', '3.00', '饮品', '2', '原味豆浆'],
        ['2025-09-20', '早餐', '咸菜', '2.00', '小菜', '3', '开胃小菜'],
        ['2025-09-20', '中餐', '红烧肉', '25.00', '荤菜', '1', '经典红烧肉'],
        ['2025-09-20', '中餐', '青菜豆腐', '12.00', '素菜', '2', '清淡爽口'],
        ['2025-09-20', '中餐', '米饭', '2.00', '主食', '3', '东北大米'],
        ['2025-09-20', '晚餐', '蒸蛋', '8.00', '蛋类', '1', '嫩滑蒸蛋'],
        ['2025-09-20', '晚餐', '青菜汤', '6.00', '汤类', '2', '清汤青菜'],
        ['2025-09-21', '早餐', '包子', '6.00', '面点', '1', '猪肉大葱包'],
        ['2025-09-21', '早餐', '小米粥', '4.00', '粥类', '2', '营养小米粥'],
        ['2025-09-21', '中餐', '糖醋里脊', '22.00', '荤菜', '1', '酸甜可口'],
        ['2025-09-21', '中餐', '炒青菜', '10.00', '素菜', '2', '时令青菜'],
        ['2025-09-21', '晚餐', '鸡蛋汤', '8.00', '汤类', '1', '营养鸡蛋汤']
      ];

      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(testData);
      XLSX.utils.book_append_sheet(workbook, worksheet, '菜单数据');

      // 保存文件
      const testFilePath = path.join(__dirname, 'test-menu-data.xlsx');
      XLSX.writeFile(workbook, testFilePath);

      console.log('✅ 测试Excel文件创建成功:', testFilePath);
      return testFilePath;
    } catch (error) {
      console.log('❌ 创建测试Excel文件失败:', error.message);
      return null;
    }
  }

  /**
   * 测试上传并解析Excel文件
   */
  async testUploadAndParse(filePath) {
    try {
      console.log('\n📤 测试上传并解析Excel文件...');

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
        
        if (response.data.data.parseResult.errors.length > 0) {
          console.log('⚠️  解析错误:');
          response.data.data.parseResult.errors.forEach(error => {
            console.log(`    第${error.row}行: ${error.error}`);
          });
        }

        if (response.data.data.validation.warnings.length > 0) {
          console.log('⚠️  验证警告:');
          response.data.data.validation.warnings.forEach(warning => {
            console.log(`    ${warning}`);
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
  async testPreviewData(parseData) {
    try {
      console.log('\n👀 测试预览导入数据...');

      const response = await axios.post(`${this.baseURL}/menu/import/preview`, {
        menuData: parseData.parseResult.data
      }, {
        headers: this.getHeaders()
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
          menu.dishes.forEach(dish => {
            console.log(`    - ${dish.name} ¥${dish.price} [${dish.category || '未分类'}]`);
          });
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
  async testBatchImport(parseData) {
    try {
      console.log('\n🚀 测试执行批量导入...');

      const response = await axios.post(`${this.baseURL}/menu/import/execute`, {
        menuData: parseData.parseResult.data,
        options: {
          overwrite: true,
          allowPastDates: false,
          description: '测试批量导入的菜单'
        }
      }, {
        headers: this.getHeaders()
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

        if (response.data.data.failed.length > 0) {
          console.log('\n❌ 导入失败的菜单:');
          response.data.data.failed.forEach(item => {
            console.log(`  - ${item.date} ${item.mealTypeName}: ${item.error}`);
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
   * 测试获取导入历史
   */
  async testGetImportHistory() {
    try {
      console.log('\n📚 测试获取导入历史...');

      const response = await axios.get(`${this.baseURL}/menu/import/history?page=1&pageSize=10`, {
        headers: this.getHeaders()
      });

      if (response.data.success) {
        console.log('✅ 获取导入历史成功');
        console.log('📊 历史记录:');
        console.log('  - 总记录数:', response.data.data.pagination.total);
        console.log('  - 当前页:', response.data.data.pagination.page);

        if (response.data.data.list.length > 0) {
          console.log('\n📋 最近的导入记录:');
          response.data.data.list.forEach(record => {
            console.log(`  - ${record.importTime}: ${record.filename} (${record.status})`);
          });
        }

        return response.data.data;
      } else {
        console.log('❌ 获取导入历史失败:', response.data.message);
        return null;
      }
    } catch (error) {
      console.log('❌ 获取导入历史失败:', error.response?.data?.message || error.message);
      return null;
    }
  }

  /**
   * 运行完整测试
   */
  async runFullTest() {
    console.log('🧪 开始菜单批量导入功能测试\n');

    // 1. 登录
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ 测试终止：登录失败');
      return;
    }

    // 2. 下载模板
    const templatePath = await this.testDownloadTemplate();
    
    // 3. 创建测试Excel文件
    const testFilePath = this.createTestExcel();
    if (!testFilePath) {
      console.log('❌ 测试终止：创建测试文件失败');
      return;
    }

    // 4. 上传并解析Excel文件
    const parseData = await this.testUploadAndParse(testFilePath);
    if (!parseData) {
      console.log('❌ 测试终止：解析文件失败');
      return;
    }

    // 5. 预览导入数据
    const previewData = await this.testPreviewData(parseData);
    if (!previewData) {
      console.log('❌ 测试终止：预览数据失败');
      return;
    }

    // 6. 执行批量导入
    const importResult = await this.testBatchImport(parseData);
    if (!importResult) {
      console.log('❌ 测试终止：批量导入失败');
      return;
    }

    // 7. 获取导入历史
    await this.testGetImportHistory();

    console.log('\n🎉 菜单批量导入功能测试完成！');
    
    // 清理测试文件
    try {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
        console.log('🗑️  测试文件已清理');
      }
    } catch (error) {
      console.log('⚠️  清理测试文件失败:', error.message);
    }
  }
}

// 运行测试
if (require.main === module) {
  const tester = new MenuImportTester();
  tester.runFullTest().catch(console.error);
}

module.exports = MenuImportTester;
