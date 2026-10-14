@echo off
title Compiler Optimization Research Platform
cd /d "%~dp0"
echo =====================================================================
echo Starting Compiler Optimization Research Platform...
echo URL: http://127.0.0.1:8000
echo =====================================================================
python backend\run_backend.py
pause
