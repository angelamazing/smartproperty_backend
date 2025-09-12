const config = {
  database: {
    host: 'mysql-demo-mysql.ns-gpaauglf.svc',
    port: 3306,
    user: 'root',
    password: '54bxhv99',
    database: 'smart_property',
    charset: 'utf8mb4',
    timezone: '+08:00',
    connectionLimit: 20,
    multipleStatements: false,
    // 连接池优化配置
    queueLimit: 0,
    waitForConnections: true,
    // 连接超时设置
    connectTimeout: 10000,
    // 空闲超时设置
    idleTimeout: 300000
  },
  
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'smart-property-jwt-secret-key-2024',
    expiresIn: '7d'
  },
  
  // 微信小程序配置
  wechat: {
    appId: process.env.WECHAT_APP_ID || '',
    appSecret: process.env.WECHAT_APP_SECRET || '',
    apiUrl: 'https://api.weixin.qq.com'
  },
  
  // 短信验证码配置
  sms: {
    // 这里可以配置短信服务商的相关信息
    provider: 'test', // 开发环境使用测试模式
    apiKey: process.env.SMS_API_KEY || '',
    apiSecret: process.env.SMS_API_SECRET || ''
  },
  
  // Redis配置（可选，用于缓存）
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: 0
  },
  
  // 服务配置
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  
  // 业务配置
  business: {
    // 验证码有效期（分钟）
    verificationCodeExpiry: 5,
    // 验证码发送间隔（分钟）
    verificationCodeInterval: 1,
    // Token有效期（天）
    tokenExpiry: 7,
    // 特殊预约提前时间（小时）
    specialReservationAdvanceHours: 24,
    // 用餐人数限制
    maxDiningPeople: 20,
    // 分页默认大小
    defaultPageSize: 20,
    // 最大分页大小
    maxPageSize: 100
  },
  
  // 测试登录配置
  testLogin: {
    enabled: true, // 临时强制启用，用于开发调试
    adminRole: 'dept_admin',
    sysAdminRole: 'sys_admin',
    tokenExpireTime: '24h'
  }
};

module.exports = config;
