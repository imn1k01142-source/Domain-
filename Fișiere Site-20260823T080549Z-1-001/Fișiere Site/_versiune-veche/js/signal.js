/* ============================================================
   DOMAIN — motorul de semnal
   ------------------------------------------------------------
   Aici se intampla tot ce conteaza stiintific:
     1. baseline-ul de repaus (medie, deviatie, RMSSD)
     2. normalizarea in z-score  -> comparabil intre oameni
     3. detectia apogeului dupa fiecare jumpscare
     4. Fear Score-ul si decizia adaptiva

   De ce z-score si nu BPM brut: cineva cu puls de repaus 55 si
   cineva cu 85 nu pot fi comparati direct. Ce conteaza e cu cate
   deviatii standard sare fata de PROPRIUL lui repaus.
   ============================================================ */

window.D = window.D || {};

D.Signal = (function () {

  /* ---------- utilitare ---------- */
  const mean = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
  const stdev = (a, m) => {
    if (a.length < 2) return 0;
    m = (m === undefined) ? mean(a) : m;
    return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1));
  };
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  /* ---------- buffer de esantioane ---------- */
  /* fiecare esantion: {t: secunde in contextul curent, bpm, ibi?} */
  class Buffer {
    constructor() { this.samples = []; }
    push(s) { this.samples.push(s); }
    clear() { this.samples = []; }
    get last() { return this.samples[this.samples.length - 1] || null; }
    /* esantioanele din intervalul [t0, t1] */
    range(t0, t1) {
      const out = [];
      for (const s of this.samples) { if (s.t >= t0 && s.t <= t1) out.push(s); }
      return out;
    }
    /* ultimele n secunde fata de cel mai recent esantion */
    tail(sec) {
      const l = this.last; if (!l) return [];
      return this.range(l.t - sec, l.t);
    }
  }

  /* ---------- baseline ---------- */
  /*
    Ignoram primele `settle` secunde: omul tocmai s-a asezat, senzorul
    inca se stabilizeaza, iar valorile de acolo strica media.
    RMSSD = radacina medie patratica a diferentelor succesive intre
    intervalele R-R. Scade rapid la stres — semnal mai prompt decat BPM-ul.
  */
  function computeBaseline(samples, settle) {
    settle = settle === undefined ? 10 : settle;
    const use = samples.filter(s => s.t >= settle);
    const src = use.length > 10 ? use : samples;
    const bpms = src.map(s => s.bpm).filter(Number.isFinite);
    if (!bpms.length) return null;

    const m = mean(bpms);
    let sd = stdev(bpms, m);
    sd = Math.max(sd, 1.5);            // prag minim: altfel z-score-ul explodeaza

    const ibis = src.map(s => s.ibi).filter(Number.isFinite);
    let rmssd = null;
    if (ibis.length > 5) {
      let acc = 0, n = 0;
      for (let i = 1; i < ibis.length; i++) {
        const d = ibis[i] - ibis[i - 1];
        if (Math.abs(d) < 300) { acc += d * d; n++; }   // filtram artefactele
      }
      if (n) rmssd = Math.sqrt(acc / n);
    }
    return { bpm: m, sd: sd, rmssd: rmssd, n: bpms.length, quality: qualityOf(bpms, sd) };
  }

  function qualityOf(bpms, sd) {
    if (bpms.length < 30) return 'slaba';
    if (sd > 12) return 'zgomotoasa';
    return 'buna';
  }

  const DEFAULT_BASELINE = { bpm: 72, sd: 4.5, rmssd: 42, n: 0, quality: 'implicita' };

  const z = (bpm, base) => base ? (bpm - base.bpm) / base.sd : 0;

  /* ---------- detectia apogeului ---------- */
  /*
    Fereastra de analiza: [t0 - PRE, t0 + POST].
      PRE  — referinta imediat dinaintea sperieturii (nu baseline-ul global:
             pulsul putea fi deja urcat de la sperietura anterioara)
      POST — 10s acopera aproape orice raspuns simpatic la un jumpscare

    Ce cautam:
      freeze   — scaderea scurta de puls in primele ~2s (raspunsul de inghetare).
                 Nu toata lumea o are, dar cand apare e semnul cel mai curat
                 ca sperietura a fost reala si brusca.
      apogeu   — maximul de BPM din fereastra
      latenta  — t_apogeu - t0, tipic 1.5-3.5s
      revenire — cat dureaza pana scade sub 25% din amplitudine
  */
  const PRE = 3.0, POST = 10.0;

  /*
    nextT = momentul urmatoarei sperieturi. Daca exista si vine la mai
    putin de POST secunde, taiem fereastra inainte de ea — altfel varful
    sperieturii urmatoare e atribuit gresit acesteia si latenta iese
    aberanta (8-9 secunde in loc de 2).
  */
  function analyzeScare(buffer, scare, base, nextT) {
    const t0 = scare.t;
    const postEnd = (Number.isFinite(nextT) && nextT > t0)
      ? Math.min(t0 + POST, nextT - 0.4)
      : t0 + POST;
    const pre = buffer.range(t0 - PRE, t0);
    const post = buffer.range(t0, postEnd);
    if (post.length < 3) return null;

    const preBpm = pre.length ? mean(pre.map(s => s.bpm)) : (base ? base.bpm : post[0].bpm);

    /* apogeul */
    let peak = post[0];
    for (const s of post) if (s.bpm > peak.bpm) peak = s;

    /* freeze: minimul din primele 2.5s, daca e semnificativ sub pre */
    const early = buffer.range(t0, t0 + 2.5);
    let dip = null;
    if (early.length) {
      let lo = early[0];
      for (const s of early) if (s.bpm < lo.bpm) lo = s;
      if (lo.bpm < preBpm - 2 && lo.t < peak.t) dip = { t: lo.t - t0, drop: preBpm - lo.bpm };
    }

    const delta = peak.bpm - preBpm;
    const latency = peak.t - t0;
    const zPeak = z(peak.bpm, base);

    /* revenire: primul moment de dupa apogeu sub 25% din amplitudine */
    let recovery = null;
    if (delta > 1) {
      const thr = preBpm + delta * 0.25;
      for (const s of buffer.range(peak.t, postEnd + 8)) {
        if (s.bpm <= thr) { recovery = s.t - peak.t; break; }
      }
    }

    /* scorul per sperietura, 0..100 */
    /*
      Scalele sunt calibrate ca un jumpscare "normal" (+10..12 BPM, ~3
      deviatii) sa cada in jur de 50, nu la 80. Daca saturezi scorul,
      logica adaptiva recomanda mereu acelasi lucru si demo-ul isi
      pierde sensul.
    */
    const sDelta = clamp(delta / 22, 0, 1);          // +22 BPM = reactie maxima
    const sZ     = clamp(zPeak / 6, 0, 1);           // 6 deviatii = maxim
    const sRec   = recovery === null ? 0.6 : clamp(recovery / 14, 0, 1);
    const sDip   = dip ? 0.06 : 0;                   // bonus daca a existat freeze
    const score  = clamp(100 * (0.45 * sDelta + 0.33 * sZ + 0.10 * sRec + sDip), 0, 100);

    return {
      t0: t0,
      postEnd: postEnd,
      intensity: scare.intensity || 1,
      preBpm: preBpm,
      peakBpm: peak.bpm,
      peakT: peak.t,
      delta: delta,
      latency: latency,
      zPeak: zPeak,
      freeze: dip,
      recovery: recovery,
      score: score,
      detected: delta >= 2.5 && latency >= 0.4 && latency <= 8
    };
  }

  /* ---------- scorul sesiunii + decizia adaptiva ---------- */
  /*
    Ponderam pe intensitatea sperieturii: daca nu ai reactionat la un
    scare de intensitate 3, asta spune mai mult decat lipsa reactiei
    la unul de intensitate 1.
  */
  function sessionScore(results) {
    const ok = results.filter(Boolean);
    if (!ok.length) return { score: 0, hits: 0, total: 0, avgLatency: null };
    let wsum = 0, w = 0;
    for (const r of ok) { const k = r.intensity; wsum += r.score * k; w += k; }
    const lats = ok.filter(r => r.detected).map(r => r.latency);
    return {
      score: wsum / w,
      hits: ok.filter(r => r.detected).length,
      total: ok.length,
      avgLatency: lats.length ? mean(lats) : null,
      maxDelta: Math.max.apply(null, ok.map(r => r.delta))
    };
  }

  /*
    Regula de adaptare. Praguri deliberat asimetrice:
    urcam mai usor decat coboram, ca sa nu blocam pe cineva intr-o
    bucla de "prea usor" din cauza unui singur clip ratat.
  */
  function adapt(sessionSummary, currentRank) {
    const s = sessionSummary.score;
    let next = currentRank, why;
    if (s < 32)      { next = currentRank + 1; why = 'Corpul tău abia a reacționat — urcăm intensitatea.'; }
    else if (s < 68) { next = currentRank;     why = 'Reacție în zona optimă — rămânem la acest nivel.'; }
    else             { next = currentRank - 1; why = 'Reacție foarte puternică — coborâm ca să rămână plăcut.'; }
    next = clamp(next, 1, 3);
    if (next === currentRank && s >= 68) why = 'Reacție puternică, dar ești deja pe nivelul minim.';
    return { rank: next, reason: why };
  }

  return {
    Buffer, computeBaseline, analyzeScare, sessionScore, adapt, z,
    mean, stdev, clamp, DEFAULT_BASELINE, PRE, POST
  };
})();
