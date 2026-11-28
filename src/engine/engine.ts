// Motor de reglas: crea partidas, valida y aplica acciones, y hace avanzar el juego
// hasta que alguien tenga que decidir algo (state.prompt).
//
// Uso:  let s = createGame(setup);  s = applyAction(s, jugador, accion);
// applyAction nunca modifica el estado que recibe: devuelve uno nuevo.

import type { Action, Attack, CardInstance, GameSetup, GameState, PlayerId, Player, Task } from './types';
import {
  addFx,
  alive,
  declareAttacks,
  discardCard,
  drawCards,
  hasStatus,
  log,
  loseHp,
  destroyArmor,
  opponents,
  proximity,
  queueTask,
  removeFromHand,
  rollWeapon,
  setWeapon,
} from './core';
import { buildDeck, getCardDef, STAYS_IN_PLAY, type CardDef } from './cards';
import { randInt, shuffle } from './rng';
import { weaponDef } from './weapons';

export class GameError extends Error {}

// ============================================================ creación

export function createGame(setup: GameSetup): GameState {
  const n = setup.players.length;
  if (n < 2 || n > 6) throw new GameError('El juego es de 2 a 6 jugadores.');
  const seed = setup.seed ?? Math.floor(Math.random() * 2 ** 31);
  const options = {
    startingHp: 10,
    handSize: 5,
    maxHand: 7,
    logLimit: 400,
    maxTurns: 0,
    ...setup.options,
    seed,
  };
  const deck = buildDeck(setup.deckCounts);
  if (deck.length < n * options.handSize)
    throw new GameError(`La baraja tiene muy pocas cartas (${deck.length}): necesitas al menos ${n * options.handSize} para ${n} jugadores.`);
  const s: GameState = {
    version: 1,
    options,
    players: setup.players.map(
      (p, id): Player => ({
        id,
        name: p.name || `Jugador ${id + 1}`,
        isBot: p.isBot,
        hp: options.startingHp,
        hand: [],
        weapon: null,
        armor: null,
        curses: [],
        blessings: [],
        bonusDamage: 0,
        sniper: false,
        prostrated: false,
        eliminated: false,
      }),
    ),
    deck,
    discard: [],
    turn: { player: 0, number: 1, phase: 'start', canAttack: true, attacksLeft: 1, tempWeapon: false },
    stack: [],
    buffer: [],
    prompt: null,
    result: null,
    rng: seed,
    seq: 0,
    log: [],
    fx: [],
    lastRoll: null,
    stats: { turns: 1, rolls: 0, damageByWeapon: {}, cardsPlayed: {} },
  };
  shuffle(s, s.deck);
  for (const p of s.players) drawCards(s, p.id, options.handSize);
  s.turn.player = setup.firstPlayer ?? randInt(s, n);
  log(s, `Empieza la partida (${n} jugadores, semilla ${seed}).`);
  log(s, `— Turno 1: ${s.players[s.turn.player].name} —`, 'turn');
  addFx(s, 'turn', s.turn.player);
  advance(s);
  return s;
}

// ============================================================ consultas (para UI y bots)

/** ¿Quién tiene que decidir ahora? */
export function currentActor(s: GameState): PlayerId | null {
  return s.result || !s.prompt ? null : s.prompt.player;
}

/** Objetivos válidos para una carta de objetivo único. */
export function cardTargets(s: GameState, pid: PlayerId, def: CardDef): PlayerId[] {
  let list: PlayerId[];
  switch (def.target) {
    case 'opponent':
      list = opponents(s, pid).map((p) => p.id);
      break;
    case 'farOpponent':
      list = opponents(s, pid)
        .filter((p) => proximity(s, pid, p.id) === 'lejano')
        .map((p) => p.id);
      break;
    case 'anyPlayer':
      list = alive(s).map((p) => p.id);
      break;
    default:
      return [];
  }
  if (def.validTarget) list = list.filter((t) => def.validTarget!(s, pid, t));
  return list;
}

/** Objetivos válidos para el ataque de la Fase Atacar (respeta Fijado). */
export function attackTargets(s: GameState, pid: PlayerId): PlayerId[] {
  return applyFijado(
    s,
    opponents(s, pid).map((p) => p.id),
  );
}

/** Fijado: si puedes atacar a un jugador Fijado, tienes que atacarlo a él. */
function applyFijado(s: GameState, list: PlayerId[]): PlayerId[] {
  const fixed = list.filter((t) => hasStatus(s.players[t], 'fijado'));
  return fixed.length ? fixed : list;
}

/** Devuelve el motivo si la jugada no es válida, o null si sí lo es. */
export function checkPlay(s: GameState, pid: PlayerId, card: CardInstance, targets: PlayerId[]): string | null {
  const def = getCardDef(card.defId);
  if (def.type === 'defensa') return 'Las defensas solo se juegan para responder a un ataque.';
  if (!def.play) return 'Esta carta no se puede jugar.';
  if (def.canPlay && !def.canPlay(s, pid)) return `No puedes jugar ${def.name} ahora.`;
  switch (def.target) {
    case 'none':
    case 'self':
      return targets.length === 0 ? null : 'Esta carta no lleva objetivo.';
    case 'opponent':
    case 'farOpponent':
    case 'anyPlayer': {
      const valid = cardTargets(s, pid, def);
      if (valid.length === 0) return `${def.name} no tiene objetivos válidos.`;
      if (targets.length !== 1) return 'Elige 1 objetivo.';
      return valid.includes(targets[0]) ? null : 'Ese objetivo no es válido.';
    }
  }
}

/** Jugadas posibles (carta + objetivos) para un jugador en su Fase Jugar. */
export function legalPlays(s: GameState, pid: PlayerId): Extract<Action, { type: 'play' }>[] {
  const out: Extract<Action, { type: 'play' }>[] = [];
  for (const card of s.players[pid].hand) {
    const def = getCardDef(card.defId);
    if (def.type === 'defensa' || !def.play) continue;
    const combos: PlayerId[][] =
      def.target === 'none' || def.target === 'self' ? [[]] : cardTargets(s, pid, def).map((t) => [t]);
    for (const targets of combos)
      if (checkPlay(s, pid, card, targets) === null) out.push({ type: 'play', cardUid: card.uid, targets });
  }
  return out;
}

/** ¿Se puede jugar esta carta ahora (con algún objetivo)? */
export function isPlayable(s: GameState, pid: PlayerId, card: CardInstance): boolean {
  const pr = s.prompt;
  if (!pr || pr.kind !== 'play' || pr.player !== pid) return false;
  return legalPlays(s, pid).some((a) => a.cardUid === card.uid);
}

/** Cartas de Defensa que sirven contra este ataque. */
export function legalDefenses(s: GameState, pid: PlayerId, attack: Attack): CardInstance[] {
  return s.players[pid].hand.filter((card) => {
    const d = getCardDef(card.defId).defense;
    if (!d) return false;
    if (d.blocks && attack.unblockable) return false;
    if (d.isShield && attack.shieldProof) return false;
    if (d.needsTarget && defenseTargets(s, pid).length === 0) return false;
    return true;
  });
}

/** A quién se puede redirigir un Escudo Rebote: cualquier otro vivo, incluido el atacante. */
export function defenseTargets(s: GameState, pid: PlayerId): PlayerId[] {
  return opponents(s, pid).map((p) => p.id);
}

/** Todas las acciones válidas ahora para `pid` (sin descartes, que son combinatorios). */
export function legalActions(s: GameState, pid: PlayerId): Action[] {
  const pr = s.prompt;
  if (s.result || !pr || pr.player !== pid) return [];
  switch (pr.kind) {
    case 'weapon':
      return [{ type: 'roll' }, { type: 'skipRoll' }];
    case 'play':
      return [{ type: 'skipPlay' }, ...legalPlays(s, pid)];
    case 'chooseWeapon':
      return pr.weapons.map((weapon) => ({ type: 'chooseWeapon', weapon }));
    case 'attack':
      return [{ type: 'endTurn' }, ...attackTargets(s, pid).map((target) => ({ type: 'attack' as const, target }))];
    case 'defend': {
      const out: Action[] = [{ type: 'noDefense' }];
      for (const card of legalDefenses(s, pid, pr.attack)) {
        if (getCardDef(card.defId).defense!.needsTarget)
          for (const t of defenseTargets(s, pid)) out.push({ type: 'defend', cardUid: card.uid, target: t });
        else out.push({ type: 'defend', cardUid: card.uid });
      }
      return out;
    }
    case 'discard':
      return [];
  }
}

export function validateAction(s: GameState, pid: PlayerId, a: Action): string | null {
  if (s.result) return 'La partida terminó.';
  const pr = s.prompt;
  if (!pr) return 'No hay nada que decidir ahora.';
  if (pr.player !== pid) return `No te toca: está decidiendo ${s.players[pr.player].name}.`;
  const p = s.players[pid];
  switch (a.type) {
    case 'roll':
    case 'skipRoll':
      return pr.kind === 'weapon' ? null : 'No estás en la Fase Arma.';
    case 'skipPlay':
      return pr.kind === 'play' ? null : 'No estás en la Fase Jugar.';
    case 'play': {
      if (pr.kind !== 'play') return 'No estás en la Fase Jugar.';
      const card = p.hand.find((c) => c.uid === a.cardUid);
      if (!card) return 'Esa carta no está en tu mano.';
      return checkPlay(s, pid, card, a.targets);
    }
    case 'chooseWeapon':
      if (pr.kind !== 'chooseWeapon') return 'No tienes que elegir un arma.';
      return pr.weapons.includes(a.weapon) ? null : 'Esa arma no está en el Cofre.';
    case 'attack':
      if (pr.kind !== 'attack') return 'No estás en la Fase Atacar.';
      return attackTargets(s, pid).includes(a.target) ? null : 'Ese objetivo no es válido.';
    case 'endTurn':
      return pr.kind === 'attack' ? null : 'No estás en la Fase Atacar.';
    case 'defend': {
      if (pr.kind !== 'defend') return 'No te están atacando.';
      const card = legalDefenses(s, pid, pr.attack).find((c) => c.uid === a.cardUid);
      if (!card) return 'Esa defensa no sirve contra este ataque.';
      if (getCardDef(card.defId).defense!.needsTarget) {
        if (a.target === undefined || !defenseTargets(s, pid).includes(a.target))
          return 'Elige a quién redirigir el ataque.';
      }
      return null;
    }
    case 'noDefense':
      return pr.kind === 'defend' ? null : 'No te están atacando.';
    case 'discard': {
      if (pr.kind !== 'discard') return 'No tienes que descartar.';
      const uids = new Set(a.cardUids);
      if (uids.size !== a.cardUids.length) return 'Cartas repetidas.';
      if (uids.size !== pr.count) return `Tienes que descartar ${pr.count} carta(s).`;
      if (![...uids].every((u) => p.hand.some((c) => c.uid === u))) return 'Esa carta no está en tu mano.';
      return null;
    }
  }
}

// ============================================================ aplicar acciones

export function applyAction(state: GameState, pid: PlayerId, action: Action): GameState {
  const err = validateAction(state, pid, action);
  if (err) throw new GameError(err);
  const s = structuredClone(state);
  const p = s.players[pid];
  const pr = s.prompt!;
  s.prompt = null;

  switch (action.type) {
    case 'roll':
      if (p.weapon) {
        s.turn.canAttack = false;
        log(s, `${p.name} lanza el dado estando armado: pierde su Fase de Ataque.`, 'weapon');
      }
      rollWeapon(s, pid);
      drawCards(s, pid, 1);
      s.turn.phase = 'play';
      break;
    case 'skipRoll':
      drawCards(s, pid, 1);
      s.turn.phase = 'play';
      break;
    case 'skipPlay':
      s.turn.phase = 'attack';
      break;
    case 'play':
      doPlay(s, pid, action.cardUid, action.targets);
      break;
    case 'chooseWeapon': {
      const wd = weaponDef(action.weapon);
      setWeapon(s, pid, action.weapon);
      s.turn.tempWeapon = true;
      log(s, `🗝️ ${p.name} toma ${wd.icon} ${wd.name} del Cofre hasta el final del turno.`, 'weapon');
      break;
    }
    case 'attack':
      s.turn.attacksLeft -= 1;
      if (s.turn.attacksLeft <= 0) s.turn.phase = 'discard';
      declareAttacks(s, pid, [action.target], { label: 'Ataque' });
      break;
    case 'endTurn':
      s.turn.phase = 'discard';
      break;
    case 'defend':
      doDefend(s, pid, (pr as Extract<typeof pr, { kind: 'defend' }>).attack, action.cardUid, action.target);
      break;
    case 'noDefense':
      queueTask(s, { t: 'hit', attack: (pr as Extract<typeof pr, { kind: 'defend' }>).attack });
      break;
    case 'discard':
      for (const uid of action.cardUids) discardCard(s, removeFromHand(p, uid));
      log(s, `${p.name} descarta ${action.cardUids.length} carta(s).`);
      nextTurn(s);
      break;
  }
  advance(s);
  return s;
}

function doPlay(s: GameState, pid: PlayerId, uid: string, targets: PlayerId[]): void {
  const p = s.players[pid];
  const card = removeFromHand(p, uid);
  const def = getCardDef(card.defId);
  s.turn.phase = 'attack'; // solo 1 carta por turno; luego Fase Atacar
  s.stats.cardsPlayed[def.id] = (s.stats.cardsPlayed[def.id] ?? 0) + 1;
  const names = [...new Set(targets)].map((t) => s.players[t].name).join(' y ');
  log(s, `🃏 ${p.name} juega ${def.name}${names ? ` → ${names}` : ''}.`, 'card');
  addFx(s, 'card', pid, { defId: def.id, targets });
  if (!STAYS_IN_PLAY.has(def.type)) discardCard(s, card);
  def.play!(s, pid, targets, card);
}

function doDefend(s: GameState, pid: PlayerId, attack: Attack, uid: string, target?: PlayerId): void {
  const p = s.players[pid];
  const card = removeFromHand(p, uid);
  const def = getCardDef(card.defId);
  const d = def.defense!;
  discardCard(s, card);
  s.stats.cardsPlayed[def.id] = (s.stats.cardsPlayed[def.id] ?? 0) + 1;
  log(s, `${d.blocks ? '🛡️' : '💨'} ${p.name} responde con ${def.name}.`, 'card');
  if (d.blocks) {
    addFx(s, 'block', pid, { defId: def.id, target: attack.attacker });
    const attacker = s.players[attack.attacker];
    if (!attacker.eliminated && hasStatus(attacker, 'debilucho')) {
      log(s, `🥀 ${attacker.name} es Debilucho y le bloquearon el ataque.`, 'damage');
      queueTask(s, { t: 'loseHp', player: attacker.id, amount: 1, cause: 'Debilucho' });
    }
  } else {
    addFx(s, 'dodge', pid, { defId: def.id, target: attack.attacker });
  }
  if (d.isShield && weaponDef(p.weapon).lostOnShield) {
    log(s, `${p.name} usó un escudo con la Daga en mano: la Daga vuelve al Cofre.`, 'weapon');
    setWeapon(s, pid, null);
  }
  d.resolve?.(s, pid, attack, target);
}

// ============================================================ bucle principal

function flush(s: GameState): void {
  if (s.buffer.length) {
    s.stack.unshift(...s.buffer);
    s.buffer = [];
  }
}

/** Resuelve todo lo pendiente hasta que alguien tenga que decidir o la partida termine.
 *  Exportada para herramientas (modo dev); el juego normal la llama solo. */
export function advance(s: GameState): void {
  for (let guard = 0; guard < 100000; guard++) {
    if (s.result) {
      s.prompt = null;
      return;
    }
    flush(s);
    if (alive(s).length === 0) {
      endGame(s);
      continue;
    }
    if (s.prompt) return;
    if (s.stack.length) {
      runTask(s, s.stack.shift()!);
      continue;
    }
    if (alive(s).length <= 1) {
      endGame(s);
      continue;
    }
    const cur = s.players[s.turn.player];
    if (cur.eliminated) {
      nextTurn(s);
      continue;
    }
    switch (s.turn.phase) {
      case 'start':
        if (cur.prostrated) {
          cur.prostrated = false;
          addFx(s, 'skip', cur.id);
          log(s, `😵 ${cur.name} está Postrado y pierde este turno.`, 'turn');
          nextTurn(s);
        } else s.turn.phase = 'weapon';
        continue;
      case 'weapon':
        s.prompt = { kind: 'weapon', player: cur.id };
        return;
      case 'play':
        s.prompt = { kind: 'play', player: cur.id };
        return;
      case 'attack':
        if (!s.turn.canAttack || s.turn.attacksLeft <= 0 || opponents(s, cur.id).length === 0) {
          s.turn.phase = 'discard';
          continue;
        }
        s.prompt = { kind: 'attack', player: cur.id, remaining: s.turn.attacksLeft };
        return;
      case 'discard': {
        const extra = cur.hand.length - s.options.maxHand;
        if (extra > 0) {
          s.prompt = { kind: 'discard', player: cur.id, count: extra };
          return;
        }
        nextTurn(s);
        continue;
      }
    }
  }
  throw new Error('El motor no terminó de resolver (¿bucle infinito?).');
}

function runTask(s: GameState, task: Task): void {
  switch (task.t) {
    case 'attack':
      return runAttack(s, task.attack);
    case 'hit':
      return runHit(s, task.attack);
    case 'loseHp':
      return loseHp(s, task.player, task.amount, task.cause);
  }
}

function runAttack(s: GameState, atk: Attack): void {
  const a = s.players[atk.attacker];
  const t = s.players[atk.target];
  if (a.eliminated || t.eliminated) {
    log(s, `El ataque de ${a.name} a ${t.name} se pierde.`, 'attack');
    return;
  }
  const w = weaponDef(atk.weapon);
  log(s, `⚔️ ${a.name} → ${t.name}: ${atk.label} con ${w.icon} ${w.name} (${atk.proximity}), ${atk.damage} de daño.`, 'attack');
  addFx(s, 'attack', a.id, {
    target: t.id,
    weapon: atk.weapon,
    amount: atk.damage,
    label: atk.label,
    proximity: atk.proximity,
  });
  if (legalDefenses(s, t.id, atk).length === 0) queueTask(s, { t: 'hit', attack: atk });
  else s.prompt = { kind: 'defend', player: t.id, attack: atk };
}

function runHit(s: GameState, atk: Attack): void {
  const t = s.players[atk.target];
  if (t.eliminated) return;
  let dmg = atk.damage;
  if (dmg <= 0) {
    log(s, `${t.name} no recibe daño.`, 'attack');
    return;
  }
  if (t.armor && atk.ignoresArmor) log(s, `🪵 El Garrote ignora la armadura de ${t.name}.`, 'attack');
  else if (t.armor) {
    const absorbed = Math.min(t.armor.pa, dmg);
    addFx(s, 'armor', t.id, { amount: absorbed, before: t.armor.pa, after: t.armor.pa - absorbed });
    t.armor.pa -= absorbed;
    dmg -= absorbed;
    log(s, `🛡️ La armadura de ${t.name} absorbe ${absorbed} (le quedan ${t.armor.pa} PA).`, 'attack');
    if (t.armor.pa <= 0) {
      log(s, `La ${getCardDef(t.armor.card.defId).name} de ${t.name} se rompe.`, 'attack');
      destroyArmor(s, t.id);
    }
  }
  if (dmg > 0) {
    const key = atk.weapon ?? 'punos';
    s.stats.damageByWeapon[key] = (s.stats.damageByWeapon[key] ?? 0) + dmg;
    loseHp(s, t.id, dmg, atk.label);
  }
}

function nextTurn(s: GameState): void {
  const prev = s.players[s.turn.player];
  if (s.turn.tempWeapon && !prev.eliminated && prev.weapon) {
    log(s, `🗝️ ${prev.name} devuelve su arma temporal al Cofre.`, 'weapon');
    setWeapon(s, prev.id, null);
  }
  const n = s.players.length;
  let next = s.turn.player;
  for (let i = 1; i <= n; i++) {
    const c = (s.turn.player + i) % n;
    if (!s.players[c].eliminated) {
      next = c;
      break;
    }
  }
  s.turn = { player: next, number: s.turn.number + 1, phase: 'start', canAttack: true, attacksLeft: 1, tempWeapon: false };
  s.stats.turns = s.turn.number;
  if (s.options.maxTurns && s.turn.number > s.options.maxTurns) {
    s.result = { winner: null, reason: `Se alcanzó el límite de ${s.options.maxTurns} turnos.` };
    return;
  }
  log(s, `— Turno ${s.turn.number}: ${s.players[next].name} —`, 'turn');
  addFx(s, 'turn', next);
}

function endGame(s: GameState): void {
  const left = alive(s);
  s.prompt = null;
  if (left.length === 1) {
    s.result = { winner: left[0].id, reason: `${left[0].name} es el último en pie.` };
    log(s, `🏆 ¡${left[0].name} gana la partida!`, 'elim');
  } else {
    s.result = { winner: null, reason: 'Empate: los últimos jugadores cayeron a la vez.' };
    log(s, '🤝 Empate: no queda nadie en pie.', 'elim');
  }
}
