#!/usr/bin/env python3
"""
Transformă un CSV cu pulsul într-un array `serie` gata de lipit în index.html.

    python csv-in-serie.py nicolas-usor.csv
    python csv-in-serie.py nicolas-usor.csv --decalaj 3.2   # dacă log-ul a pornit
                                                            # cu 3.2s înaintea clipului

Merge cu CSV-ul scos de log-serial.py și cu cel exportat din prototip-interactiv.html.
Caută singur coloanele de timp și de BPM, oricum s-ar numi.

Ca să nu iasă un fișier uriaș, rărește la ~10 eșantioane pe secundă (destul:
un răspuns cardiac durează secunde, nu milisecunde) și rotunjește la 2 zecimale.
"""
import sys, csv, os

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit(__doc__)
    cale = args[0]
    decalaj = 0.0
    if "--decalaj" in sys.argv:
        decalaj = float(sys.argv[sys.argv.index("--decalaj") + 1])

    with open(cale, newline="", encoding="utf-8-sig") as f:
        randuri = list(csv.reader(f))

    if not randuri:
        sys.exit("Fișier gol.")

    # găsim coloanele, indiferent cum sunt scrise capetele de tabel
    cap = [c.strip().lower() for c in randuri[0]]
    are_cap = any(not _numar(c) for c in cap)
    if are_cap:
        it = _idx(cap, ["t_s", "t", "timp", "time", "secunde", "sec"])
        ib = _idx(cap, ["bpm", "puls", "hr", "heartrate"])
        date = randuri[1:]
    else:
        it, ib, date = 0, 1, randuri
    if it is None or ib is None:
        sys.exit("Nu găsesc coloanele de timp și BPM. Capete găsite: %s" % cap)

    puncte = []
    for r in date:
        if len(r) <= max(it, ib):
            continue
        try:
            t = float(r[it]) - decalaj
            b = float(r[ib])
        except ValueError:
            continue
        if b < 25 or b > 230:
            continue
        puncte.append((t, b))

    if not puncte:
        sys.exit("N-am găsit niciun eșantion valid.")

    # rărire la ~10 Hz
    rarite, ultim = [], -1e9
    for t, b in puncte:
        if t - ultim >= 0.099:
            rarite.append((round(t, 2), round(b, 2)))
            ultim = t

    corp = ",".join("[%g,%g]" % (t, b) for t, b in rarite)
    print("\n// %s — %d eșantioane, %.1f secunde" %
          (os.path.basename(cale), len(rarite), rarite[-1][0] - rarite[0][0]))
    print("serie:[" + corp + "],\n")
    print("↑ copiază linia `serie:[...]` în sesiunea potrivită din index.html",
          file=sys.stderr)


def _idx(cap, variante):
    for v in variante:
        if v in cap:
            return cap.index(v)
    for i, c in enumerate(cap):
        for v in variante:
            if v in c:
                return i
    return None


def _numar(s):
    try:
        float(s)
        return True
    except ValueError:
        return False


if __name__ == "__main__":
    main()
