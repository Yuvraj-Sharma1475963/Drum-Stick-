/* ==========================================================================
   Drum Kit — app logic
   Views: Play (pads + recorder) · Sequencer · Learn (lessons + practice mode)
   ========================================================================== */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const KEYMAP = Object.fromEntries(KIT.map((k) => [k.key, k.id]));
  const INST = Object.fromEntries(KIT.map((k) => [k.id, k]));

  // ---------------------------------------------------------------- storage
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("drumkit." + k);
        return v == null ? d : JSON.parse(v);
      } catch { return d; }
    },
    set(k, v) {
      try { localStorage.setItem("drumkit." + k, JSON.stringify(v)); } catch {}
    },
  };

  const state = {
    bpm: store.get("bpm", 90),
    volume: store.get("volume", 0.8),
    metronome: store.get("metronome", false),
    swing: store.get("swing", 0),
    view: store.get("view", "play"),
    lessonId: store.get("lesson", LESSONS[0].id),
  };

  // ---------------------------------------------------------- UI time queue
  // Sounds are scheduled slightly ahead on the audio clock; visuals that belong
  // to them are queued here and fired by requestAnimationFrame when they're heard.
  let uiQueue = [];
  function uiAt(time, fn) {
    uiQueue.push({ time, fn });
    if (uiQueue.length > 1 && uiQueue[uiQueue.length - 2].time > time) uiQueue.sort((a, b) => a.time - b.time);
  }
  function heardNow() { return Engine.now() - Engine.latency(); }

  // ----------------------------------------------------------------- pads
  const kitEl = $("#kit");
  kitEl.innerHTML = KIT.map((k) => `
    <button class="pad" data-inst="${k.id}" style="--c:${k.color}" aria-label="${k.name}, key ${k.key.toUpperCase()}">
      <span class="pad-img" style="background-image:url('${k.img}')"></span>
      <span class="pad-key">${k.key.toUpperCase()}</span>
      <span class="pad-name">${k.name}</span>
    </button>`).join("");

  kitEl.addEventListener("pointerdown", (e) => {
    const pad = e.target.closest(".pad");
    if (!pad) return;
    e.preventDefault();
    hit(pad.dataset.inst);
  });

  function flash(inst) {
    $$(`[data-inst="${inst}"]`).forEach((el) => {
      el.classList.remove("hit");
      void el.offsetWidth; // restart CSS animation
      el.classList.add("hit");
    });
  }

  /** A hit played by the user (keyboard / pointer). */
  function hit(inst) {
    Engine.resume();
    Engine.play(inst);
    flash(inst);
    Recorder.onHit(inst);
    Practice.onHit(inst);
  }

  // ------------------------------------------------------------- keyboard
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = e.target.tagName;
    const typing = (tag === "INPUT" && /text|number/.test(e.target.type)) || tag === "SELECT" || tag === "TEXTAREA";
    if (typing) return;
    const key = e.key.toLowerCase();

    if (KEYMAP[key]) {
      e.preventDefault();
      if (!e.repeat) hit(KEYMAP[key]);
      return;
    }
    if (e.repeat) return;
    if (key === " ") { e.preventDefault(); spaceAction(); }
    else if (key === "escape") { Practice.active ? Practice.stop() : stopAll(); }
    else if (key === "m") toggleMetronome();
    else if (key === "t") tapTempo();
    else if (key === "r" && state.view === "play") Recorder.toggleRec();
  });

  function spaceAction() {
    if (Practice.active) return Practice.stop();
    if (state.view === "play") Recorder.togglePlay();
    else if (state.view === "seq") Seq.toggle();
    else if (state.view === "learn") Learn.toggleListen();
  }

  // ------------------------------------------------------------- transport
  // One look-ahead scheduler drives the sequencer, lesson playback, practice
  // mode and the metronome. Step i happens at timeOf(i) on the audio clock.
  const Transport = {
    running: false,
    src: null,
    idx: 0,
    t0: 0,
    bpm: 90,
    swing: 0,
    timer: null,
    stepDur() { return 60 / this.bpm / 4; },
    timeOf(i) {
      const sd = this.stepDur();
      return this.t0 + i * sd + (i % 2 ? this.swing * sd : 0);
    },
    start(src) {
      this.halt();
      this.src = src;
      this.bpm = state.bpm;
      this.swing = src.swing || 0;
      this.t0 = Engine.now() + 0.08;
      this.idx = 0;
      this.running = true;
      this.timer = setInterval(() => this.tick(), 25);
      this.tick();
    },
    tick() {
      const ahead = Engine.now() + 0.12;
      while (this.running && this.timeOf(this.idx) < ahead) {
        if (this.src.total != null && this.idx >= this.src.total) {
          clearInterval(this.timer);
          this.timer = null;
          return;
        }
        this.src.schedule(this.idx, this.timeOf(this.idx));
        this.idx++;
      }
    },
    /** keep the groove continuous when tempo changes mid-play */
    retempo(bpm) {
      if (!this.running) return;
      const next = this.t0 + this.idx * this.stepDur();
      this.bpm = bpm;
      this.t0 = next - this.idx * this.stepDur();
    },
    halt() {
      clearInterval(this.timer);
      this.timer = null;
      this.running = false;
      if (this.src && this.src.onStop) this.src.onStop();
      this.src = null;
      uiQueue = [];
    },
  };

  function metroAt(i, t) {
    if (state.metronome && i % 4 === 0) Engine.click(t, i % 16 === 0);
  }

  const MetroOnly = { name: "metro", schedule: metroAt };

  /** Stop whatever pattern is playing; keep the metronome alive if it's on. */
  function stopAll() {
    Transport.halt();
    Recorder.stopPlay();
    idle();
  }
  function idle() {
    if (state.metronome && !Transport.running && !Practice.active) Transport.start(MetroOnly);
  }

  // ------------------------------------------------------- tempo & volume
  const bpmInput = $("#bpm");
  const bpmRange = $("#bpm-range");

  function setBpm(v) {
    v = Math.round(Math.min(240, Math.max(40, Number(v) || 90)));
    state.bpm = v;
    store.set("bpm", v);
    bpmInput.value = v;
    bpmRange.value = v;
    Transport.retempo(v);
  }
  bpmInput.addEventListener("change", () => setBpm(bpmInput.value));
  bpmRange.addEventListener("input", () => setBpm(bpmRange.value));
  $("#bpm-down").addEventListener("click", () => setBpm(state.bpm - 1));
  $("#bpm-up").addEventListener("click", () => setBpm(state.bpm + 1));

  let taps = [];
  function tapTempo() {
    const t = performance.now();
    if (taps.length && t - taps[taps.length - 1] > 2000) taps = [];
    taps.push(t);
    taps = taps.slice(-5);
    if (taps.length >= 2) {
      const gaps = taps.slice(1).map((x, i) => x - taps[i]);
      setBpm(60000 / (gaps.reduce((a, b) => a + b) / gaps.length));
    }
    const b = $("#tap");
    b.classList.remove("hit"); void b.offsetWidth; b.classList.add("hit");
  }
  $("#tap").addEventListener("click", tapTempo);

  const metroBtn = $("#metro");
  function toggleMetronome() {
    Engine.resume();
    state.metronome = !state.metronome;
    store.set("metronome", state.metronome);
    metroBtn.setAttribute("aria-pressed", state.metronome);
    if (state.metronome) idle();
    else if (Transport.src === MetroOnly) Transport.halt();
  }
  metroBtn.addEventListener("click", toggleMetronome);

  const vol = $("#volume");
  vol.addEventListener("input", () => {
    state.volume = Number(vol.value);
    store.set("volume", state.volume);
    Engine.setVolume(state.volume);
  });

  function lockTempo(locked) {
    [bpmInput, bpmRange, $("#bpm-down"), $("#bpm-up"), $("#tap")].forEach((el) => (el.disabled = locked));
  }

  // ------------------------------------------------------------------ tabs
  function showView(v) {
    if (v !== state.view) stopAll();
    state.view = v;
    store.set("view", v);
    $$(".tab").forEach((t) => t.setAttribute("aria-selected", t.dataset.view === v));
    $$(".view").forEach((s) => (s.hidden = s.id !== "view-" + v));
  }
  $$(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));

  // ============================================================== RECORDER
  const Recorder = {
    hits: [],
    length: 0,
    recording: false,
    recStart: null,
    playing: false,
    timer: null,
    el: {
      rec: $("#rec"), play: $("#rec-play"), clear: $("#rec-clear"),
      loop: $("#rec-loop"), toSeq: $("#rec-to-seq"), status: $("#rec-status"),
    },
    toggleRec() {
      Engine.resume();
      if (this.recording) {
        this.recording = false;
        const end = Engine.now();
        if (this.recStart != null && this.hits.length) {
          const last = this.hits[this.hits.length - 1].t;
          this.length = Math.max(end - this.recStart, last + 0.2);
        }
      } else {
        this.stopPlay();
        this.hits = [];
        this.length = 0;
        this.recStart = null; // starts on the first hit, so there's no dead air
        this.recording = true;
      }
      this.render();
    },
    onHit(inst) {
      if (!this.recording) return;
      const now = Engine.now();
      if (this.recStart == null) this.recStart = now;
      this.hits.push({ inst, t: now - this.recStart });
      this.render();
    },
    togglePlay() { this.playing ? this.stopPlay() : this.play(); },
    play() {
      if (this.recording) this.toggleRec();
      if (!this.hits.length) return;
      Engine.resume();
      this.playing = true;
      let base = Engine.now() + 0.05;
      let p = 0;
      const sched = () => {
        const ahead = Engine.now() + 0.12;
        for (;;) {
          if (p >= this.hits.length) {
            if (!this.el.loop.checked) {
              clearInterval(this.timer);
              setTimeout(() => this.stopPlay(), Math.max(0, (base + this.length - Engine.now()) * 1000));
              return;
            }
            p = 0;
            base += this.length;
          }
          const h = this.hits[p];
          const t = base + h.t;
          if (t >= ahead) break;
          Engine.play(h.inst, t);
          uiAt(t, () => flash(h.inst));
          p++;
        }
      };
      this.timer = setInterval(sched, 25);
      sched();
      this.render();
    },
    stopPlay() {
      clearInterval(this.timer);
      this.timer = null;
      this.playing = false;
      this.render();
    },
    clear() {
      this.stopPlay();
      this.recording = false;
      this.hits = [];
      this.length = 0;
      this.render();
    },
    /** Snap the recording onto the 16th-note grid at the current tempo. */
    toSequencer() {
      if (!this.hits.length) return;
      const sd = 60 / state.bpm / 4;
      const steps = Math.round(this.length / sd) > 16 ? 32 : 16;
      const grid = Seq.emptyGrid();
      this.hits.forEach((h) => (grid[h.inst][Math.round(h.t / sd) % steps] = true));
      Seq.load(grid, steps);
      showView("seq");
    },
    render() {
      const { rec, play, status, toSeq, clear } = this.el;
      rec.setAttribute("aria-pressed", this.recording);
      rec.querySelector("span:last-child").textContent = this.recording ? "Stop" : "Record";
      play.setAttribute("aria-pressed", this.playing);
      play.querySelector("span:last-child").textContent = this.playing ? "Stop" : "Play";
      play.disabled = toSeq.disabled = clear.disabled = !this.hits.length && !this.recording;
      if (this.recording) status.textContent = this.recStart == null ? "Recording — waiting for your first hit…" : `Recording… ${this.hits.length} hits`;
      else if (this.hits.length) status.textContent = `${this.hits.length} hits · ${this.length.toFixed(1)}s`;
      else status.textContent = "Press Record (R), play something, then Stop.";
    },
  };
  Recorder.el.rec.addEventListener("click", () => Recorder.toggleRec());
  Recorder.el.play.addEventListener("click", () => Recorder.togglePlay());
  Recorder.el.clear.addEventListener("click", () => Recorder.clear());
  Recorder.el.toSeq.addEventListener("click", () => Recorder.toSequencer());
  Recorder.render();

  // ============================================================= SEQUENCER
  const Seq = {
    steps: 16,
    grid: null,
    el: $("#seq-grid"),
    emptyGrid() { return Object.fromEntries(KIT.map((k) => [k.id, Array(32).fill(false)])); },
    init() {
      const saved = store.get("seq", null);
      this.grid = this.emptyGrid();
      if (saved && saved.grid) {
        KIT.forEach((k) => saved.grid[k.id] && saved.grid[k.id].forEach((v, i) => (this.grid[k.id][i] = !!v)));
        this.steps = saved.steps === 32 ? 32 : 16;
      } else {
        const p = parsePattern(LESSONS.find((l) => l.id === "rock").pattern);
        KIT.forEach((k) => p.grid[k.id].forEach((v, i) => (this.grid[k.id][i] = v)));
      }
      $("#seq-steps").value = this.steps;
      $("#swing").value = Math.round(state.swing * 100);
      $("#swing-val").textContent = Math.round(state.swing * 100) + "%";
      $("#seq-preset").innerHTML = `<option value="">Load a groove…</option>` +
        LESSONS.map((l) => `<option value="${l.id}">${l.title}</option>`).join("");
      this.render();
    },
    save() { store.set("seq", { steps: this.steps, grid: this.grid }); },
    load(grid, steps) {
      this.grid = this.emptyGrid();
      KIT.forEach((k) => grid[k.id] && grid[k.id].forEach((v, i) => i < 32 && (this.grid[k.id][i] = v)));
      this.steps = steps;
      $("#seq-steps").value = steps;
      this.save();
      this.render();
    },
    render() {
      const head = `<div class="seq-label"></div>` + Array.from({ length: this.steps }, (_, i) =>
        `<div class="seq-count ${i % 4 === 0 ? "beat" : ""}">${COUNT_16[i % 16]}</div>`).join("");
      const rows = KIT.map((k) => `
        <button class="seq-label" data-inst="${k.id}" style="--c:${k.color}" title="Preview ${k.name}">
          <kbd>${k.key.toUpperCase()}</kbd><span>${k.name}</span>
        </button>` + Array.from({ length: this.steps }, (_, i) =>
          `<button class="cell ${this.grid[k.id][i] ? "on" : ""} ${i % 4 === 0 ? "beat" : ""} ${i % 16 === 0 && i ? "bar" : ""}"
             data-inst="${k.id}" data-step="${i}" style="--c:${k.color}" aria-label="${k.name} step ${i + 1}"></button>`).join("")).join("");
      this.el.style.setProperty("--steps", this.steps);
      this.el.innerHTML = head + rows;
    },
    playing: false,
    toggle() { this.playing ? stopAll() : this.play(); },
    play() {
      Engine.resume();
      this.playing = true;
      $("#seq-play").setAttribute("aria-pressed", "true");
      $("#seq-play span:last-child").textContent = "Stop";
      Transport.start({
        swing: state.swing,
        schedule: (i, t) => {
          const s = i % this.steps;
          KIT.forEach((k) => {
            if (this.grid[k.id][s]) {
              Engine.play(k.id, t);
              uiAt(t, () => flash(k.id));
            }
          });
          metroAt(i, t);
          uiAt(t, () => this.playhead(s));
        },
        onStop: () => {
          this.playing = false;
          this.playhead(-1);
          $("#seq-play").setAttribute("aria-pressed", "false");
          $("#seq-play span:last-child").textContent = "Play";
        },
      });
    },
    playhead(s) {
      $$(".cell.now, .seq-count.now", this.el).forEach((c) => c.classList.remove("now"));
      if (s >= 0) $$(`[data-step="${s}"]`, this.el).concat($$(".seq-count", this.el)[s] || []).forEach((c) => c.classList.add("now"));
    },
  };

  // paint-drag on the grid: press, then drag across cells
  let paint = null;
  Seq.el.addEventListener("pointerdown", (e) => {
    const lab = e.target.closest(".seq-label[data-inst]");
    if (lab) { hit(lab.dataset.inst); return; }
    const c = e.target.closest(".cell");
    if (!c) return;
    e.preventDefault();
    const on = !Seq.grid[c.dataset.inst][c.dataset.step];
    paint = on;
    setCell(c, on);
    if (on) { Engine.resume(); Engine.play(c.dataset.inst, 0, 0.6); }
  });
  Seq.el.addEventListener("pointerover", (e) => {
    const c = e.target.closest(".cell");
    if (c && paint !== null) setCell(c, paint);
  });
  window.addEventListener("pointerup", () => { if (paint !== null) { paint = null; Seq.save(); } });
  function setCell(c, on) {
    Seq.grid[c.dataset.inst][c.dataset.step] = on;
    c.classList.toggle("on", on);
  }

  $("#seq-play").addEventListener("click", () => Seq.toggle());
  $("#seq-clear").addEventListener("click", () => { Seq.grid = Seq.emptyGrid(); Seq.save(); Seq.render(); });
  $("#seq-steps").addEventListener("change", (e) => { Seq.steps = Number(e.target.value); Seq.save(); Seq.render(); });
  $("#swing").addEventListener("input", (e) => {
    state.swing = Number(e.target.value) / 100;
    store.set("swing", state.swing);
    $("#swing-val").textContent = e.target.value + "%";
    if (Seq.playing) Transport.swing = state.swing;
  });
  $("#seq-preset").addEventListener("change", (e) => {
    const l = LESSONS.find((x) => x.id === e.target.value);
    if (!l) return;
    const p = parsePattern(l.pattern);
    Seq.load(p.grid, p.steps > 16 ? 32 : 16);
    setBpm(l.bpm);
    e.target.value = "";
  });

  // ================================================================= LEARN
  const Learn = {
    listening: false,
    get lesson() { return LESSONS.find((l) => l.id === state.lessonId) || LESSONS[0]; },
    renderList() {
      $("#lesson-list").innerHTML = LESSONS.map((l, i) => `
        <button class="lesson-card" data-id="${l.id}">
          <span class="lesson-num">${String(i + 1).padStart(2, "0")}</span>
          <span class="lesson-text">
            <strong>${l.title}</strong>
            <small><span class="lvl lvl-${l.level.toLowerCase()}">${l.level}</span> · ${l.bpm} BPM ${bestBadge(l.id)}</small>
          </span>
        </button>`).join("");
    },
    init() {
      this.renderList();
      $("#lesson-list").addEventListener("click", (e) => {
        const c = e.target.closest(".lesson-card");
        if (!c) return;
        stopAll();
        state.lessonId = c.dataset.id;
        store.set("lesson", state.lessonId);
        this.render();
        if (window.matchMedia("(max-width: 900px)").matches) $("#lesson-detail").scrollIntoView({ behavior: "smooth" });
      });
      $("#keymap").innerHTML = ["L", "R"].map((h) => `
        <div class="hand"><h4>${h === "L" ? "Left hand" : "Right hand"}</h4>
          ${KIT.filter((k) => k.hand === h).map((k) => `<div class="km" style="--c:${k.color}"><kbd>${k.key.toUpperCase()}</kbd>${k.name}</div>`).join("")}
        </div>`).join("");
      this.render();
    },
    render() {
      const l = this.lesson;
      $$(".lesson-card").forEach((c) => c.classList.toggle("active", c.dataset.id === l.id));
      const { steps, grid } = parsePattern(l.pattern);
      const used = CHART_ORDER.filter((k) => grid[k.id].some(Boolean));
      const bars = steps / 16;

      const header = `<div class="nt-label"></div>` + Array.from({ length: steps }, (_, i) =>
        `<div class="nt-count ${i % 4 === 0 ? "beat" : ""} ${i % 16 === 0 && i ? "bar" : ""}" data-step="${i}">${COUNT_16[i % 16]}</div>`).join("");
      const rows = used.map((k) => `<div class="nt-label" style="--c:${k.color}"><kbd>${k.key.toUpperCase()}</kbd>${k.name}</div>` +
        grid[k.id].map((on, i) => `<div class="nt-cell ${i % 4 === 0 ? "beat" : ""} ${i % 16 === 0 && i ? "bar" : ""}" data-step="${i}">${on ? `<i style="--c:${k.color}">${k.key.toUpperCase()}</i>` : ""}</div>`).join("")).join("");

      const best = store.get("best." + l.id, null);
      $("#lesson-detail").innerHTML = `
        <div class="ld-head">
          <div>
            <p class="eyebrow"><span class="lvl lvl-${l.level.toLowerCase()}">${l.level}</span> · ${l.bpm} BPM target · ${bars} bar${bars > 1 ? "s" : ""}</p>
            <h2>${l.title}</h2>
            <p class="summary">${l.summary}</p>
          </div>
          ${best != null ? `<div class="best">Best<strong>${best}%</strong></div>` : ""}
        </div>

        <div class="ld-actions">
          <button class="btn" id="ld-listen"><span class="ico">▶</span><span>Listen</span></button>
          <button class="btn primary" id="ld-practice"><span class="ico">🎯</span><span>Practice</span></button>
          <button class="btn ghost" id="ld-seq"><span class="ico">▦</span><span>Open in sequencer</span></button>
          <div class="ld-opts">
            <label>Tempo
              <select id="ld-tempo">
                <option value="0.6">60%</option><option value="0.75">75%</option>
                <option value="0.9">90%</option><option value="1">100%</option><option value="1.15">115%</option>
              </select>
            </label>
            <label>Loops
              <select id="ld-loops"><option>2</option><option selected>4</option><option>8</option></select>
            </label>
            <label class="check"><input type="checkbox" id="ld-guide" checked> Guide sounds</label>
          </div>
        </div>

        <h3>What to play</h3>
        <p class="muted">Read left to right. Each column is a 16th note; a filled circle means press that key. Notes stacked in one column are pressed together.</p>
        <div class="notation-wrap"><div class="notation" style="--steps:${steps}">${header}${rows}</div></div>
        <p class="count-line"><span>Count out loud:</span> <code>${l.count}</code></p>

        <div class="ld-cols">
          <div>
            <h3>How to play it</h3>
            <ol class="how">${l.how.map((h) => `<li>${h}</li>`).join("")}</ol>
          </div>
          <div>
            <h3>Keys for this groove</h3>
            <div class="keys">${used.map((k) => `<div class="km" style="--c:${k.color}"><kbd>${k.key.toUpperCase()}</kbd>${k.name}<small>${k.hand === "L" ? "left hand" : "right hand"}</small></div>`).join("")}</div>
            <div class="tip"><strong>Coach’s tip</strong>${l.tip}</div>
          </div>
        </div>`;

      $("#ld-tempo").value = store.get("tempoPct", "0.75");
      $("#ld-tempo").addEventListener("change", (e) => store.set("tempoPct", e.target.value));
      $("#ld-listen").addEventListener("click", () => this.toggleListen());
      $("#ld-practice").addEventListener("click", () => Practice.start(l, {
        pct: Number($("#ld-tempo").value),
        loops: Number($("#ld-loops").value),
        guide: $("#ld-guide").checked,
      }));
      $("#ld-seq").addEventListener("click", () => {
        Seq.load(grid, steps > 16 ? 32 : 16);
        setBpm(l.bpm);
        showView("seq");
      });
    },
    toggleListen() {
      if (this.listening) return stopAll();
      const l = this.lesson;
      const { steps, grid } = parsePattern(l.pattern);
      setBpm(l.bpm * Number($("#ld-tempo").value));
      Engine.resume();
      this.listening = true;
      $("#ld-listen span:last-child").textContent = "Stop";
      $("#ld-listen").setAttribute("aria-pressed", "true");
      const cols = (s) => $$(`#lesson-detail [data-step="${s}"]`);
      let lit = [];
      Transport.start({
        schedule: (i, t) => {
          const s = i % steps;
          KIT.forEach((k) => grid[k.id][s] && Engine.play(k.id, t));
          if (i % 4 === 0) Engine.click(t, i % 16 === 0, state.metronome ? 0.5 : 0.25);
          uiAt(t, () => {
            lit.forEach((c) => c.classList.remove("now"));
            lit = cols(s);
            lit.forEach((c) => c.classList.add("now"));
          });
        },
        onStop: () => {
          this.listening = false;
          lit.forEach((c) => c.classList.remove("now"));
          const b = $("#ld-listen");
          if (b) { b.setAttribute("aria-pressed", "false"); b.querySelector("span:last-child").textContent = "Listen"; }
        },
      });
    },
  };

  function bestBadge(id) {
    const b = store.get("best." + id, null);
    return b == null ? "" : `· <span class="best-chip">★ ${b}%</span>`;
  }

  // ============================================================== PRACTICE
  // Notes scroll right→left; hit the key as each note crosses the line.
  const WINDOW = { perfect: 0.045, good: 0.09, ok: 0.15 };
  const SCORE = { perfect: 1, good: 0.75, ok: 0.4, miss: 0 };

  const Practice = {
    active: false,
    overlay: $("#practice"),
    canvas: $("#hw"),
    start(lesson, opts) {
      stopAll();
      Engine.resume();
      const { steps, grid } = parsePattern(lesson.pattern);
      this.lesson = lesson;
      this.opts = opts;
      this.lanes = CHART_ORDER.filter((k) => grid[k.id].some(Boolean));
      const COUNT_IN = 16;
      const total = COUNT_IN + steps * opts.loops;
      setBpm(lesson.bpm * opts.pct);
      lockTempo(true);

      this.active = true;
      this.notes = [];
      this.stats = { perfect: 0, good: 0, ok: 0, miss: 0, extra: 0, streak: 0, best: 0, offsets: [] };
      this.feedback = null;
      this.laneFlash = {};
      this.bursts = [];
      this.countIn = COUNT_IN;
      this.total = total;

      Transport.start({
        total,
        schedule: (i, t) => {
          if (i % 4 === 0) Engine.click(t, i % 16 === 0, i < COUNT_IN ? 0.7 : 0.45);
          if (i < COUNT_IN) return;
          const s = (i - COUNT_IN) % steps;
          if (opts.guide) this.lanes.forEach((k) => grid[k.id][s] && Engine.play(k.id, t, 0.3));
        },
      });
      for (let j = 0; j < steps * opts.loops; j++) {
        const s = j % steps;
        this.lanes.forEach((k) => {
          if (grid[k.id][s]) this.notes.push({ inst: k.id, time: Transport.timeOf(COUNT_IN + j), step: s, res: null });
        });
      }
      this.endTime = Transport.timeOf(total) + 0.4;

      $("#pr-title").textContent = lesson.title;
      $("#pr-tempo").textContent = `${state.bpm} BPM`;
      $("#pr-results").hidden = true;
      this.overlay.hidden = false;
      document.body.classList.add("no-scroll");
      this.resize();
      this.updateStats();
    },
    stop(showResults = false) {
      if (!this.active) return;
      this.active = false;
      Transport.halt();
      lockTempo(false);
      if (showResults) this.results();
      else this.close();
    },
    close() {
      this.overlay.hidden = true;
      document.body.classList.remove("no-scroll");
      idle();
    },
    onHit(inst) {
      if (!this.active) return;
      const t = heardNow();
      this.laneFlash[inst] = t;
      let best = null;
      for (const n of this.notes) {
        if (n.inst !== inst || n.res) continue;
        const d = t - n.time;
        if (Math.abs(d) <= WINDOW.ok && (!best || Math.abs(d) < Math.abs(t - best.time))) best = n;
        if (n.time > t + WINDOW.ok) break;
      }
      if (!best) { this.stats.extra++; this.say("Extra", "#94a3b8", inst); this.updateStats(); return; }
      const d = t - best.time;
      const a = Math.abs(d);
      best.res = a <= WINDOW.perfect ? "perfect" : a <= WINDOW.good ? "good" : "ok";
      best.hitAt = t;
      this.stats[best.res]++;
      this.stats.offsets.push(d);
      this.stats.streak++;
      this.stats.best = Math.max(this.stats.best, this.stats.streak);
      this.bursts.push({ inst, t, res: best.res });
      if (best.res === "perfect") this.say("Perfect!", "#4ade80", inst);
      else if (best.res === "good") this.say(d < 0 ? "Good · early" : "Good · late", "#facc15", inst);
      else this.say(d < 0 ? "Early" : "Late", "#fb923c", inst);
      this.updateStats();
    },
    say(text, color, inst) { this.feedback = { text, color, t: heardNow(), inst }; },
    judged() { return this.stats.perfect + this.stats.good + this.stats.ok + this.stats.miss; },
    accuracy() {
      const n = this.judged();
      if (!n) return 100;
      const s = this.stats;
      return Math.round(((s.perfect * SCORE.perfect + s.good * SCORE.good + s.ok * SCORE.ok) / n) * 100);
    },
    updateStats() {
      $("#pr-acc").textContent = this.accuracy() + "%";
      $("#pr-streak").textContent = this.stats.streak;
      $("#pr-left").textContent = this.notes.filter((n) => !n.res).length;
    },
    frame() {
      if (!this.active) return;
      const now = heardNow();
      let changed = false;
      for (const n of this.notes) {
        if (!n.res && now - n.time > WINDOW.ok) {
          n.res = "miss";
          this.stats.miss++;
          this.stats.streak = 0;
          changed = true;
          this.say("Miss", "#f43f5e", n.inst);
        }
      }
      if (changed) this.updateStats();
      this.draw(now);
      if (now > this.endTime) this.stop(true);
    },
    resize() {
      const c = this.canvas;
      const r = c.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      this.ctx2d = c.getContext("2d");
      this.ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.w = r.width;
      this.h = r.height;
    },
    draw(now) {
      const g = this.ctx2d, W = this.w, H = this.h;
      const narrow = W < 560;
      const labelW = narrow ? 64 : 132;
      const hitX = labelW + (narrow ? 34 : 60);
      const laneH = Math.min(110, (H - 60) / this.lanes.length);
      const top = Math.max(34, (H - laneH * this.lanes.length) / 2);
      const sd = Transport.stepDur();
      const pps = Math.max(narrow ? 110 : 200, (narrow ? 28 : 56) / sd);
      const xOf = (t) => hitX + (t - now) * pps;

      g.clearRect(0, 0, W, H);

      // lanes
      this.lanes.forEach((k, li) => {
        const y = top + li * laneH;
        g.fillStyle = li % 2 ? "rgba(255,255,255,0.025)" : "rgba(255,255,255,0.05)";
        g.fillRect(0, y, W, laneH);
        const f = this.laneFlash[k.id];
        if (f != null && now - f < 0.15) {
          g.fillStyle = hexA(k.color, 0.18 * (1 - (now - f) / 0.15));
          g.fillRect(0, y, W, laneH);
        }
        // label
        g.fillStyle = k.color;
        roundRect(g, 10, y + laneH / 2 - 14, 28, 28, 7);
        g.fill();
        g.fillStyle = "#111";
        g.font = "700 15px Inter, system-ui, sans-serif";
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(k.key.toUpperCase(), 24, y + laneH / 2 + 1);
        if (!narrow) {
          g.fillStyle = "#cbd5e1";
          g.font = "500 13px Inter, system-ui, sans-serif";
          g.textAlign = "left";
          g.fillText(k.name, 46, y + laneH / 2 + 1);
        }
      });

      // beat & bar lines with counts
      const first = Math.max(0, Math.floor((now - (hitX / pps) - Transport.t0) / sd));
      for (let i = first; i <= this.total; i++) {
        const x = xOf(Transport.timeOf(i));
        if (x > W) break;
        if (i % 4 !== 0 || x < labelW) continue;
        const bar = i % 16 === 0;
        g.fillStyle = bar ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.08)";
        g.fillRect(x - (bar ? 1 : 0.5), top, bar ? 2 : 1, laneH * this.lanes.length);
        g.fillStyle = i < this.countIn ? "#facc15" : "#94a3b8";
        g.font = `${bar ? 700 : 500} 12px Inter, system-ui, sans-serif`;
        g.textAlign = "center";
        g.fillText(String((i % 16) / 4 + 1), x, top - 14);
      }

      // hit line
      const grad = g.createLinearGradient(hitX - 14, 0, hitX + 14, 0);
      grad.addColorStop(0, "rgba(218,4,99,0)");
      grad.addColorStop(0.5, "rgba(218,4,99,0.35)");
      grad.addColorStop(1, "rgba(218,4,99,0)");
      g.fillStyle = grad;
      g.fillRect(hitX - 14, top, 28, laneH * this.lanes.length);
      g.fillStyle = "#ff3d8b";
      g.fillRect(hitX - 1.5, top, 3, laneH * this.lanes.length);

      // notes
      const laneIdx = Object.fromEntries(this.lanes.map((k, i) => [k.id, i]));
      const r = Math.min(22, laneH * 0.3);
      for (const n of this.notes) {
        const x = xOf(n.time);
        if (x > W + r) break;
        if (x < labelW - r) continue;
        if (n.res && n.res !== "miss") continue;
        const k = INST[n.inst];
        const y = top + laneIdx[n.inst] * laneH + laneH / 2;
        g.globalAlpha = n.res === "miss" ? 0.3 : 1;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fillStyle = n.res === "miss" ? "#475569" : k.color;
        g.fill();
        g.fillStyle = "#111";
        g.font = `700 ${Math.round(r * 0.95)}px Inter, system-ui, sans-serif`;
        g.textAlign = "center";
        g.fillText(k.key.toUpperCase(), x, y + 1);
        g.globalAlpha = 1;
      }

      // hit bursts
      this.bursts = this.bursts.filter((b) => now - b.t < 0.35);
      for (const b of this.bursts) {
        const p = (now - b.t) / 0.35;
        const y = top + laneIdx[b.inst] * laneH + laneH / 2;
        g.beginPath();
        g.arc(hitX, y, r + p * 22, 0, Math.PI * 2);
        g.strokeStyle = hexA(b.res === "perfect" ? "#4ade80" : b.res === "good" ? "#facc15" : "#fb923c", 1 - p);
        g.lineWidth = 3;
        g.stroke();
      }

      // count-in banner
      const firstNote = Transport.timeOf(this.countIn);
      if (now < firstNote) {
        const beat = Math.floor((now - Transport.t0) / (sd * 4));
        g.fillStyle = "rgba(10,8,16,0.55)";
        g.fillRect(hitX + 20, top + 8, W - hitX - 40, 40);
        g.fillStyle = "#facc15";
        g.font = "700 18px Inter, system-ui, sans-serif";
        g.textAlign = "center";
        g.fillText(beat < 0 ? "Get ready…" : `Count-in: ${Math.min(4, beat + 1)}  —  start on the next “1”`, (hitX + W) / 2, top + 28);
      }

      // judgement text
      const fb = this.feedback;
      if (fb && now - fb.t < 0.6) {
        const p = (now - fb.t) / 0.6;
        g.globalAlpha = 1 - p;
        g.fillStyle = fb.color;
        g.font = "800 22px Inter, system-ui, sans-serif";
        g.textAlign = "left";
        g.fillText(fb.text, hitX + 16, top - 14 - p * 6);
        g.globalAlpha = 1;
      }
    },
    results() {
      const s = this.stats;
      const acc = this.accuracy();
      const stars = acc >= 90 ? 3 : acc >= 75 ? 2 : acc >= 50 ? 1 : 0;
      const offs = s.offsets;
      const avg = offs.length ? (offs.reduce((a, b) => a + b, 0) / offs.length) * 1000 : 0;
      let coach;
      if (s.miss > (this.notes.length * 0.3)) coach = "Lots of missed notes — drop the tempo to 60% and loop it until it feels easy.";
      else if (avg < -15) coach = `You’re rushing: on average ${Math.round(-avg)} ms early. Relax and let the click come to you.`;
      else if (avg > 15) coach = `You’re dragging: on average ${Math.round(avg)} ms late. Anticipate the beat a little more.`;
      else if (acc >= 90) coach = "Rock solid. Bump the tempo up and try again!";
      else coach = "Your timing is centred — now work on consistency. Count out loud while you play.";
      if (s.extra > 3) coach += ` (${s.extra} extra hits — only play the notes on the chart.)`;

      const key = "best." + this.lesson.id;
      const prev = store.get(key, null);
      const isBest = this.opts.pct >= 1 && (prev == null || acc > prev);
      if (isBest) store.set(key, acc);

      $("#pr-results").innerHTML = `
        <div class="res-card">
          <p class="eyebrow">${this.lesson.title} · ${state.bpm} BPM</p>
          <div class="stars">${"★".repeat(stars)}<span>${"★".repeat(3 - stars)}</span></div>
          <div class="res-acc">${acc}%</div>
          ${isBest ? `<p class="new-best">New personal best!</p>` : this.opts.pct < 1 ? `<p class="muted small">Play at 100% tempo to set a personal best.</p>` : ""}
          <div class="res-grid">
            <div><strong style="color:#4ade80">${s.perfect}</strong>Perfect</div>
            <div><strong style="color:#facc15">${s.good}</strong>Good</div>
            <div><strong style="color:#fb923c">${s.ok}</strong>Early/Late</div>
            <div><strong style="color:#f43f5e">${s.miss}</strong>Miss</div>
            <div><strong>${s.best}</strong>Best streak</div>
            <div><strong>${avg >= 0 ? "+" : ""}${Math.round(avg)}ms</strong>Avg timing</div>
          </div>
          <p class="coach">${coach}</p>
          <div class="res-actions">
            <button class="btn primary" id="pr-again">↻ Try again</button>
            <button class="btn" id="pr-close">Back to lesson</button>
          </div>
        </div>`;
      $("#pr-results").hidden = false;
      $("#pr-again").addEventListener("click", () => this.start(this.lesson, this.opts));
      $("#pr-close").addEventListener("click", () => { this.close(); Learn.renderList(); Learn.render(); });
    },
  };
  $("#pr-stop").addEventListener("click", () => (Practice.active ? Practice.stop() : Practice.close()));
  window.addEventListener("resize", () => Practice.active && Practice.resize());

  // ------------------------------------------------------------ helpers
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${Math.max(0, a)})`;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  // ------------------------------------------------------------ main loop
  function loop() {
    const now = heardNow();
    while (uiQueue.length && uiQueue[0].time <= now) uiQueue.shift().fn();
    Practice.frame();
    requestAnimationFrame(loop);
  }

  // --------------------------------------------------------------- boot
  vol.value = state.volume;
  Engine.setVolume(state.volume);
  setBpm(state.bpm);
  metroBtn.setAttribute("aria-pressed", state.metronome);
  Seq.init();
  Learn.init();
  showView(state.view);
  Engine.load().then(() => document.body.classList.add("ready"));
  // browsers keep audio suspended until the first user gesture
  const unlock = () => { Engine.resume(); idle(); };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  requestAnimationFrame(loop);
})();
