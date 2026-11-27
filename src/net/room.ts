// ============================================================================
//  JUEGO ONLINE (P2P)
// ============================================================================
//  El anfitrión crea una sala con un código (p. ej. K7QX2) y comparte un link
//  ...JuegoDeArmas/#sala=K7QX2. Los invitados abren el link y se conectan
//  directo al navegador del anfitrión (WebRTC vía PeerJS).
//
//  El anfitrión corre el motor y los bots. Los invitados solo mandan sus
//  acciones y reciben la partida "redactada" (sin ver manos ajenas ni el mazo).
//  PeerJS usa su servidor público gratuito solo para presentar a los navegadores;
//  la partida viaja directo entre ellos.
// ============================================================================

import Peer, { type DataConnection } from 'peerjs';
import { useSyncExternalStore } from 'react';
import { redactFor, type Action, type GameState, type PlayerId } from '../engine';

const PREFIX = 'juego-de-armas-sala-';
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newRoomCode(): string {
  return Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
}

export function roomLink(code: string): string {
  return `${location.origin}${location.pathname}#sala=${code}`;
}

export function roomFromHash(): string | null {
  const m = /sala=([A-Z0-9]{5})/i.exec(location.hash);
  return m ? m[1].toUpperCase() : null;
}

// ------------------------------------------------------------------ mensajes

export type ToHost = { t: 'hello'; name: string } | { t: 'action'; action: Action } | { t: 'ping' };

export interface LobbySeat {
  name: string;
  kind: 'host' | 'guest';
  connected: boolean;
}

export type ToGuest =
  | { t: 'lobby'; seats: LobbySeat[] }
  | { t: 'state'; seat: PlayerId; state: GameState }
  | { t: 'error'; message: string }
  | { t: 'kick'; message: string }
  | { t: 'ping' };

/** Cada cuánto se mandan latidos, y tras cuánto silencio se da por caída la conexión. */
const PING_MS = 2000;
const TIMEOUT_MS = 10000;

const PEER_ERRORS: Record<string, string> = {
  'peer-unavailable': 'No encontré esa sala. Revisa el link o pídele al anfitrión que la vuelva a crear.',
  network: 'No hay conexión con el servidor de salas. Revisa tu internet.',
  'server-error': 'El servidor de salas no responde. Intenta de nuevo en un rato.',
  'browser-incompatible': 'Este navegador no soporta juego online. Usa Chrome, Edge o Firefox.',
  'socket-error': 'Se cortó la conexión con el servidor de salas.',
};

function peerErrorText(type: string, fallback: string): string {
  return PEER_ERRORS[type] ?? fallback;
}

/** Base con suscripción para React (useSyncExternalStore). */
class Observable {
  private listeners = new Set<() => void>();
  version = 0;
  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  protected changed(): void {
    this.version++;
    this.listeners.forEach((l) => l());
  }
}

export function useRoom<T extends Observable>(room: T | null): number {
  return useSyncExternalStore(
    room ? room.subscribe : () => () => {},
    () => (room ? room.version : 0),
  );
}

// ------------------------------------------------------------------ anfitrión

interface Guest {
  conn: DataConnection;
  name: string;
  seat: PlayerId | null; // asiento en la partida (null = aún en la sala de espera)
  connected: boolean;
  lastSeen: number;
}

export class HostRoom extends Observable {
  code = newRoomCode();
  status: 'opening' | 'open' | 'error' = 'opening';
  error = '';
  started = false;
  private peer: Peer | null = null;
  private guests: Guest[] = [];
  private lastState: GameState | null = null;
  private heartbeat = 0;

  /** El juego conecta aquí cómo aplicar acciones de invitados. Devuelve un error o null. */
  onAction: (seat: PlayerId, action: Action) => string | null = () => 'La partida aún no empieza.';
  /** Avisos de conexión/desconexión durante la partida. */
  onSeatConnection: (seat: PlayerId, connected: boolean) => void = () => {};

  constructor(public hostName: string) {
    super();
    this.open();
    this.heartbeat = window.setInterval(() => this.beat(), PING_MS);
  }

  /** Latido: avisa que seguimos y suelta a quien lleva mucho sin responder. */
  private beat(): void {
    const now = Date.now();
    for (const g of this.guests) {
      if (!g.connected) continue;
      if (now - g.lastSeen > TIMEOUT_MS) {
        this.drop(g.conn);
        continue;
      }
      g.conn.send({ t: 'ping' } satisfies ToGuest);
    }
  }

  private open(attempt = 0): void {
    const peer = new Peer(PREFIX + this.code, { debug: 0 });
    this.peer = peer;
    peer.on('open', () => {
      this.status = 'open';
      this.changed();
    });
    peer.on('connection', (conn) => this.accept(conn));
    peer.on('error', (err: { type: string; message: string }) => {
      if (err.type === 'unavailable-id' && attempt < 5) {
        peer.destroy();
        this.code = newRoomCode();
        this.open(attempt + 1);
        return;
      }
      if (err.type === 'peer-unavailable') return; // un invitado que se fue
      this.status = 'error';
      this.error = peerErrorText(err.type, err.message);
      this.changed();
    });
    peer.on('disconnected', () => {
      if (!peer.destroyed) peer.reconnect();
    });
  }

  /** Jugadores en la sala de espera (anfitrión + invitados conectados). */
  get lobby(): LobbySeat[] {
    return [
      { name: this.hostName, kind: 'host', connected: true },
      ...this.guests.filter((g) => this.started || g.connected).map((g) => ({ name: g.name, kind: 'guest' as const, connected: g.connected })),
    ];
  }

  get waitingGuests(): number {
    return this.guests.filter((g) => g.connected).length;
  }

  private accept(conn: DataConnection): void {
    conn.on('data', (raw) => this.receive(conn, raw as ToHost));
    conn.on('close', () => this.drop(conn));
    conn.on('error', () => this.drop(conn));
  }

  private receive(conn: DataConnection, msg: ToHost): void {
    const known = this.guests.find((x) => x.conn === conn);
    if (known) known.lastSeen = Date.now();
    if (msg.t === 'ping') return;
    if (msg.t === 'hello') {
      const name = String(msg.name || 'Invitado').slice(0, 14);
      if (this.started) {
        // ¿vuelve alguien que se desconectó? recupera su asiento por nombre
        const back = this.guests.find((g) => !g.connected && g.seat !== null && g.name === name);
        if (!back) {
          conn.send({ t: 'kick', message: 'La partida ya empezó. Pídele al anfitrión una revancha.' } satisfies ToGuest);
          return;
        }
        back.conn = conn;
        back.connected = true;
        back.lastSeen = Date.now();
        this.onSeatConnection(back.seat!, true);
        if (this.lastState) this.sendState(back, this.lastState);
        this.changed();
        return;
      }
      if (this.guests.filter((g) => g.connected).length >= 5) {
        conn.send({ t: 'kick', message: 'La sala está llena (máximo 6 jugadores).' } satisfies ToGuest);
        return;
      }
      this.guests.push({ conn, name, seat: null, connected: true, lastSeen: Date.now() });
      this.broadcastLobby();
      return;
    }
    if (msg.t === 'action') {
      const g = this.guests.find((x) => x.conn === conn);
      if (!g || g.seat === null) return;
      const err = this.onAction(g.seat, msg.action);
      if (err) conn.send({ t: 'error', message: err } satisfies ToGuest);
    }
  }

  private drop(conn: DataConnection): void {
    const g = this.guests.find((x) => x.conn === conn);
    if (!g || !g.connected) return;
    g.connected = false;
    if (!this.started) this.guests = this.guests.filter((x) => x !== g);
    else if (g.seat !== null) this.onSeatConnection(g.seat, false);
    this.broadcastLobby();
  }

  private broadcastLobby(): void {
    const seats = this.lobby;
    for (const g of this.guests) if (g.connected) g.conn.send({ t: 'lobby', seats } satisfies ToGuest);
    this.changed();
  }

  /** Reparte asientos: anfitrión 0, invitados en orden de llegada. Devuelve los nombres humanos. */
  start(): string[] {
    this.started = true;
    const present = this.guests.filter((g) => g.connected).slice(0, 5);
    present.forEach((g, i) => (g.seat = i + 1));
    this.guests = present;
    this.changed();
    return [this.hostName, ...present.map((g) => g.name)];
  }

  private sendState(g: Guest, state: GameState): void {
    if (g.connected && g.seat !== null) g.conn.send({ t: 'state', seat: g.seat, state: redactFor(state, g.seat) } satisfies ToGuest);
  }

  broadcastState(state: GameState): void {
    this.lastState = state;
    for (const g of this.guests) this.sendState(g, state);
  }

  isConnected(seat: PlayerId): boolean {
    return seat === 0 || this.guests.some((g) => g.seat === seat && g.connected);
  }

  close(): void {
    window.clearInterval(this.heartbeat);
    for (const g of this.guests) if (g.connected) g.conn.close();
    this.peer?.destroy();
  }
}

// ------------------------------------------------------------------ invitado

export class GuestLink extends Observable {
  status: 'connecting' | 'lobby' | 'playing' | 'error' | 'closed' = 'connecting';
  error = '';
  seats: LobbySeat[] = [];
  seat: PlayerId = 0;
  state: GameState | null = null;
  lastError: { id: number; text: string } | null = null;
  private peer: Peer;
  private conn: DataConnection | null = null;
  private errId = 0;
  private lastSeen = Date.now();
  private heartbeat = 0;

  constructor(
    public code: string,
    public name: string,
  ) {
    super();
    this.peer = new Peer({ debug: 0 });
    this.peer.on('open', () => this.connect());
    this.heartbeat = window.setInterval(() => {
      if (this.status !== 'lobby' && this.status !== 'playing') return;
      if (Date.now() - this.lastSeen > TIMEOUT_MS) {
        this.status = 'closed';
        this.error = 'El anfitrión dejó de responder. Si vuelve a abrir la sala, entra de nuevo con el mismo nombre.';
        this.changed();
        return;
      }
      this.conn?.send({ t: 'ping' } satisfies ToHost);
    }, PING_MS);
    this.peer.on('error', (err: { type: string; message: string }) => {
      this.fail(peerErrorText(err.type, err.message));
    });
  }

  private connect(): void {
    const conn = this.peer.connect(PREFIX + this.code, { reliable: true });
    this.conn = conn;
    conn.on('open', () => {
      this.lastSeen = Date.now();
      conn.send({ t: 'hello', name: this.name } satisfies ToHost);
      if (this.status === 'connecting') {
        this.status = 'lobby';
        this.changed();
      }
    });
    conn.on('data', (raw) => this.receive(raw as ToGuest));
    conn.on('close', () => {
      if (this.status !== 'error') {
        this.status = 'closed';
        this.error = 'Se cortó la conexión con el anfitrión.';
        this.changed();
      }
    });
  }

  private receive(msg: ToGuest): void {
    this.lastSeen = Date.now();
    switch (msg.t) {
      case 'ping':
        return;
      case 'lobby':
        this.seats = msg.seats;
        break;
      case 'state':
        this.seat = msg.seat;
        this.state = msg.state;
        this.status = 'playing';
        break;
      case 'error':
        this.lastError = { id: ++this.errId, text: msg.message };
        break;
      case 'kick':
        this.fail(msg.message);
        return;
    }
    this.changed();
  }

  private fail(text: string): void {
    this.status = 'error';
    this.error = text;
    this.changed();
  }

  send(action: Action): void {
    this.conn?.send({ t: 'action', action } satisfies ToHost);
  }

  close(): void {
    window.clearInterval(this.heartbeat);
    this.conn?.close();
    this.peer.destroy();
  }
}
