#!/bin/bash

# Node.js后端服务关闭脚本
# 作者: 湖北省地质局第三地质大队
# 版本: 1.0.0

echo "🛑 Node.js后端服务关闭脚本"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 查找服务进程
echo -e "${YELLOW}正在查找Node.js后端服务...${NC}"

# 查找server.js进程
SERVER_PID=$(ps aux | grep -E "(server\.js|node.*server)" | grep -v grep | awk '{print $2}')

# 查找nodemon进程
NODEMON_PID=$(ps aux | grep nodemon | grep -v grep | awk '{print $2}')

# 查找npm start进程
NPM_PID=$(ps aux | grep "npm start" | grep -v grep | awk '{print $2}')

if [ -z "$SERVER_PID" ] && [ -z "$NODEMON_PID" ] && [ -z "$NPM_PID" ]; then
    echo -e "${GREEN}✅ 未找到运行中的Node.js后端服务${NC}"
    exit 0
fi

# 显示找到的进程
echo -e "${YELLOW}找到以下进程:${NC}"
if [ ! -z "$SERVER_PID" ]; then
    echo "  📍 server.js 进程: $SERVER_PID"
fi
if [ ! -z "$NODEMON_PID" ]; then
    echo "  📍 nodemon 进程: $NODEMON_PID"
fi
if [ ! -z "$NPM_PID" ]; then
    echo "  📍 npm start 进程: $NPM_PID"
fi

# 检查端口占用
echo -e "\n${YELLOW}检查端口占用情况...${NC}"
PORT_CHECK=$(netstat -tlnp 2>/dev/null | grep :3000 || echo "")
if [ ! -z "$PORT_CHECK" ]; then
    echo -e "${RED}⚠️  端口3000仍被占用:${NC}"
    echo "$PORT_CHECK"
else
    echo -e "${GREEN}✅ 端口3000已释放${NC}"
fi

# 尝试优雅关闭
echo -e "\n${YELLOW}正在尝试优雅关闭服务...${NC}"

if [ ! -z "$SERVER_PID" ]; then
    echo "  发送SIGTERM信号到 server.js 进程 ($SERVER_PID)"
    kill -TERM $SERVER_PID 2>/dev/null
fi

if [ ! -z "$NODEMON_PID" ]; then
    echo "  发送SIGTERM信号到 nodemon 进程 ($NODEMON_PID)"
    kill -TERM $NODEMON_PID 2>/dev/null
fi

if [ ! -z "$NPM_PID" ]; then
    echo "  发送SIGTERM信号到 npm 进程 ($NPM_PID)"
    kill -TERM $NPM_PID 2>/dev/null
fi

# 等待进程关闭
echo -e "\n${YELLOW}等待进程关闭...${NC}"
sleep 3

# 检查是否还有进程在运行
REMAINING_PIDS=""
if [ ! -z "$SERVER_PID" ] && ps -p $SERVER_PID > /dev/null 2>&1; then
    REMAINING_PIDS="$REMAINING_PIDS $SERVER_PID"
fi
if [ ! -z "$NODEMON_PID" ] && ps -p $NODEMON_PID > /dev/null 2>&1; then
    REMAINING_PIDS="$REMAINING_PIDS $NODEMON_PID"
fi
if [ ! -z "$NPM_PID" ] && ps -p $NPM_PID > /dev/null 2>&1; then
    REMAINING_PIDS="$REMAINING_PIDS $NPM_PID"
fi

# 强制关闭仍在运行的进程
if [ ! -z "$REMAINING_PIDS" ]; then
    echo -e "${RED}⚠️  部分进程仍在运行，强制关闭...${NC}"
    for pid in $REMAINING_PIDS; do
        echo "  强制关闭进程: $pid"
        kill -9 $pid 2>/dev/null
    done
    sleep 2
fi

# 最终检查
echo -e "\n${YELLOW}最终检查...${NC}"

# 检查进程
REMAINING_PROCESSES=$(ps aux | grep -E "(server\.js|nodemon|npm start)" | grep -v grep)
if [ -z "$REMAINING_PROCESSES" ]; then
    echo -e "${GREEN}✅ 所有Node.js后端服务已关闭${NC}"
else
    echo -e "${RED}❌ 仍有进程在运行:${NC}"
    echo "$REMAINING_PROCESSES"
fi

# 检查端口
PORT_CHECK_FINAL=$(netstat -tlnp 2>/dev/null | grep :3000 || echo "")
if [ -z "$PORT_CHECK_FINAL" ]; then
    echo -e "${GREEN}✅ 端口3000已释放${NC}"
else
    echo -e "${RED}❌ 端口3000仍被占用:${NC}"
    echo "$PORT_CHECK_FINAL"
fi

# 显示关闭结果
echo -e "\n${GREEN}🎉 服务关闭完成！${NC}"
echo "================================"

# 记录关闭日志
echo "$(date '+%Y-%m-%d %H:%M:%S'): Node.js后端服务已关闭" >> server.log 2>/dev/null || true

exit 0

