# Ghid de testare și filmare

Cele 12 sesiuni: 4 membri × 3 niveluri. Scopul e ca toate să fie făcute **identic**,
altfel nu poți compara nimic între ele.

---

## Înainte de prima sesiune

**Adnotează clipurile.** Deschide fiecare clip într-un editor și notează secunda exactă
a fiecărui jumpscare. Toată analiza se raportează la aceste momente — o eroare de o
secundă falsifică latența, care e cel mai important parametru pe care îl avem.

Trucul care te scutește de o oră: rulează clipul printr-un detector de vârfuri de volum
și verifică manual doar propunerile.

```bash
ffmpeg -i clip.mp4 -af "astats=metadata=1:reset=0.1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=rms.txt" -f null -
```

Sperieturile sunt aproape întotdeauna acolo unde volumul sare peste ~12 dB în sub 300 ms.

**Fă o sesiune de probă** cu unul dintre voi, care nu intră în cele 12. O să descoperiți
tot ce e prost în setup înainte să irosiți o sesiune reală.

---

## Ordinea sesiunilor — contrabalansată

**Nu rulați toți în ordinea ușor → mediu → greu.** Dacă o faceți, habituarea acumulată și
intensitatea nivelului variază împreună și devin imposibil de separat: o creștere la nivelul
greu ar putea veni la fel de bine din intensitate sau din poziția în secvență. Costul
contrabalansării e zero, iar în fața unui juriu tehnic e unul dintre cele mai bune argumente
că știți ce faceți.

| Participant | Sesiunea 1 | Sesiunea 2 | Sesiunea 3 |
|---|---|---|---|
| Gherghisan Nicolas-Ștefan | ușor | mediu | greu |
| Ene Denis Mihai | mediu | greu | ușor |
| Bejenaru Alexandru Eduard | greu | ușor | mediu |
| Pîrvu Mihai Teodor | ușor | greu | mediu |

**Minimum 10 minute pauză** între sesiunile aceleiași persoane, ca pulsul să revină complet
la repaus. Fără pauză, baseline-ul celei de-a doua sesiuni e contaminat de prima.

---

## Ce ținem constant

Fără astea, diferențele dintre oameni pot veni din condiții, nu din reacții.

- aceeași cameră, aceeași lumină (stinsă), același scaun
- aceleași căști, **același volum** — notează-l și verifică-l de fiecare dată
- fără cofeină cu 2 ore înainte (cofeina ridică pulsul de repaus și taie HRV-ul)
- nimeni nu a văzut clipul dinainte
- aceeași oră din zi, ±2h (pulsul de repaus variază pe parcursul zilei)
- senzorul pe **arătătorul mâinii care nu ține mouse-ul**

---

## Procedura, pas cu pas

| # | Etapă | Durată | Ce se întâmplă |
|---|-------|--------|----------------|
| 0 | Pregătire | ~2 min | Senzorul pe deget, căștile pe urechi, camerele pornite. Verifici că semnalul e curat înainte să pornești. |
| 1 | **Calibrare** | 60 s | Ecran gol, stai nemișcat, respiri normal. De aici ies baseline-ul, deviația standard și RMSSD-ul. |
| 2 | **Clipul** | 45–65 s | Rulează fără pauză. Nimeni nu vorbește. |
| 3 | **Cooldown** | 15 s | Ecran negru, senzorul rămâne pe deget, tăcere. |
| 4 | Notițe | ~1 min | Scrii imediat orice a ieșit din normal. |

**Cooldown-ul nu e opțional.** Ultima sperietură din clip are nevoie de ~10 secunde de
date după ea ca să-i poți măsura apogeul și timpul de revenire. Dacă oprești
înregistrarea odată cu clipul, ultima sperietură e pierdută.

**Notițele contează.** „A mișcat mâna la secunda 22", „a râs după prima sperietură",
„a spus că a mai văzut clipul" — toate astea explică mai târziu de ce o valoare arată
ciudat. Fără ele, o să vă uitați la un artefact și o să credeți că e o descoperire.

---

## Ce filmăm

**Recomandarea mea: un singur clip compus per sesiune**, nu trei fișiere separate.
E mult mai ușor de urmărit și arată mult mai bine în prezentare.

```
┌──────────────────────────────────┐
│                                  │
│   ecranul cu clipul horror       │   ← imaginea mare
│                                  │
│              ┌─────────┐┌──────┐ │
│              │  fața   ││plotter│ │   ← două casete mici
│              └─────────┘└──────┘ │
└──────────────────────────────────┘
```

- **Fața** — telefon sau webcam, cadru strâns pe umeri și cap. Ăsta e clipul care
  convinge: juriul vede tresărirea și o compară cu saltul din grafic.
- **Ecranul** — captură de ecran, ca să se vadă ce a declanșat reacția.
- **Plotterul** — Serial Plotter din Arduino IDE, în timp real. Ăsta e clipul care
  face legătura vizibilă între corp și cifre.

Montajul se poate face din linia de comandă:

```bash
ffmpeg -i ecran.mp4 -i fata.mp4 -i plotter.mp4 -filter_complex \
"[1:v]scale=380:-1[f];[2:v]scale=380:-1[p];\
 [0:v][f]overlay=W-w-400:H-h-20[t];[t][p]overlay=W-w-10:H-h-20" \
-c:v libx264 -crf 23 -preset fast nicolas-usor.mp4
```

Pentru documentar, filmați separat și un montaj scurt de la laborator: senzorul pe deget,
ESP-ul, echipa în timpul testelor. Nu e legat de o sesiune anume.

---

## Cum obținem seria de puls

### Varianta A — prin prototipul interactiv *(cea mai simplă)*

`prototip-interactiv.html` știe deja să vorbească cu ESP32-ul prin USB și să exporte CSV.
Îl folosiți ca instrument de înregistrare, nu ca demo:

1. Deschide `prototip-interactiv.html` în Chrome sau Edge
2. Apasă chip-ul din stânga sus → **ESP32 prin USB** → alege portul
3. Fă calibrarea (60 s) și apoi rulează clipul
4. La final, **Export CSV**

Fișierul are exact coloanele de care ai nevoie: timp, BPM, IBI, z-score.

### Varianta B — logger separat

```bash
pip install pyserial
python unelte/log-serial.py COM5 nicolas-usor.csv     # Windows
python unelte/log-serial.py /dev/ttyUSB0 x.csv        # Linux/Mac
```

Apeși Ctrl+C la final. Scriptul pune timpul în secunde de la pornire — deci pornește-l
exact când începe clipul, sau notează decalajul.

### Varianta C — n-ai log digital, doar filmarea plotterului

Se poate, dar e mai puțin precis: citești valorile de pe grafic și completezi manual
câmpul `rezultate` în loc de `serie`. Vezi exemplul comentat din `index.html`.

---

## Cum completezi datele în site

Deschizi `index.html` într-un editor de text și cauți blocul marcat:

```
▼▼▼  DATELE TESTELOR — SINGURUL LOC PE CARE TREBUIE SĂ-L EDITEZI  ▼▼▼
```

Pentru fiecare sesiune făcută, completezi:

```js
{ persoana:'nicolas', nivel:'usor', masurat:true, data:'2026-08-25',
  baseline:{ bpm:71.4, sd:3.9, rmssd:38 },
  jumpscares:[ {t:14, eticheta:'ușa'}, {t:31, eticheta:'oglinda'} ],
  serie:[ [0,70.2],[0.1,70.4], /* ... */ ],
  video:{ principal:'media/nicolas-usor.mp4' },
  nota:'A mișcat mâna la secunda 22.' },
```

Ca să transformi CSV-ul în array-ul `serie`:

```bash
python unelte/csv-in-serie.py nicolas-usor.csv
```

Îți scrie în consolă exact linia de lipit.

**Pagina calculează singură** latența, Δ BPM, freeze-ul, revenirea și z-score-ul.
Nu trebuie să calculezi nimic de mână — și, mai important, nu poți greși calculul
diferit de la o sesiune la alta.

Contorul din colțul din dreapta sus (`0 / 12 sesiuni măsurate`) urcă automat.

---

## Când citiți rezultatele

Verificări de sănătate, înainte să vă bucurați de vreo cifră:

- **Latențele ies în 1,5–3,5 s?** Dacă ies constant 5–6 s, timestamp-urile jumpscare-urilor
  sunt greșite, nu oamenii.
- **Latențe sub 1 s?** Aproape sigur artefact de mișcare. Verifică notițele.
- **Deviația standard peste ~12 BPM la calibrare?** Semnalul e prea zgomotos —
  senzor prost pus sau degetul s-a mișcat. Sesiunea e compromisă, repetați-o.
- **Δ BPM negativ la o sperietură?** Ori a fost total neafectat, ori pulsul era deja
  în coborâre de la sperietura anterioară. Uită-te la grafic, nu doar la număr.

- **Indicele de habituare H iese negativ la toată lumea?** Ori sperieturile cresc în
  intensitate pe parcursul clipului (verificați adnotările), ori aveți sensibilizare — caz în
  care e un rezultat, nu o eroare.

Și cea mai importantă: dacă o ipoteză din secțiunea 08 iese „nu", **scrieți „nu"**.
Un rezultat negativ măsurat corect valorează mai mult, în fața unui juriu tehnic,
decât unul pozitiv ales după ce ai văzut datele.
