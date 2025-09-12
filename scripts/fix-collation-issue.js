const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

/**
 * 修复字符集排序规则冲突问题
 * 在adminService.js中的JOIN操作添加排序规则指定
 */
async function fixCollationIssue() {
  try {
    console.log('开始修复字符集排序规则冲突问题...');
    
    // 读取adminService.js文件
    const adminServicePath = path.join(__dirname, '../services/adminService.js');
    let content = await fs.readFile(adminServicePath, 'utf8');
    
    // 查找并替换SQL查询中的JOIN条件，添加排序规则指定
    const searchRegex = /LEFT JOIN users u ON r\.name = u\.role/;
    const replaceString = 'LEFT JOIN users u ON r.name COLLATE utf8mb4_unicode_ci = u.role COLLATE utf8mb4_unicode_ci';
    
    if (searchRegex.test(content)) {
      content = content.replace(searchRegex, replaceString);
      await fs.writeFile(adminServicePath, content, 'utf8');
      console.log('✓ 成功修复字符集排序规则冲突，已在JOIN条件中添加排序规则指定');
    } else {
      console.log('✓ 字符集排序规则已经是正确的，无需修复');
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
    
    const isFixed = content.includes('r.name COLLATE utf8mb4_unicode_ci = u.role COLLATE utf8mb4_unicode_ci');
    
    if (isFixed) {
      console.log('✓ 修复验证成功！SQL查询已添加正确的排序规则指定');
      console.log('提示：修复完成后，您需要重启Node.js服务以使更改生效。');
      console.log('可以使用以下命令重启服务：');
      console.log('1. ps aux | grep node');
      console.log('2. kill [进程ID]');
      console.log('3. npm run dev 或 npm start');
    } else {
      console.error('✗ 修复验证失败！SQL查询仍然缺少排序规则指定');
    }
    
  } catch (error) {
    console.error('✗ 验证过程中出现错误:', error.message);
  }
}

// 执行修复
fixCollationIssue();