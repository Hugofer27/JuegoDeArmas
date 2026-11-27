// Salas online: el anfitrión comparte un link; el invitado lo abre, pone su nombre y espera.

import { useState, type CSSProperties } from 'react';
import { audio } from './audio/audio';
import { characterOf, SEAT_COLORS } from './components';
import { Sprite } from './pixel/Sprite';
import { roomLink, useRoom, type GuestLink, type HostRoom, type LobbySeat } from '../net/room';

const NAME_KEY = 'armas.name';
export const savedName = () => localStorage.getItem(NAME_KEY) || '';

function SeatList({ seats, total }: { seats: LobbySeat[]; total: number }) {
  return (
    <div className="lobby__seats">
      {Array.from({ length: total }, (_, i) => {
        const s = seats[i];
        return (
          <div key={i} className={`lobby__seat${s ? '' : ' is-bot'}`} style={{ '--seat': SEAT_COLORS[i] } as CSSProperties}>
            <Sprite name={characterOf(i)} scale={3} className={s ? 'idle' : ''} />
            <span className="lobby__name">{s ? s.name : `Bot ${i + 1}`}</span>
            <span className="lobby__kind">{s ? (s.kind === 'host' ? 'Anfitrión' : s.connected ? 'Conectado' : 'Desconectado') : 'Bot'}</span>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ anfitrión

export function HostLobby({ room, onStart, onExit }: { room: HostRoom; onStart: (total: number) => void; onExit: () => void }) {
  useRoom(room);
  const [total, setTotal] = useState(4);
  const [copied, setCopied] = useState(false);
  const humans = room.lobby.length;
  const count = Math.max(total, humans);
  const link = roomLink(room.code);

  const copy = async () => {
    audio.play('click');
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copia este link:', link);
    }
  };

  return (
    <div className="setup">
      <div className="setup__panel lobby">
        <h1 className="title title--small">Sala online</h1>
        {room.status === 'opening' && <p className="setup__sub">Abriendo la sala…</p>}
        {room.status === 'error' && (
          <>
            <p className="lobby__error">{room.error}</p>
            <button className="btn" onClick={onExit}>
              Volver
            </button>
          </>
        )}
        {room.status === 'open' && (
          <>
            <div className="lobby__code">
              <span>Código</span>
              <b>{room.code}</b>
            </div>
            <p className="setup__sub">Mándale este link a tus amigos. Al abrirlo entran directo a la sala.</p>
            <div className="lobby__link">
              <input value={link} readOnly onFocus={(e) => e.target.select()} aria-label="Link de la sala" />
              <button className="btn btn--small btn--gold" onClick={copy}>
                {copied ? '¡Copiado!' : 'Copiar link'}
              </button>
            </div>

            <div className="setup__field">
              <span className="setup__label">Luchadores</span>
              <div className="seg">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    className={n === count ? 'is-on' : ''}
                    disabled={n < humans}
                    onClick={() => {
                      audio.play('click');
                      setTotal(n);
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <SeatList seats={room.lobby} total={count} />
            <p className="setup__hint">
              {humans === 1 ? 'Esperando invitados… ' : `${humans - 1} invitado(s) en la sala. `}
              Los asientos libres los juegan bots.
            </p>
            <div className="setup__go">
              <button
                className="btn btn--big btn--gold"
                onClick={() => {
                  audio.unlock();
                  audio.play('turnYou');
                  onStart(count);
                }}
              >
                ¡A la riña!
              </button>
              <button className="btn btn--small" onClick={onExit}>
                Cerrar sala
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ invitado

export function JoinScreen({ code, onJoin, onExit }: { code: string; onJoin: (name: string) => void; onExit: () => void }) {
  const [name, setName] = useState(savedName());
  const go = () => {
    const n = name.trim() || 'Invitado';
    localStorage.setItem(NAME_KEY, n);
    audio.unlock();
    audio.play('click');
    onJoin(n);
  };
  return (
    <div className="setup">
      <div className="setup__panel lobby">
        <h1 className="title title--small">Te invitaron a una riña</h1>
        <div className="lobby__code">
          <span>Sala</span>
          <b>{code}</b>
        </div>
        <label className="lobby__namefield">
          <span className="setup__label">Tu nombre</span>
          <input
            value={name}
            maxLength={14}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            placeholder="Ej. Mario"
          />
        </label>
        <div className="setup__go">
          <button className="btn btn--big btn--gold" onClick={go}>
            Entrar
          </button>
          <button className="btn btn--small" onClick={onExit}>
            Ir al menú
          </button>
        </div>
      </div>
    </div>
  );
}

export function GuestLobby({ link, onExit }: { link: GuestLink; onExit: () => void }) {
  useRoom(link);
  const host = link.seats[0]?.name ?? 'el anfitrión';
  return (
    <div className="setup">
      <div className="setup__panel lobby">
        <h1 className="title title--small">Sala {link.code}</h1>
        {link.status === 'connecting' && <p className="setup__sub">Entrando a la sala…</p>}
        {(link.status === 'error' || link.status === 'closed') && <p className="lobby__error">{link.error}</p>}
        {link.status === 'lobby' && (
          <>
            <p className="setup__sub">Estás dentro. Esperando a que {host} empiece la partida.</p>
            <SeatList seats={link.seats} total={Math.max(link.seats.length, 2)} />
          </>
        )}
        <div className="setup__go">
          <button className="btn btn--small" onClick={onExit}>
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
