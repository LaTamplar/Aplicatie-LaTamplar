@echo off
setlocal DisableDelayedExpansion
if "%~1"=="" (
  echo Trage un fisier .skp peste acest program pentru a pregati copia .glb.
  echo Originalul SketchUp ramane nemodificat. Nu se incarca nimic pe internet.
  pause
  exit /b 1
)
where py >nul 2>nul
if not errorlevel 1 (
  py -3 "%~dp0prepare_model.py" "%~1"
  goto :done
)
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" "%~dp0prepare_model.py" "%~1"
  goto :done
)
where python >nul 2>nul
if not errorlevel 1 (
  python "%~dp0prepare_model.py" "%~1"
  goto :done
)
echo Este necesar Python 3.9 sau mai nou, pe 64 de biti, si SketchUp instalat pe PC.
:done
echo.
echo Daca pregatirea a reusit, copia cu sufixul " - Atelier.glb" este langa original.
echo In proiectul din aplicatie: Modele 3D, apoi Adauga model.
pause
