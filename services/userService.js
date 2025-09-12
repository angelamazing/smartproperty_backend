const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

/**
 * 用户服务类
 */
class UserService {
  /**
   * 获取用户统计数据
   * @param {string} userId - 用户ID
   * @param {Object} db - 数据库连接
   */
  async getUserStats(userId, db) {
    try {
      // 获取报餐次数
      const [diningResult] = await db.execute(
        `SELECT COUNT(*) as count FROM dining_orders 
         WHERE JSON_CONTAINS(memberIds, JSON_QUOTE(?)) AND status != 'cancelled'`,
        [userId]
      );
      
      // 获取预约次数（场地预约 + 特殊预约）
      const [venueReservationResult] = await db.execute(
        'SELECT COUNT(*) as count FROM reservations WHERE userId = ? AND status != "cancelled"',
        [userId]
      );
      
      const [specialReservationResult] = await db.execute(
        'SELECT COUNT(*) as count FROM special_reservations WHERE name IN (SELECT nickName FROM users WHERE _id = ?) AND status != "cancelled"',
        [userId]
      );
      
      // 获取验证次数
      const [verificationResult] = await db.execute(
        'SELECT COUNT(*) as count FROM dining_verifications WHERE status = "verified"'
      );
      
      return {
        diningCount: diningResult[0].count || 0,
        reservationCount: (venueReservationResult[0].count || 0) + (specialReservationResult[0].count || 0),
        verificationCount: verificationResult[0].count || 0
      };
    } catch (error) {
      logger.error('获取用户统计数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新用户头像
   * @param {string} userId - 用户ID
   * @param {string} avatarUrl - 头像URL
   * @param {Object} db - 数据库连接
   */
  async updateUserAvatar(userId, avatarUrl, db) {
    try {
      const [result] = await db.execute(
        'UPDATE users SET avatarUrl = ?, updateTime = NOW() WHERE _id = ?',
        [avatarUrl, userId]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('用户不存在');
      }
      
      logger.info(`用户头像更新成功: ${userId}`);
      return true;
    } catch (error) {
      logger.error('更新用户头像失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新用户资料
   * @param {string} userId - 用户ID
   * @param {Object} profileData - 用户资料数据
   * @param {Object} db - 数据库连接
   */
  async updateUserProfile(userId, profileData, db) {
    try {
      const updateFields = [];
      const updateValues = [];
      
      // 构建动态更新字段
      if (profileData.nickName !== undefined) {
        updateFields.push('nickName = ?');
        updateValues.push(profileData.nickName);
      }
      
      if (profileData.department !== undefined) {
        updateFields.push('department = ?');
        updateValues.push(profileData.department);
      }
      
      if (profileData.phoneNumber !== undefined) {
        // 检查手机号是否已被其他用户使用
        const [existingUsers] = await db.execute(
          'SELECT _id FROM users WHERE phoneNumber = ? AND _id != ?',
          [profileData.phoneNumber, userId]
        );
        
        if (existingUsers.length > 0) {
          throw new Error('该手机号已被其他用户使用');
        }
        
        updateFields.push('phoneNumber = ?');
        updateValues.push(profileData.phoneNumber);
      }
      
      if (profileData.email !== undefined) {
        // 检查邮箱是否已被其他用户使用
        if (profileData.email) {
          const [existingUsers] = await db.execute(
            'SELECT _id FROM users WHERE email = ? AND _id != ?',
            [profileData.email, userId]
          );
          
          if (existingUsers.length > 0) {
            throw new Error('该邮箱已被其他用户使用');
          }
        }
        
        updateFields.push('email = ?');
        updateValues.push(profileData.email);
      }
      
      if (updateFields.length === 0) {
        throw new Error('没有需要更新的字段');
      }
      
      // 添加更新时间
      updateFields.push('updateTime = NOW()');
      updateValues.push(userId);
      
      const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE _id = ?`;
      const [result] = await db.execute(sql, updateValues);
      
      if (result.affectedRows === 0) {
        throw new Error('用户不存在');
      }
      
      logger.info(`用户资料更新成功: ${userId}`);
      return true;
    } catch (error) {
      logger.error('更新用户资料失败:', error);
      throw error;
    }
  }
  
  /**
   * 修改用户密码
   * @param {string} userId - 用户ID
   * @param {string} oldPassword - 旧密码
   * @param {string} newPassword - 新密码
   * @param {Object} db - 数据库连接
   */
  async changePassword(userId, oldPassword, newPassword, db) {
    try {
      // 获取用户当前密码
      const [userRows] = await db.execute(
        'SELECT password FROM users WHERE _id = ? AND status = "active"',
        [userId]
      );
      
      if (userRows.length === 0) {
        throw new Error('用户不存在');
      }
      
      const user = userRows[0];
      
      // 验证旧密码
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
      
      if (!isOldPasswordValid) {
        throw new Error('旧密码不正确');
      }
      
      // 加密新密码
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      // 更新密码
      await db.execute(
        'UPDATE users SET password = ?, updateTime = NOW() WHERE _id = ?',
        [hashedNewPassword, userId]
      );
      
      logger.info(`用户密码修改成功: ${userId}`);
      return true;
    } catch (error) {
      logger.error('修改用户密码失败:', error);
      throw error;
    }
  }
  
  /**
   * 重置用户密码（管理员功能）
   * @param {string} userId - 用户ID
   * @param {string} newPassword - 新密码
   * @param {string} adminId - 管理员ID
   * @param {Object} db - 数据库连接
   */
  async resetPassword(userId, newPassword, adminId, db) {
    try {
      // 检查用户是否存在
      const [userRows] = await db.execute(
        'SELECT _id FROM users WHERE _id = ? AND status = "active"',
        [userId]
      );
      
      if (userRows.length === 0) {
        throw new Error('用户不存在');
      }
      
      // 加密新密码
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // 更新密码
      await db.execute(
        'UPDATE users SET password = ?, updateTime = NOW() WHERE _id = ?',
        [hashedPassword, userId]
      );
      
      logger.info(`管理员重置用户密码成功: 用户${userId}, 管理员${adminId}`);
      return true;
    } catch (error) {
      logger.error('重置用户密码失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取用户详细信息
   * @param {string} userId - 用户ID
   * @param {Object} db - 数据库连接
   */
  async getUserInfo(userId, db) {
    try {
      const [userRows] = await db.execute(
        `SELECT _id, openid, nickName, avatarUrl, phoneNumber, email, gender, 
                country, province, city, language, department, role, status, 
                createTime, updateTime, lastLoginTime, isTestUser
         FROM users WHERE _id = ?`,
        [userId]
      );
      
      if (userRows.length === 0) {
        throw new Error('用户不存在');
      }
      
      const user = userRows[0];
      
      // 不返回敏感信息
      delete user.openid;
      
      return user;
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取用户列表（管理员功能）
   * @param {Object} filters - 筛选条件
   * @param {number} page - 页码
   * @param {number} pageSize - 每页大小
   * @param {Object} db - 数据库连接
   */
  async getUserList(filters, page, pageSize, db) {
    try {
      const whereConditions = [];
      const whereValues = [];
      
      // 默认只返回active状态的用户，除非明确指定了status筛选条件
      if (!filters || !filters.status) {
        whereConditions.push('status = ?');
        whereValues.push('active');
      } else if (filters.status) {
        whereConditions.push('status = ?');
        whereValues.push(filters.status);
      }
      
      // 构建其他筛选条件
      if (filters && filters.role) {
        whereConditions.push('role = ?');
        whereValues.push(filters.role);
      }
      
      if (filters && filters.department) {
        whereConditions.push('department LIKE ?');
        whereValues.push(`%${filters.department}%`);
      }
      
      if (filters && filters.keyword) {
        whereConditions.push('(nickName LIKE ? OR phoneNumber LIKE ?)');
        whereValues.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // 查询总数
      const countSql = `SELECT COUNT(*) as total FROM users ${whereClause}`;
      const [countResult] = await db.execute(countSql, whereValues);
      const total = countResult[0].total;
      
      // 查询列表
      const offset = (page - 1) * pageSize;
      const listSql = `
        SELECT _id, nickName, avatarUrl, phoneNumber, email, department, role, status, 
               createTime, updateTime, lastLoginTime, isTestUser
        FROM users ${whereClause}
        ORDER BY createTime DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      
      const [listResult] = await db.execute(listSql, whereValues);
      
      return {
        records: listResult,
        total,
        page,
        pageSize,
        hasMore: (page * pageSize) < total
      };
    } catch (error) {
      logger.error('获取用户列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新用户状态（管理员功能）
   * @param {string} userId - 用户ID
   * @param {string} status - 新状态
   * @param {string} adminId - 管理员ID
   * @param {Object} db - 数据库连接
   */
  async updateUserStatus(userId, status, adminId, db) {
    try {
      // 检查目标用户是否存在
      const [userRows] = await db.execute(
        'SELECT _id, role FROM users WHERE _id = ?',
        [userId]
      );
      
      if (userRows.length === 0) {
        throw new Error('用户不存在');
      }
      
      const user = userRows[0];
      
      // 不能修改系统管理员的状态
      if (user.role === 'sys_admin') {
        throw new Error('不能修改系统管理员的状态');
      }
      
      // 更新用户状态
      const [result] = await db.execute(
        'UPDATE users SET status = ?, updateTime = NOW() WHERE _id = ?',
        [status, userId]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('更新用户状态失败');
      }
      
      // 如果禁用用户，同时使其所有Token失效
      if (status === 'inactive') {
        await db.execute(
          'UPDATE user_tokens SET expireTime = NOW() WHERE userId = ?',
          [userId]
        );
      }
      
      logger.info(`管理员 ${adminId} 更新用户 ${userId} 状态为 ${status}`);
      return true;
    } catch (error) {
      logger.error('更新用户状态失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新用户角色（系统管理员功能）
   * @param {string} userId - 用户ID
   * @param {string} role - 新角色
   * @param {string} adminId - 管理员ID
   * @param {Object} db - 数据库连接
   */
  async updateUserRole(userId, role, adminId, db) {
    try {
      // 检查目标用户是否存在
      const [userRows] = await db.execute(
        'SELECT _id FROM users WHERE _id = ?',
        [userId]
      );
      
      if (userRows.length === 0) {
        throw new Error('用户不存在');
      }
      
      // 更新用户角色
      const [result] = await db.execute(
        'UPDATE users SET role = ?, updateTime = NOW() WHERE _id = ?',
        [role, userId]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('更新用户角色失败');
      }
      
      logger.info(`系统管理员 ${adminId} 更新用户 ${userId} 角色为 ${role}`);
      return true;
    } catch (error) {
      logger.error('更新用户角色失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除用户（系统管理员功能）
   * @param {string} userId - 用户ID
   * @param {string} adminId - 管理员ID
   * @param {Object} db - 数据库连接
   */
  async deleteUser(userId, adminId, db) {
    try {
      // 检查目标用户是否存在
      const [userRows] = await db.execute(
        'SELECT _id, role FROM users WHERE _id = ?',
        [userId]
      );
      
      if (userRows.length === 0) {
        throw new Error('用户不存在');
      }
      
      const user = userRows[0];
      
      // 不能删除系统管理员
      if (user.role === 'sys_admin') {
        throw new Error('不能删除系统管理员');
      }
      
      // 不能删除自己
      if (userId === adminId) {
        throw new Error('不能删除自己的账号');
      }
      
      // 开启事务
      await db.execute('START TRANSACTION');
      
      try {
        // 删除用户相关数据
        await db.execute('DELETE FROM user_tokens WHERE userId = ?', [userId]);
        await db.execute('DELETE FROM users WHERE _id = ?', [userId]);
        
        // 提交事务
        await db.execute('COMMIT');
        
        logger.info(`系统管理员 ${adminId} 删除用户 ${userId}`);
        return true;
      } catch (error) {
        // 回滚事务
        await db.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      logger.error('删除用户失败:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
