@echo off
REM Simple setup script to create symlink to central .agents directory
REM Run this from anywhere: scripts\setup-agents-link.bat

REM Change to project root
cd /d "%~dp0\.."

echo.
echo ========================================
echo   Setting up .agents symlink
echo ========================================
echo.
echo Current directory: %CD%
echo.

REM Get current directory name for display
for %%I in ("%CD%") do set "CURRENT_DIR=%%~nxI"

REM Check if we're in the template repository (has real .agents directory, not symlink)
REM Detection: if .agents exists and is NOT a symlink, we're in the template
if exist ".agents" (
    REM Check if it's a junction/symlink
    dir /A .agents 2>nul | find "JUNCTION" >nul 2>&1
    if not errorlevel 1 (
        REM It's a symlink - we're in a plugin project
        goto :plugin_project
    )
    dir /A .agents 2>nul | find "<SYMLINKD>" >nul 2>&1
    if not errorlevel 1 (
        REM It's a symlink - we're in a plugin project
        goto :plugin_project
    )
    REM It's a real directory - we're in the template
    goto :central_repo
) else (
    REM .agents doesn't exist - check if central location exists to determine context
    if exist "..\.ref\obsidian-dev\.agents" (
        REM Central location exists, so we're in a plugin project
        goto :plugin_project
    ) else (
        REM No .agents and no central location - assume we're in template (will create central)
        goto :central_repo
    )
)

:central_repo
REM We're in the template repository - create symlink from central location to local .agents
echo Detected: Template repository (%CURRENT_DIR%)
echo.
echo Step 1: Checking local .agents directory exists...
if not exist ".agents" (
    echo   ERROR: .agents directory not found!
    echo   The template repository must have a real .agents directory.
    echo   Please ensure .agents exists before running this script.
    pause
    exit /b 1
)
echo   Local .agents directory found
echo.
echo Step 2: Ensuring central location exists...
if not exist "..\.ref\obsidian-dev" (
    echo   Creating ..\.ref\obsidian-dev directory...
    mkdir "..\.ref\obsidian-dev"
)

echo.
echo Step 3: Removing existing central symlink (if any)...
if exist "..\.ref\obsidian-dev\.agents" (
    rmdir "..\.ref\obsidian-dev\.agents" 2>nul
    if errorlevel 1 (
        echo   ERROR: Could not remove existing ..\.ref\obsidian-dev\.agents
        echo   Please remove it manually and re-run this script
        pause
        exit /b 1
    )
)

echo.
echo Step 4: Creating symlink...
REM Convert relative path to absolute path for mklink
for %%I in ("%CD%\.agents") do set "LOCAL_ABS=%%~fI"
for %%I in ("..\.ref\obsidian-dev\.agents") do set "CENTRAL_ABS=%%~fI"
echo   Source: %LOCAL_ABS%
echo   Target: %CENTRAL_ABS%
mklink /J "%CENTRAL_ABS%" "%LOCAL_ABS%"
if errorlevel 1 (
    echo.
    echo ERROR: Failed to create symlink
    echo   You may need to run Command Prompt as Administrator
    echo   Or enable Developer Mode in Windows Settings
    pause
    exit /b 1
)

echo.
echo SUCCESS: Central symlink created!
echo.
echo Verification: Checking central symlink...
if exist "..\.ref\obsidian-dev\.agents" (
    dir /A "..\.ref\obsidian-dev\.agents" | find "JUNCTION" >nul 2>&1
    if not errorlevel 1 (
        echo   Central symlink verified (JUNCTION)
    ) else (
        dir /A "..\.ref\obsidian-dev\.agents" | find "<SYMLINKD>" >nul 2>&1
        if not errorlevel 1 (
            echo   Central symlink verified (SYMLINKD)
        ) else (
            echo   WARNING: Central location exists but may not be a symlink
        )
    )
) else (
    echo   ERROR: Central symlink is missing!
    pause
    exit /b 1
)
goto :end

:plugin_project
REM We're in a plugin project - create symlink from local .agents to central location
echo Detected: Plugin project (%CURRENT_DIR%)
echo.
echo Step 1: Checking central location exists...
set "CENTRAL_PATH=..\.ref\obsidian-dev\.agents"
if not exist "%CENTRAL_PATH%" (
    echo.
    echo ERROR: Central .agents location not found!
    echo   Expected: %CENTRAL_PATH%
    echo   Current directory: %CD%
    echo.
    echo   Please run this script from the template repository first
    echo   (the repository that contains the real .agents directory)
    echo.
    pause
    exit /b 1
)
echo   Central location found: %CENTRAL_PATH%

echo.
echo Step 2: Removing existing .agents (if any)...
if exist ".agents" (
    REM Try to remove it (works if symlink)
    rmdir ".agents" 2>nul
    if errorlevel 1 (
        REM It's a real directory - back it up
        echo   .agents is a real directory - backing up...
        if exist ".agents.backup" rmdir /s /q ".agents.backup"
        move ".agents" ".agents.backup" >nul 2>&1
        if errorlevel 1 (
            echo   ERROR: Could not move .agents to .agents.backup
            echo   Please remove .agents manually and re-run this script
            pause
            exit /b 1
        )
        echo   Backed up to .agents.backup
    ) else (
        echo   Removed existing symlink
    )
) else (
    echo   No existing .agents found
)

echo.
echo Step 3: Creating symlink...
REM Convert relative path to absolute path for mklink
for %%I in ("%CENTRAL_PATH%") do set "CENTRAL_ABS=%%~fI"
echo   Source: .agents
echo   Target: %CENTRAL_ABS%
mklink /J ".agents" "%CENTRAL_ABS%"
if errorlevel 1 (
    echo.
    echo ERROR: Failed to create symlink
    echo   You may need to run Command Prompt as Administrator
    echo   Or enable Developer Mode in Windows Settings
    if exist ".agents.backup" (
        echo.
        echo Restoring backup...
        move ".agents.backup" ".agents" >nul 2>&1
    )
    pause
    exit /b 1
)

echo.
echo SUCCESS: Project symlink created!

REM Verification for plugin projects
echo.
echo ========================================
echo   Verification
echo ========================================
if exist ".agents" (
    echo .agents exists
    dir /A .agents | find "JUNCTION" >nul 2>&1
    if not errorlevel 1 (
        echo .agents is a symlink (JUNCTION)
    ) else (
        dir /A .agents | find "<SYMLINKD>" >nul 2>&1
        if not errorlevel 1 (
            echo .agents is a symlink (SYMLINKD)
        ) else (
            echo WARNING: .agents exists but may not be a symlink
        )
    )
) else (
    echo ERROR: .agents is missing!
    pause
    exit /b 1
)

:end
echo.
echo ========================================
echo   Setup complete!
echo ========================================
echo.
pause
