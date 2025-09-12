const fs = require('fs').promises;
const path = require('path');

/**
 * 简单修复用户列表API中的参数绑定问题
 */
async function fixUserAPI() {
  try {
    console.log('开始简单修复用户列表API中的参数绑定问题...');
    
    // 读取adminService.js文件
    const adminServicePath = path.join(__dirname, '../services/adminService.js');
    let content = await fs.readFile(adminServicePath, 'utf8');
    
    // 查找问题代码段
    const searchStart = '// 获取分页数据';
    const searchEnd = '// 移除敏感信息';
    
    const startIndex = content.indexOf(searchStart);
    const endIndex = content.indexOf(searchEnd);
    
    if (startIndex === -1 || endIndex === -1) {
      console.log('✓ 未找到需要修复的代码段，可能已经修复过了');
      return;
    }
    
    // 提取问题代码
    const problematicCode = content.substring(startIndex, endIndex);
    console.log('找到需要修复的代码段');
    
    // 构建修复后的代码
    const fixedCode = `// 获取分页数据
    const offset = (page - 1) * pageSize;
    const [users] = await db.execute(
      `SELECT u.*, d.name as department_name \n       FROM users u \n       LEFT JOIN departments d ON u.departmentId = d._id \n       ${whereClause} \n       ORDER BY u.createTime DESC \n       LIMIT ${pageSize} OFFSET ${offset}`
    );`;
    
    // 替换代码
    const updatedContent = content.substring(0, startIndex) + fixedCode + content.substring(endIndex);
    
    // 写入修复后的文件
    await fs.writeFile(adminServicePath, updatedContent, 'utf8');
    console.log('✓ 成功修复adminService.js中的参数绑定问题');
    
    // 验证修复结果
    const newContent = await fs.readFile(adminServicePath, 'utf8');
    const isFixed = newContent.includes('LIMIT ${pageSize} OFFSET ${offset}');
    
    if (isFixed) {
      console.log('✓ 修复验证成功！参数绑定问题已解决');
    } else {
      console.error('✗ 修复验证失败！请检查代码');
    }
    
    console.log('\n✓ 所有修复完成！');
    console.log('提示：修复完成后，您需要重启Node.js服务以使更改生效。');
    
  } catch (error) {
    console.error('✗ 修复过程中出现错误:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

// 执行修复
if (require.main === module) {
  fixUserAPI();
}

module.exports = { fixUserAPI };