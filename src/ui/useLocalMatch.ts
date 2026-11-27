// Controlador de partida local: guarda el estado, aplica acciones y hace jugar a los bots.
// Para el modo online se hará otro controlador con la misma forma (state + dispatch).

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyAction, createGame, currentActor, type Action, type GameState, type PlayerId } from '../engine';
import { chooseBotAction } from '../bots/bot';
import type { MatchConfig } from './Setup';

export function useLocalMatch(config: MatchConfig, opts: { botDelay: number; paused: boolean }) {
  const [state, setStateRaw] = useState<GameState>(() => createGame(config.setup));
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  const history = useRef<GameState[]>([]); // estados antes de cada jugada humana (para deshacer)

  const setState = useCallback((s: GameState) => {
    stateRef.current = s;
    setStateRaw(s);
  }, []);

  const dispatch = useCallback(
    (pid: PlayerId, action: Action): boolean => {
      const prev = stateRef.current;
      try {
        const next = applyAction(prev, pid, action);
        if (!prev.players[pid].isBot) history.current.push(prev);
        if (history.current.length > 50) history.current.shift();
        setError(null);
        setState(next);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      }
    },
    [setState],
  );

  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (prev) setState(prev);
  }, [setState]);

  // Bots: cuando le toca decidir a un bot (y no hay animaciones pendientes), juega tras una pausa.
  useEffect(() => {
    if (opts.paused) return;
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
  }, [state, opts.botDelay, opts.paused, setState]);

  return { state, dispatch, setState, undo, canUndo: history.current.length > 0, error, setError };
}
