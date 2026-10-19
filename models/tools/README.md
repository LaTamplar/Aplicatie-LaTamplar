# Copie SketchUp pentru Atelier Fișă

Pe Windows, păstrează `prepare_model.py` și `Pregateste model.cmd` în același folder.
Necesită SketchUp instalat și Python 3.9+ pe 64 de biți. A fost verificat cu SketchUp 2021.1 și un model în format 2021.

1. Salvează modificările din SketchUp în fișierul `.skp`.
2. Deschide `Pregateste model.cmd` prin dublu clic și alege fișierul `.skp` în fereastra care apare. Poți folosi în continuare și tragerea fișierului peste utilitar.
3. Așteaptă mesajul cu numele copiei `Nume - Atelier.glb`, creată lângă original.
4. Deschide proiectul în Atelier Fișă → **Modele 3D** → **Adaugă model** și alege copia `.glb`.

Fișierul original rămâne intact. Pregătirea se face local, fără upload și fără serviciu de conversie extern. Dacă destinația există deja, programul se oprește pentru a nu suprascrie copia veche. Redenumește copia veche sau indică alt nume de ieșire.

Alternativ, din terminal:

```text
py -3 prepare_model.py "Model.skp" --output "Model nou.glb"
```

Pentru alegerea explicită a bibliotecii unei versiuni instalate:

```text
py -3 prepare_model.py "Model.skp" --sketchup-dll "C:\Program Files\SketchUp\SketchUp 2021\SketchUpAPI.dll"
```

Copia păstrează suprafețele 3D, grupurile/componentele, transformările, muchiile vizibile ale suprafețelor, direcția camerei, atribuirea tag-urilor, culorile și numele materialelor și texturile incluse. Fețele sunt triunghiulate pentru vizualizare. Materialele moștenite din grupuri sunt aplicate în copie. Părțile ascunse și tag-urile invizibile își păstrează starea inițială; tag-urile pot fi comutate în vizualizator.

Nu este un export complet al editorului SketchUp: nu include scenele, animațiile, textele, cotele, muchiile izolate, stilurile de randare sau extensiile instalate. Aspectul iluminării/transparenței poate diferi. Un nume comercial sau cod de decor apare numai dacă este deja scris în numele materialului; programul nu identifică automat producătorul.

Scara este convertită din inch în metri, conform unităților GLB; vizualizatorul afișează măsurile în mm. Măsurarea este distanța dreaptă dintre punctele alese, cu fixare pe vârfurile apropiate de atingere. Nu înlocuiește verificarea cotelor în proiectul original.

Limite în aplicație: 25 MB per model, 50 MB de modele per proiect. Copiile atașate intră în salvarea și exportul proiectului și în sincronizarea contului, când aceasta este activă. Modelele personale nu se includ în repository-ul public.

Biblioteca nativă SketchUp nu este distribuită aici; se folosește exclusiv copia din instalarea locală a utilizatorului.

În vizualizator, tag-urile cu suprafețe apar primele. Cele fără suprafețe sunt într-o listă separată și nu modifică imaginea. Încadrarea inițială prioritizează geometria principală; butonul Încadrează include și piesele izolate. Nicio piesă nu este eliminată.
