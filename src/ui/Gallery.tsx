// Galería de todo el arte pixel, para revisarlo y editarlo (src/ui/pixel/sprites.ts).

import { CARDS } from '../engine';
import { audio } from './audio/audio';
import { CardView } from './components';
import { Sprite } from './pixel/Sprite';
import { SPRITES } from './pixel/sprites';

export function Gallery({ onBack }: { onBack: () => void }) {
  return (
    <div className="gallery">
      <div className="gallery__head">
        <button
          className="btn btn--small"
          onClick={() => {
            audio.play('click');
            onBack();
          }}
        >
          Volver
        </button>
        <h2>Arte del juego</h2>
        <p>Cada sprite se dibuja como texto en src/ui/pixel/sprites.ts.</p>
      </div>
      <div className="gallery__grid">
        {Object.keys(SPRITES)
          .filter((k) => k !== 'vacio')
          .map((name) => (
            <figure key={name} className="gallery__item">
              <Sprite name={name} scale={4} />
              <figcaption>{name}</figcaption>
            </figure>
          ))}
      </div>
      <h3 className="gallery__h">Cartas</h3>
      <div className="gallery__cards">
        {CARDS.map((c) => (
          <CardView key={c.id} defId={c.id} />
        ))}
      </div>
    </div>
  );
}
