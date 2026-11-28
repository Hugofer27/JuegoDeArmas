// Funciones base que usan el motor y las cartas. Todas modifican el estado `s`
// directamente: el motor siempre trabaja sobre una copia (ver applyAction).

import type {
  Attack,
  CardInstance,
  Fx,
  FxKind,
  GameState,
  LogKind,
  Player,
  PlayerId,
  Proximity,
  Task,
  WeaponId,
} from './types';
import { randInt, shuffle } from './rng';
import { WEAPON_DIE, weaponDef } from './weapons';

// ---------- registro y efectos visuales ----------

export function nextId(s: GameState): number {
  s.seq += 1;
  return s.seq;
}

export function log(s: GameState, text: string, kind: LogKind = 'info'): void {
  if (s.options.logLimit <= 0) return;
  s.log.push({ id: nextId(s), turn: s.turn.number, text, kind });
  if (s.log.length > s.options.logLimit) s.log.splice(0, s.log.length - s.options.logLimit);
}

export function addFx(
  s: GameState,
  kind: FxKind,
  player: PlayerId,
  extra: Partial<Omit<Fx, 'id' | 'kind' | 'player'>> = {},
): void {
  if (s.options.logLimit <= 0) return;
  s.fx.push({ id: nextId(s), kind, player, ...extra });
  if (s.fx.length > 300) s.fx.splice(0, s.fx.length - 300);
}

// ---------- jugadores y proximidad ----------

export function alive(s: GameState): Player[] {
  return s.players.filter((p) => !p.eliminated);
}

export function opponents(s: GameState, pid: PlayerId): Player[] {
  return alive(s).filter((p) => p.id !== pid);
}

/** ¿Tiene esta maldición o bendición? (por id de carta: 'fijado', 'kamikaze'...) */
export function hasStatus(p: Player, defId: string): boolean {
  return p.curses.some((c) => c.defId === defId) || p.blessings.some((c) => c.defId === defId);
}

/** Proximidad mutua. Relegado gana sobre Vecino; si no, mandan los asientos. */
export function proximity(s: GameState, a: PlayerId, b: PlayerId): Proximity {
  const pa = s.players[a];
  const pb = s.players[b];
  if (hasStatus(pa, 'relegado') || hasStatus(pb, 'relegado')) return 'lejano';
  if (hasStatus(pa, 'vecino') || hasStatus(pb, 'vecino')) return 'cercano';
  const ring = alive(s).map((p) => p.id);
  const i = ring.indexOf(a);
  const j = ring.indexOf(b);
  if (i < 0 || j < 0) return 'lejano';
  const d = Math.abs(i - j);
  return Math.min(d, ring.length - d) === 1 ? 'cercano' : 'lejano';
}

// ---------- cartas ----------

/** Roba n cartas. Si el mazo se acaba, rebaraja el descarte. */
export function drawCards(s: GameState, pid: PlayerId, n: number): number {
  const p = s.players[pid];
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (s.deck.length === 0) {
      if (s.discard.length === 0) break;
      s.deck = s.discard;
      s.discard = [];
      shuffle(s, s.deck);
      log(s, `♻️ El mazo se acabó: se baraja el descarte (${s.deck.length} cartas).`);
    }
    const card = s.deck.pop()!;
    p.hand.push(card);
    drawn++;
  }
  return drawn;
}

export function discardCard(s: GameState, card: CardInstance): void {
  s.discard.push(card);
}

export function removeFromHand(p: Player, uid: string): CardInstance {
  const i = p.hand.findIndex((c) => c.uid === uid);
  if (i < 0) throw new Error(`La carta ${uid} no está en la mano de ${p.name}`);
  return p.hand.splice(i, 1)[0];
}

/** Encola una tarea. Se resuelve después de lo que está haciendo la carta actual,
 *  y antes que lo que ya estaba esperando en el stack. */
export function queueTask(s: GameState, task: Task): void {
  s.buffer.push(task);
}

// ---------- armas ----------

export function rollWeapon(s: GameState, pid: PlayerId): WeaponId {
  const w = WEAPON_DIE[randInt(s, WEAPON_DIE.length)];
  const p = s.players[pid];
  const wd = weaponDef(w);
  s.lastRoll = { player: pid, weapon: w, id: nextId(s) };
  s.stats.rolls += 1;
  if (p.weapon === w) {
    addFx(s, 'roll', pid, { weapon: w, prev: w });
    log(s, `🎲 ${p.name} saca ${wd.icon} ${wd.name}. Ya la tenía: no pasa nada.`, 'weapon');
    return w;
  }
  const holder = s.players.find((q) => q.weapon === w && q.id !== pid);
  addFx(s, 'roll', pid, { weapon: w, prev: p.weapon, from: holder?.id });
  if (holder) {
    holder.weapon = null;
    log(s, `🎲 ${p.name} saca ${wd.icon} ${wd.name} ¡y se la roba a ${holder.name}!`, 'weapon');
  } else {
    log(s, `🎲 ${p.name} saca ${wd.icon} ${wd.name} y la toma del Cofre.`, 'weapon');
  }
  p.weapon = w; // la anterior vuelve sola al Cofre (Cofre = armas sin dueño)
  return w;
}

/** Cambia el arma de un jugador (null = Puños) y avisa a la UI. */
export function setWeapon(s: GameState, pid: PlayerId, w: WeaponId | null): void {
  const p = s.players[pid];
  if (p.weapon === w) return;
  addFx(s, 'weapon', pid, { weapon: w, prev: p.weapon });
  p.weapon = w;
}

/** Armas que nadie tiene. */
export function chestWeapons(s: GameState): WeaponId[] {
  return WEAPON_DIE.filter((w) => !s.players.some((p) => p.weapon === w));
}

// ---------- ataques ----------

export function makeAttack(
  s: GameState,
  attackerId: PlayerId,
  targetId: PlayerId,
  opts: { label: string; multiplier?: number },
): Attack {
  const a = s.players[attackerId];
  const w = weaponDef(a.weapon);
  const prox = proximity(s, attackerId, targetId);
  let mult = opts.multiplier ?? 1;
  if (prox === 'lejano' && a.sniper) {
    mult *= 2;
    a.sniper = false;
  }
  let damage = (prox === 'cercano' ? w.near : w.far) * mult;
  if (a.bonusDamage > 0) {
    damage += a.bonusDamage;
    a.bonusDamage = 0;
  }
  if (hasStatus(a, 'super_fuerte')) damage += 1;
  return {
    attacker: attackerId,
    target: targetId,
    damage,
    weapon: a.weapon,
    proximity: prox,
    ignoresArmor: !!w.ignoresArmor,
    shieldProof: !!w.shieldProof,
    unblockable: hasStatus(a, 'rompe_escudos'),
    label: opts.label,
  };
}

/** Hacha: atacar con ella te deja Postrado. */
export function applyAttackPenalty(s: GameState, pid: PlayerId): void {
  const p = s.players[pid];
  if (weaponDef(p.weapon).prostrateOnAttack && !p.prostrated) {
    p.prostrated = true;
    addFx(s, 'prostrate', pid);
    log(s, `😵 ${p.name} ataca con el Hacha y queda Postrado: pierde su próximo turno.`, 'weapon');
  }
}

/** Declara ataques con el arma del jugador a cada objetivo (Ataque Simple, Cercano, etc.). */
export function declareAttacks(
  s: GameState,
  pid: PlayerId,
  targets: PlayerId[],
  opts: { label: string; multiplier?: number },
): void {
  for (const t of targets) queueTask(s, { t: 'attack', attack: makeAttack(s, pid, t, opts) });
  if (targets.length) applyAttackPenalty(s, pid);
}

// ---------- vida ----------

/** Pérdida de PV (ya sin armadura). Activa Kamikaze y elimina si llega a 0. */
export function loseHp(s: GameState, pid: PlayerId, amount: number, cause: string): void {
  const p = s.players[pid];
  if (p.eliminated || amount <= 0) return;
  addFx(s, 'damage', pid, { amount, before: p.hp, after: p.hp - amount, label: cause });
  p.hp -= amount;
  log(s, `💔 ${p.name} pierde ${amount} PV (${cause}). Le quedan ${Math.max(0, p.hp)}.`, 'damage');
  const kamikaze = hasStatus(p, 'kamikaze'); // se mira antes de eliminar (eliminar descarta la bendición)
  if (p.hp <= 0) eliminate(s, pid);
  if (kamikaze) {
    const others = alive(s).filter((q) => q.id !== pid);
    if (others.length) log(s, `💥 Kamikaze de ${p.name}: todos los demás pierden 1 PV.`, 'damage');
    for (const q of others) queueTask(s, { t: 'loseHp', player: q.id, amount: 1, cause: `Kamikaze de ${p.name}` });
  }
}

export function heal(s: GameState, pid: PlayerId, amount: number): void {
  const p = s.players[pid];
  if (amount <= 0 || p.eliminated) return;
  addFx(s, 'heal', pid, { amount, before: p.hp, after: p.hp + amount });
  p.hp += amount;
  log(s, `💚 ${p.name} se cura ${amount} PV (tiene ${p.hp}).`, 'heal');
}

/** Sube los PV hasta `target` si está por debajo (Elixir de Vida). */
export function healTo(s: GameState, pid: PlayerId, target: number): void {
  const p = s.players[pid];
  if (p.hp < target) heal(s, pid, target - p.hp);
  else log(s, `${p.name} ya tiene ${p.hp} PV: el Elixir no hace nada.`, 'heal');
}

// ---------- armadura y estados ----------

export function equipArmor(s: GameState, pid: PlayerId, card: CardInstance, pa: number): void {
  const p = s.players[pid];
  if (p.armor) discardCard(s, p.armor.card);
  p.armor = { card, pa, max: pa };
  addFx(s, 'armorUp', pid, { after: pa, defId: card.defId });
}

export function destroyArmor(s: GameState, pid: PlayerId): void {
  const p = s.players[pid];
  if (!p.armor) return;
  addFx(s, 'armorBreak', pid, { defId: p.armor.card.defId });
  discardCard(s, p.armor.card);
  p.armor = null;
}

/** Maldiciones/bendiciones que se reemplazan entre sí en el mismo jugador. */
const OPPOSITE_STATUS: Record<string, string> = { relegado: 'vecino', vecino: 'relegado' };

export function addStatus(s: GameState, targetId: PlayerId, card: CardInstance, kind: 'curse' | 'blessing'): void {
  const p = s.players[targetId];
  if (hasStatus(p, card.defId)) {
    discardCard(s, card); // no se repite: la copia extra se pierde
    return;
  }
  const opposite = OPPOSITE_STATUS[card.defId];
  if (opposite && hasStatus(p, opposite)) removeStatus(s, p, opposite);
  (kind === 'curse' ? p.curses : p.blessings).push(card);
  addFx(s, 'status', targetId, { defId: card.defId, curse: kind === 'curse' });
}

export function removeStatus(s: GameState, p: Player, defId: string): void {
  for (const list of [p.curses, p.blessings]) {
    const i = list.findIndex((c) => c.defId === defId);
    if (i >= 0) discardCard(s, list.splice(i, 1)[0]);
  }
}

// ---------- eliminación ----------

export function eliminate(s: GameState, pid: PlayerId): void {
  const p = s.players[pid];
  if (p.eliminated) return;
  addFx(s, 'death', pid, { prev: p.weapon });
  p.eliminated = true;
  p.weapon = null;
  p.bonusDamage = 0;
  p.sniper = false;
  p.prostrated = false;
  if (p.armor) discardCard(s, p.armor.card);
  p.armor = null;
  for (const c of [...p.hand, ...p.curses, ...p.blessings]) discardCard(s, c);
  p.hand = [];
  p.curses = [];
  p.blessings = [];
  log(s, `💀 ${p.name} ha sido eliminado.`, 'elim');
}
