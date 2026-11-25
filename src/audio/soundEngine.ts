// Realistic Physical Foley & Outdoor Pyrotechnic Web Audio Synthesizer

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  private lastStepTime: number = 0;
  private lastHoverTime: number = 0;
  private lastLatchTime: number = 0;

  // Cached reusable buffers per AudioContext (zero per-trigger allocations)
  private whiteBuf: AudioBuffer | null = null;
  private pinkBuf: AudioBuffer | null = null;
  private brownBuf: AudioBuffer | null = null;
  private crackleBuf: AudioBuffer | null = null;
  private sixSevenBuf: AudioBuffer | null = null;
  private active67Gain: GainNode | null = null;
  private satCurve: Float32Array<ArrayBuffer> | null = null;

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.whiteBuf) {
      this.initBuffers(this.ctx);
    }
    return this.ctx;
  }

  private initBuffers(ctx: AudioContext) {
    const sr = ctx.sampleRate;

    // 1) White noise (1.6s)
    const wLen = Math.floor(sr * 1.6);
    this.whiteBuf = ctx.createBuffer(1, wLen, sr);
    const wData = this.whiteBuf.getChannelData(0);
    for (let i = 0; i < wLen; i++) wData[i] = Math.random() * 2 - 1;

    // 2) Pink 1/f noise via Paul Kellet's filter (1.8s — natural water, propellant, wood/earth foley)
    const pLen = Math.floor(sr * 1.8);
    this.pinkBuf = ctx.createBuffer(1, pLen, sr);
    const pData = this.pinkBuf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < pLen; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      pData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    // 3) Brown 1/f^2 noise (1.8s — deep thunderous pyrotechnic rumble & outdoor echo)
    const brLen = Math.floor(sr * 1.8);
    this.brownBuf = ctx.createBuffer(1, brLen, sr);
    const brData = this.brownBuf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < brLen; i++) {
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.024 * white) / 1.024;
      brData[i] = Math.max(-1, Math.min(1, lastOut * 3.2));
    }

    // 4) Stochastic firework titanium/kamuro crackle impulse buffer (2.0s)
    const cLen = Math.floor(sr * 2.0);
    this.crackleBuf = ctx.createBuffer(1, cLen, sr);
    const cData = this.crackleBuf.getChannelData(0);
    let burstEnv = 0;
    for (let i = 0; i < cLen; i++) {
      if (Math.random() < 0.0042) {
        burstEnv = 0.45 + Math.random() * 0.55;
      }
      cData[i] = (Math.random() * 2 - 1) * burstEnv;
      burstEnv *= 0.92;
    }

    // 5) Warm analog-style soft clipper curve for punchy drums / explosions
    const n = 256;
    const curve = new Float32Array(new ArrayBuffer(n * 4));
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / (n - 1) - 1;
      curve[i] = Math.tanh(x * 2.2);
    }
    this.satCurve = curve;
  }

  private makeSaturator(ctx: AudioContext): WaveShaperNode {
    const ws = ctx.createWaveShaper();
    if (this.satCurve) ws.curve = this.satCurve;
    ws.oversample = '2x';
    return ws;
  }

  private noiseSlice(
    ctx: AudioContext,
    buf: AudioBuffer | null,
    t0: number,
    dur: number,
    filterType: BiquadFilterType,
    fStart: number,
    fEnd: number,
    q: number,
    peakGain: number,
    attack: number = 0.004,
    dest?: AudioNode,
  ) {
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const maxOffset = Math.max(0, buf.duration - dur - 0.05);
    const offset = maxOffset > 0 ? Math.random() * maxOffset : 0;

    const flt = ctx.createBiquadFilter();
    flt.type = filterType;
    flt.Q.value = q;
    flt.frequency.setValueAtTime(Math.max(20, fStart), t0);
    if (fEnd !== fStart) {
      flt.frequency.exponentialRampToValueAtTime(Math.max(20, fEnd), t0 + dur);
    }

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peakGain, t0 + Math.min(dur * 0.4, attack));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    src.connect(flt);
    flt.connect(g);
    g.connect(dest ?? ctx.destination);
    src.start(t0, offset, dur + 0.02);
    src.stop(t0 + dur + 0.03);
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  /** Realistic earthy Kalimantan dirt/plank footstep with heel thud & subtle leaf/gravel grit */
  public playStep(hasBoots: boolean = false) {
    const now = performance.now();
    const interval = hasBoots ? 168 : 212;
    if (now - this.lastStepTime < interval) return;
    this.lastStepTime = now;

    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const jitter = 0.93 + Math.random() * 0.14;

    // 1) Soft heel/sole impact thud
    const heel = ctx.createOscillator();
    const hg = ctx.createGain();
    heel.type = 'sine';
    heel.frequency.setValueAtTime((hasBoots ? 132 : 104) * jitter, t0);
    heel.frequency.exponentialRampToValueAtTime(38 * jitter, t0 + 0.055);
    hg.gain.setValueAtTime(0.09, t0);
    hg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    heel.connect(hg);
    hg.connect(ctx.destination);
    heel.start(t0);
    heel.stop(t0 + 0.065);

    // 2) Earthy soil / wooden board scuff texture
    this.noiseSlice(
      ctx,
      this.pinkBuf,
      t0 + 0.004,
      hasBoots ? 0.055 : 0.065,
      'bandpass',
      (hasBoots ? 1350 : 980) * jitter,
      (hasBoots ? 820 : 620) * jitter,
      1.7,
      hasBoots ? 0.075 : 0.06,
      0.005,
    );
  }

  /** Warm tactile wooden marimba/bamboo UI tap */
  public playBlip(pitch: number = 440) {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    // Resonant hardwood body
    const body = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const g = ctx.createGain();
    const og = ctx.createGain();
    body.type = 'sine';
    overtone.type = 'triangle';
    body.frequency.setValueAtTime(pitch, t0);
    body.frequency.exponentialRampToValueAtTime(pitch * 1.03, t0 + 0.07);
    overtone.frequency.setValueAtTime(pitch * 2.76, t0);

    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(0.085, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);

    og.gain.setValueAtTime(0.025, t0);
    og.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.028);

    body.connect(g);
    overtone.connect(og);
    g.connect(ctx.destination);
    og.connect(ctx.destination);
    body.start(t0);
    overtone.start(t0);
    body.stop(t0 + 0.09);
    overtone.stop(t0 + 0.035);
  }

  /** Realistic brass spring-latch click + oiled ironwood (ulin) swing & jamb thud */
  public playDoorLatch(opening: boolean = true) {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    if (now - this.lastLatchTime < 290) return;
    this.lastLatchTime = now;

    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    // 1) Crisp metallic brass latch bolt click (dual inharmonic partials)
    for (const [f, amp, dur] of (opening
      ? [[1920, 0.032, 0.024], [3180, 0.022, 0.018]]
      : [[1540, 0.038, 0.028], [2690, 0.024, 0.02]])) {
      const m = ctx.createOscillator();
      const mg = ctx.createGain();
      m.type = 'triangle';
      m.frequency.setValueAtTime(f, t0);
      m.frequency.exponentialRampToValueAtTime(f * 0.68, t0 + dur);
      mg.gain.setValueAtTime(amp, t0);
      mg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      m.connect(mg);
      mg.connect(ctx.destination);
      m.start(t0);
      m.stop(t0 + dur + 0.005);
    }

    // 2) Warm timber air/hinge friction
    this.noiseSlice(
      ctx,
      this.pinkBuf,
      t0 + 0.01,
      0.13,
      'bandpass',
      opening ? 240 : 340,
      opening ? 410 : 170,
      3.2,
      0.065,
      0.015,
    );

    // 3) Solid ironwood frame resonance (closing seats with a deeper woody thud)
    const wood = ctx.createOscillator();
    const wg = ctx.createGain();
    wood.type = 'sine';
    const wStart = t0 + (opening ? 0.012 : 0.018);
    wood.frequency.setValueAtTime(opening ? 135 : 108, wStart);
    wood.frequency.exponentialRampToValueAtTime(opening ? 195 : 52, wStart + 0.12);
    wg.gain.setValueAtTime(opening ? 0.055 : 0.095, wStart);
    wg.gain.exponentialRampToValueAtTime(0.0001, wStart + 0.13);
    wood.connect(wg);
    wg.connect(ctx.destination);
    wood.start(wStart);
    wood.stop(wStart + 0.14);
  }

  /** Full scene-transition heavy wooden door unlatch, creak & air displacement */
  public playDoorOpen() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    // Brass handle press + latch release
    this.noiseSlice(ctx, this.whiteBuf, t0, 0.022, 'bandpass', 2400, 1600, 3.0, 0.06, 0.002);

    // Warm resonant wooden creak & swing whoosh
    const creak = ctx.createOscillator();
    const creakFlt = ctx.createBiquadFilter();
    const cg = ctx.createGain();
    creak.type = 'sawtooth';
    creak.frequency.setValueAtTime(128, t0 + 0.02);
    creak.frequency.linearRampToValueAtTime(196, t0 + 0.15);
    creak.frequency.exponentialRampToValueAtTime(142, t0 + 0.28);
    creakFlt.type = 'bandpass';
    creakFlt.frequency.value = 360;
    creakFlt.Q.value = 4.2;
    cg.gain.setValueAtTime(0.0001, t0 + 0.02);
    cg.gain.linearRampToValueAtTime(0.075, t0 + 0.06);
    cg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.30);
    creak.connect(creakFlt);
    creakFlt.connect(cg);
    cg.connect(ctx.destination);
    creak.start(t0 + 0.02);
    creak.stop(t0 + 0.31);

    this.noiseSlice(ctx, this.pinkBuf, t0 + 0.03, 0.25, 'lowpass', 520, 180, 1.2, 0.09, 0.04);
  }

  /** Deep Kalimantan bronze gong warning & dry-season wind swell */
  public playCutsceneAlert() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    // Warm mallet strike transient
    this.noiseSlice(ctx, this.pinkBuf, t0, 0.06, 'lowpass', 420, 140, 1.5, 0.14, 0.006);

    // Beating bronze gong partials
    const partials: Array<[number, number, number]> = [
      [110.0, 0.16, 1.35],
      [111.8, 0.11, 1.25],
      [165.4, 0.08, 0.95],
      [246.9, 0.05, 0.72],
      [331.2, 0.03, 0.50],
    ];
    for (const [freq, amp, dur] of partials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.985, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(amp, t0 + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    }

    // Atmospheric smoke-haze wind swell
    this.noiseSlice(ctx, this.pinkBuf, t0 + 0.05, 0.95, 'bandpass', 380, 210, 2.2, 0.07, 0.22);
  }

  /** Realistic metallic Rupiah coins clinking + crisp paper rustle */
  public playCoinCollect() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    // Subtle wallet/paper rustle
    this.noiseSlice(ctx, this.whiteBuf, t0, 0.055, 'bandpass', 3200, 1900, 1.8, 0.035, 0.005);

    // Two staggered silver/nickel-brass coin rings with realistic inharmonic partials
    const coins = [
      { t: 0.00, partials: [2190, 3480, 5240], dur: 0.28, gain: 0.075 },
      { t: 0.075, partials: [2630, 4120, 6190], dur: 0.36, gain: 0.085 },
    ];
    for (const coin of coins) {
      coin.partials.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        const st = t0 + coin.t;
        const d = coin.dur * (1 - idx * 0.22);
        osc.frequency.setValueAtTime(freq, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(coin.gain / (idx + 1), st + 0.002);
        g.gain.exponentialRampToValueAtTime(0.0001, st + d);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(st);
        osc.stop(st + d + 0.01);
      });
    }
  }

  /** Wooden counter coin drop + warm Kalimantan Gambang/Angklung marimba chord */
  public playBuySuccess() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    this.noiseSlice(ctx, this.pinkBuf, t0, 0.04, 'bandpass', 1800, 900, 2.0, 0.05, 0.003);

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const st = t0 + idx * 0.068;
      // Warm hardwood fundamental + 4th harmonic marimba bar overtone
      for (const [mult, amp, dur] of [[1, 0.11, 0.26], [3.98, 0.03, 0.055]] as const) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * mult, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(amp, st + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, st + dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(st);
        osc.stop(st + dur + 0.01);
      }
    });
  }

  /** Muffled hollow wooden knock for blocked/error actions */
  public playError() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    for (const [off, f0, f1] of [[0, 175, 118], [0.105, 138, 86]] as const) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f0, t0 + off);
      osc.frequency.exponentialRampToValueAtTime(f1, t0 + off + 0.11);
      g.gain.setValueAtTime(0.11, t0 + off);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.12);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(t0 + off);
      osc.stop(t0 + off + 0.13);
    }
  }

  /** Realistic lake bucket plunge, water slosh & hollow air-bubble glugs */
  public playWaterFill() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1) Initial bucket rim hitting lake surface + spray
    this.noiseSlice(ctx, this.pinkBuf, now + 0.12, 0.34, 'bandpass', 880, 340, 1.3, 0.22, 0.018);
    this.noiseSlice(ctx, this.whiteBuf, now + 0.14, 0.20, 'highpass', 1800, 1100, 0.8, 0.065, 0.01);

    // 2) Resonant underwater "glug-glug-glug" air bubbles rising as bucket submerges
    const glugs = [215, 278, 355, 455, 575];
    glugs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const bp = ctx.createBiquadFilter();
      const g = ctx.createGain();
      const st = now + 0.19 + idx * 0.072;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.78, st);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.45, st + 0.068);
      bp.type = 'bandpass';
      bp.frequency.value = freq * 1.2;
      bp.Q.value = 2.5;
      g.gain.setValueAtTime(0.0001, st);
      g.gain.linearRampToValueAtTime(0.17, st + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.078);
      osc.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      osc.start(st);
      osc.stop(st + 0.085);
    });
  }

  /** Realistic heavy water douse + hot ember quenching steam sizzle! */
  public playWaterPour() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    // 1) Heavy liquid sheet sloshing out of the bucket
    this.noiseSlice(ctx, this.pinkBuf, t0, 0.32, 'bandpass', 620, 1380, 1.1, 0.24, 0.02);

    // 2) Hot coals quenching into rising white steam hiss!
    this.noiseSlice(ctx, this.whiteBuf, t0 + 0.14, 0.56, 'bandpass', 3200, 1450, 0.9, 0.13, 0.05);
    this.noiseSlice(ctx, this.pinkBuf, t0 + 0.16, 0.48, 'lowpass', 480, 180, 1.0, 0.11, 0.03);
  }

  /** Subtle organic bamboo UI tick on hover */
  public playHover() {
    const now = performance.now();
    if (now - this.lastHoverTime < 90) return;
    this.lastHoverTime = now;

    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(860, t0);
    osc.frequency.exponentialRampToValueAtTime(1180, t0 + 0.028);
    g.gain.setValueAtTime(0.032, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.032);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.036);
  }

  /** Warm resonant Kalimantan marimba + chime arpeggio for milestones */
  public playMilestone() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const st = t0 + idx * 0.085;
      const osc = ctx.createOscillator();
      const chime = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      chime.type = 'triangle';
      osc.frequency.setValueAtTime(freq, st);
      chime.frequency.setValueAtTime(freq * 2, st);
      g.gain.setValueAtTime(0.0001, st);
      g.gain.linearRampToValueAtTime(0.11, st + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.34);
      osc.connect(g);
      chime.connect(g);
      g.connect(ctx.destination);
      osc.start(st);
      chime.start(st);
      osc.stop(st + 0.35);
      chime.stop(st + 0.14);
    });
  }

  /** Celebratory ensemble fanfare with warm gong bass & shimmering chimes */
  public playVictoryFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    const melody = [
      { f: 523.25, d: 0.18, t: 0.00 },
      { f: 659.25, d: 0.18, t: 0.14 },
      { f: 783.99, d: 0.18, t: 0.28 },
      { f: 1046.5, d: 0.36, t: 0.42 },
      { f: 783.99, d: 0.18, t: 0.76 },
      { f: 1046.5, d: 0.75, t: 0.94 },
    ];
    for (const n of melody) {
      const st = t0 + n.t;
      for (const [mult, type, amp] of [[1, 'triangle', 0.11], [0.5, 'sine', 0.07], [2, 'sine', 0.035]] as const) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(n.f * mult, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(amp, st + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, st + n.d);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(st);
        osc.stop(st + n.d + 0.02);
      }
    }
  }

  /** Realistic acoustic hand-clap helper (layered micro-staggered 1.3kHz filtered bursts) */
  private triggerHandClap(ctx: AudioContext, t0: number, gainScale: number = 1) {
    for (const off of [0, 0.009, 0.019]) {
      this.noiseSlice(
        ctx,
        this.whiteBuf,
        t0 + off,
        off < 0.015 ? 0.032 : 0.085,
        'bandpass',
        1350,
        980,
        2.1,
        0.095 * gainScale,
        0.002,
      );
    }
  }

  /**
   * Builds a single seamless, stutter-free 1.28s PCM AudioBuffer of a warm human voice
   * casually saying "Siiix... Se-ven" using a soft Rosenberg glottal flow model +
   * continuous 4-formant Klatt cascade vocal tract (wide flesh-damped bandwidths,
   * smooth cosine coarticulation, zero sawtooth buzz, zero choppy amplitude cuts).
   */
  private getSixSevenBuffer(ctx: AudioContext): AudioBuffer {
    if (this.sixSevenBuf && this.sixSevenBuf.sampleRate === ctx.sampleRate) {
      return this.sixSevenBuf;
    }
    const sr = ctx.sampleRate;
    const dur = 1.28;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);

    // Keyframes: [timeSec, f0Hz, voiceAmp, F1, B1, F2, B2, F3, B3, fricAmp, fricFreq]
    const KF: [number, number, number, number, number, number, number, number, number, number, number][] = [
      // Gentle alveolar "Sss-" onset
      [0.00, 146, 0.00, 380, 110, 1920, 140, 2560, 190, 0.00, 5100],
      [0.04, 148, 0.05, 395, 100, 1930, 135, 2560, 185, 0.22, 5200],
      // Smooth crossfade into warm "/ɪ/" vowel ("-iii-")
      [0.09, 154, 0.88, 415,  90, 1940, 125, 2550, 175, 0.03, 5000],
      [0.21, 166, 0.94, 420,  88, 1910, 125, 2530, 175, 0.00, 4800],
      [0.31, 158, 0.82, 395,  95, 1980, 130, 2460, 180, 0.00, 4800],
      // Smooth velar-alveolar "-ks-" legato bridge into "se-" (zero dead-air chop!)
      [0.38, 154, 0.16, 330, 120, 2040, 150, 2420, 200, 0.08, 3600],
      [0.44, 160, 0.06, 360, 120, 1900, 150, 2500, 200, 0.24, 5400],
      [0.51, 172, 0.14, 460, 110, 1820, 140, 2500, 190, 0.22, 5100],
      // Upbeat accented "Se-" ("/ɛ/")
      [0.57, 186, 0.96, 555,  92, 1760, 128, 2480, 178, 0.02, 4800],
      [0.68, 194, 0.95, 560,  92, 1730, 128, 2470, 178, 0.00, 4500],
      [0.75, 180, 0.84, 485, 100, 1560, 135, 2410, 185, 0.00, 3400],
      // Continuous voiced "-v-" glide (keeps warm vocal cord vibration — zero stutter dip!)
      [0.82, 168, 0.66, 365, 115, 1330, 145, 2330, 195, 0.05, 2900],
      // Relaxed "-en" ("/ə/" -> warm alveolar nasal "/n/")
      [0.90, 158, 0.86, 480,  95, 1470, 130, 2410, 180, 0.00, 2900],
      [1.01, 144, 0.76, 325, 105, 1410, 155, 2360, 200, 0.00, 2800],
      [1.14, 133, 0.45, 295, 115, 1380, 170, 2340, 210, 0.00, 2800],
      [1.27, 126, 0.00, 285, 125, 1370, 180, 2330, 220, 0.00, 2800],
    ];

    const interp = (t: number) => {
      if (t <= KF[0][0]) return KF[0];
      if (t >= KF[KF.length - 1][0]) return KF[KF.length - 1];
      let k = 0;
      while (k < KF.length - 2 && t > KF[k + 1][0]) k++;
      const a = KF[k], b = KF[k + 1];
      const u = (t - a[0]) / Math.max(0.0001, b[0] - a[0]);
      // Smooth raised-cosine S-curve coarticulation (zero robotic linear corners!)
      const s = 0.5 - 0.5 * Math.cos(Math.PI * u);
      const res = new Array<number>(11);
      for (let j = 0; j < 11; j++) res[j] = a[j] + (b[j] - a[j]) * s;
      return res;
    };

    // Cascade Klatt 2-pole resonator states (R1..R4) + fricative bandpass state
    let y1_1 = 0, y1_2 = 0;
    let y2_1 = 0, y2_2 = 0;
    let y3_1 = 0, y3_2 = 0;
    let y4_1 = 0, y4_2 = 0;
    let yf_1 = 0, yf_2 = 0;
    let glotLp = 0;
    let prevTract = 0;
    let phase = 0;
    let rng = 2463534242;
    const nextNoise = () => {
      rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5;
      return ((rng >>> 0) / 4294967295) * 2 - 1;
    };

    // Resonator coefficients updated smoothly every 24 samples (~0.5ms)
    let a1 = 0, b1 = 0, c1 = 0;
    let a2 = 0, b2 = 0, c2 = 0;
    let a3 = 0, b3 = 0, c3 = 0;
    let a4 = 0, b4 = 0, c4 = 0;
    let af = 0, bf = 0, cf = 0;
    let f0 = 150, vAmp = 0, frAmp = 0;

    const calcRes = (freq: number, bw: number): [number, number, number] => {
      const r = Math.exp((-Math.PI * bw) / sr);
      const c = -r * r;
      const b = 2 * r * Math.cos((2 * Math.PI * Math.min(sr * 0.44, freq)) / sr);
      return [1 - b - c, b, c];
    };

    // Fixed natural 4th formant for warm adult vocal tract length (~17cm -> F4 = 3350 Hz, B4 = 260 Hz)
    [a4, b4, c4] = calcRes(3350, 260);
    const glotTiltAlpha = Math.exp((-2 * Math.PI * 1350) / sr);

    for (let i = 0; i < len; i++) {
      if ((i & 15) === 0) {
        const t = i / sr;
        const p = interp(t);
        // Subtle organic human micro-flutter (non-periodic, < 0.7% — sounds alive, never vibrato-robotic)
        const drift = 1 + 0.0045 * Math.sin(t * 11.3) + 0.003 * Math.sin(t * 23.7 + 1.1);
        f0 = p[1] * drift;
        vAmp = p[2];
        [a1, b1, c1] = calcRes(p[3], p[4]);
        [a2, b2, c2] = calcRes(p[5], p[6]);
        [a3, b3, c3] = calcRes(p[7], p[8]);
        frAmp = p[9];
        [af, bf, cf] = calcRes(p[10], 950);
      }

      // Soft Rosenberg glottal pulse (open quotient Oq = 0.62, rounded closing — zero sawtooth buzz!)
      phase += f0 / sr;
      if (phase >= 1) phase -= 1;
      const oq = 0.62;
      let glot = 0;
      if (phase < oq) {
        const u = phase / oq;
        glot = Math.sin(Math.PI * u) * (1 - 0.28 * u);
      } else {
        const u = (phase - oq) / (1 - oq);
        glot = -0.38 * Math.sin(Math.PI * u);
      }
      // Natural phase-locked glottal breathiness + warm vocal-fold spectral tilt
      const n = nextNoise();
      const openMask = phase < oq ? 0.055 : 0.015;
      const rawGlot = (glot + n * openMask) * vAmp;
      glotLp = (1 - glotTiltAlpha) * rawGlot + glotTiltAlpha * glotLp;

      // Cascade 4-formant vocal tract: Pharynx (F1) -> Tongue Body (F2) -> Blade (F3) -> Oral (F4)
      const r1 = a1 * glotLp + b1 * y1_1 + c1 * y1_2; y1_2 = y1_1; y1_1 = r1;
      const r2 = a2 * r1     + b2 * y2_1 + c2 * y2_2; y2_2 = y2_1; y2_1 = r2;
      const r3 = a3 * r2     + b3 * y3_1 + c3 * y3_2; y3_2 = y3_1; y3_1 = r3;
      const r4 = a4 * r3     + b4 * y4_1 + c4 * y4_2; y4_2 = y4_1; y4_1 = r4;

      // Acoustic lip-radiation high-frequency lift + warm chest body
      const voiced = (r4 - 0.82 * prevTract) * 2.1 + glotLp * 0.28;
      prevTract = r4;

      // Soft wide-band oral fricative ("/s/", "/v/") shaped at the lips
      const frIn = (n - 0.65 * yf_1) * frAmp;
      const rf = af * frIn + bf * yf_1 + cf * yf_2; yf_2 = yf_1; yf_1 = rf;

      out[i] = voiced + rf * 0.55;
    }

    // Add subtle 19ms + 33ms outdoor early reflections + normalize cleanly to 0.78 peak
    const delay1 = Math.floor(sr * 0.019);
    const delay2 = Math.floor(sr * 0.033);
    let peak = 0.001;
    for (let i = len - 1; i >= 0; i--) {
      let s = out[i];
      if (i >= delay1) s += out[i - delay1] * 0.14;
      if (i >= delay2) s += out[i - delay2] * 0.07;
      out[i] = s;
      const a = Math.abs(s);
      if (a > peak) peak = a;
    }
    const norm = 0.78 / peak;
    for (let i = 0; i < len; i++) out[i] = Math.tanh(out[i] * norm * 1.15) * 0.78;

    this.sixSevenBuf = buf;
    return buf;
  }

  /** Plays the seamless human-voiced "Six... Se-ven" phrase with anti-overlap protection (zero stutter!). */
  public playEmote67() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Smoothly fade out any previous overlapping 67 voice in 25ms so rapid presses NEVER stutter!
    if (this.active67Gain) {
      try {
        this.active67Gain.gain.cancelScheduledValues(now);
        this.active67Gain.gain.setValueAtTime(Math.max(0.0001, this.active67Gain.gain.value), now);
        this.active67Gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);
      } catch { /* ignore */ }
      this.active67Gain = null;
    }

    const src = ctx.createBufferSource();
    src.buffer = this.getSixSevenBuffer(ctx);
    // Tiny ±2% natural pitch variation per emote trigger so repeated presses feel human and alive!
    src.playbackRate.setValueAtTime(0.99 + Math.random() * 0.03, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.88, now);
    src.connect(g);
    g.connect(ctx.destination);
    this.active67Gain = g;
    src.onended = () => {
      if (this.active67Gain === g) this.active67Gain = null;
    };
    src.start(now);
  }

  /**
   * Realistic firework mortar launch:
   * 1) Hollow bamboo mortar thump ("THOOMP")
   * 2) Turbulent black-powder propellant whoosh-hiss
   * 3) Aerodynamic ascending shell whistle with subtle flutter
   */
  public playFireworkLaunch(pitchScale: number = 1) {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const sat = this.makeSaturator(ctx);
    sat.connect(ctx.destination);

    // 1) Deep hollow mortar tube thump
    const thump = ctx.createOscillator();
    const tg = ctx.createGain();
    thump.type = 'sine';
    thump.frequency.setValueAtTime(148 * pitchScale, t0);
    thump.frequency.exponentialRampToValueAtTime(42, t0 + 0.11);
    tg.gain.setValueAtTime(0.18, t0);
    tg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
    thump.connect(tg);
    tg.connect(sat);
    thump.start(t0);
    thump.stop(t0 + 0.13);

    // Bamboo tube bore knock
    this.noiseSlice(ctx, this.pinkBuf, t0, 0.045, 'bandpass', 320 * pitchScale, 190, 3.8, 0.12, 0.003, sat);

    // 2) Rising black-powder propellant whoosh & tail hiss
    this.noiseSlice(
      ctx,
      this.pinkBuf,
      t0 + 0.015,
      0.48,
      'bandpass',
      480 * pitchScale,
      2350 * pitchScale,
      1.5,
      0.11,
      0.045,
    );

    // 3) Realistic aerodynamic air whistle (breath-filtered sine + slight pitch curve)
    const whistle = ctx.createOscillator();
    const wg = ctx.createGain();
    whistle.type = 'sine';
    whistle.frequency.setValueAtTime(590 * pitchScale, t0 + 0.02);
    whistle.frequency.exponentialRampToValueAtTime(1920 * pitchScale, t0 + 0.40);
    whistle.frequency.exponentialRampToValueAtTime(1680 * pitchScale, t0 + 0.48);
    wg.gain.setValueAtTime(0.0001, t0 + 0.02);
    wg.gain.linearRampToValueAtTime(0.036, t0 + 0.09);
    wg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.48);
    whistle.connect(wg);
    wg.connect(ctx.destination);
    whistle.start(t0 + 0.02);
    whistle.stop(t0 + 0.49);
  }

  /**
   * Realistic outdoor sky-shell detonation:
   * 1) High-pressure flash crack transient
   * 2) Chest-thumping sub-bass boom + brown-noise thunder body
   * 3) Multi-tap outdoor valley echoes rolling across the horizon
   * 4) Real sizzling magnesium/titanium star crackles
   */
  public playFireworkBurst(pitchScale: number = 1) {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const sat = this.makeSaturator(ctx);
    sat.connect(ctx.destination);

    // 1) Sharp initial shell casing snap/crack
    this.noiseSlice(ctx, this.whiteBuf, t0, 0.032, 'highpass', 1450 * pitchScale, 900, 0.9, 0.22, 0.001, sat);

    // 2) Deep sub-bass concussion + thunderous brown-noise body
    const sub = ctx.createOscillator();
    const sg = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(108 * pitchScale, t0);
    sub.frequency.exponentialRampToValueAtTime(28, t0 + 0.34);
    sg.gain.setValueAtTime(0.26, t0);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
    sub.connect(sg);
    sg.connect(sat);
    sub.start(t0);
    sub.stop(t0 + 0.40);

    this.noiseSlice(ctx, this.brownBuf, t0, 0.58, 'lowpass', 240 * pitchScale, 68, 0.9, 0.28, 0.006, sat);
    this.noiseSlice(ctx, this.pinkBuf, t0 + 0.008, 0.34, 'bandpass', 520 * pitchScale, 160, 0.8, 0.15, 0.01, sat);

    // 3) Outdoor Kalimantan valley slapback echoes (+155ms & +330ms low-passed distance reflections)
    this.noiseSlice(ctx, this.brownBuf, t0 + 0.155, 0.52, 'lowpass', 360, 95, 0.7, 0.12, 0.03);
    this.noiseSlice(ctx, this.brownBuf, t0 + 0.330, 0.62, 'lowpass', 220, 70, 0.7, 0.07, 0.05);

    // 4) Sparkling titanium/kamuro star crackle shower
    this.noiseSlice(
      ctx,
      this.crackleBuf,
      t0 + 0.07,
      0.92,
      'bandpass',
      2900 * pitchScale,
      1850,
      1.3,
      0.16,
      0.06,
    );
  }

  /** Grand 'SMPN 7 MATARAM' sky-writing multi-salute detonation + long shimmering crackle cascade! */
  public playFireworkTextFinale() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    // Triple-salute cascade left -> center -> right as 'SMPN 7 MATARAM' ignites across the sky!
    [0, 0.08, 0.16].forEach((delay, idx) => {
      const pitch = [0.95, 1.06, 1.0][idx];
      setTimeout(() => {
        if (!this.muted) this.playFireworkBurst(pitch);
      }, Math.round(delay * 1000));
    });

    // Extended high-altitude golden kamuro shimmer & crackling star rain (1.85s)
    this.noiseSlice(ctx, this.crackleBuf, t0 + 0.26, 1.75, 'highpass', 2100, 1400, 0.8, 0.19, 0.14);
    this.noiseSlice(ctx, this.pinkBuf, t0 + 0.22, 1.35, 'bandpass', 4200, 1900, 1.1, 0.065, 0.12);
    this.noiseSlice(ctx, this.brownBuf, t0 + 0.25, 1.25, 'lowpass', 190, 55, 0.7, 0.15, 0.08);
  }

  /** Friendly Kalimantan wave & cheer: sleeve rustle, real hand-claps & warm bamboo angklung chord */
  public playEmoteCheer(waveOnly: boolean = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;

    // Soft cloth/breeze whoosh as Wira raises arm(s)
    this.noiseSlice(ctx, this.pinkBuf, t0, 0.14, 'bandpass', 900, 1600, 1.2, 0.045, 0.02);

    if (!waveOnly) {
      this.triggerHandClap(ctx, t0 + 0.06, 0.85);
      this.triggerHandClap(ctx, t0 + 0.22, 1.0);
    }

    const seq = waveOnly
      ? [{ f: 523.25, t: 0.02, d: 0.16 }, { f: 659.25, t: 0.13, d: 0.28 }]
      : [
          { f: 523.25, t: 0.00, d: 0.15 },
          { f: 659.25, t: 0.10, d: 0.15 },
          { f: 783.99, t: 0.20, d: 0.34 },
          { f: 1046.5, t: 0.22, d: 0.32 },
        ];
    for (const n of seq) {
      const st = t0 + n.t;
      const osc = ctx.createOscillator();
      const oct = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      oct.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, st);
      oct.frequency.setValueAtTime(n.f * 2, st);
      g.gain.setValueAtTime(0.0001, st);
      g.gain.linearRampToValueAtTime(0.085, st + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, st + n.d);
      osc.connect(g);
      oct.connect(g);
      g.connect(ctx.destination);
      osc.start(st);
      oct.start(st);
      osc.stop(st + n.d + 0.01);
      oct.stop(st + n.d * 0.6);
    }
  }
}

export const soundEngine = new SoundEngine();
