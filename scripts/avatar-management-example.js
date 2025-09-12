/**
 * 头像管理完整示例
 * 包含上传、获取、显示等功能
 */

// ================================
// 1. 头像上传
// ================================

/**
 * 上传头像
 * @param {File} file - 头像文件
 * @param {string} token - 用户token
 * @returns {Promise<Object>} 上传结果
 */
async function uploadAvatar(file, token) {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch('/api/admin/upload/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 头像上传成功:', result.data.avatarUrl);
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ 头像上传失败:', error);
    throw error;
  }
}

// ================================
// 2. 获取用户信息（包含头像）
// ================================

/**
 * 获取当前用户信息
 * @param {string} token - 用户token
 * @returns {Promise<Object>} 用户信息
 */
async function getUserInfo(token) {
  try {
    const response = await fetch('/api/user/info', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 获取用户信息成功:', result.data.avatarUrl);
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('❌ 获取用户信息失败:', error);
    throw error;
  }
}

// ================================
// 3. 头像显示组件
// ================================

/**
 * 头像显示组件类
 */
class AvatarDisplay {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      size: 60,
      defaultAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=default',
      showName: true,
      ...options
    };
  }
  
  /**
   * 显示头像
   * @param {Object} userInfo - 用户信息
   */
  display(userInfo) {
    if (!this.container) return;
    
    const avatarUrl = userInfo?.avatarUrl || this.options.defaultAvatar;
    const nickName = userInfo?.nickName || '用户';
    
    this.container.innerHTML = `
      <div class="avatar-container" style="text-align: center;">
        <img 
          src="${avatarUrl}" 
          alt="${nickName}的头像"
          style="
            width: ${this.options.size}px;
            height: ${this.options.size}px;
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid #e0e0e0;
            cursor: pointer;
          "
          onerror="this.src='${this.options.defaultAvatar}'"
        />
        ${this.options.showName ? `<p style="margin-top: 8px; font-size: 14px;">${nickName}</p>` : ''}
      </div>
    `;
  }
  
  /**
   * 更新头像
   * @param {string} newAvatarUrl - 新的头像URL
   */
  updateAvatar(newAvatarUrl) {
    const img = this.container?.querySelector('img');
    if (img) {
      img.src = newAvatarUrl;
    }
  }
}

// ================================
// 4. 头像上传组件
// ================================

/**
 * 头像上传组件类
 */
class AvatarUploader {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      token: '',
      onSuccess: null,
      onError: null,
      maxSize: 2 * 1024 * 1024, // 2MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      ...options
    };
    
    this.init();
  }
  
  init() {
    this.render();
    this.bindEvents();
  }
  
  render() {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="avatar-uploader">
        <input type="file" id="avatar-input" accept="image/*" style="display: none;" />
        <label for="avatar-input" class="upload-button" style="
          display: inline-block;
          padding: 10px 20px;
          background: #007bff;
          color: white;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        ">
          选择头像
        </label>
        <p style="font-size: 12px; color: #666; margin-top: 5px;">
          支持格式：JPG、PNG、GIF、WebP | 最大大小：2MB
        </p>
      </div>
    `;
  }
  
  bindEvents() {
    const fileInput = this.container.querySelector('#avatar-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
  }
  
  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 验证文件
    if (!this.validateFile(file)) return;
    
    try {
      const result = await uploadAvatar(file, this.options.token);
      
      if (this.options.onSuccess) {
        this.options.onSuccess(result);
      }
      
      console.log('✅ 头像上传并更新成功');
    } catch (error) {
      if (this.options.onError) {
        this.options.onError(error);
      }
      console.error('❌ 头像上传失败:', error);
    }
  }
  
  validateFile(file) {
    // 检查文件类型
    if (!this.options.allowedTypes.includes(file.type)) {
      alert('不支持的文件类型，请选择图片文件');
      return false;
    }
    
    // 检查文件大小
    if (file.size > this.options.maxSize) {
      alert(`文件大小不能超过 ${(this.options.maxSize / 1024 / 1024).toFixed(1)}MB`);
      return false;
    }
    
    return true;
  }
  
  setToken(token) {
    this.options.token = token;
  }
}

// ================================
// 5. 完整使用示例
// ================================

/**
 * 头像管理完整示例
 */
class AvatarManager {
  constructor(containerId, token) {
    this.container = document.getElementById(containerId);
    this.token = token;
    this.userInfo = null;
    
    this.avatarDisplay = new AvatarDisplay(`${containerId}-display`, {
      size: 80,
      showName: true
    });
    
    this.avatarUploader = new AvatarUploader(`${containerId}-uploader`, {
      token: this.token,
      onSuccess: (result) => this.handleUploadSuccess(result),
      onError: (error) => this.handleUploadError(error)
    });
    
    this.init();
  }
  
  async init() {
    try {
      // 获取用户信息
      this.userInfo = await getUserInfo(this.token);
      
      // 显示头像
      this.avatarDisplay.display(this.userInfo);
      
      console.log('✅ 头像管理器初始化成功');
    } catch (error) {
      console.error('❌ 头像管理器初始化失败:', error);
    }
  }
  
  handleUploadSuccess(result) {
    // 更新显示的头像
    this.avatarDisplay.updateAvatar(result.avatarUrl);
    
    // 更新用户信息
    if (this.userInfo) {
      this.userInfo.avatarUrl = result.avatarUrl;
    }
    
    console.log('✅ 头像更新成功');
  }
  
  handleUploadError(error) {
    console.error('❌ 头像上传失败:', error);
    alert('头像上传失败，请重试');
  }
  
  // 获取当前头像URL
  getCurrentAvatarUrl() {
    return this.userInfo?.avatarUrl;
  }
  
  // 获取用户信息
  getUserInfo() {
    return this.userInfo;
  }
}

// ================================
// 6. 使用示例
// ================================

// HTML结构示例：
/*
<div id="avatar-manager">
  <div id="avatar-manager-display"></div>
  <div id="avatar-manager-uploader"></div>
</div>
*/

// JavaScript使用示例：
/*
// 初始化头像管理器
const avatarManager = new AvatarManager('avatar-manager', 'your_token_here');

// 获取当前头像URL
const avatarUrl = avatarManager.getCurrentAvatarUrl();
console.log('当前头像:', avatarUrl);

// 获取用户信息
const userInfo = avatarManager.getUserInfo();
console.log('用户信息:', userInfo);
*/

// ================================
// 7. 导出模块
// ================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    uploadAvatar,
    getUserInfo,
    AvatarDisplay,
    AvatarUploader,
    AvatarManager
  };
}
