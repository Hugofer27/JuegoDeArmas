import { useState } from 'react';
import { Setup, type MatchConfig } from './Setup';
import { GameScreen } from './GameScreen';
import { Gallery } from './Gallery';
import { Compendium } from './Compendium';
import { GuestLobby, HostLobby, JoinScreen } from './Lobby';
import { GuestLink, HostRoom, roomFromHash, useRoom } from '../net/room';
import type { NetMode } from './useMatch';

type Screen =
  | { k: 'setup' }
  | { k: 'gallery' }
  | { k: 'compendium' }
  | { k: 'join'; code: string }
  | { k: 'host'; room: HostRoom; dev: boolean; deckCounts?: Record<string, number> }
  | { k: 'guest'; link: GuestLink }
  | { k: 'game'; config: MatchConfig; net: NetMode };

function clearHash() {
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}

/** Invitado: sala de espera hasta que el anfitrión reparte la partida. */
function GuestFlow({ link, onExit }: { link: GuestLink; onExit: () => void }) {
  useRoom(link);
  if (!link.state) return <GuestLobby link={link} onExit={onExit} />;
  return (
    <GameScreen
      key={link.state.options.seed}
      config={{ id: link.state.options.seed, setup: { players: [] }, dev: false }}
      net={{ kind: 'guest', link }}
      onExit={onExit}
      onRematch={() => {}}
    />
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>(() => {
    const code = roomFromHash();
    return code ? { k: 'join', code } : { k: 'setup' };
  });
  const toSetup = () => {
    clearHash();
    setScreen({ k: 'setup' });
  };

  switch (screen.k) {
    case 'gallery':
      return <Gallery onBack={toSetup} />;
    case 'compendium':
      return <Compendium onBack={toSetup} />;
    case 'join':
      return <JoinScreen code={screen.code} onJoin={(name) => setScreen({ k: 'guest', link: new GuestLink(screen.code, name) })} onExit={toSetup} />;
    case 'guest':
      return (
        <GuestFlow
          link={screen.link}
          onExit={() => {
            screen.link.close();
            toSetup();
          }}
        />
      );
    case 'host':
      return (
        <HostLobby
          room={screen.room}
          onExit={() => {
            screen.room.close();
            toSetup();
          }}
          onStart={(total) => {
            const names = screen.room.start();
            const players = [
              ...names.map((name) => ({ name, isBot: false })),
              ...Array.from({ length: Math.max(0, total - names.length) }, (_, i) => ({ name: `Bot ${names.length + i + 1}`, isBot: true })),
            ];
            setScreen({
              k: 'game',
              config: { id: Date.now(), setup: { players, deckCounts: screen.deckCounts }, dev: screen.dev },
              net: { kind: 'host', room: screen.room },
            });
          }}
        />
      );
    case 'game': {
      const { config, net } = screen;
      return (
        <GameScreen
          key={config.id}
          config={config}
          net={net}
          onExit={() => {
            if (net.kind === 'host') net.room.close();
            toSetup();
          }}
          onRematch={() => setScreen({ k: 'game', net, config: { ...config, id: config.id + 1, setup: { ...config.setup, seed: undefined } } })}
        />
      );
    }
    default:
      return (
        <Setup
          onStart={(config) => setScreen({ k: 'game', config, net: { kind: 'local' } })}
          onOnline={(hostName, dev, deckCounts) => setScreen({ k: 'host', room: new HostRoom(hostName), dev, deckCounts })}
          onGallery={() => setScreen({ k: 'gallery' })}
          onCompendium={() => setScreen({ k: 'compendium' })}
        />
      );
  }
}
