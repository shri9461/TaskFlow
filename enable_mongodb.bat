@echo off
title Configure MongoDB Replica Set for TaskFlow

:: Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    goto :elevated
) else (
    echo Requesting Administrator privileges...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

:elevated
echo Running with Administrator privileges...
powershell -ExecutionPolicy Bypass -File "%~dp0TaskFlow-main\backend\setup_mongodb_rs.ps1"
