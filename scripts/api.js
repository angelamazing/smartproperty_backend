/**
 * API工具类 - 适配代理配置
 */

// 基础配置
const API_CONFIG = {
  // 开发环境使用代理，生产环境使用完整URL
  baseURL: import.meta.env?.DEV ? '' : 'http://localhost:3000',
  timeout: 10000,
  defaultAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
};

/**
 * 处理头像URL
 * @param {string} avatarUrl - 原始头像URL
 * @param {boolean} useProxy - 是否使用代理
 * @returns {string} 处理后的URL
 */
export function processAvatarUrl(avatarUrl, useProxy = true) {
  if (!avatarUrl) {
    return API_CONFIG.defaultAvatar;
  }
  
  // 如果已经是完整URL，直接返回
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // 如果使用代理，使用相对路径
  if (useProxy) {
    // 如果是相对路径，直接使用
    if (avatarUrl.startsWith('/')) {
      return avatarUrl;
    }
    
    // 如果是文件名，添加路径
    return `/uploads/avatars/${avatarUrl}`;
  }
  
  // 如果不使用代理，使用完整URL
  return `${API_CONFIG.baseURL}/uploads/avatars/${avatarUrl}`;
}

/**
 * 获取API完整URL
 * @param {string} path - API路径
 * @returns {string} 完整URL
 */
export function getApiUrl(path) {
  if (path.startsWith('http')) {
    return path;
  }
  
  // 确保路径以/开头
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_CONFIG.baseURL}/api${apiPath}`;
}

/**
 * 通用请求方法
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise} 请求结果
 */
export async function request(url, options = {}) {
  const fullUrl = getApiUrl(url);
  
  const defaultOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: API_CONFIG.timeout,
  };
  
  const requestOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  };
  
  // 添加认证token
  const token = localStorage.getItem('token');
  if (token) {
    requestOptions.headers.Authorization = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(fullUrl, requestOptions);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API请求失败:', error);
    throw error;
  }
}

/**
 * GET请求
 * @param {string} url - 请求URL
 * @param {Object} params - 查询参数
 * @returns {Promise} 请求结果
 */
export async function get(url, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  
  return request(fullUrl, {
    method: 'GET',
  });
}

/**
 * POST请求
 * @param {string} url - 请求URL
 * @param {Object} data - 请求数据
 * @returns {Promise} 请求结果
 */
export async function post(url, data = {}) {
  return request(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT请求
 * @param {string} url - 请求URL
 * @param {Object} data - 请求数据
 * @returns {Promise} 请求结果
 */
export async function put(url, data = {}) {
  return request(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE请求
 * @param {string} url - 请求URL
 * @returns {Promise} 请求结果
 */
export async function del(url) {
  return request(url, {
    method: 'DELETE',
  });
}

/**
 * 文件上传
 * @param {string} url - 上传URL
 * @param {File} file - 文件对象
 * @param {string} fieldName - 字段名
 * @returns {Promise} 上传结果
 */
export async function uploadFile(url, file, fieldName = 'file') {
  const formData = new FormData();
  formData.append(fieldName, file);
  
  const token = localStorage.getItem('token');
  const headers = {};
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const fullUrl = getApiUrl(url);
  
  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('文件上传失败:', error);
    throw error;
  }
}

// 用户相关API
export const userApi = {
  // 获取用户信息
  getUserInfo: () => get('/user/info'),
  
  // 更新用户资料
  updateProfile: (data) => put('/user/profile', data),
  
  // 上传头像
  uploadAvatar: (file) => uploadFile('/admin/upload/avatar', file, 'avatar'),
  
  // 获取用户统计
  getStats: () => get('/user/stats'),
};

// 认证相关API
export const authApi = {
  // 登录
  login: (credentials) => post('/auth/login', credentials),
  
  // 登出
  logout: () => post('/auth/logout'),
  
  // 刷新token
  refreshToken: (refreshToken) => post('/auth/refresh-token', { refreshToken }),
  
  // 测试登录
  testLogin: (credentials) => post('/auth/test-login-sys-admin', credentials),
};

// 导出配置
export { API_CONFIG };
