const fs = require('fs').promises;
const path = require('path');

/**
 * 修复createTime列名为create_time的问题
 */
async function fixCreateTimeColumn() {
  try {
    console.log('开始修复createTime列名问题...');
    
    // 修复adminService.js文件
    await fixFile(path.join(__dirname, '../services/adminService.js'));
    
    // 修复test-role-fix.js文件
    await fixFile(path.join(__dirname, '../scripts/test-role-fix.js'));
    
    console.log('\n✓ 所有文件修复完成！');
    console.log('提示：修复完成后，您需要重启Node.js服务以使更改生效。');
    console.log('可以使用以下命令重启服务：');
    console.log('1. ps aux | grep node');
    console.log('2. kill [进程ID]');
    console.log('3. npm run dev 或 npm start');
    
  } catch (error) {
    console.error('✗ 修复过程中出现错误:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  }
}

/**
 * 修复单个文件中的createTime引用
 */
async function fixFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    
    // 替换order by中的createTime为create_time
    const updatedContent = content.replace(/ORDER BY r\.createTime/g, 'ORDER BY r.create_time');
    
    if (updatedContent !== content) {
      await fs.writeFile(filePath, updatedContent, 'utf8');
      console.log(`✓ 已修复文件: ${filePath}`);
    } else {
      console.log(`✓ 文件已正确: ${filePath}`);
    }
    
  } catch (error) {
    console.error(`✗ 修复文件 ${filePath} 时出错:`, error.message);
    throw error;
  }
}

// 执行修复
fixCreateTimeColumn();