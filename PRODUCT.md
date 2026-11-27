# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Hugo y Mario, amigos y co-diseñadores del juego de cartas físico "Juego de Armas: Desarmado". Lo juegan en navegador de PC/laptop, entre ellos (online más adelante) o contra bots, para probar reglas y cartas nuevas. Ambos editan el código con asistentes de IA distintos (Claude, otros).

## Product Purpose

Versión digital jugable del juego de mesa para playtesting: jugar partidas completas de 2 a 6 jugadores, probar cartas nuevas rápido (modo dev) y medir balance (simulador bot contra bot). Éxito: que una partida contra bots sea de verdad entretenida y que agregar una carta tome minutos.

## Positioning

Es el juego propio de dos amigos, con sus reglas exactas (`REGLAS.md`), no un clon de otro juego. La mesa en círculo importa: la proximidad cercano/lejano decide el daño de cada arma.

## Operating Context

- Partidas largas y repetidas de prueba; a veces se quiere espectáculo y a veces ir rápido.
- Varios humanos pueden compartir una pantalla (hot-seat); online por llegar.
- Reglas vivas: cambian seguido, y la UI debe leerse del motor (`src/engine`), no al revés.

## Capabilities and Constraints

- Stack existente: Vite + React + TypeScript; motor de reglas puro y determinista con semilla.
- Sin assets externos con licencia dudosa: arte y sonido propios (pixel art hecho a mano, audio sintetizado).
- Escritorio primero (PC/laptop). Móvil no es objetivo por ahora.
- Animaciones cinemáticas por defecto, con un interruptor siempre visible en pantalla para pasar a modo rápido.
- Música chiptune encendida por defecto, que se acelera cuando la partida se acerca al final (poca vida, pocos jugadores), con silencio separado para música y efectos.

## Brand Commitments

- Nombre: "Juego de Armas: Desarmado".
- Pixel art, animaciones y efectos de sonido; referencia de tono: roguelikes de cartas sencillos (pedido explícito de Hugo), sin copiar arte, personajes ni nombres de ningún juego existente.
- Todo el texto del juego en español.

## Evidence on Hand

- Reglas: `REGLAS.md`. Documento original: `Proyecto Juegos de mesa.docx`.
- No hay arte, logos ni música existentes: todo se crea en el proyecto.

## Product Principles

1. La regla manda: lo que se ve siempre refleja el estado real del motor.
2. Probar rápido: ninguna animación bloquea una prueba; siempre se puede acelerar.
3. Entretenido de verdad: cada golpe, bloqueo y muerte se siente.
4. Editable por cualquiera: arte y cartas como datos que una IA o un humano pueden tocar.
