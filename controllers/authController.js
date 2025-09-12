const authService = require('../services/authService');
const response = require('../utils/response');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const config = require('../config/database');

/**
 * 认证控制器
 */
class AuthController {
  /**
   * 微信授权登录
   */
  async wechatLogin(req, res) {
    try {
      const { code, userInfo } = req.body;
      
      const result = await authService.wechatLogin(code, userInfo, req.db);
      
      logger.info(`微信登录成功: ${result.userInfo.nickName} (${result.userInfo._id})`);
      
      return response.success(res, {
        token: result.token,
        userInfo: result.userInfo
      }, '登录成功');
    } catch (error) {
      logger.error('微信登录失败:', error);
      
      if (error.message.includes('微信登录失败')) {
        return response.error(res, '微信登录失败，请检查网络连接后重试', error.message);
      }
      
      return response.serverError(res, '微信登录失败', error.message);
    }
  }
  
  /**
   * 手机号验证码登录
   */
  async phoneLogin(req, res) {
    try {
      const { phoneNumber, verificationCode } = req.body;
      
      const result = await authService.phoneLogin(phoneNumber, verificationCode, req.db);
      
      logger.info(`手机号登录成功: ${phoneNumber} (${result.userInfo._id})`);
      
      return response.success(res, {
        token: result.token,
        userInfo: result.userInfo
      }, '登录成功');
    } catch (error) {
      logger.error('手机号登录失败:', error);
      
      if (error.message.includes('验证码')) {
        return response.error(res, error.message, null, 400);
      }
      
      return response.serverError(res, '手机号登录失败', error.message);
    }
  }
  
  /**
   * 手机号密码登录
   */
  async phonePasswordLogin(req, res) {
    try {
      const { phoneNumber, password } = req.body;
      
      const result = await authService.phonePasswordLogin(phoneNumber, password, req.db);
      
      logger.info(`手机号密码登录成功: ${phoneNumber} (${result.userInfo._id})`);
      
      return response.success(res, {
        token: result.token,
        userInfo: result.userInfo
      }, '登录成功');
    } catch (error) {
      logger.error('手机号密码登录失败:', error);
      
      if (error.message.includes('用户不存在') || error.message.includes('密码错误')) {
        return response.error(res, error.message, null, 401);
      }
      
      return response.serverError(res, '手机号密码登录失败', error.message);
    }
  }

  /**
   * 发送验证码
   */
  async sendVerificationCode(req, res) {
    try {
      const { phoneNumber } = req.body;
      
      const result = await authService.sendVerificationCode(phoneNumber, req.db);
      
      logger.info(`验证码发送成功: ${phoneNumber}`);
      
      const responseData = {
        message: '验证码发送成功'
      };
      
      // 开发环境返回验证码
      if (result.code) {
        responseData.code = result.code;
      }
      
      return response.success(res, responseData, '验证码发送成功');
    } catch (error) {
      logger.error('发送验证码失败:', error);
      
      if (error.message.includes('频繁')) {
        return response.error(res, error.message, null, 429);
      }
      
      return response.serverError(res, '发送验证码失败', error.message);
    }
  }
  
  /**
   * Token验证
   */
  async validateToken(req, res) {
    try {
      const { token } = req.body;
      
      const result = await authService.validateToken(token, req.db);
      
      if (result.isValid) {
        logger.info(`Token验证成功: ${result.userInfo._id}`);
        return response.success(res, {
          isValid: true,
          userInfo: result.userInfo
        }, 'Token验证成功');
      } else {
        logger.warn(`Token验证失败: ${result.message}`);
        return response.error(res, result.message, null, 401);
      }
    } catch (error) {
      logger.error('Token验证失败:', error);
      return response.serverError(res, 'Token验证失败', error.message);
    }
  }
  
  /**
   * 测试登录
   */
  async testLogin(req, res) {
    try {
      const result = await authService.testLogin(req.db);
      
      logger.info(`测试登录成功: ${result.userInfo._id}`);
      
      return response.success(res, result, '测试登录成功');
    } catch (error) {
      logger.error('测试登录失败:', error);
      
      if (error.message.includes('生产环境')) {
        return response.error(res, '生产环境不支持测试登录', null, 403);
      }
      
      return response.serverError(res, '测试登录失败', error.message);
    }
  }
  
  /**
   * 部门管理员测试登录
   */
  async testLoginAdmin(req, res) {
    try {
      const result = await authService.testLoginAdmin(req.db);
      
      logger.info(`部门管理员测试登录成功: ${result.userInfo._id}`);
      
      return response.success(res, result, '部门管理员测试登录成功');
    } catch (error) {
      logger.error('部门管理员测试登录失败:', error);
      
      if (error.message.includes('生产环境')) {
        return response.error(res, '生产环境不支持测试登录', null, 403);
      }
      
      return response.serverError(res, '部门管理员测试登录失败', error.message);
    }
  }
  
  /**
   * 系统管理员测试登录
   */
  async testLoginSysAdmin(req, res) {
    try {
      const result = await authService.testLoginSysAdmin(req.db);
      
      logger.info(`系统管理员测试登录成功: ${result.userInfo._id}`);
      
      return response.success(res, result, '系统管理员测试登录成功');
    } catch (error) {
      logger.error('系统管理员测试登录失败:', error);
      
      if (error.message.includes('生产环境')) {
        return response.error(res, '生产环境不支持测试登录', null, 403);
      }
      
      return response.serverError(res, '系统管理员测试登录失败', error.message);
    }
  }

  /**
   * 指定部门的部门管理员测试登录
   */
  async testLoginDeptAdmin(req, res) {
    try {
      const { departmentCode } = req.body;
      
      if (!departmentCode) {
        return response.error(res, '部门代码不能为空', null, 400);
      }
      
      const result = await authService.testLoginDeptAdmin(departmentCode, req.db);
      
      logger.info(`部门管理员测试登录成功: ${result.userInfo._id} (${result.userInfo.department})`);
      
      return response.success(res, result, `${result.userInfo.department}管理员测试登录成功`);
    } catch (error) {
      logger.error('部门管理员测试登录失败:', error);
      
      if (error.message.includes('生产环境')) {
        return response.error(res, '生产环境不支持测试登录', null, 403);
      }
      
      if (error.message.includes('不存在') || error.message.includes('没有部门管理员')) {
        return response.error(res, error.message, null, 400);
      }
      
      return response.serverError(res, '部门管理员测试登录失败', error.message);
    }
  }
  
  /**
   * 用户登出
   */
  async logout(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token) {
        // 将Token标记为过期
        await req.db.execute(
          'UPDATE user_tokens SET expireTime = NOW() WHERE token = ?',
          [token]
        );
        
        logger.info(`用户登出成功: ${req.user ? req.user.id : 'unknown'}`);
      }
      
      return response.success(res, null, '登出成功');
    } catch (error) {
      logger.error('用户登出失败:', error);
      return response.serverError(res, '登出失败', error.message);
    }
  }
  
  /**
   * 刷新Token
   */
  async refreshToken(req, res) {
    try {
      const authHeader = req.headers['authorization'];
      const oldToken = authHeader && authHeader.split(' ')[1];
      
      if (!oldToken) {
        return response.error(res, '缺少访问令牌', null, 400);
      }
      
      // 验证旧Token
      const validation = await authService.validateToken(oldToken, req.db);
      
      if (!validation.isValid) {
        return response.error(res, validation.message, null, 401);
      }
      
      // 获取用户信息
      const [userRows] = await req.db.execute(
        'SELECT * FROM users WHERE _id = ?',
        [validation.userInfo._id]
      );
      
      if (userRows.length === 0) {
        return response.error(res, '用户不存在', null, 404);
      }
      
      const user = userRows[0];
      
      // 生成新Token
      const tokenId = uuidv4();
      const payload = {
        tokenId,
        userId: user._id,
        openid: user.openid,
        phoneNumber: user.phoneNumber,
        isTestUser: user.isTestUser || false
      };
      
      const newToken = jwt.sign(payload, config.jwt.secret, {
        expiresIn: config.jwt.expiresIn
      });
      
      // 保存Token到数据库
      const expireTime = moment().tz('Asia/Shanghai').add(config.business.tokenExpiry, 'days').format('YYYY-MM-DD HH:mm:ss');
      
      await req.db.execute(
        `INSERT INTO user_tokens (_id, userId, openid, phoneNumber, token, createTime, expireTime, lastUsedTime, isTestToken)
         VALUES (?, ?, ?, ?, ?, NOW(), ?, NOW(), ?)`,
        [tokenId, user._id, user.openid, user.phoneNumber, newToken, expireTime, user.isTestUser || false]
      );
      
      // 使旧Token失效
      await req.db.execute(
        'UPDATE user_tokens SET expireTime = NOW() WHERE token = ?',
        [oldToken]
      );
      
      logger.info(`Token刷新成功: ${user._id}`);
      
      return response.success(res, {
        token: newToken,
        userInfo: {
          _id: user._id,
          nickName: user.nickName,
          avatarUrl: user.avatarUrl,
          phoneNumber: user.phoneNumber,
          role: user.role,
          status: user.status,
          department: user.department
        }
      }, 'Token刷新成功');
    } catch (error) {
      logger.error('Token刷新失败:', error);
      return response.serverError(res, 'Token刷新失败', error.message);
    }
  }
}

module.exports = new AuthController();
