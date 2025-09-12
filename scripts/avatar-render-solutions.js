/**
 * 前端头像渲染简洁方案
 */

// ================================
// 1. Vue 3 组合式 API 方案
// ================================

// composables/useAvatar.js
export function useAvatar() {
  const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  
  const getAvatarUrl = (userInfo) => {
    return userInfo?.avatarUrl || defaultAvatar;
  };
  
  const handleAvatarError = (event) => {
    event.target.src = defaultAvatar;
  };
  
  return {
    defaultAvatar,
    getAvatarUrl,
    handleAvatarError
  };
}

// 使用示例 (Vue 3)
/*
<template>
  <img 
    :src="avatarUrl" 
    :alt="userInfo?.nickName || '用户头像'"
    class="user-avatar"
    @error="handleAvatarError"
  />
</template>

<script setup>
import { computed } from 'vue';
import { useAvatar } from '@/composables/useAvatar';

const props = defineProps({
  userInfo: Object
});

const { getAvatarUrl, handleAvatarError } = useAvatar();

const avatarUrl = computed(() => getAvatarUrl(props.userInfo));
</script>
*/

// ================================
// 2. React Hook 方案
// ================================

// hooks/useAvatar.js
import { useState, useEffect } from 'react';

export function useAvatar(userInfo) {
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  
  useEffect(() => {
    if (!userInfo?.avatarUrl) {
      setAvatarUrl(defaultAvatar);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setHasError(false);
    
    // 预加载图片
    const img = new Image();
    img.onload = () => {
      setAvatarUrl(userInfo.avatarUrl);
      setIsLoading(false);
    };
    img.onerror = () => {
      setAvatarUrl(defaultAvatar);
      setIsLoading(false);
      setHasError(true);
    };
    img.src = userInfo.avatarUrl;
  }, [userInfo?.avatarUrl]);
  
  return {
    avatarUrl,
    isLoading,
    hasError,
    defaultAvatar
  };
}

// 使用示例 (React)
/*
import React from 'react';
import { useAvatar } from './hooks/useAvatar';

function UserAvatar({ userInfo, size = 40 }) {
  const { avatarUrl, isLoading } = useAvatar(userInfo);
  
  if (isLoading) {
    return <div className="avatar-loading" style={{ width: size, height: size }} />;
  }
  
  return (
    <img
      src={avatarUrl}
      alt={userInfo?.nickName || '用户头像'}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        objectFit: 'cover'
      }}
    />
  );
}
*/

// ================================
// 3. 通用 JavaScript 方案
// ================================

class AvatarRenderer {
  constructor(options = {}) {
    this.defaultAvatar = options.defaultAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
    this.size = options.size || 40;
    this.className = options.className || 'user-avatar';
  }
  
  // 创建头像元素
  createAvatar(userInfo) {
    const img = document.createElement('img');
    img.src = userInfo?.avatarUrl || this.defaultAvatar;
    img.alt = userInfo?.nickName || '用户头像';
    img.className = this.className;
    
    // 设置样式
    Object.assign(img.style, {
      width: `${this.size}px`,
      height: `${this.size}px`,
      borderRadius: '50%',
      objectFit: 'cover',
      border: '2px solid #e0e0e0'
    });
    
    // 错误处理
    img.onerror = () => {
      img.src = this.defaultAvatar;
    };
    
    return img;
  }
  
  // 更新头像
  updateAvatar(imgElement, userInfo) {
    if (imgElement && userInfo) {
      imgElement.src = userInfo.avatarUrl || this.defaultAvatar;
      imgElement.alt = userInfo.nickName || '用户头像';
    }
  }
  
  // 获取头像URL
  getAvatarUrl(userInfo) {
    return userInfo?.avatarUrl || this.defaultAvatar;
  }
}

// ================================
// 4. 快速集成方案
// ================================

// 最简单的头像组件
function createSimpleAvatar(userInfo, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  const avatarUrl = userInfo?.avatarUrl || defaultAvatar;
  const nickName = userInfo?.nickName || '用户';
  
  container.innerHTML = `
    <img 
      src="${avatarUrl}" 
      alt="${nickName}的头像"
      style="
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #e0e0e0;
        cursor: pointer;
      "
      onerror="this.src='${defaultAvatar}'"
    />
  `;
}

// ================================
// 5. 异步加载方案
// ================================

async function loadAvatarWithFallback(avatarUrl, defaultAvatar) {
  return new Promise((resolve) => {
    if (!avatarUrl) {
      resolve(defaultAvatar);
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(avatarUrl);
    img.onerror = () => resolve(defaultAvatar);
    img.src = avatarUrl;
  });
}

// 使用示例
/*
const avatarUrl = await loadAvatarWithFallback(
  userInfo.avatarUrl, 
  'https://api.dicebear.com/7.x/avataaars/svg?seed=default'
);
*/

// ================================
// 6. 缓存方案
// ================================

class AvatarCache {
  constructor() {
    this.cache = new Map();
    this.defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default';
  }
  
  async getAvatar(userInfo) {
    const key = userInfo?.avatarUrl || 'default';
    
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    const avatarUrl = await loadAvatarWithFallback(userInfo?.avatarUrl, this.defaultAvatar);
    this.cache.set(key, avatarUrl);
    
    return avatarUrl;
  }
  
  clear() {
    this.cache.clear();
  }
}

// ================================
// 7. 完整使用示例
// ================================

// HTML 结构
/*
<div id="user-avatar-container"></div>
<div id="avatar-list"></div>
*/

// JavaScript 使用
/*
// 1. 简单方案
const userInfo = {
  nickName: '张三',
  avatarUrl: 'http://localhost:3000/uploads/avatars/avatar_xxx.png'
};

createSimpleAvatar(userInfo, 'user-avatar-container');

// 2. 类方案
const avatarRenderer = new AvatarRenderer({ size: 60 });
const avatarElement = avatarRenderer.createAvatar(userInfo);
document.getElementById('avatar-list').appendChild(avatarElement);

// 3. 缓存方案
const avatarCache = new AvatarCache();
const avatarUrl = await avatarCache.getAvatar(userInfo);
*/

// ================================
// 8. CSS 样式
// ================================

const avatarStyles = `
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

.avatar-loading {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.avatar-small { width: 32px; height: 32px; }
.avatar-medium { width: 48px; height: 48px; }
.avatar-large { width: 64px; height: 64px; }
.avatar-xl { width: 80px; height: 80px; }
`;

// 导出所有方案
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    useAvatar,
    AvatarRenderer,
    createSimpleAvatar,
    loadAvatarWithFallback,
    AvatarCache,
    avatarStyles
  };
}
