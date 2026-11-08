/* ==========================================================================
   Audio engine — Web Audio API
   - Samples are decoded once into AudioBuffers (low latency, unlimited polyphony)
   - Every sound can be scheduled at an exact time on the audio clock,
     which is what makes the sequencer, metronome and practice mode tight.
   - Hi-hat is synthesised (the original kit has no hi-hat sample).
   ========================================================================== */
const Engine = (() => {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC({ latencyHint: "interactive" });

  // master chain: per-hit gain -> master gain -> gentle compressor -> speakers
  const master = ctx.createGain();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.knee.value = 6;
  comp.ratio.value = 4;
  comp.attack.value = 0.003;
  comp.release.value = 0.15;
  master.connect(comp).connect(ctx.destination);
  master.gain.value = 0.8;

  const buffers = {};
  let ready = false;

  function b64ToArrayBuffer(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }

  async function load() {
    const data = window.DRUM_SOUND_DATA || {};
    await Promise.all(
      Object.entries(data).map(async ([id, b64]) => {
        try {
          buffers[id] = await ctx.decodeAudioData(b64ToArrayBuffer(b64));
        } catch (e) {
          console.warn("Could not decode", id, e);
        }
      })
    );
    ready = true;
  }

  // ---- hi-hat synth (808 style: six detuned square waves + noise, band-passed)
  const noiseBuf = (() => {
    const len = ctx.sampleRate * 0.5;
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return b;
  })();
  const HAT_RATIOS = [2, 3, 4.16, 5.43, 6.79, 8.21];

  function hat(when, vel) {
    const decay = 0.06;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, when);
    out.gain.exponentialRampToValueAtTime(0.55 * vel, when + 0.002);
    out.gain.exponentialRampToValueAtTime(0.0001, when + decay);

    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 10000;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    bp.connect(hp).connect(out).connect(master);

    HAT_RATIOS.forEach((r) => {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = 40 * r;
      const g = ctx.createGain();
      g.gain.value = 0.18;
      o.connect(g).connect(bp);
      o.start(when);
      o.stop(when + decay + 0.02);
    });
    const n = ctx.createBufferSource();
    n.buffer = noiseBuf;
    const ng = ctx.createGain();
    ng.gain.value = 0.5;
    n.connect(ng).connect(bp);
    n.start(when);
    n.stop(when + decay + 0.02);
  }

  /** Play an instrument now (when=0) or at an exact audio-clock time. */
  function play(id, when = 0, vel = 1) {
    const t = Math.max(when, ctx.currentTime);
    if (id === "hihat") return hat(t, vel);
    const buf = buffers[id];
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = vel;
    src.connect(g).connect(master);
    src.start(t);
  }

  /** Metronome click. accent = first beat of the bar. */
  function click(when, accent = false, level = 0.5) {
    const t = Math.max(when, ctx.currentTime);
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = accent ? 1760 : 1175;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(level, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + 0.06);
  }

  return {
    ctx,
    load,
    play,
    click,
    get ready() { return ready; },
    now: () => ctx.currentTime,
    /** Seconds between the audio clock and what actually reaches the speakers. */
    latency: () => (ctx.outputLatency || 0) + (ctx.baseLatency || 0),
    setVolume: (v) => master.gain.setTargetAtTime(v, ctx.currentTime, 0.01),
    resume: () => (ctx.state !== "running" ? ctx.resume() : Promise.resolve()),
  };
})();
