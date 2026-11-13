@echo off
setlocal enabledelayedexpansion
title Sentence Magic - LAN Launcher

set "PORT=8777"
cd /d "%~dp0"

echo.
echo  ================================================
echo    Sentence Magic  -  LAN Launcher
echo  ================================================
echo.

REM ============================================================
REM  1. Locate Python
REM ============================================================
set "PYCMD="

py -3 -c "import sys" >nul 2>&1
if not errorlevel 1 set "PYCMD=py -3"
if defined PYCMD goto :gotpy

python -c "import sys" >nul 2>&1
if not errorlevel 1 set "PYCMD=python"
if defined PYCMD goto :gotpy

python3 -c "import sys" >nul 2>&1
if not errorlevel 1 set "PYCMD=python3"
if defined PYCMD goto :gotpy

if exist "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" set "PYCMD=%LOCALAPPDATA%\Programs\Python\Python313\python.exe"
if defined PYCMD goto :gotpy
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" set "PYCMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
if defined PYCMD goto :gotpy
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" set "PYCMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
if defined PYCMD goto :gotpy
if exist "C:\Python313\python.exe" set "PYCMD=C:\Python313\python.exe"
if defined PYCMD goto :gotpy
if exist "C:\Python312\python.exe" set "PYCMD=C:\Python312\python.exe"
if defined PYCMD goto :gotpy

echo  [ERROR] Python 3 was not found on this computer.
echo.
echo  How to fix:
echo    1. Download Python 3 from https://www.python.org/downloads/
echo    2. During setup tick "Add python.exe to PATH"
echo    3. Run this file again
echo.
pause
exit /b 1

:gotpy
echo  Python  : %PYCMD%

REM ============================================================
REM  2. Free the port.
REM  A server left over from an earlier run still holds the port.
REM  If that one was started by a Python without edge-tts, it
REM  answers 503 and the pet silently falls back to the browser
REM  voice - even though a newer window says "Edge TTS: ready".
REM  Kill every leftover listener before starting a fresh one.
REM ============================================================
set "STALE=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do call :KILLSTALE %%P
if "%STALE%"=="0" goto :portfree
echo  Port    : %PORT% was busy, cleaned %STALE% stale server(s).
goto :portdone
:portfree
echo  Port    : %PORT% free.
:portdone

REM ============================================================
REM  3. Edge TTS - the voice of the pet.
REM  "import edge-tts" is NOT enough: the module imports fine and
REM  still fails every request once Microsoft moves its Sec-MS-GEC
REM  version on.  So synthesize one real sentence instead, and
REM  upgrade the library automatically when that fails.
REM ============================================================
set "PROBE=%TEMP%\sm_edge_probe.py"
set "TOUT=%TEMP%\sm_edge_probe.txt"
call :WRITEPROBE

%PYCMD% "%PROBE%" > "%TOUT%" 2>&1
if not errorlevel 1 goto :ttsok

echo  Edge TTS: broken - repairing ...
%PYCMD% -m pip install --quiet --disable-pip-version-check --upgrade --force-reinstall --no-deps edge-tts >nul 2>&1
%PYCMD% "%PROBE%" > "%TOUT%" 2>&1
if not errorlevel 1 goto :ttsfixed

echo  Edge TTS: retrying with a mirror ...
%PYCMD% -m pip install --quiet --disable-pip-version-check --upgrade --force-reinstall --no-deps -i https://pypi.tuna.tsinghua.edu.cn/simple edge-tts >nul 2>&1
%PYCMD% "%PROBE%" > "%TOUT%" 2>&1
if not errorlevel 1 goto :ttsfixed

echo  [WARN] Edge TTS is still broken.
type "%TOUT%"
echo         The pet will use the browser voice for now.
echo         Check the internet connection and run this file again.
goto :ttsdone

:ttsfixed
echo  Edge TTS: repaired and working.
type "%TOUT%"
goto :ttsdone

:ttsok
echo  Edge TTS: ready  (real sentence synthesized)
type "%TOUT%"
:ttsdone

REM ============================================================
REM  4. Firewall - let other devices reach this port
REM ============================================================
net session >nul 2>&1
if errorlevel 1 goto :fwskip

netsh advfirewall firewall delete rule name="Sentence Magic %PORT%" >nul 2>&1
netsh advfirewall firewall add rule name="Sentence Magic %PORT%" dir=in action=allow protocol=TCP localport=%PORT% >nul 2>&1
echo  Firewall: inbound TCP %PORT% allowed.
goto :fwdone

:fwskip
echo  Firewall: not elevated - rule not added.
echo            If phones or tablets cannot connect, close this window,
echo            right-click this file and pick "Run as administrator" once.
:fwdone

REM ============================================================
REM  5. Start the server on all network interfaces
REM ============================================================
echo.
echo  Starting server on 0.0.0.0:%PORT% ...
echo  The LAN address for other devices is printed below.
echo  Keep this window open. Press Ctrl+C to stop.
echo.

%PYCMD% server.py --host 0.0.0.0 --port %PORT%
set "RC=%ERRORLEVEL%"

echo.
if not "%RC%"=="0" echo  [ERROR] Server exited with code %RC%.
if "%RC%"=="0" echo  Server stopped.
echo.
echo  Press any key to close this window.
pause >nul
exit /b %RC%

REM ============================================================
REM  Kill one listener - only when it really is a python process
REM ============================================================
:KILLSTALE
tasklist /FI "PID eq %1" /NH 2>nul | findstr /I "python py.exe" >nul
if errorlevel 1 exit /b 0
taskkill /F /PID %1 >nul 2>&1
if not errorlevel 1 set /a STALE+=1
exit /b 0

REM ============================================================
REM  Write the real-synthesis probe to TEMP
REM ============================================================
:WRITEPROBE
>"%PROBE%" echo import asyncio, sys
>>"%PROBE%" echo try:
>>"%PROBE%" echo     import edge_tts
>>"%PROBE%" echo     from edge_tts.constants import SEC_MS_GEC_VERSION as GEC
>>"%PROBE%" echo except Exception as e:
>>"%PROBE%" echo     print("IMPORT_FAIL", type(e).__name__, e)
>>"%PROBE%" echo     sys.exit(2)
>>"%PROBE%" echo.
>>"%PROBE%" echo async def run():
>>"%PROBE%" echo     total = 0
>>"%PROBE%" echo     async for chunk in edge_tts.Communicate("\u4f60\u597d\u5440\uff0c\u6211\u662f\u5c0f\u9cb8", "zh-CN-XiaoyiNeural", rate="-6%%").stream():
>>"%PROBE%" echo         if chunk.get("type") == "audio":
>>"%PROBE%" echo             total += len(chunk["data"])
>>"%PROBE%" echo     return total
>>"%PROBE%" echo.
>>"%PROBE%" echo try:
>>"%PROBE%" echo     size = asyncio.run(run())
>>"%PROBE%" echo except Exception as e:
>>"%PROBE%" echo     print("SYNTH_FAIL", type(e).__name__, str(e)[:160])
>>"%PROBE%" echo     sys.exit(3)
>>"%PROBE%" echo.
>>"%PROBE%" echo if size ^< 1000:
>>"%PROBE%" echo     print("SYNTH_EMPTY", size)
>>"%PROBE%" echo     sys.exit(4)
>>"%PROBE%" echo print("EDGE_OK", size, "bytes", "GEC", GEC)
>>"%PROBE%" echo sys.exit(0)
exit /b 0
