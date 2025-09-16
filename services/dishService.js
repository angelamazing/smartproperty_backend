const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class DishService {
  /**
   * 获取菜品列表
   * @param {Object} db - 数据库连接
   * @param {Object} params - 查询参数
   */
  async getDishList(db, params) {
    let connection;
    
    try {
      const { page = 1, pageSize = 20, size = pageSize, categoryId, keyword, status, minPrice, maxPrice, mealType, isRecommended } = params;
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
      
      // 新增：按餐次类型筛选
      if (mealType) {
        whereClause += ' AND JSON_CONTAINS(d.meal_types, JSON_QUOTE(?))';
        queryParams.push(mealType);
      }
      
      // 新增：按推荐状态筛选
      if (isRecommended !== undefined) {
        whereClause += ' AND d.isRecommended = ?';
        queryParams.push(isRecommended ? 1 : 0);
      }
      
      // 查询总数
      const countSql = `
        SELECT COUNT(*) as total 
        FROM dishes d 
        ${whereClause}
      `;
      
      // 使用更安全的连接方式
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
          d.status,
          d.meal_types,
          d.isRecommended,
          d.calories,
          d.protein,
          d.fat,
          d.carbohydrate
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
            tags: dish.tags ? (typeof dish.tags === 'string' ? JSON.parse(dish.tags) : dish.tags) : [],
            meal_types: dish.meal_types ? (typeof dish.meal_types === 'string' ? JSON.parse(dish.meal_types) : dish.meal_types) : ['breakfast', 'lunch', 'dinner']
          };
        } catch (parseError) {
          logger.warn('解析菜品数据失败:', parseError.message, '原始数据:', dish);
          return {
            ...dish,
            tags: [],
            meal_types: ['breakfast', 'lunch', 'dinner']
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
    } finally {
      if (connection) {
        connection.release();
      }
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
          u1.nickName as createByName
        FROM dishes d
        LEFT JOIN dish_categories dc ON d.categoryId = dc._id
        LEFT JOIN users u1 ON d.createBy = u1._id
        WHERE d._id = ? AND d.status != "deleted"
      `;
      
      const [dishes] = await db.execute(sql, [dishId]);
      
      if (dishes.length === 0) {
        return null;
      }
      
      const dish = dishes[0];
      
      // 处理JSON字段
      try {
        if (dish.tags) {
          dish.tags = JSON.parse(dish.tags);
        }
      } catch (parseError) {
        logger.warn('解析菜品tags失败:', parseError.message, '原始数据:', dish.tags);
        dish.tags = [];
      }
      
      return dish;
    } catch (error) {
      logger.error('获取菜品详情失败:', error);
      throw error;
    }
  }

  /**
   * 创建菜品
   * @param {Object} db - 数据库连接
   * @param {Object} dishData - 菜品数据
   * @param {string} userId - 创建者ID
   */
  async createDish(db, dishData, userId) {
    try {
      const dishId = uuidv4();
      
      // 处理 undefined 值，转换为 null
      const safeDescription = dishData.description || null;
      const safeImage = dishData.image || null;
      const safeCalories = dishData.calories !== undefined ? dishData.calories : null;
      const safeProtein = dishData.protein !== undefined ? dishData.protein : null;
      const safeFat = dishData.fat !== undefined ? dishData.fat : null;
      const safeCarbohydrate = dishData.carbohydrate !== undefined ? dishData.carbohydrate : null;
      const safeUserId = userId || null;
      
      const sql = `
        INSERT INTO dishes (
          _id, name, categoryId, description, price, image, 
          calories, protein, fat, carbohydrate, tags, 
          status, isRecommended, createTime, updateTime, createBy
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?)
      `;
      
      const params = [
        dishId,
        dishData.name,
        dishData.categoryId,
        safeDescription,
        dishData.price || 0,
        safeImage,
        safeCalories,
        safeProtein,
        safeFat,
        safeCarbohydrate,
        dishData.tags ? JSON.stringify(dishData.tags) : '[]',
        dishData.status || 'active',
        dishData.isRecommended ? 1 : 0,
        safeUserId
      ];
      
      await db.execute(sql, params);
      
      return { _id: dishId };
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
   * @param {string} userId - 更新者ID
   */
  async updateDish(db, dishId, dishData, userId) {
    try {
      const updateFields = [];
      const updateValues = [];
      
      // 定义可更新的字段及其处理方式
      const fieldMappings = {
        name: (value) => value,
        categoryId: (value) => value,
        description: (value) => value || null,
        price: (value) => value !== undefined ? value : 0,
        image: (value) => value || null,
        calories: (value) => value !== undefined ? value : null,
        protein: (value) => value !== undefined ? value : null,
        fat: (value) => value !== undefined ? value : null,
        carbohydrate: (value) => value !== undefined ? value : null,
        tags: (value) => value ? JSON.stringify(value) : '[]',
        status: (value) => value || 'active',
        isRecommended: (value) => value ? 1 : 0,
        mealTypes: (value) => value ? JSON.stringify(value) : JSON.stringify(['breakfast', 'lunch', 'dinner'])
      };
      
      // 只更新提供的字段
      Object.keys(fieldMappings).forEach(field => {
        if (dishData[field] !== undefined) {
          // 特殊处理 mealTypes 字段，映射到数据库的 meal_types 列
          const dbField = field === 'mealTypes' ? 'meal_types' : field;
          updateFields.push(`${dbField} = ?`);
          updateValues.push(fieldMappings[field](dishData[field]));
        }
      });
      
      if (updateFields.length === 0) {
        throw new Error('没有可更新的字段');
      }
      
      // 添加更新时间
      updateFields.push('updateTime = NOW()');
      
      const sql = `UPDATE dishes SET ${updateFields.join(', ')} WHERE _id = ?`;
      updateValues.push(dishId);
      
      await db.execute(sql, updateValues);
      
      return { _id: dishId };
    } catch (error) {
      logger.error('更新菜品失败:', error);
      throw error;
    }
  }

  /**
   * 删除菜品
   * @param {Object} db - 数据库连接
   * @param {string} dishId - 菜品ID
   * @param {string} userId - 删除者ID
   */
  async deleteDish(db, dishId, userId) {
    try {
      const sql = `
        UPDATE dishes SET 
          status = 'deleted', updateTime = NOW()
        WHERE _id = ?
      `;
      
      await db.execute(sql, [dishId]);
      
      return { _id: dishId };
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
   * @param {string} userId - 操作者ID
   */
  async batchUpdateDishStatus(db, dishIds, status, userId) {
    try {
      const sql = `
        UPDATE dishes SET 
          status = ?, updateTime = NOW()
        WHERE _id IN (${dishIds.map(() => '?').join(',')})
      `;
      
      const params = [status, ...dishIds];
      await db.execute(sql, params);
      
      return { updatedCount: dishIds.length };
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
   * @param {string} userId - 操作者ID
   */
  async uploadDishImage(db, dishId, imageUrl, userId) {
    try {
      const sql = `
        UPDATE dishes SET 
          image = ?, updateTime = NOW()
        WHERE _id = ?
      `;
      
      await db.execute(sql, [imageUrl, dishId]);
      
      return { _id: dishId, image: imageUrl };
    } catch (error) {
      logger.error('上传菜品图片失败:', error);
      throw error;
    }
  }

  /**
   * 获取可用菜品列表（用于菜单选择）
   * @param {Object} db - 数据库连接
   * @param {Object} params - 查询参数
   */
  async getAvailableDishes(db, params) {
    let connection;
    
    try {
      const { pageSize = 100, categoryId, keyword, status = 'active' } = params;
      
      // 构建查询条件
      let whereClause = 'WHERE d.status = "active"';
      const queryParams = [];
      
      if (categoryId) {
        whereClause += ' AND d.categoryId = ?';
        queryParams.push(categoryId);
      }
      
      if (keyword) {
        whereClause += ' AND (d.name LIKE ? OR d.description LIKE ?)';
        const keywordParam = `%${keyword}%`;
        queryParams.push(keywordParam, keywordParam);
      }
      
      // 查询菜品列表
      const sql = `
        SELECT 
          d._id,
          d.name,
          d.description,
          d.price,
          d.categoryId,
          dc.name as categoryName,
          d.image,
          d.calories,
          d.protein,
          d.fat,
          d.carbohydrate,
          d.tags,
          d.isRecommended
        FROM dishes d
        LEFT JOIN dish_categories dc ON d.categoryId = dc._id
        ${whereClause}
        ORDER BY dc.sort ASC, d.name ASC
        LIMIT ${pageSize}
      `;
      
      // 使用更安全的连接方式
      connection = await db.getConnection();
      const [dishes] = await connection.execute(sql, queryParams);
      
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
      
      return processedDishes;
      
    } catch (error) {
      logger.error('获取可用菜品失败:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
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
          _id, name, description, icon, sort, status, 
          createTime, updateTime, createBy
        FROM dish_categories 
        WHERE status != 'deleted'
        ORDER BY sort ASC, createTime DESC
      `;
      
      const [categories] = await db.execute(sql);
      
      return categories;
    } catch (error) {
      logger.error('获取菜品分类列表失败:', error);
      throw error;
    }
  }

  /**
   * 创建菜品分类
   * @param {Object} db - 数据库连接
   * @param {Object} categoryData - 分类数据
   * @param {string} userId - 创建者ID
   */
  async createDishCategory(db, categoryData, userId) {
    try {
      const categoryId = uuidv4();
      const sql = `
        INSERT INTO dish_categories (
          _id, name, description, icon, sort, status, 
          createTime, updateTime, createBy
        ) VALUES (?, ?, ?, ?, ?, 'active', NOW(), NOW(), ?)
      `;
      
      const params = [
        categoryId,
        categoryData.name,
        categoryData.description || '',
        categoryData.icon || '',
        categoryData.sort || 0,
        userId
      ];
      
      await db.execute(sql, params);
      
      return { _id: categoryId };
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
   * @param {string} userId - 更新者ID
   */
  async updateDishCategory(db, categoryId, categoryData, userId) {
    try {
      const sql = `
        UPDATE dish_categories SET 
          name = ?, description = ?, icon = ?, sort = ?, 
          updateTime = NOW()
        WHERE _id = ?
      `;
      
      const params = [
        categoryData.name,
        categoryData.description || '',
        categoryData.icon || '',
        categoryData.sort || 0,
        categoryId
      ];
      
      await db.execute(sql, params);
      
      return { _id: categoryId };
    } catch (error) {
      logger.error('更新菜品分类失败:', error);
      throw error;
    }
  }

  /**
   * 获取菜单的菜品列表
   * @param {Object} db - 数据库连接
   * @param {string} menuId - 菜单ID
   */
  async getMenuDishes(db, menuId) {
    let connection;
    
    try {
      const sql = `
        SELECT 
          md._id,
          md.menuId,
          md.dishId,
          md.price,
          md.sort,
          d.name as dishName,
          d.description as dishDescription,
          d.image as dishImage,
          dc.name as categoryName
        FROM menu_dishes md
        LEFT JOIN dishes d ON md.dishId = d._id
        LEFT JOIN dish_categories dc ON d.categoryId = dc._id
        WHERE md.menuId = ?
        ORDER BY md.sort ASC
      `;
      
      connection = await db.getConnection();
      const [dishes] = await connection.execute(sql, [menuId]);
      
      return dishes;
      
    } catch (error) {
      logger.error('获取菜单菜品失败:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  /**
   * 设置菜单菜品
   * @param {Object} db - 数据库连接
   * @param {string} menuId - 菜单ID
   * @param {Array} dishItems - 菜品项目数组 [{dishId, price, sort}]
   */
  async setMenuDishes(db, menuId, dishItems) {
    let connection;
    
    try {
      connection = await db.getConnection();
      
      // 开始事务
      await connection.beginTransaction();
      
      try {
        // 删除现有菜品关联
        await connection.execute('DELETE FROM menu_dishes WHERE menuId = ?', [menuId]);
        
        // 插入新的菜品关联
        if (dishItems && dishItems.length > 0) {
          const insertSql = `
            INSERT INTO menu_dishes (_id, menuId, dishId, price, sort, createTime) 
            VALUES (UUID(), ?, ?, ?, ?, NOW())
          `;
          
          for (const item of dishItems) {
            await connection.execute(insertSql, [
              menuId,
              item.dishId,
              item.price || 0,
              item.sort || 0
            ]);
          }
        }
        
        // 提交事务
        await connection.commit();
        
        return { success: true, message: '菜单菜品设置成功' };
        
      } catch (error) {
        // 回滚事务
        await connection.rollback();
        throw error;
      }
      
    } catch (error) {
      logger.error('设置菜单菜品失败:', error);
      throw error;
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
}

module.exports = new DishService();
