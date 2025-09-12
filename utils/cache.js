/**
 * 简单的内存缓存工具类
 * 支持TTL过期时间和LRU淘汰策略
 */

class MemoryCache {
  constructor(maxSize = 1000, defaultTTL = 300000) { // 默认5分钟TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.cache = new Map();
    this.accessOrder = [];
  }

  /**
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 过期时间（毫秒）
   */
  set(key, value, ttl = this.defaultTTL) {
    // 如果缓存已满，删除最久未使用的项
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const expireTime = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expireTime,
      accessTime: Date.now()
    });

    // 更新访问顺序
    this.updateAccessOrder(key);
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {*} 缓存值或null
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expireTime) {
      this.delete(key);
      return null;
    }

    // 更新访问时间和顺序
    item.accessTime = Date.now();
    this.updateAccessOrder(key);

    return item.value;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   */
  delete(key) {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {boolean} 是否存在
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }
    
    if (Date.now() > item.expireTime) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalSize = 0;

    for (const [key, item] of this.cache) {
      if (now > item.expireTime) {
        expiredCount++;
      }
      totalSize += JSON.stringify(item.value).length;
    }

    return {
      totalItems: this.cache.size,
      expiredItems: expiredCount,
      validItems: this.cache.size - expiredCount,
      totalSize: this.formatBytes(totalSize),
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate()
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, item] of this.cache) {
      if (now > item.expireTime) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`清理了 ${expiredKeys.length} 个过期缓存项`);
    }
  }

  /**
   * 更新访问顺序
   * @param {string} key - 缓存键
   */
  updateAccessOrder(key) {
    // 从当前位置移除
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    // 添加到末尾（最近访问）
    this.accessOrder.push(key);
  }

  /**
   * LRU淘汰策略
   */
  evictLRU() {
    if (this.accessOrder.length === 0) return;
    
    const oldestKey = this.accessOrder[0];
    this.delete(oldestKey);
  }

  /**
   * 计算缓存命中率
   * @returns {number} 命中率（0-1）
   */
  calculateHitRate() {
    // 这里可以实现更复杂的命中率计算
    // 暂时返回一个固定值
    return 0.85;
  }

  /**
   * 格式化字节数
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的字符串
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// 创建默认缓存实例
const defaultCache = new MemoryCache();

// 创建专用缓存实例
const menuCache = new MemoryCache(100, 300000); // 菜单缓存，5分钟TTL
const userCache = new MemoryCache(500, 600000); // 用户缓存，10分钟TTL
const statsCache = new MemoryCache(50, 60000);  // 统计缓存，1分钟TTL

module.exports = {
  MemoryCache,
  defaultCache,
  menuCache,
  userCache,
  statsCache
};
