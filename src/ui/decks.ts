// Barajas personalizadas guardadas en el navegador (localStorage).

import { useSyncExternalStore } from 'react';
import { CARDS } from '../engine';

export interface CustomDeck {
  id: string;
  name: string;
  counts: Record<string, number>;
}

export interface DeckStore {
  activeId: string | null; // null = baraja estándar
  decks: CustomDeck[];
}

const KEY = 'armas.decks.v1';

export function defaultCounts(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of CARDS) out[c.id] = c.copies;
  return out;
}

export function countDeckTotal(counts: Record<string, number>): number {
  let total = 0;
  for (const c of CARDS) total += Math.max(0, Math.floor(counts[c.id] ?? 0));
  return total;
}

function load(): DeckStore {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DeckStore>;
      const decks = Array.isArray(parsed.decks) ? parsed.decks : [];
      const activeId = parsed.activeId && decks.some((d) => d.id === parsed.activeId) ? parsed.activeId : null;
      return { activeId, decks };
    }
  } catch {
    /* sin datos guardados */
  }
  return { activeId: null, decks: [] };
}

let store: DeckStore = load();
const listeners = new Set<() => void>();

function commit(next: DeckStore): void {
  store = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    /* almacenamiento lleno o bloqueado */
  }
  for (const fn of listeners) fn();
}

export function setActiveDeck(id: string | null): void {
  const valid = id && store.decks.some((d) => d.id === id) ? id : null;
  commit({ ...store, activeId: valid });
}

export function saveCustomDeck(deck: CustomDeck, activate = true): CustomDeck {
  const clean: CustomDeck = {
    id: deck.id,
    name: deck.name.trim() || 'Baraja personalizada',
    counts: { ...deck.counts },
  };
  const exists = store.decks.some((d) => d.id === clean.id);
  const decks = exists ? store.decks.map((d) => (d.id === clean.id ? clean : d)) : [...store.decks, clean];
  commit({ activeId: activate ? clean.id : store.activeId, decks });
  return clean;
}

export function deleteCustomDeck(id: string): void {
  const decks = store.decks.filter((d) => d.id !== id);
  const activeId = store.activeId === id ? null : store.activeId;
  commit({ activeId, decks });
}

export function useDecks(): DeckStore {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => store,
  );
}
