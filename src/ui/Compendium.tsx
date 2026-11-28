// Compendio de cartas: todas las cartas y armas con su % de victorias estimado.
// Los números salen de src/data/card-stats.json (se regeneran con `npm run stats`).

import { useMemo, useState } from 'react';
import { CARDS, CARD_TYPE_LABEL, WEAPON_DIE, PUNOS, weaponDef, type CardType } from '../engine';
import stats from '../data/card-stats.json';
import { audio } from './audio/audio';
import { CardView } from './components';
import { Sprite } from './pixel/Sprite';

interface Stat {
  uses: number;
  winRate: number | null;
  expected: number | null;
  playsPerGame: number;
}

const CARD_STATS = stats.cards as Record<string, Stat>;
const WEAPON_STATS = stats.weapons as Record<string, number>;

/** Lo que una carta supera al azar, en promedio entre todas las cartas (sesgo de supervivencia). */
const AVG_LIFT = (() => {
  const lifts = Object.values(CARD_STATS)
    .filter((s) => s.winRate !== null && s.expected !== null)
    .map((s) => s.winRate! - s.expected!);
  return lifts.length ? lifts.reduce((a, b) => a + b, 0) / lifts.length : 0;
})();

/** Puntos sobre (o bajo) la carta promedio. null = sin datos. */
function relOf(id: string): number | null {
  const s = CARD_STATS[id];
  if (!s || s.winRate === null || s.expected === null) return null;
  return (s.winRate - s.expected - AVG_LIFT) * 100;
}

const pct = (x: number) => `${Math.round(x * 100)} %`; // espacio fijo: el % no se separa del número
const TYPES = [...new Set(CARDS.map((c) => c.type))] as CardType[];

function StatPlate({ id, copies }: { id: string; copies: number }) {
  const st = CARD_STATS[id];
  const rel = relOf(id);
  if (!st || rel === null || st.winRate === null) {
    return (
      <div className="stat stat--none">
        Sin datos todavía. Corre <code>npm run stats</code>.
      </div>
    );
  }
  const tone = rel > 3 ? 'up' : rel < -3 ? 'down' : 'even';
  return (
    <div className={`stat stat--${tone}`}>
      <div className="stat__main">
        <b>{pct(st.winRate)}</b>
        <span>de victorias</span>
      </div>
      <div className="stat__bar" aria-hidden="true">
        <span style={{ width: `${Math.min(100, st.winRate * 100)}%` }} />
        <i style={{ left: `${(st.expected ?? 0) * 100}%` }} />
      </div>
      <div className="stat__rel">
        {rel >= 0 ? '+' : ''}
        {rel.toFixed(1)} vs la carta promedio
      </div>
      <div className="stat__meta">
        {copies} en el mazo · se juega {st.playsPerGame.toFixed(1)} por partida
      </div>
    </div>
  );
}

export function Compendium({ onBack }: { onBack: () => void }) {
  const [filter, setFilter] = useState<'todas' | CardType>('todas');
  const [sort, setSort] = useState<'tipo' | 'victorias'>('tipo');

  const ranked = useMemo(
    () =>
      CARDS.filter((c) => relOf(c.id) !== null).sort((a, b) => relOf(b.id)! - relOf(a.id)!),
    [],
  );
  const strongest = ranked.slice(0, 3).map((c) => c.name);
  const weakest = ranked.slice(-3).reverse().map((c) => c.name);

  const list = useMemo(() => {
    const cards = CARDS.filter((c) => filter === 'todas' || c.type === filter);
    if (sort === 'victorias') return [...cards].sort((a, b) => (relOf(b.id) ?? -99) - (relOf(a.id) ?? -99));
    return cards;
  }, [filter, sort]);

  const tap = (fn: () => void) => () => {
    audio.play('click');
    fn();
  };
  const deckSize = CARDS.reduce((n, c) => n + c.copies, 0);

  return (
    <div className="gallery compendium">
      <div className="gallery__head">
        <button className="btn btn--small" onClick={tap(onBack)}>
          Volver
        </button>
        <h2>Compendio de cartas</h2>
        <p>
          {CARDS.length} cartas distintas · {deckSize} en el mazo · {stats.games} partidas simuladas ({stats.generated})
        </p>
      </div>

      <p className="compendium__note">
        <b>% de victorias</b>: de los jugadores (bots) que usaron la carta al menos una vez, cuántos ganaron. La rayita marca lo
        que se ganaría al azar. Casi todas superan el azar porque quien sobrevive más juega más cartas, así que compáralas
        entre ellas con la cifra <b>vs la carta promedio</b>.
      </p>
      {ranked.length > 0 && (
        <div className="compendium__summary">
          <span className="stat--up">Más fuertes: {strongest.join(', ')}</span>
          <span className="stat--down">Más débiles: {weakest.join(', ')}</span>
        </div>
      )}

      <h3 className="gallery__h">Armas</h3>
      <div className="compendium__weapons">
        {[PUNOS.id, ...WEAPON_DIE].map((id) => {
          const w = weaponDef(id === 'punos' ? null : (id as (typeof WEAPON_DIE)[number]));
          return (
            <div key={id} className="wcard">
              <Sprite name={id} scale={4} />
              <div className="wcard__body">
                <div className="wcard__name">
                  {w.name} <span>{w.near}/{w.far}</span>
                </div>
                <div className="wcard__text">{w.text}</div>
                <div className="wcard__stat">El ganador la tenía en el {pct(WEAPON_STATS[id] ?? 0)} de las partidas</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="compendium__controls">
        <div className="seg" role="group" aria-label="Filtrar por tipo">
          <button className={filter === 'todas' ? 'is-on' : ''} onClick={tap(() => setFilter('todas'))}>
            Todas
          </button>
          {TYPES.map((t) => (
            <button key={t} className={filter === t ? 'is-on' : ''} onClick={tap(() => setFilter(t))}>
              {CARD_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Ordenar">
          <button className={sort === 'tipo' ? 'is-on' : ''} onClick={tap(() => setSort('tipo'))}>
            Por tipo
          </button>
          <button className={sort === 'victorias' ? 'is-on' : ''} onClick={tap(() => setSort('victorias'))}>
            Por victorias
          </button>
        </div>
      </div>

      <div className="compendium__grid">
        {list.map((c) => (
          <figure key={c.id} className="entry">
            <figcaption className="entry__title">
              {c.name} — {c.copies} {c.copies === 1 ? 'carta' : 'cartas'}
            </figcaption>
            <CardView defId={c.id} />
            <StatPlate id={c.id} copies={c.copies} />
          </figure>
        ))}
      </div>
    </div>
  );
}
