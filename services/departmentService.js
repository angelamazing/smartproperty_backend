const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * 部门管理服务类
 * 提供部门管理、部门用户管理、权限控制等功能
 */
class DepartmentService {
  /**
   * 获取所有部门列表
   * @param {Object} db - 数据库连接
   * @param {Object} options - 查询选项
   */
  async getDepartments(db, options = {}) {
    let connection;
    try {
      // 设置查询超时
      const queryTimeout = setTimeout(() => {
        throw new Error('数据库查询超时');
      }, 25000); // 25秒超时
      
      connection = await db.getConnection();
      
      const { status = 'active', includeManager = true } = options;
      
      let sql = `
        SELECT 
          d._id, d.name, d.code, d.description, d.level, d.status,
          d.createTime, d.updateTime,
          COUNT(u._id) as memberCount
      `;
      
      if (includeManager) {
        sql += `, 
          d.managerId,
          m.nickName as managerName,
          m.phoneNumber as managerPhone,
          m.email as managerEmail
        `;
      }
      
      sql += `
        FROM departments d
        LEFT JOIN users u ON d._id = u.departmentId AND u.status = 'active'
      `;
      
      if (includeManager) {
        sql += `
          LEFT JOIN users m ON d.managerId = m._id
        `;
      }
      
      sql += `
        WHERE d.status = ?
        GROUP BY d._id, d.name, d.code, d.description, d.level, d.status, d.createTime, d.updateTime
      `;
      
      if (includeManager) {
        sql += `, d.managerId, m.nickName, m.phoneNumber, m.email`;
      }
      
      sql += `
        ORDER BY d.level ASC, d.name ASC
      `;
      
      logger.info('执行部门列表查询:', { sql, status, includeManager });
      
      const [departments] = await connection.execute(sql, [status]);
      
      clearTimeout(queryTimeout);
      
      logger.info(`部门列表查询成功，返回 ${departments.length} 条记录`);
      
      return departments.map(dept => ({
        _id: dept._id,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        level: dept.level,
        status: dept.status,
        createTime: dept.createTime,
        updateTime: dept.updateTime,
        memberCount: parseInt(dept.memberCount) || 0,
        ...(includeManager && {
          manager: dept.managerId ? {
            _id: dept.managerId,
            name: dept.managerName,
            phone: dept.managerPhone,
            email: dept.managerEmail
          } : null
        })
      }));
      
    } catch (error) {
      logger.error('获取部门列表失败:', {
        error: error.message,
        stack: error.stack,
        options
      });
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.release();
        } catch (releaseError) {
          logger.error('释放数据库连接失败:', releaseError);
        }
      }
    }
  }

  /**
   * 获取部门详情
   * @param {Object} db - 数据库连接
   * @param {string} departmentId - 部门ID
   */
  async getDepartmentById(db, departmentId) {
    let connection;
    try {
      connection = await db.getConnection();
      
      const [departments] = await connection.execute(`
        SELECT 
          d._id, d.name, d.code, d.description, d.level, d.status,
          d.createTime, d.updateTime, d.managerId,
          u.nickName as managerName,
          u.phoneNumber as managerPhone,
          u.email as managerEmail
        FROM departments d
        LEFT JOIN users u ON d.managerId = u._id
        WHERE d._id = ? AND d.status = 'active'
      `, [departmentId]);
      
      if (departments.length === 0) {
        return null;
      }
      
      const dept = departments[0];
      
      // 获取部门成员数量
      const [memberCount] = await connection.execute(`
        SELECT COUNT(*) as count
        FROM users
        WHERE departmentId = ? AND status = 'active'
      `, [departmentId]);
      
      return {
        _id: dept._id,
        name: dept.name,
        code: dept.code,
        description: dept.description,
        level: dept.level,
        status: dept.status,
        createTime: dept.createTime,
        updateTime: dept.updateTime,
        memberCount: memberCount[0].count,
        manager: dept.managerId ? {
          _id: dept.managerId,
          name: dept.managerName,
          phone: dept.managerPhone,
          email: dept.managerEmail
        } : null
      };
      
    } catch (error) {
      logger.error('获取部门详情失败:', error);
      throw error;
    } finally {
      if (connection) await connection.release();
    }
  }

  /**
   * 获取部门成员列表
   * @param {Object} db - 数据库连接
   * @param {string} departmentId - 部门ID
   * @param {Object} options - 查询选项
   */
  async getDepartmentMembers(db, departmentId, options = {}) {
    let connection;
    try {
      connection = await db.getConnection();
      
      const { 
        page = 1, 
        pageSize = 20, 
        status = 'active',
        role = null,
        keyword = null
      } = options;
      
      // 确保pageSize和offset是整数
      const pageSizeInt = parseInt(pageSize);
      const pageInt = parseInt(page);
      
      let whereConditions = ['u.departmentId = ?', 'u.status = ?'];
      const params = [departmentId, status];
      
      if (role) {
        whereConditions.push('u.role = ?');
        params.push(role);
      }
      
      if (keyword) {
        whereConditions.push('(u.nickName LIKE ? OR u.phoneNumber LIKE ?)');
        const keywordParam = `%${keyword}%`;
        params.push(keywordParam, keywordParam);
      }
      
      const whereClause = whereConditions.join(' AND ');
      
      // 获取总数
      const [countResult] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM users u
        WHERE ${whereClause}
      `, params);
      
      const total = countResult[0].total;
      
      // 获取分页数据
      const offset = (pageInt - 1) * pageSizeInt;
      const [members] = await connection.execute(`
        SELECT 
          u._id, u.nickName, u.avatarUrl, u.phoneNumber, u.email,
          u.role, u.status, u.createTime, u.lastLoginTime
        FROM users u
        WHERE ${whereClause}
        ORDER BY u.role DESC, u.createTime ASC
        LIMIT ? OFFSET ?
      `, [...params, pageSizeInt, offset]);
      
      return {
        list: members.map(member => ({
          _id: member._id,
          nickName: member.nickName,
          avatarUrl: member.avatarUrl,
          phoneNumber: member.phoneNumber,
          email: member.email,
          role: member.role,
          status: member.status,
          createTime: member.createTime,
          lastLoginTime: member.lastLoginTime
        })),
        total,
        page: pageInt,
        pageSize: pageSizeInt,
        totalPages: Math.ceil(total / pageSizeInt)
      };
      
    } catch (error) {
      logger.error('获取部门成员失败:', error);
      throw error;
    } finally {
      if (connection) await connection.release();
    }
  }

  /**
   * 验证用户是否为部门管理员
   * @param {Object} db - 数据库连接
   * @param {string} userId - 用户ID
   * @param {string} departmentId - 部门ID（可选，不传则检查是否为任何部门的管理员）
   */
  async isDepartmentAdmin(db, userId, departmentId = null) {
    let connection;
    try {
      connection = await db.getConnection();
      
      let sql = `
        SELECT u._id, u.role, u.departmentId, d.name as departmentName
        FROM users u
        LEFT JOIN departments d ON u.departmentId = d._id
        WHERE u._id = ? AND u.role = 'dept_admin' AND u.status = 'active'
      `;
      
      const params = [userId];
      
      if (departmentId) {
        sql += ' AND u.departmentId = ?';
        params.push(departmentId);
      }
      
      const [users] = await connection.execute(sql, params);
      
      return users.length > 0 ? {
        isAdmin: true,
        departmentId: users[0].departmentId,
        departmentName: users[0].departmentName
      } : { isAdmin: false };
      
    } catch (error) {
      logger.error('验证部门管理员权限失败:', error);
      throw error;
    } finally {
      if (connection) await connection.release();
    }
  }

  /**
   * 获取用户的部门信息
   * @param {Object} db - 数据库连接
   * @param {string} userId - 用户ID
   */
  async getUserDepartment(db, userId) {
    let connection;
    try {
      connection = await db.getConnection();
      
      const [users] = await connection.execute(`
        SELECT 
          u._id, u.departmentId, u.role,
          d.name as departmentName,
          d.code as departmentCode,
          d.description as departmentDescription
        FROM users u
        LEFT JOIN departments d ON u.departmentId = d._id
        WHERE u._id = ? AND u.status = 'active'
      `, [userId]);
      
      if (users.length === 0) {
        return null;
      }
      
      const user = users[0];
      
      return {
        userId: user._id,
        departmentId: user.departmentId,
        departmentName: user.departmentName,
        departmentCode: user.departmentCode,
        departmentDescription: user.departmentDescription,
        role: user.role,
        isDepartmentAdmin: user.role === 'dept_admin'
      };
      
    } catch (error) {
      logger.error('获取用户部门信息失败:', error);
      throw error;
    } finally {
      if (connection) await connection.release();
    }
  }

  /**
   * 创建部门
   * @param {Object} db - 数据库连接
   * @param {Object} departmentData - 部门数据
   * @param {string} creatorId - 创建人ID
   */
  async createDepartment(db, departmentData, creatorId) {
    let connection;
    try {
      connection = await db.getConnection();
      
      const departmentId = uuidv4();
      const { name, code, description, parentId, level = 1 } = departmentData;
      
      await connection.execute(`
        INSERT INTO departments (
          _id, name, code, description, parentId, level, status, createTime, updateTime
        ) VALUES (?, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
      `, [departmentId, name, code, description, parentId, level]);
      
      logger.info(`部门创建成功: ${name} (${code})`, {
        departmentId,
        creatorId,
        timestamp: new Date().toISOString()
      });
      
      return {
        _id: departmentId,
        name,
        code,
        description,
        parentId,
        level,
        status: 'active'
      };
      
    } catch (error) {
      logger.error('创建部门失败:', error);
      throw error;
    } finally {
      if (connection) await connection.release();
    }
  }

  /**
   * 更新部门信息
   * @param {Object} db - 数据库连接
   * @param {string} departmentId - 部门ID
   * @param {Object} updateData - 更新数据
   * @param {string} updaterId - 更新人ID
   */
  async updateDepartment(db, departmentId, updateData, updaterId) {
    let connection;
    try {
      connection = await db.getConnection();
      
      const { name, code, description, managerId } = updateData;
      
      const updateFields = [];
      const params = [];
      
      if (name !== undefined) {
        updateFields.push('name = ?');
        params.push(name);
      }
      
      if (code !== undefined) {
        updateFields.push('code = ?');
        params.push(code);
      }
      
      if (description !== undefined) {
        updateFields.push('description = ?');
        params.push(description);
      }
      
      if (managerId !== undefined) {
        updateFields.push('managerId = ?');
        params.push(managerId);
      }
      
      if (updateFields.length === 0) {
        throw new Error('没有需要更新的字段');
      }
      
      updateFields.push('updateTime = NOW()');
      params.push(departmentId);
      
      await connection.execute(`
        UPDATE departments 
        SET ${updateFields.join(', ')}
        WHERE _id = ? AND status = 'active'
      `, params);
      
      logger.info(`部门更新成功: ${departmentId}`, {
        updateData,
        updaterId,
        timestamp: new Date().toISOString()
      });
      
      return await this.getDepartmentById(db, departmentId);
      
    } catch (error) {
      logger.error('更新部门失败:', error);
      throw error;
    } finally {
      if (connection) await connection.release();
    }
  }

  /**
   * 获取部门统计数据
   * @param {Object} db - 数据库连接
   */
  async getDepartmentStats(db) {
    let connection;
    try {
      connection = await db.getConnection();
      
      // 获取部门总数
      const [deptCount] = await connection.execute(`
        SELECT COUNT(*) as total FROM departments WHERE status = 'active'
      `);
      
      // 获取有管理员的部门数
      const [managedDeptCount] = await connection.execute(`
        SELECT COUNT(*) as total FROM departments 
        WHERE status = 'active' AND managerId IS NOT NULL
      `);
      
      // 获取部门管理员总数
      const [adminCount] = await connection.execute(`
        SELECT COUNT(*) as total FROM users 
        WHERE role = 'dept_admin' AND status = 'active'
      `);
      
      // 获取各部门成员数量
      const [memberStats] = await connection.execute(`
        SELECT 
          d.name as departmentName,
          COUNT(u._id) as memberCount
        FROM departments d
        LEFT JOIN users u ON d._id = u.departmentId AND u.status = 'active'
        WHERE d.status = 'active'
        GROUP BY d._id, d.name
        ORDER BY memberCount DESC
      `);
      
      return {
        totalDepartments: deptCount[0].total,
        managedDepartments: managedDeptCount[0].total,
        totalAdmins: adminCount[0].total,
        departmentMemberStats: memberStats
      };
      
    } catch (error) {
      logger.error('获取部门统计数据失败:', error);
      throw error;
    } finally {
      if (connection) await connection.release();
    }
  }
}

module.exports = new DepartmentService();