/**
 * 扫码就餐登记服务类
 * 处理二维码扫描、就餐登记、业务规则验证等核心逻辑
 */

const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const QRCode = require('qrcode');
const TimeUtils = require('../utils/timeUtils');

class QRScanService {
  /**
   * 根据扫码时间判断餐次类型
   * @param {Date} scanTime - 扫码时间
   * @returns {string} 餐次类型 (breakfast/lunch/dinner)
   */
  getMealTypeByTime(scanTime) {
    // 确保使用北京时间进行判断
    const beijingTime = moment(scanTime).tz('Asia/Shanghai');
    const hour = beijingTime.hour();
    
    // 早餐: 6:00-10:00
    if (hour >= 6 && hour < 10) {
      return 'breakfast';
    }
    // 午餐: 11:00-14:00
    else if (hour >= 11 && hour < 14) {
      return 'lunch';
    }
    // 晚餐: 17:00-20:00
    else if (hour >= 17 && hour < 20) {
      return 'dinner';
    }
    // 其他时间返回null，表示不在就餐时间内
    else {
      return null;
    }
  }

  /**
   * 验证二维码是否有效
   * @param {string} qrCode - 二维码标识
   * @param {Object} db - 数据库连接
   * @returns {Object} 二维码信息
   */
  async validateQRCode(qrCode, db) {
    try {
      const [rows] = await db.execute(
        'SELECT * FROM qr_codes WHERE code = ? AND status = "active"',
        [qrCode]
      );
      
      if (rows.length === 0) {
        throw new Error('二维码无效或已停用');
      }
      
      return rows[0];
    } catch (error) {
      throw new Error(`二维码验证失败: ${error.message}`);
    }
  }

  /**
   * 检查用户是否已报餐
   * @param {string} userId - 用户ID
   * @param {string} diningDate - 就餐日期
   * @param {string} mealType - 餐次类型
   * @param {Object} db - 数据库连接
   * @returns {Object|null} 报餐订单信息
   */
  async checkUserOrder(userId, diningDate, mealType, db) {
    try {
      const [rows] = await db.execute(`
        SELECT do._id, do.status, do.memberIds, do.memberNames, do.diningStatus
        FROM dining_orders do
        WHERE do.diningDate = ? 
          AND do.mealType = ? 
          AND do.status IN ('pending', 'confirmed')
          AND JSON_CONTAINS(do.memberIds, JSON_QUOTE(?))
      `, [diningDate, mealType, userId]);
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`检查用户报餐状态失败: ${error.message}`);
    }
  }

  /**
   * 检查用户是否已登记就餐
   * @param {string} userId - 用户ID
   * @param {string} diningDate - 就餐日期
   * @param {string} mealType - 餐次类型
   * @param {Object} db - 数据库连接
   * @returns {boolean} 是否已登记
   */
  async checkUserRegistration(userId, diningDate, mealType, db) {
    try {
      const [rows] = await db.execute(`
        SELECT _id FROM dining_registrations 
        WHERE userId = ? AND diningDate = ? AND mealType = ? AND status = 'success'
      `, [userId, diningDate, mealType]);
      
      return rows.length > 0;
    } catch (error) {
      throw new Error(`检查用户登记状态失败: ${error.message}`);
    }
  }

  /**
   * 执行扫码就餐登记
   * @param {string} userId - 用户ID
   * @param {string} qrCode - 二维码标识
   * @param {Date} scanTime - 扫码时间
   * @param {Object} db - 数据库连接
   * @returns {Object} 登记结果
   */
  async processQRScan(userId, qrCode, scanTime, db) {
    let connection;
    try {
      connection = await db.getConnection();
      await connection.beginTransaction();

      // 1. 验证二维码
      const qrCodeInfo = await this.validateQRCode(qrCode, connection);
      
      // 2. 使用服务器时间判断餐次（确保时间准确性）
      const serverTime = TimeUtils.getBeijingTime();
      const mealType = this.getMealTypeByTime(serverTime.toDate());
      if (!mealType) {
        throw new Error('当前时间不在就餐时间内');
      }
      
      // 使用服务器时间的日期
      const diningDate = serverTime.format('YYYY-MM-DD');
      
      // 3. 获取用户信息
      const [userRows] = await connection.execute(
        'SELECT _id, nickName, department, departmentId FROM users WHERE _id = ? AND status = "active"',
        [userId]
      );
      
      if (userRows.length === 0) {
        throw new Error('用户不存在或已被禁用');
      }
      
      const userInfo = userRows[0];
      
      // 4. 检查用户是否已登记
      const alreadyRegistered = await this.checkUserRegistration(userId, diningDate, mealType, connection);
      if (alreadyRegistered) {
        throw new Error('您已登记过本次就餐');
      }
      
      // 5. 检查用户是否已报餐
      const orderInfo = await this.checkUserOrder(userId, diningDate, mealType, connection);
      if (!orderInfo) {
        throw new Error('您尚未报餐，无法进行就餐登记');
      }
      
      // 6. 创建就餐登记记录
      const registrationId = uuidv4();
      // 使用服务器当前时间，确保时间准确性
      const utcScanTime = TimeUtils.getBeijingTime().utc().toDate();
      await connection.execute(`
        INSERT INTO dining_registrations 
        (_id, userId, userName, qrCodeId, qrCode, scanTime, mealType, diningDate, orderId, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'success')
      `, [
        registrationId,
        userId,
        userInfo.nickName,
        qrCodeInfo._id,
        qrCode,
        utcScanTime,
        mealType,
        diningDate,
        orderInfo._id
      ]);
      
      // 7. 更新报餐订单的就餐状态
      await connection.execute(`
        UPDATE dining_orders 
        SET diningStatus = 'dined', actualDiningTime = ?
        WHERE _id = ?
      `, [utcScanTime, orderInfo._id]);
      
      // 8. 创建确认就餐日志记录
      const confirmationLogId = uuidv4();
      await connection.execute(`
        INSERT INTO dining_confirmation_logs 
        (_id, orderId, userId, userName, confirmationType, confirmationTime, remark, confirmedBy)
        VALUES (?, ?, ?, ?, 'qr', ?, ?, ?)
      `, [
        confirmationLogId,
        orderInfo._id,
        userId,
        userInfo.nickName,
        utcScanTime,
        `扫码确认就餐 - 二维码: ${qrCode}`,
        userId
      ]);
      
      await connection.commit();
      
      // 9. 返回成功结果
      return {
        success: true,
        registrationId,
        message: `登记成功！[${this.getMealTypeName(mealType)}] ${beijingScanTime.format('YYYY-MM-DD HH:mm')}`,
        data: {
          userId,
          userName: userInfo.nickName,
          mealType,
          mealTypeName: this.getMealTypeName(mealType),
          diningDate,
          scanTime: beijingScanTime.format('YYYY-MM-DD HH:mm:ss'),
          qrCodeInfo: {
            name: qrCodeInfo.name,
            location: qrCodeInfo.location
          }
        }
      };
      
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      
      // 记录失败原因
      if (connection && userId && qrCode) {
        try {
          // 使用服务器时间记录失败日志
          const serverTime = TimeUtils.getBeijingTime();
          const mealType = this.getMealTypeByTime(serverTime.toDate());
          const diningDate = serverTime.format('YYYY-MM-DD');
          
          if (mealType) {
            await connection.execute(`
              INSERT INTO dining_registrations 
              (_id, userId, userName, qrCodeId, qrCode, scanTime, mealType, diningDate, status, failureReason)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'failed', ?)
            `, [
              uuidv4(),
              userId,
              'Unknown', // 如果用户信息获取失败
              'unknown',
              qrCode,
              scanTime,
              mealType,
              diningDate,
              error.message
            ]);
          }
        } catch (logError) {
          console.error('记录失败日志时出错:', logError);
        }
      }
      
      return {
        success: false,
        message: error.message,
        error: error.message
      };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * 获取餐次类型的中文名称
   * @param {string} mealType - 餐次类型
   * @returns {string} 中文名称
   */
  getMealTypeName(mealType) {
    const mealTypeNames = {
      'breakfast': '早餐',
      'lunch': '午餐',
      'dinner': '晚餐'
    };
    return mealTypeNames[mealType] || mealType;
  }

  /**
   * 获取用户就餐登记历史
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @param {Object} db - 数据库连接
   * @returns {Array} 登记历史记录
   */
  async getUserRegistrationHistory(userId, options = {}, db) {
    try {
      const { startDate, endDate, mealType, limit = 50, offset = 0 } = options;
      
      // 使用字符串拼接避免参数化查询的问题
      let sql = `
        SELECT dr.*, qc.name as qrCodeName, qc.location as qrCodeLocation
        FROM dining_registrations dr
        LEFT JOIN qr_codes qc ON dr.qrCodeId = qc._id
        WHERE dr.userId = '${userId}'
      `;
      
      if (startDate) {
        sql += ` AND dr.diningDate >= '${startDate}'`;
      }
      
      if (endDate) {
        sql += ` AND dr.diningDate <= '${endDate}'`;
      }
      
      if (mealType) {
        sql += ` AND dr.mealType = '${mealType}'`;
      }
      
      sql += ` ORDER BY dr.scanTime DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
      
      const [rows] = await db.execute(sql);
      
      return rows.map(row => ({
        ...row,
        mealTypeName: this.getMealTypeName(row.mealType),
        scanTimeFormatted: moment(row.scanTime).format('YYYY-MM-DD HH:mm:ss')
      }));
      
    } catch (error) {
      throw new Error(`获取用户登记历史失败: ${error.message}`);
    }
  }

  /**
   * 获取就餐统计信息（管理员功能）
   * @param {string} date - 统计日期
   * @param {Object} db - 数据库连接
   * @returns {Object} 统计信息
   */
  async getDiningStatistics(date, db) {
    try {
      const [rows] = await db.execute(`
        SELECT 
          mealType,
          COUNT(*) as totalRegistrations,
          COUNT(DISTINCT userId) as uniqueUsers
        FROM dining_registrations 
        WHERE diningDate = ? AND status = 'success'
        GROUP BY mealType
      `, [date]);
      
      const statistics = {
        date,
        breakfast: { registrations: 0, users: 0 },
        lunch: { registrations: 0, users: 0 },
        dinner: { registrations: 0, users: 0 },
        total: { registrations: 0, users: 0 }
      };
      
      rows.forEach(row => {
        statistics[row.mealType] = {
          registrations: row.totalRegistrations,
          users: row.uniqueUsers
        };
        statistics.total.registrations += row.totalRegistrations;
        statistics.total.users += row.uniqueUsers;
      });
      
      return statistics;
    } catch (error) {
      throw new Error(`获取就餐统计失败: ${error.message}`);
    }
  }

  /**
   * 创建新的二维码
   * @param {Object} qrData - 二维码数据
   * @param {Object} db - 数据库连接
   * @returns {Object} 创建结果
   */
  async createQRCode(qrData, db) {
    try {
      const { name, location, description } = qrData;
      
      // 生成唯一的二维码标识
      const code = `DINING_QR_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const qrId = uuidv4();
      
      await db.execute(`
        INSERT INTO qr_codes (_id, code, name, location, description, status)
        VALUES (?, ?, ?, ?, ?, 'active')
      `, [qrId, code, name, location, description]);
      
      return {
        success: true,
        qrId,
        code,
        message: '二维码创建成功'
      };
    } catch (error) {
      throw new Error(`创建二维码失败: ${error.message}`);
    }
  }

  /**
   * 获取二维码列表
   * @param {Object} options - 查询选项
   * @param {Object} db - 数据库连接
   * @returns {Array} 二维码列表
   */
  async getQRCodes(options = {}, db) {
    try {
      const { status, limit = 100, offset = 0 } = options;
      
      let sql = 'SELECT * FROM qr_codes';
      const params = [];
      
      if (status) {
        sql += ' WHERE status = ?';
        params.push(status);
      }
      
      sql += ' ORDER BY createTime DESC';
      
      // 使用字符串拼接避免参数化查询问题
      if (limit && limit > 0) {
        sql += ` LIMIT ${Number(limit)}`;
        if (offset && offset > 0) {
          sql += ` OFFSET ${Number(offset)}`;
        }
      }
      
      const [rows] = await db.execute(sql, params);
      
      return rows;
    } catch (error) {
      throw new Error(`获取二维码列表失败: ${error.message}`);
    }
  }

  /**
   * 生成二维码图片
   * @param {string} qrCodeString - 二维码字符串
   * @param {Object} options - 生成选项
   * @returns {string} 二维码图片的DataURL
   */
  async generateQRCodeImage(qrCodeString, options = {}) {
    try {
      const defaultOptions = {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeString, finalOptions);
      return qrCodeDataURL;
    } catch (error) {
      throw new Error(`生成二维码图片失败: ${error.message}`);
    }
  }

  /**
   * 生成包含接口URL的二维码图片
   * @param {string} qrCode - 二维码标识
   * @param {string} baseURL - 基础URL
   * @param {Object} options - 生成选项
   * @returns {string} 二维码图片的DataURL
   */
  async generateQRCodeWithURL(qrCode, baseURL = 'http://localhost:3000', options = {}) {
    try {
      // 生成包含接口URL的二维码内容
      const qrCodeString = `${baseURL}/api/qr-scan/scan?qrCode=${qrCode}`;
      
      const defaultOptions = {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeString, finalOptions);
      return qrCodeDataURL;
    } catch (error) {
      throw new Error(`生成二维码图片失败: ${error.message}`);
    }
  }

  /**
   * 生成安全二维码（包含时效性和验证码）
   * @param {string} qrCode - 二维码标识
   * @param {string} baseURL - 基础URL
   * @param {Object} options - 生成选项
   * @returns {Object} 包含二维码图片和安全信息
   */
  async generateSecureQRCode(qrCode, baseURL = 'http://localhost:3000', options = {}) {
    try {
      const crypto = require('crypto');
      
      // 生成安全令牌
      const secureToken = crypto.randomBytes(32).toString('hex');
      const timestamp = Date.now();
      const expiryTime = timestamp + (30 * 60 * 1000); // 30分钟有效期
      
      // 生成包含安全令牌的二维码内容
      const qrCodeString = `${baseURL}/api/qr-scan/scan-secure/${secureToken}`;
      
      const defaultOptions = {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      
      const qrCodeDataURL = await QRCode.toDataURL(qrCodeString, finalOptions);
      
      // 存储安全令牌信息到数据库
      const connection = await this.getConnection();
      await connection.execute(`
        INSERT INTO qr_secure_tokens (secureToken, qrCode, createdAt, expiresAt, isUsed)
        VALUES (?, ?, ?, ?, 0)
      `, [secureToken, qrCode, new Date(timestamp), new Date(expiryTime)]);
      
      return {
        qrCodeDataURL,
        secureToken,
        qrCode,
        expiresAt: new Date(expiryTime),
        qrCodeURL: qrCodeString
      };
    } catch (error) {
      throw new Error(`生成安全二维码失败: ${error.message}`);
    }
  }

  /**
   * 验证安全令牌
   * @param {string} secureToken - 安全令牌
   * @returns {Object} 验证结果
   */
  async validateSecureToken(secureToken) {
    try {
      const connection = await this.getConnection();
      
      // 查询安全令牌
      const [tokens] = await connection.execute(`
        SELECT * FROM qr_secure_tokens 
        WHERE secureToken = ? AND isUsed = 0 AND expiresAt > NOW()
      `, [secureToken]);
      
      if (tokens.length === 0) {
        return { valid: false, message: '安全令牌无效或已过期' };
      }
      
      const tokenInfo = tokens[0];
      
      // 标记令牌为已使用
      await connection.execute(`
        UPDATE qr_secure_tokens SET isUsed = 1, usedAt = NOW() 
        WHERE secureToken = ?
      `, [secureToken]);
      
      return { 
        valid: true, 
        qrCode: tokenInfo.qrCode,
        message: '安全令牌验证成功' 
      };
    } catch (error) {
      throw new Error(`验证安全令牌失败: ${error.message}`);
    }
  }

  /**
   * 生成微信小程序码（固定二维码）
   * @param {string} qrCode - 二维码标识
   * @param {Object} options - 生成选项
   * @returns {Object} 包含小程序码信息
   */
  async generateWechatMiniProgramCode(qrCode, options = {}) {
    try {
      const axios = require('axios');
      const config = require('../config/database');
      
      // 1. 获取微信access_token
      const accessToken = await this.getWechatAccessToken();
      
      // 2. 生成小程序码
      const miniProgramCode = await this.createMiniProgramCode(accessToken, qrCode, options);
      
      // 3. 将小程序码转换为DataURL
      const qrCodeDataURL = `data:image/png;base64,${miniProgramCode.toString('base64')}`;
      
      return {
        qrCode,
        imageDataURL: qrCodeDataURL,
        miniProgramPath: `pages/dining-confirm/dining-confirm?qrCode=${qrCode}`,
        scene: qrCode,
        width: options.width || 200,
        margin: options.margin || 2
      };
    } catch (error) {
      throw new Error(`生成微信小程序码失败: ${error.message}`);
    }
  }

  /**
   * 获取微信access_token
   * @returns {string} access_token
   */
  async getWechatAccessToken() {
    try {
      const axios = require('axios');
      const config = require('../config/database');
      
      const url = `${config.wechat.apiUrl}/cgi-bin/token`;
      const params = {
        grant_type: 'client_credential',
        appid: config.wechat.appId,
        secret: config.wechat.appSecret
      };
      
      const response = await axios.get(url, { params });
      
      if (response.data.errcode) {
        throw new Error(`获取access_token失败: ${response.data.errmsg}`);
      }
      
      return response.data.access_token;
    } catch (error) {
      throw new Error(`获取微信access_token失败: ${error.message}`);
    }
  }

  /**
   * 创建微信小程序码
   * @param {string} accessToken - 微信access_token
   * @param {string} qrCode - 二维码标识
   * @param {Object} options - 生成选项
   * @returns {Buffer} 小程序码图片
   */
  async createMiniProgramCode(accessToken, qrCode, options = {}) {
    try {
      const axios = require('axios');
      
      const url = `${config.wechat.apiUrl}/wxa/getwxacodeunlimit`;
      const params = { access_token: accessToken };
      
      const data = {
        scene: qrCode, // 二维码标识作为scene参数
        page: 'pages/dining-confirm/dining-confirm', // 小程序页面路径
        width: options.width || 200,
        auto_color: false,
        line_color: { r: 0, g: 0, b: 0 },
        is_hyaline: false
      };
      
      const response = await axios.post(url, data, { 
        params,
        responseType: 'arraybuffer'
      });
      
      if (response.data.errcode) {
        throw new Error(`生成小程序码失败: ${response.data.errmsg}`);
      }
      
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`创建微信小程序码失败: ${error.message}`);
    }
  }

  /**
   * 处理微信小程序扫码确认就餐
   * @param {string} userId - 用户ID
   * @param {string} qrCode - 二维码标识
   * @param {Date} scanTime - 扫码时间
   * @param {Object} db - 数据库连接
   * @returns {Object} 处理结果
   */
  async processWechatQRScan(userId, qrCode, scanTime, db) {
    try {
      // 复用现有的扫码逻辑
      return await this.processQRScan(userId, qrCode, scanTime, db);
    } catch (error) {
      throw new Error(`微信小程序扫码确认失败: ${error.message}`);
    }
  }
}

module.exports = new QRScanService();
