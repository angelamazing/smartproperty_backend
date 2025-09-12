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
    console.log('🧪 开始测试头像上传功能...');
    
    // 检查token
    if (TEST_TOKEN === 'your_admin_token_here') {
      console.log('❌ 请先设置有效的管理员token');
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
    
    // 发送请求
    const response = await axios.post(`${BASE_URL}/api/admin/upload/avatar`, formData, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        ...formData.getHeaders() // 重要：让axios自动设置正确的headers
      },
      timeout: 10000
    });
    
    console.log('✅ 头像上传成功！');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    // 清理测试文件
    fs.unlinkSync(testImagePath);
    console.log('🧹 清理测试文件完成');
    
  } catch (error) {
    console.error('❌ 头像上传测试失败:');
    
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('请求错误:', error.message);
    } else {
      console.error('其他错误:', error.message);
    }
    
    // 清理测试文件
    try {
      if (fs.existsSync('test-avatar.jpg')) {
        fs.unlinkSync('test-avatar.jpg');
      }
    } catch (cleanupError) {
      console.error('清理测试文件失败:', cleanupError.message);
    }
  }
}

// 测试不同的上传方式
async function testDifferentUploadMethods() {
  console.log('\n🔍 测试不同的上传方式...');
  
  try {
    // 方式1: 使用FormData (推荐)
    console.log('\n1️⃣ 测试方式1: 使用FormData');
    await testAvatarUpload();
    
  } catch (error) {
    console.error('方式1测试失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  testDifferentUploadMethods();
}

module.exports = {
  testAvatarUpload,
  testDifferentUploadMethods
};
