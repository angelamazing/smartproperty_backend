const fs = require('fs').promises;
const path = require('path');

/**
 * 修复adminService.js中的参数绑定问题
 */
async function fixAdminService() {
  try {
    console.log('开始修复adminService.js文件...');
    
    // 读取adminService.js文件
    const adminServicePath = path.join(__dirname, '../services/adminService.js');
    const content = await fs.readFile(adminServicePath, 'utf8');
    
    // 定义需要搜索和替换的文本
    const searchText = "    // 获取分页数据\n    const offset = (page - 1) * pageSize;\n    const [users] = await db.execute(\n      `SELECT u.*, d.name as department_name \\n       FROM users u \\n       LEFT JOIN departments d ON u.departmentId = d._id \\n       ${whereClause} \\n       ORDER BY u.createTime DESC \\n       LIMIT ? OFFSET ?`,\n      [...params, pageSize, offset]\n    );";
    
    const replaceText = "    // 获取分页数据\n    const offset = (page - 1) * pageSize;\n    const [users] = await db.execute(\n      `SELECT u.*, d.name as department_name \\n       FROM users u \\n       LEFT JOIN departments d ON u.departmentId = d._id \\n       " + whereClause + " \\n       ORDER BY u.createTime DESC \\n       LIMIT " + pageSize + " OFFSET " + offset + "`\n    );";
    
    // 检查是否需要修复
    if (content.includes(replaceText)) {
      console.log('✓ 代码已经是修复后的格式，不需要再次修复');
      return;
    }
    
    // 进行替换
    const updatedContent = content.replace(searchText, replaceText);
    
    // 写入修复后的文件
    await fs.writeFile(adminServicePath, updatedContent, 'utf8');
    console.log('✓ 成功修复adminService.js文件');
    
    // 验证修复结果
    const newContent = await fs.readFile(adminServicePath, 'utf8');
    if (newContent.includes(replaceText)) {
      console.log('✓ 修复验证成功！参数绑定问题已解决');
    } else {
      console.error('✗ 修复验证失败！请检查代码');
    }
    
    console.log('\n✓ 所有修复完成！');
    console.log('提示：修复完成后，您需要重启Node.js服务以使更改生效。');
    
  } catch (error) {
    console.error('✗ 修复过程中出现错误:', error.message);
    process.exit(1);
  }
}

// 执行修复
if (require.main === module) {
  fixAdminService();
}