---
name: Juego de Armas: Desarmado
description: Riña de taberna en pixel art alrededor de una mesa redonda vista desde arriba.
colors:
  outline: "#120e1c"
  night: "#0b0d18"
  ink: "#f6eedc"
  ink-dim: "#c9bda6"
  ink-dark: "#2b2436"
  wood: "#4a2c1a"
  wood-hi: "#7a4a2a"
  wood-lo: "#2c180c"
  plank: "#6b4126"
  plank-hi: "#9a5a2c"
  plank-lo: "#3b2417"
  parchment: "#e9dcb8"
  parchment-lo: "#c9b88f"
  gold: "#f2c94c"
  gold-dk: "#b07a1e"
  red: "#e04848"
  red-dk: "#922637"
  green: "#8de06a"
  cyan: "#8fd8f0"
  violet: "#b588ee"
  type-ataque: "#e04848"
  type-defensa: "#3f7fd8"
  type-evento: "#ee8a3a"
  type-armadura: "#9aa0b4"
  type-misterio: "#b588ee"
  type-maldicion: "#3aa457"
  type-bendicion: "#f2c94c"
typography:
  display:
    fontFamily: "Jersey 10, Pixelify Sans, sans-serif"
    fontSize: "26px"
    fontWeight: 400
    lineHeight: 1
  display-xl:
    fontFamily: "Jersey 10, Pixelify Sans, sans-serif"
    fontSize: "64px"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "Pixelify Sans, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.35
  small:
    fontFamily: "Pixelify Sans, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.2
rounded:
  none: "0px"
spacing:
  px: "3px"
  sm: "6px"
  md: "12px"
  lg: "24px"
components:
  button:
    backgroundColor: "{colors.plank}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
    rounded: "{rounded.none}"
    padding: "10px 20px 12px"
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.display}"
    rounded: "{rounded.none}"
  button-danger:
    backgroundColor: "#b8323a"
    textColor: "{colors.ink}"
  panel:
    backgroundColor: "{colors.wood}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  card:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink-dark}"
    width: "156px"
    height: "222px"
  chronicle:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink-dark}"
---

# Juego de Armas: Desarmado — sistema visual

## Overview

Una riña de taberna de noche, en pixel art a escala 3 (1 píxel del arte = 3 px en pantalla). La mesa redonda de tablones, vista desde arriba, ocupa el centro: el Cofre de Armas y el Dado están sobre ella y los luchadores se sientan en el borde, porque el círculo de asientos es la regla de proximidad del juego. Todo lo demás (paneles, botones, naipes, registro) son objetos de esa taberna: madera, pergamino, oro y piedra.

El fondo (suelo de losas, mesa, luz de vela y antorchas) se dibuja píxel a píxel en un canvas (`src/ui/Scene.tsx`) con tramado Bayer, nunca con degradados suaves. El arte de personajes, armas y cartas es texto en `src/ui/pixel/sprites.ts` y se convierte en imagen al vuelo (`src/ui/pixel/Sprite.tsx`). No hay archivos de imagen ni de audio.

## Colors

- **Noche y contorno** (`night`, `outline`): el suelo y el borde de 1 píxel de todo.
- **Madera** (`wood`, `plank` y sus tonos `-hi`/`-lo`): paneles de jugador, botones normales, cofre. Cada panel lleva luz arriba (`-hi`) y sombra abajo (`-lo`).
- **Pergamino** (`parchment`): naipes y crónica. Es el único fondo claro y siempre lleva texto oscuro (`ink-dark`).
- **Oro** (`gold`): acción principal, turno activo, remaches y premios. Rojo: daño, peligro y "recibir golpe". Verde: curación y carta jugable. Celeste: armadura y defensa posible.
- **Tipos de carta**: cada tipo tiene un color propio con dos tonos más oscuros (`--t-<tipo>`, `-dk`, `-xdk`) usados para el marco, la cinta del nombre y el tramado del recuadro de arte.
- **Asientos**: cada luchador tiene un color (`SEAT_COLORS` en `components.tsx`) que marca su retrato y su nombre en el Cofre.

## Typography

- **Jersey 10** (display): nombres de cartas, botones, títulos, carteles de turno y números de daño. Siempre con sombra dura de 2–4 px en `outline`.
- **Pixelify Sans** (texto): todo lo que se lee de corrido: texto de cartas, crónica, ayudas. 16 px base, 13 px en cartas, nunca menos de 11 px.
- El texto claro sobre madera o noche lleva sombra de 1–2 px en `outline` para no perderse sobre el tramado.

## Layout

- Rejilla de partida: mesa (arriba izquierda), crónica de pergamino (columna derecha de 310 px, 250 px bajo 1350 px de ancho) y zona propia abajo (340 px de alto, 300 px en pantallas de menos de 860 px de alto).
- Los rivales se ubican en una elipse alrededor del centro de la mesa (37 % × 41 % del área) empezando por el jugador que mira, abajo, en sentido horario.
- Tu tablero: maldiciones a la izquierda, tu luchador con corazones y arma al centro, bendiciones a la derecha. La mano en abanico debajo usa solo el ancho libre entre los bordes y la columna de botones.
- Arriba a la derecha, siempre visibles: Cinemático/Rápido, música y efectos.
- Solo escritorio (1280 px o más). Móvil está fuera de alcance.

## Elevation & Depth

- No hay desenfoques ni sombras suaves. La profundidad es de juego de 16 bits: contorno de 1 píxel con esquinas muescadas, luz interna arriba, sombra interna abajo y una sombra dura de 3 píxeles hacia abajo.
- La única luz difusa es la del escenario (vela y antorchas) y el borde rojo pulsante cuando te quedan 3 PV o menos.
- Orden de capas: escenario (canvas) → mesa y asientos → tu zona → crónica → efectos → avisos y pantallas de fin.

## Shapes

- Cero bordes redondeados. Los paneles son rectángulos con las esquinas recortadas un píxel (hecho con sombras sin desenfoque en `.px`, `.btn`, `.seat`, etc.).
- Remaches dorados de 1 píxel en las esquinas superiores de asientos, tablero propio y Cofre.
- Tramados de damero de 6 px para recuadros de arte de cartas, mazos y el velo de las pantallas superpuestas.

## Components

- **Naipe**: pergamino con marco doble del color del tipo, cinta del nombre en el tono oscuro, recuadro de arte tramado con el sprite 16×16 a escala 4, etiqueta de tipo y texto. Estados: jugable (contorno verde), defensa posible (contorno celeste que parpadea), elegido (contorno dorado y elevado), no disponible (oscurecido), a descartar (cruz roja).
- **Asiento rival**: retrato 16×16 del luchador en un marco del color del asiento, nombre, cercano/lejano, corazones, escuditos de armadura, arma con daño cercano/lejano, cartas en mano y maldiciones a la izquierda / bendiciones a la derecha. Bandera "Turno" o "Decide".
- **Corazones**: uno por PV hasta 15; dorados por encima de la vida inicial; laten si quedan 3 o menos.
- **Cofre de Armas**: 6 casillas con el sprite del arma y su daño; si alguien la tiene, la silueta se oscurece y aparece su nombre con su color.
- **Botones**: tablón de madera; dorado para la acción principal, rojo para recibir el golpe, azul acero para terminar turno. Al pasar el mouse suben 1 píxel; al apretar bajan 1.
- **Crónica**: rollo de pergamino; el texto viene del motor sin emojis.
- **Movimiento**: un director (`src/ui/fx/director.ts`) reproduce los eventos del motor de a uno y mantiene la mesa mostrando los valores de antes hasta que cada animación ocurre. Firma: el arma del atacante vuela en arco hasta el objetivo; el impacto hace destello, sacudida (más fuerte desde 4 de daño), chispas cuadradas y número grande; un bloqueo hace rebotar el arma con chispas doradas. Duraciones en modo Cinemático y Rápido en `DURATION`. Con `prefers-reduced-motion` no hay sacudidas ni vuelos: los efectos aparecen en su sitio.
- **Sonido**: todo sintetizado en `src/ui/audio/audio.ts`; la música es una giga de taberna que acelera y suma capas con la tensión (pocos vivos, poca vida).

## Do's and Don'ts

- Do: dibujar todo arte nuevo como sprite de texto en `sprites.ts` con la paleta existente y 1 píxel libre para el contorno automático.
- Do: escalar sprites solo por enteros (2, 3, 4…) para que los píxeles queden nítidos.
- Do: usar Jersey 10 para lo que se grita y Pixelify Sans para lo que se lee.
- Don't: emojis o caracteres Unicode como íconos; cada ícono es un sprite.
- Don't: bordes redondeados, degradados suaves, vidrio o desenfoque.
- Don't: animaciones que bloqueen el juego sin poder saltarlas (Espacio) o acortarlas (Rápido).
- Don't: copiar arte, personajes o nombres de otros juegos.
