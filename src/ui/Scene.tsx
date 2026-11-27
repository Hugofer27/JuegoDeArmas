// Fondo de la taberna dibujado píxel a píxel en un canvas a 1/3 de resolución:
// suelo de losas, mesa redonda de tablones y luz cálida con tramado (dithering).
// La mesa se ubica sobre el área de juego para que los asientos queden en su borde.

import { useEffect, useRef, type RefObject } from 'react';

export const PX = 3; // tamaño de un "píxel" del escenario en pantalla

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const FLOOR = ['#0b0d18', '#11152a', '#171d38', '#1e2647', '#273156', '#33355a'];
const FLOOR_WARM = ['#140f18', '#1f1520', '#2c1d26', '#3b272b', '#4d3330', '#5e3e33'];
const MORTAR = '#080a12';
const WOOD = ['#3a1f0e', '#4f2a14', '#66361a', '#7c4421', '#935229', '#a8622f'];
const SEAM = '#2a1408';
const RIM = '#1e0f06';
const RIM_HI = '#b5733c';

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const pal = (list: string[]) => list.map(hex);
const FLOOR_RGB = pal(FLOOR);
const FLOOR_WARM_RGB = pal(FLOOR_WARM);
const WOOD_RGB = pal(WOOD);
const MORTAR_RGB = hex(MORTAR);
const SEAM_RGB = hex(SEAM);
const RIM_RGB = hex(RIM);
const RIM_HI_RGB = hex(RIM_HI);

function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pick(list: [number, number, number][], light: number, x: number, y: number) {
  const t = (BAYER[y & 3][x & 3] + 0.5) / 16;
  const i = Math.max(0, Math.min(list.length - 1, Math.floor(light * (list.length - 1) + t)));
  return list[i];
}

export function Scene({ arenaRef }: { arenaRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const draw = () => {
      const c = canvasRef.current;
      const arena = arenaRef.current;
      if (!c || !arena) return;
      const W = Math.ceil(window.innerWidth / PX);
      const H = Math.ceil(window.innerHeight / PX);
      if (W < 1 || H < 1) return; // pestaña oculta o minimizada: se dibuja al volver
      c.width = W;
      c.height = H;
      c.style.width = `${W * PX}px`;
      c.style.height = `${H * PX}px`;
      const ctx = c.getContext('2d')!;
      const img = ctx.createImageData(W, H);
      const data = img.data;

      const r = arena.getBoundingClientRect();
      const cx = (r.left + r.width * 0.5) / PX;
      const cy = (r.top + r.height * 0.55) / PX;
      const rx = (r.width * 0.33) / PX;
      const ry = (r.height * 0.36) / PX;
      // antorchas (mismas posiciones que .torch--l/.torch--r en styles.css)
      const torches = [
        { x: (r.left + r.width * 0.13) / PX, y: (r.top + r.height * 0.3) / PX },
        { x: (r.left + r.width * 0.87) / PX, y: (r.top + r.height * 0.3) / PX },
      ];
      const tableTop = cy - ry;

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const dxn = (x - cx) / rx;
          const dyn = (y - cy) / ry;
          const d = Math.sqrt(dxn * dxn + dyn * dyn);
          // luz: vela sobre la mesa + antorchas
          let light = 0.95 * Math.exp(-d * d * 0.55);
          let warm = light;
          for (const t of torches) {
            const td = Math.hypot(x - t.x, (y - t.y) * 1.2) / (W * 0.16);
            const tl = 0.75 * Math.exp(-td * td);
            light += tl;
            warm += tl;
          }
          light = Math.min(1, light * 0.9 + 0.06);
          let rgb: [number, number, number];

          if (d <= 1) {
            // mesa
            const rimW = 2.6 / ry;
            if (d > 1 - rimW) {
              rgb = dyn < -0.2 && d < 1 - rimW * 0.45 ? RIM_HI_RGB : RIM_RGB;
            } else {
              const py = y - Math.floor(tableTop);
              const plank = Math.floor(py / 7);
              if (py % 7 === 0) rgb = SEAM_RGB;
              else {
                const grain = hash(Math.floor((x + plank * 13) / 9), plank) * 0.18 - 0.09;
                const knot = hash(x, y) > 0.985 ? -0.25 : 0;
                rgb = pick(WOOD_RGB, Math.max(0, Math.min(1, 0.32 + light * 0.75 + grain + knot)), x, y);
              }
            }
          } else {
            // sombra de la mesa
            const sy = (y - (cy + 5)) / ry;
            const sd = Math.sqrt(dxn * dxn + sy * sy);
            const shade = sd < 1.04 ? 0.45 : 1;
            // losas
            const row = Math.floor(y / 9);
            const off = row % 2 ? 9 : 0;
            const col = Math.floor((x + off) / 18);
            const mortar = y % 9 === 0 || (x + off) % 18 === 0;
            if (mortar) rgb = MORTAR_RGB;
            else {
              const v = hash(col, row) * 0.16 - 0.08;
              const crack = hash(x * 7, y * 3) > 0.993 ? -0.3 : 0;
              const l = Math.max(0, Math.min(1, (light + v + crack) * shade));
              rgb = pick(warm > 0.35 ? FLOOR_WARM_RGB : FLOOR_RGB, l, x, y);
            }
          }
          const i = (y * W + x) * 4;
          data[i] = rgb[0];
          data[i + 1] = rgb[1];
          data[i + 2] = rgb[2];
          data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    draw();
    const ro = new ResizeObserver(draw);
    if (arenaRef.current) ro.observe(arenaRef.current);
    window.addEventListener('resize', draw);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [arenaRef]);

  return <canvas className="scene" ref={canvasRef} aria-hidden="true" />;
}
