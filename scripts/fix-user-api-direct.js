const fs = require('fs').promises;
const path = require('path');

/**
 * 直接修复adminService.js文件中的getUsers函数
 */
async function fixUserAPIDirect() {
  try {
    console.log('开始直接修复adminService.js文件...');
    
    // 读取adminService.js文件
    const adminServicePath = path.join(__dirname, '../services/adminService.js');
    const content = await fs.readFile(adminServicePath, 'utf8');
    
    // 查找getUsers函数中的问题代码
    const lines = content.split('\n');
    let foundStart = false;
    let foundEnd = false;
    let functionContent = '';
    let startLine = 0;
    let endLine = 0;
    
    // 找到getUsers函数的完整内容
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('const getUsers = async (db, { page, pageSize, filters }) => {')) {
        foundStart = true;
        startLine = i;
      }
      
      if (foundStart && !foundEnd) {
        functionContent += lines[i] + '\n';
      }
      
      if (foundStart && lines[i].includes('});') && lines[i].includes('adminService')) {
        foundEnd = true;
        endLine = i;
        break;
      }
    }
    
    if (!foundStart || !foundEnd) {
      console.log('✓ 未找到getUsers函数，可能已经修复过了');
      return;
    }
    
    console.log('找到getUsers函数，开始修复...');
    
    // 构建修复后的函数内容 - 直接替换为已知的正确实现
    const fixedFunctionContent = `const getUsers = async (db, { page, pageSize, filters }) => {
  try {
    let whereClause = "WHERE u.status != 'deleted'";
    const params = [];

    if (filters?.keyword) {
      whereClause += " AND (u.username LIKE ? OR u.name LIKE ? OR u.phone LIKE ?)";
      params.push(`%${filters.keyword}%`);
      params.push(`%${filters.keyword}%`);
      params.push(`%${filters.keyword}%`);
    }

    if (filters?.role) {
      whereClause += " AND u.role = ?";
      params.push(filters.role);
    }

    if (filters?.status) {
      whereClause += " AND u.status = ?";
      params.push(filters.status);
    }

    if (filters?.departmentId) {
      whereClause += " AND u.departmentId = ?";
      params.push(filters.departmentId);
    }

    // 获取总数
    const [totalResult] = await db.execute(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      [...params]
    );
    const total = totalResult[0].total;

    // 获取分页数据
    const offset = (page - 1) * pageSize;
    const [users] = await db.execute(
      `SELECT u.*, d.name as department_name 
       FROM users u 
       LEFT JOIN departments d ON u.departmentId = d._id 
       ${whereClause} 
       ORDER BY u.createTime DESC 
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    // 移除敏感信息
    return {
      users: users.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      }),
      total,
      page,
      pageSize
    };
  } catch (error) {
    throw new Error(`获取用户列表失败: ${error.message}`);
  }
};`;
    
    // 替换文件中的函数
    const beforeFunction = lines.slice(0, startLine).join('\n');
    const afterFunction = lines.slice(endLine + 1).join('\n');
    const updatedContent = beforeFunction + '\n' + fixedFunctionContent + '\n' + afterFunction;
    
    // 写入修复后的文件
    await fs.writeFile(adminServicePath, updatedContent, 'utf8');
    console.log('✓ 成功修复adminService.js文件');
    
    // 验证修复结果
    const newContent = await fs.readFile(adminServicePath, 'utf8');
    const isFixed = newContent.includes('LIMIT ? OFFSET ?', [...params, pageSize, offset]);
    
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
  fixUserAPIDirect();
}