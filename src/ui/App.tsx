import { useState } from 'react';
import { Setup, type MatchConfig } from './Setup';
import { GameScreen } from './GameScreen';
import { Gallery } from './Gallery';

export function App() {
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [gallery, setGallery] = useState(false);
  if (gallery) return <Gallery onBack={() => setGallery(false)} />;
  if (!config) return <Setup onStart={setConfig} onGallery={() => setGallery(true)} />;
  return (
    <GameScreen
      key={config.id}
      config={config}
      onExit={() => setConfig(null)}
      onRematch={() => setConfig({ ...config, id: config.id + 1, setup: { ...config.setup, seed: undefined } })}
    />
  );
}
