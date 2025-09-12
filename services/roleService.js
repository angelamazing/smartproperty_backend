const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class RoleService {
  /**
   * 获取角色列表
   * @param {Object} db - 数据库连接
   * @param {Object} params - 查询参数
   */
  async getRoleList(db, params) {
    try {
      const { page = 1, size = 20, keyword, status } = params;
      const offset = (page - 1) * size;
      
      // 构建查询条件
      let whereClause = 'WHERE r.status != "deleted"';
      const queryParams = [];
      
      if (status) {
        whereClause += ' AND r.status = ?';
        queryParams.push(status);
      }
      
      if (keyword) {
        whereClause += ' AND (r.name LIKE ? OR r.description LIKE ?)';
        const keywordParam = `%${keyword}%`;
        queryParams.push(keywordParam, keywordParam);
      }
      
      // 查询总数
      const countSql = `
        SELECT COUNT(*) as total 
        FROM roles r 
        ${whereClause}
      `;
      
      const [countResult] = await db.execute(countSql, queryParams);
      const total = countResult[0].total;
      
      // 查询角色列表
      const listSql = `
        SELECT 
          r.id,
          r.name,
          r.description,
          r.status,
          r.create_time,
          r.update_time,
          COUNT(u._id) as userCount
        FROM roles r
        LEFT JOIN users u ON r.id = u.role AND u.status = 'active'
        ${whereClause}
        GROUP BY r.id
        ORDER BY r.create_time ASC
        LIMIT ? OFFSET ?
      `;
      
      const [roles] = await db.execute(listSql, [...queryParams, size, offset]);
      
      return {
        list: roles,
        pagination: {
          page,
          size,
          total,
          totalPages: Math.ceil(total / size)
        }
      };
      
    } catch (error) {
      logger.error('获取角色列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取角色详情
   * @param {Object} db - 数据库连接
   * @param {string} roleId - 角色ID
   */
  async getRoleDetail(db, roleId) {
    try {
      const sql = `
        SELECT 
          r.*,
          u1.nickName as createByName,
          u2.nickName as updateByName
        FROM roles r
        LEFT JOIN users u1 ON r.create_by = u1._id
        LEFT JOIN users u2 ON r.update_by = u2._id
        WHERE r.id = ? AND r.status != "deleted"
      `;
      
      const [roles] = await db.execute(sql, [roleId]);
      
      if (roles.length === 0) {
        return null;
      }
      
      return roles[0];
      
    } catch (error) {
      logger.error('获取角色详情失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建角色
   * @param {Object} db - 数据库连接
   * @param {Object} roleData - 角色数据
   * @param {string} userId - 创建人ID
   */
  async createRole(db, roleData, userId) {
    try {
      const roleId = uuidv4();
      const { name, description, permissions = [] } = roleData;
      
      // 检查角色名是否已存在
      const existingRole = await this.getRoleByName(db, name);
      if (existingRole) {
        throw new Error('角色名已存在');
      }
      
                    const sql = `
        INSERT INTO roles (
          id, name, description, status, create_time, update_time, create_by
        ) VALUES (?, ?, ?, 'active', NOW(), NOW(), ?)
      `;
      
              await db.execute(sql, [roleId, name, description, userId]);
      
      // 如果有权限数据，创建角色权限关联
      if (permissions.length > 0) {
        await this.createRolePermissions(db, roleId, permissions);
      }
      
      logger.info('角色创建成功:', { roleId, name, userId });
      
      return {
        roleId,
        name,
        level,
        createTime: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('创建角色失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新角色
   * @param {Object} db - 数据库连接
   * @param {string} roleId - 角色ID
   * @param {Object} roleData - 更新数据
   * @param {string} userId - 更新人ID
   */
  async updateRole(db, roleId, roleData, userId) {
    try {
      // 检查角色是否存在
      const existingRole = await this.getRoleDetail(db, roleId);
      if (!existingRole) {
        throw new Error('角色不存在');
      }
      
      // 如果要更新角色名，检查是否重复
      if (roleData.name && roleData.name !== existingRole.name) {
        const duplicateRole = await this.getRoleByName(db, roleData.name);
        if (duplicateRole) {
          throw new Error('角色名已存在');
        }
      }
      
      const updateFields = [];
      const params = [];
      
      // 动态构建更新字段
      if (roleData.name !== undefined) {
        updateFields.push('name = ?');
        params.push(roleData.name);
      }
      
      if (roleData.description !== undefined) {
        updateFields.push('description = ?');
        params.push(roleData.description);
      }
      
      // level字段暂时不处理，因为现有表结构中没有这个字段
      
      if (roleData.status !== undefined) {
        updateFields.push('status = ?');
        params.push(roleData.status);
      }
      
      if (updateFields.length === 0) {
        throw new Error('没有需要更新的字段');
      }
      
      updateFields.push('update_time = NOW()');
      updateFields.push('update_by = ?');
      params.push(userId, roleId);
      
      const sql = `
        UPDATE roles 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      await db.execute(sql, params);
      
      logger.info('角色更新成功:', { roleId, updatedFields: updateFields.slice(0, -2), userId });
      
      return {
        roleId,
        updateTime: new Date().toISOString(),
        updatedFields: updateFields.slice(0, -2)
      };
      
    } catch (error) {
      logger.error('更新角色失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除角色
   * @param {Object} db - 数据库连接
   * @param {string} roleId - 角色ID
   * @param {string} userId - 删除人ID
   */
  async deleteRole(db, roleId, userId) {
    try {
      // 检查角色是否存在
      const existingRole = await this.getRoleDetail(db, roleId);
      if (!existingRole) {
        throw new Error('角色不存在');
      }
      
      // 检查是否有用户使用该角色
      const userCount = await this.getRoleUserCount(db, roleId);
      if (userCount > 0) {
        throw new Error(`该角色下还有 ${userCount} 个用户，无法删除`);
      }
      
      // 软删除
      const sql = `
        UPDATE roles 
        SET status = 'deleted', update_time = NOW(), update_by = ?
        WHERE id = ?
      `;
      
      await db.execute(sql, [userId, roleId]);
      
      // 删除角色权限关联
      await this.deleteRolePermissions(db, roleId);
      
      logger.info('角色删除成功:', { roleId, userId });
      
      return {
        roleId,
        deleteTime: new Date().toISOString(),
        deletedBy: userId
      };
      
    } catch (error) {
      logger.error('删除角色失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取角色权限
   * @param {Object} db - 数据库连接
   * @param {string} roleId - 角色ID
   */
  async getRolePermissions(db, roleId) {
    try {
      const sql = `
        SELECT 
          rp.permissionId,
          p.name as permissionName,
          p.description as permissionDescription,
          p.module,
          p.action
        FROM role_permissions rp
        JOIN permissions p ON rp.permissionId = p._id
        WHERE rp.roleId = ? AND p.status = 'active'
        ORDER BY p.module ASC, p.action ASC
      `;
      
      const [permissions] = await db.execute(sql, [roleId]);
      
      return permissions;
      
    } catch (error) {
      logger.error('获取角色权限失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新角色权限
   * @param {Object} db - 数据库连接
   * @param {string} roleId - 角色ID
   * @param {Array} permissions - 权限ID数组
   * @param {string} userId - 操作人ID
   */
  async updateRolePermissions(db, roleId, permissions, userId) {
    try {
      // 删除现有权限
      await this.deleteRolePermissions(db, roleId);
      
      // 添加新权限
      if (permissions.length > 0) {
        await this.createRolePermissions(db, roleId, permissions);
      }
      
      logger.info('角色权限更新成功:', { roleId, permissions, userId });
      
      return {
        roleId,
        permissions,
        updateTime: new Date().toISOString(),
        updateBy: userId
      };
      
    } catch (error) {
      logger.error('更新角色权限失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取权限列表
   * @param {Object} db - 数据库连接
   */
  async getPermissionList(db) {
    try {
      const sql = `
        SELECT 
          _id,
          name,
          description,
          module,
          action,
          status,
          createTime
        FROM permissions
        WHERE status = 'active'
        ORDER BY module ASC, action ASC
      `;
      
      const [permissions] = await db.execute(sql);
      
      return permissions;
      
    } catch (error) {
      logger.error('获取权限列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 批量分配角色
   * @param {Object} db - 数据库连接
   * @param {Array} userIds - 用户ID数组
   * @param {string} roleId - 角色ID
   * @param {string} operatorId - 操作人ID
   */
  async batchAssignRole(db, userIds, roleId, operatorId) {
    try {
      // 检查角色是否存在
      const role = await this.getRoleDetail(db, roleId);
      if (!role) {
        throw new Error('角色不存在');
      }
      
      let successCount = 0;
      let failedCount = 0;
      const failedUserIds = [];
      
      for (const userId of userIds) {
        try {
          const sql = `
            UPDATE users 
            SET role = ?, updateTime = NOW(), updateBy = ?
            WHERE _id = ? AND status = 'active'
          `;
          
          const [result] = await db.execute(sql, [roleId, operatorId, userId]);
          
          if (result.affectedRows > 0) {
            successCount++;
          } else {
            failedCount++;
            failedUserIds.push(userId);
          }
        } catch (error) {
          failedCount++;
          failedUserIds.push(userId);
          logger.error(`分配角色失败，用户ID: ${userId}`, error);
        }
      }
      
      logger.info('批量分配角色完成:', { userIds, roleId, successCount, failedCount, operatorId });
      
      return {
        totalCount: userIds.length,
        successCount,
        failedCount,
        failedUserIds,
        assignTime: new Date().toISOString(),
        assignedBy: operatorId
      };
      
    } catch (error) {
      logger.error('批量分配角色失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取角色用户列表
   * @param {Object} db - 数据库连接
   * @param {string} roleId - 角色ID
   * @param {Object} params - 分页参数
   */
  async getRoleUsers(db, roleId, params) {
    try {
      const { page = 1, size = 20 } = params;
      const offset = (page - 1) * size;
      
      // 查询总数
      const countSql = `
        SELECT COUNT(*) as total 
        FROM users 
        WHERE role = ? AND status = 'active'
      `;
      
      const [countResult] = await db.execute(countSql, [roleId]);
      const total = countResult[0].total;
      
      // 查询用户列表
      const listSql = `
        SELECT 
          _id,
          nickName,
          realName,
          phoneNumber,
          email,
          department,
          position,
          status,
          createTime,
          lastLoginTime
        FROM users
        WHERE role = ? AND status = 'active'
        ORDER BY createTime DESC
        LIMIT ? OFFSET ?
      `;
      
      const [users] = await db.execute(listSql, [roleId, size, offset]);
      
      return {
        list: users,
        pagination: {
          page,
          size,
          total,
          totalPages: Math.ceil(total / size)
        }
      };
      
    } catch (error) {
      logger.error('获取角色用户列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 根据角色名获取角色
   * @param {Object} db - 数据库连接
   * @param {string} name - 角色名
   */
  async getRoleByName(db, name) {
    try {
      const sql = `
        SELECT * FROM roles 
        WHERE name = ? AND status != 'deleted'
      `;
      
      const [roles] = await db.execute(sql, [name]);
      
      return roles.length > 0 ? roles[0] : null;
      
    } catch (error) {
      logger.error('根据角色名获取角色失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取角色用户数量
   * @param {Object} db - 数据库连接
   * @param {string} roleId - 角色ID
   */
  async getRoleUserCount(db, roleId) {
    try {
      const sql = `
        SELECT COUNT(*) as count 
        FROM users 
        WHERE role = ? AND status = 'active'
      `;
      
      const [result] = await db.execute(sql, [roleId]);
      
      return result[0].count;
      
    } catch (error) {
      logger.error('获取角色用户数量失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建角色权限关联
   * @param {Object} db - 数据库连接
   * @param {string} roleId - 角色ID
   * @param {Array} permissionIds - 权限ID数组
   */
  async createRolePermissions(db, roleId, permissionIds) {
    try {
      for (const permissionId of permissionIds) {
        const sql = `
          INSERT INTO role_permissions (roleId, permissionId, createTime)
          VALUES (?, ?, NOW())
        `;
        
        await db.execute(sql, [roleId, permissionId]);
      }
      
      logger.info('角色权限关联创建成功:', { roleId, permissionIds });
      
    } catch (error) {
      logger.error('创建角色权限关联失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除角色权限关联
   * @param {Object} db - 数据库连接
   * @param {string} roleId - 角色ID
   */
  async deleteRolePermissions(db, roleId) {
    try {
      const sql = `
        DELETE FROM role_permissions 
        WHERE roleId = ?
      `;
      
      await db.execute(sql, [roleId]);
      
      logger.info('角色权限关联删除成功:', { roleId });
      
    } catch (error) {
      logger.error('删除角色权限关联失败:', error);
      throw error;
    }
  }
}

module.exports = new RoleService();
