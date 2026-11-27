---
version: 1
slug: "src-ui-gamescreen-tsx"
primary_target: "src/ui/GameScreen.tsx"
related_targets: ["src/ui/Setup.tsx"]
---

# Pantalla de partida

Scope: pantalla de partida (mesa, mano, efectos) y pantalla de inicio. Modo: Experience (el jugador está dentro del juego), con controles que deben leerse al instante como en una herramienta.

Audiencia y tarea: Hugo y Mario prueban su juego en PC; quieren espectáculo pero a veces ir rápido. Restricciones: arte y sonido propios, escritorio primero, interruptor Cinemático/Rápido siempre visible, música que se acelera al final.

## Direction contract

THESIS: La partida es una riña alrededor de una mesa redonda de taberna vista desde arriba, en pixel art. El círculo de luchadores es la regla de proximidad hecha visible y cada golpe viaja de un asiento a otro. Rechaza la mesa genérica de paneles flotantes con emojis.

OWN-WORLD: Píxel nítido a escala 3. Suelo de losas azul-noche con tramado, mesa redonda de tablones ocre, antorchas parpadeantes, luz cálida al centro. Paneles de madera oscura con borde de píxel muescado y remaches dorados. Vida en corazones de píxel, armadura en escudos de píxel. Naipes de pergamino oscuro con marco del color del tipo y sprite 16×16 propio. Tipografía pixel (Pixelify Sans). Luchadores de 16×16 por asiento.

STORY: De un vistazo se sabe quién está cerca o lejos, qué arma tiene cada uno y cuánta vida le queda. Cada golpe, bloqueo y muerte se siente con imagen y sonido. La música se tensa cuando la partida se acerca al final.

FIRST VIEWPORT: Mesa redonda llenando el centro con el Cofre de Armas y el dado clavados en ella. Rivales sentados en el borde con su luchador, corazones y arma. Tu luchador abajo al centro, maldiciones a la izquierda y bendiciones a la derecha, la mano en abanico debajo. Botón de turno a la derecha. Registro como pergamino a la derecha. Arriba a la derecha, siempre visibles: Cinemático/Rápido, música y efectos.

FORM: Firma: el ataque. El arma del atacante vuela en arco hasta el objetivo; impacto con destello, sacudida proporcional al daño, chispas de píxel, número de daño y sonido; un bloqueo la hace rebotar con chispa y "clang". Posición: dirección fijada por el brief (pixel art pedido por Hugo). seed: none (dirección fijada por el brief, sin tirada)

FINISH: "unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance"

## Unresolved

- Partidas online y móvil fuera de alcance.
