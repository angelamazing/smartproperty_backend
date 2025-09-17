const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const XLSX = require('xlsx');

/**
 * 测试导入历史API功能
 */
class ImportHistoryAPITester {
  constructor() {
    this.baseURL = 'http://localhost:3000/api/admin';
    this.token = null;
  }

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

  async testImportHistoryAPI() {
    try {
      console.log('\n📚 测试导入历史API...');

      // 测试不同的分页参数
      const testCases = [
        { page: 1, pageSize: 10 },
        { page: 1, pageSize: 5 },
        { page: 2, pageSize: 10 }
      ];

      for (const testCase of testCases) {
        console.log(`\n测试分页参数: page=${testCase.page}, pageSize=${testCase.pageSize}`);
        
        const response = await axios.get(
          `${this.baseURL}/menu/import/history?page=${testCase.page}&pageSize=${testCase.pageSize}`, 
          {
            headers: {
              'Authorization': `Bearer ${this.token}`
            }
          }
        );

        if (response.data.success) {
          console.log('✅ 导入历史API调用成功');
          console.log('📊 响应数据:');
          console.log('  - 总记录数:', response.data.data.pagination.total);
          console.log('  - 当前页:', response.data.data.pagination.page);
          console.log('  - 每页数量:', response.data.data.pagination.pageSize);
          console.log('  - 总页数:', response.data.data.pagination.totalPages);
          console.log('  - 当前页记录数:', response.data.data.list.length);
        } else {
          console.log('❌ 导入历史API调用失败:', response.data.message);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.log('❌ 导入历史API测试失败:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async testWithRealImport() {
    try {
      console.log('\n📤 测试真实导入并查看历史...');

      // 创建测试Excel文件
      const testData = [
        ['日期', '餐次类型', '菜品名称', '菜品价格', '菜品分类', '排序', '备注'],
        ['2025-09-18', '早餐', '小笼包', '8.00', '面点', '1', '上海风味'],
        ['2025-09-18', '中餐', '红烧肉', '25.00', '荤菜', '1', '经典川菜']
      ];

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(testData);
      XLSX.utils.book_append_sheet(workbook, worksheet, '测试菜单');

      const testFilePath = path.join(__dirname, 'test-import-api.xlsx');
      XLSX.writeFile(workbook, testFilePath);

      // 上传并解析Excel
      const formData = new FormData();
      formData.append('excel', fs.createReadStream(testFilePath));

      const parseResponse = await axios.post(`${this.baseURL}/menu/import/parse`, formData, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          ...formData.getHeaders()
        }
      });

      if (!parseResponse.data.success) {
        console.log('❌ Excel解析失败:', parseResponse.data.message);
        return false;
      }

      console.log('✅ Excel解析成功');

      // 执行批量导入
      const importResponse = await axios.post(`${this.baseURL}/menu/import/execute`, {
        menuData: parseResponse.data.data.parseResult.data,
        options: {
          overwrite: true,
          allowPastDates: false,
          description: 'API测试导入'
        },
        filename: 'test-import-api.xlsx'
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (!importResponse.data.success) {
        console.log('❌ 批量导入失败:', importResponse.data.message);
        return false;
      }

      console.log('✅ 批量导入成功');

      // 等待一下让日志记录完成
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 查看导入历史
      const historyResponse = await axios.get(`${this.baseURL}/menu/import/history?page=1&pageSize=10`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });

      if (historyResponse.data.success) {
        console.log('✅ 导入历史查询成功');
        console.log('📊 历史记录:');
        console.log('  - 总记录数:', historyResponse.data.data.pagination.total);
        
        if (historyResponse.data.data.list.length > 0) {
          const latestRecord = historyResponse.data.data.list[0];
          console.log('  - 最新记录:');
          console.log('    * 导入时间:', latestRecord.importTime);
          console.log('    * 文件名:', latestRecord.filename);
          console.log('    * 状态:', latestRecord.status);
          console.log('    * 菜单数:', latestRecord.summary.totalMenus);
        }
      } else {
        console.log('❌ 导入历史查询失败:', historyResponse.data.message);
        return false;
      }

      // 清理测试文件
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
        console.log('🗑️  测试文件已清理');
      }

      return true;
    } catch (error) {
      console.log('❌ 真实导入测试失败:', error.response?.data?.message || error.message);
      return false;
    }
  }

  async runTest() {
    console.log('🧪 开始导入历史API功能测试\n');

    // 1. 登录
    const loginSuccess = await this.login();
    if (!loginSuccess) {
      console.log('❌ 测试终止：登录失败');
      return;
    }

    // 2. 测试导入历史API
    const apiSuccess = await this.testImportHistoryAPI();
    if (!apiSuccess) {
      console.log('❌ 测试终止：API测试失败');
      return;
    }

    // 3. 测试真实导入
    const importSuccess = await this.testWithRealImport();
    if (!importSuccess) {
      console.log('❌ 测试终止：真实导入测试失败');
      return;
    }

    console.log('\n🎉 导入历史API功能测试完成！');
    console.log('\n📋 测试结果:');
    console.log('✅ SQL查询错误已修复');
    console.log('✅ 导入历史API正常工作');
    console.log('✅ 支持分页查询');
    console.log('✅ 支持真实数据导入和历史记录');
  }
}

// 运行测试
if (require.main === module) {
  const tester = new ImportHistoryAPITester();
  tester.runTest().catch(console.error);
}

module.exports = ImportHistoryAPITester;
