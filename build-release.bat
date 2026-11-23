@echo off
call npm install
call npx cap add android
call npx cap sync android
cd android
call gradlew.bat assembleRelease
cd ..
pause
