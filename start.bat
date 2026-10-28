@echo off
title MedicineLink Launcher
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ================================================================
echo            MedicineLink - Surplus Medicine Platform
echo ================================================================
echo.

:: 1. Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js v18 or higher from https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 2. Check npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not found in PATH!
    echo.
    pause
    exit /b 1
)

:: 3. Setup backend environment file if missing
if not exist "backend\.env" (
    echo [*] backend\.env not found. Creating from backend\.env.example...
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo [OK] backend\.env created.
    ) else (
        echo [WARN] backend\.env.example missing. Skipping.
    )
)

:: 4. Backend dependencies check
if not exist "backend\node_modules\" (
    echo [*] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install backend dependencies.
        pause
        exit /b 1
    )
)

:: 5. Initialize Database if not already present
if not exist "backend\data\medicinelink.db" (
    echo [*] Database not detected. Initializing schema and seed data...
    if not exist "backend\data" mkdir "backend\data"
    cd backend
    call npm run db:migrate
    call npm run db:seed
    cd ..
    echo [OK] Database initialized successfully!
)

:: 6. Frontend dependencies check
if not exist "frontend\node_modules\" (
    echo [*] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install frontend dependencies.
        pause
        exit /b 1
    )
)

echo.
echo [*] Starting Backend Server (Port 4000)...
start "MedicineLink - Backend (Port 4000)" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo [*] Starting Frontend Dev Server (Port 5173)...
start "MedicineLink - Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ================================================================
echo    MedicineLink services have been launched!
echo ================================================================
echo   - Web App:      http://localhost:5173
echo   - Backend API:  http://localhost:4000
echo   - API Health:   http://localhost:4000/api/v1/health
echo   - Swagger Docs: http://localhost:4000/api/docs
echo.
echo   Demo Login Accounts (Password for all: Demo@1234):
echo     * Donor:       aarav.donor@demo.medicinelink.org
echo     * Pharmacist:  meera.rx@greencross.demo.org
echo     * NGO:         rohan@ashahealth.demo.org
echo     * Admin:       admin@medicinelink.demo.org
echo ================================================================
echo.
echo Waiting 3 seconds before opening browser...
ping 127.0.0.1 -n 4 >nul
start http://localhost:5173

echo.
echo Both servers are running in their respective windows.
echo To stop them, close the individual terminal windows.
echo.
pause
