// Bot genérico. No conoce las cartas una por una: para cada jugada posible
// simula el resultado (suponiendo que nadie se defiende) y elige el mejor según
// `evaluate`. Por eso una carta nueva funciona con los bots sin tocar este archivo.
// Para bots más listos o con personalidad, cambiar los pesos de abajo.

import type { Action, CardType, GameState, Player, PlayerId, WeaponId } from '../engine/types';
import { applyAction, legalActions } from '../engine/engine';
import { getCardDef } from '../engine/cards';
import { weaponDef } from '../engine/weapons';

/** Cuánto vale tener una carta de cada tipo en la mano. */
const HAND_VALUE: Record<CardType, number> = {
  defensa: 0.9,
  ataque: 0.6,
  armadura: 0.5,
  bendicion: 0.5,
  misterio: 0.45,
  maldicion: 0.4,
  evento: 0.35,
};

export function weaponPower(w: WeaponId | null): number {
  const d = weaponDef(w);
  let v = d.near * 0.6 + d.far * 0.4;
  if (d.ignoresArmor) v += 0.4;
  if (d.shieldProof) v += 0.4;
  if (d.prostrateOnAttack) v -= 1.4;
  return v;
}

function playerValue(p: Player): number {
  let v = p.hp + (p.armor?.pa ?? 0) * 0.8 + weaponPower(p.weapon) * 0.6;
  v += p.blessings.length * 1.5 - p.curses.length * 1.5;
  if (p.prostrated) v -= 2.5;
  for (const c of p.hand) v += HAND_VALUE[getCardDef(c.defId).type];
  return v;
}

/** Qué tan buena es la situación para `pid` (más alto = mejor). */
export function evaluate(s: GameState, pid: PlayerId): number {
  if (s.result) return s.result.winner === pid ? 1000 : s.result.winner === null ? -200 : -1000;
  const me = s.players[pid];
  if (me.eliminated) return -1000;
  let score = playerValue(me);
  for (const q of s.players) if (q.id !== pid && !q.eliminated) score -= playerValue(q) + 6;
  return score;
}

function simulate(s: GameState, pid: PlayerId, action: Action): number {
  try {
    // Copia ligera sin registro y con otra semilla: el bot no "ve" el dado de verdad.
    const probe: GameState = { ...s, log: [], fx: [], rng: (s.rng ^ 0x5bd1e995) | 0, options: { ...s.options, logLimit: 0 } };
    let st = applyAction(probe, pid, action);
    for (let i = 0; i < 60 && !st.result && st.prompt?.kind === 'defend'; i++)
      st = applyAction(st, st.prompt.player, { type: 'noDefense' });
    return evaluate(st, pid);
  } catch {
    return -Infinity;
  }
}

export function chooseBotAction(s: GameState, pid: PlayerId, rand: () => number = Math.random): Action {
  const pr = s.prompt;
  if (!pr || pr.player !== pid) throw new Error('El bot no tiene nada que decidir.');
  const me = s.players[pid];

  if (pr.kind === 'weapon') {
    if (!me.weapon) return { type: 'roll' }; // sin arma, lanzar es gratis
    return weaponPower(me.weapon) < 1.75 && rand() < 0.25 ? { type: 'roll' } : { type: 'skipRoll' };
  }

  if (pr.kind === 'discard') {
    const ranked = [...me.hand].sort(
      (a, b) => HAND_VALUE[getCardDef(a.defId).type] - HAND_VALUE[getCardDef(b.defId).type] || rand() - 0.5,
    );
    return { type: 'discard', cardUids: ranked.slice(0, pr.count).map((c) => c.uid) };
  }

  const options = legalActions(s, pid);
  let best = options[0];
  let bestScore = -Infinity;
  for (const a of options) {
    const score = simulate(s, pid, a) + rand() * 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}
