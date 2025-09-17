/**
 * 快速修复重复菜单问题
 */

const axios = require('axios');

class QuickDuplicateFixer {
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

  async fixWithOverwrite() {
    try {
      console.log('🔧 使用覆盖选项修复重复菜单...\n');

      // 准备要导入的菜单数据（基于您的错误日志）
      const menuData = [
        // 2025-09-23 菜单
        { date: '2025-09-23', mealType: 'breakfast', dishName: '小笼包', dishPrice: 8.00, category: '面点', sort: 1, remark: '上海风味' },
        { date: '2025-09-23', mealType: 'breakfast', dishName: '豆浆', dishPrice: 3.00, category: '饮品', sort: 2, remark: '原味豆浆' },
        { date: '2025-09-23', mealType: 'lunch', dishName: '红烧肉', dishPrice: 25.00, category: '荤菜', sort: 1, remark: '经典川菜' },
        { date: '2025-09-23', mealType: 'lunch', dishName: '青菜豆腐', dishPrice: 12.00, category: '素菜', sort: 2, remark: '清淡爽口' },
        { date: '2025-09-23', mealType: 'dinner', dishName: '蒸蛋', dishPrice: 8.00, category: '蛋类', sort: 1, remark: '嫩滑蒸蛋' },
        
        // 2025-09-24 菜单
        { date: '2025-09-24', mealType: 'breakfast', dishName: '包子', dishPrice: 6.00, category: '面点', sort: 1, remark: '猪肉大葱' },
        { date: '2025-09-24', mealType: 'breakfast', dishName: '小米粥', dishPrice: 4.00, category: '粥类', sort: 2, remark: '营养小米粥' },
        { date: '2025-09-24', mealType: 'lunch', dishName: '糖醋里脊', dishPrice: 22.00, category: '荤菜', sort: 1, remark: '酸甜可口' },
        { date: '2025-09-24', mealType: 'lunch', dishName: '炒青菜', dishPrice: 10.00, category: '素菜', sort: 2, remark: '时令青菜' },
        { date: '2025-09-24', mealType: 'dinner', dishName: '鸡蛋汤', dishPrice: 8.00, category: '汤类', sort: 1, remark: '营养鸡蛋汤' }
      ];

      console.log('📋 准备导入的菜单数据:');
      const groupedData = {};
      menuData.forEach(item => {
        const key = `${item.date}_${item.mealType}`;
        if (!groupedData[key]) {
          groupedData[key] = [];
        }
        groupedData[key].push(item);
      });

      Object.keys(groupedData).forEach(key => {
        const [date, mealType] = key.split('_');
        const mealTypeName = mealType === 'breakfast' ? '早餐' : mealType === 'lunch' ? '中餐' : '晚餐';
        console.log(`   ${date} ${mealTypeName}: ${groupedData[key].length} 个菜品`);
      });

      // 使用覆盖选项执行导入
      console.log('\n🚀 执行覆盖导入...');
      const response = await axios.post(`${this.baseURL}/admin/menu/import/execute`, {
        menuData: menuData,
        options: {
          overwrite: true,  // 关键：启用覆盖选项
          allowPastDates: false,
          description: '快速修复重复菜单问题'
        }
      }, {
        headers: this.getHeaders()
      });

      if (response.data.success) {
        console.log('✅ 覆盖导入成功！');
        console.log('📊 导入结果:');
        console.log(`   - 总菜单数: ${response.data.data.summary.totalMenus}`);
        console.log(`   - 成功数量: ${response.data.data.summary.successCount}`);
        console.log(`   - 失败数量: ${response.data.data.summary.failedCount}`);
        
        if (response.data.data.success && response.data.data.success.length > 0) {
          console.log('\n✅ 成功导入的菜单:');
          response.data.data.success.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.date} ${item.mealTypeName} - ${item.dishCount} 个菜品`);
          });
        }
        
        if (response.data.data.failed && response.data.data.failed.length > 0) {
          console.log('\n❌ 失败的菜单:');
          response.data.data.failed.forEach((item, index) => {
            console.log(`   ${index + 1}. ${item.date} ${item.mealTypeName} - ${item.error}`);
          });
        }
      } else {
        console.log('❌ 覆盖导入失败:', response.data.message);
      }

    } catch (error) {
      if (error.response && error.response.data) {
        console.log('❌ 导入请求失败:', error.response.data.message);
      } else {
        console.log('❌ 导入失败:', error.message);
      }
    }
  }

  async run() {
    try {
      console.log('🔧 快速修复重复菜单问题\n');

      // 登录
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.log('❌ 修复终止：登录失败');
        return;
      }

      // 执行覆盖导入
      await this.fixWithOverwrite();

      console.log('\n🎉 修复完成！');
      console.log('\n💡 使用提示:');
      console.log('   - 以后导入菜单时，记得启用覆盖选项');
      console.log('   - 在Web界面中勾选"覆盖现有菜单"选项');
      console.log('   - 在API调用中设置 options.overwrite = true');

    } catch (error) {
      console.error('❌ 修复过程中发生错误:', error.message);
    }
  }
}

// 运行修复
const fixer = new QuickDuplicateFixer();
fixer.run().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ 修复失败:', error.message);
  process.exit(1);
});

