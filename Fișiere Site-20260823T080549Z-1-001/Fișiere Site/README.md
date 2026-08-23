# DOMAIN

Măsurăm reacția cardiacă la jumpscare-uri și calibrăm intensitatea unui joc horror
pe pragul fiecărui jucător.

Proiect de hackathon — Gherghisan Nicolas-Ștefan, Ene Denis Mihai,
Bejenaru Alexandru Eduard, Pîrvu Mihai Teodor.

---

## Ce e în folder

| Fișier | Ce e |
|---|---|
| **`index.html`** | **Site-ul de prezentare.** Dublu-click și se deschide. Ăsta e ce vede juriul. |
| `prototip-interactiv.html` | Prototipul aplicației. Rulează pe **date simulate** și e marcat ca atare. Poate fi folosit și ca instrument de înregistrare de la ESP32. |
| `GHID-TESTE.md` | Protocolul de testare și filmare. Citește-l înainte de prima sesiune. |
| `ROADMAP.md` | Ce urmează, pe pași. |
| `unelte/` | Două scripturi Python: logger serial și convertor CSV → date pentru site. |
| `media/` | Aici pui clipurile. |
| `firmware/` | Sketch de referință pentru ESP32. |
| `_versiune-veche/` | Prima variantă, modulară. Nu mai e folosită. |

---

## Site-ul

Un singur fișier, zero dependențe, fonturile încorporate — funcționează și fără internet.
Structura, pe scroll:

1. **Problema** — jocurile horror au o singură intensitate
2. **Ideea** — putem găsi în semnal momentul în care corpul reacționează?
3. **Cum măsurăm** — lanțul hardware și ce iese din el
4. **Parametrii** — cei 8 parametri, fiecare cu ce e, de ce contează și ce decide în joc,
   pe o schemă care se aprinde pe măsură ce derulezi
5. **Protocolul** — cum rulăm cele 12 sesiuni identic
6. **Testele** — matricea 4 persoane × 3 niveluri
7. **Ipotezele** — întrebările, scrise înainte de date
8. **Ce urmează**

### Principiul de bază

**Nicio cifră de pe pagină nu e inventată.** Ce nu am măsurat încă e marcat explicit
ca nemăsurat, iar contorul din colțul din dreapta sus arată câte dintre cele 12 sesiuni
au date reale în spate. Singura reprezentare care nu vine din măsurători e schema de la
secțiunea 04 — o formă idealizată, generată matematic, etichetată ca atare chiar sub ea.

---

## Cum completezi datele

Deschizi `index.html` în orice editor de text și cauți blocul marcat:

```
▼▼▼  DATELE TESTELOR — SINGURUL LOC PE CARE TREBUIE SĂ-L EDITEZI  ▼▼▼
```

Acolo sunt cele 12 sesiuni. Pentru fiecare completată, pui `masurat: true`, baseline-ul,
timestamp-urile jumpscare-urilor și seria de puls.

**Pagina calculează singură** latența, Δ BPM, freeze-ul, timpul de revenire și z-score-ul.
Tu nu calculezi nimic de mână — și, mai important, nu poți greși calculul diferit de la
o sesiune la alta.

Detaliile complete, în `GHID-TESTE.md`.

---

## Protocolul ESP32 → calculator

Linii terminate cu `\n`, la **115200 baud**, ~10 pe secundă:

```json
{"bpm":78.2,"ibi":767}
```

| câmp | tip | obligatoriu | ce e |
|---|---|---|---|
| `bpm` | float | da | bătăi pe minut |
| `ibi` | int | nu, dar util | intervalul brut între bătăi, în ms |

Parserele acceptă și formele degradate (`BPM:78`, `78`, `78,767`), ca să nu blocheze
integrarea dacă echipa de hardware schimbă formatul pe ultima sută de metri.

**De ce contează `ibi`:** din intervalele brute se calculează RMSSD (HRV), care scade la
stres mai repede decât crește pulsul mediu. E cel mai fin indicator pe care îl avem.

Firmware de referință: `firmware/domain_esp32.ino`.
