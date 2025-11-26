@echo off
echo ========================================
echo 安装 DungeonCraft 前端依赖
echo ========================================
echo.

echo 正在安装依赖包...
echo 这可能需要 1-2 分钟...
echo.

call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo ✅ 安装成功！
    echo ========================================
    echo.
    echo 下一步：运行 start.bat 启动开发服务器
    echo.
) else (
    echo.
    echo ========================================
    echo ❌ 安装失败
    echo ========================================
    echo.
    echo 请检查网络连接或尝试：
    echo npm cache clean --force
    echo npm install
    echo.
)

pause
