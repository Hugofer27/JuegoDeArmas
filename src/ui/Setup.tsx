import { useState, type CSSProperties } from 'react';
import pkg from '../../package.json';
import type { GameSetup } from '../engine';
import { audio } from './audio/audio';
import { characterOf, SEAT_COLORS } from './components';
import { Sprite } from './pixel/Sprite';
import { updateSettings, useSettings } from './settings';

export interface MatchConfig {
  id: number;
  setup: GameSetup;
  dev: boolean;
}

interface SeatForm {
  name: string;
  isBot: boolean;
}

const STORAGE_KEY = 'armas.setup.v2';

function defaultSeats(): SeatForm[] {
  return [{ name: 'Hugo', isBot: false }, ...Array.from({ length: 5 }, (_, i) => ({ name: `Bot ${i + 2}`, isBot: true }))];
}

function load(): { count: number; seats: SeatForm[]; dev: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* sin datos guardados */
  }
  return { count: 4, seats: defaultSeats(), dev: true };
}

export function Setup({
  onStart,
  onOnline,
  onGallery,
  onCompendium,
}: {
  onStart: (c: MatchConfig) => void;
  onOnline: (hostName: string, dev: boolean) => void;
  onGallery: () => void;
  onCompendium: () => void;
}) {
  const saved = load();
  const settings = useSettings();
  const [count, setCount] = useState(saved.count);
  const [seats, setSeats] = useState<SeatForm[]>(saved.seats);
  const [dev, setDev] = useState(saved.dev);
  const [seed, setSeed] = useState('');

  const tap = () => {
    audio.unlock();
    audio.play('click');
  };
  const update = (i: number, patch: Partial<SeatForm>) => setSeats((prev) => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const start = () => {
    audio.unlock();
    audio.play('turnYou');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, seats, dev }));
    const players = seats.slice(0, count).map((s, i) => ({ name: s.name.trim() || `Jugador ${i + 1}`, isBot: s.isBot }));
    onStart({ id: Date.now(), setup: { players, seed: seed.trim() ? Number(seed) : undefined }, dev });
  };

  return (
    <div className="setup">
      <div className="setup__panel">
        <div className="logo">
          <Sprite name="hacha" scale={5} className="logo__l" />
          <div>
            <h1 className="title">Juego de Armas</h1>
            <div className="title__sub">Desarmado</div>
          </div>
          <Sprite name="espada" scale={5} className="logo__r" />
        </div>
        <p className="setup__sub">Riña de taberna para 2 a 6. Último en pie gana.</p>

        <div className="setup__field">
          <span className="setup__label">Luchadores</span>
          <div className="seg">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                className={n === count ? 'is-on' : ''}
                onClick={() => {
                  tap();
                  setCount(n);
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="setup__seats">
          {seats.slice(0, count).map((s, i) => (
            <div key={i} className="setup__seat" style={{ '--seat': SEAT_COLORS[i] } as CSSProperties}>
              <Sprite name={characterOf(i)} scale={3} className="idle" />
              <input value={s.name} onChange={(e) => update(i, { name: e.target.value })} maxLength={14} aria-label={`Nombre del asiento ${i + 1}`} />
              <div className="seg seg--small">
                <button
                  className={!s.isBot ? 'is-on' : ''}
                  onClick={() => {
                    tap();
                    update(i, { isBot: false });
                  }}
                >
                  Humano
                </button>
                <button
                  className={s.isBot ? 'is-on' : ''}
                  onClick={() => {
                    tap();
                    update(i, { isBot: true });
                  }}
                >
                  Bot
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="setup__hint">Varios humanos comparten la pantalla: la mano se tapa al cambiar de jugador.</p>

        <div className="setup__field">
          <span className="setup__label">Ritmo</span>
          <div className="seg">
            <button
              className={settings.speed === 'cine' ? 'is-on' : ''}
              onClick={() => {
                tap();
                updateSettings({ speed: 'cine' });
              }}
            >
              <Sprite name="cine" scale={2} /> Cinemático
            </button>
            <button
              className={settings.speed === 'rapido' ? 'is-on' : ''}
              onClick={() => {
                tap();
                updateSettings({ speed: 'rapido' });
              }}
            >
              <Sprite name="rayo" scale={2} /> Rápido
            </button>
          </div>
        </div>

        <div className="setup__row">
          <label className="check">
            <input type="checkbox" checked={dev} onChange={(e) => setDev(e.target.checked)} />
            Modo dev (dar cartas, fijar PV, deshacer)
          </label>
          <input
            className="setup__seed"
            placeholder="Semilla (opcional)"
            value={seed}
            onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
            aria-label="Semilla"
          />
        </div>

        <div className="setup__go">
          <div className="setup__modes">
            <button className="btn btn--big btn--gold" onClick={start}>
              ¡A la riña!
              <small>en esta pantalla</small>
            </button>
            <button
              className="btn btn--big"
              onClick={() => {
                tap();
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, seats, dev }));
                onOnline(seats[0].name.trim() || 'Anfitrión', dev);
              }}
            >
              Jugar online
              <small>crea una sala y comparte el link</small>
            </button>
          </div>
          <div className="setup__links">
            <button
              className="btn btn--small"
              onClick={() => {
                tap();
                onCompendium();
              }}
            >
              Compendio de cartas
            </button>
            <button
              className="btn btn--small"
              onClick={() => {
                tap();
                onGallery();
              }}
            >
              Ver arte
            </button>
          </div>
        </div>
      </div>
      <div className="setup__version" aria-label={`Versión ${pkg.version}`}>
        v{pkg.version}
      </div>
    </div>
  );
}
