import { createGame } from '../src/engine/engine';
import type { GameState, PlayerId, WeaponId } from '../src/engine/types';

/** Partida de prueba: todos humanos, empieza el jugador 0, manos vacías. */
export function setup(n: number, seed = 1): GameState {
  const s = createGame({
    players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, isBot: false })),
    seed,
    firstPlayer: 0,
  });
  for (const p of s.players) {
    s.deck.push(...p.hand);
    p.hand = [];
  }
  return s;
}

let k = 0;
/** Da cartas a un jugador y devuelve sus uids. */
export function give(s: GameState, pid: PlayerId, ...defIds: string[]): string[] {
  return defIds.map((defId) => {
    const uid = `t${k++}`;
    s.players[pid].hand.push({ uid, defId });
    return uid;
  });
}

export function arm(s: GameState, pid: PlayerId, w: WeaponId | null): void {
  s.players[pid].weapon = w;
}

export function curse(s: GameState, pid: PlayerId, defId: string): void {
  s.players[pid].curses.push({ uid: `t${k++}`, defId });
}

export function bless(s: GameState, pid: PlayerId, defId: string): void {
  s.players[pid].blessings.push({ uid: `t${k++}`, defId });
}
