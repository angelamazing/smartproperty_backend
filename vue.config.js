const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    port: 5175,
    proxy: {
      // 代理API请求
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        pathRewrite: {
          '^/api': '/api'
        }
      },
      // 代理静态文件
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        pathRewrite: {
          '^/uploads': '/uploads'
        }
      },
      // 代理头像文件
      '/avatar': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        pathRewrite: {
          '^/avatar': '/avatar'
        }
      }
    }
  }
})
