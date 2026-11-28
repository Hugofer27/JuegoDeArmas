// Tipos del motor de reglas. El estado (GameState) es JSON puro: se puede clonar,
// guardar y mandar por red. Nada de funciones ni clases dentro del estado.

export type PlayerId = number; // índice de asiento: 0..n-1, el turno va en orden creciente

export type WeaponId = 'espada' | 'daga' | 'arco' | 'hacha' | 'mangual' | 'garrote';

export type CardType =
  | 'astucia'
  | 'defensa'
  | 'evento'
  | 'armadura'
  | 'misterio'
  | 'maldicion'
  | 'bendicion';

export type Proximity = 'cercano' | 'lejano';

/** A quién apunta una carta al jugarla. */
export type TargetKind =
  | 'none' // sin objetivo
  | 'self' // a ti mismo
  | 'opponent' // 1 rival vivo
  | 'farOpponent' // 1 rival lejano
  | 'anyPlayer'; // cualquier jugador vivo, incluido tú

/** Una carta física concreta. `defId` apunta a su definición en cards.ts. */
export interface CardInstance {
  uid: string;
  defId: string;
}

export interface EquippedArmor {
  card: CardInstance;
  pa: number; // PA que le quedan
  max: number; // PA con los que se equipó
}

export interface Player {
  id: PlayerId;
  name: string;
  isBot: boolean;
  hp: number;
  hand: CardInstance[];
  weapon: WeaponId | null; // null = Puños
  armor: EquippedArmor | null;
  curses: CardInstance[];
  blessings: CardInstance[];
  bonusDamage: number; // Determinación: daño extra al siguiente ataque
  sniper: boolean; // Francotirador: ×2 al siguiente ataque lejano
  prostrated: boolean; // Postrado: pierde su próximo turno
  eliminated: boolean;
}

/** Un ataque ya declarado, esperando defensa o resolución. */
export interface Attack {
  attacker: PlayerId;
  target: PlayerId;
  damage: number; // daño antes de defensa y armadura
  weapon: WeaponId | null; // arma de origen (define los rasgos)
  proximity: Proximity;
  ignoresArmor: boolean; // Garrote
  shieldProof: boolean; // Mangual: Escudo y Escudo Rebote no sirven
  unblockable: boolean; // Rompe Escudos: nada lo bloquea (sí se puede esquivar)
  label: string; // nombre que se muestra: "Ataque Simple", "Contraataque"...
}

/** Trabajo pendiente del motor. Se procesa en orden; las cartas lo encolan. */
export type Task =
  | { t: 'attack'; attack: Attack } // abre la ventana de defensa del objetivo
  | { t: 'hit'; attack: Attack } // aplica el daño (armadura y PV)
  | { t: 'loseHp'; player: PlayerId; amount: number; cause: string }; // pérdida directa

/** Lo que el motor está esperando que alguien decida. */
export type Prompt =
  | { kind: 'weapon'; player: PlayerId }
  | { kind: 'play'; player: PlayerId }
  | { kind: 'chooseWeapon'; player: PlayerId; weapons: WeaponId[] }
  | { kind: 'attack'; player: PlayerId; remaining: number }
  | { kind: 'defend'; player: PlayerId; attack: Attack }
  | { kind: 'discard'; player: PlayerId; count: number };

export type TurnPhase = 'start' | 'weapon' | 'play' | 'attack' | 'discard';

export interface TurnState {
  player: PlayerId;
  number: number;
  phase: TurnPhase;
  canAttack: boolean; // false si lanzó el dado estando armado
  attacksLeft: number; // 1 por turno (2 con Brincón)
  tempWeapon: boolean; // Decidido: el arma vuelve al Cofre al final del turno
}

export type LogKind = 'turn' | 'attack' | 'damage' | 'heal' | 'weapon' | 'card' | 'elim' | 'info' | 'dev';

export interface LogEntry {
  id: number;
  turn: number;
  text: string;
  kind: LogKind;
}

/** Eventos para que la UI anime lo que pasó, en orden. No afectan las reglas. */
export type FxKind =
  | 'turn' // empieza el turno de `player`
  | 'skip' // `player` pierde el turno (Postrado)
  | 'card' // `player` juega la carta `defId`
  | 'attack' // `player` ataca a `target`
  | 'damage' // `player` pierde PV (before -> after)
  | 'heal' // `player` gana PV (before -> after)
  | 'armor' // la armadura de `player` absorbe (before -> after PA)
  | 'armorBreak' // se rompe la armadura de `player`
  | 'armorUp' // `player` se equipa armadura (after = PA)
  | 'block' // `player` bloquea con `defId`
  | 'dodge' // `player` esquiva con `defId`
  | 'roll' // `player` lanza el dado y saca `weapon` (robada a `from` si existe)
  | 'weapon' // el arma de `player` cambia de `prev` a `weapon`
  | 'status' // `player` recibe la maldición/bendición `defId`
  | 'prostrate' // `player` queda Postrado
  | 'death'; // `player` es eliminado

export interface Fx {
  id: number;
  kind: FxKind;
  player: PlayerId;
  target?: PlayerId;
  targets?: PlayerId[];
  amount?: number;
  before?: number;
  after?: number;
  defId?: string;
  weapon?: WeaponId | null;
  prev?: WeaponId | null;
  from?: PlayerId;
  label?: string;
  proximity?: Proximity;
  curse?: boolean;
}

export interface GameStats {
  turns: number;
  rolls: number;
  damageByWeapon: Record<string, number>; // daño a PV hecho con cada arma ('punos' incluido)
  cardsPlayed: Record<string, number>;
}

export interface GameResult {
  winner: PlayerId | null; // null = empate
  reason: string;
}

export interface GameOptions {
  seed: number;
  startingHp: number;
  handSize: number;
  maxHand: number;
  logLimit: number; // 0 = sin registro (simulaciones)
  maxTurns: number; // 0 = sin límite
}

export interface GameState {
  version: 1;
  options: GameOptions;
  players: Player[];
  deck: CardInstance[]; // el final del arreglo es el tope del mazo
  discard: CardInstance[];
  turn: TurnState;
  stack: Task[]; // índice 0 = lo próximo que se resuelve
  buffer: Task[]; // tareas recién encoladas; el motor las pasa al frente del stack
  prompt: Prompt | null;
  result: GameResult | null;
  rng: number; // estado del generador aleatorio (partidas reproducibles)
  seq: number; // contador de ids
  log: LogEntry[];
  fx: Fx[];
  lastRoll: { player: PlayerId; weapon: WeaponId; id: number } | null;
  stats: GameStats;
}

export type Action =
  | { type: 'roll' } // Fase Arma: lanzar el dado
  | { type: 'skipRoll' } // Fase Arma: no lanzar
  | { type: 'play'; cardUid: string; targets: PlayerId[] } // Fase Jugar
  | { type: 'skipPlay' } // Fase Jugar: no jugar carta
  | { type: 'chooseWeapon'; weapon: WeaponId } // Decidido: elegir arma del Cofre
  | { type: 'attack'; target: PlayerId } // Fase Atacar: atacar a un rival
  | { type: 'endTurn' } // Fase Atacar: no atacar y terminar turno
  | { type: 'defend'; cardUid: string; target?: PlayerId } // responder a un ataque
  | { type: 'noDefense' } // recibir el golpe
  | { type: 'discard'; cardUids: string[] }; // descartar hasta 7

export interface SeatSetup {
  name: string;
  isBot: boolean;
}

export interface GameSetup {
  players: SeatSetup[];
  seed?: number;
  firstPlayer?: PlayerId;
  deckCounts?: Record<string, number>; // baraja personalizada (id -> copias)
  options?: Partial<Omit<GameOptions, 'seed'>>;
}
