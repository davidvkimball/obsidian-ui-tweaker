@echo off
REM Setup script to create symlinks to the 5 core Obsidian projects
REM Run this from anywhere: scripts\setup-ref-links.bat

REM Change to project root (parent of scripts folder)
cd /d "%~dp0\.."

echo Setting up symlinks to core Obsidian projects...

REM Central .ref location (one level up from project)
set "CENTRAL_REF=..\.ref"

REM Create central .ref if it doesn't exist
if not exist "%CENTRAL_REF%" mkdir "%CENTRAL_REF%"

REM Ensure plugins and themes folders exist
if not exist "%CENTRAL_REF%\plugins" mkdir "%CENTRAL_REF%\plugins"
if not exist "%CENTRAL_REF%\themes" mkdir "%CENTRAL_REF%\themes"

REM Clone the 5 core repos if they don't exist
if not exist "%CENTRAL_REF%\obsidian-api" (
    echo Cloning obsidian-api...
    cd "%CENTRAL_REF%"
    git clone https://github.com/obsidianmd/obsidian-api.git obsidian-api
    cd "%~dp0\.."
)

if not exist "%CENTRAL_REF%\obsidian-sample-plugin" (
    echo Cloning obsidian-sample-plugin...
    cd "%CENTRAL_REF%"
    git clone https://github.com/obsidianmd/obsidian-sample-plugin.git obsidian-sample-plugin
    cd "%~dp0\.."
)

if not exist "%CENTRAL_REF%\obsidian-developer-docs" (
    echo Cloning obsidian-developer-docs...
    cd "%CENTRAL_REF%"
    git clone https://github.com/obsidianmd/obsidian-developer-docs.git obsidian-developer-docs
    cd "%~dp0\.."
)

if not exist "%CENTRAL_REF%\obsidian-plugin-docs" (
    echo Cloning obsidian-plugin-docs...
    cd "%CENTRAL_REF%"
    git clone https://github.com/obsidianmd/obsidian-plugin-docs.git obsidian-plugin-docs
    cd "%~dp0\.."
)

if not exist "%CENTRAL_REF%\obsidian-sample-theme" (
    echo Cloning obsidian-sample-theme...
    cd "%CENTRAL_REF%"
    git clone https://github.com/obsidianmd/obsidian-sample-theme.git obsidian-sample-theme
    cd "%~dp0\.."
)

REM Ensure project .ref directory exists
if not exist ".ref" mkdir .ref

REM Create symlinks for each core project
echo Creating symlink: obsidian-api
if exist ".ref\obsidian-api" rmdir ".ref\obsidian-api"
mklink /J ".ref\obsidian-api" "%CENTRAL_REF%\obsidian-api"

echo Creating symlink: obsidian-sample-plugin
if exist ".ref\obsidian-sample-plugin" rmdir ".ref\obsidian-sample-plugin"
mklink /J ".ref\obsidian-sample-plugin" "%CENTRAL_REF%\obsidian-sample-plugin"

echo Creating symlink: obsidian-developer-docs
if exist ".ref\obsidian-developer-docs" rmdir ".ref\obsidian-developer-docs"
mklink /J ".ref\obsidian-developer-docs" "%CENTRAL_REF%\obsidian-developer-docs"

echo Creating symlink: obsidian-plugin-docs
if exist ".ref\obsidian-plugin-docs" rmdir ".ref\obsidian-plugin-docs"
mklink /J ".ref\obsidian-plugin-docs" "%CENTRAL_REF%\obsidian-plugin-docs"

echo Creating symlink: obsidian-sample-theme
if exist ".ref\obsidian-sample-theme" rmdir ".ref\obsidian-sample-theme"
mklink /J ".ref\obsidian-sample-theme" "%CENTRAL_REF%\obsidian-sample-theme"

echo.
echo Setup complete!
echo.
echo Verifying symlinks...
dir .ref

