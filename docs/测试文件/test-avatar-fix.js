const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 测试配置
const BASE_URL = 'http://localhost:3000';
const TEST_TOKEN = 'your_admin_token_here'; // 替换为实际的管理员token

// 创建测试图片文件
function createTestImage() {
  const testImagePath = path.join(__dirname, 'test-avatar.jpg');
  
  // 创建一个简单的测试图片（1x1像素的JPEG）
  const testImageBuffer = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
    0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
    0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8F, 0xA0,
    0xFF, 0xD9
  ]);
  
  fs.writeFileSync(testImagePath, testImageBuffer);
  return testImagePath;
}

// 测试头像上传
async function testAvatarUpload() {
  try {
    console.log('🧪 开始测试头像上传功能修复...');
    
    // 检查token
    if (TEST_TOKEN === 'your_admin_token_here') {
      console.log('❌ 请先设置有效的管理员token');
      console.log('💡 请修改脚本中的 TEST_TOKEN 变量');
      return;
    }
    
    // 创建测试图片
    const testImagePath = createTestImage();
    console.log(`✅ 创建测试图片: ${testImagePath}`);
    
    // 创建FormData
    const formData = new FormData();
    const fileStream = fs.createReadStream(testImagePath);
    formData.append('avatar', fileStream, 'test-avatar.jpg');
    
    console.log('📤 开始上传头像...');
    console.log('🔍 请求详情:');
    console.log('  - URL:', `${BASE_URL}/api/admin/upload/avatar`);
    console.log('  - 方法: POST');
    console.log('  - 字段名: avatar');
    console.log('  - 文件: test-avatar.jpg');
    
    // 发送请求
    const response = await axios.post(`${BASE_URL}/api/admin/upload/avatar`, formData, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        ...formData.getHeaders()
      },
      timeout: 10000
    });
    
    console.log('✅ 头像上传成功！');
    console.log('📊 响应状态:', response.status);
    console.log('📋 响应数据:', JSON.stringify(response.data, null, 2));
    
    // 验证返回的数据结构
    if (response.data.success) {
      console.log('🎯 验证响应数据结构:');
      console.log('  - success:', response.data.success);
      console.log('  - message:', response.data.message);
      console.log('  - avatarUrl:', response.data.data.avatarUrl);
      console.log('  - fileName:', response.data.data.fileName);
      console.log('  - fileSize:', response.data.data.fileSize);
      
      // 检查文件是否真的保存了
      const filePath = path.join(__dirname, '..', 'public', response.data.data.avatarUrl);
      if (fs.existsSync(filePath)) {
        console.log('✅ 文件确实保存到了服务器');
        console.log('📁 文件路径:', filePath);
        console.log('📏 文件大小:', fs.statSync(filePath).size, 'bytes');
      } else {
        console.log('❌ 文件没有保存到服务器');
      }
    }
    
    // 清理测试文件
    fs.unlinkSync(testImagePath);
    console.log('🧹 清理测试文件完成');
    
  } catch (error) {
    console.error('❌ 头像上传测试失败:');
    
    if (error.response) {
      console.error('📥 响应状态:', error.response.status);
      console.error('📥 响应数据:', error.response.data);
      console.error('📥 响应头:', error.response.headers);
    } else if (error.request) {
      console.error('📤 请求错误:', error.message);
      console.error('📤 请求配置:', error.config);
    } else {
      console.error('💥 其他错误:', error.message);
    }
    
    // 清理测试文件
    try {
      if (fs.existsSync('test-avatar.jpg')) {
        fs.unlinkSync('test-avatar.jpg');
      }
    } catch (cleanupError) {
      console.error('🧹 清理测试文件失败:', cleanupError.message);
    }
  }
}

// 运行测试
if (require.main === module) {
  testAvatarUpload();
}

module.exports = {
  testAvatarUpload
};
