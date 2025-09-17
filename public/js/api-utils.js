/**
 * 前端API工具类
 * 提供统一的API调用方法和认证处理
 */

// 基础配置
const API_CONFIG = {
  baseURL: '/api',
  timeout: 10000
};

/**
 * 获取认证token
 * @returns {string|null} 认证token
 */
function getToken() {
  return localStorage.getItem('token');
}

/**
 * 获取API完整URL
 * @param {string} path - API路径
 * @returns {string} 完整URL
 */
function getApiUrl(path) {
  if (path.startsWith('http')) {
    return path;
  }
  
  // 确保路径以/开头
  const apiPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_CONFIG.baseURL}${apiPath}`;
}

/**
 * 通用请求方法
 * @param {string} url - 请求URL
 * @param {Object} options - 请求选项
 * @returns {Promise} 请求结果
 */
async function request(url, options = {}) {
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
  const token = getToken();
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
async function get(url, params = {}) {
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
async function post(url, data = {}) {
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
async function put(url, data = {}) {
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
async function del(url) {
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
async function uploadFile(url, file, fieldName = 'file') {
  const formData = new FormData();
  formData.append(fieldName, file);
  
  const token = getToken();
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

/**
 * 下载文件
 * @param {string} url - 下载URL
 * @param {string} filename - 文件名
 * @returns {Promise} 下载结果
 */
async function downloadFile(url, filename) {
  const token = getToken();
  const headers = {};
  
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  
  const fullUrl = getApiUrl(url);
  
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // 创建下载链接
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    return { success: true };
  } catch (error) {
    console.error('文件下载失败:', error);
    throw error;
  }
}

// 菜单导入相关API
const menuImportApi = {
  // 下载Excel导入模板
  downloadTemplate: () => downloadFile('/admin/menu/import/template', `菜单导入模板_${new Date().toISOString().split('T')[0]}.xlsx`),
  
  // 上传并解析Excel文件
  uploadAndParseExcel: (file) => uploadFile('/admin/menu/import/parse', file, 'excel'),
  
  // 预览导入数据
  previewImportData: (data) => post('/admin/menu/import/preview', data),
  
  // 执行批量导入
  batchImportMenus: (data) => post('/admin/menu/import/execute', data),
  
  // 获取导入历史
  getImportHistory: (params = {}) => get('/admin/menu/import/history', params)
};

// 认证相关API
const authApi = {
  // 登录
  login: (credentials) => post('/auth/login', credentials),
  
  // 登出
  logout: () => post('/auth/logout'),
  
  // 测试登录
  testLogin: (credentials) => post('/auth/test-login-sys-admin', credentials),
};

// 用户相关API
const userApi = {
  // 获取用户信息
  getUserInfo: () => get('/user/info'),
  
  // 更新用户资料
  updateProfile: (data) => put('/user/profile', data),
  
  // 上传头像
  uploadAvatar: (file) => uploadFile('/admin/upload/avatar', file, 'avatar'),
  
  // 获取用户统计
  getStats: () => get('/user/stats'),
};

// 导出API对象
window.api = {
  getToken,
  request,
  get,
  post,
  put,
  del,
  uploadFile,
  downloadFile,
  menuImportApi,
  authApi,
  userApi
};

// 兼容性：确保getToken函数全局可用
window.getToken = getToken;

console.log('✅ API工具类已加载');
