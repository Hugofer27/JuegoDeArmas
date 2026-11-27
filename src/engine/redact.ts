// Vista de la partida para un jugador online: sus cartas se ven, las del resto y el
// mazo van boca abajo. El anfitrión manda esto a cada invitado.

import type { GameState, PlayerId } from './types';
import { HIDDEN_CARD } from './cards';

export function redactFor(s: GameState, pid: PlayerId): GameState {
  return {
    ...s,
    players: s.players.map((p) =>
      p.id === pid ? p : { ...p, hand: p.hand.map((c) => ({ uid: c.uid, defId: HIDDEN_CARD.id })) },
    ),
    deck: s.deck.map((_, i) => ({ uid: `m${i}`, defId: HIDDEN_CARD.id })),
    rng: 0,
  };
}
