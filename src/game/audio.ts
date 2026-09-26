export class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  muted = false;
  volume = 0.7;

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC({ latencyHint: "interactive" });
      this.master = this.ctx.createGain();
      this.sfx = this.ctx.createGain();
      this.sfx.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolume();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.applyVolume();
  }

  setVolume(v: number) {
    this.volume = v;
    this.applyVolume();
  }

  private applyVolume() {
    if (!this.master || !this.ctx) return;
    const g = this.muted ? 0 : this.volume * this.volume;
    this.master.gain.setTargetAtTime(g, this.ctx.currentTime, 0.02);
  }

  private now() {
    return this.ctx?.currentTime ?? 0;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 0) {
    if (!this.ctx || !this.sfx) return;
    const t = this.now();
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    osc.onended = () => {
      osc.disconnect();
      g.disconnect();
    };
  }

  private noise(dur: number, gain: number, hp = 400) {
    if (!this.ctx || !this.sfx) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hp;
    const g = this.ctx.createGain();
    const t = this.now();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfx);
    src.start(t);
    src.stop(t + dur);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      g.disconnect();
    };
  }

  fire() {
    this.tone(1640 + Math.random() * 80, 0.09, "sawtooth", 0.07, -1100);
    this.noise(0.05, 0.05, 1800);
  }

  empty() {
    this.tone(220, 0.06, "square", 0.04);
  }

  hit() {
    this.tone(920, 0.05, "square", 0.05, -200);
  }

  hurt() {
    this.tone(140, 0.18, "sine", 0.08, -40);
    this.noise(0.12, 0.04, 200);
  }

  tag() {
    this.tone(520, 0.16, "triangle", 0.07, 220);
    this.tone(780, 0.2, "sine", 0.05, 160);
  }

  pickup() {
    this.tone(660, 0.1, "sine", 0.06, 200);
    this.tone(990, 0.14, "triangle", 0.04);
  }

  cap() {
    this.tone(440, 0.18, "triangle", 0.07, 80);
    this.tone(660, 0.22, "sine", 0.05, 120);
    this.tone(880, 0.28, "sine", 0.04, 80);
  }

  reload() {
    this.tone(180, 0.08, "square", 0.03);
    this.tone(260, 0.1, "square", 0.025);
  }

  step() {
    this.noise(0.04, 0.025, 80);
  }

  win() {
    this.tone(523, 0.22, "triangle", 0.07);
    this.tone(659, 0.28, "triangle", 0.06);
    this.tone(784, 0.36, "sine", 0.05);
  }
}
