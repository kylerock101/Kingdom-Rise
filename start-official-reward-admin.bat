@echo off
setlocal
cd /d "%~dp0"

set "ADMIN_URL=http://127.0.0.1:8741/"
set "HEALTH_URL=http://127.0.0.1:8741/health"
set "SERVICE_ID=kingdom-rise-official-reward-admin"

echo Checking Kingdom Rise Official Reward Admin...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-RestMethod -Uri '%HEALTH_URL%' -TimeoutSec 2 -ErrorAction Stop; if ($r.ok -eq $true -and $r.service -eq '%SERVICE_ID%') { exit 0 }; exit 2 } catch { exit 1 }"
if %errorlevel%==0 (
  echo Kingdom Rise Official Reward Admin is already running.
  if not "%KR_ADMIN_LAUNCHER_NO_OPEN%"=="1" start "" "%ADMIN_URL%"
  exit /b 0
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $c = Get-NetTCPConnection -LocalPort 8741 -State Listen -ErrorAction SilentlyContinue; if ($c) { exit 0 }; exit 1 } catch { $lines = netstat -ano -p tcp | Select-String ':8741\s'; if ($lines) { exit 0 }; exit 1 }"
if %errorlevel%==0 (
  echo.
  echo Port 8741 is in use, but it is not responding as the Kingdom Rise Official Reward Admin.
  echo Another application may already be using the admin port.
  echo.
  echo To inspect it, run:
  echo netstat -ano ^| findstr :8741
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then run this launcher again.
  pause
  exit /b 1
)

echo Starting Kingdom Rise Official Reward Admin...
echo This server binds only to 127.0.0.1 and keeps the service-account key on this computer.
set "KR_ADMIN_UI_NO_OPEN=1"
start "" /b powershell -NoProfile -ExecutionPolicy Bypass -Command "for ($i = 0; $i -lt 30; $i++) { try { $r = Invoke-RestMethod -Uri '%HEALTH_URL%' -TimeoutSec 1 -ErrorAction Stop; if ($r.ok -eq $true -and $r.service -eq '%SERVICE_ID%') { if ($env:KR_ADMIN_LAUNCHER_NO_OPEN -ne '1') { Start-Process '%ADMIN_URL%' }; exit 0 } } catch {} Start-Sleep -Milliseconds 500 }"
node scripts\official-gift-admin-ui.cjs
if errorlevel 1 (
  echo.
  echo The admin server stopped with an error.
)
echo.
echo Server stopped. Press any key to close this window.
pause >nul