@echo off
setlocal
rem Compatibility entry point for existing shortcuts.
call "%~dp0Launch Harrys Chess.bat"
exit /b %ERRORLEVEL%
