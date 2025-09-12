const mysql = require('mysql2/promise');
const config = require('./config/database');
const logger = require('./utils/logger');

/**
 * 调试用户ID问题
 */

// 提取数据库配置
const dbConfig = config.database;

async function debugUserId() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    logger.info('开始调试用户ID问题...');

    // 1. 检查特定用户的数据库记录
    const userId = '12e4db1e-8ff5-4c68-a7ed-8e239885f401'; // 部门管理员测试的ID
    
    logger.info(`查询用户ID: ${userId}`);
    logger.info(`用户ID类型: ${typeof userId}`);
    
    const [userRows] = await connection.execute(`
      SELECT u._id, u.departmentId, u.role, d.name as departmentName
      FROM users u
      LEFT JOIN departments d ON u.departmentId = d._id
      WHERE u._id = ? AND u.status = 'active'
    `, [userId]);

    logger.info(`查询结果数量: ${userRows.length}`);
    
    if (userRows.length > 0) {
      const user = userRows[0];
      logger.info('查询到的用户信息:');
      logger.info({
        _id: user._id,
        departmentId: user.departmentId,
        role: user.role,
        departmentName: user.departmentName
      });
      
      // 检查departmentId的类型和值
      logger.info(`departmentId类型: ${typeof user.departmentId}`);
      logger.info(`departmentId是否为null: ${user.departmentId === null}`);
      logger.info(`departmentId是否为undefined: ${user.departmentId === undefined}`);
      logger.info(`departmentId值: ${user.departmentId}`);
      
      // 测试第二个查询
      if (user.departmentId) {
        logger.info('测试第二个查询...');
        const [memberRows] = await connection.execute(`
          SELECT 
            u._id, u.nickName, u.avatarUrl, u.role, u.status, 
            u.phoneNumber, u.email
          FROM users u
          WHERE u.departmentId = ? AND u.status = ?
          ORDER BY u.role DESC, u.nickName
        `, [user.departmentId, 'active']);
        
        logger.info(`部门成员数量: ${memberRows.length}`);
        memberRows.forEach(member => {
          logger.info(`- ${member.nickName} (${member.role})`);
        });
      }
    } else {
      logger.error('未找到用户');
    }

  } catch (error) {
    logger.error('调试失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    await debugUserId();
  } catch (error) {
    logger.error('调试失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  debugUserId
};
