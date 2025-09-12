/**
 * 头像上传功能 - 解决 "Multipart: Boundary not found" 问题
 * 
 * 问题原因：
 * 1. 手动设置了错误的 Content-Type
 * 2. 没有使用 FormData 对象
 * 3. 请求格式不正确
 */

// ================================
// 1. 正确的上传方式 (推荐)
// ================================

/**
 * 使用 Fetch API 上传头像
 */
async function uploadAvatarWithFetch(file, token) {
  try {
    // ✅ 正确：使用 FormData
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await fetch('/api/admin/upload/avatar', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // ❌ 不要手动设置 Content-Type，让浏览器自动设置
        // 'Content-Type': 'multipart/form-data' 
      },
      body: formData
    });
    
    return await response.json();
  } catch (error) {
    console.error('上传失败:', error);
    throw error;
  }
}

/**
 * 使用 Axios 上传头像
 */
async function uploadAvatarWithAxios(file, token) {
  try {
    // ✅ 正确：使用 FormData
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await axios.post('/api/admin/upload/avatar', formData, {
      headers: {
        'Authorization': `Bearer ${token}`
        // ❌ 不要手动设置 Content-Type，让 axios 自动设置
        // 'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('上传失败:', error);
    throw error;
  }
}

/**
 * 使用 XMLHttpRequest 上传头像
 */
function uploadAvatarWithXHR(file, token) {
  return new Promise((resolve, reject) => {
    // ✅ 正确：使用 FormData
    const formData = new FormData();
    formData.append('avatar', file);
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/upload/avatar');
    
    // 设置认证头
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    
    // ❌ 不要手动设置 Content-Type，让浏览器自动设置
    // xhr.setRequestHeader('Content-Type', 'multipart/form-data');
    
    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch (error) {
          reject(new Error('响应解析失败'));
        }
      } else {
        reject(new Error(`HTTP错误: ${xhr.status}`));
      }
    };
    
    xhr.onerror = function() {
      reject(new Error('网络错误'));
    };
    
    xhr.send(formData);
  });
}

// ================================
// 2. 错误的上传方式 (避免使用)
// ================================

/**
 * ❌ 错误方式1：手动设置错误的 Content-Type
 */
async function wrongUploadMethod1(file, token) {
  const formData = new FormData();
  formData.append('avatar', file);
  
  const response = await fetch('/api/admin/upload/avatar', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data' // ❌ 这会导致 "Boundary not found" 错误
    },
    body: formData
  });
  
  return await response.json();
}

/**
 * ❌ 错误方式2：直接发送文件对象
 */
async function wrongUploadMethod2(file, token) {
  const response = await fetch('/api/admin/upload/avatar', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'image/jpeg' // ❌ 错误的 Content-Type
    },
    body: file // ❌ 应该使用 FormData
  });
  
  return await response.json();
}

/**
 * ❌ 错误方式3：使用 JSON 格式发送文件
 */
async function wrongUploadMethod3(file, token) {
  const response = await fetch('/api/admin/upload/avatar', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json' // ❌ 文件上传不能用 JSON
    },
    body: JSON.stringify({ avatar: file }) // ❌ 文件对象无法序列化
  });
  
  return await response.json();
}

// ================================
// 3. 完整的头像上传组件示例
// ================================

class AvatarUploader {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      uploadUrl: '/api/admin/upload/avatar',
      maxFileSize: 2 * 1024 * 1024, // 2MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      token: '',
      onSuccess: null,
      onError: null,
      ...options
    };
    
    this.init();
  }
  
  init() {
    this.render();
    this.bindEvents();
  }
  
  render() {
    this.container.innerHTML = `
      <div class="avatar-uploader">
        <div class="upload-area">
          <input type="file" id="avatar-input" accept="image/*" style="display: none;" />
          <label for="avatar-input" class="upload-button">
            <span class="upload-icon">📷</span>
            <span class="upload-text">选择头像</span>
          </label>
          <p class="upload-hint">
            支持格式：${this.options.allowedTypes.join(', ')} | 最大大小：${(this.options.maxFileSize / 1024 / 1024).toFixed(1)}MB
          </p>
        </div>
        
        <div class="preview-area" style="display: none;">
          <img id="avatar-preview" src="" alt="头像预览" />
          <div class="file-info"></div>
          <button id="upload-btn" class="upload-btn">开始上传</button>
        </div>
        
        <div class="status-area" style="display: none;"></div>
      </div>
    `;
  }
  
  bindEvents() {
    const fileInput = this.container.querySelector('#avatar-input');
    const uploadBtn = this.container.querySelector('#upload-btn');
    
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    uploadBtn.addEventListener('click', () => this.handleUpload());
  }
  
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // 验证文件
    if (!this.validateFile(file)) return;
    
    // 显示预览
    this.showPreview(file);
  }
  
  validateFile(file) {
    // 检查文件类型
    if (!this.options.allowedTypes.includes(file.type)) {
      this.showError(`不支持的文件类型: ${file.type}`);
      return false;
    }
    
    // 检查文件大小
    if (file.size > this.options.maxFileSize) {
      this.showError(`文件大小不能超过 ${(this.options.maxFileSize / 1024 / 1024).toFixed(1)}MB`);
      return false;
    }
    
    return true;
  }
  
  showPreview(file) {
    const previewArea = this.container.querySelector('.preview-area');
    const previewImg = this.container.querySelector('#avatar-preview');
    const fileInfo = this.container.querySelector('.file-info');
    
    // 创建预览URL
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      fileInfo.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
      previewArea.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
  
  async handleUpload() {
    const fileInput = this.container.querySelector('#avatar-input');
    const file = fileInput.files[0];
    
    if (!file) {
      this.showError('请先选择文件');
      return;
    }
    
    if (!this.options.token) {
      this.showError('请先设置认证Token');
      return;
    }
    
    this.showStatus('info', '正在上传...');
    this.setUploadingState(true);
    
    try {
      const result = await uploadAvatarWithFetch(file, this.options.token);
      
      if (result.success) {
        this.showStatus('success', '上传成功！');
        if (this.options.onSuccess) {
          this.options.onSuccess(result.data);
        }
      } else {
        this.showError(result.message || '上传失败');
        if (this.options.onError) {
          this.options.onError(result);
        }
      }
    } catch (error) {
      this.showError(`上传错误: ${error.message}`);
      if (this.options.onError) {
        this.options.onError(error);
      }
    } finally {
      this.setUploadingState(false);
    }
  }
  
  showStatus(type, message) {
    const statusArea = this.container.querySelector('.status-area');
    statusArea.className = `status-area status-${type}`;
    statusArea.textContent = message;
    statusArea.style.display = 'block';
  }
  
  showError(message) {
    this.showStatus('error', message);
  }
  
  setUploadingState(uploading) {
    const uploadBtn = this.container.querySelector('#upload-btn');
    const fileInput = this.container.querySelector('#avatar-input');
    
    uploadBtn.disabled = uploading;
    uploadBtn.textContent = uploading ? '上传中...' : '开始上传';
    fileInput.disabled = uploading;
  }
  
  setToken(token) {
    this.options.token = token;
  }
}

// ================================
// 4. 使用示例
// ================================

// 创建上传器实例
const avatarUploader = new AvatarUploader('avatar-container', {
  token: 'your_admin_token_here',
  onSuccess: (data) => {
    console.log('上传成功:', data);
    // 可以在这里更新用户头像显示
    document.getElementById('user-avatar').src = data.avatarUrl;
  },
  onError: (error) => {
    console.error('上传失败:', error);
  }
});

// 设置Token
avatarUploader.setToken('your_actual_token');

// 导出函数供外部使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    uploadAvatarWithFetch,
    uploadAvatarWithAxios,
    uploadAvatarWithXHR,
    AvatarUploader
  };
}
