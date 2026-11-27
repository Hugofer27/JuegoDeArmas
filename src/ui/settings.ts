// Preferencias del jugador que se guardan en el navegador: ritmo de animación y sonido.

import { useSyncExternalStore } from 'react';
import { audio } from './audio/audio';

export type Speed = 'cine' | 'rapido';

export interface Settings {
  speed: Speed;
  music: boolean;
  sfx: boolean;
}

const KEY = 'armas.settings.v1';
const listeners = new Set<() => void>();

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { speed: 'cine', music: true, sfx: true, ...JSON.parse(raw) };
  } catch {
    /* sin datos guardados */
  }
  return { speed: 'cine', music: true, sfx: true };
}

let current = load();
audio.setPrefs({ music: current.music, sfx: current.sfx });

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...current, ...patch };
  localStorage.setItem(KEY, JSON.stringify(current));
  audio.setPrefs({ music: current.music, sfx: current.sfx });
  listeners.forEach((l) => l());
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
