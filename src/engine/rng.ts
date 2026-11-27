// Generador aleatorio con semilla (mulberry32). El estado vive en GameState.rng,
// así la misma semilla + las mismas acciones = la misma partida.

export function nextRandom(s: { rng: number }): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Entero en [0, n). */
export function randInt(s: { rng: number }, n: number): number {
  return Math.floor(nextRandom(s) * n);
}

export function shuffle<T>(s: { rng: number }, arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(s, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Generador independiente (para bots y simulaciones), fuera del estado de la partida. */
export function makeRandom(seed: number): () => number {
  const box = { rng: seed | 0 };
  return () => nextRandom(box);
}
