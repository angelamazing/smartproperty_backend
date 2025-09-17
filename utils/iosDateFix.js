/**
 * iOS日期处理修复工具
 * 解决iOS设备上日期处理导致的Maximum call stack size exceeded错误
 */

class IOSDateFix {
  /**
   * 安全创建Date对象，避免iOS递归调用问题
   * @param {string|Date|number} dateInput - 日期输入
   * @returns {Date|null} Date对象或null
   */
  static safeCreateDate(dateInput) {
    try {
      if (!dateInput) return null;
      
      // 如果是Date对象，直接返回
      if (dateInput instanceof Date) {
        return dateInput;
      }
      
      // 如果是数字，直接创建Date对象
      if (typeof dateInput === 'number') {
        return new Date(dateInput);
      }
      
      // 如果是字符串，进行安全处理
      if (typeof dateInput === 'string') {
        // 处理ISO格式字符串
        if (dateInput.includes('T') && dateInput.includes('Z')) {
          // 使用正则表达式验证ISO格式
          const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
          if (isoRegex.test(dateInput)) {
            return new Date(dateInput);
          }
        }
        
        // 处理其他格式的日期字符串
        const dateStr = dateInput.trim();
        if (dateStr) {
          return new Date(dateStr);
        }
      }
      
      return null;
    } catch (error) {
      console.error('iOS日期创建失败:', dateInput, error);
      return null;
    }
  }

  /**
   * 安全格式化时间，避免递归调用
   * @param {string|Date} time - 时间
   * @param {string} format - 格式
   * @returns {string} 格式化后的时间字符串
   */
  static safeFormatTime(time, format = 'YYYY-MM-DD HH:mm:ss') {
    try {
      const date = this.safeCreateDate(time);
      if (!date || isNaN(date.getTime())) {
        return '';
      }

      // 避免在格式化过程中再次调用可能有问题的方法
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');

      return format
        .replace('YYYY', year)
        .replace('MM', month)
        .replace('DD', day)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
    } catch (error) {
      console.error('iOS时间格式化失败:', time, error);
      return '';
    }
  }

  /**
   * 安全转换UTC时间为北京时间
   * @param {string|Date} utcTime - UTC时间
   * @returns {Date|null} 北京时间Date对象
   */
  static safeToBeijingTime(utcTime) {
    try {
      const date = this.safeCreateDate(utcTime);
      if (!date || isNaN(date.getTime())) {
        return null;
      }

      // 直接计算北京时间，避免递归调用
      const beijingTime = new Date(date.getTime() + 8 * 60 * 60 * 1000);
      return beijingTime;
    } catch (error) {
      console.error('iOS UTC转北京时间失败:', utcTime, error);
      return null;
    }
  }

  /**
   * 安全转换北京时间为UTC时间
   * @param {string|Date} beijingTime - 北京时间
   * @returns {Date|null} UTC时间Date对象
   */
  static safeToUTCTime(beijingTime) {
    try {
      const date = this.safeCreateDate(beijingTime);
      if (!date || isNaN(date.getTime())) {
        return null;
      }

      // 直接计算UTC时间，避免递归调用
      const utcTime = new Date(date.getTime() - 8 * 60 * 60 * 1000);
      return utcTime;
    } catch (error) {
      console.error('iOS北京时间转UTC失败:', beijingTime, error);
      return null;
    }
  }

  /**
   * 获取当前北京时间
   * @returns {Date} 当前北京时间
   */
  static getCurrentBeijingTime() {
    try {
      const now = new Date();
      return new Date(now.getTime() + 8 * 60 * 60 * 1000);
    } catch (error) {
      console.error('iOS获取当前北京时间失败:', error);
      return new Date();
    }
  }

  /**
   * 检查日期是否有效
   * @param {string|Date} date - 日期
   * @returns {boolean} 是否有效
   */
  static isValidDate(date) {
    try {
      const dateObj = this.safeCreateDate(date);
      return dateObj && !isNaN(dateObj.getTime());
    } catch (error) {
      return false;
    }
  }

  /**
   * 比较两个日期
   * @param {string|Date} date1 - 日期1
   * @param {string|Date} date2 - 日期2
   * @returns {number} 比较结果 (-1: date1 < date2, 0: 相等, 1: date1 > date2)
   */
  static compareDates(date1, date2) {
    try {
      const d1 = this.safeCreateDate(date1);
      const d2 = this.safeCreateDate(date2);
      
      if (!d1 || !d2) return 0;
      
      if (d1.getTime() < d2.getTime()) return -1;
      if (d1.getTime() > d2.getTime()) return 1;
      return 0;
    } catch (error) {
      console.error('iOS日期比较失败:', date1, date2, error);
      return 0;
    }
  }

  /**
   * 获取相对时间描述
   * @param {string|Date} time - 时间
   * @returns {string} 相对时间描述
   */
  static getRelativeTime(time) {
    try {
      const date = this.safeCreateDate(time);
      if (!date || isNaN(date.getTime())) {
        return '';
      }

      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) return `${days}天前`;
      if (hours > 0) return `${hours}小时前`;
      if (minutes > 0) return `${minutes}分钟前`;
      return '刚刚';
    } catch (error) {
      console.error('iOS获取相对时间失败:', time, error);
      return '';
    }
  }
}

module.exports = IOSDateFix;
