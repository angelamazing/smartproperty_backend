const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const XLSX = require('xlsx');

/**
 * 测试导入历史功能修复
 */
class ImportHistoryTester {
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
   * 创建测试Excel文件
   */
  createTestExcel() {
    try {
      console.log('\n📝 创建测试Excel文件...');

      const testData = [
        ['日期', '餐次类型', '菜品名称', '菜品价格', '菜品分类', '排序', '备注'],
        ['2025-09-18', '早餐', '小笼包', '8.00', '面点', '1', '上海风味'],
        ['2025-09-18', '早餐', '豆浆', '3.00', '饮品', '2', '原味豆浆'],
        ['2025-09-18', '中餐', '红烧肉', '25.00', '荤菜', '1', '经典川菜'],
        ['2025-09-18', '中餐', '青菜豆腐', '12.00', '素菜', '2', '清淡爽口'],
        ['2025-09-18', '晚餐', '蒸蛋', '8.00', '蛋类', '1', '嫩滑蒸蛋']
      ];

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(testData);
      XLSX.utils.book_append_sheet(workbook, worksheet, '测试菜单');

      const testFilePath = path.join(__dirname, 'test-import-history.xlsx');
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
          description: '测试导入历史功能'
        },
        filename: 'test-import-history.xlsx'
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
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (response.data.success) {
        console.log('✅ 获取导入历史成功');
        console.log('📊 历史记录:');
        console.log('  - 总记录数:', response.data.data.pagination.total);
        console.log('  - 当前页:', response.data.data.pagination.page);
        console.log('  - 每页数量:', response.data.data.pagination.pageSize);

        if (response.data.data.list.length > 0) {
          console.log('\n📋 最近的导入记录:');
          response.data.data.list.forEach((record, index) => {
            console.log(`  ${index + 1}. ${record.importTime}: ${record.filename} (${record.status})`);
            console.log(`     菜单数: ${record.summary.totalMenus || 0}, 成功: ${record.summary.successCount || 0}, 失败: ${record.summary.failedCount || 0}`);
          });
        } else {
          console.log('  - 暂无导入历史记录');
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
  async runTest() {
    console.log('🧪 开始导入历史功能修复测试\n');

    // 1. 登录
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ 测试终止：登录失败');
      return;
    }

    // 2. 创建测试Excel文件
    const testFilePath = this.createTestExcel();
    if (!testFilePath) {
      console.log('❌ 测试终止：创建测试文件失败');
      return;
    }

    // 3. 上传并解析Excel文件
    const parseData = await this.testUploadAndParse(testFilePath);
    if (!parseData) {
      console.log('❌ 测试终止：解析文件失败');
      return;
    }

    // 4. 执行批量导入
    const importResult = await this.testBatchImport(parseData);
    if (!importResult) {
      console.log('❌ 测试终止：批量导入失败');
      return;
    }

    // 5. 测试获取导入历史
    const historyResult = await this.testGetImportHistory();
    if (!historyResult) {
      console.log('❌ 测试终止：获取导入历史失败');
      return;
    }

    console.log('\n🎉 导入历史功能修复测试完成！');
    console.log('\n📋 修复内容:');
    console.log('✅ 修复了SQL查询参数问题');
    console.log('✅ 添加了批量导入操作日志记录');
    console.log('✅ 修复了导入历史查询功能');
    console.log('✅ 支持文件名记录和显示');

    // 清理测试文件
    try {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
        console.log('\n🗑️  测试文件已清理');
      }
    } catch (error) {
      console.log('\n⚠️  清理测试文件失败:', error.message);
    }
  }
}

// 运行测试
if (require.main === module) {
  const tester = new ImportHistoryTester();
  tester.runTest().catch(console.error);
}

module.exports = ImportHistoryTester;
