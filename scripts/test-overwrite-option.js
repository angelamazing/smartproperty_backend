/**
 * 测试覆盖选项功能
 */

const axios = require('axios');

class OverwriteOptionTester {
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

  async testOverwriteOption() {
    try {
      console.log('🧪 测试覆盖选项功能...\n');

      // 登录
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.log('❌ 测试终止：登录失败');
        return;
      }

      // 准备测试数据（重复的菜单）
      const testMenuData = [
        {
          date: '2025-09-23',
          mealType: 'breakfast',
          dishName: '测试小笼包',
          dishPrice: 8.00,
          category: '面点',
          sort: 1,
          remark: '测试覆盖功能'
        },
        {
          date: '2025-09-23',
          mealType: 'lunch',
          dishName: '测试红烧肉',
          dishPrice: 25.00,
          category: '荤菜',
          sort: 1,
          remark: '测试覆盖功能'
        }
      ];

      console.log('📋 测试数据:');
      testMenuData.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.date} ${item.mealType} - ${item.dishName} (¥${item.dishPrice})`);
      });

      // 测试1: 不启用覆盖选项（应该失败）
      console.log('\n🧪 测试1: 不启用覆盖选项');
      try {
        const response1 = await axios.post(`${this.baseURL}/admin/menu/import/execute`, {
          menuData: testMenuData,
          options: {
            overwrite: false,
            allowPastDates: false,
            description: '测试不覆盖选项'
          }
        }, {
          headers: this.getHeaders()
        });

        console.log('❌ 意外成功:', response1.data);
      } catch (error) {
        if (error.response && error.response.data) {
          console.log('✅ 预期失败:', error.response.data.message);
        } else {
          console.log('❌ 请求失败:', error.message);
        }
      }

      // 测试2: 启用覆盖选项（应该成功）
      console.log('\n🧪 测试2: 启用覆盖选项');
      try {
        const response2 = await axios.post(`${this.baseURL}/admin/menu/import/execute`, {
          menuData: testMenuData,
          options: {
            overwrite: true,
            allowPastDates: false,
            description: '测试覆盖选项'
          }
        }, {
          headers: this.getHeaders()
        });

        if (response2.data.success) {
          console.log('✅ 覆盖成功:', response2.data.message);
          console.log('📊 结果统计:', response2.data.data.summary);
        } else {
          console.log('❌ 覆盖失败:', response2.data.message);
        }
      } catch (error) {
        if (error.response && error.response.data) {
          console.log('❌ 覆盖请求失败:', error.response.data.message);
        } else {
          console.log('❌ 请求失败:', error.message);
        }
      }

      // 测试3: 再次测试覆盖（应该成功）
      console.log('\n🧪 测试3: 再次覆盖测试');
      try {
        const response3 = await axios.post(`${this.baseURL}/admin/menu/import/execute`, {
          menuData: testMenuData,
          options: {
            overwrite: true,
            allowPastDates: false,
            description: '再次测试覆盖选项'
          }
        }, {
          headers: this.getHeaders()
        });

        if (response3.data.success) {
          console.log('✅ 再次覆盖成功:', response3.data.message);
          console.log('📊 结果统计:', response3.data.data.summary);
        } else {
          console.log('❌ 再次覆盖失败:', response3.data.message);
        }
      } catch (error) {
        if (error.response && error.response.data) {
          console.log('❌ 再次覆盖请求失败:', error.response.data.message);
        } else {
          console.log('❌ 请求失败:', error.message);
        }
      }

    } catch (error) {
      console.error('❌ 测试过程中发生错误:', error.message);
    }
  }
}

// 运行测试
const tester = new OverwriteOptionTester();
tester.testOverwriteOption().then(() => {
  console.log('\n🎉 覆盖选项测试完成！');
  process.exit(0);
}).catch(error => {
  console.error('❌ 测试失败:', error.message);
  process.exit(1);
});

