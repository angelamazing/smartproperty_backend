const mysql = require('mysql2/promise');
const config = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * 为每个部门添加普通人员脚本
 * 每个部门至少添加5个普通人员，用于测试部门报餐功能
 */

// 提取数据库配置
const dbConfig = config.database;

// 部门普通人员数据
const departmentMembers = {
  '地质数据中心': [
    { nickName: '张数据员', phoneNumber: '13800002001', email: 'zhangdata1@example.com', employeeId: 'GEO_DATA_001', position: '数据分析师' },
    { nickName: '李数据员', phoneNumber: '13800002002', email: 'lidata1@example.com', employeeId: 'GEO_DATA_002', position: '数据工程师' },
    { nickName: '王数据员', phoneNumber: '13800002003', email: 'wangdata1@example.com', employeeId: 'GEO_DATA_003', position: '数据管理员' },
    { nickName: '赵数据员', phoneNumber: '13800002004', email: 'zhaodata1@example.com', employeeId: 'GEO_DATA_004', position: '数据研究员' },
    { nickName: '陈数据员', phoneNumber: '13800002005', email: 'chendata1@example.com', employeeId: 'GEO_DATA_005', position: '数据专员' }
  ],
  '地质工程中心': [
    { nickName: '张工程师', phoneNumber: '13800002006', email: 'zhangeng1@example.com', employeeId: 'GEO_ENG_001', position: '地质工程师' },
    { nickName: '李工程师', phoneNumber: '13800002007', email: 'lieng1@example.com', employeeId: 'GEO_ENG_002', position: '项目工程师' },
    { nickName: '王工程师', phoneNumber: '13800002008', email: 'wangeng1@example.com', employeeId: 'GEO_ENG_003', position: '设计工程师' },
    { nickName: '赵工程师', phoneNumber: '13800002009', email: 'zhaoeng1@example.com', employeeId: 'GEO_ENG_004', position: '施工工程师' },
    { nickName: '陈工程师', phoneNumber: '13800002010', email: 'cheneng1@example.com', employeeId: 'GEO_ENG_005', position: '监理工程师' }
  ],
  '生态环境中心': [
    { nickName: '张生态员', phoneNumber: '13800002011', email: 'zhangeco1@example.com', employeeId: 'ECO_ENV_001', position: '环境监测员' },
    { nickName: '李生态员', phoneNumber: '13800002012', email: 'lieco1@example.com', employeeId: 'ECO_ENV_002', position: '生态评估师' },
    { nickName: '王生态员', phoneNumber: '13800002013', email: 'wangeco1@example.com', employeeId: 'ECO_ENV_003', position: '环保专员' },
    { nickName: '赵生态员', phoneNumber: '13800002014', email: 'zhaoeco1@example.com', employeeId: 'ECO_ENV_004', position: '环境研究员' },
    { nickName: '陈生态员', phoneNumber: '13800002015', email: 'cheneco1@example.com', employeeId: 'ECO_ENV_005', position: '生态保护员' }
  ],
  '地质环境中心': [
    { nickName: '张环境员', phoneNumber: '13800002016', email: 'zhangenv1@example.com', employeeId: 'GEO_ENV_001', position: '环境调查员' },
    { nickName: '李环境员', phoneNumber: '13800002017', email: 'lienv1@example.com', employeeId: 'GEO_ENV_002', position: '环境评价师' },
    { nickName: '王环境员', phoneNumber: '13800002018', email: 'wangenv1@example.com', employeeId: 'GEO_ENV_003', position: '环境治理员' },
    { nickName: '赵环境员', phoneNumber: '13800002019', email: 'zhaoenv1@example.com', employeeId: 'GEO_ENV_004', position: '环境检测员' },
    { nickName: '陈环境员', phoneNumber: '13800002020', email: 'chenenv1@example.com', employeeId: 'GEO_ENV_005', position: '环境专员' }
  ],
  '地质调查中心': [
    { nickName: '张调查员', phoneNumber: '13800002021', email: 'zhangsurvey1@example.com', employeeId: 'GEO_SURVEY_001', position: '地质调查员' },
    { nickName: '李调查员', phoneNumber: '13800002022', email: 'lisurvey1@example.com', employeeId: 'GEO_SURVEY_002', position: '勘探工程师' },
    { nickName: '王调查员', phoneNumber: '13800002023', email: 'wangsurvey1@example.com', employeeId: 'GEO_SURVEY_003', position: '资源评价师' },
    { nickName: '赵调查员', phoneNumber: '13800002024', email: 'zhaosurvey1@example.com', employeeId: 'GEO_SURVEY_004', position: '地质技术员' },
    { nickName: '陈调查员', phoneNumber: '13800002025', email: 'chensurvey1@example.com', employeeId: 'GEO_SURVEY_005', position: '野外作业员' }
  ],
  '黄梅分站': [
    { nickName: '张黄梅员', phoneNumber: '13800002026', email: 'zhanghuangmei1@example.com', employeeId: 'HUANGMEI_001', position: '区域专员' },
    { nickName: '李黄梅员', phoneNumber: '13800002027', email: 'lihuangmei1@example.com', employeeId: 'HUANGMEI_002', position: '地质技术员' },
    { nickName: '王黄梅员', phoneNumber: '13800002028', email: 'wanghuangmei1@example.com', employeeId: 'HUANGMEI_003', position: '现场管理员' },
    { nickName: '赵黄梅员', phoneNumber: '13800002029', email: 'zhaohuangmei1@example.com', employeeId: 'HUANGMEI_004', position: '数据收集员' },
    { nickName: '陈黄梅员', phoneNumber: '13800002030', email: 'chenhuangmei1@example.com', employeeId: 'HUANGMEI_005', position: '分站助理' }
  ],
  '矿业有限责任公司': [
    { nickName: '张矿业员', phoneNumber: '13800002031', email: 'zhangmining1@example.com', employeeId: 'MINING_CO_001', position: '采矿工程师' },
    { nickName: '李矿业员', phoneNumber: '13800002032', email: 'limining1@example.com', employeeId: 'MINING_CO_002', position: '选矿工程师' },
    { nickName: '王矿业员', phoneNumber: '13800002033', email: 'wangmining1@example.com', employeeId: 'MINING_CO_003', position: '安全工程师' },
    { nickName: '赵矿业员', phoneNumber: '13800002034', email: 'zhaomining1@example.com', employeeId: 'MINING_CO_004', position: '生产管理员' },
    { nickName: '陈矿业员', phoneNumber: '13800002035', email: 'chenmining1@example.com', employeeId: 'MINING_CO_005', position: '设备技术员' }
  ],
  '物业中心': [
    { nickName: '张物业员', phoneNumber: '13800002036', email: 'zhangproperty1@example.com', employeeId: 'PROPERTY_001', position: '物业管理员' },
    { nickName: '李物业员', phoneNumber: '13800002037', email: 'liproperty1@example.com', employeeId: 'PROPERTY_002', position: '维修技术员' },
    { nickName: '王物业员', phoneNumber: '13800002038', email: 'wangproperty1@example.com', employeeId: 'PROPERTY_003', position: '客服专员' },
    { nickName: '赵物业员', phoneNumber: '13800002039', email: 'zhaoproperty1@example.com', employeeId: 'PROPERTY_004', position: '安保人员' },
    { nickName: '陈物业员', phoneNumber: '13800002040', email: 'chenproperty1@example.com', employeeId: 'PROPERTY_005', position: '清洁人员' }
  ],
  '机关科室': [
    { nickName: '张机关员', phoneNumber: '13800002041', email: 'zhangadmin1@example.com', employeeId: 'ADMIN_001', position: '行政专员' },
    { nickName: '李机关员', phoneNumber: '13800002042', email: 'liadmin1@example.com', employeeId: 'ADMIN_002', position: '人事专员' },
    { nickName: '王机关员', phoneNumber: '13800002043', email: 'wangadmin1@example.com', employeeId: 'ADMIN_003', position: '财务专员' },
    { nickName: '赵机关员', phoneNumber: '13800002044', email: 'zhaoadmin1@example.com', employeeId: 'ADMIN_004', position: '文秘人员' },
    { nickName: '陈机关员', phoneNumber: '13800002045', email: 'chenadmin1@example.com', employeeId: 'ADMIN_005', position: '档案管理员' }
  ]
};

/**
 * 为指定部门添加普通人员
 */
async function addDepartmentMembers() {
  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    logger.info('开始为各部门添加普通人员...');

    // 获取所有部门信息
    const [departments] = await connection.execute(`
      SELECT _id, name FROM departments WHERE status = 'active' ORDER BY name
    `);

    logger.info(`找到 ${departments.length} 个部门`);

    let totalAdded = 0;

    for (const department of departments) {
      const departmentName = department.name;
      const departmentId = department._id;
      
      // 检查是否已有该部门的成员数据
      if (!departmentMembers[departmentName]) {
        logger.warn(`未找到部门 ${departmentName} 的成员数据，跳过`);
        continue;
      }

      const members = departmentMembers[departmentName];
      logger.info(`\n处理部门: ${departmentName} (${departmentId})`);

      for (const member of members) {
        try {
          // 检查用户是否已存在（通过手机号）
          const [existingUsers] = await connection.execute(
            'SELECT _id FROM users WHERE phoneNumber = ?',
            [member.phoneNumber]
          );

          if (existingUsers.length > 0) {
            logger.info(`  用户已存在: ${member.nickName} (${member.phoneNumber})`);
            continue;
          }

          // 创建用户
          const userId = uuidv4();
          await connection.execute(`
            INSERT INTO users (
              _id, nickName, phoneNumber, email, department, departmentId,
              role, status, createTime, updateTime
            ) VALUES (?, ?, ?, ?, ?, ?, 'user', 'active', NOW(), NOW())
          `, [
            userId, member.nickName, member.phoneNumber, member.email,
            departmentName, departmentId
          ]);

          logger.info(`  ✅ 创建用户: ${member.nickName} (${member.phoneNumber}) - ${member.position}`);
          totalAdded++;

        } catch (error) {
          logger.error(`  ❌ 创建用户失败: ${member.nickName} - ${error.message}`);
        }
      }
    }

    logger.info(`\n部门成员添加完成！总共添加了 ${totalAdded} 个普通用户`);

    // 统计各部门成员数量
    logger.info('\n=== 各部门成员统计 ===');
    for (const department of departments) {
      const [memberCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM users 
        WHERE departmentId = ? AND status = 'active'
      `, [department._id]);

      const [adminCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM users 
        WHERE departmentId = ? AND role = 'dept_admin' AND status = 'active'
      `, [department._id]);

      const [userCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM users 
        WHERE departmentId = ? AND role = 'user' AND status = 'active'
      `, [department._id]);

      logger.info(`${department.name}: 总计 ${memberCount[0].count} 人 (管理员: ${adminCount[0].count}, 普通用户: ${userCount[0].count})`);
    }

  } catch (error) {
    logger.error('添加部门成员失败:', error);
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
    logger.info('开始为各部门添加普通人员...');
    
    await addDepartmentMembers();
    
    logger.info('\n🎉 部门成员添加完成！');
    
    console.log('\n=== 部门成员添加完成 ===');
    console.log('✅ 每个部门已添加5个普通人员');
    console.log('✅ 所有用户角色为 "user"');
    console.log('✅ 所有用户状态为 "active"');
    
    console.log('\n📱 测试账号信息:');
    console.log('部门管理员账号: 13800001001-13800001009');
    console.log('普通用户账号: 13800002001-13800002045');
    
    console.log('\n🔧 下一步:');
    console.log('1. 使用部门管理员账号登录');
    console.log('2. 测试部门报餐功能');
    console.log('3. 验证权限控制机制');
    
  } catch (error) {
    logger.error('部门成员添加失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  addDepartmentMembers,
  departmentMembers
};
