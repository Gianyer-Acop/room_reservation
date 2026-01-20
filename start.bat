@echo off
setlocal

REM Configurar ruta al Node.js portable
set "NODE_DIR=%~dp0node_bin"
set "PATH=%NODE_DIR%;%PATH%"

echo ---------------------------------------
echo Sistema de Reserva de Salas (Portable)
echo ---------------------------------------

REM Debug info
echo Buscando node en: %NODE_DIR%
node --version
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo ejecutar 'node'.
    echo Verificando contenido de la carpeta...
    dir "%NODE_DIR%"
    pause
    exit /b 1
)

echo Node.js detectado. Iniciando servidor...
echo ---------------------------------------
echo [INFO] Tu direccion IP para compartir es:
ipconfig | findstr "IPv4"
echo ---------------------------------------
echo [IMPORTANTE] Si aparece una ventana de Firewall, debes darle a "Permitir acceso".
echo Si tus colegas no pueden entrar, es probable que el Firewall este bloqueando la conexion.
echo ---------------------------------------
echo Accede a: http://localhost:3000
echo Para cerrar, presiona Ctrl + C
echo ---------------------------------------

node server.js
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] El servidor se detuvo con codigo de error %errorlevel%.
)
pause

