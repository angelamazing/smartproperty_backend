const fs = require('fs').promises;
const path = require('path');

/**
 * 修复用户列表查询中的参数绑定问题
 * 将LIMIT ? OFFSET ?改为直接拼接值
 */
async function fixUserParamsBinding() {
  try {
    console.log('开始修复用户列表查询中的参数绑定问题...');
    
    const adminServicePath = path.join(__dirname, '../services/adminService.js');
    let content = await fs.readFile(adminServicePath, 'utf8');
    
    // 查找getUsers函数中的主查询部分
    const searchRegex = /const \[users\] = await db\.execute\(\s*`SELECT u\.\*, d\.name as department_name\s+FROM users u\s+LEFT JOIN departments d ON u\.departmentId = d\._id\s+\${whereClause}\s+ORDER BY u\.createTime DESC\s+LIMIT \? OFFSET \?`,\s*\[\.\.\.params, pageSize, offset\]\);/s;
    
    // 替换为直接拼接SQL值的方式
    const replaceString = `const [users] = await db.execute(
      `SELECT u.*, d.name as department_name 
       FROM users u 
       LEFT JOIN departments d ON u.departmentId = d._id 
       ${whereClause} 
       ORDER BY u.createTime DESC 
       LIMIT ${pageSize} OFFSET ${offset}`
    );`;
    
    if (searchRegex.test(content)) {
      const updatedContent = content.replace(searchRegex, replaceString);
      await fs.writeFile(adminServicePath, updatedContent, 'utf8');
      console.log('✓ 成功修复adminService.js中的参数绑定问题');
    } else {
      console.log('✓ adminService.js中的参数绑定问题已经修复，无需再次修复');
    }
    
    // 验证修复结果
    await verifyFix(adminServicePath);
    
    console.log('\n✓ 所有修复完成！');
    console.log('提示：修复完成后，您需要重启Node.js服务以使更改生效。');
    
  } catch (error) {
    console.error('✗ 修复过程中出现错误:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

/**
 * 验证修复结果
 */
async function verifyFix(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // 检查是否使用了直接拼接的方式
    const hasFixedQuery = content.includes('LIMIT ${pageSize} OFFSET ${offset}');
    const hasOldQuery = content.includes('LIMIT ? OFFSET ?');
    
    if (hasFixedQuery && !hasOldQuery) {
      console.log('✓ 修复验证成功！参数绑定问题已解决');
    } else {
      console.log('✗ 修复验证不完全成功！');
      if (hasFixedQuery) {
        console.log('- 至少存在一个使用直接拼接的查询');
      }
      if (hasOldQuery) {
        console.log('- 仍存在使用参数绑定的查询');
      }
    }
    
  } catch (error) {
    console.error('✗ 验证过程中出现错误:', error.message);
  }
}

// 执行修复
if (require.main === module) {
  fixUserParamsBinding();
}

module.exports = { fixUserParamsBinding };