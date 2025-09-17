/**
 * 分析菜单导入失败原因的脚本
 */

const axios = require('axios');

class ImportFailureAnalyzer {
  constructor() {
    this.baseURL = 'http://localhost:3000/api';
    this.token = null;
  }

  async login() {
    try {
      console.log('🔐 正在登录...');
      const response = await axios.post(`${this.baseURL}/auth/test-login-sys-admin`, {
        phoneNumber: '13800138001',
        password: 'admin123456'
      });

      if (response.data.success) {
        this.token = response.data.data.token;
        console.log('✅ 登录成功');
        return true;
      } else {
        console.log('❌ 登录失败:', response.data.message);
        return false;
      }
    } catch (error) {
      console.log('❌ 登录请求失败:', error.message);
      return false;
    }
  }

  getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getImportHistory() {
    try {
      console.log('\n📚 获取导入历史...');
      const response = await axios.get(`${this.baseURL}/admin/menu/import/history`, {
        headers: this.getHeaders(),
        params: { page: 1, pageSize: 10 }
      });

      if (response.data.success) {
        const history = response.data.data.list;
        console.log(`✅ 获取到 ${history.length} 条历史记录`);
        return history;
      } else {
        console.log('❌ 获取历史失败:', response.data.message);
        return [];
      }
    } catch (error) {
      console.log('❌ 获取历史请求失败:', error.message);
      return [];
    }
  }

  async analyzeFailures() {
    try {
      console.log('🔍 开始分析导入失败原因...\n');

      // 登录
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.log('❌ 测试终止：登录失败');
        return;
      }

      // 获取导入历史
      const history = await this.getImportHistory();
      if (history.length === 0) {
        console.log('❌ 没有找到导入历史记录');
        return;
      }

      // 分析最新的导入记录
      const latestRecord = history[0];
      console.log(`\n📋 分析最新导入记录: ${latestRecord.resourceId}`);
      console.log(`⏰ 导入时间: ${new Date(latestRecord.createTime).toLocaleString()}`);

      const details = JSON.parse(latestRecord.details);
      console.log(`\n📊 导入结果统计:`);
      console.log(`   - 总菜单数: ${details.summary.totalMenus}`);
      console.log(`   - 成功数量: ${details.summary.successCount}`);
      console.log(`   - 失败数量: ${details.summary.failedCount}`);

      if (details.failed && details.failed.length > 0) {
        console.log(`\n❌ 失败菜单详情:`);
        details.failed.forEach((item, index) => {
          console.log(`\n   ${index + 1}. 失败菜单:`);
          console.log(`      - 日期: ${item.date}`);
          console.log(`      - 餐次: ${item.mealTypeName} (${item.mealType})`);
          console.log(`      - 菜品: ${item.dishName}`);
          console.log(`      - 价格: ¥${item.price}`);
          console.log(`      - 分类: ${item.category}`);
          console.log(`      - 错误信息: ${item.error || '未知错误'}`);
        });
      }

      if (details.success && details.success.length > 0) {
        console.log(`\n✅ 成功菜单详情:`);
        details.success.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.date} ${item.mealTypeName} - ${item.dishName} (¥${item.price})`);
        });
      }

      // 分析失败原因
      console.log(`\n🔍 失败原因分析:`);
      const failureReasons = {};
      details.failed.forEach(item => {
        const reason = item.error || '未知错误';
        if (!failureReasons[reason]) {
          failureReasons[reason] = 0;
        }
        failureReasons[reason]++;
      });

      Object.keys(failureReasons).forEach(reason => {
        console.log(`   - ${reason}: ${failureReasons[reason]} 次`);
      });

      // 提供解决建议
      console.log(`\n💡 解决建议:`);
      if (failureReasons['菜品不存在']) {
        console.log('   - 确保所有菜品在系统中已存在，或启用自动创建菜品功能');
      }
      if (failureReasons['分类不存在']) {
        console.log('   - 确保所有分类在系统中已存在，或启用自动创建分类功能');
      }
      if (failureReasons['菜单已存在']) {
        console.log('   - 启用覆盖选项来替换现有菜单');
      }
      if (failureReasons['日期格式错误']) {
        console.log('   - 检查Excel文件中的日期格式是否正确');
      }
      if (failureReasons['价格格式错误']) {
        console.log('   - 检查Excel文件中的价格格式是否正确');
      }

    } catch (error) {
      console.error('❌ 分析过程中发生错误:', error.message);
    }
  }
}

// 运行分析
const analyzer = new ImportFailureAnalyzer();
analyzer.analyzeFailures().then(() => {
  console.log('\n🎉 分析完成！');
  process.exit(0);
}).catch(error => {
  console.error('❌ 分析失败:', error.message);
  process.exit(1);
});
