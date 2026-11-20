$env:LOCALAPPDATA = "c:\Users\Usuario\Desktop\tesis\Aplicación\.cache"
Write-Host "Iniciando nodo local de Hardhat..."
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList '/c "set LOCALAPPDATA=c:\Users\Usuario\Desktop\tesis\Aplicación\.cache && npx hardhat node --hostname 0.0.0.0 --port 8545"' -PassThru

# Esperar a que el nodo responda en el puerto 8545
$retries = 0
while ($retries -lt 15) {
    Start-Sleep -Seconds 1
    $conn = Get-NetTCPConnection -LocalPort 8545 -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "Nodo Hardhat activo en puerto 8545."
        break
    }
    $retries++
}

Start-Sleep -Seconds 1
Write-Host "Desplegando contratos inteligentes..."
cmd /c "set LOCALAPPDATA=c:\Users\Usuario\Desktop\tesis\Aplicación\.cache && npx hardhat run scripts/deploy.js --network localhost"

Write-Host "Sembrando proyectos de grado y configurando cuentas..."
cmd /c "set LOCALAPPDATA=c:\Users\Usuario\Desktop\tesis\Aplicación\.cache && npx hardhat run scripts/preparar-todo.js --network localhost"

Write-Host "Entorno Blockchain completamente activo. Manteniendo proceso vivo..."
Wait-Process -Id $proc.Id
