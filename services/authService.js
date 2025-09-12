const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const axios = require('axios');
const moment = require('moment');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/database');
const logger = require('../utils/logger');

/**
 * 认证服务类
 */
class AuthService {
  /**
   * 微信登录
   * @param {string} code - 微信登录凭证
   * @param {Object} userInfo - 用户信息
   * @param {Object} db - 数据库连接
   */
  async wechatLogin(code, userInfo, db) {
    try {
      // 1. 调用微信API获取openid和session_key
      const wechatResponse = await this.getWechatOpenId(code);
      
      if (!wechatResponse.openid) {
        throw new Error('微信登录失败：无法获取用户标识');
      }
      
      const { openid, unionid, session_key } = wechatResponse;
      
      // 2. 查找或创建用户
      let user = await this.findOrCreateWechatUser(openid, unionid, userInfo, db);
      
      // 3. 生成Token
      const token = await this.generateToken(user._id, openid, null, false, db);
      
      // 4. 更新最后登录时间
      await db.execute(
        'UPDATE users SET lastLoginTime = NOW() WHERE _id = ?',
        [user._id]
      );
      
      return {
        token,
        userInfo: {
          _id: user._id,
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          role: user.role,
          status: user.status,
          department: user.department
        }
      };
    } catch (error) {
      logger.error('微信登录失败:', error);
      throw error;
    }
  }
  
  /**
   * 手机号登录
   * @param {string} phoneNumber - 手机号
   * @param {string} verificationCode - 验证码
   * @param {Object} db - 数据库连接
   */
  async phoneLogin(phoneNumber, verificationCode, db) {
    try {
      // 1. 验证验证码
      const isValidCode = await this.validateVerificationCode(phoneNumber, verificationCode, db);
      if (!isValidCode) {
        throw new Error('验证码错误或已过期');
      }
      
      // 2. 查找或创建用户
      let user = await this.findOrCreatePhoneUser(phoneNumber, db);
      
      // 3. 生成Token
      const token = await this.generateToken(user._id, null, phoneNumber, false, db);
      
      // 4. 标记验证码为已使用
      await this.markVerificationCodeUsed(phoneNumber, verificationCode, db);
      
      // 5. 更新最后登录时间
      await db.execute(
        'UPDATE users SET lastLoginTime = NOW() WHERE _id = ?',
        [user._id]
      );
      
      return {
        token,
        userInfo: {
          _id: user._id,
          nickName: user.nickName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          status: user.status,
          department: user.department
        }
      };
    } catch (error) {
      logger.error('手机号登录失败:', error);
      throw error;
    }
  }
  
  /**
   * 手机号密码登录
   * @param {string} phoneNumber - 手机号
   * @param {string} password - 密码
   * @param {Object} db - 数据库连接
   */
  async phonePasswordLogin(phoneNumber, password, db) {
    try {
      // 1. 查找用户
      const [userRows] = await db.execute(
        'SELECT _id, nickName, phoneNumber, password, role, status, department FROM users WHERE phoneNumber = ? AND status = "active"',
        [phoneNumber]
      );
      
      if (userRows.length === 0) {
        throw new Error('用户不存在或已被禁用');
      }
      
      const user = userRows[0];
      
      // 2. 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('密码错误');
      }
      
      // 3. 生成Token
      const token = await this.generateToken(user._id, null, phoneNumber, false, db);
      
      // 4. 更新最后登录时间
      await db.execute(
        'UPDATE users SET lastLoginTime = NOW() WHERE _id = ?',
        [user._id]
      );
      
      logger.info(`手机号密码登录成功: ${phoneNumber} (${user._id})`);
      
      return {
        token,
        userInfo: {
          _id: user._id,
          nickName: user.nickName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          status: user.status,
          department: user.department
        }
      };
    } catch (error) {
      logger.error('手机号密码登录失败:', error);
      throw error;
    }
  }

  /**
   * 发送验证码
   * @param {string} phoneNumber - 手机号
   * @param {Object} db - 数据库连接
   */
  async sendVerificationCode(phoneNumber, db) {
    try {
      // 1. 检查发送频率限制
      const canSend = await this.checkSendFrequency(phoneNumber, db);
      if (!canSend) {
        throw new Error('验证码发送过于频繁，请稍后再试');
      }
      
      // 2. 生成验证码
      const code = this.generateVerificationCode();
      
      // 3. 保存验证码到数据库
      await this.saveVerificationCode(phoneNumber, code, db);
      
      // 4. 发送短信（开发环境直接返回验证码）
      if (config.server.env === 'development') {
        logger.info(`开发环境验证码: ${phoneNumber} -> ${code}`);
        return { code }; // 开发环境返回验证码
      } else {
        await this.sendSMS(phoneNumber, code);
        return {}; // 生产环境不返回验证码
      }
    } catch (error) {
      logger.error('发送验证码失败:', error);
      throw error;
    }
  }
  
  /**
   * Token验证
   * @param {string} token - 用户Token
   * @param {Object} db - 数据库连接
   */
  async validateToken(token, db) {
    try {
      // 1. 验证JWT Token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // 2. 查询数据库中的Token记录
      const [tokenRows] = await db.execute(
        `SELECT ut.*, u.nickName, u.avatarUrl, u.phoneNumber, u.role, u.status, u.department
         FROM user_tokens ut 
         JOIN users u ON ut.userId = u._id 
         WHERE ut.token = ? AND ut.expireTime > NOW()`,
        [token]
      );
      
      if (tokenRows.length === 0) {
        return {
          isValid: false,
          message: 'Token无效或已过期'
        };
      }
      
      const tokenInfo = tokenRows[0];
      
      if (tokenInfo.status !== 'active') {
        return {
          isValid: false,
          message: '用户账号已被禁用'
        };
      }
      
      return {
        isValid: true,
        userInfo: {
          _id: tokenInfo.userId,
          nickName: tokenInfo.nickName,
          avatarUrl: tokenInfo.avatarUrl,
          phoneNumber: tokenInfo.phoneNumber,
          role: tokenInfo.role,
          status: tokenInfo.status,
          department: tokenInfo.department
        }
      };
    } catch (error) {
      logger.error('Token验证失败:', error);
      
      if (error.name === 'TokenExpiredError') {
        return {
          isValid: false,
          message: 'Token已过期'
        };
      } else if (error.name === 'JsonWebTokenError') {
        return {
          isValid: false,
          message: 'Token格式无效'
        };
      }
      
      throw error;
    }
  }
  
  /**
   * 测试登录
   * @param {Object} db - 数据库连接
   */
  async testLogin(db) {
    try {
      if (config.server.env === 'production') {
        throw new Error('生产环境不支持测试登录');
      }
      
      // 创建或获取测试用户
      const testUser = await this.getOrCreateTestUser(db);
      
      // 生成测试Token
      const token = await this.generateToken(testUser._id, null, null, true, db);
      
      return {
        token,
        userInfo: {
          _id: testUser._id,
          nickName: testUser.nickName,
          role: testUser.role,
          department: testUser.department,
          isTestUser: true
        },
        isTestLogin: true
      };
    } catch (error) {
      logger.error('测试登录失败:', error);
      throw error;
    }
  }
  
  /**
   * 部门管理员测试登录
   * @param {Object} db - 数据库连接
   */
  async testLoginAdmin(db) {
    try {
      if (config.server.env === 'production') {
        throw new Error('生产环境不支持测试登录');
      }
      
      // 创建或获取部门管理员测试用户
      const adminUser = await this.getOrCreateTestAdminUser(db);
      
      // 生成测试Token，有效期24小时
      const token = await this.generateTestToken(adminUser._id, true, db);
      
      return {
        token,
        userInfo: {
          _id: adminUser._id,
          nickName: adminUser.nickName,
          avatarUrl: adminUser.avatarUrl || 'https://via.placeholder.com/100x100?text=Admin',
          role: adminUser.role,
          department: adminUser.department,
          permissions: [
            'user.view',
            'dining.manage',
            'reservation.audit',
            'venue.manage'
          ],
          isTestUser: true,
          isAdminTest: true
        },
        isTestLogin: true
      };
    } catch (error) {
      logger.error('部门管理员测试登录失败:', error);
      throw error;
    }
  }
  
  /**
   * 系统管理员测试登录
   * @param {Object} db - 数据库连接
   */
  async testLoginSysAdmin(db) {
    try {
      if (config.server.env === 'production') {
        throw new Error('生产环境不支持测试登录');
      }
      
      // 创建或获取系统管理员测试用户
      const sysAdminUser = await this.getOrCreateTestSysAdminUser(db);
      
      // 生成测试Token，有效期24小时
      const token = await this.generateTestToken(sysAdminUser._id, true, db);
      
      return {
        token,
        userInfo: {
          _id: sysAdminUser._id,
          nickName: sysAdminUser.nickName,
          avatarUrl: sysAdminUser.avatarUrl || 'https://via.placeholder.com/100x100?text=SysAdmin',
          role: sysAdminUser.role,
          department: sysAdminUser.department,
          permissions: [
            'user.manage',
            'system.manage',
            'dining.manage',
            'reservation.manage',
            'venue.manage',
            'verification.manage'
          ],
          isTestUser: true,
          isSysAdminTest: true
        },
        isTestLogin: true
      };
    } catch (error) {
      logger.error('系统管理员测试登录失败:', error);
      throw error;
    }
  }

  /**
   * 指定部门的部门管理员测试登录
   * @param {string} departmentCode - 部门代码
   * @param {Object} db - 数据库连接
   */
  async testLoginDeptAdmin(departmentCode, db) {
    try {
      if (config.server.env === 'production') {
        throw new Error('生产环境不支持测试登录');
      }
      
      // 验证部门代码
      const [departments] = await db.execute(
        'SELECT _id, name, code FROM departments WHERE code = ?',
        [departmentCode]
      );
      
      if (departments.length === 0) {
        throw new Error(`部门代码 ${departmentCode} 不存在`);
      }
      
      const department = departments[0];
      
      // 查找该部门的部门管理员
      const [admins] = await db.execute(`
        SELECT u._id, u.nickName, u.avatarUrl, u.role, u.phoneNumber, d.name as departmentName
        FROM users u
        JOIN departments d ON u.departmentId = d._id
        WHERE u.role = 'dept_admin' AND d.code = ?
        LIMIT 1
      `, [departmentCode]);
      
      if (admins.length === 0) {
        throw new Error(`部门 ${department.name} 没有部门管理员`);
      }
      
      const adminUser = admins[0];
      
      // 生成测试Token，有效期24小时
      const token = await this.generateTestToken(adminUser._id, true, db);
      
      return {
        token,
        userInfo: {
          _id: adminUser._id,
          nickName: adminUser.nickName,
          avatarUrl: adminUser.avatarUrl || 'https://via.placeholder.com/100x100?text=DeptAdmin',
          role: adminUser.role,
          department: adminUser.departmentName,
          departmentCode: departmentCode,
          phoneNumber: adminUser.phoneNumber,
          permissions: [
            'user.view',
            'dining.manage',
            'reservation.audit',
            'venue.manage'
          ],
          isTestUser: true,
          isDeptAdminTest: true
        },
        isTestLogin: true
      };
    } catch (error) {
      logger.error('部门管理员测试登录失败:', error);
      throw error;
    }
  }

  // ==================== 私有方法 ====================
  
  /**
   * 调用微信API获取openid
   * @param {string} code - 微信登录凭证
   */
  async getWechatOpenId(code) {
    try {
      const url = `${config.wechat.apiUrl}/sns/jscode2session`;
      const params = {
        appid: config.wechat.appId,
        secret: config.wechat.appSecret,
        js_code: code,
        grant_type: 'authorization_code'
      };
      
      const response = await axios.get(url, { params });
      
      if (response.data.errcode) {
        throw new Error(`微信API错误: ${response.data.errmsg}`);
      }
      
      return response.data;
    } catch (error) {
      logger.error('调用微信API失败:', error);
      throw new Error('微信登录失败，请重试');
    }
  }
  
  /**
   * 查找或创建微信用户
   * @param {string} openid - 微信openid
   * @param {string} unionid - 微信unionid
   * @param {Object} userInfo - 用户信息
   * @param {Object} db - 数据库连接
   */
  async findOrCreateWechatUser(openid, unionid, userInfo, db) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // 先查找现有用户
      const [existingUsers] = await connection.execute(
        'SELECT * FROM users WHERE openid = ? OR (unionid IS NOT NULL AND unionid = ?)',
        [openid, unionid]
      );
      
      if (existingUsers.length > 0) {
        // 更新用户信息
        const user = existingUsers[0];
        await connection.execute(
          `UPDATE users SET 
           nickName = ?, avatarUrl = ?, gender = ?, country = ?, province = ?, city = ?, language = ?, updateTime = NOW()
           WHERE _id = ?`,
          [
            userInfo.nickName || user.nickName,
            userInfo.avatarUrl || user.avatarUrl,
            userInfo.gender !== undefined ? userInfo.gender : user.gender,
            userInfo.country || user.country,
            userInfo.province || user.province,
            userInfo.city || user.city,
            userInfo.language || user.language,
            user._id
          ]
        );
        
        await connection.commit();
        return { ...user, ...userInfo };
      }
      
      // 创建新用户
      const userId = uuidv4();
      await connection.execute(
        `INSERT INTO users (_id, openid, unionid, nickName, avatarUrl, gender, country, province, city, language, role, status, createTime, updateTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', 'active', NOW(), NOW())`,
        [
          userId,
          openid,
          unionid,
          userInfo.nickName,
          userInfo.avatarUrl,
          userInfo.gender || 0,
          userInfo.country || '',
          userInfo.province || '',
          userInfo.city || '',
          userInfo.language || 'zh_CN'
        ]
      );
      
      await connection.commit();
      
      return {
        _id: userId,
        openid,
        unionid,
        ...userInfo,
        role: 'user',
        status: 'active'
      };
    } catch (error) {
      await connection.rollback();
      logger.error('创建微信用户失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 查找或创建手机号用户
   * @param {string} phoneNumber - 手机号
   * @param {Object} db - 数据库连接
   */
  async findOrCreatePhoneUser(phoneNumber, db) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      
      // 先查找现有用户
      const [existingUsers] = await connection.execute(
        'SELECT * FROM users WHERE phoneNumber = ?',
        [phoneNumber]
      );
      
      if (existingUsers.length > 0) {
        await connection.commit();
        return existingUsers[0];
      }
      
      // 创建新用户
      const userId = uuidv4();
      const nickName = `用户${phoneNumber.slice(-4)}`;
      
      await connection.execute(
        `INSERT INTO users (_id, phoneNumber, nickName, role, status, createTime, updateTime)
         VALUES (?, ?, ?, 'user', 'active', NOW(), NOW())`,
        [userId, phoneNumber, nickName]
      );
      
      await connection.commit();
      
      return {
        _id: userId,
        phoneNumber,
        nickName,
        role: 'user',
        status: 'active'
      };
    } catch (error) {
      await connection.rollback();
      logger.error('创建手机号用户失败:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * 生成Token
   * @param {string} userId - 用户ID
   * @param {string} openid - 微信openid
   * @param {string} phoneNumber - 手机号
   * @param {boolean} isTestToken - 是否为测试Token
   * @param {Object} db - 数据库连接
   */
  async generateToken(userId, openid, phoneNumber, isTestToken, db) {
    const tokenId = uuidv4();
    const payload = {
      tokenId,
      userId,
      openid,
      phoneNumber,
      isTestToken
    };
    
    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });
    
    // 保存Token到数据库
    const expireTime = moment().tz('Asia/Shanghai').add(config.business.tokenExpiry, 'days').format('YYYY-MM-DD HH:mm:ss');
    
    await db.execute(
      `INSERT INTO user_tokens (_id, userId, openid, phoneNumber, token, createTime, expireTime, lastUsedTime, isTestToken)
       VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)`,
      [tokenId, userId, openid, phoneNumber, token, expireTime, isTestToken]
    );
    
    return token;
  }
  
  /**
   * 生成6位数字验证码
   */
  generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  /**
   * 检查验证码发送频率
   * @param {string} phoneNumber - 手机号
   * @param {Object} db - 数据库连接
   */
  async checkSendFrequency(phoneNumber, db) {
    const [recentCodes] = await db.execute(
      'SELECT createTime FROM verification_codes WHERE phoneNumber = ? AND createTime > DATE_SUB(NOW(), INTERVAL ? MINUTE)',
      [phoneNumber, config.business.verificationCodeInterval]
    );
    
    return recentCodes.length === 0;
  }
  
  /**
   * 保存验证码到数据库
   * @param {string} phoneNumber - 手机号
   * @param {string} code - 验证码
   * @param {Object} db - 数据库连接
   */
  async saveVerificationCode(phoneNumber, code, db) {
    const codeId = uuidv4();
    const expireTime = moment().tz('Asia/Shanghai').add(config.business.verificationCodeExpiry, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    
    await db.execute(
      `INSERT INTO verification_codes (_id, phoneNumber, code, status, createTime, expireTime)
       VALUES (?, ?, ?, 'unused', NOW(), ?)`,
      [codeId, phoneNumber, code, expireTime]
    );
  }
  
  /**
   * 验证验证码
   * @param {string} phoneNumber - 手机号
   * @param {string} code - 验证码
   * @param {Object} db - 数据库连接
   */
  async validateVerificationCode(phoneNumber, code, db) {
    const [codeRows] = await db.execute(
      'SELECT * FROM verification_codes WHERE phoneNumber = ? AND code = ? AND status = "unused" AND expireTime > NOW()',
      [phoneNumber, code]
    );
    
    return codeRows.length > 0;
  }
  
  /**
   * 标记验证码为已使用
   * @param {string} phoneNumber - 手机号
   * @param {string} code - 验证码
   * @param {Object} db - 数据库连接
   */
  async markVerificationCodeUsed(phoneNumber, code, db) {
    await db.execute(
      'UPDATE verification_codes SET status = "used", usedTime = NOW() WHERE phoneNumber = ? AND code = ? AND status = "unused"',
      [phoneNumber, code]
    );
  }
  
  /**
   * 发送短信验证码
   * @param {string} phoneNumber - 手机号
   * @param {string} code - 验证码
   */
  async sendSMS(phoneNumber, code) {
    // 这里集成具体的短信服务商API
    // 例如：阿里云短信、腾讯云短信等
    logger.info(`发送短信验证码: ${phoneNumber} -> ${code}`);
    
    // 模拟短信发送成功
    return true;
  }
  
  /**
   * 获取或创建测试用户
   * @param {Object} db - 数据库连接
   */
  async getOrCreateTestUser(db) {
    const [testUsers] = await db.execute(
      'SELECT * FROM users WHERE isTestUser = true LIMIT 1'
    );
    
    if (testUsers.length > 0) {
      return testUsers[0];
    }
    
    // 创建测试用户
    const userId = uuidv4();
    await db.execute(
      `INSERT INTO users (_id, nickName, role, department, status, isTestUser, createTime, updateTime)
       VALUES (?, '测试用户', 'user', '测试部门', 'active', true, NOW(), NOW())`,
      [userId]
    );
    
    return {
      _id: userId,
      nickName: '测试用户',
      role: 'user',
      department: '测试部门',
      status: 'active',
      isTestUser: true
    };
  }

  /**
   * 获取或创建部门管理员测试用户
   * @param {Object} db - 数据库连接
   */
  async getOrCreateTestAdminUser(db) {
    const [adminUsers] = await db.execute(
      'SELECT * FROM users WHERE isAdminTest = true LIMIT 1'
    );
    
    if (adminUsers.length > 0) {
      return adminUsers[0];
    }
    
    // 创建部门管理员测试用户
    const userId = uuidv4();
    await db.execute(
      `INSERT INTO users (_id, nickName, role, department, status, isAdminTest, createTime, updateTime)
       VALUES (?, '部门管理员', 'dept_admin', '测试部门', 'active', true, NOW(), NOW())`,
      [userId]
    );
    
    return {
      _id: userId,
      nickName: '部门管理员',
      role: 'dept_admin',
      department: '测试部门',
      status: 'active',
      isAdminTest: true
    };
  }

  /**
   * 获取或创建系统管理员测试用户
   * @param {Object} db - 数据库连接
   */
  async getOrCreateTestSysAdminUser(db) {
    const [sysAdminUsers] = await db.execute(
      'SELECT * FROM users WHERE isSysAdminTest = true LIMIT 1'
    );
    
    if (sysAdminUsers.length > 0) {
      return sysAdminUsers[0];
    }
    
    // 创建系统管理员测试用户
    const userId = uuidv4();
    await db.execute(
      `INSERT INTO users (_id, nickName, role, department, status, isSysAdminTest, createTime, updateTime)
       VALUES (?, '系统管理员', 'sys_admin', '测试部门', 'active', true, NOW(), NOW())`,
      [userId]
    );
    
    return {
      _id: userId,
      nickName: '系统管理员',
      role: 'sys_admin',
      department: '测试部门',
      status: 'active',
      isSysAdminTest: true
    };
  }

  /**
   * 生成测试Token
   * @param {string} userId - 用户ID
   * @param {boolean} isTestToken - 是否为测试Token
   * @param {Object} db - 数据库连接
   */
  async generateTestToken(userId, isTestToken, db) {
    const tokenId = uuidv4();
    const payload = {
      tokenId,
      userId,
      isTestToken
    };
    
    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: '24h' // 测试Token有效期24小时
    });
    
    // 保存Token到数据库
    const expireTime = moment().tz('Asia/Shanghai').add(24, 'hours').format('YYYY-MM-DD HH:mm:ss');
    
    await db.execute(
      `INSERT INTO user_tokens (_id, userId, token, createTime, expireTime, isTestToken)
       VALUES (?, ?, ?, NOW(), ?, ?)`,
      [tokenId, userId, token, expireTime, isTestToken]
    );
    
    return token;
  }
}

module.exports = new AuthService();
