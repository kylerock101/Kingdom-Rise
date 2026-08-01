@echo off
setlocal
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then run this launcher again.
  pause
  exit /b 1
)
cd /d "%~dp0"
echo Starting Kingdom Rise Official Reward Admin...
echo This server binds only to 127.0.0.1 and keeps the service-account key on this computer.
node scripts\official-gift-admin-ui.cjs
if errorlevel 1 (
  echo.
  echo The admin server stopped with an error.
)
echo.
echo Server stopped. Press any key to close this window.
pause >nul