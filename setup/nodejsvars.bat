@echo off

set WORK_PATH=D:\nodejs_projects\star_server

set FFMPEG_BIN=C:\ffmpeg\bin
set CHROME_BIN=C:\Program Files (x86)\Google\Chrome\Application
set MONGODB_BIN=C:\mongodb\bin

rem Ensure this Node.js and NPM are first in the PATH
::set PATH=%APPDATA%\npm;%~dp0;%PATH%
set PATH=%APPDATA%\npm;%~dp0;%PATH%;%FFMPEG_BIN%;%CHROME_BIN%;%MONGODB_BIN%

rem Figure out node version and architecture and print it.
setlocal
pushd "%~dp0"
set print_version=.\node.exe -p -e "process.versions.node + ' (' + process.arch + ')'"
for /F "usebackq delims=" %%v in (`%print_version%`) do set version=%%v
echo Your environment has been set up for using Node.js %version% and NPM
popd
endlocal

rem If we're in the node.js directory, change to the user's home dir.
::if "%CD%\"=="%~dp0" cd /d "%HOMEDRIVE%%HOMEPATH%"
if "%CD%\"=="%~dp0" d: && cd /d "%WORK_PATH%"
::if "%CD%\"=="%~dp0" d: && cd /d "%DOOH_PROJECT%"
