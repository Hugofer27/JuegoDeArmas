# Guía para agentes de IA (y humanos) que trabajen en este repo

Este archivo vale para cualquier asistente (Claude, ChatGPT, Gemini, Copilot, Cursor…). Léelo completo antes de cambiar código.

## Qué es

Versión digital del juego de cartas **Juego de Armas: Desarmado** (2 a 6 jugadores, último en pie gana), diseñado por Hugo y Mario. El objetivo es **probar y balancear reglas y cartas nuevas**, no hacer un producto pulido. Prioridad: jugabilidad > visual.

## Reglas del juego

- **`REGLAS.md` es la fuente única de verdad.** Si cambias una regla en el código, cámbiala también ahí (y al revés), y agrega una línea al historial del final.
- Las reglas marcadas **[revisar]** las decidió una IA para poder programar; Hugo y Mario pueden cambiarlas.
- El documento original está en `Proyecto Juegos de mesa.docx` (histórico; manda `REGLAS.md`).

## Comandos

```bash
npm install        # una vez
npm run dev        # juego en http://localhost:5173
npm test           # tests del motor (obligatorio que pasen antes de entregar)
npm run typecheck  # errores de TypeScript
npm run sim        # 300 partidas bot vs bot con estadísticas de balance
npm run stats      # recalcula el % de victorias de cada carta (src/data/card-stats.json)
npm run sim -- --games 1000 --players 2-6
npm run build      # versión estática en dist/
```

## Estructura

```
src/engine/        Motor de reglas. TypeScript puro, sin React ni DOM.
  types.ts         Tipos: GameState, Player, Action, Prompt...
  weapons.ts       Armas (daño cercano/lejano y rasgos).
  cards.ts         TODAS las cartas: datos + efecto. Aquí se agregan cartas nuevas.
  core.ts          Funciones base que usan las cartas (atacar, curar, robar, rollWeapon...).
  engine.ts        createGame, applyAction, validaciones, bucle de turnos y resolución.
  dev.ts           Trampas del modo dev (dar carta, fijar PV, dar arma).
  rng.ts           Aleatorio con semilla (partidas reproducibles).
src/bots/bot.ts    Bot genérico: simula cada jugada posible y elige la mejor.
src/sim/           Simulador de balance (npm run sim) y estadísticas del Compendio (npm run stats).
src/data/          card-stats.json: % de victorias por carta, generado por npm run stats.
src/net/room.ts    Juego online: salas con link, anfitrión e invitados (PeerJS).
src/engine/redact.ts  Vista para invitados: manos ajenas y mazo boca abajo.
src/ui/            Interfaz React. Solo muestra el estado y manda acciones.
  pixel/sprites.ts Todo el arte pixel, escrito como texto (1 carácter = 1 píxel).
  pixel/Sprite.tsx Convierte un sprite de texto en imagen.
  Scene.tsx        Fondo de la taberna dibujado píxel a píxel (suelo, mesa, luz).
  fx/director.ts   Reproduce los eventos del motor de a uno (animaciones en orden).
  fx/FxLayer.tsx   Efectos: proyectiles, números de daño, chispas, carteles, dado.
  audio/audio.ts   Efectos de sonido y música, todo sintetizado (sin archivos).
  settings.ts      Preferencias guardadas: Cinemático/Rápido, música, efectos.
  useMatch.ts      Controlador de partida: local, anfitrión online o invitado online.
  Lobby.tsx        Pantallas de sala online (crear, unirse, esperar).
  Compendium.tsx   Compendio de cartas con su % de victorias.
tests/             Tests del motor (vitest).
PRODUCT.md         Para qué es el juego y para quién (no visual).
DESIGN.md          Sistema visual: colores, tipografías, componentes, reglas.
```

## Cómo funciona el motor (léelo antes de tocarlo)

1. El estado (`GameState`) es **JSON puro**: nada de clases ni funciones adentro. Así se puede clonar, guardar, deshacer y mandar por red (modo online futuro).
2. `applyAction(estado, jugador, acción)` **no modifica** el estado que recibe: valida, clona y devuelve uno nuevo.
3. El motor avanza solo hasta que alguien tiene que decidir algo: eso queda en `state.prompt` (`weapon`, `play`, `defend`, `discard`).
4. Los efectos que necesitan orden (ataques, pérdidas de PV) se encolan con `queueTask` y se resuelven en orden, primero lo más reciente (como una pila). Así funcionan Contraataque, Escudo Rebote y las cadenas de Kamikaze.
5. **Nunca** uses `Math.random()` dentro de `src/engine/`: usa `randInt(s, n)` o `shuffle(s, arr)` de `rng.ts`.
6. La UI nunca modifica el estado: solo llama a `dispatch(jugador, acción)`.

## Cómo agregar una carta

1. Abre `src/engine/cards.ts` y agrega una entrada al arreglo `CARDS`:

```ts
{
  id: 'bomba_de_humo',          // único, minúsculas_con_guiones
  name: 'Bomba de Humo',
  type: 'misterio',             // ataque | defensa | evento | armadura | misterio | maldicion | bendicion
  copies: 2,                    // cuántas hay en el mazo
  icon: '💨',                   // emoji temporal
  text: 'Todos los demás jugadores pierden 1 PV.',
  target: 'none',               // none | self | opponent | farOpponent | anyPlayer | twoOpponents
  play: (s, pid) => {
    for (const q of opponents(s, pid)) queueTask(s, { t: 'loseHp', player: q.id, amount: 1, cause: 'Bomba de Humo' });
  },
},
```

2. Usa las funciones de `core.ts` (`declareAttacks`, `loseHp` vía `queueTask`, `heal`, `drawCards`, `rollWeapon`, `addStatus`, `equipArmor`…). Si necesitas algo nuevo, agrégalo a `core.ts`.
3. Si es una **maldición o bendición pasiva**, el efecto vive donde se usa: busca cómo se hace con `hasStatus(p, 'super_fuerte')` en `core.ts` o `'debilucho'` en `engine.ts`.
4. Si es una **defensa**, usa el campo `defense` (`blocks`, `isShield`, `needsTarget`, `resolve`) en vez de `play`.
5. Agrégala a `REGLAS.md` (tabla de su tipo) y ajusta el total del mazo en el test `tiene 66 cartas` de `tests/engine.test.ts`.
6. Agrega un test con su efecto en `tests/engine.test.ts` (copia el estilo de los demás: `setup`, `give`, `play`).
7. Corre `npm test` y `npm run sim` para ver si rompe el balance.

Los bots aprenden solos a usar la carta nueva (simulan la jugada), no hace falta tocar `bot.ts`.

## Cómo cambiar un arma

Edita `src/engine/weapons.ts` (daño `near`/`far` y rasgos) y la tabla de la sección 3 de `REGLAS.md`. Si agregas un rasgo nuevo, impleméntalo donde se usan los otros (`makeAttack` en `core.ts`, `doDefend`/`runHit` en `engine.ts`).

## Arte, animación y sonido

- **Arte**: cada sprite es una lista de filas de texto en `src/ui/pixel/sprites.ts`. Cada letra es un color de `PALETTE`; `.` es transparente. Deja 1 píxel libre en el borde: el contorno oscuro se agrega solo. Las cartas y armas usan como nombre de sprite su mismo `id` (`ataque_simple`, `hacha`…), así que una carta nueva necesita un sprite con su id. En el inicio, "Ver arte" muestra todo junto.
- **Animaciones**: el motor no sabe de animaciones; solo deja eventos en `state.fx` (tipo `FxKind` en `types.ts`). `fx/director.ts` los reproduce en orden y `GameScreen.tsx` (función `onFx`) decide qué efecto y qué sonido lleva cada uno. Si una carta nueva necesita un efecto propio, agrega un `FxKind` y su caso en `onFx`.
- **Sonido**: recetas de efectos en `SFX` y canciones en `SONGS` (`audio/audio.ts`). Hay 3 canciones (giga, marcha, vals) que rotan: cada una suena 3 vueltas y pasa a la siguiente. Una canción nueva es un objeto más en `SONGS`, escrito por compases. La música acelera con `audio.setTension(0..1)`.
- Reglas visuales completas en `DESIGN.md`.

## Juego online

- El **anfitrión** corre el motor y los bots (igual que en local) y manda a cada invitado la partida pasada por `redactFor` (sin manos ajenas ni mazo).
- Los **invitados** solo mandan acciones (`Action`); el anfitrión las valida con `applyAction`. Un invitado nunca modifica el estado.
- Hay latido cada 2 s: si un invitado calla 10 s, su asiento pasa a un bot (`setSeatBot`). Si vuelve con el mismo nombre, lo recupera.
- Si cambias la forma de `GameState`, el modo online sigue funcionando solo si anfitrión e invitado usan la misma versión del juego (la de GitHub Pages).

## Publicación

Cada push a `main` corre `.github/workflows/pages.yml`: tests, build y publicación en <https://hugofer27.github.io/JuegoDeArmas/>. Si los tests fallan, no se publica.

## Convenciones

- Todo el texto que ve el jugador, los comentarios y la documentación: **en español**.
- Identificadores de código en inglés (`applyAction`, `hand`); ids de cartas en español (`ataque_simple`).
- Cambios pequeños y enfocados. No reescribas archivos enteros si no hace falta.
- Antes de entregar: `npm test` y `npm run typecheck` sin errores.
- No agregues dependencias sin necesidad.

## Hoja de ruta

1. ✅ **v0.1**: motor de reglas, bots, simulador, juego local (contra bots y hot-seat), pixel art, animaciones, efectos de sonido y música.
2. ✅ **v0.2**: juego online con link (P2P), publicación en GitHub Pages y Compendio de cartas con % de victorias.
3. ⏳ **Editor de cartas** dentro del juego, sin tocar código.
