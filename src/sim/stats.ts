// Estadísticas para el Compendio de cartas: simula muchas partidas de bots y guarda
// en src/data/card-stats.json el % de victorias de los jugadores que usaron cada carta.
//
//   npm run stats                       -> 1500 partidas de 2 a 6 jugadores
//   npm run stats -- --games 4000
//
// "Esperado" corrige por número de jugadores: en una partida de 4, ganar al azar es 25 %.
// Es una correlación con bots simples: orienta el balance, no lo decide.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyAction, createGame } from '../engine/engine';
import { chooseBotAction } from '../bots/bot';
import { CARDS } from '../engine/cards';
import { makeRandom } from '../engine/rng';
import { WEAPON_DIE } from '../engine/weapons';
import type { Action, GameState, PlayerId } from '../engine/types';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const games = Number(arg('games', '1500'));
const seed = Number(arg('seed', '7'));
const playersArg = arg('players', '2-6');
const [minP, maxP] = playersArg.split('-').map(Number);
const deckFile = arg('deck', '');
const noWrite = process.argv.includes('--no-write');
const deckData = deckFile ? (JSON.parse(readFileSync(deckFile, 'utf8')) as { counts?: Record<string, number> } | Record<string, number>) : null;
const deckCounts: Record<string, number> | undefined = deckData
  ? 'counts' in deckData && deckData.counts && typeof deckData.counts === 'object'
    ? deckData.counts
    : (deckData as Record<string, number>)
  : undefined;
const rand = makeRandom(seed);

interface Acc {
  uses: number; // jugadores (partida × jugador) que la usaron al menos una vez
  wins: number;
  expected: number; // suma de 1/n de esos usos
  plays: number; // veces jugada en total
}
const acc: Record<string, Acc> = Object.fromEntries(CARDS.map((c) => [c.id, { uses: 0, wins: 0, expected: 0, plays: 0 }]));
const weaponWins: Record<string, number> = {};
let decided = 0;
const started = Date.now();

function cardOf(s: GameState, pid: PlayerId, a: Action): string | null {
  if (a.type !== 'play' && a.type !== 'defend') return null;
  return s.players[pid].hand.find((c) => c.uid === a.cardUid)?.defId ?? null;
}

for (let g = 0; g < games; g++) {
  const n = maxP ? minP + Math.floor(rand() * (maxP - minP + 1)) : minP;
  let s = createGame({
    players: Array.from({ length: n }, (_, i) => ({ name: `Bot ${i + 1}`, isBot: true })),
    seed: seed * 100000 + g,
    deckCounts,
    options: { logLimit: 0, maxTurns: 400 },
  });
  const used: Set<string>[] = Array.from({ length: n }, () => new Set());
  while (!s.result) {
    const pid = s.prompt!.player;
    const a = chooseBotAction(s, pid, rand);
    const card = cardOf(s, pid, a);
    if (card) {
      used[pid].add(card);
      acc[card].plays++;
    }
    s = applyAction(s, pid, a);
  }
  const winner = s.result.winner;
  if (winner !== null) {
    decided++;
    const w = s.players[winner].weapon ?? 'punos';
    weaponWins[w] = (weaponWins[w] ?? 0) + 1;
  }
  used.forEach((set, pid) => {
    for (const id of set) {
      acc[id].uses++;
      acc[id].expected += 1 / n;
      if (winner === pid) acc[id].wins++;
    }
  });
}

const round = (x: number) => Math.round(x * 1000) / 1000;
const out = {
  generated: new Date().toISOString().slice(0, 10),
  games,
  players: playersArg,
  cards: Object.fromEntries(
    Object.entries(acc).map(([id, a]) => [
      id,
      {
        uses: a.uses,
        winRate: a.uses ? round(a.wins / a.uses) : null,
        expected: a.uses ? round(a.expected / a.uses) : null,
        playsPerGame: round(a.plays / games),
      },
    ]),
  ),
  weapons: Object.fromEntries(['punos', ...WEAPON_DIE].map((w) => [w, round((weaponWins[w] ?? 0) / Math.max(1, decided))])),
};

const file = resolve(dirname(fileURLToPath(import.meta.url)), '../data/card-stats.json');
if (!noWrite) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
}
console.log(`${games} partidas (${playersArg} jugadores) en ${((Date.now() - started) / 1000).toFixed(1)} s${noWrite ? '' : ` -> ${file}`}`);
for (const c of CARDS) {
  const r = out.cards[c.id];
  if (r.winRate !== null && r.expected !== null)
    console.log(`  ${c.name.padEnd(22)} ${(r.winRate * 100).toFixed(1).padStart(5)} %  (esperado ${(r.expected * 100).toFixed(1)} %)`);
}
