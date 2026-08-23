/* ============================================================
   DOMAIN — sursele de date
   ------------------------------------------------------------
   Interfata comuna:
     src.onData = ({bpm, ibi}) => {}
     await src.start()
     src.stop()
     src.mode  -> 'serial' | 'sim'

   PROTOCOL ESP32 (linii terminate cu \n, 115200 baud):
     {"bpm":78.2,"ibi":767}
   Acceptam si formele degradate, ca sa nu blocam integrarea:
     BPM:78          -> {bpm:78}
     78              -> {bpm:78}
     78,767          -> {bpm:78, ibi:767}
   ============================================================ */

window.D = window.D || {};

/* ---------------- WebSerial (ESP32 pe USB) ---------------- */
D.SerialSource = class {
  constructor() {
    this.mode = 'serial';
    this.onData = null;
    this.onError = null;
    this.port = null;
    this.reader = null;
    this.running = false;
    this._buf = '';
  }

  static supported() { return 'serial' in navigator; }

  async start(baudRate) {
    if (!D.SerialSource.supported())
      throw new Error('WebSerial nu e disponibil. Folosește Chrome sau Edge (și http/https sau localhost).');

    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: baudRate || 115200 });
    this.running = true;
    this._loop();
    return true;
  }

  async _loop() {
    const decoder = new TextDecoder();
    this.reader = this.port.readable.getReader();
    try {
      while (this.running) {
        const { value, done } = await this.reader.read();
        if (done) break;
        this._buf += decoder.decode(value, { stream: true });
        let i;
        while ((i = this._buf.indexOf('\n')) >= 0) {
          const line = this._buf.slice(0, i).trim();
          this._buf = this._buf.slice(i + 1);
          const p = D.parseReading(line);
          if (p && this.onData) this.onData(p);
        }
        /* protectie: linie imposibil de lunga = zgomot pe serial */
        if (this._buf.length > 4096) this._buf = '';
      }
    } catch (e) {
      if (this.onError) this.onError(e);
    } finally {
      try { this.reader.releaseLock(); } catch (e) {}
    }
  }

  async stop() {
    this.running = false;
    try { if (this.reader) await this.reader.cancel(); } catch (e) {}
    try { if (this.port) await this.port.close(); } catch (e) {}
    this.port = null; this.reader = null;
  }

  /* sursa reala nu stie de jumpscare-uri — metoda exista doar
     ca sa aiba aceeasi interfata ca simulatorul */
  triggerScare() {}
};

/* parser tolerant, folosit si de viitoarea sursa WebSocket */
D.parseReading = function (line) {
  if (!line) return null;
  if (line[0] === '{') {
    try {
      const o = JSON.parse(line);
      const bpm = Number(o.bpm !== undefined ? o.bpm : o.BPM);
      if (!Number.isFinite(bpm) || bpm < 25 || bpm > 230) return null;
      const ibi = Number(o.ibi !== undefined ? o.ibi : o.IBI);
      return { bpm: bpm, ibi: Number.isFinite(ibi) ? ibi : null };
    } catch (e) { return null; }
  }
  const m = line.match(/(-?\d+(?:\.\d+)?)/g);
  if (!m) return null;
  const bpm = Number(m[0]);
  if (!Number.isFinite(bpm) || bpm < 25 || bpm > 230) return null;
  const ibi = m[1] !== undefined ? Number(m[1]) : null;
  return { bpm: bpm, ibi: (ibi && ibi > 250 && ibi < 2400) ? ibi : null };
};


/* ---------------- Simulator fiziologic ---------------- */
/*
  Genereaza un puls credibil, ca sa poti dezvolta si prezenta fara senzor.

  Model:
    baseline lent  — 72 BPM + o unda sinusoidala de ~40s (drift natural)
    unda respiratorie — aritmie sinusala respiratorie, ~0.25 Hz
    zgomot alb     — imperfectiunile senzorului PPG
    raspuns la scare:
        freeze  : o cadere scurta de 3-6 BPM in jurul secundei 0.6
        varf    : (1 - e^(-t/0.9)) * e^(-t/5.5), apogeu pe la ~2s
        coada   : revenire exponentiala la baseline in ~10-15s

  `sensitivity` simuleaza un jucator anume: 0.55 = om de piatra,
  1.6 = sare de pe scaun. Se randomizeaza la fiecare sesiune, ca demo-ul
  sa nu arate identic de fiecare data.
*/
D.SimSource = class {
  constructor(opts) {
    opts = opts || {};
    this.mode = 'sim';
    this.onData = null;
    this.hz = opts.hz || 10;
    this.base = opts.base || (62 + Math.random() * 18);
    /* 0.35 = om de piatra, 1.7 = sare de pe scaun. Intervalul e larg
       intentionat, ca demo-ul sa produca toate cele trei decizii adaptive. */
    this.sensitivity = opts.sensitivity || (0.35 + Math.random() * 1.35);
    this.scares = [];
    this.t = 0;
    this._timer = null;
    this._norm = this._normalize();
  }

  _shape(a) {
    if (a <= 0) return 0;
    return (1 - Math.exp(-a / 0.9)) * Math.exp(-a / 5.5);
  }
  _normalize() {
    let mx = 0;
    for (let a = 0; a < 20; a += 0.05) mx = Math.max(mx, this._shape(a));
    return mx || 1;
  }

  async start() {
    this.t = 0;
    this._timer = setInterval(() => this._tick(), 1000 / this.hz);
    return true;
  }
  stop() { clearInterval(this._timer); this._timer = null; this.scares = []; }

  /* apelat de player exact cand trece peste un timestamp de jumpscare */
  triggerScare(intensity) {
    const amp = (5 + (intensity || 1) * 4.5) * this.sensitivity * (0.8 + Math.random() * 0.5);
    this.scares.push({ at: this.t, amp: amp, freeze: Math.random() < 0.65 });
    /* nu tinem mai mult de 12 evenimente in memorie */
    if (this.scares.length > 12) this.scares.shift();
  }

  _tick() {
    this.t += 1 / this.hz;
    const t = this.t;

    /* Variabilitatea de repaus e intentionat generoasa: un puls real
       "plat" nu exista, iar daca simulatorul e prea curat, deviatia
       standard din calibrare iese sub prag si z-score-urile explodeaza. */
    let bpm = this.base
      + 3.0 * Math.sin(t / 6.4)                 // drift lent
      + 2.0 * Math.sin(t / 23.0 + 1.1)          // drift si mai lent
      + 3.2 * Math.sin(2 * Math.PI * 0.25 * t)  // aritmie sinusala respiratorie
      + (Math.random() - 0.5) * 2.0;            // zgomot senzor

    for (const s of this.scares) {
      const a = t - s.at;
      if (a < 0 || a > 25) continue;
      if (s.freeze) {
        /* caderea de "inghetare", centrata pe ~0.6s */
        bpm -= (3 + s.amp * 0.14) * Math.exp(-Math.pow(a - 0.6, 2) / (2 * 0.30 * 0.30));
      }
      bpm += s.amp * this._shape(a) / this._norm;
    }

    bpm = Math.max(38, Math.min(205, bpm));
    const ibi = 60000 / bpm + (Math.random() - 0.5) * 46;
    if (this.onData) this.onData({ bpm: bpm, ibi: ibi });
  }
};
