// Piezas visuales en pixel art: cartas, corazones, asientos, cofre y registro.

import { useEffect, useRef, type CSSProperties, type ReactNode, type Ref } from 'react';
import {
  CARD_TYPE_LABEL,
  getCardDef,
  hasStatus,
  proximity,
  WEAPON_DIE,
  weaponDef,
  type CardInstance,
  type GameState,
  type Player,
  type PlayerId,
  type WeaponId,
} from '../engine';
import { Sprite } from './pixel/Sprite';
import { CHARACTERS } from './pixel/sprites';

export const SEAT_COLORS = ['#e04848', '#3f7fd8', '#3aa457', '#f2c94c', '#b588ee', '#ee8a3a'];
export const characterOf = (pid: PlayerId) => CHARACTERS[pid % CHARACTERS.length];

// ------------------------------------------------------------------ carta

export type CardLook = 'playable' | 'disabled' | 'selected' | 'defend' | 'discard' | undefined;

export function CardView({ defId, look, onClick, onHover }: { defId: string; look?: CardLook; onClick?: () => void; onHover?: () => void }) {
  const def = getCardDef(defId);
  return (
    <div
      className={`card card--${def.type}${look ? ` card--${look}` : ''}`}
      onClick={onClick}
      onMouseEnter={onHover}
      title={`${def.name} (${CARD_TYPE_LABEL[def.type]}): ${def.text}`}
    >
      <div className="card__name">{def.name}</div>
      <div className="card__art">
        <Sprite name={def.id} scale={4} />
      </div>
      <div className="card__type">{CARD_TYPE_LABEL[def.type]}</div>
      <div className="card__text">{def.text}</div>
    </div>
  );
}

// ------------------------------------------------------------------ vida, armadura, arma, estados

export function Hearts({ hp, base, scale = 2 }: { hp: number; base: number; scale?: number }) {
  const shown = Math.max(0, hp);
  const total = Math.min(15, Math.max(base, shown));
  return (
    <div className={`hearts${shown <= 3 && shown > 0 ? ' hearts--danger' : ''}`} title={`${shown} PV`}>
      {Array.from({ length: total }, (_, i) => (
        <Sprite
          key={i}
          name={i < shown ? (i >= base ? 'corazon_oro' : 'corazon') : 'corazon_vacio'}
          scale={scale}
          className="heart"
          style={{ '--i': i } as CSSProperties}
        />
      ))}
      <span className="hearts__num">{shown > 15 ? `×${shown}` : shown}</span>
    </div>
  );
}

export function ArmorPips({ p, scale = 2 }: { p: Player; scale?: number }) {
  if (!p.armor) return null;
  const { pa, max } = p.armor;
  return (
    <div className="pips" title={`${getCardDef(p.armor.card.defId).name}: ${pa} de ${max} PA`}>
      {pa === 0 ? (
        <Sprite name="escudito_roto" scale={scale} />
      ) : pa > 6 ? (
        <>
          <Sprite name="escudito" scale={scale} />
          <span className="pips__num">×{pa}</span>
        </>
      ) : (
        Array.from({ length: pa }, (_, i) => <Sprite key={i} name="escudito" scale={scale} />)
      )}
    </div>
  );
}

export function WeaponChip({ weapon, big }: { weapon: WeaponId | null; big?: boolean }) {
  const w = weaponDef(weapon);
  return (
    <span className={`weapon${weapon ? '' : ' weapon--none'}${big ? ' weapon--big' : ''}`} title={`${w.name}: ${w.text}`}>
      <Sprite name={w.id} scale={big ? 3 : 2} />
      <span className="weapon__name">{w.name}</span>
      <span className="weapon__dmg">
        {w.near}/{w.far}
      </span>
    </span>
  );
}

function StatusIcons({ cards, kind, scale = 2 }: { cards: CardInstance[]; kind: 'curse' | 'blessing'; scale?: number }) {
  return (
    <div className={`statuses statuses--${kind}`}>
      {cards.map((c) => {
        const d = getCardDef(c.defId);
        return (
          <span key={c.uid} className={`status status--${kind}`} title={`${d.name}: ${d.text}`}>
            <Sprite name={d.id} scale={scale} />
            <span className="status__name">{d.name}</span>
          </span>
        );
      })}
    </div>
  );
}

/** Qué hace una maldición o bendición mientras está activa. */
export const effectText = (defId: string) => {
  const d = getCardDef(defId);
  return d.effect ?? d.text;
};

function EffectRow({ defId, kind }: { defId: string; kind: 'curse' | 'blessing' }) {
  const d = getCardDef(defId);
  return (
    <div className={`effect effect--${kind}`}>
      <Sprite name={d.id} scale={2} />
      <div className="effect__body">
        <div className="effect__name">{d.name}</div>
        <div className="effect__text">{effectText(d.id)}</div>
      </div>
    </div>
  );
}

/** Lista de maldiciones o bendiciones con su descripción (tu tablero). */
function EffectList({ cards, kind, label }: { cards: CardInstance[]; kind: 'curse' | 'blessing'; label: string }) {
  return (
    <div className={`effects effects--${kind}`}>
      <div className="myboard__label">{label}</div>
      {cards.length === 0 && <div className="effects__empty">Ninguna</div>}
      {cards.map((c) => (
        <EffectRow key={c.uid} defId={c.defId} kind={kind} />
      ))}
    </div>
  );
}

export type TipSide = 'below' | 'left' | 'right';

/** Desglose de un rival al pasar el mouse: vida, armadura, arma, distancia y efectos activos. */
function SeatDetails({ s, p, viewer, side }: { s: GameState; p: Player; viewer: PlayerId; side: TipSide }) {
  const w = weaponDef(p.weapon);
  const me = s.players[viewer];
  const mw = weaponDef(me.weapon);
  const prox = proximity(s, viewer, p.id);
  const yours = (prox === 'cercano' ? mw.near : mw.far) + (hasStatus(me, 'super_fuerte') ? 1 : 0);
  const theirs = (prox === 'cercano' ? w.near : w.far) + (hasStatus(p, 'super_fuerte') ? 1 : 0);
  const none = p.curses.length === 0 && p.blessings.length === 0 && !p.prostrated;
  return (
    <div className={`details details--${side}`} role="tooltip">
      <div className="details__head">
        <Sprite name={characterOf(p.id)} scale={3} />
        <div>
          <div className="details__name">{p.name}</div>
          <div className="details__sub">
            {prox === 'cercano' ? 'Cercano a ti' : 'Lejano de ti'} · {p.hand.length} cartas en mano
          </div>
        </div>
      </div>
      <dl className="details__grid">
        <dt>Vida</dt>
        <dd>
          {Math.max(0, p.hp)} PV
          {p.armor && ` + ${p.armor.pa} PA (${getCardDef(p.armor.card.defId).name})`}
        </dd>
        <dt>Arma</dt>
        <dd>
          {w.name} {w.near}/{w.far}. {w.text}
        </dd>
        <dt>Duelo</dt>
        <dd>
          Tu {mw.name} le hace {yours}. Su {w.name} te hace {theirs}.
        </dd>
      </dl>
      {p.prostrated && (
        <div className="effect effect--warn">
          <Sprite name="estrella" scale={2} />
          <div className="effect__body">
            <div className="effect__name">Postrado</div>
            <div className="effect__text">Pierde su próximo turno completo.</div>
          </div>
        </div>
      )}
      {p.curses.map((c) => (
        <EffectRow key={c.uid} defId={c.defId} kind="curse" />
      ))}
      {p.blessings.map((c) => (
        <EffectRow key={c.uid} defId={c.defId} kind="blessing" />
      ))}
      {none && <div className="details__none">Sin maldiciones ni bendiciones.</div>}
    </div>
  );
}

function Dizzy() {
  return (
    <span className="dizzy" title="Postrado: pierde su próximo turno">
      <Sprite name="estrella" scale={2} />
      <Sprite name="estrella" scale={2} />
      <Sprite name="estrella" scale={2} />
    </span>
  );
}

// ------------------------------------------------------------------ asiento rival

export function Seat({
  s,
  p,
  viewer,
  style,
  targetable,
  picked,
  onClick,
  reveal,
  fxClass,
  anchorRef,
  tipSide,
}: {
  s: GameState;
  p: Player & { dying?: boolean };
  viewer: PlayerId;
  tipSide: TipSide;
  style: CSSProperties;
  targetable: boolean;
  picked: boolean;
  onClick: () => void;
  reveal: boolean;
  fxClass: string;
  anchorRef: Ref<HTMLDivElement>;
}) {
  const active = s.turn.player === p.id && !s.result;
  const deciding = s.prompt?.player === p.id && !active;
  const prox = proximity(s, viewer, p.id);
  const cls = [
    'seat',
    active && 'is-active',
    deciding && 'is-deciding',
    targetable && 'is-targetable',
    picked && 'is-picked',
    p.eliminated && 'is-dead',
    p.dying && 'is-dying',
    fxClass,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={cls} style={{ ...style, '--seat': SEAT_COLORS[p.id] } as CSSProperties} onClick={onClick}>
      <div className="seat__figure" ref={anchorRef}>
        {p.eliminated ? (
          <Sprite name="lapida" scale={3} />
        ) : (
          <Sprite name={characterOf(p.id)} scale={3} className="idle" />
        )}
        {p.prostrated && !p.eliminated && <Dizzy />}
      </div>
      <div className="seat__body">
        <div className="seat__top">
          <span className="seat__name">{p.name}</span>
          {!p.eliminated && <span className={`prox prox--${prox}`}>{prox}</span>}
        </div>
        {!p.eliminated ? (
          <>
            <div className="seat__vitals">
              <Hearts hp={p.hp} base={s.options.startingHp} />
              <ArmorPips p={p} />
            </div>
            <div className="seat__row">
              <WeaponChip weapon={p.weapon} />
              <span className="handcount" title="Cartas en la mano">
                <Sprite name="dorso" scale={2} />
                {p.hand.length}
              </span>
            </div>
            {(p.curses.length > 0 || p.blessings.length > 0) && (
              <div className="seat__statuses">
                <StatusIcons cards={p.curses} kind="curse" />
                <StatusIcons cards={p.blessings} kind="blessing" />
              </div>
            )}
            {reveal && p.hand.length > 0 && (
              <div className="seat__reveal">{p.hand.map((c) => getCardDef(c.defId).name).join(' · ')}</div>
            )}
          </>
        ) : (
          <div className="seat__out">Fuera de combate</div>
        )}
      </div>
      {active && <span className="seat__flag">Turno</span>}
      {deciding && <span className="seat__flag seat__flag--deciding">Decide</span>}
      {!p.eliminated && <SeatDetails s={s} p={p} viewer={viewer} side={tipSide} />}
    </div>
  );
}

// ------------------------------------------------------------------ tablero propio

export function MyBoard({
  s,
  p,
  targetable,
  onClick,
  fxClass,
  anchorRef,
}: {
  s: GameState;
  p: Player & { dying?: boolean };
  targetable: boolean;
  onClick: () => void;
  fxClass: string;
  anchorRef: Ref<HTMLDivElement>;
}) {
  const active = s.turn.player === p.id && !s.result;
  return (
    <div className="myboard">
      <div className="myboard__side myboard__side--curses">
        <EffectList cards={p.curses} kind="curse" label="Maldiciones" />
      </div>
      <div
        className={`myboard__main${active ? ' is-active' : ''}${targetable ? ' is-targetable' : ''}${p.dying ? ' is-dying' : ''} ${fxClass}`}
        style={{ '--seat': SEAT_COLORS[p.id] } as CSSProperties}
        onClick={onClick}
      >
        <div className="myboard__figure" ref={anchorRef}>
          {p.eliminated ? <Sprite name="lapida" scale={4} /> : <Sprite name={characterOf(p.id)} scale={4} className="idle" />}
          {p.prostrated && !p.eliminated && <Dizzy />}
        </div>
        <div className="myboard__info">
          <div className="myboard__name">
            {p.name}
            {p.prostrated && <span className="tag tag--warn">Postrado</span>}
            {p.eliminated && <span className="tag">Eliminado</span>}
          </div>
          <div className="myboard__vitals">
            <Hearts hp={p.hp} base={s.options.startingHp} scale={3} />
            <ArmorPips p={p} scale={3} />
          </div>
        </div>
        <WeaponChip weapon={p.weapon} big />
      </div>
      <div className="myboard__side myboard__side--blessings">
        <EffectList cards={p.blessings} kind="blessing" label="Bendiciones" />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ centro: cofre, dado, mazo

export function Center({
  s,
  players,
  roll,
  rolling,
  chestRef,
  dieRef,
}: {
  s: GameState;
  players: Player[];
  roll: { player: PlayerId; weapon: WeaponId } | null;
  rolling: boolean;
  chestRef: Ref<HTMLDivElement>;
  dieRef: Ref<HTMLDivElement>;
}) {
  return (
    <div className="center">
      <div className="chest" ref={chestRef}>
        <div className="chest__title">Cofre de Armas</div>
        <div className="chest__grid">
          {WEAPON_DIE.map((w) => {
            const d = weaponDef(w);
            const owner = players.find((p) => p.weapon === w && !p.eliminated);
            return (
              <div key={w} className={`chest__slot${owner ? ' is-taken' : ''}`} title={`${d.name} ${d.near}/${d.far}: ${d.text}`}>
                <Sprite name={w} scale={3} />
                <span className="chest__dmg">
                  {d.near}/{d.far}
                </span>
                {owner && (
                  <span className="chest__owner" style={{ background: SEAT_COLORS[owner.id] }}>
                    {owner.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="chest__legend">cercano / lejano</div>
      </div>
      <div className="center__col">
        <div className={`die${rolling ? ' is-hidden' : ''}`} ref={dieRef} title="Dado de Armas">
          {roll ? <Sprite name={roll.weapon} scale={3} /> : <span className="die__q">?</span>}
        </div>
        <div className="die__caption">{roll ? `${s.players[roll.player].name}` : 'Dado de Armas'}</div>
        <div className="piles">
          <div className="pile" title="Mazo">
            <span className="pile__stack" />
            <span>{s.deck.length}</span>
          </div>
          <div className="pile pile--discard" title="Descarte">
            <span className="pile__stack" />
            <span>{s.discard.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ registro

/** El registro del motor trae emojis; en la crónica se muestran solo las palabras. */
const cleanLog = (text: string) =>
  text
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

export function LogPanel({ s, children }: { s: GameState; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = s.log[s.log.length - 1]?.id;
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight });
  }, [last]);
  return (
    <aside className="side">
      {children}
      <div className="scroll">
        <div className="scroll__title">Crónica</div>
        <div className="log" ref={ref}>
          {s.log.map((e) => (
            <div key={e.id} className={`log__entry log__entry--${e.kind}`}>
              {cleanLog(e.text)}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
