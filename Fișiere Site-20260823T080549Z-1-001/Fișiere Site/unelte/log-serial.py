#!/usr/bin/env python3
"""
Înregistrează ce trimite ESP32-ul pe serial într-un CSV.

    pip install pyserial
    python log-serial.py COM5 nicolas-usor.csv          # Windows
    python log-serial.py /dev/ttyUSB0 nicolas-usor.csv  # Linux / macOS

Pornește-l EXACT când începe clipul (sau notează decalajul), pentru că timpul
scris în fișier e în secunde de la pornirea scriptului — iar timestamp-urile
jumpscare-urilor sunt tot relative la începutul clipului.

Ctrl+C ca să oprești. Nu uita cele 15 secunde de cooldown înainte.
"""
import sys, time, json, csv

try:
    import serial
except ImportError:
    sys.exit("Lipsește pyserial.  Rulează:  pip install pyserial")


def parseaza(linie):
    """Acceptă {"bpm":78.2,"ibi":767} dar și formele degradate: BPM:78 · 78 · 78,767"""
    linie = linie.strip()
    if not linie:
        return None
    if linie.startswith("{"):
        try:
            o = json.loads(linie)
        except ValueError:
            return None
        bpm = o.get("bpm", o.get("BPM"))
        ibi = o.get("ibi", o.get("IBI"))
    else:
        nums = [n for n in linie.replace(",", " ").split() if _numar(n)]
        if not nums:
            return None
        bpm = float(nums[0])
        ibi = float(nums[1]) if len(nums) > 1 else None
    try:
        bpm = float(bpm)
    except (TypeError, ValueError):
        return None
    if not (25 <= bpm <= 230):
        return None
    if ibi is not None:
        try:
            ibi = float(ibi)
            if not (250 < ibi < 2400):
                ibi = None
        except (TypeError, ValueError):
            ibi = None
    return bpm, ibi


def _numar(s):
    try:
        float(s)
        return True
    except ValueError:
        return False


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    port, iesire = sys.argv[1], sys.argv[2]
    baud = int(sys.argv[3]) if len(sys.argv) > 3 else 115200

    try:
        ser = serial.Serial(port, baud, timeout=1)
    except Exception as e:
        sys.exit("Nu pot deschide %s: %s" % (port, e))

    print("Înregistrez de pe %s la %d baud → %s" % (port, baud, iesire))
    print("Ctrl+C ca să opresc.\n")

    t0 = time.time()
    n = 0
    with open(iesire, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["t_s", "bpm", "ibi_ms"])
        try:
            while True:
                raw = ser.readline().decode("utf-8", "ignore")
                r = parseaza(raw)
                if not r:
                    continue
                bpm, ibi = r
                t = time.time() - t0
                w.writerow(["%.3f" % t, "%.2f" % bpm, "" if ibi is None else "%.0f" % ibi])
                n += 1
                if n % 10 == 0:
                    f.flush()
                    print("\r%6.1fs   %5.1f BPM   %d eșantioane" % (t, bpm, n), end="")
        except KeyboardInterrupt:
            pass

    print("\n\nGata. %d eșantioane în %.1f secunde → %s" % (n, time.time() - t0, iesire))
    print("Acum:  python csv-in-serie.py %s" % iesire)


if __name__ == "__main__":
    main()
