@echo off
setlocal
cd /d "%~dp0"
title Consultas PRO - Inicializador local

echo.
echo [INFO] Verificando o ambiente local...

where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Node.js nao foi encontrado no PATH.
  pause
  exit /b 1
)

if not exist "backend\node_modules\.bin\tsc.cmd" (
  echo [ERRO] Dependencias do backend ausentes.
  echo Execute npm.cmd install dentro da pasta backend.
  pause
  exit /b 1
)

if not exist "frontend\node_modules\.bin\vite.cmd" (
  echo [ERRO] Dependencias do frontend ausentes.
  echo Execute npm.cmd install dentro da pasta frontend.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$busy = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -in 3333,8080 }); if ($busy.Count -gt 0) { $busy | Select-Object LocalAddress,LocalPort,OwningProcess | Format-Table -AutoSize; exit 1 }"
if errorlevel 1 (
  echo [ERRO] A porta 3333 ou 8080 ja esta em uso. Nada foi iniciado.
  pause
  exit /b 1
)

echo [INFO] Compilando o bootstrap local do backend...
pushd "backend"
call npm.cmd exec -- tsc -p tsconfig.json
if errorlevel 1 (
  popd
  echo [ERRO] Nao foi possivel compilar o backend local.
  pause
  exit /b 1
)
popd

echo [INFO] Iniciando API local sem worker e com PostgreSQL somente leitura...
start "Consultas PRO - API local" /min cmd.exe /k "cd /d ""%~dp0backend"" && set ""PGOPTIONS=-c default_transaction_read_only=on"" && node.exe dist/src/server.local.js"

echo [INFO] Iniciando frontend local...
start "Consultas PRO - Frontend local" /min cmd.exe /k "cd /d ""%~dp0frontend"" && set ""VITE_API_URL=http://127.0.0.1:3333"" && npm.cmd run dev -- --host 127.0.0.1 --port 8080"

echo [INFO] Aguardando API e frontend responderem...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(90); $api = $false; $web = $false; while ((Get-Date) -lt $deadline) { try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:3333/health' -TimeoutSec 2; $api = $r.StatusCode -eq 200 } catch { $api = $false }; try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8080' -TimeoutSec 2; $web = $r.StatusCode -eq 200 } catch { $web = $false }; if ($api -and $web) { exit 0 }; Start-Sleep -Seconds 1 }; exit 1"
if errorlevel 1 (
  echo [ERRO] O ambiente nao respondeu em 90 segundos.
  echo Verifique as janelas minimizadas da API e do frontend.
  pause
  exit /b 1
)

echo [OK] Ambiente local disponivel em http://127.0.0.1:8080
start "" "http://127.0.0.1:8080"
exit /b 0
