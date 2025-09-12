const mysql = require('mysql2/promise');
const config = require('./config/database');

async function fixUserAvatars() {
  let connection;
  
  try {
    console.log('🔧 修复用户头像问题...');
    
    // 创建连接
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 检查users表结构
    console.log('\n📋 检查users表结构...');
    const [columns] = await connection.execute('DESCRIBE users');
    const hasAvatarField = columns.some(col => col.Field === 'avatarUrl');
    
    if (!hasAvatarField) {
      console.log('❌ users表没有avatarUrl字段');
      return;
    }
    
    console.log('✅ users表有avatarUrl字段');
    
    // 查看当前头像情况
    console.log('\n📋 查看当前头像情况...');
    const [users] = await connection.execute('SELECT _id, nickName, avatarUrl FROM users LIMIT 5');
    
    console.log('当前用户头像:');
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.nickName}: ${user.avatarUrl || '无头像'}`);
    });
    
    // 定义新的默认头像URL（使用可靠的CDN服务）
    const defaultAvatars = [
      'https://cdn.jsdelivr.net/gh/identicons/identicons@master/identicons/identicons.png',
      'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y',
      'https://ui-avatars.com/api/?name=Admin&background=random&color=fff&size=100',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      'https://api.dicebear.com/7.x/bottts/svg?seed=admin'
    ];
    
    // 更新用户头像
    console.log('\n📋 更新用户头像...');
    const [allUsers] = await connection.execute('SELECT _id, nickName, role FROM users');
    
    for (let i = 0; i < allUsers.length; i++) {
      const user = allUsers[i];
      const avatarIndex = i % defaultAvatars.length;
      const newAvatarUrl = defaultAvatars[avatarIndex];
      
      try {
        await connection.execute(
          'UPDATE users SET avatarUrl = ? WHERE _id = ?',
          [newAvatarUrl, user._id]
        );
        console.log(`✅ 更新用户 ${user.nickName} (${user.role}) 头像: ${newAvatarUrl}`);
      } catch (error) {
        console.log(`❌ 更新用户 ${user.nickName} 头像失败:`, error.message);
      }
    }
    
    // 验证更新结果
    console.log('\n📋 验证更新结果...');
    const [updatedUsers] = await connection.execute('SELECT _id, nickName, avatarUrl FROM users LIMIT 5');
    
    console.log('更新后的用户头像:');
    updatedUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.nickName}: ${user.avatarUrl}`);
    });
    
    console.log('\n🎉 用户头像修复完成！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行修复脚本
fixUserAvatars();
