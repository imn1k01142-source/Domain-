/* ============================================================
   DOMAIN — orchestratorul aplicatiei
   ------------------------------------------------------------
   Masina de stari:  intro -> calib -> levels -> play -> results
   si inapoi la play (nivelul ales adaptiv).
   ============================================================ */

(function () {
  const S = D.Signal;
  const $ = id => document.getElementById(id);

  /* ---------------- stare globala ---------------- */
  const app = {
    screen: 'intro',
    source: null,
    buffer: new S.Buffer(),
    baseline: null,
    ctx: 'idle',            // 'idle' | 'calib' | 'clip'
    t0wall: 0,              // reper pentru contexte fara video
    level: null,
    clipIdx: 0,
    clip: null,
    firedScares: [],
    session: null,
    history: []             // sesiunile din runda curenta
  };
  window.DOMAIN = app;      // util pentru debug in consola

  const CALIB_SECONDS = 45;

  /* ---------------- navigare intre ecrane ---------------- */
  function goto(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $('s-' + name).classList.add('active');
    app.screen = name;
  }

  /* ---------------- timpul in contextul curent ---------------- */
  function ctxTime() {
    if (app.ctx === 'calib') return (performance.now() - app.t0wall) / 1000;
    if (app.ctx === 'clip')  return player.time();
    return 0;
  }

  /* ============================================================
     SURSA DE DATE
     ============================================================ */
  function onReading(r) {
    const t = ctxTime();
    if (app.ctx !== 'idle') app.buffer.push({ t: t, bpm: r.bpm, ibi: r.ibi });

    $('bpmNow').textContent = Math.round(r.bpm);
    const zz = app.baseline ? S.z(r.bpm, app.baseline) : 0;
    $('zNow').textContent = 'z ' + zz.toFixed(1);

    if (app.ctx === 'clip') {
      $('hudBpm').textContent = Math.round(r.bpm);
      applyArousal(zz);
      heart.setRate(r.bpm);
    }
  }

  async function useSource(mode) {
    if (app.source) { try { await app.source.stop(); } catch (e) {} app.source = null; }

    if (mode === 'serial') {
      const s = new D.SerialSource();
      s.onData = onReading;
      s.onError = e => setSrcLabel('off', 'eroare serial');
      try {
        await s.start(115200);
        app.source = s;
        setSrcLabel('live', 'ESP32 · USB');
      } catch (e) {
        alert('Nu m-am putut conecta la ESP32:\n' + e.message + '\n\nTrec pe modul simulat.');
        return useSource('sim');
      }
    } else {
      const s = new D.SimSource();
      s.onData = onReading;
      await s.start();
      app.source = s;
      setSrcLabel('sim', 'simulat · ' + Math.round(s.base) + ' BPM repaus');
    }
    closeModal();
  }

  function setSrcLabel(cls, txt) {
    $('srcDot').className = 'dot ' + cls;
    $('srcLabel').textContent = txt;
  }

  /* ============================================================
     EFECTE (overlay de arousal + puls audio)
     ============================================================ */
  function applyArousal(z) {
    const k = S.clamp(z / 3.2, 0, 1);
    $('arousal').style.opacity = (k * 0.9).toFixed(2);
    $('fearFill').style.width = (k * 100).toFixed(0) + '%';
    document.body.classList.toggle('shake', z > 2.3);
  }
  function clearArousal() {
    $('arousal').style.opacity = 0;
    document.body.classList.remove('shake');
    $('fearFill').style.width = '0%';
  }

  /* batai de inima sintetizate, sincronizate cu pulsul real */
  const heart = {
    ac: null, on: false, bpm: 70, timer: null,
    start() {
      if (this.on) return;
      try { this.ac = this.ac || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
      if (this.ac.state === 'suspended') this.ac.resume();
      this.on = true; this._beat();
    },
    stop() { this.on = false; clearTimeout(this.timer); },
    setRate(b) { this.bpm = S.clamp(b, 35, 200); },
    _thump(gainPeak) {
      const ac = this.ac, t = ac.currentTime;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(62, t);
      o.frequency.exponentialRampToValueAtTime(34, t + 0.11);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gainPeak, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); g.connect(ac.destination);
      o.start(t); o.stop(t + 0.2);
    },
    _beat() {
      if (!this.on) return;
      const period = 60000 / this.bpm;
      this._thump(0.16);
      setTimeout(() => { if (this.on) this._thump(0.09); }, period * 0.22); // "dub"-ul
      this.timer = setTimeout(() => this._beat(), period);
    }
  };

  /* ============================================================
     CALIBRARE
     ============================================================ */
  const calib = {
    raf: null,
    async begin() {
      if (!app.source) await useSource(D.SerialSource.supported() ? 'sim' : 'sim');
      app.buffer.clear();
      app.ctx = 'calib';
      app.t0wall = performance.now();
      goto('calib');
      this.loop();
    },
    loop() {
      const t = ctxTime();
      const left = Math.max(0, CALIB_SECONDS - t);
      $('cLeft').textContent = left.toFixed(0);
      $('calibBar').style.width = (100 * t / CALIB_SECONDS).toFixed(1) + '%';

      const partial = S.computeBaseline(app.buffer.samples, Math.min(10, t / 2));
      if (partial) {
        $('cBpm').textContent = partial.bpm.toFixed(1);
        $('cSd').textContent = partial.sd.toFixed(1);
        $('cRmssd').textContent = partial.rmssd ? partial.rmssd.toFixed(0) : '--';
      }
      D.Chart.live($('calibChart'), app.buffer.samples, partial, 25, []);

      if (t >= CALIB_SECONDS) return this.finish();
      this.raf = requestAnimationFrame(() => this.loop());
    },
    finish() {
      cancelAnimationFrame(this.raf);
      const b = S.computeBaseline(app.buffer.samples, 10);
      app.baseline = b || S.DEFAULT_BASELINE;
      app.ctx = 'idle';
      showLevels();
    },
    abort() {
      cancelAnimationFrame(this.raf);
      app.ctx = 'idle';
      goto('intro');
    }
  };

  /* ============================================================
     ECRANUL DE NIVELE
     ============================================================ */
  function showLevels(recommendedRank) {
    const b = app.baseline || S.DEFAULT_BASELINE;
    $('baseSummary').textContent =
      b.bpm.toFixed(0) + ' BPM ±' + b.sd.toFixed(1) +
      (b.rmssd ? ' · RMSSD ' + b.rmssd.toFixed(0) + 'ms' : '') +
      ' · calitate ' + b.quality;

    const grid = $('levelGrid');
    grid.innerHTML = '';
    D.LEVELS.forEach(L => {
      const card = document.createElement('div');
      card.className = 'level-card' + (recommendedRank === L.rank ? ' recommended' : '');
      const bars = [1, 2, 3].map(i => '<i class="' + (i <= L.rank ? 'on' : '') + '"></i>').join('');
      const nScares = L.clips.reduce((s, c) => s + c.scares.length, 0);
      card.innerHTML =
        (recommendedRank === L.rank ? '<div class="tag">recomandat</div>' : '') +
        '<div class="bars">' + bars + '</div>' +
        '<h3>' + L.name + '</h3><p>' + L.desc + '</p>' +
        '<div class="meta">' + L.clips.length + ' clipuri · ' + nScares + ' sperieturi adnotate</div>';
      card.onclick = () => startClip(L, 0);
      grid.appendChild(card);
    });
    goto('levels');
  }

  /* ============================================================
     PLAYER
     ============================================================ */
  const player = {
    mode: 'video',        // 'video' | 'phantom'
    raf: null,
    phantomStart: 0,
    endedAt: null,        // momentul (in timp de clip) cand s-a terminat
    coolFrom: 0,
    nextScare: 0,
    overlay: null,

    time() {
      if (this.endedAt !== null)
        return this.endedAt + (performance.now() - this.coolFrom) / 1000;
      if (this.mode === 'video') return $('clip').currentTime;
      return (performance.now() - this.phantomStart) / 1000;
    },

    start(clip) {
      const v = $('clip'), ph = $('phantom');
      this.endedAt = null; this.nextScare = 0;
      app.firedScares = [];
      app.buffer.clear();
      app.ctx = 'clip';
      heart.start();

      let started = false;
      const toPhantom = () => {
        if (started) return; started = true;
        this.mode = 'phantom';
        v.classList.remove('on'); ph.classList.add('on');
        this.phantomStart = performance.now();
        this.loop();
      };

      v.classList.remove('on'); ph.classList.remove('on');
      v.onerror = toPhantom;
      v.onloadedmetadata = () => {
        if (started) return; started = true;
        this.mode = 'video';
        v.classList.add('on');
        v.currentTime = 0;
        v.play().catch(toPhantom);
        this.loop();
      };
      v.onended = () => this.finish();
      v.src = clip.src;
      v.load();
      /* daca fisierul nu exista, unele browsere nu dau 'error' imediat */
      setTimeout(toPhantom, 1200);
    },

    loop() {
      const t = this.time();
      const clip = app.clip;

      /* declansarea jumpscare-urilor din manifest */
      while (this.nextScare < clip.scares.length && t >= clip.scares[this.nextScare].t) {
        const sc = clip.scares[this.nextScare++];
        this.fire(sc);
      }

      if (this.mode === 'phantom' && this.endedAt === null) this.drawPhantom(t, clip);

      D.Chart.live($('liveChart'), app.buffer.samples, app.baseline, 30,
        app.firedScares.map(s => ({ t: s.t })));

      /* sfarsitul clipului (in phantom mode nu exista event 'ended') */
      if (this.endedAt === null && this.mode === 'phantom' && t >= clip.duration) return this.finish();

      /* cooldown: mai colectam date dupa ultima sperietura, altfel nu
         putem masura apogeul si revenirea pentru ea */
      if (this.endedAt !== null) {
        const need = this.coolUntil;
        if (t >= need) return analyzeAndShow();
        if (this.overlay) this.overlay.textContent =
          'Analizăm reacția…  ' + Math.max(0, need - t).toFixed(0) + 's';
      }

      this.raf = requestAnimationFrame(() => this.loop());
    },

    fire(sc) {
      app.firedScares.push(sc);
      if (app.source && app.source.triggerScare) app.source.triggerScare(sc.intensity);
      const f = $('scareFlash');
      f.classList.remove('hit'); void f.offsetWidth; f.classList.add('hit');
    },

    /* mod fara video: ecran negru + zgomot + flash la momentele de scare.
       Permite testarea intregului pipeline inainte sa aveti clipurile. */
    drawPhantom(t, clip) {
      const { ctx, w, h } = D.Chart.fit($('phantom'));
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      /* zgomot fin */
      ctx.fillStyle = 'rgba(255,255,255,.025)';
      for (let i = 0; i < 90; i++)
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);

      ctx.fillStyle = '#3a3a46';
      ctx.font = '13px ui-monospace, monospace'; ctx.textAlign = 'center';
      ctx.fillText('CLIP LIPSĂ: ' + clip.src + '  —  rulez în mod fantomă', w / 2, h / 2 - 22);
      ctx.fillStyle = '#6a6875'; ctx.font = '34px ui-monospace, monospace';
      ctx.fillText(t.toFixed(1) + 's / ' + clip.duration + 's', w / 2, h / 2 + 18);

      /* urmatoarea sperietura */
      const nx = clip.scares[this.nextScare];
      if (nx) {
        ctx.fillStyle = '#2a2a33'; ctx.font = '11px ui-monospace, monospace';
        ctx.fillText('următorul jumpscare la ' + nx.t + 's', w / 2, h / 2 + 46);
      }
    },

    finish() {
      const t = this.time();
      this.endedAt = t;
      this.coolFrom = performance.now();
      const last = app.clip.scares[app.clip.scares.length - 1];
      this.coolUntil = Math.max(t + 1.5, (last ? last.t : 0) + S.POST + 1);
      try { $('clip').pause(); } catch (e) {}
      if (!this.overlay) {
        this.overlay = document.createElement('div');
        this.overlay.style.cssText =
          'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
          'background:rgba(0,0,0,.82);font-family:ui-monospace,monospace;color:#8a8792;' +
          'letter-spacing:.1em;font-size:14px;z-index:5';
        document.querySelector('.stage').appendChild(this.overlay);
      }
      this.overlay.style.display = 'flex';
      this.raf = requestAnimationFrame(() => this.loop());
    },

    stop() {
      cancelAnimationFrame(this.raf);
      try { $('clip').pause(); } catch (e) {}
      if (this.overlay) this.overlay.style.display = 'none';
      heart.stop(); clearArousal();
      app.ctx = 'idle';
    }
  };

  function startClip(level, idx) {
    app.level = level;
    app.clipIdx = idx % level.clips.length;
    app.clip = level.clips[app.clipIdx];
    $('hudLevel').textContent = level.name + ' · ' + app.clip.title;
    goto('play');
    player.start(app.clip);
  }

  /* ============================================================
     ANALIZA SI REZULTATELE
     ============================================================ */
  function analyzeAndShow() {
    player.stop();
    const base = app.baseline || S.DEFAULT_BASELINE;
    const sc = app.clip.scares;
    const analyses = sc.map((s, i) =>
      S.analyzeScare(app.buffer, s, base, sc[i + 1] ? sc[i + 1].t : null));
    const summary = S.sessionScore(analyses);
    const decision = S.adapt(summary, app.level.rank);

    app.session = {
      at: new Date().toISOString(),
      level: app.level.id, clip: app.clip.id,
      baseline: base, analyses: analyses, summary: summary, decision: decision,
      samples: app.buffer.samples.slice()
    };
    app.history.push(app.session);

    /* scor + verdict */
    $('fearScore').textContent = summary.score.toFixed(0);
    const nextL = D.levelByRank(decision.rank);
    $('verdict').innerHTML =
      '<b>' + summary.hits + ' din ' + summary.total + '</b> sperieturi au produs o reacție măsurabilă. ' +
      (summary.avgLatency !== null
        ? 'Latența medie până la apogeu: <b>' + summary.avgLatency.toFixed(1) + 's</b>. ' : '') +
      'Creșterea maximă: <b>+' + summary.maxDelta.toFixed(1) + ' BPM</b>.<br>' +
      decision.reason + ' Următorul nivel: <b>' + nextL.name + '</b>.';

    $('nextClip').textContent = 'Continuă — ' + nextL.name;
    $('nextClip').onclick = () => {
      const sameLevel = nextL.rank === app.level.rank;
      startClip(nextL, sameLevel ? app.clipIdx + 1 : 0);
    };

    /* tabelul */
    const tb = $('scareTable').querySelector('tbody');
    tb.innerHTML = '';
    analyses.forEach((a, i) => {
      const tr = document.createElement('tr');
      if (!a) {
        tr.innerHTML = '<td>' + (i + 1) + '</td><td colspan="7" style="color:#5f5c68">date insuficiente</td>';
      } else {
        const cls = a.score > 66 ? 'hi' : a.score > 33 ? 'mid' : 'lo';
        tr.innerHTML =
          '<td>' + (i + 1) + '</td>' +
          '<td>' + a.t0.toFixed(1) + 's</td>' +
          '<td>' + (a.detected ? a.latency.toFixed(2) + 's' : '—') + '</td>' +
          '<td>' + (a.delta >= 0 ? '+' : '') + a.delta.toFixed(1) + '</td>' +
          '<td>' + a.zPeak.toFixed(2) + '</td>' +
          '<td>' + (a.freeze ? '−' + a.freeze.drop.toFixed(1) + ' @' + a.freeze.t.toFixed(1) + 's' : '—') + '</td>' +
          '<td>' + (a.recovery === null
            ? '>' + Math.max(0, a.postEnd - a.peakT).toFixed(0) + 's'
            : a.recovery.toFixed(1) + 's') + '</td>' +
          '<td><span class="pill ' + cls + '">' + a.score.toFixed(0) + '</span></td>';
      }
      tb.appendChild(tr);
    });

    goto('results');
    requestAnimationFrame(() =>
      D.Chart.results($('resultChart'), app.buffer.samples, base, analyses));
  }

  /* ---------------- export ---------------- */
  function download(name, text, type) {
    const b = new Blob([text], { type: type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function exportJson() {
    if (!app.session) return;
    download('domain-' + app.session.clip + '.json', JSON.stringify(app.session, null, 2), 'application/json');
  }
  function exportCsv() {
    if (!app.session) return;
    let csv = 't_s,bpm,ibi_ms,z\n';
    const b = app.session.baseline;
    app.session.samples.forEach(s => {
      csv += s.t.toFixed(3) + ',' + s.bpm.toFixed(2) + ',' +
        (s.ibi ? s.ibi.toFixed(0) : '') + ',' + S.z(s.bpm, b).toFixed(3) + '\n';
    });
    csv += '\n# scare_t,intensity,peak_t,peak_bpm,delta,latency,z_peak,recovery,score\n';
    app.session.analyses.forEach(a => {
      if (!a) return;
      csv += '# ' + [a.t0, a.intensity, a.peakT.toFixed(2), a.peakBpm.toFixed(1),
        a.delta.toFixed(1), a.latency.toFixed(2), a.zPeak.toFixed(2),
        a.recovery === null ? '' : a.recovery.toFixed(1), a.score.toFixed(0)].join(',') + '\n';
    });
    download('domain-' + app.session.clip + '.csv', csv, 'text/csv');
  }

  /* ============================================================
     MODAL SURSA
     ============================================================ */
  function openModal() { $('sourceModal').classList.add('open'); }
  function closeModal() { $('sourceModal').classList.remove('open'); }

  /* ============================================================
     LEGATURILE UI
     ============================================================ */
  $('goCalib').onclick = () => calib.begin();
  $('skipCalib').onclick = async () => {
    if (!app.source) await useSource('sim');
    app.baseline = S.DEFAULT_BASELINE;
    showLevels();
  };
  $('calibAbort').onclick = () => calib.abort();
  $('backIntro').onclick = () => goto('intro');
  $('recalib').onclick = () => calib.begin();
  $('abortClip').onclick = () => { player.stop(); showLevels(); };
  $('backLevels').onclick = () => showLevels(app.session ? app.session.decision.rank : null);
  $('exportJson').onclick = exportJson;
  $('exportCsv').onclick = exportCsv;
  $('btnSource').onclick = openModal;
  $('closeModal').onclick = closeModal;
  document.querySelectorAll('.src-opt').forEach(el => {
    el.onclick = () => {
      if (el.classList.contains('disabled')) return;
      useSource(el.dataset.src);
    };
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeModal(); if (app.screen === 'play') { player.stop(); showLevels(); } }
  });

  /* pornim pe simulat, ca site-ul sa fie functional din prima secunda */
  useSource('sim');
  if (!D.SerialSource.supported()) {
    document.querySelector('[data-src="serial"]').classList.add('disabled');
    document.querySelector('[data-src="serial"] span').textContent =
      'Indisponibil în acest browser. Deschide în Chrome sau Edge.';
  }
})();
