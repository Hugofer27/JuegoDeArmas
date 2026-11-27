// Controlador de partida. Tres modos con la misma forma (state + dispatch):
//  - local: todo en este navegador (bots incluidos).
//  - host:  igual que local, y además reparte la partida a los invitados online
//           y aplica sus acciones.
//  - guest: muestra lo que manda el anfitrión y le envía las acciones.

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyAction, createGame, currentActor, setSeatBot, type Action, type GameState, type PlayerId } from '../engine';
import { chooseBotAction } from '../bots/bot';
import { useRoom, type GuestLink, type HostRoom } from '../net/room';
import type { MatchConfig } from './Setup';

export type NetMode = { kind: 'local' } | { kind: 'host'; room: HostRoom } | { kind: 'guest'; link: GuestLink };

export function useMatch(config: MatchConfig, opts: { botDelay: number; paused: boolean }, net: NetMode) {
  const guest = net.kind === 'guest' ? net.link : null;
  const room = net.kind === 'host' ? net.room : null;
  useRoom(guest);

  const [localState, setLocalState] = useState<GameState>(() => guest?.state ?? createGame(config.setup));
  const [error, setError] = useState<string | null>(null);
  const state = guest?.state ?? localState;
  const stateRef = useRef(state);
  stateRef.current = state;
  const history = useRef<GameState[]>([]); // estados antes de cada jugada humana (para deshacer)

  const setState = useCallback((s: GameState) => {
    stateRef.current = s;
    setLocalState(s);
  }, []);

  /** Aplica una acción; devuelve el error (o null si salió bien). */
  const apply = useCallback(
    (pid: PlayerId, action: Action): string | null => {
      const prev = stateRef.current;
      try {
        const next = applyAction(prev, pid, action);
        if (!prev.players[pid].isBot) history.current.push(prev);
        if (history.current.length > 50) history.current.shift();
        setState(next);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    },
    [setState],
  );

  const dispatch = useCallback(
    (pid: PlayerId, action: Action): boolean => {
      if (guest) {
        guest.send(action);
        return true;
      }
      const err = apply(pid, action);
      setError(err);
      return err === null;
    },
    [guest, apply],
  );

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (prev) setState(prev);
  }, [setState]);

  // Invitado: errores que devuelve el anfitrión.
  const guestErr = guest?.lastError;
  useEffect(() => {
    if (guestErr) setError(guestErr.text);
  }, [guestErr]);

  // Anfitrión: reparte cada estado nuevo y recibe acciones y desconexiones.
  useEffect(() => {
    if (room) room.broadcastState(localState);
  }, [room, localState]);
  useEffect(() => {
    if (!room) return;
    room.onAction = (seat, action) => apply(seat, action);
    room.onSeatConnection = (seat, connected) => setState(setSeatBot(stateRef.current, seat, !connected));
  }, [room, apply, setState]);

  // Bots: solo donde corre el motor (local o anfitrión), y sin animaciones pendientes.
  useEffect(() => {
    if (guest || opts.paused) return;
    const actor = currentActor(state);
    if (actor === null || !state.players[actor].isBot) return;
    const t = setTimeout(() => {
      const s = stateRef.current;
      if (s !== state) return;
      try {
        setState(applyAction(s, actor, chooseBotAction(s, actor)));
      } catch (e) {
        setError(`Bot: ${e instanceof Error ? e.message : String(e)}`);
      }
    }, opts.botDelay);
    return () => clearTimeout(t);
  }, [guest, state, opts.botDelay, opts.paused, setState]);

  return { state, dispatch, setState, undo, canUndo: !guest && history.current.length > 0, error, setError };
}
