const mysql = require('mysql2/promise');
const config = require('./config/database');

async function createSystemNoticesTable() {
  let connection;
  
  try {
    console.log('🔧 创建system_notices表...');
    
    // 创建连接
    connection = await mysql.createConnection(config.database);
    console.log('✅ 数据库连接成功');
    
    // 创建system_notices表
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS system_notices (
        _id VARCHAR(36) PRIMARY KEY,
        title VARCHAR(200) NOT NULL COMMENT '公告标题',
        content TEXT COMMENT '公告内容',
        type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info' COMMENT '公告类型',
        priority INT DEFAULT 0 COMMENT '优先级，数字越大优先级越高',
        status ENUM('active', 'inactive', 'deleted') DEFAULT 'active' COMMENT '状态',
        startTime DATETIME COMMENT '生效开始时间',
        endTime DATETIME COMMENT '生效结束时间',
        targetUsers JSON COMMENT '目标用户，可以是用户ID数组或用户组',
        isSticky BOOLEAN DEFAULT FALSE COMMENT '是否置顶',
        viewCount INT DEFAULT 0 COMMENT '查看次数',
        publisherId VARCHAR(36) COMMENT '发布者ID',
        publishTime DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
        createTime DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updateTime DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_status (status),
        INDEX idx_type (type),
        INDEX idx_priority (priority),
        INDEX idx_publishTime (publishTime),
        INDEX idx_startTime (startTime),
        INDEX idx_endTime (endTime)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统公告表'
    `;
    
    await connection.execute(createTableSQL);
    console.log('✅ system_notices表创建成功');
    
    // 检查表结构
    console.log('\n📋 检查表结构...');
    const [columns] = await connection.execute('DESCRIBE system_notices');
    console.log('system_notices表字段:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });
    
    // 插入一些示例数据
    console.log('\n📋 插入示例数据...');
    const sampleNotices = [
      {
        _id: 'notice-001',
        title: '系统维护通知',
        content: '系统将于今晚22:00-24:00进行维护，期间可能影响正常使用，请提前做好准备。',
        type: 'warning',
        priority: 5,
        status: 'active',
        startTime: '2025-08-30 22:00:00',
        endTime: '2025-08-30 24:00:00',
        isSticky: true,
        publisherId: 'system'
      },
      {
        _id: 'notice-002',
        title: '新功能上线',
        content: '菜品管理功能已全新上线，支持菜品分类、图片上传、批量操作等新特性。',
        type: 'info',
        priority: 3,
        status: 'active',
        isSticky: false,
        publisherId: 'system'
      },
      {
        _id: 'notice-003',
        title: '使用指南更新',
        content: '系统使用指南已更新，新增了菜单管理、菜品选择等功能的详细说明。',
        type: 'info',
        priority: 2,
        status: 'active',
        isSticky: false,
        publisherId: 'system'
      }
    ];
    
    for (const notice of sampleNotices) {
      try {
        await connection.execute(`
          INSERT INTO system_notices (
            _id, title, content, type, priority, status, 
            startTime, endTime, isSticky, publisherId
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          notice._id,
          notice.title,
          notice.content,
          notice.type,
          notice.priority,
          notice.status,
          notice.startTime || null,
          notice.endTime || null,
          notice.isSticky ? 1 : 0,
          notice.publisherId
        ]);
        console.log(`✅ 插入公告: ${notice.title}`);
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          console.log(`⚠️ 公告已存在: ${notice.title}`);
        } else {
          console.log(`❌ 插入公告失败: ${notice.title}`, error.message);
        }
      }
    }
    
    // 验证数据插入
    console.log('\n📋 验证数据...');
    const [countResult] = await connection.execute('SELECT COUNT(*) as total FROM system_notices');
    console.log(`✅ 公告总数: ${countResult[0].total}`);
    
    const [sampleData] = await connection.execute('SELECT title, type, status FROM system_notices LIMIT 3');
    console.log('示例公告:');
    sampleData.forEach((notice, index) => {
      console.log(`  ${index + 1}. ${notice.title} (${notice.type}) - ${notice.status}`);
    });
    
    console.log('\n🎉 system_notices表创建和初始化完成！');
    
  } catch (error) {
    console.error('❌ 创建表失败:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 数据库连接已关闭');
    }
  }
}

// 运行创建脚本
createSystemNoticesTable();
