import { describe, expect, it } from 'vitest';
import { applyAction, createGame, legalActions, legalDefenses } from '../src/engine/engine';
import { buildDeck, CARDS, getCardDef } from '../src/engine/cards';
import { proximity, eliminate } from '../src/engine/core';
import { chooseBotAction } from '../src/bots/bot';
import { makeRandom } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { arm, bless, curse, give, setup } from './helpers';

/** P0 pasa la Fase Arma sin lanzar y juega una carta. */
function play(s: GameState, uid: string, targets: number[] = []): GameState {
  if (s.prompt?.kind === 'weapon') s = applyAction(s, s.prompt.player, { type: 'skipRoll' });
  return applyAction(s, s.turn.player, { type: 'play', cardUid: uid, targets });
}

describe('mazo', () => {
  it('tiene 66 cartas con las copias de REGLAS.md', () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(66);
    const byType: Record<string, number> = {};
    for (const c of deck) byType[getCardDef(c.defId).type] = (byType[getCardDef(c.defId).type] ?? 0) + 1;
    expect(byType).toEqual({ ataque: 18, defensa: 14, evento: 8, armadura: 6, misterio: 11, maldicion: 5, bendicion: 4 });
    expect(CARDS.find((c) => c.id === 'reajuste')!.copies).toBe(1);
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

describe('daño', () => {
  it('Espada a cercano: 3', () => {
    let s = setup(2);
    arm(s, 0, 'espada');
    const [a] = give(s, 0, 'ataque_simple');
    s = play(s, a, [1]);
    expect(s.players[1].hp).toBe(7);
  });

  it('Ataque Lejano con Arco: 3 ×2 = 6, y +1 con Super Fuerte después de duplicar', () => {
    let s = setup(4);
    arm(s, 0, 'arco');
    const [a] = give(s, 0, 'ataque_lejano');
    s = play(s, a, [2]);
    expect(s.players[2].hp).toBe(4);

    let s2 = setup(4);
    arm(s2, 0, 'arco');
    bless(s2, 0, 'super_fuerte');
    const [b] = give(s2, 0, 'ataque_lejano');
    s2 = play(s2, b, [2]);
    expect(s2.players[2].hp).toBe(3);
  });

  it('la armadura absorbe y se rompe; el Garrote la ignora', () => {
    let s = setup(2);
    arm(s, 0, 'espada');
    s.players[1].armor = { card: { uid: 'x', defId: 'armadura_laton' }, pa: 2, max: 2 };
    const [a] = give(s, 0, 'ataque_simple');
    s = play(s, a, [1]);
    expect(s.players[1].hp).toBe(9);
    expect(s.players[1].armor).toBeNull();

    let g = setup(2);
    arm(g, 0, 'garrote');
    g.players[1].armor = { card: { uid: 'y', defId: 'armadura_acero' }, pa: 3, max: 3 };
    const [b] = give(g, 0, 'ataque_simple');
    g = play(g, b, [1]);
    expect(g.players[1].hp).toBe(8);
    expect(g.players[1].armor?.pa).toBe(3);
  });

  it('Ataque Cercano golpea a los dos vecinos y no al de enfrente', () => {
    let s = setup(4);
    arm(s, 0, 'espada');
    const [a] = give(s, 0, 'ataque_cercano');
    s = play(s, a);
    expect(s.players.map((p) => p.hp)).toEqual([10, 7, 10, 7]);
  });

  it('Ataque Doble con 2 jugadores: los 2 ataques van al único rival', () => {
    let s = setup(2);
    const [a] = give(s, 0, 'ataque_doble');
    s = play(s, a, [1, 1]);
    expect(s.players[1].hp).toBe(8);
  });

  it('Ataque Doble con más rivales no puede repetir objetivo', () => {
    let s = setup(3);
    const [a] = give(s, 0, 'ataque_doble');
    s = applyAction(s, 0, { type: 'skipRoll' });
    expect(() => applyAction(s, 0, { type: 'play', cardUid: a, targets: [1, 1] })).toThrow();
  });
});

describe('defensas', () => {
  function attackP1(weapon: Parameters<typeof arm>[2], defense: string[], setupFn?: (s: GameState) => void) {
    let s = setup(3);
    arm(s, 0, weapon);
    setupFn?.(s);
    const uids = give(s, 1, ...defense);
    const [a] = give(s, 0, 'ataque_simple');
    s = play(s, a, [1]);
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
  it('Hacha: tras atacar pierde su próximo turno', () => {
    let s = setup(2);
    arm(s, 0, 'hacha');
    const [a] = give(s, 0, 'ataque_simple');
    s = play(s, a, [1]);
    expect(s.players[1].hp).toBe(5);
    expect(s.players[0].prostrated).toBe(true);
    // turno de P1
    expect(s.turn.player).toBe(1);
    s = applyAction(s, 1, { type: 'skipRoll' });
    s = applyAction(s, 1, { type: 'endTurn' });
    // P0 se salta y vuelve P1
    expect(s.turn.player).toBe(1);
    expect(s.players[0].prostrated).toBe(false);
  });

  it('lanzar el dado estando armado hace perder la Fase Jugar', () => {
    let s = setup(2);
    arm(s, 0, 'espada');
    give(s, 0, 'ataque_simple');
    s = applyAction(s, 0, { type: 'roll' });
    expect(s.turn.player).toBe(1); // pasó directo al siguiente
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
    expect(s.deck.length + s.discard.length).toBe(65);
  });

  it('Fijado: los ataques de objetivo único tienen que ir a él', () => {
    let s = setup(4);
    curse(s, 2, 'fijado');
    const mine = give(s, 0, 'ataque_simple', 'ataque_doble');
    s = applyAction(s, 0, { type: 'skipRoll' });
    const plays = legalActions(s, 0).filter((a) => a.type === 'play' && mine.includes(a.cardUid)) as Extract<
      ReturnType<typeof legalActions>[number],
      { type: 'play' }
    >[];
    expect(plays.length).toBeGreaterThan(0);
    for (const p of plays) expect(p.targets).toContain(2);
  });

  it('el eliminado devuelve su arma al Cofre', () => {
    let s = setup(3);
    arm(s, 0, 'espada');
    arm(s, 1, 'arco');
    s.players[1].hp = 2;
    const [a] = give(s, 0, 'ataque_simple');
    s = play(s, a, [1]);
    expect(s.players[1].eliminated).toBe(true);
    expect(s.players[1].weapon).toBeNull();
  });
});

describe('cartas especiales', () => {
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

  it('Elixir sube a 10 pero no baja; Pócima Curativa pasa de 10', () => {
    let s = setup(2);
    s.players[0].hp = 4;
    const [e] = give(s, 0, 'elixir_de_vida');
    s = play(s, e);
    expect(s.players[0].hp).toBe(10);

    let t = setup(2);
    const [p] = give(t, 0, 'pocima_curativa');
    t = play(t, p);
    expect(t.players[0].hp).toBe(12);
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
      expect(inPlay + s.deck.length + s.discard.length).toBe(66);
    }
  });
});
