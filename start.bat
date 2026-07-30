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

echo [INFO] Encerrando instancias anteriores do ambiente local...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; $root='%~dp0'.TrimEnd('\'); $self=@(); $c=Get-CimInstance Win32_Process -Filter ('ProcessId='+$PID); $d=0; while ($c -and $d -lt 8) { $self+=[int]$c.ProcessId; $pp=[int]$c.ParentProcessId; if ($pp -le 0) { break }; $c=Get-CimInstance Win32_Process -Filter ('ProcessId='+$pp); $d++ }; $killed=@(); foreach ($conn in @(Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -eq 3333 -or $_.LocalPort -eq 8080 })) { $port=[int]$conn.LocalPort; $oid=[int]$conn.OwningProcess; $own=Get-CimInstance Win32_Process -Filter ('ProcessId='+$oid); if (-not $own) { continue }; $cl=[string]$own.CommandLine; $mine=$false; if ($own.Name -eq 'node.exe') { if ($port -eq 3333 -and $cl -match 'server\.local\.js') { $mine=$true }; if ($port -eq 8080 -and $cl -match 'vite' -and ($cl -like ('*'+$root+'*') -or $cl -match '--port\s+8080')) { $mine=$true } }; if (-not $mine) { Write-Host ('[ERRO] Porta '+$port+' ocupada por um processo que nao e do Consultas PRO.'); Write-Host ('       Nome : '+$own.Name); Write-Host ('       PID  : '+$oid); Write-Host ('       Exe  : '+$own.ExecutablePath); Write-Host ('       Cmd  : '+$cl); exit 2 }; $tgt=$oid; $cur=$own; $d=0; while ($d -lt 6) { $d++; $pp=[int]$cur.ParentProcessId; if ($pp -le 0 -or $self -contains $pp) { break }; $par=Get-CimInstance Win32_Process -Filter ('ProcessId='+$pp); if (-not $par) { break }; if ($par.Name -ne 'cmd.exe' -and $par.Name -ne 'node.exe') { break }; $pcl=[string]$par.CommandLine; if ($pcl -match 'server\.local\.js' -or $pcl -match 'run\s+dev' -or $pcl -match 'vite' -or $pcl -like ('*'+$root+'*')) { $tgt=$pp; $cur=$par } else { break } }; if ($self -contains $tgt) { continue }; if ($killed -notcontains $tgt) { Write-Host ('[INFO] Encerrando instancia anterior: PID '+$tgt+' (porta '+$port+').'); $null = taskkill.exe /PID $tgt /T /F 2>&1; $killed+=$tgt } }; $dl=(Get-Date).AddSeconds(15); while ((Get-Date) -lt $dl) { if (@(Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -eq 3333 -or $_.LocalPort -eq 8080 }).Count -eq 0) { exit 0 }; Start-Sleep -Milliseconds 500 }; exit 3"
if errorlevel 3 (
  echo [ERRO] As portas 3333/8080 nao ficaram livres a tempo.
  echo Feche manualmente as janelas do ambiente local e tente de novo.
  pause
  exit /b 1
)
if errorlevel 2 (
  echo [ERRO] Nada foi encerrado e nada foi iniciado. Veja os detalhes acima.
  pause
  exit /b 1
)
if errorlevel 1 (
  echo [ERRO] Falha inesperada ao liberar as portas 3333 e 8080.
  pause
  exit /b 1
)
echo [OK] Portas 3333 e 8080 livres.

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
