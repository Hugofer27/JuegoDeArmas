# Juego de Armas: Desarmado

Versión digital del juego de cartas de Hugo y Mario, para jugarlo, probar cartas nuevas y balancearlo.

- **Reglas:** [REGLAS.md](REGLAS.md) (v0.1).
- **Para programar (o pedirle cambios a una IA):** [AGENTS.md](AGENTS.md).

## Correrlo

Necesitas [Node.js](https://nodejs.org) 20 o más nuevo.

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>.

## Cómo se juega en pantalla

- **Ritmo**: arriba a la derecha eliges **Cine** (animaciones completas) o **Rápido** (para probar sin esperar). **Espacio** salta la animación en curso. Al lado, los botones de música y efectos.
- **Inicio:** eliges de 2 a 6 jugadores, cada uno Humano o Bot. Con varios humanos se juega en la misma pantalla y la mano se tapa al cambiar de jugador.
- **Fase Arma:** "Lanzar dado" o "No lanzar".
- **Fase Jugar:** las cartas jugables brillan en verde. Haz clic en una carta y después en el objetivo (los asientos válidos brillan en rojo). Las cartas sin objetivo se confirman con un segundo clic o con "Jugar".
- **Te atacan:** aparece un aviso rojo con el daño. Tus defensas útiles brillan en azul. Haz clic en una o pulsa "Recibir golpe".
- **Mesa:** cada rival muestra vida (corazones), armadura (escuditos azules), arma con su daño cercano/lejano, y si está cercano o lejano respecto a ti. En tu tablero, las maldiciones están a la izquierda y las bendiciones a la derecha.
- **Crónica:** a la derecha queda todo lo que pasó.

### Modo dev

Se activa en el inicio. Sirve para probar cartas sin esperar a robarlas:

- dar cualquier carta a cualquier jugador;
- fijar PV y dar armas;
- ver las manos de todos;
- deshacer tu última jugada.

## Arte y sonido

Todo el arte es pixel art escrito como texto en `src/ui/pixel/sprites.ts` (botón "Ver arte" en el inicio). Los efectos de sonido y la música se sintetizan en el navegador. Hay tres canciones que rotan (Giga de taberna, Marcha del duelo y Vals de la jarra); pasa el mouse sobre el botón de música para ver cuál suena. La música se acelera cuando la partida se acerca al final.

## Balance

```bash
npm run sim -- --games 1000 --players 4
```

Juega partidas bot contra bot y muestra el porcentaje de victorias por arma, el daño por arma y las cartas más jugadas. Los bots son simples: los números orientan, no deciden.

## Estado

**v0.1** (noviembre 2026): juego local completo con pixel art, animaciones y sonido, contra bots o con varios humanos en una misma pantalla.

## Hoja de ruta

1. **Jugar online.** Que Hugo y Mario jueguen cada uno desde su computadora: una sala con código, conexión directa entre navegadores (WebRTC/PeerJS) y el juego publicado en GitHub Pages para abrirlo con un link.
2. **Galería de cartas.** Un compendio estilo bestiario con todas las cartas creadas: su arte, su texto y el porcentaje de victorias estimado de cada una, calculado con el simulador de bots.
3. **Crear cartas fácil.** Un editor dentro del juego para inventar una carta (nombre, tipo, texto, copias y arte) y probarla en una partida sin tocar código.
