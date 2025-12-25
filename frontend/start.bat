@echo off
echo ========================================
echo 启动 DungeonCraft 前端
echo ========================================
echo.

echo 检查依赖...
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
)

echo.
echo 启动开发服务器...
echo 访问: http://localhost:3000
echo.
call npm run dev
