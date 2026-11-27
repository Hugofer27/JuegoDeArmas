// Simulador de balance: juega muchas partidas bot contra bot y resume quién gana y con qué.
//
//   npm run sim                      -> 300 partidas, 4 jugadores
//   npm run sim -- --games 1000 --players 6
//   npm run sim -- --players 2-6     -> número de jugadores al azar en cada partida
//
// Ojo: los bots son simples, así que los números orientan pero no son la verdad absoluta.

import { applyAction, createGame } from '../engine/engine';
import { chooseBotAction } from '../bots/bot';
import { getCardDef } from '../engine/cards';
import { makeRandom } from '../engine/rng';
import { weaponDef, WEAPON_DIE } from '../engine/weapons';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const games = Number(arg('games', '300'));
const [minP, maxP] = arg('players', '4').split('-').map(Number);
const seed = Number(arg('seed', '1'));
const rand = makeRandom(seed);

let draws = 0;
let timeouts = 0;
let totalTurns = 0;
const winsBySeat: number[] = Array(6).fill(0);
const winnerWeapon: Record<string, number> = {};
const damageByWeapon: Record<string, number> = {};
const cardsPlayed: Record<string, number> = {};
const started = Date.now();

for (let g = 0; g < games; g++) {
  const n = maxP ? minP + Math.floor(rand() * (maxP - minP + 1)) : minP;
  let s = createGame({
    players: Array.from({ length: n }, (_, i) => ({ name: `Bot ${i + 1}`, isBot: true })),
    seed: seed * 100000 + g,
    options: { logLimit: 0, maxTurns: 400 },
  });
  while (!s.result) s = applyAction(s, s.prompt!.player, chooseBotAction(s, s.prompt!.player, rand));

  totalTurns += s.stats.turns;
  if (s.result.winner === null) {
    if (s.result.reason.includes('límite')) timeouts++;
    else draws++;
  } else {
    winsBySeat[s.result.winner]++;
    const w = s.players[s.result.winner].weapon ?? 'punos';
    winnerWeapon[w] = (winnerWeapon[w] ?? 0) + 1;
  }
  for (const [k, v] of Object.entries(s.stats.damageByWeapon)) damageByWeapon[k] = (damageByWeapon[k] ?? 0) + v;
  for (const [k, v] of Object.entries(s.stats.cardsPlayed)) cardsPlayed[k] = (cardsPlayed[k] ?? 0) + v;
}

const pct = (x: number, of = games) => `${((100 * x) / of).toFixed(1)}%`.padStart(6);
const label = (w: string) => (w === 'punos' ? 'Puños' : weaponDef(w as never).name);

console.log(`\n${games} partidas, ${minP}${maxP ? `-${maxP}` : ''} jugadores, semilla ${seed} (${((Date.now() - started) / 1000).toFixed(1)} s)\n`);
console.log(`Turnos promedio: ${(totalTurns / games).toFixed(1)}`);
console.log(`Empates: ${draws} (${pct(draws).trim()})   Límite de turnos: ${timeouts}`);
console.log('\nVictorias por asiento (el jugador inicial es al azar):');
winsBySeat.forEach((w, i) => w && console.log(`  Asiento ${i + 1}: ${pct(w)}`));
console.log('\nArma del ganador al final:');
for (const w of ['punos', ...WEAPON_DIE]) console.log(`  ${label(w).padEnd(8)} ${pct(winnerWeapon[w] ?? 0)}`);
const totalDmg = Object.values(damageByWeapon).reduce((a, b) => a + b, 0) || 1;
console.log('\nDaño a PV hecho con cada arma:');
for (const w of ['punos', ...WEAPON_DIE]) console.log(`  ${label(w).padEnd(8)} ${pct(damageByWeapon[w] ?? 0, totalDmg)}`);
console.log('\nCartas más jugadas (por partida):');
Object.entries(cardsPlayed)
  .sort((a, b) => b[1] - a[1])
  .forEach(([id, v]) => console.log(`  ${getCardDef(id).name.padEnd(22)} ${(v / games).toFixed(2)}`));
