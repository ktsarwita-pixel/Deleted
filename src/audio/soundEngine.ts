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
   * Builds a crystal-clear, studio-articulated 1.24s PCM AudioBuffer of a human voice
   * saying "Six... Se-ven" (/s ɪ k s ... s ɛ v ə n/) using a Fant LF glottal flow derivative
   * (with organic cycle-to-cycle jitter & shimmer), Klatt (1980) alternating-sign parallel
   * formant tract (exact unity-peak-calibrated F1..F4 + 270 Hz nasal murmur pole),
   * velar-pinch + /k/ release burst + dual-band alveolar /s/ + glottal-pulsed /v/ friction.
   */
  private getSixSevenBuffer(ctx: AudioContext): AudioBuffer {
    if (this.sixSevenBuf && this.sixSevenBuf.sampleRate === ctx.sampleRate) {
      return this.sixSevenBuf;
    }
    const sr = ctx.sampleRate;
    const dur = 1.24;
    const len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);

    // [t, f0, vAmp, oq, F1, B1, A1, F2, B2, A2, F3, B3, A3, nasalAmp, sAmp, kAmp, vFricAmp, aspAmp]
    const KF: number[][] = [
      // Word 1: "SIX" (/s ɪ k s/) — crisp alveolar "/s/" onset
      [0.000, 148, 0.00, 0.58, 400,  90, 1.00, 1980, 115, 0.62, 2630, 160, 0.42, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.020, 148, 0.00, 0.58, 400,  90, 1.00, 1990, 115, 0.62, 2630, 160, 0.42, 0.00, 0.48, 0.00, 0.00, 0.00],
      [0.078, 150, 0.00, 0.58, 405,  88, 1.00, 2000, 110, 0.65, 2640, 155, 0.44, 0.00, 0.42, 0.00, 0.00, 0.16],
      // Bright, unmistakable front-high lax "/ɪ/" ("-IH-")
      [0.100, 155, 0.95, 0.53, 410,  78, 1.00, 2010, 105, 0.70, 2650, 148, 0.46, 0.00, 0.02, 0.00, 0.00, 0.05],
      [0.182, 168, 1.00, 0.51, 415,  76, 1.00, 1995, 102, 0.70, 2635, 145, 0.46, 0.00, 0.00, 0.00, 0.00, 0.00],
      // Classic Klatt velar pinch into "/k/" (F2 rises to 2270 Hz, F3 drops to 2360 Hz)
      [0.246, 160, 0.86, 0.54, 340,  88, 0.90, 2250, 115, 0.74, 2370, 155, 0.48, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.274, 156, 0.03, 0.60, 290, 110, 0.50, 2290, 130, 0.40, 2340, 170, 0.25, 0.00, 0.00, 0.00, 0.00, 0.00],
      // Clean 30ms "/k/" oral stop closure
      [0.304, 154, 0.00, 0.60, 300, 110, 0.50, 2300, 140, 0.40, 2350, 180, 0.25, 0.00, 0.00, 0.00, 0.00, 0.00],
      // Crisp "/k/" velar plosive release burst -> immediate "/s/" coda ("-ks")
      [0.313, 154, 0.00, 0.60, 340, 110, 0.50, 2260, 140, 0.50, 2460, 180, 0.30, 0.00, 0.08, 0.65, 0.00, 0.20],
      [0.330, 154, 0.00, 0.60, 360, 110, 0.50, 2050, 140, 0.50, 2580, 180, 0.30, 0.00, 0.52, 0.04, 0.00, 0.05],
      [0.404, 154, 0.00, 0.60, 380, 110, 0.50, 1920, 140, 0.50, 2600, 180, 0.30, 0.00, 0.42, 0.00, 0.00, 0.00],
      // Clean 50ms inter-word breath boundary so "Six" and "Seven" are two distinct words
      [0.436, 160, 0.00, 0.60, 420, 110, 0.50, 1850, 140, 0.50, 2560, 180, 0.30, 0.00, 0.01, 0.00, 0.00, 0.00],
      [0.484, 166, 0.00, 0.60, 460, 110, 0.60, 1820, 130, 0.55, 2550, 175, 0.34, 0.00, 0.02, 0.00, 0.00, 0.00],
      // Word 2: "SEVEN" (/s ɛ v ə n/) — crisp "/s/" onset + natural aspiration
      [0.508, 170, 0.00, 0.58, 510, 100, 0.80, 1810, 120, 0.62, 2540, 165, 0.40, 0.00, 0.54, 0.00, 0.00, 0.00],
      [0.562, 174, 0.00, 0.56, 555,  92, 0.90, 1805, 115, 0.68, 2540, 160, 0.44, 0.00, 0.42, 0.00, 0.00, 0.18],
      // Expressive, wide-open stressed "/ɛ/" ("SEH-") with playful upward pitch scoop
      [0.588, 184, 0.98, 0.50, 590,  80, 1.05, 1805, 102, 0.80, 2540, 148, 0.50, 0.00, 0.02, 0.00, 0.00, 0.04],
      [0.672, 202, 1.00, 0.49, 600,  78, 1.05, 1785, 100, 0.80, 2530, 146, 0.50, 0.00, 0.00, 0.00, 0.00, 0.00],
      [0.742, 182, 0.88, 0.53, 515,  88, 0.96, 1560, 112, 0.66, 2440, 158, 0.40, 0.00, 0.00, 0.00, 0.06, 0.00],
      // Crisp voiced labiodental "/v/" (labial F1/F2 dip + glottal-modulated lip friction)
      [0.798, 168, 0.54, 0.60, 325, 105, 0.74, 1230, 130, 0.46, 2340, 175, 0.28, 0.00, 0.00, 0.00, 0.52, 0.00],
      // Clear unstressed "/ə/" -> alveolar tongue-tip transition into nasal "/n/" ("-vuhn")
      [0.858, 158, 0.90, 0.53, 500,  84, 0.96, 1475, 108, 0.66, 2460, 155, 0.40, 0.04, 0.00, 0.00, 0.02, 0.00],
      [0.938, 146, 0.84, 0.56, 430,  92, 0.84, 1615, 118, 0.58, 2490, 165, 0.36, 0.24, 0.00, 0.00, 0.00, 0.00],
      [1.008, 138, 0.74, 0.60, 285,  95, 0.38, 1640, 155, 0.32, 2460, 190, 0.20, 0.74, 0.00, 0.00, 0.00, 0.00],
      [1.125, 131, 0.46, 0.63, 275, 105, 0.30, 1600, 175, 0.22, 2440, 205, 0.15, 0.66, 0.00, 0.00, 0.00, 0.00],
      [1.235, 126, 0.00, 0.66, 270, 120, 0.25, 1580, 195, 0.16, 2420, 215, 0.10, 0.00, 0.00, 0.00, 0.00, 0.00],
    ];

    const nCols = KF[0].length;
    const cur = new Float64Array(nCols);
    const interp = (t: number) => {
      if (t <= KF[0][0]) {
        for (let j = 0; j < nCols; j++) cur[j] = KF[0][j];
        return;
      }
      if (t >= KF[KF.length - 1][0]) {
        const last = KF[KF.length - 1];
        for (let j = 0; j < nCols; j++) cur[j] = last[j];
        return;
      }
      let k = 0;
      while (k < KF.length - 2 && t > KF[k + 1][0]) k++;
      const a = KF[k], b = KF[k + 1];
      const u = (t - a[0]) / Math.max(0.00001, b[0] - a[0]);
      const s = 0.5 - 0.5 * Math.cos(Math.PI * u);
      for (let j = 0; j < nCols; j++) cur[j] = a[j] + (b[j] - a[j]) * s;
    };

    // Exact unity-peak-normalized 2-pole resonator (0 dB gain at center frequency)
    const calcBp = (freq: number, bw: number): [number, number, number] => {
      const w0 = (2 * Math.PI * Math.min(sr * 0.45, freq)) / sr;
      const r = Math.exp((-Math.PI * bw) / sr);
      const c = -r * r;
      const b = 2 * r * Math.cos(w0);
      const re = 1 - b * Math.cos(w0) - c * Math.cos(2 * w0);
      const im = b * Math.sin(w0) + c * Math.sin(2 * w0);
      return [Math.hypot(re, im), b, c];
    };

    let y1_1 = 0, y1_2 = 0, y2_1 = 0, y2_2 = 0, y3_1 = 0, y3_2 = 0, y4_1 = 0, y4_2 = 0, yn_1 = 0, yn_2 = 0;
    let ys1_1 = 0, ys1_2 = 0, ys2_1 = 0, ys2_2 = 0, yk1_1 = 0, yk1_2 = 0, yk2_1 = 0, yk2_2 = 0, yv_1 = 0, yv_2 = 0;
    let prevN = 0, prevSrc = 0, hpX1 = 0, hpY1 = 0;

    const [a4, b4, c4] = calcBp(3420, 220);
    const [an, bn, cn] = calcBp(270, 95);
    const [as1, bs1, cs1] = calcBp(5650, 950);
    const [as2, bs2, cs2] = calcBp(7650, 1300);
    const [ak1, bk1, ck1] = calcBp(2320, 420);
    const [ak2, bk2, ck2] = calcBp(4200, 900);
    const [av, bv, cv] = calcBp(3750, 1100);

    let a1 = 0, b1 = 0, c1 = 0, A1 = 1;
    let a2 = 0, b2 = 0, c2 = 0, A2 = 0.6;
    let a3 = 0, b3 = 0, c3 = 0, A3 = 0.4;
    let f0 = 150, vAmp = 0, oq = 0.55;
    let nasalAmp = 0, sAmp = 0, kAmp = 0, vFricAmp = 0, aspAmp = 0;

    let phase = 0, jitter = 1, shimmer = 1;
    let rng = 2463534242;
    const nextNoise = () => {
      rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5;
      return ((rng >>> 0) / 4294967295) * 2 - 1;
    };
    const diffScale = sr / 6200;

    for (let i = 0; i < len; i++) {
      if ((i & 15) === 0) {
        const t = i / sr;
        interp(t);
        const drift = 1 + 0.0032 * Math.sin(t * 10.7) + 0.0022 * Math.sin(t * 21.3 + 0.9);
        f0 = cur[1] * drift * jitter;
        vAmp = cur[2] * shimmer;
        oq = cur[3];
        [a1, b1, c1] = calcBp(cur[4], cur[5]); A1 = cur[6];
        [a2, b2, c2] = calcBp(cur[7], cur[8]); A2 = cur[9];
        [a3, b3, c3] = calcBp(cur[10], cur[11]); A3 = cur[12];
        nasalAmp = cur[13]; sAmp = cur[14]; kAmp = cur[15]; vFricAmp = cur[16]; aspAmp = cur[17];
      }

      phase += f0 / sr;
      if (phase >= 1) {
        phase -= 1;
        jitter = 1 + nextNoise() * 0.0028;
        shimmer = 1 + nextNoise() * 0.018;
      }

      // Fant LF glottal flow derivative e_LF(t) with smooth return phase Ta = 0.028
      const tp = oq * 0.74;
      const te = oq;
      let glot: number;
      if (phase < tp) {
        glot = 0.62 * Math.sin(Math.PI * (phase / tp));
      } else if (phase < te) {
        glot = -Math.sin(Math.PI * 0.5 * ((phase - tp) / (te - tp)));
      } else {
        glot = -Math.exp(-(phase - te) / 0.028);
      }
      glot += 0.038;

      const n = nextNoise();
      const hpN = n - 0.86 * prevN;
      prevN = n;

      const openEnv = phase < te ? 1.0 : 0.22;
      const src = glot * vAmp + n * (aspAmp * 0.20 + vAmp * 0.022 * openEnv);
      const srcHi = (src - prevSrc) * diffScale;
      prevSrc = src;

      // Klatt (1980) alternating-sign parallel vocal tract (+R1 - R2 + R3 - R4) + nasal murmur
      const r1 = a1 * src   + b1 * y1_1 + c1 * y1_2; y1_2 = y1_1; y1_1 = r1;
      const r2 = a2 * srcHi + b2 * y2_1 + c2 * y2_2; y2_2 = y2_1; y2_1 = r2;
      const r3 = a3 * srcHi + b3 * y3_1 + c3 * y3_2; y3_2 = y3_1; y3_1 = r3;
      const r4 = a4 * srcHi + b4 * y4_1 + c4 * y4_2; y4_2 = y4_1; y4_1 = r4;
      const rn = an * (src * nasalAmp) + bn * yn_1 + cn * yn_2; yn_2 = yn_1; yn_1 = rn;

      const voiced = A1 * r1 * 1.40
                   - A2 * r2 * 1.55
                   + A3 * r3 * 1.45
                   - 0.24 * r4 * 1.25
                   + rn * 0.52;

      // Crisp studio consonants: dual-band /s/, velar /k/ burst, glottal-pulsed labiodental /v/
      const rs1 = as1 * (hpN * sAmp) + bs1 * ys1_1 + cs1 * ys1_2; ys1_2 = ys1_1; ys1_1 = rs1;
      const rs2 = as2 * (hpN * sAmp) + bs2 * ys2_1 + cs2 * ys2_2; ys2_2 = ys2_1; ys2_1 = rs2;
      const rk1 = ak1 * (hpN * kAmp) + bk1 * yk1_1 + ck1 * yk1_2; yk1_2 = yk1_1; yk1_1 = rk1;
      const rk2 = ak2 * (hpN * kAmp) + bk2 * yk2_1 + ck2 * yk2_2; yk2_2 = yk2_1; yk2_1 = rk2;
      const rv  = av  * (hpN * vFricAmp * (0.40 + 0.60 * openEnv)) + bv * yv_1 + cv * yv_2; yv_2 = yv_1; yv_1 = rv;

      const consonants = (rs1 * 1.05 + rs2 * 0.78) + (rk1 * 1.80 + rk2 * 1.10) + rv * 0.90;

      // 85 Hz studio high-pass filter (strips low-end mud, keeps consonants dry & razor-sharp)
      const raw = voiced + consonants;
      const hpOut = 0.989 * (hpY1 + raw - hpX1);
      hpX1 = raw; hpY1 = hpOut;
      out[i] = hpOut;
    }

    // Broadcast-grade soft saturation & clean peak normalization (zero comb-filter echo!)
    let peak = 0.001;
    for (let i = 0; i < len; i++) {
      const a = Math.abs(out[i]);
      if (a > peak) peak = a;
    }
    const norm = 1.0 / peak;
    for (let i = 0; i < len; i++) {
      out[i] = Math.tanh(out[i] * norm * 1.38) * 0.90;
    }

    this.sixSevenBuf = buf;
    return buf;
  }

  /** Plays the crystal-clear human-voiced "Six... Se-ven" phrase with anti-overlap protection. */
  public playEmote67() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

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
    src.playbackRate.setValueAtTime(0.99 + Math.random() * 0.025, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.95, now);
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
