@echo off
title Nodo Local Hardhat - Tesis UPEC
cd /d "c:\Users\Usuario\Desktop\tesis\Aplicación"
echo ============================================================
echo   INICIANDO NODO BLOCKCHAIN HARDHAT (UPEC)
echo ============================================================
node ./node_modules/hardhat/internal/cli/cli.js node --hostname 0.0.0.0 --port 8545
pause
