// ============================================================================
//  CARTAS DEL MAZO
// ============================================================================
//  Para agregar o cambiar una carta:
//   1. Agrega/edita su entrada en CARDS (id único en minúsculas_con_guiones).
//   2. `copies` = cuántas hay en el mazo. `text` = lo que se lee en la carta.
//   3. `target` dice a quién apunta (ver TargetKind en types.ts).
//   4. `play` hace el efecto usando las funciones de core.ts.
//   5. Anótala en REGLAS.md y, si puedes, agrega un test en tests/.
//  Los bots aprenden solos a usar cartas nuevas: simulan la jugada y miran el resultado.
// ============================================================================

import type { Attack, CardInstance, CardType, GameState, PlayerId, TargetKind } from './types';
import {
  addStatus,
  alive,
  declareAttacks,
  destroyArmor,
  drawCards,
  equipArmor,
  hasStatus,
  heal,
  healTo,
  log,
  makeAttack,
  applyAttackPenalty,
  opponents,
  proximity,
  queueTask,
  removeStatus,
  setWeapon,
} from './core';

export interface DefenseSpec {
  blocks: boolean; // ¿cuenta como bloqueo? (Rompe Escudos lo impide, Debilucho lo castiga)
  isShield: boolean; // ¿es una carta de Escudo? (Mangual lo ignora, Daga se pierde)
  needsTarget?: boolean; // Escudo Rebote: elige a quién redirigir
  resolve?: (s: GameState, defender: PlayerId, attack: Attack, target?: PlayerId) => void;
}

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  copies: number;
  icon: string; // emoji temporal hasta tener arte
  text: string;
  target: TargetKind;
  armor?: number; // PA de las armaduras
  /** Condición extra para poder jugarla (además de tener objetivos). */
  canPlay?: (s: GameState, pid: PlayerId) => boolean;
  /** Filtra objetivos válidos. */
  validTarget?: (s: GameState, pid: PlayerId, target: PlayerId) => boolean;
  /** Efecto al jugarla en tu Fase Jugar. */
  play?: (s: GameState, pid: PlayerId, targets: PlayerId[], card: CardInstance) => void;
  /** Solo cartas de Defensa. */
  defense?: DefenseSpec;
  /** Maldiciones y bendiciones: qué hace mientras está activa (sin la instrucción de cómo jugarla). */
  effect?: string;
}

const P = (s: GameState, id: PlayerId) => s.players[id];

export const CARDS: CardDef[] = [
  // ---------------------------------------------------------------- ATAQUE
  {
    id: 'ataque_simple',
    name: 'Ataque Simple',
    type: 'ataque',
    copies: 7,
    icon: '⚔️',
    text: 'Ataca a cualquier jugador.',
    target: 'opponent',
    play: (s, pid, [t]) => declareAttacks(s, pid, [t], { label: 'Ataque Simple' }),
  },
  {
    id: 'ataque_cercano',
    name: 'Ataque Cercano',
    type: 'ataque',
    copies: 4,
    icon: '🌀',
    text: 'Ataca a todos tus jugadores cercanos.',
    target: 'none',
    canPlay: (s, pid) => opponents(s, pid).some((q) => proximity(s, pid, q.id) === 'cercano'),
    play: (s, pid) => {
      const targets = opponents(s, pid)
        .filter((q) => proximity(s, pid, q.id) === 'cercano')
        .map((q) => q.id);
      declareAttacks(s, pid, targets, { label: 'Ataque Cercano' });
    },
  },
  {
    id: 'ataque_lejano',
    name: 'Ataque Lejano',
    type: 'ataque',
    copies: 4,
    icon: '🎯',
    text: 'Ataca a 1 jugador lejano. El daño se duplica.',
    target: 'farOpponent',
    play: (s, pid, [t]) => declareAttacks(s, pid, [t], { label: 'Ataque Lejano', multiplier: 2 }),
  },
  {
    id: 'ataque_doble',
    name: 'Ataque Doble',
    type: 'ataque',
    copies: 3,
    icon: '✖️',
    text: 'Haz 2 ataques a 2 jugadores distintos. Si solo queda 1 rival, ambos van a él.',
    target: 'twoOpponents',
    play: (s, pid, targets) => declareAttacks(s, pid, targets, { label: 'Ataque Doble' }),
  },

  // ---------------------------------------------------------------- DEFENSA
  {
    id: 'escudo',
    name: 'Escudo',
    type: 'defensa',
    copies: 5,
    icon: '🛡️',
    text: 'Bloquea un ataque. No sirve contra Mangual.',
    target: 'none',
    defense: { blocks: true, isShield: true },
  },
  {
    id: 'esquiva',
    name: 'Esquiva',
    type: 'defensa',
    copies: 4,
    icon: '💨',
    text: 'Esquiva un ataque: el daño se anula. No cuenta como bloqueo.',
    target: 'none',
    defense: { blocks: false, isShield: false },
  },
  {
    id: 'escudo_rebote',
    name: 'Escudo Rebote',
    type: 'defensa',
    copies: 2,
    icon: '↩️',
    text: 'Bloquea un ataque y redirígelo a otro jugador (puede ser el atacante). No sirve contra Mangual.',
    target: 'none',
    defense: {
      blocks: true,
      isShield: true,
      needsTarget: true,
      resolve: (s, pid, attack, target) => {
        if (target === undefined) return;
        const redirected: Attack = {
          ...attack,
          attacker: pid, // quien rebota pasa a ser el atacante
          target,
          proximity: proximity(s, pid, target),
          unblockable: hasStatus(P(s, pid), 'rompe_escudos'),
          label: 'Escudo Rebote',
        };
        log(s, `↩️ ${P(s, pid).name} redirige el golpe a ${P(s, target).name}.`, 'attack');
        queueTask(s, { t: 'attack', attack: redirected });
      },
    },
  },
  {
    id: 'contraataque',
    name: 'Contraataque',
    type: 'defensa',
    copies: 3,
    icon: '🔁',
    text: 'Bloquea un ataque y ataca de inmediato al atacante con tu arma.',
    target: 'none',
    defense: {
      blocks: true,
      isShield: false,
      resolve: (s, pid, attack) => {
        if (P(s, attack.attacker).eliminated) return;
        queueTask(s, { t: 'attack', attack: makeAttack(s, pid, attack.attacker, { label: 'Contraataque' }) });
        applyAttackPenalty(s, pid);
      },
    },
  },

  // ---------------------------------------------------------------- EVENTO
  // (v0.2: se quitó la carta Desarmado, que devolvía el arma de un rival al Cofre.)
  {
    id: 'trueque',
    name: 'Trueque o Robo',
    type: 'evento',
    copies: 2,
    icon: '🔄',
    text: 'Intercambia tu arma con la de otro jugador. Si no tienes arma, se la robas.',
    target: 'opponent',
    play: (s, pid, [t]) => {
      const me = P(s, pid);
      const other = P(s, t);
      const [mine, theirs] = [me.weapon, other.weapon];
      setWeapon(s, pid, theirs);
      setWeapon(s, t, mine);
      log(s, `${me.name} y ${other.name} intercambian armas.`, 'weapon');
    },
  },
  {
    id: 'rotacion',
    name: 'Rotación',
    type: 'evento',
    copies: 1,
    icon: '♻️',
    text: 'Cada jugador pasa su arma al siguiente jugador en orden de turno.',
    target: 'none',
    play: (s) => {
      const ring = alive(s);
      const weapons = ring.map((p) => p.weapon);
      ring.forEach((p, i) => setWeapon(s, p.id, weapons[(i - 1 + ring.length) % ring.length]));
      log(s, 'Todas las armas rotan al siguiente jugador.', 'weapon');
    },
  },
  {
    id: 'reajuste',
    name: 'Reajuste',
    type: 'evento',
    copies: 1,
    icon: '⚖️',
    text: 'Todos los jugadores con más PV que tú quedan desarmados. (Única en el mazo)',
    target: 'none',
    play: (s, pid) => {
      const me = P(s, pid);
      const hit = alive(s).filter((q) => q.hp > me.hp && q.weapon);
      for (const q of hit) setWeapon(s, q.id, null);
      log(s, hit.length ? `Quedan desarmados: ${hit.map((q) => q.name).join(', ')}.` : 'Nadie queda desarmado.', 'weapon');
    },
  },
  {
    id: 'sin_camiseta',
    name: 'Sin Camiseta',
    type: 'evento',
    copies: 2,
    icon: '👕',
    text: 'Destruye todas las armaduras en juego.',
    target: 'none',
    play: (s) => {
      const withArmor = alive(s).filter((q) => q.armor);
      for (const q of withArmor) destroyArmor(s, q.id);
      log(s, withArmor.length ? `Se destruyen ${withArmor.length} armaduras.` : 'No había armaduras.', 'card');
    },
  },

  // ---------------------------------------------------------------- ARMADURA
  ...(
    [
      ['armadura_laton', 'Armadura de Latón', 3, 2],
      ['armadura_acero', 'Armadura de Acero', 2, 3],
      ['armadura_magica', 'Armadura Mágica', 1, 5],
    ] as const
  ).map(
    ([id, name, copies, pa]): CardDef => ({
      id,
      name,
      type: 'armadura',
      copies,
      icon: pa >= 5 ? '✨' : pa >= 3 ? '🥋' : '🦺',
      text: `Equípala: +${pa} PA. Los PA absorben daño antes que los PV. No puedes jugarla si ya tienes armadura.`,
      target: 'self',
      armor: pa,
      canPlay: (s, pid) => !P(s, pid).armor,
      play: (s, pid, _t, card) => {
        equipArmor(s, pid, card, pa);
        log(s, `${P(s, pid).name} se equipa ${name} (${pa} PA).`, 'card');
      },
    }),
  ),

  // ---------------------------------------------------------------- MISTERIO
  {
    id: 'elixir_de_vida',
    name: 'Elixir de Vida',
    type: 'misterio',
    copies: 1,
    icon: '🧪',
    text: 'Si tienes menos de 10 PV, subes a 10.',
    target: 'self',
    play: (s, pid) => healTo(s, pid, 10),
  },
  {
    id: 'piedras',
    name: 'Piedras',
    type: 'misterio',
    copies: 3,
    icon: '🪨',
    text: 'Quita 1 PV a un jugador. No es un ataque: no se defiende e ignora la armadura.',
    target: 'opponent',
    play: (s, _pid, [t]) => queueTask(s, { t: 'loseHp', player: t, amount: 1, cause: 'Piedras' }),
  },
  {
    id: 'pocima_curativa',
    name: 'Pócima Curativa',
    type: 'misterio',
    copies: 3,
    icon: '❤️‍🩹',
    text: 'Cura 2 PV. Puedes pasar de 10.',
    target: 'self',
    play: (s, pid) => heal(s, pid, 2),
  },
  {
    id: 'contagioso',
    name: 'Contagioso',
    type: 'misterio',
    copies: 1,
    icon: '🦠',
    text: 'Pasa todas tus maldiciones a otro jugador.',
    target: 'opponent',
    play: (s, pid, [t]) => {
      const me = P(s, pid);
      const curses = me.curses;
      me.curses = [];
      for (const c of curses) addStatus(s, t, c, 'curse');
      log(s, curses.length ? `${me.name} contagia ${curses.length} maldición(es) a ${P(s, t).name}.` : 'No tenía maldiciones.', 'card');
    },
  },
  {
    id: 'pocima_normalidad',
    name: 'Pócima de Normalidad',
    type: 'misterio',
    copies: 1,
    icon: '🫗',
    text: 'Pierdes todas tus bendiciones y maldiciones.',
    target: 'self',
    play: (s, pid) => {
      const me = P(s, pid);
      for (const c of [...me.curses, ...me.blessings]) removeStatus(s, me, c.defId);
      log(s, `${me.name} vuelve a la normalidad.`, 'card');
    },
  },
  {
    id: 'regalo_del_cielo',
    name: 'Regalo del Cielo',
    type: 'misterio',
    copies: 7,
    icon: '🎁',
    text: 'Roba 2 cartas.',
    target: 'self',
    play: (s, pid) => {
      const n = drawCards(s, pid, 2);
      log(s, `${P(s, pid).name} roba ${n} carta(s).`, 'card');
    },
  },

  // ---------------------------------------------------------------- MALDICIÓN
  ...(
    [
      ['fijado', 'Fijado', 1, '📌', 'Todos deben incluirte en sus ataques si pueden.'],
      ['relegado', 'Relegado', 1, '🏝️', 'Eres lejano para todos. Reemplaza a Vecino.'],
      ['vecino', 'Vecino', 1, '🏠', 'Eres cercano para todos. Reemplaza a Relegado.'],
      ['debilucho', 'Debilucho', 2, '🥀', 'Cuando te bloquean un ataque, pierdes 1 PV.'],
    ] as const
  ).map(
    ([id, name, copies, icon, text]): CardDef => ({
      id,
      name,
      type: 'maldicion',
      copies,
      icon,
      text: `${text} Ponla a cualquier jugador.`,
      effect: text,
      target: 'anyPlayer',
      validTarget: (s, _pid, t) => !hasStatus(P(s, t), id),
      play: (s, _pid, [t], card) => {
        addStatus(s, t, card, 'curse');
        log(s, `☠️ ${P(s, t).name} recibe la maldición ${name}.`, 'card');
      },
    }),
  ),

  // ---------------------------------------------------------------- BENDICIÓN
  ...(
    [
      ['super_fuerte', 'Super Fuerte', 2, '💪', 'Tus ataques hacen +1 de daño.'],
      ['rompe_escudos', 'Rompe Escudos', 1, '🔨', 'Tus ataques no se pueden bloquear (sí esquivar).'],
      ['kamikaze', 'Kamikaze', 1, '💣', 'Cada vez que pierdes PV, todos los demás pierden 1 PV.'],
    ] as const
  ).map(
    ([id, name, copies, icon, text]): CardDef => ({
      id,
      name,
      type: 'bendicion',
      copies,
      icon,
      text: `${text} Solo para ti.`,
      effect: text,
      target: 'self',
      canPlay: (s, pid) => !hasStatus(P(s, pid), id),
      play: (s, pid, _t, card) => {
        addStatus(s, pid, card, 'blessing');
        log(s, `✨ ${P(s, pid).name} recibe la bendición ${name}.`, 'card');
      },
    }),
  ),
];

const BY_ID = new Map(CARDS.map((c) => [c.id, c]));
if (BY_ID.size !== CARDS.length) throw new Error('Hay ids de carta repetidos en cards.ts');

/** Carta boca abajo: lo que ve un jugador online de las manos ajenas y del mazo. */
export const HIDDEN_CARD: CardDef = {
  id: 'oculta',
  name: 'Carta oculta',
  type: 'evento',
  copies: 0,
  icon: '',
  text: '',
  target: 'none',
};

export function getCardDef(defId: string): CardDef {
  if (defId === HIDDEN_CARD.id) return HIDDEN_CARD;
  const def = BY_ID.get(defId);
  if (!def) throw new Error(`Carta desconocida: ${defId}`);
  return def;
}

/** Tipos cuya carta se queda en juego (no va al descarte al jugarse). */
export const STAYS_IN_PLAY: ReadonlySet<CardType> = new Set(['armadura', 'maldicion', 'bendicion']);

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  ataque: 'Ataque',
  defensa: 'Defensa',
  evento: 'Evento',
  armadura: 'Armadura',
  misterio: 'Misterio',
  maldicion: 'Maldición',
  bendicion: 'Bendición',
};

/** Mazo completo sin barajar. */
export function buildDeck(): CardInstance[] {
  const deck: CardInstance[] = [];
  let k = 0;
  for (const def of CARDS) for (let i = 0; i < def.copies; i++) deck.push({ uid: `c${k++}`, defId: def.id });
  return deck;
}
