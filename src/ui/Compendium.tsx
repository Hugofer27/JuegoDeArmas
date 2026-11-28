// Compendio de cartas: todas las cartas y armas con su % de victorias estimado.
// Los números salen de src/data/card-stats.json (se regeneran con `npm run stats`).

import { useMemo, useState } from 'react';
import { CARDS, CARD_TYPE_LABEL, WEAPON_DIE, PUNOS, weaponDef, type CardType } from '../engine';
import stats from '../data/card-stats.json';
import { audio } from './audio/audio';
import { CardView } from './components';
import { countDeckTotal, defaultCounts, deleteCustomDeck, saveCustomDeck, setActiveDeck, useDecks } from './decks';
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
  const deckStore = useDecks();

  const initialDeck = deckStore.decks.find((d) => d.id === deckStore.activeId) ?? null;
  const [editingId, setEditingId] = useState<string | null>(initialDeck?.id ?? null);
  const [deckName, setDeckName] = useState(initialDeck?.name ?? '');
  const [counts, setCounts] = useState<Record<string, number>>(() =>
    initialDeck ? { ...defaultCounts(), ...initialDeck.counts } : defaultCounts(),
  );
  const [notice, setNotice] = useState<string | null>(null);

  const selectDeck = (id: string | null) => {
    setNotice(null);
    if (!id) {
      setEditingId(null);
      setDeckName('');
      setCounts(defaultCounts());
      return;
    }
    const found = deckStore.decks.find((d) => d.id === id);
    if (!found) return;
    setEditingId(found.id);
    setDeckName(found.name);
    setCounts({ ...defaultCounts(), ...found.counts });
  };

  const changeQty = (cardId: string, delta: number) => {
    audio.play('click');
    setNotice(null);
    setCounts((prev) => ({
      ...prev,
      [cardId]: Math.max(0, Math.min(20, (prev[cardId] ?? 0) + delta)),
    }));
  };

  const handleSave = () => {
    audio.play('click');
    const id = editingId ?? `deck_${Date.now()}`;
    const name = deckName.trim() || `Baraja ${deckStore.decks.length + 1}`;
    const saved = saveCustomDeck({ id, name, counts }, true);
    setEditingId(saved.id);
    setDeckName(saved.name);
    setNotice(`Guardada "${saved.name}" y activada para jugar.`);
  };

  const handleNew = () => {
    audio.play('click');
    setEditingId(null);
    setDeckName(`Baraja ${deckStore.decks.length + 1}`);
    setCounts(defaultCounts());
    setNotice('Nueva baraja lista: ajusta las cantidades y pulsa Guardar.');
  };

  const handleDelete = () => {
    if (!editingId) return;
    audio.play('click');
    deleteCustomDeck(editingId);
    setEditingId(null);
    setDeckName('');
    setCounts(defaultCounts());
    setNotice('Baraja eliminada. Volviste a la baraja estándar.');
  };

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
  const deckSize = countDeckTotal(counts);
  const isActive = editingId === deckStore.activeId;

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

      <section className="deckbar" aria-label="Personalizar baraja">
        <div className="deckbar__row">
          <label className="deckbar__label">
            Baraja:
            <select
              className="setup__select"
              value={editingId ?? ''}
              onChange={(e) => {
                audio.play('click');
                selectDeck(e.target.value || null);
              }}
            >
              <option value="">Estándar ({countDeckTotal(defaultCounts())} cartas)</option>
              {deckStore.decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({countDeckTotal(d.counts)} cartas)
                </option>
              ))}
            </select>
          </label>
          <input
            className="deckbar__name"
            placeholder="Nombre para guardar…"
            value={deckName}
            maxLength={28}
            onChange={(e) => setDeckName(e.target.value)}
            aria-label="Nombre de la baraja"
          />
          <button className="btn btn--small btn--gold" onClick={handleSave} disabled={deckSize < 10}>
            {editingId ? 'Guardar cambios' : 'Guardar como nueva'}
          </button>
          <button className="btn btn--small" onClick={handleNew}>
            Nueva
          </button>
          <button
            className="btn btn--small"
            onClick={tap(() => {
              setCounts(defaultCounts());
              setNotice('Cantidades restablecidas a la baraja estándar.');
            })}
          >
            Restablecer
          </button>
          {editingId && (
            <button className="btn btn--small btn--danger" onClick={handleDelete}>
              Eliminar
            </button>
          )}
          {!isActive && (
            <button
              className="btn btn--small"
              onClick={tap(() => {
                setActiveDeck(editingId);
                setNotice(editingId ? 'Baraja activada para jugar.' : 'Baraja estándar activada para jugar.');
              })}
            >
              Usar para jugar
            </button>
          )}
        </div>
        <div className="deckbar__info">
          <span>
            <b>Total:</b> {deckSize} {deckSize === 1 ? 'carta' : 'cartas'}
            {deckSize < 10 && ' (mínimo 10 para jugar)'}
          </span>
          {isActive && <span className="deckbar__active">✓ Activa para jugar</span>}
          {notice && <span className="deckbar__notice">{notice}</span>}
        </div>
      </section>

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
        {list.map((c) => {
          const qty = counts[c.id] ?? 0;
          return (
            <figure key={c.id} className={`entry${qty === 0 ? ' entry--off' : ''}`}>
              <figcaption className="entry__title">
                {c.name} — {qty} {qty === 1 ? 'carta' : 'cartas'}
              </figcaption>
              <div className="entry__qty" role="group" aria-label={`Copias de ${c.name}`}>
                <button
                  className="btn btn--small"
                  onClick={() => changeQty(c.id, -1)}
                  disabled={qty <= 0}
                  aria-label={`Quitar copia de ${c.name}`}
                >
                  −
                </button>
                <span>{qty}</span>
                <button
                  className="btn btn--small"
                  onClick={() => changeQty(c.id, 1)}
                  disabled={qty >= 20}
                  aria-label={`Agregar copia de ${c.name}`}
                >
                  +
                </button>
              </div>
              <CardView defId={c.id} />
              <StatPlate id={c.id} copies={qty} />
            </figure>
          );
        })}
      </div>
    </div>
  );
}
