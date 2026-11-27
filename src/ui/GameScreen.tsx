import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  cardTargets,
  checkPlay,
  currentActor,
  defenseTargets,
  getCardDef,
  legalDefenses,
  legalPlays,
  opponents,
  weaponDef,
  type Fx,
  type GameState,
  type PlayerId,
  type WeaponId,
} from '../engine';
import { audio } from './audio/audio';
import { CardView, Center, characterOf, LogPanel, MyBoard, Seat, SEAT_COLORS, type CardLook, type TipSide } from './components';
import { DevPanel } from './DevPanel';
import { shownPlayers, useDirector } from './fx/director';
import { FxLayer, makeBurst, useEffects, type Pt } from './fx/FxLayer';
import { Sprite } from './pixel/Sprite';
import { PALETTE } from './pixel/sprites';
import { Scene } from './Scene';
import { updateSettings, useSettings } from './settings';
import { useLocalMatch } from './useLocalMatch';
import type { MatchConfig } from './Setup';

type Mode = { kind: 'idle' } | { kind: 'card'; uid: string; picks: PlayerId[] } | { kind: 'rebound'; uid: string };

const C = PALETTE;

export function GameScreen({ config, onExit, onRematch }: { config: MatchConfig; onExit: () => void; onRematch: () => void }) {
  const settings = useSettings();
  const [paused, setPaused] = useState(false);
  const [winW, setWinW] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const { state: s, dispatch, setState, undo, canUndo, error, setError } = useLocalMatch(config, {
    botDelay: settings.speed === 'cine' ? 420 : 110,
    paused,
  });

  const humans = useMemo(() => s.players.filter((p) => !p.isBot).map((p) => p.id), [s.players]);
  const actor = currentActor(s);
  const [revealed, setRevealed] = useState<PlayerId | null>(humans.length === 1 ? humans[0] : null);
  const viewer: PlayerId = humans.length === 0 ? 0 : (revealed ?? humans[0]);

  // ---------------------------------------------------------------- anclas en pantalla
  const anchors = useRef(new Map<string, HTMLElement>());
  const anchorRef = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) anchors.current.set(key, el);
      else anchors.current.delete(key);
    },
    [],
  );
  const pt = useCallback((key: string, dy = 0): Pt => {
    const el = anchors.current.get(key);
    if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 + dy };
  }, []);
  const arenaRef = useRef<HTMLElement>(null);

  // ---------------------------------------------------------------- efectos de cada evento
  const fxItems = useEffects();
  const [lunge, setLunge] = useState<{ pid: PlayerId; dx: number; dy: number } | null>(null);
  const [shownRoll, setShownRoll] = useState<{ player: PlayerId; weapon: WeaponId } | null>(null);

  const onFx = useCallback(
    (fx: Fx, d: number) => {
      const add = fxItems.add;
      const who = s.players[fx.player];
      const at = pt(`p${fx.player}`);
      const above = { x: at.x, y: at.y - 46 };
      switch (fx.kind) {
        case 'turn': {
          const you = fx.player === viewer && !who.isBot;
          add({ kind: 'banner', text: you ? '¡Tu turno!' : `Turno de ${who.name}`, sprite: characterOf(fx.player), you, dur: d });
          audio.play(you ? 'turnYou' : 'turnOther');
          break;
        }
        case 'skip':
          add({ kind: 'pop', at: above, sprite: 'estrella', scale: 4, anim: 'spin', dur: d });
          add({ kind: 'text', at: above, text: 'Pierde el turno', tone: 'info', dur: d });
          audio.play('dizzy');
          break;
        case 'card':
          add({ kind: 'cardfly', defId: fx.defId!, from: at, to: pt('table', -20), dur: d });
          audio.play('card');
          break;
        case 'attack': {
          const to = pt(`p${fx.target}`);
          const len = Math.hypot(to.x - at.x, to.y - at.y) || 1;
          setLunge({ pid: fx.player, dx: ((to.x - at.x) / len) * 22, dy: ((to.y - at.y) / len) * 22 });
          const arrow = fx.weapon === 'arco';
          add({
            kind: 'projectile',
            sprite: arrow ? 'flecha' : (fx.weapon ?? 'punos'),
            from: at,
            to,
            dur: d,
            arc: fx.proximity === 'lejano' ? 150 : 60,
            spin: !arrow,
          });
          audio.play(arrow ? 'arrow' : 'swing');
          break;
        }
        case 'damage': {
          const big = (fx.amount ?? 0) >= 4;
          add({ kind: 'text', at: above, text: `-${fx.amount}`, tone: big ? 'dmg-big' : 'dmg', dur: 1300 });
          add({ kind: 'burst', at, particles: makeBurst([C.r, C.R, C.w, C.o], big ? 16 : 10, big ? 90 : 60), dur: 650 });
          audio.play(big ? 'bigHit' : 'hit');
          break;
        }
        case 'heal':
          add({ kind: 'text', at: above, text: `+${fx.amount}`, tone: 'heal', dur: 1200 });
          add({ kind: 'burst', at, particles: makeBurst([C.l, C.e, C.w], 10, 55), dur: 800 });
          audio.play('heal');
          break;
        case 'armor':
          add({ kind: 'pop', at, sprite: 'escudito', scale: 5, anim: 'pop', dur: d });
          add({ kind: 'text', at: above, text: `-${fx.amount} PA`, tone: 'armor', dur: 1000 });
          audio.play('armor');
          break;
        case 'armorBreak':
          add({ kind: 'pop', at, sprite: 'escudito_roto', scale: 5, anim: 'shatter', dur: d });
          add({ kind: 'burst', at, particles: makeBurst([C.G, C.g, C.d, C.u], 12, 70), dur: 700 });
          audio.play('armorBreak');
          break;
        case 'armorUp':
          add({ kind: 'pop', at, sprite: fx.defId ?? 'escudito', scale: 4, anim: 'drop', dur: d });
          add({ kind: 'text', at: above, text: `+${fx.after} PA`, tone: 'armor', dur: 1100 });
          audio.play('armorUp');
          break;
        case 'block': {
          // el arma del atacante rebota contra el escudo
          if (fx.target !== undefined) {
            const from = pt(`p${fx.target}`);
            const back = { x: at.x + (from.x - at.x) * 0.3, y: at.y - 70 };
            add({ kind: 'projectile', sprite: s.players[fx.target].weapon ?? 'punos', from: at, to: back, dur: Math.round(d * 0.7), arc: 60, spin: true });
          }
          add({ kind: 'pop', at, sprite: 'escudo', scale: 5, anim: 'pop', dur: d });
          add({ kind: 'burst', at, particles: makeBurst([C.y, C.w, C.o], 14, 80), dur: 600 });
          add({ kind: 'text', at: above, text: '¡Bloqueo!', tone: 'block', dur: 1100 });
          audio.play('block');
          break;
        }
        case 'dodge':
          add({ kind: 'text', at: above, text: '¡Esquiva!', tone: 'info', dur: 1000 });
          audio.play('dodge');
          break;
        case 'roll': {
          const dieAt = pt('die');
          const land = Math.round(d * 0.62);
          add({ kind: 'die', at: dieAt, result: fx.weapon!, dur: d });
          audio.play('roll', { duration: land / 1000 });
          window.setTimeout(() => {
            setShownRoll({ player: fx.player, weapon: fx.weapon! });
            const from = fx.from !== undefined ? pt(`p${fx.from}`) : dieAt;
            if (fx.prev !== fx.weapon) {
              add({ kind: 'projectile', sprite: fx.weapon!, from, to: pt(`p${fx.player}`), dur: d - land, arc: 70, spin: false });
            }
            add({
              kind: 'text',
              at: { x: dieAt.x, y: dieAt.y - 60 },
              text: fx.prev === fx.weapon ? 'Ya la tenía' : fx.from !== undefined ? '¡Robada!' : weaponDef(fx.weapon!).name,
              tone: fx.from !== undefined ? 'dmg' : 'gold',
              dur: 1000,
            });
            audio.play(fx.prev === fx.weapon ? 'lose' : fx.from !== undefined ? 'steal' : 'pickup');
          }, land);
          break;
        }
        case 'weapon':
          if (fx.weapon) {
            add({ kind: 'pop', at, sprite: fx.weapon, scale: 4, anim: 'pop', dur: d });
            audio.play('pickup');
          } else if (fx.prev) {
            add({ kind: 'projectile', sprite: fx.prev, from: at, to: pt('chest'), dur: d, arc: 40, spin: true });
            audio.play('lose');
          }
          break;
        case 'status': {
          const def = getCardDef(fx.defId!);
          add({ kind: 'pop', at, sprite: def.id, scale: 5, anim: 'drop', dur: d });
          add({
            kind: 'burst',
            at,
            particles: makeBurst(fx.curse ? [C.E, C.V, C.e] : [C.y, C.w, C.Y], 12, 65),
            dur: 800,
          });
          add({ kind: 'text', at: above, text: def.name, tone: fx.curse ? 'curse' : 'bless', dur: 1200 });
          audio.play(fx.curse ? 'curse' : 'bless');
          break;
        }
        case 'prostrate':
          add({ kind: 'pop', at: above, sprite: 'estrella', scale: 4, anim: 'spin', dur: d });
          add({ kind: 'text', at: above, text: '¡Postrado!', tone: 'gold', dur: 1000 });
          audio.play('dizzy');
          break;
        case 'death':
          add({ kind: 'pop', at, sprite: 'lapida', scale: 5, anim: 'slam', dur: d });
          add({ kind: 'burst', at, particles: makeBurst([C.G, C.d, C.w, C.m], 18, 100), dur: 900 });
          add({ kind: 'text', at: above, text: '¡Eliminado!', tone: 'dmg-big', dur: 1500 });
          audio.play('death');
          break;
      }
    },
    [fxItems.add, pt, s.players, viewer],
  );

  const director = useDirector(s, settings.speed, viewer, onFx);
  const { current, busy } = director;
  useEffect(() => setPaused(busy), [busy]);
  useEffect(() => {
    if (current?.kind !== 'attack') setLunge(null);
  }, [current]);

  const shown = useMemo(() => shownPlayers(s, current, director.queue), [s, current, director.queue]);

  // ---------------------------------------------------------------- música y tensión
  useEffect(() => {
    audio.unlock();
    audio.startMusic();
    return () => audio.stopMusic();
  }, []);
  useEffect(() => {
    const total = shown.length;
    const alive = shown.filter((p) => !p.eliminated);
    const lowest = alive.length ? Math.min(...alive.map((p) => p.hp)) : 0;
    let t = total <= 2 ? 0.15 : ((total - alive.length) / (total - 2)) * 0.5;
    if (alive.length <= 2) t = Math.max(t, total <= 2 ? 0.2 : 0.55);
    t += lowest <= 2 ? 0.45 : lowest <= 4 ? 0.25 : lowest <= 6 ? 0.1 : 0;
    audio.setTension(t);
  }, [shown]);

  const ended = !!s.result && !busy;
  useEffect(() => {
    if (!ended || !s.result) return;
    audio.stopMusic();
    const youWon = s.result.winner !== null && !s.players[s.result.winner].isBot;
    audio.play(youWon || humans.length === 0 ? 'victory' : 'defeat');
  }, [ended, s.result, s.players, humans.length]);

  // Espacio = saltar animaciones
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        director.skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [director]);

  // ---------------------------------------------------------------- selección y entrada
  const needsCurtain = humans.length > 1 && actor !== null && !s.players[actor].isBot && revealed !== actor && !busy;
  const me = s.players[viewer];
  const meShown = shown[viewer];
  const prompt = !busy && actor === viewer && !needsCurtain && !me.isBot ? s.prompt : null;

  const [sel, setSel] = useState<{ for: GameState; mode: Mode; discard: string[] }>({ for: s, mode: { kind: 'idle' }, discard: [] });
  const mode: Mode = sel.for === s ? sel.mode : { kind: 'idle' };
  const discardSel = sel.for === s ? sel.discard : [];
  const setMode = (m: Mode) => setSel({ for: s, mode: m, discard: discardSel });
  const setDiscardSel = (fn: (prev: string[]) => string[]) => setSel({ for: s, mode, discard: fn(discardSel) });
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    if (!error) return;
    audio.play('error');
    const t = setTimeout(() => setError(null), 3200);
    return () => clearTimeout(t);
  }, [error, setError]);

  const act = (a: Parameters<typeof dispatch>[1]) => {
    audio.play('click');
    dispatch(viewer, a);
  };

  const playable = useMemo(
    () => new Set(prompt?.kind === 'play' ? legalPlays(s, viewer).map((a) => a.cardUid) : []),
    [s, prompt, viewer],
  );
  const defenses = useMemo(
    () => new Set(prompt?.kind === 'defend' ? legalDefenses(s, viewer, prompt.attack).map((c) => c.uid) : []),
    [s, prompt, viewer],
  );

  const selectedCard = mode.kind === 'card' ? me.hand.find((c) => c.uid === mode.uid) : undefined;
  const selectedDef = selectedCard ? getCardDef(selectedCard.defId) : null;
  const singleOpponent = opponents(s, viewer).length === 1;
  const needsConfirm =
    !!selectedDef &&
    (selectedDef.target === 'none' || selectedDef.target === 'self' || (selectedDef.target === 'twoOpponents' && singleOpponent));

  const confirmPlay = () => {
    if (mode.kind !== 'card' || !selectedDef) return;
    const o = opponents(s, viewer)[0]?.id;
    act({ type: 'play', cardUid: mode.uid, targets: selectedDef.target === 'twoOpponents' ? [o, o] : [] });
  };

  const lookFor = (uid: string): CardLook => {
    if (!prompt) return undefined;
    if (prompt.kind === 'play') {
      if (mode.kind === 'card' && mode.uid === uid) return 'selected';
      return playable.has(uid) ? 'playable' : 'disabled';
    }
    if (prompt.kind === 'defend') {
      if (mode.kind === 'rebound' && mode.uid === uid) return 'selected';
      return defenses.has(uid) ? 'defend' : 'disabled';
    }
    if (prompt.kind === 'discard') return discardSel.includes(uid) ? 'discard' : undefined;
    return 'disabled';
  };

  const onCardClick = (uid: string) => {
    if (!prompt) return;
    const card = me.hand.find((c) => c.uid === uid)!;
    const def = getCardDef(card.defId);
    if (prompt.kind === 'play') {
      if (mode.kind === 'card' && mode.uid === uid) {
        if (needsConfirm) confirmPlay();
        else setMode({ kind: 'idle' });
        return;
      }
      if (!playable.has(uid)) {
        if (def.type === 'defensa') setError('Las defensas se juegan cuando te atacan.');
        else setError(checkPlay(s, viewer, card, []) ?? `${def.name} no tiene objetivos válidos ahora.`);
        return;
      }
      audio.play('select');
      setMode({ kind: 'card', uid, picks: [] });
    } else if (prompt.kind === 'defend') {
      if (!defenses.has(uid)) return setError('Esa carta no sirve contra este ataque.');
      if (def.defense?.needsTarget) {
        audio.play('select');
        setMode({ kind: 'rebound', uid });
      } else act({ type: 'defend', cardUid: uid });
    } else if (prompt.kind === 'discard') {
      audio.play('select');
      setDiscardSel((cur) => (cur.includes(uid) ? cur.filter((u) => u !== uid) : cur.length < prompt.count ? [...cur, uid] : cur));
    }
  };

  const targetSet = useMemo(() => {
    if (mode.kind === 'rebound') return new Set(defenseTargets(s, viewer));
    if (mode.kind === 'card' && selectedDef && !needsConfirm)
      return new Set(cardTargets(s, viewer, selectedDef).filter((t) => !mode.picks.includes(t)));
    return new Set<PlayerId>();
  }, [mode, s, viewer, selectedDef, needsConfirm]);

  const onTarget = (t: PlayerId) => {
    if (!targetSet.has(t)) return;
    if (mode.kind === 'rebound') return act({ type: 'defend', cardUid: mode.uid, target: t });
    if (mode.kind !== 'card' || !selectedDef) return;
    if (selectedDef.target === 'twoOpponents') {
      const picks = [...mode.picks, t];
      if (picks.length === 2) act({ type: 'play', cardUid: mode.uid, targets: picks });
      else {
        audio.play('select');
        setMode({ ...mode, picks });
      }
    } else act({ type: 'play', cardUid: mode.uid, targets: [t] });
  };

  // ---------------------------------------------------------------- textos de ayuda
  let banner = '';
  let bannerKind = '';
  if (s.result) banner = busy ? '' : s.result.reason;
  else if (busy) banner = '';
  else if (!prompt) {
    const who = actor !== null ? s.players[actor] : null;
    if (meShown.eliminated && !me.isBot) banner = 'Quedaste fuera. Mirando la riña…';
    else if (who && s.prompt?.kind === 'defend') banner = `${who.name} decide si se defiende…`;
    else banner = `Turno de ${s.players[s.turn.player].name}`;
  } else if (prompt.kind === 'weapon')
    banner = me.weapon ? 'Fase Arma: si lanzas el dado estando armado, pierdes tu carta del turno.' : 'Fase Arma: estás desarmado, lanzar el dado es gratis.';
  else if (prompt.kind === 'play') {
    if (mode.kind === 'card' && selectedDef) {
      bannerKind = 'target';
      if (needsConfirm) banner = `¿Jugar ${selectedDef.name}? Toca la carta otra vez o "Jugar".`;
      else if (selectedDef.target === 'twoOpponents') banner = `${selectedDef.name}: elige 2 objetivos (${mode.picks.length}/2).`;
      else banner = `${selectedDef.name}: elige a quién.`;
    } else banner = 'Fase Jugar: elige 1 carta, o termina el turno.';
  } else if (prompt.kind === 'discard') banner = `Tienes más de 7 cartas: descarta ${prompt.count}.`;
  else if (prompt.kind === 'defend' && mode.kind === 'rebound') {
    bannerKind = 'target';
    banner = 'Escudo Rebote: elige a quién le rebota el golpe.';
  }

  const defendInfo = (() => {
    if (prompt?.kind !== 'defend' || mode.kind === 'rebound') return null;
    const atk = prompt.attack;
    const expected = atk.ignoresArmor || !me.armor ? atk.damage : Math.max(0, atk.damage - me.armor.pa);
    const notes: string[] = [];
    if (atk.shieldProof) notes.push('Mangual: Escudo y Escudo Rebote no sirven');
    if (atk.unblockable) notes.push('Rompe Escudos: solo puedes esquivar');
    if (atk.ignoresArmor) notes.push('Garrote: ignora tu armadura');
    return { atk, expected, notes };
  })();

  // ---------------------------------------------------------------- clases de efecto por asiento
  const fxClassFor = (pid: PlayerId): string => {
    if (!current) return '';
    if (current.player !== pid) return '';
    switch (current.kind) {
      case 'attack':
        return 'fx-lunge';
      case 'damage':
        return (current.amount ?? 0) >= 4 ? 'fx-hit fx-hit--big' : 'fx-hit';
      case 'block':
        return 'fx-block';
      case 'dodge':
        return 'fx-dodge';
      case 'heal':
        return 'fx-heal';
      case 'status':
        return current.curse ? 'fx-curse' : 'fx-bless';
      case 'turn':
        return 'fx-turn';
      default:
        return '';
    }
  };
  const lungeStyle = (pid: PlayerId) =>
    lunge && lunge.pid === pid ? ({ '--lx': `${lunge.dx}px`, '--ly': `${lunge.dy}px` } as CSSProperties) : {};
  const shake =
    current && ((current.kind === 'damage' && (current.amount ?? 0) >= 3) || current.kind === 'death')
      ? (current.amount ?? 0) >= 5 || current.kind === 'death'
        ? ' shake shake--big'
        : ' shake'
      : '';

  const n = s.players.length;
  const tipSide = (pid: PlayerId): TipSide => {
    const k = (pid - viewer + n) % n;
    const ang = ((90 + (k * 360) / n) * Math.PI) / 180;
    if (Math.sin(ang) < -0.6) return 'below';
    return Math.cos(ang) < 0 ? 'right' : 'left';
  };
  const seatStyle = (pid: PlayerId): CSSProperties => {
    const k = (pid - viewer + n) % n;
    const ang = ((90 + (k * 360) / n) * Math.PI) / 180;
    return { left: `${50 + 37 * Math.cos(ang)}%`, top: `${55 + 41 * Math.sin(ang)}%`, ...lungeStyle(pid) };
  };

  const fan = me.hand.length;
  // el abanico usa el ancho libre entre los bordes y la columna de botones
  const span = Math.max(260, winW - (winW <= 1350 ? 250 : 310) - 2 * 200 - 156);
  const spread = Math.min(122, span / Math.max(fan - 1, 1));
  const danger = !meShown.eliminated && meShown.hp > 0 && meShown.hp <= 3 && !me.isBot;
  const winner = s.result?.winner ?? null;

  return (
    <div className={`game${shake}`}>
      <Scene arenaRef={arenaRef} />
      {danger && <div className="danger" />}

      <main className="arena" ref={arenaRef}>
        <div className="torch torch--l">
          <Sprite name="llama_a" scale={3} className="torch__flame torch__flame--a" />
          <Sprite name="llama_b" scale={3} className="torch__flame torch__flame--b" />
          <Sprite name="antorcha" scale={3} />
        </div>
        <div className="torch torch--r">
          <Sprite name="llama_b" scale={3} className="torch__flame torch__flame--a" />
          <Sprite name="llama_a" scale={3} className="torch__flame torch__flame--b" />
          <Sprite name="antorcha" scale={3} />
        </div>
        <div className="table-anchor" ref={anchorRef('table')} />
        <Center
          s={s}
          players={shown}
          roll={shownRoll}
          rolling={current?.kind === 'roll'}
          chestRef={anchorRef('chest')}
          dieRef={anchorRef('die')}
        />
        {shown
          .filter((p) => p.id !== viewer)
          .map((p) => (
            <Seat
              key={p.id}
              s={s}
              p={p}
              viewer={viewer}
              style={seatStyle(p.id)}
              targetable={targetSet.has(p.id)}
              picked={mode.kind === 'card' && mode.picks.includes(p.id)}
              onClick={() => onTarget(p.id)}
              reveal={reveal}
              fxClass={fxClassFor(p.id)}
              anchorRef={anchorRef(`p${p.id}`)}
              tipSide={tipSide(p.id)}
            />
          ))}

        <div className="topbar">
          <button
            className="btn btn--small"
            onClick={() => {
              audio.play('click');
              onExit();
            }}
          >
            Menú
          </button>
          <span className="topbar__turn">Turno {s.turn.number}</span>
        </div>

        <div className="hud">
          <div className="seg seg--hud" role="group" aria-label="Ritmo de animación">
            <button
              className={settings.speed === 'cine' ? 'is-on' : ''}
              onClick={() => {
                audio.play('click');
                updateSettings({ speed: 'cine' });
              }}
              title="Animaciones completas"
            >
              <Sprite name="cine" scale={2} /> Cine
            </button>
            <button
              className={settings.speed === 'rapido' ? 'is-on' : ''}
              onClick={() => {
                audio.play('click');
                updateSettings({ speed: 'rapido' });
              }}
              title="Animaciones cortas para probar rápido"
            >
              <Sprite name="rayo" scale={2} /> Rápido
            </button>
          </div>
          <button
            className={`hud__btn${settings.music ? '' : ' is-off'}`}
            onClick={() => {
              audio.unlock();
              updateSettings({ music: !settings.music });
            }}
            title={settings.music ? `Música: ${audio.songName}. Clic para silenciar` : 'Activar música'}
            aria-pressed={settings.music}
          >
            <Sprite name="nota" scale={2} />
          </button>
          <button
            className={`hud__btn${settings.sfx ? '' : ' is-off'}`}
            onClick={() => {
              audio.unlock();
              updateSettings({ sfx: !settings.sfx });
              audio.play('click');
            }}
            title={settings.sfx ? 'Silenciar efectos' : 'Activar efectos'}
            aria-pressed={settings.sfx}
          >
            <Sprite name="parlante" scale={2} />
          </button>
        </div>
        {busy && <div className="skiphint">Espacio: saltar animación</div>}

        {config.dev && (
          <DevPanel
            s={s}
            viewer={viewer}
            setState={(ns) => {
              director.skip();
              setState(ns);
            }}
            undo={() => {
              director.skip();
              undo();
            }}
            canUndo={canUndo}
            reveal={reveal}
            setReveal={setReveal}
          />
        )}
        {banner && <div className={`banner${bannerKind ? ` banner--${bannerKind}` : ''}`}>{banner}</div>}
        {defendInfo && (
          <div className="defend">
            <div className="defend__title">
              <Sprite name={characterOf(defendInfo.atk.attacker)} scale={3} />
              <span>{s.players[defendInfo.atk.attacker].name} te ataca</span>
            </div>
            <div className="defend__detail">
              {defendInfo.atk.label} · <Sprite name={defendInfo.atk.weapon ?? 'punos'} scale={2} /> {weaponDef(defendInfo.atk.weapon).name} ·{' '}
              {defendInfo.atk.proximity}
            </div>
            <div className="defend__dmg">
              {defendInfo.atk.damage} de daño
              {defendInfo.expected !== defendInfo.atk.damage && <small> ({defendInfo.expected} tras tu armadura)</small>}
            </div>
            {defendInfo.notes.map((t) => (
              <div key={t} className="defend__note">
                {t}
              </div>
            ))}
            <div className="defend__hint">
              {defenses.size ? 'Toca una defensa que brille, o recibe el golpe.' : 'No tienes defensas que sirvan.'}
            </div>
          </div>
        )}
      </main>

      <LogPanel s={s} />

      <section className="bottom">
        <div className="myboard-wrap" style={lungeStyle(viewer)}>
        <MyBoard
          s={s}
          p={meShown}
          targetable={targetSet.has(viewer)}
          onClick={() => onTarget(viewer)}
          fxClass={fxClassFor(viewer)}
          anchorRef={anchorRef(`p${viewer}`)}
        />
        </div>
        <div className="hand">
          {!needsCurtain &&
            me.hand.map((c, i) => {
              const off = i - (fan - 1) / 2;
              const look = lookFor(c.uid);
              return (
                <div
                  key={c.uid}
                  className={`hand__slot${look === 'selected' ? ' is-selected' : ''}`}
                  style={
                    {
                      '--x': `${off * spread}px`,
                      '--y': `${Math.abs(off) ** 1.6 * 5}px`,
                      '--rot': `${off * 3.5}deg`,
                      zIndex: i + 1,
                    } as CSSProperties
                  }
                >
                  <CardView
                    defId={c.defId}
                    look={look}
                    onClick={() => onCardClick(c.uid)}
                    onHover={() => (look === 'playable' || look === 'defend') && audio.play('hover')}
                  />
                </div>
              );
            })}
          {me.hand.length === 0 && !meShown.eliminated && <div className="hand__empty">Sin cartas</div>}
        </div>

        <div className="actions">
          {prompt?.kind === 'weapon' && (
            <>
              <button className="btn btn--gold" onClick={() => act({ type: 'roll' })}>
                Lanzar dado
                <small>{me.weapon ? 'pierdes tu carta' : 'gratis'}</small>
              </button>
              <button className="btn" onClick={() => act({ type: 'skipRoll' })}>
                No lanzar
              </button>
            </>
          )}
          {prompt?.kind === 'play' &&
            (needsConfirm ? (
              <>
                <button className="btn btn--gold" onClick={confirmPlay}>
                  Jugar {selectedDef!.name}
                </button>
                <button className="btn" onClick={() => setMode({ kind: 'idle' })}>
                  Cancelar
                </button>
              </>
            ) : mode.kind === 'card' ? (
              <button className="btn" onClick={() => setMode({ kind: 'idle' })}>
                Cancelar
              </button>
            ) : (
              <button className="btn btn--end" onClick={() => act({ type: 'endTurn' })}>
                Terminar turno
              </button>
            ))}
          {prompt?.kind === 'defend' &&
            (mode.kind === 'rebound' ? (
              <button className="btn" onClick={() => setMode({ kind: 'idle' })}>
                Cancelar
              </button>
            ) : (
              <button className="btn btn--danger" onClick={() => act({ type: 'noDefense' })}>
                Recibir golpe
              </button>
            ))}
          {prompt?.kind === 'discard' && (
            <button
              className="btn btn--danger"
              disabled={discardSel.length !== prompt.count}
              onClick={() => act({ type: 'discard', cardUids: discardSel })}
            >
              Descartar ({discardSel.length}/{prompt.count})
            </button>
          )}
        </div>
      </section>

      <FxLayer items={fxItems.items} />
      {error && <div className="toast">{error}</div>}

      {needsCurtain && actor !== null && (
        <div className="overlay">
          <div className="overlay__box">
            <Sprite name={characterOf(actor)} scale={6} className="idle" />
            <h2>Turno de {s.players[actor].name}</h2>
            <p>Pásale la pantalla. Los demás, no miren.</p>
            <button
              className="btn btn--gold"
              onClick={() => {
                audio.play('click');
                setRevealed(actor);
              }}
            >
              Ver mi mano
            </button>
          </div>
        </div>
      )}

      {ended && s.result && (
        <div className="overlay overlay--end">
          <div className="confetti" aria-hidden="true">
            {Array.from({ length: 36 }, (_, i) => (
              <span
                key={i}
                style={
                  {
                    left: `${(i * 97) % 100}%`,
                    '--c': [C.y, C.r, C.u, C.e, C.v, C.o][i % 6],
                    animationDelay: `${(i % 9) * 0.18}s`,
                    animationDuration: `${2.2 + (i % 5) * 0.35}s`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <div className="overlay__box overlay__box--end">
            {winner !== null ? (
              <Sprite name={characterOf(winner)} scale={8} className="idle" />
            ) : (
              <Sprite name="lapida" scale={8} />
            )}
            <h2 style={winner !== null ? { color: SEAT_COLORS[winner] } : undefined}>
              {winner !== null ? `¡${s.players[winner].name} gana!` : 'Empate'}
            </h2>
            <p>
              {s.result.reason} · {s.turn.number} turnos
            </p>
            <div className="overlay__buttons">
              <button
                className="btn btn--gold"
                onClick={() => {
                  audio.play('click');
                  onRematch();
                }}
              >
                Revancha
              </button>
              <button
                className="btn"
                onClick={() => {
                  audio.play('click');
                  onExit();
                }}
              >
                Menú
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
