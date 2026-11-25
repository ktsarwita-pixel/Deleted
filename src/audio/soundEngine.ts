// 8-Bit Retro Chiptune Sound Engine using Web Audio API

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  private lastStepTime: number = 0;
  private lastHoverTime: number = 0;
  private splashBuf: AudioBuffer | null = null;
  private pourBuf: AudioBuffer | null = null;

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
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public playStep(hasBoots: boolean = false) {
    const now = performance.now();
    const interval = hasBoots ? 165 : 210;
    if (now - this.lastStepTime < interval) return;
    this.lastStepTime = now;

    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(hasBoots ? 155 : 120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.045);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }

  public playBlip(pitch: number = 440) {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    osc.frequency.setValueAtTime(pitch * 1.15, ctx.currentTime + 0.025);

    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.065);
  }

  private lastLatchTime: number = 0;

  public playDoorLatch(opening: boolean = true) {
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    if (now - this.lastLatchTime < 290) return;
    this.lastLatchTime = now;

    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    // 1) Crisp brass spring-latch click
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = 'square';
    click.frequency.setValueAtTime(opening ? 680 : 520, t0);
    click.frequency.exponentialRampToValueAtTime(opening ? 340 : 220, t0 + 0.028);
    clickGain.gain.setValueAtTime(0.032, t0);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.03);
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.start(t0);
    click.stop(t0 + 0.035);

    // 2) Warm oiled ulin timber swing resonance
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(opening ? 150 : 215, t0 + 0.015);
    osc.frequency.exponentialRampToValueAtTime(opening ? 255 : 118, t0 + 0.12);
    gain.gain.setValueAtTime(0.058, t0 + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0 + 0.015);
    osc.stop(t0 + 0.14);
  }

  public playDoorOpen() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    // Crisp brass latch unclick followed by warm timber swing
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, t0);
    osc.frequency.linearRampToValueAtTime(275, t0 + 0.14);
    osc.frequency.exponentialRampToValueAtTime(190, t0 + 0.22);

    gain.gain.setValueAtTime(0.12, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.25);
  }

  public playCutsceneAlert() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [330, 311, 293, 261];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const startTime = ctx.currentTime + idx * 0.14;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.11, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.13);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.14);
    });
  }

  public playCoinCollect() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.07); // E6

    gain.gain.setValueAtTime(0.11, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.29);
  }

  public playBuySuccess() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const t = ctx.currentTime + idx * 0.065;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  public playError() {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(170, ctx.currentTime);
    osc.frequency.setValueAtTime(125, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  }

  public playWaterFill() {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    if (!this.splashBuf) {
      const bufLen = Math.floor(ctx.sampleRate * 0.28);
      this.splashBuf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const ch = this.splashBuf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.09));
    }
    const splash = ctx.createBufferSource();
    splash.buffer = this.splashBuf;
    const lp = ctx.createBiquadFilter();
    lp.type = 'bandpass';
    lp.frequency.setValueAtTime(750, now + 0.15);
    lp.frequency.exponentialRampToValueAtTime(320, now + 0.38);
    lp.Q.value = 1.6;
    const sGain = ctx.createGain();
    sGain.gain.setValueAtTime(0.001, now);
    sGain.gain.setValueAtTime(0.24, now + 0.15);
    sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    splash.connect(lp); lp.connect(sGain); sGain.connect(ctx.destination);
    splash.start(now + 0.14); splash.stop(now + 0.43);

    // 2. Underwater "glug-glug-glug" air bubbles rising in pitch as bucket fills
    const glugs = [210, 275, 360, 470, 590];
    glugs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const t = now + 0.20 + idx * 0.075;
      osc.frequency.setValueAtTime(freq * 0.82, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.38, t + 0.065);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.075);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.08);
    });
  }

  public playWaterPour() {
    const ctx = this.getContext();
    if (!ctx) return;

    if (!this.pourBuf) {
      const bufferSize = Math.floor(ctx.sampleRate * 0.35);
      this.pourBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = this.pourBuf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = this.pourBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(2200, ctx.currentTime + 0.32);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.34);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.35);
  }

  /** Tiny throttled UI hover tick for extra responsive feel */
  public playHover() {
    const now = performance.now();
    if (now - this.lastHoverTime < 90) return;
    this.lastHoverTime = now;

    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(720, ctx.currentTime);
    osc.frequency.setValueAtTime(920, ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.035, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.045);
  }

  /** Rising 3-note arpeggio for 25% / 50% / 75% extinguishment milestones */
  public playMilestone() {
    const ctx = this.getContext();
    if (!ctx) return;

    const notes = [523.25, 659.25, 880.0];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const t = ctx.currentTime + idx * 0.09;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }

  public playVictoryFanfare() {
    const ctx = this.getContext();
    if (!ctx) return;

    const melody = [
      { f: 523.25, d: 0.12, t: 0 },
      { f: 659.25, d: 0.12, t: 0.13 },
      { f: 783.99, d: 0.12, t: 0.26 },
      { f: 1046.5, d: 0.28, t: 0.39 },
      { f: 783.99, d: 0.14, t: 0.7 },
      { f: 1046.5, d: 0.45, t: 0.86 },
    ];

    melody.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      const start = ctx.currentTime + n.t;
      osc.frequency.setValueAtTime(n.f, start);

      gain.gain.setValueAtTime(0.13, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + n.d);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + n.d + 0.02);
    });
  }

  public playEmote67() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    // Playful seesaw "SIX — SE-VEN!" arcade chiptune riff
    const notes = [
      { f: 392.0, d: 0.14, t: 0.00 }, // G4 ("SIX")
      { f: 587.3, d: 0.11, t: 0.19 }, // D5 ("SE-")
      { f: 659.3, d: 0.22, t: 0.32 }, // E5 ("-VEN!")
      { f: 523.3, d: 0.11, t: 0.62 }, // C5
      { f: 784.0, d: 0.26, t: 0.76 }, // G5
    ];
    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(n.f, t0 + n.t);
      osc.frequency.exponentialRampToValueAtTime(n.f * 1.03, t0 + n.t + n.d);
      gain.gain.setValueAtTime(0.085, t0 + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + n.t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + n.t);
      osc.stop(t0 + n.t + n.d + 0.015);
    }
  }

  public playFireworkLaunch() {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, t0);
    osc.frequency.exponentialRampToValueAtTime(1280, t0 + 0.34);
    gain.gain.setValueAtTime(0.045, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.36);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.37);
  }

  public playFireworkBurst(pitchScale: number = 1) {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    // Deep festive mortar thump
    const boom = ctx.createOscillator();
    const boomGain = ctx.createGain();
    boom.type = 'triangle';
    boom.frequency.setValueAtTime(155 * pitchScale, t0);
    boom.frequency.exponentialRampToValueAtTime(42, t0 + 0.22);
    boomGain.gain.setValueAtTime(0.13, t0);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.24);
    boom.connect(boomGain);
    boomGain.connect(ctx.destination);
    boom.start(t0);
    boom.stop(t0 + 0.25);

    // Shimmering starburst crackle arpeggio
    const sparkles = [1046.5, 1318.5, 1568.0, 2093.0];
    sparkles.forEach((f, i) => {
      const sp = ctx.createOscillator();
      const sg = ctx.createGain();
      sp.type = 'square';
      const st = t0 + 0.04 + i * 0.045;
      sp.frequency.setValueAtTime(f * pitchScale, st);
      sg.gain.setValueAtTime(0.04, st);
      sg.gain.exponentialRampToValueAtTime(0.001, st + 0.08);
      sp.connect(sg);
      sg.connect(ctx.destination);
      sp.start(st);
      sp.stop(st + 0.09);
    });
  }

  public playEmoteCheer(waveOnly: boolean = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const seq = waveOnly
      ? [{ f: 523.25, t: 0, d: 0.09 }, { f: 659.25, t: 0.1, d: 0.16 }]
      : [{ f: 523.25, t: 0, d: 0.08 }, { f: 659.25, t: 0.09, d: 0.08 }, { f: 783.99, t: 0.18, d: 0.22 }];
    for (const n of seq) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t0 + n.t);
      gain.gain.setValueAtTime(0.09, t0 + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + n.t + n.d);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0 + n.t);
      osc.stop(t0 + n.t + n.d + 0.02);
    }
  }
}

export const soundEngine = new SoundEngine();
