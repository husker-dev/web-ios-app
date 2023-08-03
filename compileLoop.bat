@echo off
:loop
   node compileScript.js
   echo Completed: %date% %time%
goto loop