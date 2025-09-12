const mysql = require('mysql2/promise');
const config = require('../config/database');

async function checkDepartmentUsers() {
  let connection;
  try {
    connection = await mysql.createConnection(config.database);
    
    console.log('检查部门管理员用户...');
    const [users] = await connection.execute(`
      SELECT u._id, u.nickName, u.phoneNumber, u.role, u.department, u.departmentId,
             d.name as departmentName
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d._id
      WHERE u.role = 'dept_admin'
      ORDER BY u.createTime
    `);
    
    console.log(`\n找到 ${users.length} 个部门管理员用户:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.nickName}`);
      console.log(`   手机号: ${user.phoneNumber}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   部门: ${user.department} (${user.departmentName})`);
      console.log(`   部门ID: ${user.departmentId}`);
      console.log('');
    });
    
    console.log('检查所有部门...');
    const [departments] = await connection.execute(`
      SELECT d._id, d.name, d.code, d.managerId,
             u.nickName as managerName
      FROM departments d
      LEFT JOIN users u ON d.managerId = u._id
      ORDER BY d.createTime
    `);
    
    console.log(`\n找到 ${departments.length} 个部门:`);
    departments.forEach((dept, index) => {
      console.log(`${index + 1}. ${dept.name} (${dept.code})`);
      console.log(`   管理员: ${dept.managerName || '未设置'}`);
      console.log(`   管理员ID: ${dept.managerId || '未设置'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDepartmentUsers();
