@echo off
setlocal
set "NODE_DIR=%~dp0node_bin"
set "PATH=%NODE_DIR%;%PATH%"

echo ---------------------------------------------------
echo PREPARANDO ACCESO REMOTO...
echo ---------------------------------------------------

REM Verificar instalacion de localtunnel
if not exist "node_modules\.bin\lt.cmd" (
    echo [INFO] Instalando localtunnel por primera vez...
    call npm install localtunnel
)

echo.
echo ---------------------------------------------------
echo PASO 1: TU CONTRASEÑA
echo ---------------------------------------------------
echo LocalTunnel pide una contrasena para entrar.
echo Tu contrasena es tu IP publica:
echo.
REM Obtener IP publica usando el servicio de localtunnel
curl -s https://loca.lt/mytunnelpassword
echo.
echo.
echo [!] COPIA EL NUMERO DE ARRIBA, LO NECESITARAN TUS COLEGAS.
echo.
echo ---------------------------------------------------
echo PASO 2: TU LINK PUBLICO
echo ---------------------------------------------------
echo Generando link... (Manten esta ventana abierta)
echo.
call node_modules\.bin\lt.cmd --port 3000
pause
