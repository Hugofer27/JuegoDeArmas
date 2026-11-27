// Herramientas de prueba (modo dev). Hacen trampa a propósito: sirven para probar
// cartas nuevas sin esperar a robarlas. Quedan marcadas en el registro como [DEV].

import type { GameState, PlayerId, WeaponId } from './types';
import { addStatus, alive, eliminate, log, nextId } from './core';
import { getCardDef } from './cards';
import { weaponDef } from './weapons';
import { advance } from './engine';

function edit(state: GameState, fn: (s: GameState) => void): GameState {
  const s = structuredClone(state);
  fn(s);
  // Si el cambio eliminó a quien decidía (o al atacante de un ataque pendiente), esa decisión se descarta.
  const pr = s.prompt;
  if (pr && (s.players[pr.player].eliminated || (pr.kind === 'defend' && s.players[pr.attack.attacker].eliminated)))
    s.prompt = null;
  // Si queda uno solo (o nadie), la partida se cierra aunque hubiera una decisión pendiente.
  if (alive(s).length <= 1) s.prompt = null;
  advance(s);
  return s;
}

export function devGiveCard(state: GameState, pid: PlayerId, defId: string): GameState {
  return edit(state, (s) => {
    s.players[pid].hand.push({ uid: `d${nextId(s)}`, defId });
    log(s, `[DEV] ${s.players[pid].name} recibe ${getCardDef(defId).name}.`, 'dev');
  });
}

/** Pone una maldición o bendición directo sobre un jugador, sin jugarla. */
export function devApplyStatus(state: GameState, pid: PlayerId, defId: string): GameState {
  return edit(state, (s) => {
    const def = getCardDef(defId);
    const kind = def.type === 'maldicion' ? 'curse' : 'blessing';
    addStatus(s, pid, { uid: `d${nextId(s)}`, defId }, kind);
    log(s, `[DEV] ${s.players[pid].name} recibe ${def.name}.`, 'dev');
  });
}

export function devSetHp(state: GameState, pid: PlayerId, hp: number): GameState {
  return edit(state, (s) => {
    s.players[pid].hp = hp;
    log(s, `[DEV] ${s.players[pid].name} pasa a ${hp} PV.`, 'dev');
    if (hp <= 0) eliminate(s, pid);
  });
}

export function devSetWeapon(state: GameState, pid: PlayerId, weapon: WeaponId | null): GameState {
  return edit(state, (s) => {
    for (const p of s.players) if (weapon && p.weapon === weapon) p.weapon = null;
    s.players[pid].weapon = weapon;
    log(s, `[DEV] ${s.players[pid].name} recibe ${weaponDef(weapon).name}.`, 'dev');
  });
}
