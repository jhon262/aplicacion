@echo off
title Sistema Web3 UPEC - Lanzador Completo
cd /d "%~dp0"

echo ============================================================
echo   LANZADOR AUTOMATICO DEL SISTEMA WEB3 - TESIS UPEC
echo ============================================================
echo.
echo 1. Iniciando nodo blockchain Hardhat (Puerto 8545)...
start "1. Blockchain Hardhat UPEC (Puerto 8545)" cmd /k "npx hardhat node --hostname 127.0.0.1"

echo Esperando 5 segundos a que la red blockchain inicialice...
timeout /t 5 /nobreak > nul

echo 2. Desplegando Smart Contracts y sembrando datos de prueba...
call npx hardhat run scripts/deploy.js --network localhost
call npx hardhat run scripts/preparar-todo.js --network localhost

echo 2b. Iniciando proxy IPFS (Puerto 8787, requiere PINATA_JWT en .env)...
start "Proxy IPFS UPEC (Puerto 8787)" cmd /k "node server/ipfs-proxy.js"

echo.
echo 3. Iniciando servidor frontend Vite (Puerto 3000)...
start "2. Frontend Vite UPEC (http://localhost:3000)" cmd /k "cd client && npm run dev"

echo.
echo ============================================================
echo   TODO INICIADO EXITOSAMENTE
echo   - Aplicacion Web: http://localhost:3000
echo   - Vista directa del Diploma: http://localhost:3000/?preview=diploma
echo ============================================================
timeout /t 3 > nul
start http://localhost:3000/?preview=diploma
