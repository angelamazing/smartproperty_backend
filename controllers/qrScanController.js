/**
 * 扫码就餐登记控制器
 * 处理扫码相关的HTTP请求和响应
 */

const qrScanService = require('../services/qrScanService');
const ResponseHelper = require('../utils/response');
const logger = require('../utils/logger');
const moment = require('moment-timezone');

class QRScanController {
  /**
   * 处理扫码就餐登记
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async processQRScan(req, res) {
    try {
      const { qrCode } = req.body;
      const userId = req.user.id;
      
      // 验证必填参数
      if (!qrCode) {
        return ResponseHelper.error(res, '二维码标识不能为空', 400);
      }
      
      // 使用服务器当前时间，确保时间准确性
      const serverTime = new Date();
      
      // 处理扫码登记
      const result = await qrScanService.processQRScan(
        userId, 
        qrCode, 
        serverTime, 
        req.db
      );
      
      if (result.success) {
        logger.info(`扫码就餐登记成功: 用户 ${userId}, 二维码 ${qrCode}, 餐次 ${result.data.mealType}`);
        return ResponseHelper.success(res, result.data, result.message);
      } else {
        logger.warn(`扫码就餐登记失败: 用户 ${userId}, 二维码 ${qrCode}, 原因: ${result.message}`);
        return ResponseHelper.error(res, result.message, 400);
      }
      
    } catch (error) {
      logger.error('扫码就餐登记处理失败:', error);
      return ResponseHelper.error(res, '扫码就餐登记失败', 500);
    }
  }

  /**
   * 处理扫码就餐登记（GET请求，用于直接扫码跳转）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async processQRScanGet(req, res) {
    try {
      const { qrCode } = req.query;
      const userId = req.user.id;
      const scanTime = new Date(); // 使用当前时间
      
      // 验证必填参数
      if (!qrCode) {
        return ResponseHelper.error(res, '二维码标识不能为空', 400);
      }
      
      // 处理扫码登记
      const result = await qrScanService.processQRScan(
        userId, 
        qrCode, 
        scanTime, 
        req.db
      );
      
      if (result.success) {
        logger.info(`扫码就餐登记成功: 用户 ${userId}, 二维码 ${qrCode}, 餐次 ${result.data.mealType}`);
        
        // 返回HTML页面显示结果
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>扫码确认就餐</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .success { color: green; }
              .error { color: red; }
              .info { margin: 20px 0; }
            </style>
          </head>
          <body>
            <h1>扫码确认就餐</h1>
            <div class="success">
              <h2>✅ 确认成功！</h2>
              <p>${result.message}</p>
              <div class="info">
                <p><strong>用户:</strong> ${result.data.userName}</p>
                <p><strong>餐次:</strong> ${result.data.mealTypeName}</p>
                <p><strong>日期:</strong> ${result.data.diningDate}</p>
                <p><strong>时间:</strong> ${result.data.scanTime}</p>
              </div>
            </div>
            <p><a href="javascript:history.back()">返回</a></p>
          </body>
          </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      } else {
        logger.warn(`扫码就餐登记失败: 用户 ${userId}, 二维码 ${qrCode}, 原因: ${result.message}`);
        
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>扫码确认就餐</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .success { color: green; }
              .error { color: red; }
            </style>
          </head>
          <body>
            <h1>扫码确认就餐</h1>
            <div class="error">
              <h2>❌ 确认失败</h2>
              <p>${result.message}</p>
            </div>
            <p><a href="javascript:history.back()">返回</a></p>
          </body>
          </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        return res.status(400).send(html);
      }
      
    } catch (error) {
      logger.error('扫码就餐登记处理失败:', error);
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>扫码确认就餐</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1>扫码确认就餐</h1>
          <div class="error">
            <h2>❌ 系统错误</h2>
            <p>扫码就餐登记失败</p>
          </div>
          <p><a href="javascript:history.back()">返回</a></p>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      return res.status(500).send(html);
    }
  }

  /**
   * 获取用户就餐登记历史
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserRegistrationHistory(req, res) {
    try {
      const userId = req.user.id;
      const { 
        startDate, 
        endDate, 
        mealType, 
        limit = 50, 
        offset = 0 
      } = req.query;
      
      // 验证日期格式
      if (startDate && !moment(startDate).isValid()) {
        return ResponseHelper.error(res, '开始日期格式不正确', 400);
      }
      
      if (endDate && !moment(endDate).isValid()) {
        return ResponseHelper.error(res, '结束日期格式不正确', 400);
      }
      
      // 验证餐次类型
      if (mealType && !['breakfast', 'lunch', 'dinner'].includes(mealType)) {
        return ResponseHelper.error(res, '餐次类型不正确', 400);
      }
      
      const options = {
        startDate,
        endDate,
        mealType,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
      const history = await qrScanService.getUserRegistrationHistory(userId, options, req.db);
      
      return ResponseHelper.success(res, history, '获取登记历史成功');
      
    } catch (error) {
      logger.error('获取用户登记历史失败:', error);
      return ResponseHelper.error(res, '获取登记历史失败', 500);
    }
  }

  /**
   * 获取就餐统计信息（管理员功能）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDiningStatistics(req, res) {
    try {
      const { date } = req.query;
      
      // 默认使用今天
      const targetDate = date || moment().tz('Asia/Shanghai').format('YYYY-MM-DD');
      
      // 验证日期格式
      if (!moment(targetDate).isValid()) {
        return ResponseHelper.error(res, '日期格式不正确', 400);
      }
      
      const statistics = await qrScanService.getDiningStatistics(targetDate, req.db);
      
      return ResponseHelper.success(res, statistics, '获取就餐统计成功');
      
    } catch (error) {
      logger.error('获取就餐统计失败:', error);
      return ResponseHelper.error(res, '获取就餐统计失败', 500);
    }
  }

  /**
   * 创建新的二维码（管理员功能）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async createQRCode(req, res) {
    try {
      const { name, location, description } = req.body;
      
      // 验证必填参数
      if (!name) {
        return ResponseHelper.error(res, '二维码名称不能为空', 400);
      }
      
      if (!location) {
        return ResponseHelper.error(res, '张贴位置不能为空', 400);
      }
      
      const qrData = {
        name,
        location,
        description: description || ''
      };
      
      const result = await qrScanService.createQRCode(qrData, req.db);
      
      logger.info(`二维码创建成功: ${result.code}, 位置: ${location}`);
      return ResponseHelper.success(res, result, result.message);
      
    } catch (error) {
      logger.error('创建二维码失败:', error);
      return ResponseHelper.error(res, '创建二维码失败', 500);
    }
  }

  /**
   * 获取二维码列表（管理员功能）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getQRCodes(req, res) {
    try {
      const { status, limit = 100, offset = 0 } = req.query;
      
      // 验证状态参数
      if (status && !['active', 'inactive'].includes(status)) {
        return ResponseHelper.error(res, '状态参数不正确', 400);
      }
      
      const options = {
        status,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      
      const qrCodes = await qrScanService.getQRCodes(options, req.db);
      
      return ResponseHelper.success(res, qrCodes, '获取二维码列表成功');
      
    } catch (error) {
      logger.error('获取二维码列表失败:', error);
      return ResponseHelper.error(res, '获取二维码列表失败', 500);
    }
  }

  /**
   * 获取二维码详情（管理员功能）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getQRCodeDetail(req, res) {
    try {
      const { qrId } = req.params;
      
      if (!qrId) {
        return ResponseHelper.error(res, '二维码ID不能为空', 400);
      }
      
      const [rows] = await req.db.execute(
        'SELECT * FROM qr_codes WHERE _id = ?',
        [qrId]
      );
      
      if (rows.length === 0) {
        return ResponseHelper.error(res, '二维码不存在', 404);
      }
      
      const qrCode = rows[0];
      
      // 获取该二维码的使用统计
      const [usageStats] = await req.db.execute(`
        SELECT 
          COUNT(*) as totalScans,
          COUNT(DISTINCT userId) as uniqueUsers,
          COUNT(CASE WHEN status = 'success' THEN 1 END) as successfulScans,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failedScans
        FROM dining_registrations 
        WHERE qrCodeId = ?
      `, [qrId]);
      
      const result = {
        ...qrCode,
        usageStats: usageStats[0] || {
          totalScans: 0,
          uniqueUsers: 0,
          successfulScans: 0,
          failedScans: 0
        }
      };
      
      return ResponseHelper.success(res, result, '获取二维码详情成功');
      
    } catch (error) {
      logger.error('获取二维码详情失败:', error);
      return ResponseHelper.error(res, '获取二维码详情失败', 500);
    }
  }

  /**
   * 生成二维码图片
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async generateQRCodeImage(req, res) {
    try {
      const { qrCode } = req.params;
      const { width = 200, margin = 2 } = req.query;
      
      if (!qrCode) {
        return ResponseHelper.error(res, '二维码标识不能为空', 400);
      }
      
      const options = {
        width: parseInt(width),
        margin: parseInt(margin)
      };
      
      const qrCodeDataURL = await qrScanService.generateQRCodeImage(qrCode, options);
      
      logger.info(`二维码图片生成成功: ${qrCode}`);
      return ResponseHelper.success(res, {
        qrCode,
        imageDataURL: qrCodeDataURL,
        width: options.width,
        margin: options.margin
      }, '二维码图片生成成功');
      
    } catch (error) {
      logger.error('生成二维码图片失败:', error);
      return ResponseHelper.error(res, '生成二维码图片失败', 500);
    }
  }

  /**
   * 生成包含接口URL的二维码图片
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async generateQRCodeWithURL(req, res) {
    try {
      const { qrCode } = req.params;
      const { width = 200, margin = 2, baseURL } = req.query;
      
      if (!qrCode) {
        return ResponseHelper.error(res, '二维码标识不能为空', 400);
      }
      
      const options = {
        width: parseInt(width),
        margin: parseInt(margin)
      };
      
      const qrCodeDataURL = await qrScanService.generateQRCodeWithURL(qrCode, baseURL, options);
      
      logger.info(`包含URL的二维码图片生成成功: ${qrCode}`);
      return ResponseHelper.success(res, {
        qrCode,
        imageDataURL: qrCodeDataURL,
        qrCodeURL: `${baseURL || 'http://localhost:3000'}/api/qr-scan/scan?qrCode=${qrCode}`,
        width: options.width,
        margin: options.margin
      }, '包含URL的二维码图片生成成功');
      
    } catch (error) {
      logger.error('生成包含URL的二维码图片失败:', error);
      return ResponseHelper.error(res, '生成包含URL的二维码图片失败', 500);
    }
  }

  /**
   * 生成安全二维码图片
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async generateSecureQRCode(req, res) {
    try {
      const { qrCode } = req.params;
      const { width = 200, margin = 2, baseURL } = req.query;
      
      if (!qrCode) {
        return ResponseHelper.error(res, '二维码标识不能为空', 400);
      }
      
      const options = {
        width: parseInt(width),
        margin: parseInt(margin)
      };
      
      const result = await qrScanService.generateSecureQRCode(qrCode, baseURL, options);
      
      logger.info(`安全二维码图片生成成功: ${qrCode}`);
      return ResponseHelper.success(res, {
        qrCode: result.qrCode,
        imageDataURL: result.qrCodeDataURL,
        qrCodeURL: result.qrCodeURL,
        secureToken: result.secureToken,
        expiresAt: result.expiresAt,
        width: options.width,
        margin: options.margin
      }, '安全二维码图片生成成功');
      
    } catch (error) {
      logger.error('生成安全二维码图片失败:', error);
      return ResponseHelper.error(res, '生成安全二维码图片失败', 500);
    }
  }

  /**
   * 处理安全扫码就餐登记
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async processQRScanSecure(req, res) {
    try {
      const { secureToken } = req.params;
      
      if (!secureToken) {
        return ResponseHelper.error(res, '安全令牌不能为空', 400);
      }
      
      // 验证安全令牌
      const tokenValidation = await qrScanService.validateSecureToken(secureToken);
      if (!tokenValidation.valid) {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>扫码确认就餐</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: red; }
            </style>
          </head>
          <body>
            <h1>扫码确认就餐</h1>
            <div class="error">
              <h2>❌ 安全验证失败</h2>
              <p>${tokenValidation.message}</p>
            </div>
            <p><a href="javascript:history.back()">返回</a></p>
          </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html');
        return res.status(400).send(html);
      }
      
      // 获取用户信息（这里需要根据实际需求实现）
      // 方案1：通过IP地址识别用户
      // 方案2：通过设备指纹识别用户
      // 方案3：要求用户输入工号/手机号
      const userInfo = await this.identifyUser(req);
      if (!userInfo) {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>扫码确认就餐</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: red; }
              .form { margin: 20px 0; }
              .form input { padding: 10px; margin: 5px; width: 200px; }
              .form button { padding: 10px 20px; background: #007bff; color: white; border: none; cursor: pointer; }
            </style>
          </head>
          <body>
            <h1>扫码确认就餐</h1>
            <div class="error">
              <h2>⚠️ 需要身份验证</h2>
              <p>请输入您的工号或手机号以确认身份</p>
            </div>
            <form class="form" method="post" action="/api/qr-scan/scan-secure/${secureToken}/verify">
              <input type="text" name="userIdentifier" placeholder="请输入工号或手机号" required>
              <br>
              <button type="submit">确认身份</button>
            </form>
            <p><a href="javascript:history.back()">返回</a></p>
          </body>
          </html>
        `;
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      }
      
      // 处理扫码登记
      const result = await qrScanService.processQRScan(
        userInfo.id, 
        tokenValidation.qrCode, 
        new Date(), 
        req.db
      );
      
      if (result.success) {
        logger.info(`安全扫码就餐登记成功: 用户 ${userInfo.id}, 二维码 ${tokenValidation.qrCode}, 餐次 ${result.data.mealType}`);
        
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>扫码确认就餐</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .success { color: green; }
              .info { margin: 20px 0; }
            </style>
          </head>
          <body>
            <h1>扫码确认就餐</h1>
            <div class="success">
              <h2>✅ 确认成功！</h2>
              <p>${result.message}</p>
              <div class="info">
                <p><strong>用户:</strong> ${result.data.userName}</p>
                <p><strong>餐次:</strong> ${result.data.mealTypeName}</p>
                <p><strong>日期:</strong> ${result.data.diningDate}</p>
                <p><strong>时间:</strong> ${result.data.scanTime}</p>
              </div>
            </div>
            <p><a href="javascript:history.back()">返回</a></p>
          </body>
          </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        return res.send(html);
      } else {
        logger.warn(`安全扫码就餐登记失败: 用户 ${userInfo.id}, 二维码 ${tokenValidation.qrCode}, 原因: ${result.message}`);
        
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>扫码确认就餐</title>
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              .error { color: red; }
            </style>
          </head>
          <body>
            <h1>扫码确认就餐</h1>
            <div class="error">
              <h2>❌ 确认失败</h2>
              <p>${result.message}</p>
            </div>
            <p><a href="javascript:history.back()">返回</a></p>
          </body>
          </html>
        `;
        
        res.setHeader('Content-Type', 'text/html');
        return res.status(400).send(html);
      }
      
    } catch (error) {
      logger.error('安全扫码就餐登记处理失败:', error);
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>扫码确认就餐</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1>扫码确认就餐</h1>
          <div class="error">
            <h2>❌ 系统错误</h2>
            <p>扫码就餐登记失败</p>
          </div>
          <p><a href="javascript:history.back()">返回</a></p>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html');
      return res.status(500).send(html);
    }
  }

  /**
   * 识别用户身份
   * @param {Object} req - 请求对象
   * @returns {Object|null} 用户信息
   */
  async identifyUser(req) {
    try {
      // 方案1：通过IP地址识别（需要维护IP-用户映射表）
      const clientIP = req.ip || req.connection.remoteAddress;
      
      // 方案2：通过设备指纹识别（需要前端支持）
      const userAgent = req.get('User-Agent');
      
      // 方案3：通过工号/手机号识别（需要用户输入）
      // 这里返回null，让前端显示身份验证表单
      return null;
      
    } catch (error) {
      logger.error('识别用户身份失败:', error);
      return null;
    }
  }

  /**
   * 生成微信小程序码
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async generateWechatMiniProgramCode(req, res) {
    try {
      const { qrCode } = req.params;
      const { width = 200, margin = 2 } = req.query;
      
      if (!qrCode) {
        return ResponseHelper.error(res, '二维码标识不能为空', 400);
      }
      
      const options = {
        width: parseInt(width),
        margin: parseInt(margin)
      };
      
      const result = await qrScanService.generateWechatMiniProgramCode(qrCode, options);
      
      logger.info(`微信小程序码生成成功: ${qrCode}`);
      return ResponseHelper.success(res, {
        qrCode: result.qrCode,
        imageDataURL: result.imageDataURL,
        miniProgramPath: result.miniProgramPath,
        scene: result.scene,
        width: result.width,
        margin: result.margin
      }, '微信小程序码生成成功');
      
    } catch (error) {
      logger.error('生成微信小程序码失败:', error);
      return ResponseHelper.error(res, '生成微信小程序码失败', 500);
    }
  }

  /**
   * 处理微信小程序扫码确认就餐
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async processWechatQRScan(req, res) {
    try {
      const { qrCode, scanTime } = req.body;
      const userId = req.user.id;
      
      // 验证必填参数
      if (!qrCode) {
        return ResponseHelper.error(res, '二维码标识不能为空', 400);
      }
      
      if (!scanTime) {
        return ResponseHelper.error(res, '扫码时间不能为空', 400);
      }
      
      // 验证扫码时间格式
      const scanTimeMoment = moment(scanTime);
      if (!scanTimeMoment.isValid()) {
        return ResponseHelper.error(res, '扫码时间格式不正确', 400);
      }
      
      // 确保扫码时间是北京时间
      const beijingScanTime = scanTimeMoment.tz('Asia/Shanghai');
      
      // 处理微信小程序扫码登记
      const result = await qrScanService.processWechatQRScan(
        userId, 
        qrCode, 
        beijingScanTime.toDate(), 
        req.db
      );
      
      if (result.success) {
        logger.info(`微信小程序扫码就餐登记成功: 用户 ${userId}, 二维码 ${qrCode}, 餐次 ${result.data.mealType}`);
        return ResponseHelper.success(res, result.data, result.message);
      } else {
        logger.warn(`微信小程序扫码就餐登记失败: 用户 ${userId}, 二维码 ${qrCode}, 原因: ${result.message}`);
        return ResponseHelper.error(res, result.message, 400);
      }
      
    } catch (error) {
      logger.error('微信小程序扫码就餐登记处理失败:', error);
      return ResponseHelper.error(res, '微信小程序扫码就餐登记失败', 500);
    }
  }

  /**
   * 更新二维码状态（管理员功能）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async updateQRCodeStatus(req, res) {
    try {
      const { qrId } = req.params;
      const { status } = req.body;
      
      if (!qrId) {
        return ResponseHelper.error(res, '二维码ID不能为空', 400);
      }
      
      if (!status || !['active', 'inactive'].includes(status)) {
        return ResponseHelper.error(res, '状态参数不正确', 400);
      }
      
      const [result] = await req.db.execute(
        'UPDATE qr_codes SET status = ?, updateTime = CURRENT_TIMESTAMP WHERE _id = ?',
        [status, qrId]
      );
      
      if (result.affectedRows === 0) {
        return ResponseHelper.error(res, '二维码不存在', 404);
      }
      
      logger.info(`二维码状态更新成功: ${qrId}, 新状态: ${status}`);
      return ResponseHelper.success(res, { qrId, status }, '二维码状态更新成功');
      
    } catch (error) {
      logger.error('更新二维码状态失败:', error);
      return ResponseHelper.error(res, '更新二维码状态失败', 500);
    }
  }

  /**
   * 获取今日就餐登记概览
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getTodayOverview(req, res) {
    try {
      const userId = req.user.id;
      const today = moment().tz('Asia/Shanghai').format('YYYY-MM-DD');
      
      // 获取今日各餐次的登记状态
      const [rows] = await req.db.execute(`
        SELECT 
          mealType,
          COUNT(*) as registrationCount,
          MAX(scanTime) as lastScanTime
        FROM dining_registrations 
        WHERE userId = ? AND diningDate = ? AND status = 'success'
        GROUP BY mealType
      `, [userId, today]);
      
      // 获取今日各餐次的报餐状态
      const [orderRows] = await req.db.execute(`
        SELECT 
          mealType,
          COUNT(*) as orderCount,
          MAX(createTime) as lastOrderTime
        FROM dining_orders 
        WHERE diningDate = ? 
          AND status IN ('pending', 'confirmed')
          AND JSON_CONTAINS(memberIds, JSON_QUOTE(?))
        GROUP BY mealType
      `, [today, userId]);
      
      // 构建概览数据
      const overview = {
        date: today,
        breakfast: { ordered: false, registered: false, lastOrderTime: null, lastScanTime: null },
        lunch: { ordered: false, registered: false, lastOrderTime: null, lastScanTime: null },
        dinner: { ordered: false, registered: false, lastOrderTime: null, lastScanTime: null }
      };
      
      // 填充登记信息
      rows.forEach(row => {
        overview[row.mealType].registered = true;
        overview[row.mealType].lastScanTime = row.lastScanTime;
      });
      
      // 填充报餐信息
      orderRows.forEach(row => {
        overview[row.mealType].ordered = true;
        overview[row.mealType].lastOrderTime = row.lastOrderTime;
      });
      
      return ResponseHelper.success(res, overview, '获取今日概览成功');
      
    } catch (error) {
      logger.error('获取今日概览失败:', error);
      return ResponseHelper.error(res, '获取今日概览失败', 500);
    }
  }
}

module.exports = new QRScanController();
