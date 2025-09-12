/**
 * 简化的头像渲染解决方案
 * 解决CORS和图片加载问题
 */

// ================================
// 1. 最简单的头像组件
// ================================

/**
 * 创建简单的头像元素
 * @param {string} avatarUrl - 头像URL
 * @param {string} nickName - 用户昵称
 * @param {number} size - 头像尺寸
 * @returns {HTMLElement} 头像元素
 */
function createSimpleAvatar(avatarUrl, nickName = '用户', size = 40) {
  const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  
  const img = document.createElement('img');
  img.src = avatarUrl || defaultAvatar;
  img.alt = `${nickName}的头像`;
  img.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #e0e0e0;
    transition: all 0.3s ease;
  `;
  
  // 错误处理
  img.onerror = () => {
    img.src = defaultAvatar;
  };
  
  return img;
}

// ================================
// 2. Vue 3 简化组件
// ================================

/*
<template>
  <img 
    :src="effectiveAvatarUrl" 
    :alt="userInfo?.nickName || '用户头像'"
    class="user-avatar"
    @error="handleError"
  />
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  userInfo: Object,
  size: {
    type: Number,
    default: 40
  }
});

const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';

const effectiveAvatarUrl = computed(() => {
  return props.userInfo?.avatarUrl || defaultAvatar;
});

const handleError = (event) => {
  event.target.src = defaultAvatar;
};
</script>

<style scoped>
.user-avatar {
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e0e0e0;
  transition: all 0.3s ease;
}

.user-avatar:hover {
  border-color: #007bff;
  transform: scale(1.05);
}
</style>
*/

// ================================
// 3. React 简化组件
// ================================

/*
import React, { useState } from 'react';

function SimpleAvatar({ userInfo, size = 40 }) {
  const [hasError, setHasError] = useState(false);
  const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  
  const avatarUrl = hasError ? defaultAvatar : (userInfo?.avatarUrl || defaultAvatar);
  
  const handleError = () => {
    setHasError(true);
  };
  
  return (
    <img
      src={avatarUrl}
      alt={userInfo?.nickName || '用户头像'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '2px solid #e0e0e0'
      }}
      onError={handleError}
    />
  );
}
*/

// ================================
// 4. 头像URL处理工具
// ================================

/**
 * 处理头像URL
 * @param {string} avatarUrl - 原始头像URL
 * @param {string} baseUrl - 基础URL
 * @returns {string} 处理后的URL
 */
function processAvatarUrl(avatarUrl, baseUrl = 'http://localhost:3000') {
  if (!avatarUrl) {
    return 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  }
  
  // 如果已经是完整URL，直接返回
  if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  
  // 如果是相对路径，添加基础URL
  if (avatarUrl.startsWith('/')) {
    return `${baseUrl}${avatarUrl}`;
  }
  
  // 其他情况，假设是文件名
  return `${baseUrl}/uploads/avatars/${avatarUrl}`;
}

// ================================
// 5. 头像预加载工具
// ================================

/**
 * 预加载头像
 * @param {string} avatarUrl - 头像URL
 * @returns {Promise<boolean>} 是否加载成功
 */
function preloadAvatar(avatarUrl) {
  return new Promise((resolve) => {
    if (!avatarUrl) {
      resolve(false);
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = avatarUrl;
  });
}

// ================================
// 6. 头像管理器
// ================================

class AvatarManager {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:3000';
    this.defaultAvatar = options.defaultAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
    this.cache = new Map();
  }
  
  /**
   * 获取头像URL
   * @param {string} avatarUrl - 原始头像URL
   * @returns {string} 处理后的URL
   */
  getAvatarUrl(avatarUrl) {
    if (this.cache.has(avatarUrl)) {
      return this.cache.get(avatarUrl);
    }
    
    const processedUrl = processAvatarUrl(avatarUrl, this.baseUrl);
    this.cache.set(avatarUrl, processedUrl);
    
    return processedUrl;
  }
  
  /**
   * 创建头像元素
   * @param {Object} userInfo - 用户信息
   * @param {number} size - 头像尺寸
   * @returns {HTMLElement} 头像元素
   */
  createAvatar(userInfo, size = 40) {
    const avatarUrl = this.getAvatarUrl(userInfo?.avatarUrl);
    return createSimpleAvatar(avatarUrl, userInfo?.nickName, size);
  }
  
  /**
   * 更新头像
   * @param {HTMLElement} imgElement - 图片元素
   * @param {Object} userInfo - 用户信息
   */
  updateAvatar(imgElement, userInfo) {
    if (imgElement && userInfo) {
      const avatarUrl = this.getAvatarUrl(userInfo.avatarUrl);
      imgElement.src = avatarUrl;
      imgElement.alt = `${userInfo.nickName || '用户'}的头像`;
    }
  }
  
  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

// ================================
// 7. 使用示例
// ================================

// 创建头像管理器
const avatarManager = new AvatarManager({
  baseUrl: 'http://localhost:3000'
});

// 用户数据示例
const userInfo = {
  nickName: '张三',
  avatarUrl: 'avatar_1756687222017_hsnganr3o.png'
};

// 创建头像元素
const avatarElement = avatarManager.createAvatar(userInfo, 60);

// 添加到页面
// document.getElementById('avatar-container').appendChild(avatarElement);

// ================================
// 8. 导出
// ================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createSimpleAvatar,
    processAvatarUrl,
    preloadAvatar,
    AvatarManager
  };
}
