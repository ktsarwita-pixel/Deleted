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
   * Expressive human vocal-tract formant synthesis saying "Siiiix... Se-ven!"
   * Uses a glottal harmonic source (sawtooth + chest sub + natural vibrato + breathiness)
   * sculpted through 3 parallel resonant vocal-tract formants (F1, F2, F3) plus real
   * alveolar sibilants (/s/), velar plosive (/k/), labiodental buzz (/v/), and nasal murmur (/n/).
   */
  public playEmote67() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.01;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.95, t0);
    const sat = this.makeSaturator(ctx);
    master.connect(sat);
    sat.connect(ctx.destination);

    // Helper: crisp alveolar sibilant "/s/" or plosive "/k/" burst
    const sibilant = (start: number, dur: number, freq: number, q: number, peak: number) => {
      if (!this.whiteBuf) return;
      const src = ctx.createBufferSource();
      src.buffer = this.whiteBuf;
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.setValueAtTime(3200, start);
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(freq, start);
      bp.Q.setValueAtTime(q, start);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, start);
      g.gain.linearRampToValueAtTime(peak, start + Math.min(0.025, dur * 0.35));
      g.gain.setValueAtTime(peak * 0.85, start + dur * 0.72);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      src.connect(hp);
      hp.connect(bp);
      bp.connect(g);
      g.connect(master);
      src.start(start);
      src.stop(start + dur + 0.01);
    };

    // Helper: voiced vocal-fold phrase through parallel F1 / F2 / F3 vocal-tract formants
    const speakVoiced = (
      start: number,
      dur: number,
      pitchCurve: [number, number][],
      formants: { t: number; f1: number; f2: number; f3: number; g1: number; g2: number; g3: number }[],
      ampEnv: [number, number][]
    ) => {
      // Glottal source: sawtooth + warm fundamental sine + natural 5.6 Hz human vibrato + breath aspiration
      const glot = ctx.createOscillator();
      const chest = ctx.createOscillator();
      const vib = ctx.createOscillator();
      const vibGain = ctx.createGain();
      glot.type = 'sawtooth';
      chest.type = 'sine';
      vib.type = 'sine';
      vib.frequency.setValueAtTime(5.6, start);
      vibGain.gain.setValueAtTime(3.2, start);
      vib.connect(vibGain);
      vibGain.connect(glot.frequency);
      vibGain.connect(chest.frequency);

      for (const [relT, hz] of pitchCurve) {
        const at = start + relT;
        if (relT === 0) {
          glot.frequency.setValueAtTime(hz, at);
          chest.frequency.setValueAtTime(hz, at);
        } else {
          glot.frequency.linearRampToValueAtTime(hz, at);
          chest.frequency.linearRampToValueAtTime(hz, at);
        }
      }

      // Spectral tilt filter mimicking real human vocal folds (-12 dB/oct above 900 Hz)
      const tilt = ctx.createBiquadFilter();
      tilt.type = 'lowpass';
      tilt.frequency.setValueAtTime(3400, start);
      tilt.Q.setValueAtTime(0.5, start);

      const srcMix = ctx.createGain();
      srcMix.gain.setValueAtTime(1.0, start);
      const chestGain = ctx.createGain();
      chestGain.gain.setValueAtTime(0.16, start);

      glot.connect(tilt);
      tilt.connect(srcMix);

      // Subtle vocal breathiness mixed into the formant tract
      let breathSrc: AudioBufferSourceNode | null = null;
      if (this.pinkBuf) {
        breathSrc = ctx.createBufferSource();
        breathSrc.buffer = this.pinkBuf;
        const bg = ctx.createGain();
        bg.gain.setValueAtTime(0.055, start);
        breathSrc.connect(bg);
        bg.connect(srcMix);
      }

      // 3 parallel bandpass formant resonators (F1 pharyngeal, F2 oral tongue, F3 lip/tip)
      const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), f3 = ctx.createBiquadFilter();
      const g1 = ctx.createGain(), g2 = ctx.createGain(), g3 = ctx.createGain();
      f1.type = 'bandpass'; f1.Q.setValueAtTime(5.2, start);
      f2.type = 'bandpass'; f2.Q.setValueAtTime(7.8, start);
      f3.type = 'bandpass'; f3.Q.setValueAtTime(9.0, start);

      for (let i = 0; i < formants.length; i++) {
        const kf = formants[i];
        const at = start + kf.t;
        if (i === 0) {
          f1.frequency.setValueAtTime(kf.f1, at); g1.gain.setValueAtTime(kf.g1, at);
          f2.frequency.setValueAtTime(kf.f2, at); g2.gain.setValueAtTime(kf.g2, at);
          f3.frequency.setValueAtTime(kf.f3, at); g3.gain.setValueAtTime(kf.g3, at);
        } else {
          f1.frequency.linearRampToValueAtTime(kf.f1, at); g1.gain.linearRampToValueAtTime(kf.g1, at);
          f2.frequency.linearRampToValueAtTime(kf.f2, at); g2.gain.linearRampToValueAtTime(kf.g2, at);
          f3.frequency.linearRampToValueAtTime(kf.f3, at); g3.gain.linearRampToValueAtTime(kf.g3, at);
        }
      }

      const vca = ctx.createGain();
      for (let i = 0; i < ampEnv.length; i++) {
        const [relT, amp] = ampEnv[i];
        const at = start + relT;
        if (i === 0) vca.gain.setValueAtTime(Math.max(0.0001, amp), at);
        else vca.gain.linearRampToValueAtTime(Math.max(0.0001, amp), at);
      }

      srcMix.connect(f1); f1.connect(g1); g1.connect(vca);
      srcMix.connect(f2); f2.connect(g2); g2.connect(vca);
      srcMix.connect(f3); f3.connect(g3); g3.connect(vca);
      chest.connect(chestGain); chestGain.connect(vca);
      vca.connect(master);

      glot.start(start); chest.start(start); vib.start(start);
      breathSrc?.start(start);
      const end = start + dur + 0.02;
      glot.stop(end); chest.stop(end); vib.stop(end);
      breathSrc?.stop(end);
    };

    // ==================== WORD 1: "S-I-X" (t = 0.00s .. 0.48s) ====================
    // 1a) Initial "/s/" ("Sss-")
    sibilant(t0 + 0.00, 0.085, 6300, 3.6, 0.14);

    // 1b) Drawn-out "/ɪ/" vowel ("-iiih-") with warm rising inflection
    speakVoiced(
      t0 + 0.065,
      0.29,
      [
        [0.00, 156],
        [0.08, 174],
        [0.22, 182],
        [0.29, 168],
      ],
      [
        { t: 0.00, f1: 395, f2: 1990, f3: 2580, g1: 0.42, g2: 0.30, g3: 0.14 },
        { t: 0.22, f1: 410, f2: 1950, f3: 2550, g1: 0.42, g2: 0.28, g3: 0.14 },
        // Velar coarticulation pinch into "/k/"
        { t: 0.29, f1: 310, f2: 2120, f3: 2420, g1: 0.24, g2: 0.22, g3: 0.10 },
      ],
      [
        [0.00, 0.001],
        [0.03, 0.55],
        [0.23, 0.52],
        [0.29, 0.001],
      ]
    );

    // 1c) Short "/k/" stop gap (0.355..0.38s) -> "/k/" plosive click + "/s/" coda ("-ks")
    this.noiseSlice(ctx, this.whiteBuf, t0 + 0.38, 0.022, 'bandpass', 2200, 1800, 2.2, 0.11, 0.002);
    sibilant(t0 + 0.395, 0.095, 6500, 3.8, 0.13);

    // ==================== WORD 2: "S-E-V-E-N" (t = 0.56s .. 1.28s) ====================
    // 2a) Initial "/s/" ("Sss-")
    sibilant(t0 + 0.56, 0.085, 6100, 3.5, 0.14);

    // 2b) Continuous two-syllable voiced contour: "/ɛ/" ("SE-") -> "/v/" buzz -> "/ə/" -> "/n/" ("-VEN")
    speakVoiced(
      t0 + 0.625,
      0.64,
      [
        [0.00, 206], // higher iconic accent on "SE-"!
        [0.10, 224],
        [0.24, 204],
        [0.31, 178], // step down across "-v-"
        [0.44, 162], // "-ven"
        [0.64, 138], // natural relaxed vocal fall
      ],
      [
        // "/ɛ/" ("eh")
        { t: 0.00, f1: 575, f2: 1810, f3: 2510, g1: 0.44, g2: 0.30, g3: 0.14 },
        { t: 0.21, f1: 560, f2: 1760, f3: 2480, g1: 0.44, g2: 0.28, g3: 0.13 },
        // "/v/" labiodental constriction
        { t: 0.28, f1: 330, f2: 1260, f3: 2280, g1: 0.25, g2: 0.12, g3: 0.06 },
        // "/ə/" ("uh")
        { t: 0.36, f1: 495, f2: 1490, f3: 2420, g1: 0.38, g2: 0.24, g3: 0.11 },
        // "/n/" resonant alveolar nasal closure ("-nnn")
        { t: 0.47, f1: 285, f2: 1420, f3: 2350, g1: 0.40, g2: 0.09, g3: 0.05 },
        { t: 0.64, f1: 270, f2: 1390, f3: 2320, g1: 0.32, g2: 0.06, g3: 0.04 },
      ],
      [
        [0.00, 0.001],
        [0.03, 0.60], // strong "SE-"
        [0.21, 0.54],
        [0.28, 0.24], // dip during voiced "/v/"
        [0.36, 0.48], // "-VE-"
        [0.50, 0.38], // "-N" sustain
        [0.64, 0.001],
      ]
    );
    // Soft labiodental "/v/" friction buzz right at the syllable bridge (t = 0.88s)
    this.noiseSlice(ctx, this.pinkBuf, t0 + 0.875, 0.065, 'bandpass', 2600, 2100, 2.0, 0.05, 0.01);

    // Subtle soft hand-weighing taps underneath so Wira's palms still feel physical
    this.triggerHandClap(ctx, t0 + 0.07, 0.28);
    this.triggerHandClap(ctx, t0 + 0.63, 0.32);
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
