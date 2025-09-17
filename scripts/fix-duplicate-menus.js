/**
 * 修复重复菜单问题的脚本
 */

const axios = require('axios');

class DuplicateMenuFixer {
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

  async getMenusByDate(date) {
    try {
      console.log(`📅 查询 ${date} 的菜单...`);
      const response = await axios.get(`${this.baseURL}/admin/menu/history`, {
        headers: this.getHeaders(),
        params: { 
          startDate: date,
          endDate: date,
          page: 1,
          pageSize: 100
        }
      });

      if (response.data.success) {
        const menus = response.data.data.list;
        console.log(`✅ 找到 ${menus.length} 个菜单`);
        return menus;
      } else {
        console.log('❌ 查询菜单失败:', response.data.message);
        return [];
      }
    } catch (error) {
      console.log('❌ 查询菜单请求失败:', error.message);
      return [];
    }
  }

  async deleteMenu(menuId) {
    try {
      console.log(`🗑️ 删除菜单 ${menuId}...`);
      const response = await axios.delete(`${this.baseURL}/admin/menu/${menuId}`, {
        headers: this.getHeaders()
      });

      if (response.data.success) {
        console.log('✅ 菜单删除成功');
        return true;
      } else {
        console.log('❌ 菜单删除失败:', response.data.message);
        return false;
      }
    } catch (error) {
      console.log('❌ 删除菜单请求失败:', error.message);
      return false;
    }
  }

  async fixDuplicateMenus() {
    try {
      console.log('🔧 开始修复重复菜单问题...\n');

      // 登录
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.log('❌ 修复终止：登录失败');
        return;
      }

      // 查询2025-09-24的菜单
      const targetDate = '2025-09-24';
      const menus = await this.getMenusByDate(targetDate);
      
      if (menus.length === 0) {
        console.log(`✅ ${targetDate} 没有菜单，无需修复`);
        return;
      }

      console.log(`\n📋 ${targetDate} 的菜单列表:`);
      menus.forEach((menu, index) => {
        console.log(`   ${index + 1}. ID: ${menu._id}, 餐次: ${menu.mealTypeName}, 菜品数: ${menu.dishCount || 0}`);
      });

      // 按餐次分组
      const menuGroups = {};
      menus.forEach(menu => {
        if (!menuGroups[menu.mealType]) {
          menuGroups[menu.mealType] = [];
        }
        menuGroups[menu.mealType].push(menu);
      });

      console.log(`\n🔍 发现重复的餐次:`);
      Object.keys(menuGroups).forEach(mealType => {
        const group = menuGroups[mealType];
        if (group.length > 1) {
          console.log(`   ${mealType}: ${group.length} 个菜单`);
        }
      });

      // 删除重复的菜单（保留最新的）
      let deletedCount = 0;
      for (const mealType in menuGroups) {
        const group = menuGroups[mealType];
        if (group.length > 1) {
          // 按创建时间排序，保留最新的
          group.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
          
          // 删除除第一个（最新的）之外的所有菜单
          for (let i = 1; i < group.length; i++) {
            const success = await this.deleteMenu(group[i]._id);
            if (success) {
              deletedCount++;
            }
          }
        }
      }

      console.log(`\n✅ 修复完成！删除了 ${deletedCount} 个重复菜单`);

      // 验证修复结果
      console.log(`\n🔍 验证修复结果...`);
      const remainingMenus = await this.getMenusByDate(targetDate);
      console.log(`📊 修复后 ${targetDate} 还有 ${remainingMenus.length} 个菜单`);

      if (remainingMenus.length > 0) {
        console.log('📋 剩余菜单:');
        remainingMenus.forEach((menu, index) => {
          console.log(`   ${index + 1}. 餐次: ${menu.mealTypeName}, 菜品数: ${menu.dishCount || 0}`);
        });
      }

    } catch (error) {
      console.error('❌ 修复过程中发生错误:', error.message);
    }
  }
}

// 运行修复
const fixer = new DuplicateMenuFixer();
fixer.fixDuplicateMenus().then(() => {
  console.log('\n🎉 修复脚本执行完成！');
  process.exit(0);
}).catch(error => {
  console.error('❌ 修复失败:', error.message);
  process.exit(1);
});
