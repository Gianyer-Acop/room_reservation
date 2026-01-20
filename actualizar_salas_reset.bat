@echo off
echo ---------------------------------------------------
echo BORRANDO BASE DE DATOS
echo ---------------------------------------------------
echo ESTO ELIMINARA TODAS LAS RESERVAS Y RESTAURARA 
echo LAS SALAS A SU ESTADO INICIAL (Las que esten en database.js).
echo.
echo Presiona Ctrl+C para cancelar o cualquier tecla para continuar...
pause

taskkill /F /IM node.exe >nul 2>&1
del rooms.db

echo.
echo Base de datos eliminada.
echo Ahora ejecuta 'start.bat' para crearla de nuevo con las nuevas salas.
echo ---------------------------------------------------
pause
