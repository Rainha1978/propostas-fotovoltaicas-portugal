@echo off
setlocal

cd /d "%~dp0"

echo A preparar o projeto localmente...

if not exist ".env" (
  echo A criar ficheiro .env a partir de .env.example...
  copy ".env.example" ".env" >nul
)

echo A instalar dependencias...
call npm.cmd install --cache ".npm-cache"
if errorlevel 1 (
  echo.
  echo Nao foi possivel instalar as dependencias.
  pause
  exit /b 1
)

echo.
echo A iniciar em http://localhost:3000
call npm.cmd run dev -- --hostname 127.0.0.1

pause
