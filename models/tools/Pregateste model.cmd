@echo off
setlocal DisableDelayedExpansion
where py >nul 2>nul
if not errorlevel 1 (
  py -3 "%~dp0prepare_model.py" %*
  goto :done
)
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" (
  "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" "%~dp0prepare_model.py" %*
  goto :done
)
where python >nul 2>nul
if not errorlevel 1 (
  python "%~dp0prepare_model.py" %*
  goto :done
)
echo Este necesar Python 3.9 sau mai nou, pe 64 de biti, si SketchUp instalat pe PC.
:done
echo.
echo Daca pregatirea a reusit, copia cu sufixul " - Atelier.glb" este langa original.
echo In proiectul din aplicatie: Modele 3D, apoi Adauga model.
pause

