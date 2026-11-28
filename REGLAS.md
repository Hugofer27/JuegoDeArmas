# Juego de Armas: Desarmado — Reglas v0.1

> **Fuente única de verdad de la versión digital.** Si el código y este archivo no coinciden, uno de los dos tiene un bug: se corrige y se anota en el historial (al final).
>
> Base: documento original `Proyecto Juegos de mesa.docx` (se usa la **versión B**, la lista final del documento) + decisiones de Hugo del 27-11-2026.
> Las reglas marcadas con **[revisar]** las decidió Claude para poder programar; están abiertas a cambio.

## 1. Resumen

- 2 a 6 jugadores. Cada uno empieza con **10 PV**, **5 cartas** y **desarmado** (usa Puños).
- Gana el último jugador con PV. Si los últimos jugadores caen a la vez, es **empate**.

## 2. Mesa y proximidad

- Los jugadores se sientan en círculo. El turno pasa al siguiente asiento (sentido horario en pantalla).
- **Cercano**: el jugador inmediatamente a tu izquierda o a tu derecha (contando solo a los vivos). **Lejano**: todos los demás.
- Con 2 o 3 jugadores todos son cercanos: no existen lejanos. Es injusto para el Arco y el Ataque Lejano, pero se deja así por ahora.
- La proximidad es mutua y se recalcula cuando alguien es eliminado (el círculo se cierra).
- Maldiciones que cambian la proximidad: **Relegado** (lejano para todos) gana sobre **Vecino** (cercano para todos). **[revisar]**

## 3. Armas

| Arma | Cercano | Lejano | Efecto |
|---|---|---|---|
| Puños | 1 | 0 | Por defecto si no tienes arma. |
| Espada | 3 | 0 | — |
| Daga | 2 | 2 | Si usas una carta de Escudo (Escudo o Escudo Rebote), pierdes la Daga: vuelve al Cofre. |
| Arco | 1 | 4 | — |
| Hacha | 5 | 3 | Tras atacar con ella quedas **Postrado**: pierdes tu próximo turno completo. |
| Mangual | 1 | 2 | Sus ataques no se pueden bloquear con Escudo ni Escudo Rebote. |
| Garrote | 2 | 0 | Ignora la armadura (PA). |

- **Dado de Armas**: d6 con Espada, Daga, Arco, Hacha, Mangual y Garrote.
- **Cofre de Armas**: las armas que nadie tiene.
- Solo puedes tener 1 arma. Si consigues otra, la anterior vuelve al Cofre.

## 4. Turno

1. **Inicio.** Si estás Postrado, pierdes el turno entero y se quita el marcador.
2. **Fase Arma (opcional).** Lanza el Dado de Armas:
   - sale el arma que ya tienes: no pasa nada;
   - el arma está en el Cofre: la equipas;
   - el arma la tiene otro jugador: se la robas (él queda con Puños).
   - Si ya tenías un arma al lanzar, **pierdes tu Fase Jugar** de este turno. Sin arma, lanzar es gratis.
3. **Robar** 1 carta.
4. **Fase Jugar (opcional).** Juegas 1 carta de cualquier tipo excepto Defensa. Armadura, Maldición y Bendición cuentan como tu carta del turno.
5. **Descarte.** Si tienes más de 7 cartas, descartas hasta quedarte con 7.

- **Mazo vacío:** se baraja el descarte (todo lo que no está en uso) y forma el mazo nuevo.
- Se puede jugar una carta aunque no tenga efecto (por ejemplo, Contagioso sin maldiciones). Los ataques sí necesitan un objetivo válido. **[revisar]**

## 5. Combate

### 5.1 Daño de un ataque, en este orden

1. Daño del arma del atacante según la proximidad del objetivo.
2. ×2 si es Ataque Lejano.
3. +1 si el atacante tiene Super Fuerte (se suma aunque el daño base sea 0). **[revisar]**
4. Defensa del objetivo, si juega una.
5. La armadura absorbe el daño (salvo Garrote). Los PA **se gastan**; al llegar a 0 la armadura se destruye.
6. El daño que queda se resta de los PV.

- El daño de un ataque se calcula al declararlo. **[revisar]**

### 5.2 Bloquear y esquivar

- **Bloquear** = Escudo, Escudo Rebote y Contraataque.
- **Esquivar** = Esquiva. No cuenta como bloqueo.
- **Mangual**: no le afectan Escudo ni Escudo Rebote. Contraataque y Esquiva sí funcionan.
- **Rompe Escudos**: tus ataques no se pueden bloquear; solo esquivar.
- **Debilucho**: cuando te bloquean un ataque, pierdes 1 PV. Si te lo esquivan, no.

### 5.3 Defensas

- Solo el objetivo del ataque puede responder, con 1 carta de Defensa por ataque.
- Se puede defender fuera de tu turno y aunque estés Postrado.
- **Escudo**: bloquea el ataque.
- **Esquiva**: anula el daño.
- **Escudo Rebote**: bloquea y redirige el ataque a otro jugador, **incluido el atacante**. El ataque conserva su daño y los rasgos del arma original (Mangual, Garrote). El nuevo objetivo puede defenderse (también con otro Rebote). Para todo lo demás, quien rebota pasa a ser el atacante (Debilucho, Rompe Escudos y Contraataque se miran sobre él). **[revisar]**
- **Contraataque** *(en discusión)*: bloquea y haces un ataque inmediato al atacante con tu arma y tu proximidad. El atacante puede defenderse. Si contraatacas con Hacha, quedas Postrado.

### 5.4 Pérdida directa de PV

- Piedras y Kamikaze quitan PV directo: no son ataques, no se pueden defender e ignoran la armadura.
- Se permiten las cadenas de Kamikaze (dos Kamikaze se activan entre sí). Terminan solas porque los PV se acaban; si caen todos a la vez, es empate.

### 5.5 Ataques con varios objetivos

- **Ataque Cercano**: un ataque a cada jugador cercano; cada uno se defiende por separado.
- **Ataque Doble**: 2 ataques a 2 jugadores distintos. Si solo queda 1 rival, los 2 ataques van a él.
- **Fijado**: si juegas un ataque y puedes incluir a un jugador Fijado como objetivo, debes incluirlo.

## 6. Cartas: mazo de 68

### Ataque (18)

| Carta | Copias | Efecto |
|---|---|---|
| Ataque Simple | 7 | Ataca a cualquier jugador. |
| Ataque Cercano | 4 | Ataca a todos tus jugadores cercanos. |
| Ataque Lejano | 4 | Ataca a 1 jugador lejano. El daño se duplica. |
| Ataque Doble | 3 | 2 ataques a 2 jugadores distintos (si solo queda 1 rival, ambos a él). |

### Defensa (14)

| Carta | Copias | Efecto |
|---|---|---|
| Escudo | 5 | Bloquea un ataque. No sirve contra Mangual. |
| Esquiva | 4 | Esquiva un ataque: el daño se anula. No es bloqueo. |
| Escudo Rebote | 2 | Bloquea y redirige el ataque a otro jugador (puede ser el atacante). No sirve contra Mangual. |
| Contraataque | 3 | Bloquea y atacas de inmediato al atacante con tu arma. |

### Evento (5)

| Carta | Copias | Efecto |
|---|---|---|
| Trueque o Robo | 2 | Intercambias tu arma con la de otro jugador. Si no tienes, se la robas. Se puede elegir a alguien sin arma. |
| Reajuste | 1 | Todos los jugadores con más PV que tú quedan desarmados. Única en el mazo. |
| Sin Camiseta | 2 | Destruye todas las armaduras en juego. |

### Armadura (6)

| Carta | Copias | Efecto |
|---|---|---|
| Armadura de Latón | 3 | +2 PA. |
| Armadura de Acero | 2 | +3 PA. |
| Armadura Mágica | 1 | +5 PA. |

- Solo 1 armadura equipada. Si ya tienes una, no puedes jugar otra hasta que la tuya se destruya.
- La Armadura de Cuero (+1 PA) del documento original queda **fuera** (versión B).

### Misterio (16)

| Carta | Copias | Efecto |
|---|---|---|
| Elixir de Vida | 1 | Si tienes menos de 10 PV, subes a 10. |
| Piedras | 3 | Quita 1 PV a un jugador (pérdida directa). |
| Pócima Curativa | 3 | Cura 2 PV. Puedes pasar de 10. |
| Contagioso | 1 | Pasa todas tus maldiciones a otro jugador. |
| Pócima de Normalidad | 1 | Pierdes todas tus bendiciones y maldiciones. |
| Regalo del Cielo | 7 | Roba 2 cartas. |

### Maldición (5)

| Carta | Copias | Efecto |
|---|---|---|
| Fijado | 1 | Todos deben incluirte en sus ataques si pueden. |
| Relegado | 1 | Eres lejano para todos. |
| Vecino | 1 | Eres cercano para todos. |
| Debilucho | 2 | Cuando te bloquean un ataque, pierdes 1 PV. |

### Bendición (4)

| Carta | Copias | Efecto |
|---|---|---|
| Super Fuerte | 2 | Tus ataques hacen +1 de daño. |
| Rompe Escudos | 1 | Tus ataques no se pueden bloquear (sí esquivar). |
| Kamikaze | 1 | Cada vez que pierdes PV, todos los demás pierden 1 PV. |

## 7. Maldiciones, bendiciones y estados

- Las **maldiciones** se ponen a cualquier jugador. Las **bendiciones**, solo a ti.
- Un jugador no puede tener dos copias de la misma maldición o bendición.
- Quedan activas hasta que algo las quite (Pócima de Normalidad, Contagioso o la eliminación).
- Relegado y Vecino en el mismo jugador: la nueva reemplaza a la anterior. **[pendiente de confirmar]**
- En pantalla: tus maldiciones a la **izquierda** de tu tablero y tus bendiciones a la **derecha**.
- **Postrado**: pierdes tu próximo turno completo (sí puedes defenderte mientras tanto).

## 8. Eliminación y fin

- Con 0 PV o menos quedas eliminado. Tu arma vuelve al Cofre; tu mano, armadura, maldiciones y bendiciones van al descarte.
- El círculo se cierra y la proximidad se recalcula.
- Gana el último jugador con PV. Si los últimos caen a la vez, empate.

## 9. Pendientes

- Contraataque: en discusión (sección 5.3).
- Relegado y Vecino en el mismo jugador (sección 7).
- Revisar todas las reglas marcadas **[revisar]**.
- Partidas de 2 y 3 jugadores sin lejanos (sección 2).

## Historial

- **v0.1 — 2026-11-27.** Primera versión digital. Versión B del documento, respuestas de Hugo a las dudas y mazo de 66 cartas propuesto por Claude.
- **2026-11-27.** Arco: daño lejano de 3 a 4 (cercano sigue en 1), para que no sea tan débil.
- **v0.2 — 2026-11-27.** Se quita Desarmado (2 copias). No se puede jugar una Armadura si ya tienes una equipada. Regalo del Cielo pasa de 2 a 7 copias. Mazo: 69 cartas.
- **v0.2.1 — 2026-11-27.** Se quita Rotación (1 copia). Mazo: 68 cartas. Se muestra la versión en el menú de inicio y la cantidad de copias por carta en el Compendio.
