const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class DishService {
  /**
   * 获取菜品列表
   * @param {Object} db - 数据库连接
   * @param {Object} params - 查询参数
   */
  async getDishList(db, params) {
    try {
      const { page = 1, pageSize = 20, size = pageSize, categoryId, keyword, status, minPrice, maxPrice } = params;
      const offset = (page - 1) * size;
      
      // 构建查询条件
      let whereClause = 'WHERE d.status != "deleted"';
      const queryParams = [];
      
      if (categoryId) {
        whereClause += ' AND d.categoryId = ?';
        queryParams.push(categoryId);
      }
      
      if (status) {
        whereClause += ' AND d.status = ?';
        queryParams.push(status);
      }
      
      if (keyword) {
        whereClause += ' AND (d.name LIKE ? OR d.description LIKE ?)';
        const keywordParam = `%${keyword}%`;
        queryParams.push(keywordParam, keywordParam);
      }
      
      if (minPrice !== undefined) {
        whereClause += ' AND d.price >= ?';
        queryParams.push(minPrice);
      }
      
      if (maxPrice !== undefined) {
        whereClause += ' AND d.price <= ?';
        queryParams.push(maxPrice);
      }
      
      // 查询总数
      const countSql = `
        SELECT COUNT(*) as total 
        FROM dishes d 
        ${whereClause}
      `;
      
      // 使用更安全的连接方式
      let connection;
      try {
        connection = await db.getConnection();
        
        const [countResult] = await connection.execute(countSql, queryParams);
        const total = parseInt(countResult[0].total);
        
        // 查询菜品列表
        const listSql = `
          SELECT 
            d._id,
            d.name,
            d.description,
            d.price,
            d.categoryId,
            COALESCE(dc.name, '') as categoryName,
            COALESCE(d.image, '') as image,
            COALESCE(d.tags, '[]') as tags,
            d.status
          FROM dishes d
          LEFT JOIN dish_categories dc ON d.categoryId = dc._id
          ${whereClause}
          ORDER BY d._id DESC
          LIMIT ? OFFSET ?
        `;
        
        // MySQL2不支持LIMIT子句的参数绑定，使用字符串插值
        const finalSql = listSql.replace('LIMIT ? OFFSET ?', `LIMIT ${size} OFFSET ${offset}`);
        const [dishes] = await connection.execute(finalSql, queryParams);
        
        // 处理数据
        const processedDishes = dishes.map(dish => {
          try {
            return {
              ...dish,
              tags: dish.tags ? JSON.parse(dish.tags) : []
            };
          } catch (parseError) {
            logger.warn('解析菜品tags失败:', parseError.message, '原始数据:', dish.tags);
            return {
              ...dish,
              tags: []
            };
          }
        });
        
        return {
          list: processedDishes,
          pagination: {
            page,
            size,
            total,
            totalPages: Math.ceil(total / size)
          }
        };
        
      } finally {
        if (connection) {
          connection.release();
        }
      }
      const processedDishes = dishes.map(dish => {
        try {
          return {
            ...dish,
            tags: dish.tags ? JSON.parse(dish.tags) : []
          };
        } catch (parseError) {
          logger.warn('解析菜品tags失败:', parseError.message, '原始数据:', dish.tags);
          return {
            ...dish,
            tags: []
          };
        }
      });
      
      return {
        list: processedDishes,
        pagination: {
          page,
          size,
          total,
          totalPages: Math.ceil(total / size)
        }
      };
      
    } catch (error) {
      logger.error('获取菜品列表失败:', error);
      logger.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState
      });
      throw error;
    }
  }
  
  /**
   * 获取菜品详情
   * @param {Object} db - 数据库连接
   * @param {string} dishId - 菜品ID
   */
  async getDishDetail(db, dishId) {
    try {
      const sql = `
        SELECT 
          d.*,
          dc.name as categoryName,
          u1.nickName as createByName,
          u2.nickName as updateByName
        FROM dishes d
        LEFT JOIN dish_categories dc ON d.categoryId = dc._id
        LEFT JOIN users u1 ON d.createBy = u1._id
        LEFT JOIN users u2 ON d.updateBy = u2._id
        WHERE d._id = ? AND d.status != "deleted"
      `;
      
      const [dishes] = await db.execute(sql, [dishId]);
      
      if (dishes.length === 0) {
        return null;
      }
      
      const dish = dishes[0];
      
      // 处理JSON字段
      return {
        ...dish,
        tags: dish.tags ? JSON.parse(dish.tags) : []
      };
      
    } catch (error) {
      logger.error('获取菜品详情失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建菜品
   * @param {Object} db - 数据库连接
   * @param {Object} dishData - 菜品数据
   * @param {string} userId - 创建人ID
   */
  async createDish(db, dishData, userId) {
    try {
      const dishId = uuidv4();
              const {
          name, description, price, categoryId, image, tags
        } = dishData;
      
              const sql = `
          INSERT INTO dishes (
            _id, name, description, price, categoryId, image, tags, status, createTime, updateTime, createBy
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)
        `;
      
              const params = [
          dishId, name, description, price, categoryId, image,
          JSON.stringify(tags || []),
          'active',
          userId
        ];
      
      await db.execute(sql, params);
      
      logger.info('菜品创建成功:', { dishId, name, userId });
      
      return {
        dishId,
        name,
        price,
        createTime: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('创建菜品失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新菜品
   * @param {Object} db - 数据库连接
   * @param {string} dishId - 菜品ID
   * @param {Object} dishData - 更新数据
   * @param {string} userId - 更新人ID
   */
  async updateDish(db, dishId, dishData, userId) {
    try {
      // 检查菜品是否存在
      const existingDish = await this.getDishDetail(db, dishId);
      if (!existingDish) {
        throw new Error('菜品不存在');
      }
      
      const updateFields = [];
      const params = [];
      
      // 动态构建更新字段
      if (dishData.name !== undefined) {
        updateFields.push('name = ?');
        params.push(dishData.name);
      }
      
      if (dishData.description !== undefined) {
        updateFields.push('description = ?');
        params.push(dishData.description);
      }
      
      if (dishData.price !== undefined) {
        updateFields.push('price = ?');
        params.push(dishData.price);
      }
      
      if (dishData.categoryId !== undefined) {
        updateFields.push('categoryId = ?');
        params.push(dishData.categoryId);
      }
      
      if (dishData.image !== undefined) {
        updateFields.push('image = ?');
        params.push(dishData.image);
      }
      
      if (dishData.ingredients !== undefined) {
        updateFields.push('ingredients = ?');
        params.push(JSON.stringify(dishData.ingredients));
      }
      
      if (dishData.nutritionInfo !== undefined) {
        updateFields.push('nutritionInfo = ?');
        params.push(JSON.stringify(dishData.nutritionInfo));
      }
      
      // 这些字段在现有表结构中不存在，暂时注释掉
      // if (dishData.allergens !== undefined) {
      //   updateFields.push('allergens = ?');
      //   params.push(JSON.stringify(dishData.allergens));
      // }
      // 
      // if (dishData.spicyLevel !== undefined) {
      //   updateFields.push('spicyLevel = ?');
      //   params.push(dishData.spicyLevel);
      // }
      // 
      // if (dishData.cookingTime !== undefined) {
      //   updateFields.push('cookingTime = ?');
      //   params.push(dishData.cookingTime);
      // }
      // 
      // if (dishData.difficulty !== undefined) {
      //   updateFields.push('difficulty = ?');
      //   params.push(dishData.difficulty);
      // }
      
      if (dishData.tags !== undefined) {
        updateFields.push('tags = ?');
        params.push(JSON.stringify(dishData.tags));
      }
      
      if (updateFields.length === 0) {
        throw new Error('没有需要更新的字段');
      }
      
      updateFields.push('updateTime = NOW()');
      updateFields.push('updateBy = ?');
      params.push(userId, dishId);
      
      const sql = `
        UPDATE dishes 
        SET ${updateFields.join(', ')}
        WHERE _id = ?
      `;
      
      await db.execute(sql, params);
      
      logger.info('菜品更新成功:', { dishId, updatedFields: updateFields.slice(0, -2), userId });
      
      return {
        dishId,
        updateTime: new Date().toISOString(),
        updatedFields: updateFields.slice(0, -2)
      };
      
    } catch (error) {
      logger.error('更新菜品失败:', error);
      throw error;
    }
  }
  
  /**
   * 删除菜品
   * @param {Object} db - 数据库连接
   * @param {string} dishId - 菜品ID
   * @param {string} userId - 删除人ID
   */
  async deleteDish(db, dishId, userId) {
    try {
      // 检查菜品是否存在
      const existingDish = await this.getDishDetail(db, dishId);
      if (!existingDish) {
        throw new Error('菜品不存在');
      }
      
      // 软删除
      const sql = `
        UPDATE dishes 
        SET status = 'deleted', updateTime = NOW(), updateBy = ?
        WHERE _id = ?
      `;
      
      await db.execute(sql, [userId, dishId]);
      
      logger.info('菜品删除成功:', { dishId, userId });
      
      return {
        dishId,
        deleteTime: new Date().toISOString(),
        deletedBy: userId
      };
      
    } catch (error) {
      logger.error('删除菜品失败:', error);
      throw error;
    }
  }
  
  /**
   * 批量更新菜品状态
   * @param {Object} db - 数据库连接
   * @param {Array} dishIds - 菜品ID数组
   * @param {string} status - 新状态
   * @param {string} userId - 操作人ID
   */
  async batchUpdateDishStatus(db, dishIds, status, userId) {
    try {
      const placeholders = dishIds.map(() => '?').join(',');
      const sql = `
        UPDATE dishes 
        SET status = ?, updateTime = NOW(), updateBy = ?
        WHERE _id IN (${placeholders})
      `;
      
      const params = [status, userId, ...dishIds];
      const [result] = await db.execute(sql, params);
      
      logger.info('批量更新菜品状态成功:', { dishIds, status, updatedCount: result.affectedRows, userId });
      
      return {
        updatedCount: result.affectedRows,
        failedCount: dishIds.length - result.affectedRows,
        failedDishIds: [], // 这里可以进一步检查哪些更新失败
        updateTime: new Date().toISOString(),
        updateBy: userId
      };
      
    } catch (error) {
      logger.error('批量更新菜品状态失败:', error);
      throw error;
    }
  }
  
  /**
   * 上传菜品图片
   * @param {Object} db - 数据库连接
   * @param {string} dishId - 菜品ID
   * @param {string} imageUrl - 图片URL
   * @param {string} userId - 操作人ID
   */
  async uploadDishImage(db, dishId, imageUrl, userId) {
    try {
      const sql = `
        UPDATE dishes 
        SET image = ?, updateTime = NOW(), updateBy = ?
        WHERE _id = ?
      `;
      
      await db.execute(sql, [imageUrl, userId, dishId]);
      
      logger.info('菜品图片上传成功:', { dishId, imageUrl, userId });
      
      return {
        dishId,
        imageUrl,
        updateTime: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('上传菜品图片失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取菜品分类列表
   * @param {Object} db - 数据库连接
   */
  async getDishCategories(db) {
    try {
      const sql = `
        SELECT 
          dc._id,
          dc.name,
          dc.description,
          dc.icon,
          dc.sort,
          dc.status,
          dc.createTime,
          COUNT(d._id) as dishCount
        FROM dish_categories dc
        LEFT JOIN dishes d ON dc._id = d.categoryId AND d.status = 'active'
        WHERE dc.status = 'active'
        GROUP BY dc._id
        ORDER BY dc.sort ASC, dc.createTime ASC
      `;
      
      const [categories] = await db.execute(sql);
      
      return categories.map(category => ({
        ...category,
        dishCount: parseInt(category.dishCount)
      }));
      
    } catch (error) {
      logger.error('获取菜品分类失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建菜品分类
   * @param {Object} db - 数据库连接
   * @param {Object} categoryData - 分类数据
   * @param {string} userId - 创建人ID
   */
  async createDishCategory(db, categoryData, userId) {
    try {
      const categoryId = uuidv4();
      const { name, description, icon, sort } = categoryData;
      
      const sql = `
        INSERT INTO dish_categories (
          _id, name, description, icon, sort, status, createTime
        ) VALUES (?, ?, ?, ?, ?, 'active', NOW())
      `;
      
      await db.execute(sql, [categoryId, name, description, icon, sort || 0]);
      
      logger.info('菜品分类创建成功:', { categoryId, name, userId });
      
      return {
        categoryId,
        name,
        createTime: new Date().toISOString()
      };
      
    } catch (error) {
      logger.error('创建菜品分类失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新菜品分类
   * @param {Object} db - 数据库连接
   * @param {string} categoryId - 分类ID
   * @param {Object} categoryData - 更新数据
   * @param {string} userId - 更新人ID
   */
  async updateDishCategory(db, categoryId, categoryData, userId) {
    try {
      const updateFields = [];
      const params = [];
      
      if (categoryData.name !== undefined) {
        updateFields.push('name = ?');
        params.push(categoryData.name);
      }
      
      if (categoryData.description !== undefined) {
        updateFields.push('description = ?');
        params.push(categoryData.description);
      }
      
      if (categoryData.icon !== undefined) {
        updateFields.push('icon = ?');
        params.push(categoryData.icon);
      }
      
      if (categoryData.sort !== undefined) {
        updateFields.push('sort = ?');
        params.push(categoryData.sort);
      }
      
      if (updateFields.length === 0) {
        throw new Error('没有需要更新的字段');
      }
      
      params.push(categoryId);
      
      const sql = `
        UPDATE dish_categories 
        SET ${updateFields.join(', ')}
        WHERE _id = ?
      `;
      
      await db.execute(sql, params);
      
      logger.info('菜品分类更新成功:', { categoryId, updatedFields: updateFields, userId });
      
      return {
        categoryId,
        updateTime: new Date().toISOString(),
        updatedFields
      };
      
    } catch (error) {
      logger.error('更新菜品分类失败:', error);
      throw error;
    }
  }
}

module.exports = new DishService();
