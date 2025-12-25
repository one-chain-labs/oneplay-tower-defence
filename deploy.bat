@echo off
echo ========================================
echo   Lucky Treasure Box - Deploy Script
echo ========================================
echo.

echo Building contract...
sui move build

if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Build successful!
echo.
echo Deploying to Sui Testnet...
sui client publish --gas-budget 100000000

echo.
echo ========================================
echo   Deployment Complete!
echo ========================================
pause
