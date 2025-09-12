const fs = require('fs').promises;
const path = require('path');

/**
 * 修复用户列表查询中的ORDER BY列名问题
 */
async function fixUserOrderBy() {
  try {
    console.log('开始修复用户列表查询中的ORDER BY列名问题...');
    
    const adminServicePath = path.join(__dirname, '../services/adminService.js');
    let content = await fs.readFile(adminServicePath, 'utf8');
    
    // 查找并替换错误的ORDER BY子句
    const searchRegex = /ORDER BY u\.create_time/g;
    const replaceString = 'ORDER BY u.createTime';
    
    if (searchRegex.test(content)) {
      const updatedContent = content.replace(searchRegex, replaceString);
      await fs.writeFile(adminServicePath, updatedContent, 'utf8');
      console.log('✓ 成功修复adminService.js中的ORDER BY子句');
    } else {
      console.log('✓ adminService.js中的ORDER BY子句已经是正确的，无需修复');
    }
    
    // 验证修复结果
    await verifyFix(adminServicePath);
    
    // 同时更新测试脚本
    const testScriptPath = path.join(__dirname, '../scripts/test-user-query.js');
    try {
      let testContent = await fs.readFile(testScriptPath, 'utf8');
      const testUpdatedContent = testContent.replace(searchRegex, replaceString);
      if (testUpdatedContent !== testContent) {
        await fs.writeFile(testScriptPath, testUpdatedContent, 'utf8');
        console.log('✓ 成功修复test-user-query.js中的ORDER BY子句');
      }
    } catch (err) {
      console.log('✓ 测试脚本修复失败或不存在，可忽略');
    }
    
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
    const hasCorrectOrderBy = content.includes('ORDER BY u.createTime');
    const hasIncorrectOrderBy = content.includes('ORDER BY u.create_time');
    
    if (hasCorrectOrderBy && !hasIncorrectOrderBy) {
      console.log('✓ 修复验证成功！所有ORDER BY子句都使用了正确的列名');
    } else {
      console.log('✗ 修复验证不完全成功！');
      if (hasCorrectOrderBy) {
        console.log('- 至少存在一个使用正确列名的ORDER BY子句');
      }
      if (hasIncorrectOrderBy) {
        console.log('- 仍存在使用错误列名的ORDER BY子句');
      }
    }
    
  } catch (error) {
    console.error('✗ 验证过程中出现错误:', error.message);
  }
}

// 执行修复
if (require.main === module) {
  fixUserOrderBy();
}

module.exports = { fixUserOrderBy };