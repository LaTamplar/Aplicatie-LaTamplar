# Notițe A4 — 1.23.29

## 1.23.29 — Redesign compact și desen fluid

- Pagina Proiecte folosește un header compact și filtrele se rearanjează în mai multe rânduri când nu încap, fără să ascundă Favorite.
- Editorul păstrează toate comenzile și reduce înălțimea barelor pe tablete; panoul de pagini și controalele rămân accesibile în portrait și landscape.
- La redimensionare sau rotirea ecranului, editorul păstrează punctul documentului aflat sub centrul suprafeței; gestul de pan pornește din coordonatele pointerului curent.
- Trasarea activă se desenează pe un canvas transparent separat. Evenimentele coalesced sunt grupate pe cadru, iar stratul de bază nu mai este redat pentru fiecare mișcare a evidențiatorului.
- Trasările libere folosesc curbe quadratice; coordonatele și presiunea salvate rămân datele primare. Coordonatele previzionate nu se persistă.
- Normalizarea traseelor folosește o parcurgere incrementală a punctelor, fără extinderea unei liste mari ca argumente de funcție.
- Verificat în Edge headless: Proiecte și editor la 390×844, 768×1024, 820×1180, 1024×768, 1180×820 și 1440×1000; desen simulat, autosave, Undo/Redo, zoom și export PDF. Apple Pencil fizic și Safari pe iPadOS necesită verificare pe dispozitiv.

## 1.22.9 — Audit vizual și texte unitare

- Proiectele și notițele folosesc aceleași culori, chenare, date, statistici și dimensiuni pentru acțiunile cardurilor.
- Numărul de notițe are forma corectă la singular, iar starea locală folosește aceeași formulare în toată aplicația.
- Comenzile rămase în engleză au fost traduse, inclusiv istoricul, exportul și tipărirea.
- Starea activă din meniul lateral și zonele de apăsare au fost întărite pentru PC și tabletă.

## 1.22.8 — Grosimi și sincronizare reorganizate

- Grosimea formelor și a desenului din proiecte folosește selectoare cu opțiuni rapide și previzualizare.
- Acțiunea de ștergere din modul Desen este denumită clar „Șterge desenele”.
- Asocierea unei notițe existente nu mai are câmp de căutare, iar mesajul explică exact mutarea între proiecte.
- Fereastra Cont și sincronizare are ierarhie, spațiere și butoane optimizate pentru PC și tabletă.

## 1.22.7 — Rotire text centrată

- Cercul decorativ al mânerului de rotire a fost eliminat.
- Simbolul cu două săgeți este centrat deasupra casetei de text pe PC și tabletă.
- Zona de atingere și linia de legătură rămân disponibile fără să încarce vizual chenarul.

## Publicare

Înlocuiește `index.html` și `sw.js` în rădăcina site-ului și adaugă folderul
`notes` lângă ele, cu toate fișierele sale. Păstrează celelalte fișiere existente
ale site-ului (manifest, iconuri etc.). Nu încărca folderul `audit`.

Versiunile viitoare folosesc maximum `.15`; după `1.17.15` urmează `1.18.0`.

## Arhitectură

`notes-editor.js` este un modul izolat, fără importuri de rețea, împărțit în:

- NotesStore: IndexedDB, salvare tranzacțională, migrare fără ștergerea originalelor.
- NotesManager: listă, căutare, creare, detalii, duplicare, ștergere, import.
- NoteEditor: sesiune, istoric, autosave, gesturi, obiecte și coordonate.
- PageManager: pagini A4, orientare, tip de foaie, ordine și miniaturi.
- A4Canvas: randare comună pentru editor, miniaturi și export.
- TextObject / ImageObject: reprezentare și randare independentă.
- DrawingLayer: trasări cu presiune, linii, marker și highlighter.
- SelectionLayer: handles, deplasare, redimensionare și rotație.
- Toolbar: moduri principale și comenzi contextuale.
- Export: PDF A4, PNG, ZIP cu toate PNG-urile, Print și copie editabilă JSON.

PDF-ul conține pagini randate la rezoluție dublă și dimensiuni fizice A4
(595.28 × 841.89 puncte, inversate pentru orizontal). Copia `.anote.json`
păstrează toate obiectele editabile și poate fi importată în manager.

## Date și compatibilitate

Baza `atelier-a4-notes` conține câte un document per notiță. Schema 1:
`id`, `title`, `description`, `createdAt`, `updatedAt`, `activePage`, `pages`.
Fiecare pagină conține `id`, `orientation`, `paper`, `objects`.
Coordonatele sunt în spațiul A4 de 794 × 1123 (sau invers), independente de zoom.
Obiectele conțin `type`, `x`, `y`, `w`, `h`, `rotation`, `opacity`, `locked`
și date specifice: text/stil, imagine/crop, traseu/presiune sau formă.

Salvarea este locală acestui browser/dispozitiv; nu adaugă sincronizare în cloud.
Notițele generale vechi sunt importate o singură dată, iar cheia lor localStorage
originală este păstrată. Notițele interactive din proiectele cu imagini rămân separate.
Guma șterge local porțiuni din trasări, inclusiv printr-un gest continuu; păstrează textul, imaginile și obiectele blocate. Undo reface întregul gest de ștergere.
Evidențiatorul folosește o urmă continuă translucidă, fără suprapuneri între segmente. Grosimea sa și mărimea gumei sunt independente de creion.

Touch: un deget pentru instrumentul activ, două pentru zoom/deplasare.
În timpul unei trasări cu pen, contactele touch suplimentare sunt ignorate.
Mouse: tragere pe obiect sau handles; Ctrl/Cmd+Z și Shift+Ctrl/Cmd+Z pentru istoric.

`pdf-lib.min.js` este distribuit local sub licența MIT alăturată.

## Verificare

`node work/layout/audit/notes-a4.cjs`: test integrat în Edge cu date izolate,
inclusiv migrare, editare, presiune pen simulată, pinch touch, manipulare obiecte,
salvare/reîncărcare, PDF A4 mixt, PNG, ZIP, print, import și căutare.
`node work/layout/verify.cjs`: verificări pentru aplicația existentă.

Gesturile sunt testate prin simulare de browser; tastatura iPadOS, Apple Pencil
fizic și tipărirea pe hardware necesită verificare pe dispozitiv.

Preferințele instrumentelor sunt salvate local în `atelier-note-tool-settings-v1`: grosime separată pentru creion, linie, linie punctată, evidențiator, gumă și fiecare formă, plus mărimea implicită a textului. Sunt comune notițelor de pe același browser/dispozitiv și nu modifică obiectele deja desenate.

## Modul Text — 1.21.2

- Editor contenteditable temporar, fără fundal permanent. Tap/click selectează; dublu tap/click editează.
- Formatare pe fragmente prin `runs` (indici UTF-16 și stiluri). Textul simplu rămâne în `text`, compatibil cu notițele existente.
- Spațiere, indent, paragraf, gradient, texturi, efecte și blend mode sunt proprietăți ale obiectului. Se păstrează în IndexedDB, copia editabilă și sincronizarea existentă.
- Randare canvas comună pentru foaie, miniaturi, PNG, PDF și print; texturile încărcate se păstrează în document.
- Teste locale în Edge: mouse, touch simulat, selecție parțială, Ctrl+B/I, drag, resize lateral, duplicate/lock/delete, undo/redo, autosave, reload, PNG/PDF și conținut print. Dimensiuni: 768×1024, 1024×768, 1440×1000.
- iPad/Safari fizic și dialogul real al imprimantei nu au fost testate automat. Pipeta apare numai în browserele care oferă EyeDropper.

## Paletă simplificată — 1.21.2

Text, Desen și Forme folosesc aceeași paletă de culori simple: preseturi, recente, culori salvate și selector personalizat. Butoanele de culoare și „+” au aceeași dimensiune și aliniere. Taburile Gradient/Textură au fost eliminate din interfață; randarea proprietăților deja salvate rămâne compatibilă cu notițele existente.
Verificări: 768×1024, 1024×768 și 1440×1000; dimensiuni egale, deschidere/închidere prin același buton, alegere culoare, istoric și selector personalizat.

## Asociere și instrumente — 1.21.2

- Meniul proiectului permite asocierea unei notițe existente; „Adaugă notiță” oferă creare sau asociere. Meniul notiței permite alegerea/schimbarea/eliminarea proiectului asociat. Se actualizează aceeași notiță și se păstrează conținutul.
- Bara Text folosește aliniere și listă compacte pe tabletă și opțiuni inline pe desktop.
- Butonul + afișează culoarea selectată, cu simbol adaptat pentru contrast. Culoarea personalizată are doar selectorul și Aplică; istoricul rămâne în Recente, sub preseturi.
- Evidențiatorul are opacitate reglabilă 1–100%, memorată local și inclusă în fiecare trasare nouă.
- Verificat: asocieri în ambele sensuri fără duplicare/pierdere de conținut; layout Text 768×1024, 1024×768, 1440×1000 fără overflow; culoare/aplicare/istoric; persistență opacitate și trasare cu valoarea aleasă.

## 1.21.3

- Spații uniforme și controale încadrate în bara Text, pe desktop și tabletă.
- Crearea și asocierea notițelor sunt grupate în „Adaugă notiță” la proiecte.
- Meniul notițelor se adaptează textului complet al acțiunilor.

## 1.21.4 — Text pe foaie

- Eliminat meniul de proprietăți avansate (spațiere și efecte) de lângă Undo/Redo.
- Un clic cu instrumentul Text plasează o casetă la poziția indicată; tragerea stabilește lățimea.
- Un clic pe un text existent cu instrumentul Text deschide editarea, fără duplicare.
- Contur discret în timpul editării, cu zoom stabil și aliniere în interiorul casetei.
- Liste cu puncte și numere vizibile inclusiv în editare; Enter adaugă rânduri, iar continuările se aliniază sub text.
- Lipirea și rândurile noi păstrează selecția și formatarea.

## 1.21.5 — Miniaturi și rotire

- Dimensiunile scrise peste imaginile proiectelor apar și în miniaturile proiectelor și ale imaginilor.
- Exportul imaginii include valorile dimensiunilor la pozițiile salvate.
- Selecția obiectelor are mânere vizuale mai mici, cu zone de atingere păstrate pentru tabletă.
- La rotire apare sub obiect un indicator cu grade, care rămâne drept pe ecran.
- Rotirea se fixează la multipli de 15°, cu opriri mai clare la 0°, 45°, 90° și celelalte axe principale.

## 1.21.6 — Inserare rapidă și bare compacte

- Alegerea unui stil de text fără obiect selectat creează automat o casetă pe foaie, ca în Canva, și selectează textul demonstrativ pentru înlocuire imediată.
- Stilurile Titlu, Heading și Subtitlu pornesc centrate și cu dimensiunea potrivită; Corp de text și Citat pornesc aliniate la stânga.
- Mânerul de rotire folosește două săgeți circulare, iar unghiul numeric rămâne vizibil sub obiect în timpul rotirii.
- Bara obiectului selectat păstrează opacitate, duplicare, blocare și ștergere; câmpul numeric de rotație și comenzile de ordine au fost eliminate.
- Grosimea creionului, evidențiatorului, liniilor, formelor și gumei este afișată doar ca număr, fără „px”.
- Interfața a fost verificată la 768×1024, 1024×768, 820×1180, 1180×820 și 1440×1000, fără depășirea ferestrei sau suprapunerea controalelor.

## 1.21.7 — Mutare, scalare și unghiuri semnate

- Un text existent poate fi tras direct chiar dacă instrumentul Text era activ; aplicația trece automat în selectare.
- În editare, marginea casetei are o zonă mai ușor de prins cu mouse-ul sau degetul și afișează cursorul de mutare.
- Tragerea mânerelor de redimensionare mărește sau micșorează proporțional fontul și caseta textului.
- Mânerul superior afișează clar două săgeți circulare, fără bula decorativă.
- Rotația este normalizată între −180° și 180°; cele două sensuri sunt afișate cu semnul corect.

## 1.21.8 — Meniuri și text mai compacte

- Statusul proiectului este grupat într-o singură acțiune „Schimbă statusul”, care deschide un meniu separat cu opțiunile disponibile și buton de întoarcere.
- Meniul notiței folosește aceeași suprafață, spațiere, culori și evidențiere ca meniul proiectului.
- „Stil text” apare primul în bara Text și este evidențiat ca acțiune principală pentru aplicarea sau inserarea unui stil.
- Alinierea și listele afișează câte un singur buton; variantele se deschid doar la apăsare.
- Meniurile și bara Text au fost verificate pe telefon, tabletă verticală și orizontală și desktop, fără suprapuneri sau ieșiri din fundal.

## 1.21.9 — Corecție bară desen pe tabletă

- Bara de desen a imaginilor afișează numai cele cinci culori principale; culorile recente suplimentare au fost eliminate.
- Valoarea grosimii are contrast corect și rămâne vizibilă în caseta de lângă glisor.
- Numărul se actualizează imediat la deplasarea glisorului și a fost verificat în ambele orientări ale tabletei.

## 1.21.10 — Stare activă Desen pe tabletă

- După comutarea din „Note” în „Desen”, butonul activ revine constant la albastrul principal cu text alb.
- Starea tactilă rămasă de la ultima apăsare nu mai transformă butonul activ într-un albastru pal.
- Comutatorul expune corect starea selectată și a fost verificat pe tabletă verticală și orizontală.

## 1.21.11 — Bară de instrumente unificată

- Instrumentele principale au aceeași înălțime, lățimi coerente și o singură stare activă albastră.
- Pentru imaginile selectate, comenzile sunt grupate în editare, opacitate și acțiuni rapide; duplicarea, blocarea și ștergerea folosesc butoane pătrate compacte.
- Modurile Desen și Forme folosesc aceleași suprafețe, raze, spațiere și înălțime redusă.
- Pe tabletele înguste, comenzile principale devin pictograme și rămân într-un singur rând derulabil, fără suprapuneri.
- Verificat pe 768×1024, 1024×768 și 1440×1000, inclusiv editare text, selecție imagine, desen și forme.

## 1.21.12 — Cifre vizibile în imaginile exportate

- Valorile dimensiunilor se scalează proporțional cu rezoluția fotografiei salvate.
- Exporturile Full HD și de rezoluție mare păstrează cifrele lizibile deasupra liniilor.
- Miniaturile păstrează dimensiunea compactă anterioară, fără text supradimensionat.

## 1.21.13 — Comenzi aliniate și pagini cu nume

- Instrumentele de desen și forme, culorile și istoricul sunt aliniate vertical pe PC și tabletă; comenzile rămân accesibile când spațiul este îngust.
- Undo și Redo stau lângă celelalte comenzi ale unui obiect selectat; în rândul de sus apar numai când selecția este goală.
- Paginile notițelor pot primi un nume personalizat, păstrat la salvare și folosit la exportul PNG.
- Selectorul mărimii textului are previzualizare, glisor și opțiuni rapide; selecția textului folosește albastrul principal.
- Redenumirea imaginilor proiectului salvează numele pe intrarea curentă chiar dacă lista a fost reconstruită între timp.

## 1.21.14 — Comenzi în dreapta și zoom al paginii

- Grupurile pentru Desen și Forme rămân aliniate vertical, dar sunt poziționate în dreapta barei.
- În antet, lângă Detalii și Export, sunt disponibile micșorarea, încadrarea paginii în ecran și mărirea, cu procentul vizibil.
- Textul se deschide pentru editare printr-o atingere pe tabletă și are un mâner separat, mare, pentru mutare fără selectarea accidentală a conținutului.
- Modul Desen rămâne albastru închis după atingere și după comutarea din Text pe tabletă.
