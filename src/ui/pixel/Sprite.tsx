// Dibuja un sprite de sprites.ts en un canvas una sola vez y lo reutiliza como imagen.

import type { CSSProperties } from 'react';
import { PALETTE, SPRITES } from './sprites';

interface Baked {
  url: string;
  w: number;
  h: number;
}

const cache = new Map<string, Baked>();

export function bakeSprite(name: string): Baked {
  const hit = cache.get(name);
  if (hit) return hit;
  const def = SPRITES[name] ?? SPRITES.vacio;
  const rows = def.rows;
  const h = rows.length;
  const w = rows[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const filled = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.';
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch !== '.') {
        ctx.fillStyle = PALETTE[ch];
        ctx.fillRect(x, y, 1, 1);
      } else if (def.outline !== false && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) {
        ctx.fillStyle = PALETTE.k;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  const baked = { url: canvas.toDataURL(), w, h };
  cache.set(name, baked);
  return baked;
}

export function Sprite({
  name,
  scale = 3,
  className,
  style,
  title,
}: {
  name: string;
  scale?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const b = bakeSprite(name);
  return (
    <img
      src={b.url}
      width={b.w * scale}
      height={b.h * scale}
      className={`sprite${className ? ` ${className}` : ''}`}
      style={style}
      alt=""
      draggable={false}
      title={title}
    />
  );
}
