# Atelier Fișă

Aplicație statică publicată prin GitHub Pages.

- `index.html` — interfața principală și legăturile către module.
- `notes/` — editorul de notițe, documentația și biblioteca PDF.
- `inventory/` — codul și stilurile inventarului.
- `models/` — vizualizarea 3D a proiectelor, biblioteca Three.js și utilitarul local de pregătire SketchUp.
- `pdfjs-*` — motorul local pentru importul PDF.
- `.nojekyll` — păstrează fișierele statice fără procesare Jekyll.
- `.github/workflows/pages.yml` — fluxul anterior, dezactivat în GitHub pentru a evita publicările paralele.

Modulele active sunt grupate în directoare cu căi stabile. Pachetele de versiuni vechi au fost scoase din rădăcină; istoricul lor rămâne recuperabil prin commiturile Git.

## Publicare

GitHub Pages este configurat pe **Deploy from a branch → main → / (root)**. Modificările trimise în `main` sunt publicate automat la https://latamplar.github.io/Aplicatie-LaTamplar/ prin fluxul standard `pages-build-deployment`.

## Modele 3D

Într-un proiect, **Modele 3D → Adaugă model** permite atașarea unei copii GLB. Copiile pregătite cu [utilitarul pentru PC](models/tools/README.md) păstrează tag-urile, materialele și scara pentru măsurare. Modelele personale și originalele SketchUp nu se adaugă în acest repository public.
