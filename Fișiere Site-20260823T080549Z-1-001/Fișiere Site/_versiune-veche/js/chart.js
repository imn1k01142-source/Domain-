/* ============================================================
   DOMAIN — desenarea graficelor (canvas, fara librarii)
   ============================================================ */

window.D = window.D || {};

D.Chart = (function () {

  function fit(cv) {
    const dpr = window.devicePixelRatio || 1;
    const r = cv.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (cv.width !== w * dpr || cv.height !== h * dpr) {
      cv.width = w * dpr; cv.height = h * dpr;
    }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  /* limitele verticale: baseline in centru, minim +-10 BPM,
     dar se extind daca semnalul iese din ele */
  function bounds(samples, base) {
    let lo = base ? base.bpm - 10 : 55, hi = base ? base.bpm + 10 : 95;
    for (const s of samples) { if (s.bpm < lo) lo = s.bpm; if (s.bpm > hi) hi = s.bpm; }
    const pad = (hi - lo) * 0.12 + 1;
    return { lo: lo - pad, hi: hi + pad };
  }

  function grid(ctx, w, h, b, base) {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#191921'; ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = Math.round(h * i / 4) + .5;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    if (base) {
      const y = mapY(base.bpm, b, h);
      ctx.strokeStyle = 'rgba(140,140,160,.35)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.setLineDash([]);
      /* banda +-1 deviatie */
      const y1 = mapY(base.bpm + base.sd, b, h), y2 = mapY(base.bpm - base.sd, b, h);
      ctx.fillStyle = 'rgba(140,140,160,.06)';
      ctx.fillRect(0, y1, w, y2 - y1);
    }
  }

  const mapY = (bpm, b, h) => h - ((bpm - b.lo) / (b.hi - b.lo)) * h;

  function line(ctx, samples, t0, t1, b, w, h, color, fill) {
    if (samples.length < 2) return;
    const X = t => ((t - t0) / (t1 - t0)) * w;
    ctx.beginPath();
    samples.forEach((s, i) => {
      const x = X(s.t), y = mapY(s.bpm, b, h);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    if (fill) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255,47,67,.22)'); g.addColorStop(1, 'rgba(255,47,67,0)');
      ctx.save();
      ctx.lineTo(X(samples[samples.length - 1].t), h);
      ctx.lineTo(X(samples[0].t), h); ctx.closePath();
      ctx.fillStyle = g; ctx.fill(); ctx.restore();
      ctx.beginPath();
      samples.forEach((s, i) => { const x = X(s.t), y = mapY(s.bpm, b, h); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    }
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.stroke();
  }

  /* ---------- grafic live (ultimele N secunde) ---------- */
  function live(cv, samples, base, windowSec, markers) {
    const { ctx, w, h } = fit(cv);
    windowSec = windowSec || 30;
    const last = samples[samples.length - 1];
    if (!last) { ctx.clearRect(0, 0, w, h); return; }
    const t1 = Math.max(last.t, windowSec), t0 = t1 - windowSec;
    const vis = samples.filter(s => s.t >= t0);
    const b = bounds(vis, base);
    grid(ctx, w, h, b, base);

    /* marker-e de jumpscare */
    (markers || []).forEach(m => {
      if (m.t < t0 || m.t > t1) return;
      const x = ((m.t - t0) / windowSec) * w;
      ctx.strokeStyle = 'rgba(255,47,67,.55)'; ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      ctx.setLineDash([]);
    });

    line(ctx, vis, t0, t1, b, w, h, '#ff2f43', true);

    /* punctul curent */
    const x = ((last.t - t0) / windowSec) * w, y = mapY(last.bpm, b, h);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
  }

  /* ---------- grafic de rezultate (sesiunea intreaga, adnotata) ---------- */
  function results(cv, samples, base, analyses) {
    const { ctx, w, h } = fit(cv);
    if (samples.length < 2) { ctx.clearRect(0, 0, w, h); return; }
    const t0 = samples[0].t, t1 = samples[samples.length - 1].t;
    const b = bounds(samples, base);
    grid(ctx, w, h, b, base);
    const X = t => ((t - t0) / (t1 - t0)) * w;

    /* fereastra de analiza a fiecarui scare */
    analyses.forEach(a => {
      if (!a) return;
      ctx.fillStyle = 'rgba(255,47,67,.05)';
      ctx.fillRect(X(a.t0), 0, X(a.postEnd) - X(a.t0), h);
      ctx.strokeStyle = 'rgba(255,47,67,.6)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(a.t0) + .5, 0); ctx.lineTo(X(a.t0) + .5, h); ctx.stroke();
    });

    line(ctx, samples, t0, t1, b, w, h, '#ff2f43', true);

    /* adnotarea apogeelor */
    ctx.font = '11px ui-monospace, monospace';
    analyses.forEach((a, i) => {
      if (!a) return;
      const x = X(a.peakT), y = mapY(a.peakBpm, b, h);
      ctx.fillStyle = a.detected ? '#fff' : '#6a6875';
      ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
      ctx.strokeStyle = a.detected ? 'rgba(255,255,255,.35)' : 'rgba(120,120,130,.3)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, Math.max(12, y - 22)); ctx.stroke();
      ctx.fillStyle = a.detected ? '#ffd7db' : '#6a6875';
      ctx.textAlign = 'center';
      ctx.fillText('#' + (i + 1) + '  +' + a.delta.toFixed(1), x, Math.max(10, y - 27));

      /* freeze-ul, daca a existat */
      if (a.freeze) {
        const fx = X(a.t0 + a.freeze.t);
        ctx.fillStyle = '#5aa9ff';
        ctx.beginPath(); ctx.arc(fx, mapY(a.preBpm - a.freeze.drop, b, h), 3, 0, 7); ctx.fill();
      }
    });

    /* axa de timp */
    ctx.fillStyle = '#5f5c68'; ctx.textAlign = 'left';
    for (let s = 0; s <= t1; s += 10) {
      if (s < t0) continue;
      ctx.fillText(s + 's', X(s) + 3, h - 5);
    }
  }

  return { live, results, fit };
})();
