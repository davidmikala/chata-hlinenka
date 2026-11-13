@echo off
rem Spusteni webu Chata Hlinenka - staci na tento soubor dvakrat kliknout.
cd /d "%~dp0"
set "PATH=C:\Program Files\nodejs;%PATH%"
if not exist node_modules (
  echo Instaluji zavislosti...
  call npm.cmd install
)
call npm.cmd run dev
pause
