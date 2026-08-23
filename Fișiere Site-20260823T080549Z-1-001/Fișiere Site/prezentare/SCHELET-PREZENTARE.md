# DOMAIN — schelet de prezentare

14 slide-uri, ~6 minute. Imaginile numerotate sunt deja exportate în folderul ăsta.

**Stil în Canva:** fundal negru (#06060A), accent roșu (#FF2B3D), un singur accent
secundar cyan (#4CC9F0) doar pentru măsurători. Titluri: *Space Grotesk* Bold.
Cifre și etichete tehnice: *Space Mono* sau *Roboto Mono*. Nu folosi mai mult de
două culori pe un slide.

**Regula de aur:** slide-ul nu e scriptul tău. Bullet-urile de mai jos sunt ce
citește juriul în 3 secunde; restul spui tu cu voce.

---

## 1 · TITLU

**DOMAIN — Orice joc horror se strică. Măsurăm cât de repede.**

- Adaptăm intensitatea unui joc horror la răspunsul cardiac al jucătorului
- Gherghisan Nicolas-Ștefan · Ene Denis Mihai · Bejenaru Alexandru Eduard · Pîrvu Mihai Teodor

**IMAGINE:** `01-hero.png` — captura hero de pe site. Sau, mai puternic: pune imaginea
pe tot slide-ul și scrie titlul peste ea.

---

## 2 · PROBLEMA

**Nu e că unora li se pare ușor. E că tuturor ajunge să li se pară.**

- Un joc horror are o singură intensitate, fixată de designer, identică pentru toți
- **Habituarea** — scăderea răspunsului la un stimul repetat — e o proprietate garantată
  a sistemului nervos, documentată din 1966
- Deci pierderea efectului nu e un risc de design, e o **certitudine biologică**

**IMAGINE:** `05-habituare.png` — cele două curbe care coboară. E cea mai bună imagine
din tot setul pentru slide-ul ăsta: se vede instant că răspunsul scade, și că scade
diferit la doi oameni.

---

## 3 · A DOUA PROBLEMĂ

**95 de bătăi pe minut nu înseamnă nimic.**

- Pentru cineva cu repausul la 58 înseamnă panică
- Pentru cineva cu repausul la 90 înseamnă liniște
- Orice sistem care compară doi jucători prin pulsul brut eșuează din start

**IMAGINE:** un grafic simplu făcut în Canva — două linii orizontale la 58 și 90, ambele
urcând la 95, cu o săgeată pe fiecare. Sau, mai simplu, cele trei cifre uriașe: **58 · 90 · 95**.
Slide-ul ăsta merge foarte bine și doar cu tipografie mare, fără imagine.

---

## 4 · IPOTEZA

**Ce vrem să demonstrăm**

- Răspunsul cardiac la o sperietură e suficient de bine definit în timp încât să poată fi
  detectat automat și măsurat în parametri comparabili între oameni
- Dacă e adevărat, dificultatea nu se mai alege dintr-un meniu — o alege corpul
- Am scris și **condițiile în care ipoteza e falsă**, înainte de măsurători

**IMAGINE:** niciuna. Slide de text, centrat, fundal negru. O pauză vizuală după două
slide-uri dense face bine ritmului.

---

## 5 · SOLUȚIA

**O buclă închisă, în locul unui parametru fix**

- Stimul → jucător → senzor → analiză → **înapoi la intensitatea următorului stimul**
- Într-un joc clasic, săgeata de întoarcere nu există
- Bucla e tot proiectul, într-o singură imagine

**IMAGINE:** `02-bucla.png` — lanțul cu cele patru casete. Adaugă în Canva o săgeată roșie
punctată pe sub, de la „Analiză" înapoi la „Stimul", cu eticheta *intensitatea următorului stimul*.
Săgeata aia e ce trebuie să rămână în minte.

---

## 6 · CE AM CONSTRUIT ÎN 24H

**Ce merge, ce e doar proiectat**

- Achiziție, calibrare, detecție, cei 9 parametri, adaptarea între clipuri — **funcțional**
- Adaptarea în timp real și plotterul live — **proiectate, nu implementate**
- EEG — **parțial**: montaj construit, semnal încă nevalidat

**IMAGINE:** `03-stare-24h.png` — tabelul cu pastilele verzi/galbene/roșii. Onestitatea asta
e un plus în fața juriului, nu un minus: arată că știi exact unde ești.

---

## 7 · CUM MĂSURĂM

**De la un deget la un număr**

- Senzor optic pe deget + ESP32, ~10 măsurători pe secundă
- Trimite două lucruri: pulsul mediat și intervalul brut dintre bătăi
- Din intervalul brut iese variabilitatea — indicatorul care se mișcă primul la stres

**IMAGINE:** fotografie proprie — mâna cu senzorul pe deget, ESP32-ul și firele, prim-plan,
lumină laterală, fundal întunecat. **Ăsta e singurul slide unde o poză reală bate orice grafic.**
Dacă nu ai poza încă, fă-o: 30 de secunde cu telefonul.

---

## 8 · CE MĂSURĂM, DE FAPT

**Nouă numere dintr-o singură tresărire**

- Latență · amplitudine · freeze · revenire · z-score · variabilitate
- Fiecare răspunde la altă întrebare și decide altceva în joc
- „I-a crescut pulsul" nu e o măsurătoare — astea sunt

**IMAGINE:** `04-parametri.png` — schema cu toate adnotările. **Ăsta e slide-ul cel mai
important din prezentare.** Pune-l pe tot ecranul, cu titlul mic în colț. Dacă ai timp,
fă-l în două etape: întâi doar curba, apoi curba cu adnotări (animație de apariție în Canva).

---

## 9 · LATENȚA — FILTRUL DE ADEVĂR

**Cum știm că am măsurat frică și nu o mișcare a degetului**

- Sistemul nervos are nevoie de ~1,5 secunde ca să urce pulsul. Nu poate mai repede.
- Un salt la 0,3 secunde după sperietură **nu e frică** — e degetul care s-a mișcat pe senzor
- Acceptăm doar reacții cu latența între 0,4 și 8 secunde

**IMAGINE:** decupează din `04-parametri.png` doar zona cu cota „latență 2.8s" și mărește-o.
Sau un slide cu două cifre mari: **0,3 s → artefact** / **2,8 s → reacție reală**.

> Ăsta e cel mai bun argument tehnic pe care îl aveți. Nu-l grăbi.

---

## 10 · RATA DE HABITUARE

**Numărul care leagă problema de soluție**

- Cât de repede scade răspunsul la sperieturi succesive de aceeași intensitate
- H = (media primei jumătăți − media celei de-a doua) / media primei jumătăți
- H mare = te obișnuiești repede → jocul trebuie să escaladeze pentru tine

**IMAGINE:** `05-habituare.png` din nou, dar acum cu accent pe caseta cu **H = 0.55**.
Repetarea imaginii de la slide-ul 2 e intenționată — închide cercul: am pornit de la
habituare, ne întoarcem la ea, dar acum ca număr măsurat.

---

## 11 · PROTOCOLUL

**Patru oameni, trei niveluri, douăsprezece sesiuni identice**

- 60 s calibrare → clip → 15 s cooldown, aceleași condiții de fiecare dată
- **Ordinea e contrabalansată** — altfel habituarea și dificultatea nu pot fi separate
- Ipotezele sunt publicate înainte de date, ca să nu poată fi ajustate după

**IMAGINE:** `06-contrabalansare.png` — tabelul cu ordinea. Puțini se așteaptă la asta
la un hackathon; de-asta merită arătat.

---

## 12 · REZULTATE

**[titlul depinde de ce iese]**

- Baseline-urile celor patru participanți
- Δ BPM și latența pe cele trei niveluri
- Indicele H per persoană

**IMAGINE:** `07-matrice-teste.png` dacă încă nu ai date — arată onest matricea goală și
spui „aici intră datele, le colectăm astăzi". Dacă ai date, **înlocuiește-o cu o captură
a matricei completate** de pe site, sau cu un clip scurt: fața cuiva tresărind, lângă
graficul care sare.

> Dacă ai un singur clip bun cu cineva speriindu-se sincronizat cu graficul — **ăsta e
> momentul din prezentare pe care juriul îl ține minte.** Merită 20 de secunde.

---

## 13 · CE NU PUTEM SPUNE

**Limitările, spuse de noi înainte să le găsească alții**

- Patru participanți — concluzii descriptive, nu statistice
- Variabilitatea din senzor optic **nu e echivalentă** cu cea din ECG
- Pulsul măsoară activarea, iar **activarea nu are valență**: o sperietură și o victorie
  urcă pulsul la fel

**IMAGINE:** niciuna, sau o pictogramă discretă. Slide de text, sobru. Într-un juriu tehnic,
slide-ul ăsta cumpără mai multă credibilitate decât oricare altul.

---

## 14 · CE URMEAZĂ

**De la măsurat la adaptat**

- **Regula amânării:** nu declanșa sperietura cât timp pulsul e încă sus — așteaptă
  revenirea, ca să lovească mai tare
- Reaplicabilitate: același cadru merge pe orice biosemnal — am început deja un EEG DIY
- **EEG + VR:** pulsul spune *cât de mult*, semnalul cortical ar putea spune *ce fel*

**IMAGINE:** fotografie cu montajul EEG pe breadboard, sau o captură din Serial Plotter.
Chiar dacă semnalul nu e validat, imaginea cu firele și electrozii spune „am mers mai
departe decât ni s-a cerut". Pune sub ea, cu litere mici: *montaj în lucru, semnal nevalidat*.

---

## Final (opțional, dacă ai 15 slide-uri)

**Mulțumim · întrebări**

- QR code către site
- Link către raportul tehnic de 26 de pagini

**IMAGINE:** `01-hero.png` din nou, întunecat, cu textul peste.

---

## Ce imagini îți lipsesc și merită făcute

Trei fotografii proprii, toate de 30 de secunde cu telefonul:

1. **Senzorul pe deget** — prim-plan, lumină laterală, fundal întunecat (slide 7)
2. **Montajul EEG pe breadboard** — de sus, firele vizibile (slide 14)
3. **Echipa în timpul unui test** — cineva cu căști și senzor, în întuneric, ecranul
   luminându-i fața (bun pentru slide 11 sau ca fundal la titlu)

Și un clip: **fața cuiva tresărind, alături de grafic**. Ăla nu se poate înlocui cu nimic.

## Ce să NU pui

- Poze de stock cu creiere, ADN sau „inteligență artificială" — sunt semnalul universal
  că nu ai conținut propriu
- Capturi din jocuri horror comerciale, ca și cum ar fi ale voastre
- Mai mult de 3 bullet-uri pe slide
