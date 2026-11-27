import { useState } from 'react';
import {
  CARDS,
  CARD_TYPE_LABEL,
  devGiveCard,
  devSetHp,
  devSetWeapon,
  devApplyStatus,
  getCardDef,
  WEAPON_DIE,
  weaponDef,
  type GameState,
  type PlayerId,
  type WeaponId,
} from '../engine';

export function DevPanel({
  s,
  viewer,
  setState,
  undo,
  canUndo,
  reveal,
  setReveal,
}: {
  s: GameState;
  viewer: PlayerId;
  setState: (s: GameState) => void;
  undo: () => void;
  canUndo: boolean;
  reveal: boolean;
  setReveal: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pid, setPid] = useState<PlayerId>(viewer);
  const [card, setCard] = useState(CARDS[0].id);
  const [hp, setHp] = useState(10);
  const [weapon, setWeapon] = useState<string>('espada');

  if (!open)
    return (
      <div className="dev dev--closed">
        <button className="btn btn--small" onClick={() => setOpen(true)}>
          Dev
        </button>
        <button className="btn btn--small" onClick={undo} disabled={!canUndo} title="Volver a antes de tu última jugada">
          Deshacer
        </button>
      </div>
    );

  const types = [...new Set(CARDS.map((c) => c.type))];
  return (
    <div className="dev">
      <div className="dev__head">
        <b>Modo dev</b>
        <button className="btn btn--small" onClick={() => setOpen(false)}>
          Cerrar
        </button>
      </div>
      <label>
        Jugador
        <select value={pid} onChange={(e) => setPid(Number(e.target.value))}>
          {s.players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="dev__row">
        <select value={card} onChange={(e) => setCard(e.target.value)}>
          {types.map((t) => (
            <optgroup key={t} label={CARD_TYPE_LABEL[t]}>
              {CARDS.filter((c) => c.type === t).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button className="btn btn--small" onClick={() => setState(devGiveCard(s, pid, card))}>
          Dar carta
        </button>
      </div>
      {['maldicion', 'bendicion'].includes(getCardDef(card).type) && (
        <button className="btn btn--small" onClick={() => setState(devApplyStatus(s, pid, card))}>
          Aplicar efecto
        </button>
      )}
      <div className="dev__row">
        <input type="number" value={hp} onChange={(e) => setHp(Number(e.target.value))} />
        <button className="btn btn--small" onClick={() => setState(devSetHp(s, pid, hp))}>
          Fijar PV
        </button>
      </div>
      <div className="dev__row">
        <select value={weapon} onChange={(e) => setWeapon(e.target.value)}>
          <option value="">Puños</option>
          {WEAPON_DIE.map((w) => (
            <option key={w} value={w}>
              {weaponDef(w).name}
            </option>
          ))}
        </select>
        <button
          className="btn btn--small"
          onClick={() => setState(devSetWeapon(s, pid, (weapon || null) as WeaponId | null))}
        >
          Dar arma
        </button>
      </div>
      <label className="check">
        <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} />
        Ver manos de todos
      </label>
      <div className="dev__row">
        <button className="btn btn--small" onClick={undo} disabled={!canUndo}>
          Deshacer
        </button>
        <span className="dev__seed">semilla {s.options.seed}</span>
      </div>
    </div>
  );
}
