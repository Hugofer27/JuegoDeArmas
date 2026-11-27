// Director de animaciones: toma los eventos (state.fx) que produce el motor y los
// reproduce de a uno, con su duración. Mientras hay animaciones pendientes, la mesa
// muestra los valores "de antes" (vida, armas, armadura) para que cada número cambie
// justo cuando su animación ocurre.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Fx, FxKind, GameState, Player, PlayerId } from '../../engine';
import type { Speed } from '../settings';

/** Duración en ms: [cinemático, rápido]. */
const DURATION: Record<FxKind, [number, number]> = {
  turn: [1050, 360],
  skip: [900, 320],
  card: [850, 280],
  attack: [640, 230],
  damage: [640, 260],
  heal: [700, 240],
  armor: [480, 180],
  armorBreak: [600, 220],
  armorUp: [650, 230],
  block: [760, 270],
  dodge: [640, 240],
  roll: [1350, 440],
  weapon: [520, 190],
  status: [820, 280],
  prostrate: [760, 260],
  death: [1500, 560],
};

export function fxDuration(fx: Fx, speed: Speed, viewer: PlayerId, backlog: number): number {
  let d = DURATION[fx.kind][speed === 'cine' ? 0 : 1];
  if (fx.kind === 'turn' && fx.player !== viewer) d *= speed === 'cine' ? 0.7 : 0.5;
  if (fx.kind === 'roll' && fx.prev === fx.weapon) d *= 0.85;
  if (backlog > 10) d *= 0.55; // si se acumulan (cadenas de Kamikaze), apura
  return Math.round(d);
}

export function useDirector(s: GameState, speed: Speed, viewer: PlayerId, onStart: (fx: Fx, duration: number) => void) {
  const [queue, setQueue] = useState<Fx[]>([]);
  const [current, setCurrent] = useState<Fx | null>(null);
  const lastId = useRef(0);
  const queueLen = useRef(0);
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  queueLen.current = queue.length;

  useEffect(() => {
    const fresh = s.fx.filter((f) => f.id > lastId.current);
    if (!fresh.length) return;
    lastId.current = fresh[fresh.length - 1].id;
    setQueue((q) => [...q, ...fresh]);
  }, [s]);

  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const [next, ...rest] = queue;
    const d = fxDuration(next, speed, viewer, rest.length);
    setQueue(rest);
    setCurrent(next);
    setDuration(d);
    onStartRef.current(next, d);
  }, [current, queue, speed, viewer]);

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => setCurrent(null), duration);
    return () => window.clearTimeout(t);
  }, [current, duration]);

  const skip = useCallback(() => {
    setQueue([]);
    setCurrent(null);
  }, []);

  return { current, queue, duration, busy: current !== null || queue.length > 0, skip };
}

// ------------------------------------------------------------------ lo que se ve

export interface ShownPlayer extends Player {
  dying: boolean;
}

/** Jugadores tal como deben verse mientras quedan animaciones por reproducir. */
export function shownPlayers(s: GameState, current: Fx | null, queue: Fx[]): ShownPlayer[] {
  const all = current ? [current, ...queue] : queue;
  return s.players.map((p) => {
    const sp: ShownPlayer = { ...p, dying: false };
    const mine = (f: Fx) => f.player === p.id;

    const hpFx = queue.find((f) => mine(f) && (f.kind === 'damage' || f.kind === 'heal'));
    if (hpFx?.before !== undefined) sp.hp = hpFx.before;

    const armorFx = queue.find((f) => mine(f) && (f.kind === 'armor' || f.kind === 'armorBreak' || f.kind === 'armorUp'));
    if (armorFx?.kind === 'armor') {
      const brk = queue.find((f) => mine(f) && f.kind === 'armorBreak');
      const defId = p.armor?.card.defId ?? brk?.defId ?? 'armadura_acero';
      sp.armor = { card: { uid: '_shown', defId }, pa: armorFx.before ?? 0, max: p.armor?.max ?? armorFx.before ?? 0 };
    } else if (armorFx?.kind === 'armorBreak') {
      sp.armor = { card: { uid: '_shown', defId: armorFx.defId ?? 'armadura_acero' }, pa: 0, max: 1 };
    } else if (armorFx?.kind === 'armorUp') {
      sp.armor = null;
    }

    const wFx = all.find((f) => (f.kind === 'roll' || f.kind === 'weapon') && (f.player === p.id || f.from === p.id));
    if (wFx) sp.weapon = wFx.from === p.id ? (wFx.weapon ?? null) : (wFx.prev ?? null);

    const death = all.find((f) => mine(f) && f.kind === 'death');
    if (death) {
      sp.eliminated = false;
      sp.dying = death === current;
      if (!wFx) sp.weapon = death.prev ?? null;
    }

    const pendingStatus = (defId: string) => queue.some((f) => mine(f) && f.kind === 'status' && f.defId === defId);
    sp.curses = p.curses.filter((c) => !pendingStatus(c.defId));
    sp.blessings = p.blessings.filter((c) => !pendingStatus(c.defId));
    if (queue.some((f) => mine(f) && f.kind === 'prostrate')) sp.prostrated = false;
    return sp;
  });
}
