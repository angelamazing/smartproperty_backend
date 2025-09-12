/**
 * 测试头像访问功能
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const TEST_AVATAR = 'avatar_1756687222017_hsnganr3o.png';

async function testAvatarAccess() {
  console.log('🧪 开始测试头像访问功能...\n');

  try {
    // 1. 测试静态文件服务
    console.log('1️⃣ 测试静态文件服务...');
    const avatarUrl = `${BASE_URL}/uploads/avatars/${TEST_AVATAR}`;
    
    const response = await axios.get(avatarUrl, {
      responseType: 'arraybuffer',
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log('✅ 静态文件服务正常');
      console.log('   - 状态码:', response.status);
      console.log('   - 内容类型:', response.headers['content-type']);
      console.log('   - 文件大小:', response.data.length, '字节');
      console.log('   - 头像URL:', avatarUrl);
    } else {
      console.log('❌ 静态文件服务异常:', response.status);
    }

    // 2. 测试头像文件是否存在
    console.log('\n2️⃣ 检查头像文件是否存在...');
    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.join(__dirname, 'public', 'uploads', 'avatars', TEST_AVATAR);
    
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log('✅ 头像文件存在');
      console.log('   - 文件路径:', filePath);
      console.log('   - 文件大小:', stats.size, '字节');
      console.log('   - 创建时间:', stats.birthtime);
      console.log('   - 修改时间:', stats.mtime);
    } else {
      console.log('❌ 头像文件不存在:', filePath);
    }

    // 3. 测试浏览器访问
    console.log('\n3️⃣ 测试浏览器访问...');
    console.log('请在浏览器中访问以下URL测试头像显示:');
    console.log(`   ${avatarUrl}`);
    console.log('\n如果头像能正常显示，说明静态文件服务配置成功！');

    // 4. 列出所有头像文件
    console.log('\n4️⃣ 列出所有头像文件...');
    const avatarsDir = path.join(__dirname, 'public', 'uploads', 'avatars');
    
    if (fs.existsSync(avatarsDir)) {
      const files = fs.readdirSync(avatarsDir);
      console.log(`✅ 找到 ${files.length} 个头像文件:`);
      
      files.forEach((file, index) => {
        const filePath = path.join(avatarsDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   ${index + 1}. ${file} (${stats.size} 字节)`);
      });
    } else {
      console.log('❌ 头像目录不存在:', avatarsDir);
    }

    // 5. 测试API获取用户信息
    console.log('\n5️⃣ 测试API获取用户信息...');
    try {
      // 先登录获取token
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'testuser',
        password: 'testpass123'
      });
      
      if (loginResponse.data.success) {
        const token = loginResponse.data.data.token;
        
        // 获取用户信息
        const userResponse = await axios.get(`${BASE_URL}/api/user/info`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (userResponse.data.success) {
          const userInfo = userResponse.data.data;
          console.log('✅ 获取用户信息成功');
          console.log('   - 用户昵称:', userInfo.nickName);
          console.log('   - 头像URL:', userInfo.avatarUrl);
          
          // 测试头像URL是否可访问
          if (userInfo.avatarUrl) {
            try {
              const avatarResponse = await axios.get(userInfo.avatarUrl, {
                responseType: 'arraybuffer',
                timeout: 5000
              });
              
              if (avatarResponse.status === 200) {
                console.log('✅ 用户头像可正常访问');
              } else {
                console.log('❌ 用户头像无法访问:', avatarResponse.status);
              }
            } catch (avatarError) {
              console.log('❌ 用户头像访问失败:', avatarError.message);
            }
          }
        } else {
          console.log('❌ 获取用户信息失败:', userResponse.data.message);
        }
      } else {
        console.log('❌ 登录失败:', loginResponse.data.message);
      }
    } catch (apiError) {
      console.log('❌ API测试失败:', apiError.message);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 提示: 请确保服务器正在运行 (npm start 或 npm run dev)');
    }
  }
}

// 运行测试
testAvatarAccess();
