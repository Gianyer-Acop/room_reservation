$ErrorActionPreference = 'Stop'
$nodeVersion = "v20.11.0"
$url = "https://nodejs.org/dist/$nodeVersion/node-$nodeVersion-win-x64.zip"
$zipPath = "node_portable.zip"
$extractPath = "node_temp"
$finalDir = "node_bin"

Write-Host "----------------------------------------"
Write-Host "Descargando Node.js Portable ($nodeVersion)..."
Write-Host "----------------------------------------"

try {
    # Descargar
    Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
    
    Write-Host "Descomprimiendo archivos..."
    # Descomprimir
    Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
    
    # Mover el contenido de la carpeta interna a node_bin
    if (Test-Path $finalDir) {
        Remove-Item $finalDir -Recurse -Force
    }
    
    # Encontrar la carpeta descomprimida (ej: node-v20.11.0-win-x64)
    $innerFolder = Get-ChildItem -Path $extractPath | Where-Object { $_.PSIsContainer } | Select-Object -First 1
    
    Move-Item -Path $innerFolder.FullName -Destination $finalDir
    
    # Limpieza
    Remove-Item $zipPath -Force
    Remove-Item $extractPath -Recurse -Force
    
    Write-Host "----------------------------------------"
    Write-Host "¡Éxito! Node.js se ha configurado en la carpeta '$finalDir'."
    Write-Host "Ahora puedes ejecutar 'start.bat' para iniciar la aplicación."
    Write-Host "----------------------------------------"

} catch {
    Write-Error "Ocurrió un error: $_"
    Write-Host "Intenta descargar manualmente el ZIP desde: $url"
    Write-Host "Y descomprímelo en una carpeta llamada '$finalDir' dentro del proyecto."
}
