@echo off
echo Installing dependencies...
call npm install

echo.
echo Starting I2V Workflow Server...
echo Server will run on http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

node server.js
