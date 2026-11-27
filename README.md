# Juego de Armas: Desarmado

Versión digital del juego de cartas de Hugo y Mario, para jugarlo, probar cartas nuevas y balancearlo.

**Jugar ahora:** <https://hugofer27.github.io/JuegoDeArmas/>

- **Reglas:** [REGLAS.md](REGLAS.md) (v0.1).
- **Para programar (o pedirle cambios a una IA):** [AGENTS.md](AGENTS.md).

## Jugar online con amigos

1. Abre el juego y pulsa **Jugar online**. Se crea una sala con un código de 5 letras.
2. Pulsa **Copiar link** y mándaselo a tus amigos (WhatsApp, Discord…).
3. Ellos abren el link, ponen su nombre y entran a tu sala.
4. Eliges cuántos luchadores son (los asientos libres los juegan bots) y pulsas **¡A la riña!**

Quien crea la sala es el **anfitrión**: su navegador corre la partida y los bots, así que no debe cerrar la pestaña. Si un invitado se desconecta, un bot juega por él; si vuelve a abrir el link con el mismo nombre, recupera su asiento.

La conexión es directa entre navegadores (WebRTC con [PeerJS](https://peerjs.com)); su servidor público solo sirve para que los navegadores se encuentren. En algunas redes muy cerradas (oficinas, universidades) puede no conectar.

## Correrlo en tu computadora

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

## Compendio de cartas

En el inicio, **Compendio de cartas** muestra todas las cartas y armas con su **% de victorias estimado**: de los bots que usaron esa carta en partidas simuladas, cuántos ganaron, y cuánto se aleja de la carta promedio. Sirve para ver de un vistazo qué cartas están rotas y cuáles no sirven.

Los números salen de `src/data/card-stats.json`. Después de cambiar o agregar cartas, recalcúlalos:

```bash
npm run stats                    # 1500 partidas de 2 a 6 jugadores (~1 minuto)
npm run stats -- --games 4000    # más partidas = números más confiables
```

## Balance

```bash
npm run sim -- --games 1000 --players 4
```

Juega partidas bot contra bot y muestra el porcentaje de victorias por arma, el daño por arma y las cartas más jugadas. Los bots son simples: los números orientan, no deciden.

## Estado

- **v0.1** (noviembre 2026): juego local completo con pixel art, animaciones y sonido.
- **v0.2**: **el juego ya funciona online.** Podemos jugar juntos solo con un link, como en Duel Links: uno crea la sala, le manda el link al otro y listo. También tiene el Compendio de cartas y se publica solo en GitHub Pages.
- Hasta ahora se usaron unos **50 USD de API** (Claude) para desarrollarlo.

## Lo que aprendimos en las primeras partidas

- **Falta balance y variedad.** El juego se siente monótono y lento: hay que trabajar el balance y sumar dinámicas nuevas.
- **Vale la pena una versión solo para 2 personas.** Con 2 jugadores todos son cercanos y varias cartas pierden sentido; un modo pensado para 2 podría ser el más jugado entre nosotros.
- **Tirar el dado estando armado casi nunca tiene sentido.** Pierdes tu carta del turno y eso es demasiado tiempo perdido. Hay que cambiar el costo (por ejemplo, que solo pierdas la carta si sacas el arma que ya tenías).
- **El Arco es malísimo.** Con 2 o 3 jugadores no hay lejanos, así que casi siempre pega 1.

## Cartas nuevas propuestas

| Carta | Tipo | Efecto | Para qué |
|---|---|---|---|
| Ácido | Misterio | Quita 2 PA de la armadura de un jugador. | Romper armaduras sin depender del Garrote. |
| Último aliento | Misterio | Solo si tienes 3 PV o menos: curas 3 PV y robas 1 carta. | Dar opciones de remontar. |
| Herrero | Bendición | Tu arma actual hace +1 de daño mientras la tengas. | Que valga la pena cuidar y mejorar un arma. |
| Parada | Defensa | Bloquea un ataque lejano y robas 1 carta. | Una defensa que además premia. |

## Modo de prueba (estadísticas)

El juego trae un modo de prueba donde los bots juegan muchas partidas entre ellos, y de ahí salen las estadísticas del Compendio (% de victorias de cada carta y arma):

```bash
npm run stats                    # 1500 partidas (lo que usa el Compendio hoy, ~1 minuto)
npm run stats -- --games 100     # prueba rápida de 100 partidas
```

Con 100 partidas los números se mueven bastante entre corridas; para decidir cambios de balance, mejor usar 1000 o más.

## Hoja de ruta

1. ✅ **Jugar online.** Sala con link; cada uno desde su computadora.
2. ✅ **Galería de cartas.** Compendio con el % de victorias estimado de cada carta.
3. ⏳ **Balance y variedad.** Ajustar las cartas más fuertes y más débiles, arreglar el dado estando armado y el Arco, y sumar las cartas nuevas propuestas.
4. ⏳ **Versión para 2 jugadores.** Reglas pensadas para 2 (por ejemplo, poder acercarse o alejarse como acción).
5. ⏳ **Crear cartas fácil.** Un editor dentro del juego para inventar una carta (nombre, tipo, texto, copias y arte) y probarla en una partida sin tocar código.

## Colaborar (Mario)

1. Hugo te invita como colaborador en GitHub (Settings → Collaborators) y aceptas el correo.
2. Bajas el proyecto y lo corres:

   ```bash
   git clone https://github.com/Hugofer27/JuegoDeArmas.git
   cd JuegoDeArmas
   npm install
   npm run dev
   ```

3. Haces cambios (a mano o con tu IA: que lea primero [AGENTS.md](AGENTS.md)), revisas que todo pase y los subes:

   ```bash
   npm test
   git add -A
   git commit -m "Nueva carta: Bomba de Humo"
   git pull --rebase
   git push
   ```

Cada push a `main` publica el juego solo en <https://hugofer27.github.io/JuegoDeArmas/> en un par de minutos (pestaña **Actions** en GitHub para ver el avance). Si los tests fallan, no se publica.
