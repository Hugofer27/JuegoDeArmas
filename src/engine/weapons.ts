// Armas. Para cambiar números o rasgos, editar aquí y en REGLAS.md (sección 3).

import type { WeaponId } from './types';

export interface WeaponDef {
  id: WeaponId | 'punos';
  name: string;
  icon: string; // emoji temporal hasta tener arte
  near: number; // daño a cercanos
  far: number; // daño a lejanos
  text: string;
  ignoresArmor?: boolean; // Garrote
  shieldProof?: boolean; // Mangual: no le afectan Escudo ni Escudo Rebote
  prostrateOnAttack?: boolean; // Hacha: quedas Postrado tras atacar
  lostOnShield?: boolean; // Daga: la pierdes si usas una carta de Escudo
}

export const PUNOS: WeaponDef = {
  id: 'punos',
  name: 'Puños',
  icon: '👊',
  near: 1,
  far: 0,
  text: 'Por defecto si no tienes arma.',
};

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  espada: { id: 'espada', name: 'Espada', icon: '⚔️', near: 3, far: 0, text: 'Sin efecto especial.' },
  daga: {
    id: 'daga',
    name: 'Daga',
    icon: '🗡️',
    near: 2,
    far: 2,
    lostOnShield: true,
    text: 'Si usas Escudo o Escudo Rebote, pierdes la Daga.',
  },
  arco: { id: 'arco', name: 'Arco', icon: '🏹', near: 1, far: 3, text: 'Sin efecto especial.' },
  hacha: {
    id: 'hacha',
    name: 'Hacha',
    icon: '🪓',
    near: 5,
    far: 3,
    prostrateOnAttack: true,
    text: 'Tras atacar con ella quedas Postrado (pierdes tu próximo turno).',
  },
  mangual: {
    id: 'mangual',
    name: 'Mangual',
    icon: '⛓️',
    near: 1,
    far: 2,
    shieldProof: true,
    text: 'No se puede bloquear con Escudo ni Escudo Rebote.',
  },
  garrote: {
    id: 'garrote',
    name: 'Garrote',
    icon: '🪵',
    near: 2,
    far: 0,
    ignoresArmor: true,
    text: 'Ignora la armadura.',
  },
};

/** Caras del Dado de Armas. */
export const WEAPON_DIE: WeaponId[] = ['espada', 'daga', 'arco', 'hacha', 'mangual', 'garrote'];

export function weaponDef(w: WeaponId | null): WeaponDef {
  return w ? WEAPONS[w] : PUNOS;
}
