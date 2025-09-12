import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5175,
    proxy: {
      // 代理API请求
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      // 代理静态文件
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      // 代理头像文件
      '/avatar': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
