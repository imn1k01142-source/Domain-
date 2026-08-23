# DOMAIN — ce urmează

Ordonat după cât câștigi la juriu per oră de muncă.

---

## Pasul 0 — ce e gata

- **site-ul de prezentare** (`index.html`), un singur fișier, fonturi încorporate,
  funcționează offline, cu structura completă și cei 8 parametri explicați
- schema animată a răspunsului cardiac, cu fiecare parametru evidențiat pe rând
- matricea celor 12 sesiuni, cu stări goale explicite
- motorul de analiză: din seria de puls + timestamp-urile sperieturilor ies automat
  latența, Δ BPM, freeze-ul, revenirea și z-score-ul
- prototipul interactiv (`prototip-interactiv.html`), pe date simulate, marcat ca atare
- protocolul de testare (`GHID-TESTE.md`) și uneltele de import (`unelte/`)
- firmware de referință pentru ESP32

---

## Pasul 1 — hardware-ul, verificat cap-coadă *(prioritate maximă)*

Singurul lucru care poate strica prezentarea.

1. **Fixați protocolul cu echipa de hardware acum.** Formatul e în `README.md`.
2. **Măsurați latența capăt-la-capăt:** bateți din palme lângă senzor și comparați
   momentul din log cu momentul real. Peste ~200 ms întârziere înseamnă că toate
   latențele voastre sunt decalate sistematic.
3. **Filtru pentru artefacte de mișcare:** aruncați orice IBI care diferă cu peste 30%
   de mediana ultimelor cinci. Un salt pe scaun apare altfel ca „puls 180" și strică
   exact momentul care vă interesează.
4. **Indicator de calitate a semnalului.** Când juriul vede că știți când datele sunt
   proaste, crește credibilitatea mai mult decât orice altceva de pe listă.

---

## Pasul 2 — adnotarea clipurilor

Notați secunda exactă a fiecărui jumpscare, în `index.html`, la blocul de date.
Precizia asta e critică: latența e diferența dintre apogeul pulsului și acest timestamp,
deci o eroare de o secundă falsifică parametrul cel mai important.

Semi-automat, prin vârfurile de volum din audio — rețeta e în `GHID-TESTE.md`.

---

## Pasul 3 — cele 12 sesiuni

O sesiune de probă cu cineva din afara celor 12, apoi cele 12 reale.
Procedura identică de fiecare dată. După fiecare, completați datele în site și
contorul urcă singur.

Alocați o oră întreagă pentru primele două — o să descoperiți acolo tot ce e prost
în setup.

---

## Pasul 4 — plotter live în browser

Ce vezi când conectezi un EEG la Arduino și deschizi Serial Plotter, dar direct în
pagină. Browserul poate citi portul serial prin WebSerial — codul există deja în
`prototip-interactiv.html`.

Partea grea nu e citirea, e afișarea: să rămână fluid la 10–200 Hz, cu axa timpului
corect etichetată, fără să acumuleze memorie într-o sesiune de zece minute.
Un canvas în mod „sweep" (ca pe monitoarele din spital) rezolvă și fluența, și memoria —
desenezi doar pixelii noi, nu redesenezi tot istoricul.

---

## Pasul 5 — adaptare în timpul clipului

Momentan adaptăm între clipuri. Adaptarea reală se face în timpul lor, și asta e ce
transformă proiectul din „demo drăguț" în „produs":

- **Amânarea sperieturii:** nu declanșa următorul jumpscare cât timp z-score-ul e încă
  peste 1,5. Așteaptă coborârea — o sperietură lovește mult mai tare pe cineva care
  tocmai s-a relaxat. Designerii buni de horror fac asta din instinct; voi ați putea
  s-o faceți măsurat.
- **Ramificarea clipului:** două variante de continuare, alegi în timp real în funcție
  de reacția la ultima sperietură.
- **Pragul de siguranță:** peste baseline + 4 deviații sau +35 BPM absolut, coboară
  automat intensitatea și anunță pe ecran. E și responsabil, și impresionant.

---

## Pasul 6 — modul „scenă", cu două ecrane

Jucătorul vede jocul, publicul vede pe proiector graficul live cu marker-ele de
sperietură. Tehnic sunt vreo două ore (`BroadcastChannel` între două taburi),
vizual e cel mai puternic lucru pe care îl puteți arăta.

---

## Checklist pentru ziua demo-ului

- [ ] `index.html` deschis și testat pe laptopul de prezentare
- [ ] toate clipurile din `media/` există și pornesc
- [ ] Chrome sau Edge, nu Firefox (WebSerial nu există în Firefox)
- [ ] o sesiune reală salvată ca backup, în caz că senzorul cade
- [ ] baterie și cablu USB de rezervă pentru ESP
- [ ] cineva din echipă știe să răspundă la „și dacă senzorul citește greșit?"
      (răspunsul: indicatorul de calitate a semnalului de la pasul 1)
- [ ] cineva știe să explice de ce latența validează reacția — e cel mai bun
      argument tehnic pe care îl aveți
