// Sonido 100% sintetizado con Web Audio: efectos 8-bit y una giga de taberna en chiptune.
// No hay archivos de audio. Para cambiar un efecto, edita su receta en SFX.
// La música acelera con `setTension(0..1)` (poca vida, pocos jugadores vivos).

export type SfxName =
  | 'click'
  | 'hover'
  | 'select'
  | 'card'
  | 'swing'
  | 'arrow'
  | 'hit'
  | 'bigHit'
  | 'armor'
  | 'armorBreak'
  | 'armorUp'
  | 'block'
  | 'dodge'
  | 'heal'
  | 'roll'
  | 'pickup'
  | 'steal'
  | 'lose'
  | 'curse'
  | 'bless'
  | 'dizzy'
  | 'death'
  | 'turnYou'
  | 'turnOther'
  | 'victory'
  | 'defeat'
  | 'error';

type Wave = OscillatorType | 'pulse25' | 'pulse12';

interface ToneOpts {
  freq: number;
  to?: number;
  dur: number;
  type?: Wave;
  vol?: number;
  when?: number;
  attack?: number;
  filter?: number; // lowpass
  bus?: AudioNode;
}

interface NoiseOpts {
  dur: number;
  vol?: number;
  when?: number;
  filter?: BiquadFilterType;
  freq?: number;
  to?: number;
  q?: number;
  bus?: AudioNode;
}

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteFreq(n: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  if (!m) return 0;
  let semi = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + semi;
  semi = midi - 69;
  return 440 * Math.pow(2, semi / 12);
}

// ------------------------------------------------------------------ canciones
// Cada canción se escribe por compases: una nota por corchea, "-" alarga la nota
// anterior y "." es silencio. El bajo suena cada `bassEvery` corcheas.
// Las canciones rotan: cada una suena LOOPS vueltas completas y pasa a la siguiente.

type Drum = 'kick' | 'snare' | 'hat';

interface Song {
  name: string;
  barSteps: number; // corcheas por compás
  eighth: number; // segundos por corchea en calma
  leadWave: Wave;
  leadVol: number;
  bassEvery: number;
  bassLen: number; // duración del bajo en corcheas
  chords?: boolean; // vals: "pa-pa" con la nota del bajo en los tiempos 2 y 3
  drums: (pos: number) => Drum[]; // qué suena en cada corchea del compás
  sections: { lead: string[]; bass: string[] }[];
}

const LOOPS = 3;
const bars = (...b: string[]) => b.join(' ').split(/\s+/).filter(Boolean);

/** 1. Giga de taberna (6/8, La menor). */
const GIGA: Song = {
  name: 'Giga de taberna',
  barSteps: 6,
  eighth: 0.215,
  leadWave: 'pulse25',
  leadVol: 0.055,
  bassEvery: 3,
  bassLen: 2.7,
  drums: (pos) => (pos === 0 ? ['kick'] : pos === 3 ? ['snare'] : []),
  sections: [
    {
      lead: bars(
        'A4 C5 E5 A5 E5 C5',
        'G4 B4 D5 G5 D5 B4',
        'A4 C5 E5 A5 G5 E5',
        'D5 E5 F#5 E5 - -',
        'C5 D5 E5 G5 E5 D5',
        'C5 D5 E5 A4 - B4',
        'C5 B4 A4 G4 A4 B4',
        'A4 - - E4 - .',
      ),
      bass: bars('A2 E3', 'G2 D3', 'A2 E3', 'D2 A2', 'C3 G2', 'F2 C3', 'G2 D3', 'A2 E2'),
    },
    {
      lead: bars(
        'E5 - A5 G5 E5 D5',
        'E5 - A5 G5 E5 G5',
        'A5 G5 E5 D5 B4 G4',
        'A4 B4 C5 D5 - .',
        'E5 D5 C5 D5 E5 G5',
        'A5 - G5 E5 - D5',
        'C5 B4 A4 B4 C5 D5',
        'E5 - D5 A4 - .',
      ),
      bass: bars('A2 E3', 'A2 E3', 'F2 C3', 'G2 D3', 'C3 G2', 'F2 C3', 'G2 D3', 'A2 E2'),
    },
  ],
};

/** 2. Marcha del duelo (4/4, Re menor): tambores de guerra y metales. */
const MARCHA: Song = {
  name: 'Marcha del duelo',
  barSteps: 8,
  eighth: 0.19,
  leadWave: 'square',
  leadVol: 0.04,
  bassEvery: 2,
  bassLen: 1.8,
  drums: (pos) => (pos === 0 || pos === 4 ? ['kick'] : pos === 2 || pos === 6 ? ['snare'] : pos === 7 ? ['hat'] : []),
  sections: [
    {
      lead: bars(
        'D5 - - A4 D5 - F5 -',
        'E5 - D5 - C#5 - A4 -',
        'D5 - - A4 D5 - F5 -',
        'G5 - F5 - E5 - - -',
        'F5 - E5 - D5 - C5 -',
        'Bb4 - A4 - G4 - A4 -',
        'D5 - F5 - E5 - C#5 -',
        'D5 - - - - - . .',
      ),
      bass: bars(
        'D3 A2 D3 A2',
        'A2 E3 A2 E3',
        'D3 A2 D3 A2',
        'G2 D3 A2 E3',
        'F2 C3 F2 C3',
        'Bb2 F2 G2 D3',
        'A2 E3 A2 C#3',
        'D3 A2 D3 D2',
      ),
    },
    {
      lead: bars(
        'A5 - G5 F5 E5 - D5 -',
        'C#5 - D5 - E5 - A4 -',
        'A5 - G5 F5 E5 - F5 -',
        'G5 - - - A5 - - -',
        'Bb5 - A5 - G5 - F5 -',
        'E5 - F5 - G5 - E5 -',
        'F5 - E5 - D5 - C#5 -',
        'D5 - - - . . . .',
      ),
      bass: bars(
        'D3 A2 D3 A2',
        'A2 E3 A2 E3',
        'D3 A2 F2 C3',
        'G2 D3 A2 E3',
        'Bb2 F2 G2 D3',
        'C3 G2 C3 G2',
        'A2 E3 A2 C#3',
        'D3 A2 D2 D2',
      ),
    },
  ],
};

/** 3. Vals de la jarra (3/4, Mi menor): bamboleo de borrachos, cajita de música. */
const VALS: Song = {
  name: 'Vals de la jarra',
  barSteps: 6,
  eighth: 0.2,
  leadWave: 'pulse12',
  leadVol: 0.06,
  bassEvery: 6,
  bassLen: 1.8,
  chords: true,
  drums: (pos) => (pos === 0 ? ['kick'] : pos === 2 || pos === 4 ? ['hat'] : []),
  sections: [
    {
      lead: bars(
        'E5 - - - G5 -',
        'B5 - - - A5 G5',
        'F#5 - - - G5 A5',
        'G5 - - - E5 -',
        'C5 - - - E5 -',
        'A5 - - - G5 F#5',
        'E5 - D#5 - F#5 -',
        'E5 - - - - .',
      ),
      bass: bars('E2', 'G2', 'D2', 'E2', 'A2', 'D2', 'B2', 'E2'),
    },
    {
      lead: bars(
        'B4 - E5 - G5 -',
        'B5 - - - A5 -',
        'G5 - F#5 - E5 -',
        'D5 - - - B4 -',
        'C5 - E5 - A5 -',
        'G5 - - - F#5 -',
        'E5 - F#5 - D#5 -',
        'E5 - - - - .',
      ),
      bass: bars('E2', 'G2', 'C3', 'B2', 'A2', 'D2', 'B2', 'E2'),
    },
  ],
};

export const SONGS: Song[] = [GIGA, MARCHA, VALS];

export interface AudioPrefs {
  music: boolean;
  sfx: boolean;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private pulse25!: PeriodicWave;
  private pulse12!: PeriodicWave;
  private prefs: AudioPrefs = { music: true, sfx: true };
  private tension = 0;
  private musicTimer: number | null = null;
  private step = 0;
  private section = 0;
  private loop = 0;
  private song = 0;
  private nextTime = 0;
  private startedAt = 0;

  /** Crea el contexto (debe llamarse desde un clic del usuario la primera vez). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(ctx.destination);
      this.sfxBus = ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0.55;
      this.musicBus.connect(this.master);
      this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.pulse25 = this.makePulse(0.25);
      this.pulse12 = this.makePulse(0.125);
      this.applyPrefs();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setPrefs(p: AudioPrefs): void {
    this.prefs = p;
    this.applyPrefs();
  }

  /** 0 = calma, 1 = final de infarto. Acelera la música y suma capas. */
  setTension(t: number): void {
    this.tension = Math.max(0, Math.min(1, t));
  }

  startMusic(): void {
    if (!this.ctx || this.musicTimer !== null) return;
    this.step = 0;
    this.section = 0;
    this.loop = 0;
    this.startedAt = this.ctx.currentTime;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.musicTimer = window.setInterval(() => this.schedule(), 25);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    // la próxima partida empieza con otra canción (si esta alcanzó a sonar)
    if (this.musicTimer !== null && this.ctx && this.ctx.currentTime - this.startedAt > 5) this.song = (this.song + 1) % SONGS.length;
    this.musicTimer = null;
  }

  play(name: SfxName, opts: { duration?: number } = {}): void {
    if (!this.ctx || !this.prefs.sfx) return;
    SFX[name](this, opts.duration ?? 1);
  }

  // ---------------------------------------------------------------- primitivas

  private applyPrefs(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(this.prefs.music ? 0.55 : 0, now, 0.08);
    this.sfxBus.gain.setTargetAtTime(this.prefs.sfx ? 1 : 0, now, 0.03);
  }

  private makePulse(duty: number): PeriodicWave {
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let i = 1; i < n; i++) real[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return this.ctx!.createPeriodicWave(real, imag);
  }

  tone(o: ToneOpts): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (o.when ?? 0);
    const osc = ctx.createOscillator();
    if (o.type === 'pulse25') osc.setPeriodicWave(this.pulse25);
    else if (o.type === 'pulse12') osc.setPeriodicWave(this.pulse12);
    else osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(o.freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
    const g = ctx.createGain();
    const v = o.vol ?? 0.15;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (o.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    let node: AudioNode = osc;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.filter;
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(o.bus ?? this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.03);
  }

  noise(o: NoiseOpts): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (o.when ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter ?? 'lowpass';
    f.frequency.setValueAtTime(o.freq ?? 2000, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
    f.Q.value = o.q ?? 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f).connect(g).connect(o.bus ?? this.sfxBus);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + o.dur + 0.03);
  }

  notes(list: string[], step: number, o: Omit<ToneOpts, 'freq'>): void {
    list.forEach((n, i) => this.tone({ ...o, freq: noteFreq(n), when: (o.when ?? 0) + i * step }));
  }

  // ---------------------------------------------------------------- música

  /** Nombre de la canción que suena ahora. */
  get songName(): string {
    return SONGS[this.song].name;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextTime - ctx.currentTime);
      this.nextTime += this.eighth();
      this.advanceStep();
    }
  }

  private advanceStep(): void {
    const song = SONGS[this.song];
    this.step++;
    if (this.step < song.sections[this.section].lead.length) return;
    this.step = 0;
    this.section++;
    if (this.section < song.sections.length) return;
    this.section = 0;
    this.loop++;
    if (this.loop < LOOPS) return;
    this.loop = 0;
    this.song = (this.song + 1) % SONGS.length;
  }

  private eighth(): number {
    const base = SONGS[this.song].eighth;
    return base * (1 - this.tension * 0.4); // hasta 40 % más rápido al final
  }

  private playStep(i: number, when: number): void {
    const bus = this.musicBus;
    const song = SONGS[this.song];
    const { lead, bass } = song.sections[this.section];
    const e = this.eighth();
    const pos = i % song.barSteps;
    const root = noteFreq(bass[Math.floor(i / song.bassEvery)] ?? bass[bass.length - 1]);

    const n = lead[i];
    if (n !== '-' && n !== '.') {
      let len = 1;
      while (lead[i + len] === '-') len++;
      this.tone({ freq: noteFreq(n), dur: e * len * 0.92, type: song.leadWave, vol: song.leadVol, when, bus });
      if (this.tension > 0.7) this.tone({ freq: noteFreq(n) * 2, dur: e * 0.5, type: 'pulse12', vol: 0.02, when, bus });
    }
    if (i % song.bassEvery === 0) this.tone({ freq: root, dur: e * song.bassLen, type: 'triangle', vol: 0.16, when, bus });
    if (song.chords && (pos === 2 || pos === 4)) {
      this.tone({ freq: root * 2, dur: e * 0.7, type: 'triangle', vol: 0.05, when, bus });
      this.tone({ freq: root * 3, dur: e * 0.7, type: 'triangle', vol: 0.035, when, bus });
    }
    for (const d of song.drums(pos)) {
      if (d === 'kick') this.tone({ freq: 150, to: 45, dur: 0.13, type: 'sine', vol: 0.28, when, bus });
      if (d === 'snare') this.noise({ dur: 0.09, vol: 0.07, filter: 'highpass', freq: 1400, when, bus });
      if (d === 'hat') this.noise({ dur: 0.03, vol: 0.03, filter: 'highpass', freq: 7000, when, bus });
    }
    if (this.tension > 0.3) this.noise({ dur: 0.03, vol: 0.022, filter: 'highpass', freq: 7000, when, bus });
    if (this.tension > 0.55) {
      const arp = [1, 1.25, 1.5][i % 3];
      this.tone({ freq: root * 4 * arp, dur: e * 0.8, type: 'triangle', vol: 0.03, when, bus });
    }
  }
}

// ------------------------------------------------------------------ recetas de efectos
type Recipe = (a: AudioEngine, duration: number) => void;

const SFX: Record<SfxName, Recipe> = {
  click: (a) => {
    a.tone({ freq: 660, dur: 0.04, vol: 0.08 });
    a.tone({ freq: 990, dur: 0.05, vol: 0.07, when: 0.03 });
  },
  hover: (a) => a.tone({ freq: 1500, dur: 0.025, type: 'pulse12', vol: 0.025 }),
  select: (a) => a.tone({ freq: 520, to: 820, dur: 0.08, vol: 0.08 }),
  card: (a) => {
    a.noise({ dur: 0.15, vol: 0.16, filter: 'bandpass', freq: 1200, to: 3800, q: 1.2 });
    a.tone({ freq: 300, to: 640, dur: 0.1, type: 'triangle', vol: 0.06 });
  },
  swing: (a) => a.noise({ dur: 0.2, vol: 0.22, filter: 'bandpass', freq: 500, to: 2800, q: 0.9 }),
  arrow: (a) => {
    a.tone({ freq: 1500, to: 480, dur: 0.24, type: 'triangle', vol: 0.08 });
    a.noise({ dur: 0.14, vol: 0.06, filter: 'highpass', freq: 3000 });
  },
  hit: (a) => {
    a.noise({ dur: 0.15, vol: 0.32, filter: 'lowpass', freq: 2400, to: 260 });
    a.tone({ freq: 190, to: 55, dur: 0.15, vol: 0.16 });
  },
  bigHit: (a) => {
    a.noise({ dur: 0.18, vol: 0.38, filter: 'lowpass', freq: 3000, to: 200 });
    a.tone({ freq: 120, to: 32, dur: 0.38, type: 'sine', vol: 0.5 });
    a.tone({ freq: 220, to: 60, dur: 0.2, vol: 0.14 });
    a.noise({ dur: 0.32, vol: 0.22, filter: 'lowpass', freq: 900, to: 70, when: 0.03 });
  },
  armor: (a) => {
    a.tone({ freq: 520, dur: 0.06, vol: 0.09 });
    a.tone({ freq: 780, dur: 0.07, vol: 0.07, when: 0.04 });
    a.noise({ dur: 0.07, vol: 0.06, filter: 'highpass', freq: 4000 });
  },
  armorBreak: (a) => {
    a.noise({ dur: 0.32, vol: 0.24, filter: 'bandpass', freq: 3200, to: 500, q: 1.5 });
    a.tone({ freq: 900, to: 180, dur: 0.26, vol: 0.08 });
    a.tone({ freq: 640, to: 140, dur: 0.22, vol: 0.06, when: 0.06 });
  },
  armorUp: (a) => {
    a.tone({ freq: 300, to: 600, dur: 0.09, vol: 0.08 });
    a.tone({ freq: 600, to: 940, dur: 0.11, vol: 0.07, when: 0.08 });
    a.noise({ dur: 0.05, vol: 0.05, filter: 'highpass', freq: 5000, when: 0.08 });
  },
  block: (a) => {
    a.tone({ freq: 1650, dur: 0.07, vol: 0.11 });
    a.tone({ freq: 2470, dur: 0.4, type: 'triangle', vol: 0.11 });
    a.tone({ freq: 3300, dur: 0.25, type: 'triangle', vol: 0.04, when: 0.01 });
    a.noise({ dur: 0.06, vol: 0.12, filter: 'highpass', freq: 5000 });
  },
  dodge: (a) => a.noise({ dur: 0.24, vol: 0.14, filter: 'bandpass', freq: 380, to: 3200, q: 2.2 }),
  heal: (a) => a.notes(['C5', 'E5', 'G5', 'C6'], 0.065, { dur: 0.12, type: 'triangle', vol: 0.09 }),
  roll: (a, d) => {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const t = d * 0.85 * Math.pow(i / n, 0.7);
      a.noise({ dur: 0.03, vol: 0.12, filter: 'highpass', freq: 2200 + i * 150, when: t });
      a.tone({ freq: 300 + Math.random() * 200, dur: 0.025, type: 'square', vol: 0.03, when: t });
    }
  },
  pickup: (a) => {
    a.tone({ freq: 660, dur: 0.08, type: 'pulse25', vol: 0.1 });
    a.tone({ freq: 990, dur: 0.14, type: 'pulse25', vol: 0.1, when: 0.07 });
  },
  steal: (a) => a.notes(['E6', 'B5', 'E6', 'G6'], 0.06, { dur: 0.07, type: 'pulse25', vol: 0.07 }),
  lose: (a) => a.tone({ freq: 520, to: 220, dur: 0.22, type: 'triangle', vol: 0.09 }),
  curse: (a) => {
    a.tone({ freq: 110, dur: 0.55, type: 'sawtooth', vol: 0.07, filter: 700 });
    a.tone({ freq: 116.5, dur: 0.55, type: 'sawtooth', vol: 0.07, filter: 700 });
    a.tone({ freq: 55, dur: 0.6, type: 'sine', vol: 0.16 });
  },
  bless: (a) => a.notes(['E6', 'G#6', 'B6', 'E7'], 0.05, { dur: 0.16, type: 'triangle', vol: 0.05 }),
  dizzy: (a) => {
    a.tone({ freq: 720, to: 480, dur: 0.3, type: 'sine', vol: 0.08 });
    a.tone({ freq: 880, to: 600, dur: 0.3, type: 'sine', vol: 0.06, when: 0.14 });
  },
  death: (a) => {
    a.tone({ freq: 440, to: 50, dur: 0.75, vol: 0.11 });
    a.tone({ freq: 330, to: 40, dur: 0.75, type: 'triangle', vol: 0.1, when: 0.05 });
    a.noise({ dur: 0.55, vol: 0.18, filter: 'lowpass', freq: 1200, to: 90 });
  },
  turnYou: (a) => a.notes(['A5', 'E6'], 0.1, { dur: 0.2, type: 'pulse25', vol: 0.08 }),
  turnOther: (a) => a.tone({ freq: noteFreq('E5'), dur: 0.09, type: 'triangle', vol: 0.05 }),
  victory: (a) => {
    a.notes(['C5', 'E5', 'G5', 'C6', '-', 'G5', 'C6'].filter((n) => n !== '-'), 0.12, {
      dur: 0.2,
      type: 'pulse25',
      vol: 0.1,
    });
    a.notes(['C3', 'G3', 'C4'], 0.24, { dur: 0.3, type: 'triangle', vol: 0.15 });
    a.tone({ freq: noteFreq('C6'), dur: 0.8, type: 'pulse25', vol: 0.09, when: 0.85 });
  },
  defeat: (a) => a.notes(['G4', 'F#4', 'F4', 'E4'], 0.28, { dur: 0.32, type: 'triangle', vol: 0.12 }),
  error: (a) => {
    a.tone({ freq: 140, dur: 0.12, vol: 0.1 });
    a.tone({ freq: 118, dur: 0.14, vol: 0.1, when: 0.09 });
  },
};

export const audio = new AudioEngine();
