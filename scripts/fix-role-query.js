const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

/**
 * 修复角色列表查询中的列名错误
 * 将 u.id 改为 u._id
 */
async function fixRoleQuery() {
  try {
    console.log('开始修复角色列表查询中的列名错误...');
    
    // 读取adminService.js文件
    const adminServicePath = path.join(__dirname, '../services/adminService.js');
    let content = await fs.readFile(adminServicePath, 'utf8');
    
    // 查找并替换SQL查询中的错误列名
    const searchRegex = /SELECT r\.\*, COUNT\(u\.id\) as user_count/;
    const replaceString = 'SELECT r.*, COUNT(u._id) as user_count';
    
    if (searchRegex.test(content)) {
      content = content.replace(searchRegex, replaceString);
      await fs.writeFile(adminServicePath, content, 'utf8');
      console.log('✓ 成功修复角色列表查询，已将 u.id 改为 u._id');
    } else {
      console.log('✓ 角色列表查询已经是正确的，无需修复');
    }
    
    // 验证修复结果
    await verifyFix();
    
  } catch (error) {
    console.error('✗ 修复过程中出现错误:', error.message);
    process.exit(1);
  }
}

/**
 * 验证修复结果
 */
async function verifyFix() {
  try {
    // 重新读取文件验证修复是否成功
    const adminServicePath = path.join(__dirname, '../services/adminService.js');
    const content = await fs.readFile(adminServicePath, 'utf8');
    
    const isFixed = content.includes('COUNT(u._id) as user_count');
    
    if (isFixed) {
      console.log('✓ 修复验证成功！SQL查询已正确引用u._id');
      console.log('提示：修复完成后，您需要重启Node.js服务以使更改生效。');
      console.log('可以使用以下命令重启服务：');
      console.log('1. ps aux | grep node');
      console.log('2. kill [进程ID]');
      console.log('3. npm run dev 或 npm start');
    } else {
      console.error('✗ 修复验证失败！SQL查询仍然引用错误的列名');
    }
    
  } catch (error) {
    console.error('✗ 验证过程中出现错误:', error.message);
  }
}

// 执行修复
fixRoleQuery();