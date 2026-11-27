// Capa de efectos encima de todo: proyectiles, números, chispas, carteles.
// Cada efecto vive unos milisegundos y se borra solo.

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { WEAPON_DIE, type WeaponId } from '../../engine';
import { CardView } from '../components';
import { Sprite } from '../pixel/Sprite';

export interface Pt {
  x: number;
  y: number;
}

interface Particle {
  dx: number;
  dy: number;
  size: number;
  color: string;
  delay: number;
}

export type Effect =
  | { id: number; kind: 'banner'; text: string; sub?: string; sprite?: string; you: boolean; dur: number }
  | { id: number; kind: 'cardfly'; defId: string; from: Pt; to: Pt; dur: number }
  | { id: number; kind: 'projectile'; sprite: string; from: Pt; to: Pt; dur: number; arc: number; spin: boolean }
  | { id: number; kind: 'text'; at: Pt; text: string; tone: string; dur: number }
  | { id: number; kind: 'burst'; at: Pt; particles: Particle[]; dur: number }
  | { id: number; kind: 'pop'; at: Pt; sprite: string; scale: number; anim: string; dur: number }
  | { id: number; kind: 'die'; at: Pt; result: WeaponId; dur: number };

type NewEffect = Effect extends infer E ? (E extends Effect ? Omit<E, 'id'> : never) : never;

let nextEffectId = 1;

export function useEffects() {
  const [items, setItems] = useState<Effect[]>([]);
  const add = useCallback((e: NewEffect) => {
    const item = { ...e, id: nextEffectId++ } as Effect;
    setItems((list) => [...list, item]);
    window.setTimeout(() => setItems((list) => list.filter((x) => x.id !== item.id)), e.dur + 80);
  }, []);
  return { items, add };
}

export function makeBurst(colors: string[], count: number, spread: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const ang = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const dist = spread * (0.55 + Math.random() * 0.6);
    return {
      dx: Math.cos(ang) * dist,
      dy: Math.sin(ang) * dist - spread * 0.25,
      size: 6 + Math.round(Math.random() * 2) * 3,
      color: colors[i % colors.length],
      delay: Math.random() * 60,
    };
  });
}

function vars(o: Record<string, string | number>): CSSProperties {
  return o as unknown as CSSProperties;
}

/** Dado que gira mostrando caras al azar y cae en el resultado. */
function DieRoll({ e }: { e: Extract<Effect, { kind: 'die' }> }) {
  const [face, setFace] = useState<string>(WEAPON_DIE[0]);
  const [landed, setLanded] = useState(false);
  const started = useRef(Date.now());
  useEffect(() => {
    const landAt = e.dur * 0.62;
    let t: number;
    const tick = () => {
      const el = Date.now() - started.current;
      if (el >= landAt) {
        setFace(e.result);
        setLanded(true);
        return;
      }
      setFace(WEAPON_DIE[Math.floor(Math.random() * WEAPON_DIE.length)]);
      t = window.setTimeout(tick, 55 + (el / landAt) * 110);
    };
    tick();
    return () => window.clearTimeout(t);
  }, [e.dur, e.result]);
  return (
    <div
      className={`fx-die${landed ? ' is-landed' : ''}`}
      style={vars({ left: `${e.at.x}px`, top: `${e.at.y}px`, '--d': `${e.dur}ms` })}
    >
      <Sprite name={face} scale={4} />
    </div>
  );
}

export function FxLayer({ items }: { items: Effect[] }) {
  return (
    <div className="fxlayer" aria-hidden="true">
      {items.map((e) => {
        switch (e.kind) {
          case 'banner':
            return (
              <div key={e.id} className={`fx-banner${e.you ? ' fx-banner--you' : ''}`} style={vars({ '--d': `${e.dur}ms` })}>
                <div className="fx-banner__ribbon">
                  {e.sprite && <Sprite name={e.sprite} scale={4} />}
                  <div>
                    <div className="fx-banner__text">{e.text}</div>
                    {e.sub && <div className="fx-banner__sub">{e.sub}</div>}
                  </div>
                </div>
              </div>
            );
          case 'cardfly':
            return (
              <div
                key={e.id}
                className="fx-cardfly"
                style={vars({
                  '--x0': `${e.from.x}px`,
                  '--y0': `${e.from.y}px`,
                  '--x1': `${e.to.x}px`,
                  '--y1': `${e.to.y}px`,
                  '--d': `${e.dur}ms`,
                })}
              >
                <CardView defId={e.defId} />
              </div>
            );
          case 'projectile': {
            const mx = (e.from.x + e.to.x) / 2;
            const my = (e.from.y + e.to.y) / 2 - e.arc;
            return (
              <div
                key={e.id}
                className={`fx-projectile${e.spin ? ' fx-projectile--spin' : ''}`}
                style={vars({
                  '--x0': `${e.from.x}px`,
                  '--y0': `${e.from.y}px`,
                  '--xm': `${mx}px`,
                  '--ym': `${my}px`,
                  '--x1': `${e.to.x}px`,
                  '--y1': `${e.to.y}px`,
                  '--d': `${e.dur}ms`,
                  '--rot': `${Math.atan2(e.to.y - e.from.y, e.to.x - e.from.x) + Math.PI / 4}rad`,
                })}
              >
                <Sprite name={e.sprite} scale={4} />
              </div>
            );
          }
          case 'text':
            return (
              <div
                key={e.id}
                className={`fx-text fx-text--${e.tone}`}
                style={vars({ left: `${e.at.x}px`, top: `${e.at.y}px`, '--d': `${e.dur}ms` })}
              >
                {e.text}
              </div>
            );
          case 'burst':
            return (
              <div key={e.id} className="fx-burst" style={vars({ left: `${e.at.x}px`, top: `${e.at.y}px` })}>
                {e.particles.map((p, i) => (
                  <span
                    key={i}
                    style={vars({
                      '--dx': `${p.dx}px`,
                      '--dy': `${p.dy}px`,
                      '--s': `${p.size}px`,
                      '--c': p.color,
                      '--d': `${e.dur}ms`,
                      animationDelay: `${p.delay}ms`,
                    })}
                  />
                ))}
              </div>
            );
          case 'pop':
            return (
              <div
                key={e.id}
                className={`fx-pop fx-pop--${e.anim}`}
                style={vars({ left: `${e.at.x}px`, top: `${e.at.y}px`, '--d': `${e.dur}ms` })}
              >
                <Sprite name={e.sprite} scale={e.scale} />
              </div>
            );
          case 'die':
            return <DieRoll key={e.id} e={e} />;
        }
      })}
    </div>
  );
}
