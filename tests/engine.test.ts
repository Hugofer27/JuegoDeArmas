import { describe, expect, it } from 'vitest';
import { applyAction, createGame, legalActions, legalDefenses } from '../src/engine/engine';
import { buildDeck, CARDS, getCardDef } from '../src/engine/cards';
import { proximity, eliminate } from '../src/engine/core';
import { chooseBotAction } from '../src/bots/bot';
import { makeRandom } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { arm, bless, curse, give, setup } from './helpers';

/** Pasa la Fase Arma sin lanzar y juega una carta. */
function play(s: GameState, uid: string, targets: number[] = []): GameState {
  if (s.prompt?.kind === 'weapon') s = applyAction(s, s.prompt.player, { type: 'skipRoll' });
  return applyAction(s, s.turn.player, { type: 'play', cardUid: uid, targets });
}

/** Pasa hasta la Fase de Ataque (si hace falta) y ataca a `target`. */
function attack(s: GameState, target: number): GameState {
  if (s.prompt?.kind === 'weapon') s = applyAction(s, s.prompt.player, { type: 'skipRoll' });
  if (s.prompt?.kind === 'play') s = applyAction(s, s.prompt.player, { type: 'skipPlay' });
  return applyAction(s, s.turn.player, { type: 'attack', target });
}

describe('mazo', () => {
  it('tiene 58 cartas con las copias de REGLAS.md', () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(58);
    const byType: Record<string, number> = {};
    for (const c of deck) byType[getCardDef(c.defId).type] = (byType[getCardDef(c.defId).type] ?? 0) + 1;
    expect(byType).toEqual({ astucia: 8, defensa: 14, evento: 10, armadura: 6, misterio: 11, maldicion: 5, bendicion: 4 });
    expect(CARDS.find((c) => c.id === 'reajuste')!.copies).toBe(1);
    expect(CARDS.find((c) => c.id === 'desarmado')!.copies).toBe(2);
    expect(CARDS.find((c) => c.id === 'rotacion')!.copies).toBe(1);
    expect(CARDS.find((c) => c.id === 'regalo_del_cielo')!.copies).toBe(2);
  });

  it('permite crear una partida con baraja personalizada', () => {
    const counts = { escudo: 10, pocima_curativa: 6, determinacion: 4 };
    const s = createGame({
      players: [{ name: 'A', isBot: false }, { name: 'B', isBot: false }],
      seed: 1,
      deckCounts: counts,
    });
    const total = s.deck.length + s.players.reduce((n, p) => n + p.hand.length, 0);
    expect(total).toBe(20);
    expect(s.deck.every((c) => c.defId in counts)).toBe(true);
  });

  it('no se puede jugar una Armadura si ya tienes una equipada', () => {
    let s = setup(2);
    s.players[0].armor = { card: { uid: 'x', defId: 'armadura_laton' }, pa: 2, max: 2 };
    const [b] = give(s, 0, 'armadura_acero');
    s = applyAction(s, 0, { type: 'skipRoll' });
    expect(s.prompt?.kind).toBe('play');
    expect(legalActions(s, 0).some((x) => x.type === 'play' && x.cardUid === b)).toBe(false);
    // sin armadura sí se puede
    s.players[0].armor = null;
    expect(legalActions(s, 0).some((x) => x.type === 'play' && x.cardUid === b)).toBe(true);
  });

  it('reparte 5 cartas y empieza en Fase Arma', () => {
    const s = createGame({ players: [{ name: 'A', isBot: false }, { name: 'B', isBot: false }], seed: 3 });
    expect(s.players.every((p) => p.hand.length === 5 && p.hp === 10 && p.weapon === null)).toBe(true);
    expect(s.prompt?.kind).toBe('weapon');
  });
});

describe('proximidad', () => {
  it('4 jugadores: vecinos cercanos, el de enfrente lejano', () => {
    const s = setup(4);
    expect(proximity(s, 0, 1)).toBe('cercano');
    expect(proximity(s, 0, 3)).toBe('cercano');
    expect(proximity(s, 0, 2)).toBe('lejano');
  });

  it('2 y 3 jugadores: todos cercanos', () => {
    expect(proximity(setup(2), 0, 1)).toBe('cercano');
    const s3 = setup(3);
    expect(proximity(s3, 0, 2)).toBe('cercano');
  });

  it('el círculo se cierra al eliminar a alguien', () => {
    const s = setup(4);
    eliminate(s, 1);
    expect(proximity(s, 0, 2)).toBe('cercano');
  });

  it('Relegado gana sobre Vecino y ambos son mutuos', () => {
    const s = setup(4);
    curse(s, 1, 'relegado');
    expect(proximity(s, 0, 1)).toBe('lejano');
    expect(proximity(s, 1, 0)).toBe('lejano');
    curse(s, 2, 'vecino');
    expect(proximity(s, 0, 2)).toBe('cercano');
    expect(proximity(s, 1, 2)).toBe('lejano');
  });
});

describe('daño y cartas de Astucia', () => {
  it('Espada a cercano: 3', () => {
    let s = setup(2);
    arm(s, 0, 'espada');
    s = attack(s, 1);
    expect(s.players[1].hp).toBe(7);
  });

  it('Arco a lejano: 3, con Francotirador 3 ×2 = 6, y +1 con Super Fuerte después de duplicar', () => {
    let s = setup(4);
    arm(s, 0, 'arco');
    const [f] = give(s, 0, 'francotirador');
    s = play(s, f);
    s = attack(s, 2);
    expect(s.players[2].hp).toBe(4);
    expect(s.players[0].sniper).toBe(false);

    let s2 = setup(4);
    arm(s2, 0, 'arco');
    bless(s2, 0, 'super_fuerte');
    const [f2] = give(s2, 0, 'francotirador');
    s2 = play(s2, f2);
    s2 = attack(s2, 2);
    expect(s2.players[2].hp).toBe(3);
  });

  it('Determinación suma +2 al siguiente ataque y se consume', () => {
    let s = setup(2);
    arm(s, 0, 'espada');
    const [d] = give(s, 0, 'determinacion');
    s = play(s, d);
    expect(s.players[0].bonusDamage).toBe(2);
    s = attack(s, 1);
    expect(s.players[1].hp).toBe(5);
    expect(s.players[0].bonusDamage).toBe(0);
  });

  it('Brincón permite realizar 2 ataques en el mismo turno', () => {
    let s = setup(3);
    arm(s, 0, 'espada');
    const [b] = give(s, 0, 'brincon');
    s = play(s, b);
    expect(s.prompt).toEqual({ kind: 'attack', player: 0, remaining: 2 });
    s = attack(s, 1);
    expect(s.players[1].hp).toBe(7);
    expect(s.prompt).toEqual({ kind: 'attack', player: 0, remaining: 1 });
    s = attack(s, 2);
    expect(s.players[2].hp).toBe(7);
    expect(s.turn.player).toBe(1);
  });

  it('la armadura absorbe y se rompe; el Garrote la ignora', () => {
    let s = setup(2);
    arm(s, 0, 'espada');
    s.players[1].armor = { card: { uid: 'x', defId: 'armadura_laton' }, pa: 2, max: 2 };
    s = attack(s, 1);
    expect(s.players[1].hp).toBe(9);
    expect(s.players[1].armor).toBeNull();

    let g = setup(2);
    arm(g, 0, 'garrote');
    g.players[1].armor = { card: { uid: 'y', defId: 'armadura_acero' }, pa: 3, max: 3 };
    g = attack(g, 1);
    expect(g.players[1].hp).toBe(8);
    expect(g.players[1].armor?.pa).toBe(3);
  });
});

describe('defensas', () => {
  function attackP1(weapon: Parameters<typeof arm>[2], defense: string[], setupFn?: (s: GameState) => void) {
    let s = setup(3);
    arm(s, 0, weapon);
    setupFn?.(s);
    const uids = give(s, 1, ...defense);
    s = applyAction(s, 0, { type: 'skipRoll' });
    s.players[0].hand = []; // P0 no tiene defensas que interrumpan el contraataque/rebote
    s = attack(s, 1);
    return { s, uids };
  }

  it('Mangual: Escudo y Escudo Rebote no sirven; Esquiva y Contraataque sí', () => {
    const { s } = attackP1('mangual', ['escudo', 'escudo_rebote', 'esquiva', 'contraataque']);
    expect(s.prompt?.kind).toBe('defend');
    const atk = (s.prompt as Extract<GameState['prompt'], { kind: 'defend' }>).attack;
    const ok = legalDefenses(s, 1, atk).map((c) => c.defId).sort();
    expect(ok).toEqual(['contraataque', 'esquiva']);
  });

  it('Rompe Escudos: solo se puede esquivar', () => {
    const { s } = attackP1('espada', ['escudo', 'escudo_rebote', 'esquiva', 'contraataque'], (g) =>
      bless(g, 0, 'rompe_escudos'),
    );
    const atk = (s.prompt as Extract<GameState['prompt'], { kind: 'defend' }>).attack;
    expect(legalDefenses(s, 1, atk).map((c) => c.defId)).toEqual(['esquiva']);
  });

  it('Escudo bloquea', () => {
    let { s, uids } = attackP1('espada', ['escudo']);
    s = applyAction(s, 1, { type: 'defend', cardUid: uids[0] });
    expect(s.players[1].hp).toBe(10);
  });

  it('Escudo Rebote puede devolver el golpe al atacante', () => {
    let { s, uids } = attackP1('espada', ['escudo_rebote']);
    s = applyAction(s, 1, { type: 'defend', cardUid: uids[0], target: 0 });
    expect(s.players[1].hp).toBe(10);
    expect(s.players[0].hp).toBe(7);
  });

  it('Contraataque: bloquea y pega con el arma del defensor', () => {
    let { s, uids } = attackP1(null, ['contraataque'], (g) => arm(g, 1, 'espada'));
    s = applyAction(s, 1, { type: 'defend', cardUid: uids[0] });
    expect(s.players[1].hp).toBe(10);
    expect(s.players[0].hp).toBe(7);
  });

  it('Contraataque con Hacha deja Postrado al defensor', () => {
    let { s, uids } = attackP1(null, ['contraataque'], (g) => arm(g, 1, 'hacha'));
    s = applyAction(s, 1, { type: 'defend', cardUid: uids[0] });
    // P1 era el siguiente: su turno se salta y juega P2
    expect(s.turn.player).toBe(2);
    expect(s.log.some((e) => e.text.includes('P1 está Postrado'))).toBe(true);
  });

  it('Debilucho: pierde 1 PV si le bloquean, no si le esquivan', () => {
    let { s, uids } = attackP1('espada', ['escudo'], (g) => curse(g, 0, 'debilucho'));
    s = applyAction(s, 1, { type: 'defend', cardUid: uids[0] });
    expect(s.players[0].hp).toBe(9);

    let r = attackP1('espada', ['esquiva'], (g) => curse(g, 0, 'debilucho'));
    r.s = applyAction(r.s, 1, { type: 'defend', cardUid: r.uids[0] });
    expect(r.s.players[0].hp).toBe(10);
  });

  it('Daga: usar un Escudo la devuelve al Cofre', () => {
    let { s, uids } = attackP1('espada', ['escudo'], (g) => arm(g, 1, 'daga'));
    s = applyAction(s, 1, { type: 'defend', cardUid: uids[0] });
    expect(s.players[1].weapon).toBeNull();
  });

  it('sin defensas válidas el golpe entra solo, sin preguntar', () => {
    const { s } = attackP1('espada', []);
    expect(s.prompt?.kind).not.toBe('defend');
    expect(s.players[1].hp).toBe(7);
  });
});

describe('turno y armas', () => {
  it('Hacha: pega 4 a cercano y tras atacar pierde su próximo turno', () => {
    let s = setup(2);
    arm(s, 0, 'hacha');
    s = attack(s, 1);
    expect(s.players[1].hp).toBe(6);
    expect(s.players[0].prostrated).toBe(true);
    // turno de P1
    expect(s.turn.player).toBe(1);
    s = applyAction(s, 1, { type: 'skipRoll' });
    s = applyAction(s, 1, { type: 'skipPlay' });
    s = applyAction(s, 1, { type: 'endTurn' });
    // P0 se salta y vuelve P1
    expect(s.turn.player).toBe(1);
    expect(s.players[0].prostrated).toBe(false);
  });

  it('lanzar el dado estando armado hace perder la Fase de Ataque, pero sí roba y juega carta', () => {
    let s = setup(2);
    arm(s, 0, 'espada');
    const [p] = give(s, 0, 'pocima_curativa');
    s = applyAction(s, 0, { type: 'roll' });
    expect(s.players[0].hand).toHaveLength(2); // robó 1 carta
    expect(s.prompt).toEqual({ kind: 'play', player: 0 }); // sí puede jugar carta
    s = applyAction(s, 0, { type: 'play', cardUid: p, targets: [] });
    expect(s.players[0].hp).toBe(14);
    expect(s.turn.player).toBe(1); // perdió la Fase de Ataque y pasó al siguiente
  });

  it('el dado roba el arma a quien la tenga', () => {
    let s = setup(6);
    const all = ['espada', 'daga', 'arco', 'hacha', 'mangual', 'garrote'] as const;
    all.forEach((w, i) => arm(s, i, w));
    s = applyAction(s, 0, { type: 'roll' });
    const w = s.lastRoll!.weapon;
    expect(s.players[0].weapon).toBe(w);
    expect(s.players.filter((p) => p.weapon === w)).toHaveLength(1);
  });

  it('límite de mano: descarta hasta 7', () => {
    let s = setup(2);
    give(s, 0, ...Array(8).fill('piedras'));
    s = applyAction(s, 0, { type: 'skipRoll' });
    s = applyAction(s, 0, { type: 'skipPlay' });
    s = applyAction(s, 0, { type: 'endTurn' });
    expect(s.prompt).toEqual({ kind: 'discard', player: 0, count: 2 });
    const uids = s.players[0].hand.slice(0, 2).map((c) => c.uid);
    s = applyAction(s, 0, { type: 'discard', cardUids: uids });
    expect(s.players[0].hand).toHaveLength(7);
    expect(s.turn.player).toBe(1);
  });

  it('mazo vacío: se rebaraja el descarte', () => {
    let s = setup(2);
    s.discard = s.deck;
    s.deck = [];
    s = applyAction(s, 0, { type: 'skipRoll' });
    expect(s.players[0].hand).toHaveLength(1);
    expect(s.deck.length + s.discard.length).toBe(57);
  });

  it('Fijado: los ataques en Fase de Ataque tienen que ir a él', () => {
    let s = setup(4);
    curse(s, 2, 'fijado');
    s = applyAction(s, 0, { type: 'skipRoll' });
    s = applyAction(s, 0, { type: 'skipPlay' });
    const attacks = legalActions(s, 0).filter((a) => a.type === 'attack') as Extract<
      ReturnType<typeof legalActions>[number],
      { type: 'attack' }
    >[];
    expect(attacks.map((a) => a.target)).toEqual([2]);
  });

  it('el eliminado devuelve su arma al Cofre', () => {
    let s = setup(3);
    arm(s, 0, 'espada');
    arm(s, 1, 'arco');
    s.players[1].hp = 2;
    s = attack(s, 1);
    expect(s.players[1].eliminated).toBe(true);
    expect(s.players[1].weapon).toBeNull();
  });
});

describe('cartas especiales', () => {
  it('Decidido: eliges un arma del Cofre, atacas con ella y la pierdes al final del turno', () => {
    let s = setup(2);
    const [d] = give(s, 0, 'decidido');
    s = play(s, d);
    expect(s.prompt?.kind).toBe('chooseWeapon');
    s = applyAction(s, 0, { type: 'chooseWeapon', weapon: 'espada' });
    expect(s.players[0].weapon).toBe('espada');
    s = attack(s, 1);
    expect(s.players[1].hp).toBe(7);
    expect(s.players[0].weapon).toBeNull(); // devuelta al Cofre al terminar el turno
    expect(s.turn.player).toBe(1);
  });

  it('Kamikaze en cadena puede acabar en empate', () => {
    let s = setup(2);
    bless(s, 0, 'kamikaze');
    bless(s, 1, 'kamikaze');
    s.players[0].hp = 1;
    s.players[1].hp = 1;
    const [a] = give(s, 0, 'piedras');
    s = play(s, a, [1]);
    expect(s.result?.winner).toBeNull();
  });

  it('Kamikaze en cadena termina sola con más vida', () => {
    let s = setup(3);
    bless(s, 0, 'kamikaze');
    bless(s, 1, 'kamikaze');
    const [a] = give(s, 0, 'piedras');
    s = play(s, a, [1]);
    expect(s.players.filter((p) => !p.eliminated).length).toBeLessThanOrEqual(1);
  });

  it('Elixir sube a 10 pero no baja; Pócima Curativa cura 4 y pasa de 10', () => {
    let s = setup(2);
    s.players[0].hp = 4;
    const [e] = give(s, 0, 'elixir_de_vida');
    s = play(s, e);
    expect(s.players[0].hp).toBe(10);

    let t = setup(2);
    const [p] = give(t, 0, 'pocima_curativa');
    t = play(t, p);
    expect(t.players[0].hp).toBe(14);
  });

  it('Relegado reemplaza a Vecino en el mismo jugador', () => {
    let s = setup(4);
    curse(s, 1, 'vecino');
    const [r] = give(s, 0, 'relegado');
    s = play(s, r, [1]);
    expect(s.players[1].curses.map((c) => c.defId)).toEqual(['relegado']);
  });

  it('Rotación pasa cada arma al siguiente jugador', () => {
    let s = setup(3);
    arm(s, 0, 'espada');
    arm(s, 1, 'arco');
    const [r] = give(s, 0, 'rotacion');
    s = play(s, r);
    expect(s.players.map((p) => p.weapon)).toEqual([null, 'espada', 'arco']);
  });

  it('Trueque con alguien sin arma: le das la tuya', () => {
    let s = setup(2);
    arm(s, 0, 'hacha');
    const [t] = give(s, 0, 'trueque');
    s = play(s, t, [1]);
    expect(s.players[0].weapon).toBeNull();
    expect(s.players[1].weapon).toBe('hacha');
  });

  it('Contagioso pasa las maldiciones', () => {
    let s = setup(2);
    curse(s, 0, 'debilucho');
    const [c] = give(s, 0, 'contagioso');
    s = play(s, c, [1]);
    expect(s.players[0].curses).toHaveLength(0);
    expect(s.players[1].curses.map((x) => x.defId)).toEqual(['debilucho']);
  });
});

describe('partidas completas con bots', () => {
  it('misma semilla + mismas acciones = misma partida', () => {
    const run = () => {
      let s = createGame({ players: [0, 1, 2].map((i) => ({ name: `B${i}`, isBot: true })), seed: 99, options: { maxTurns: 300 } });
      const rand = makeRandom(5);
      while (!s.result) s = applyAction(s, s.prompt!.player, chooseBotAction(s, s.prompt!.player, rand));
      return s;
    };
    expect(run().log).toEqual(run().log);
  });

  it('40 partidas de 2 a 6 bots terminan sin errores', () => {
    const rand = makeRandom(7);
    for (let g = 0; g < 40; g++) {
      const n = 2 + (g % 5);
      let s = createGame({
        players: Array.from({ length: n }, (_, i) => ({ name: `B${i}`, isBot: true })),
        seed: 1000 + g,
        options: { maxTurns: 400, logLimit: 0 },
      });
      let steps = 0;
      while (!s.result && steps++ < 20000) s = applyAction(s, s.prompt!.player, chooseBotAction(s, s.prompt!.player, rand));
      expect(s.result).not.toBeNull();
      // las cartas no se crean ni se pierden
      const inPlay = s.players.reduce(
        (n, p) => n + p.hand.length + p.curses.length + p.blessings.length + (p.armor ? 1 : 0),
        0,
      );
      expect(inPlay + s.deck.length + s.discard.length).toBe(58);
    }
  });
});

describe('online', () => {
  it('redactFor oculta manos ajenas y el mazo, pero no la propia', async () => {
    const { redactFor } = await import('../src/engine/redact');
    const s = createGame({ players: [0, 1, 2].map((i) => ({ name: `P${i}`, isBot: false })), seed: 4 });
    const v = redactFor(s, 1);
    expect(v.players[1].hand).toEqual(s.players[1].hand);
    expect(v.players[0].hand.every((c) => c.defId === 'oculta')).toBe(true);
    expect(v.players[0].hand).toHaveLength(s.players[0].hand.length);
    expect(v.deck.every((c) => c.defId === 'oculta')).toBe(true);
    expect(JSON.stringify(v)).not.toContain(s.players[0].hand[0].uid + '","defId":"' + s.players[0].hand[0].defId);
    // el invitado puede calcular sus jugadas con la vista oculta
    expect(() => legalActions(v, v.prompt!.player)).not.toThrow();
  });
});
