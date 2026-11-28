// ============================================================================
//  ARTE PIXEL
// ============================================================================
//  Cada sprite es una lista de filas de texto: 1 carácter = 1 píxel.
//  '.' = transparente. El resto de letras son colores de PALETTE.
//  Si `outline` no es false, se le agrega solo un contorno oscuro de 1 píxel
//  alrededor: dibuja solo el relleno y deja 1 píxel libre en el borde.
//  Para ver todo el arte junto: botón "Ver arte" en la pantalla de inicio.
// ============================================================================

export const PALETTE: Record<string, string> = {
  k: '#120e1c', // contorno
  K: '#2b2436', // casi negro
  m: '#3d3450', // gris oscuro morado
  w: '#f6eedc', // blanco hueso
  g: '#b8bccb', // acero claro
  G: '#7c8299', // acero
  d: '#4a4f68', // acero oscuro
  n: '#c98a4a', // madera clara
  b: '#9a5a2c', // madera
  B: '#5e3418', // madera oscura
  y: '#f2c94c', // oro
  Y: '#b07a1e', // oro oscuro
  o: '#ee8a3a', // naranja
  r: '#e04848', // rojo
  R: '#922637', // rojo oscuro
  p: '#ff9fb0', // rosa
  c: '#8fd8f0', // celeste
  u: '#3f7fd8', // azul
  U: '#25427e', // azul oscuro
  l: '#8de06a', // verde claro
  e: '#3aa457', // verde
  E: '#1f5e3a', // verde oscuro
  v: '#b588ee', // violeta claro
  V: '#6a43a8', // violeta
  s: '#f0c09a', // piel
  S: '#c0805a', // piel sombra
  h: '#3c2618', // pelo oscuro
  H: '#a0522d', // pelo/barba cobriza
};

export interface SpriteDef {
  rows: string[];
  outline?: boolean;
}

type Grid = string[];

// ---------------------------------------------------------------- utilidades

export function recolor(g: Grid, map: Record<string, string>): Grid {
  return g.map((row) => [...row].map((ch) => map[ch] ?? ch).join(''));
}

/** Pone `top` encima de `base` (los '.' de `top` no tapan). */
export function overlay(base: Grid, top: Grid, dx = 0, dy = 0): Grid {
  const out = base.map((r) => [...r]);
  top.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const yy = y + dy;
      const xx = x + dx;
      if (ch !== '.' && out[yy] && xx >= 0 && xx < out[yy].length) out[yy][xx] = ch;
    }),
  );
  return out.map((r) => r.join(''));
}

export function flipH(g: Grid): Grid {
  return g.map((row) => [...row].reverse().join(''));
}

const BLANK16 = Array.from({ length: 16 }, () => '................');

// ---------------------------------------------------------------- armas

const ESPADA: Grid = [
  '................',
  '..............w.',
  '.............wg.',
  '............wg..',
  '...........wg...',
  '..........wg....',
  '.........wg.....',
  '........wg......',
  '...y...wg.......',
  '....y.wg........',
  '.....yy.........',
  '....b.y.........',
  '...b...y........',
  '..b.............',
  '.y..............',
  '................',
];

const DAGA: Grid = [
  '................',
  '................',
  '................',
  '...........w....',
  '..........wg....',
  '.........wg.....',
  '........wg......',
  '.......wg.......',
  '....y.wg........',
  '.....yy.........',
  '....b..y........',
  '...b............',
  '..y.............',
  '................',
  '................',
  '................',
];

const ARCO: Grid = [
  '................',
  '......bb........',
  '......wbb.......',
  '......w.bb......',
  '......w..bb.....',
  '......w...b.....',
  '......w...bn....',
  '......w....b....',
  '..rrnnwnnnnbngg.',
  '......w....b....',
  '......w...bn....',
  '......w...b.....',
  '......w..bb.....',
  '......w.bb......',
  '......wbb.......',
  '......bb........',
];

const HACHA: Grid = [
  '................',
  '.........nb.....',
  '.....ggG.nb.....',
  '...wgggGGnb.....',
  '..wgggggGnb.....',
  '..wgggggGnb.....',
  '..wgggggGnb.....',
  '...wgggGGnb.....',
  '.....ggG.nb.....',
  '.........nb.....',
  '.........nb.....',
  '.........nb.....',
  '.........nb.....',
  '.........nb.....',
  '.........YY.....',
  '................',
];

const MANGUAL: Grid = [
  '................',
  '...........d....',
  '.........gggG...',
  '........gwgggG..',
  '.......dggggGGd.',
  '........gggGGG..',
  '.........GGGG...',
  '...........d....',
  '.........G......',
  '........G.......',
  '.......G........',
  '......G.........',
  '....nb..........',
  '...nb...........',
  '..YY............',
  '................',
];

const GARROTE: Grid = [
  '................',
  '..........nnb...',
  '.........nnnbb..',
  '........nnnnbbb.',
  '........nnnbbBb.',
  '.......nnnbbbB..',
  '......nnnbbB....',
  '.....nnbbB......',
  '.....nbB........',
  '....nbB.........',
  '...nbB..........',
  '...nB...........',
  '..nB............',
  '..BB............',
  '................',
  '................',
];

const PUNOS: Grid = [
  '................',
  '................',
  '......ssss......',
  '....sssssss.....',
  '...sssssssss....',
  '...sSssSssSss...',
  '...ssssssssssS..',
  '...sSssSssSsSS..',
  '...ssssssssssS..',
  '....sssssssSS...',
  '.....sssssSS....',
  '......SSSSS.....',
  '......nnnnn.....',
  '......bbbbb.....',
  '................',
  '................',
];

// ---------------------------------------------------------------- piezas reusables

const ESCUDO: Grid = [
  '................',
  '................',
  '..yyyyyyyyyyyy..',
  '..yuuuuuuuuuuy..',
  '..yuccuuuuuuuy..',
  '..yucuuuuuuuUy..',
  '..yuuuuyyuuuUy..',
  '..yuuuyyyyuuUy..',
  '..yuuuuyyuuuUy..',
  '...yuuuuuuuUy...',
  '...yuuuuuuuUy...',
  '....yuuuuuUy....',
  '.....yuuuUy.....',
  '......yUUy......',
  '.......yy.......',
  '................',
];

const ESCUDO_LISO = overlay(ESCUDO, [
  '', '', '', '', '', '',
  '.......uu.......',
  '......uuuu......',
  '.......uu.......',
]);

const X_ROJA: Grid = [
  '................',
  '................',
  '..rr........rr..',
  '..rrr......rrr..',
  '...rrr....rrr...',
  '....rrr..rrr....',
  '.....rrrrrr.....',
  '......rrrr......',
  '......rrrr......',
  '.....rrrrrr.....',
  '....rrr..rrr....',
  '...rrr....rrr...',
  '..rrr......rrr..',
  '..rr........rr..',
  '................',
  '................',
];

const PECHERA: Grid = [
  '................',
  '................',
  '...gg......gg...',
  '..gwgg....ggGg..',
  '..gwggggggggGg..',
  '...gwgggggggG...',
  '...gwggGGgggG...',
  '...gwggGGgggG...',
  '...gwgggggggG...',
  '...gwgggggggG...',
  '....gwggggGG....',
  '....ggggggGG....',
  '.....gggggG.....',
  '................',
  '................',
  '................',
];

const FRASCO: Grid = [
  '................',
  '................',
  '.......bb.......',
  '.......nn.......',
  '......gggg......',
  '.......gg.......',
  '.....gggggg.....',
  '....g......g....',
  '...g.rrrrrr.g...',
  '...grrwrrrrrg...',
  '...grwrrrrrrg...',
  '...grrrrrrrrg...',
  '...gRrrrrrrRg...',
  '....gRRRRRRg....',
  '.....gggggg.....',
  '................',
];

// ---------------------------------------------------------------- cartas

const ATAQUE_SIMPLE = overlay(ESPADA, [
  '................',
  '.....ccc........',
  '...cc...........',
  '..c.............',
  '..c.............',
  '.c..............',
]);

const ATAQUE_CERCANO: Grid = [
  '................',
  '................',
  '......cccc......',
  '....cc....cw....',
  '...c........w...',
  '..c...gggg...w..',
  '..c..g....g..w..',
  '.c..g..rr..g..w.',
  '.c..g..rr..g..w.',
  '.w..g......g..c.',
  '..w..g....g..c..',
  '..w...gggg...c..',
  '...w........c...',
  '....wc....cc....',
  '......cccc......',
  '................',
];

const ATAQUE_LEJANO = overlay(
  [
    '................',
    '.....rrrrr......',
    '...rrwwwwwrr....',
    '..rwwrrrrrwwr...',
    '..rwrrwwwrrwr...',
    '.rwrrwwwwwrrwr..',
    '.rwrwwrrrwwrwr..',
    '.rwrwwrrrwwrwr..',
    '.rwrwwrrrwwrwr..',
    '.rwrrwwwwwrrwr..',
    '..rwrrwwwrrwr...',
    '..rwwrrrrrwwr...',
    '...rrwwwwwrr....',
    '.....rrrrr......',
    '................',
    '................',
  ],
  [
    '..............y.',
    '.............y..',
    '............n...',
    '...........n....',
    '..........n.....',
    '.........n......',
    '........n.......',
  ],
);

const ATAQUE_DOBLE = overlay(ESPADA, flipH(ESPADA));

const ESQUIVA: Grid = [
  '................',
  '................',
  '......bbbb......',
  '......bnnb......',
  '.cc...bnnb......',
  '......bnnb......',
  '..ccc.bnnb......',
  '.....bbnnb......',
  '.cc.bnnnnbb.....',
  '...bnnnnnnnb....',
  '...bnnnnnnnnb...',
  '...BBBBBBBBBB...',
  '................',
  '..cccc..........',
  '................',
  '................',
];

const ESCUDO_REBOTE = overlay(recolor(ESCUDO_LISO, { u: 'e', U: 'E', c: 'l' }), [
  '', '', '', '', '',
  '........w.......',
  '.......w........',
  '......wwwww.....',
  '.......w...w....',
  '........w..w....',
  '...........w....',
]);

const CONTRAATAQUE = overlay(recolor(ESCUDO_LISO, { u: 'r', U: 'R', c: 'p' }), ESPADA);

const DESARMADO = overlay(ESPADA, X_ROJA);

const TRUEQUE: Grid = [
  '................',
  '................',
  '..........y.....',
  '..........yy....',
  '..yyyyyyyyyyy...',
  '..........yy....',
  '..........y.....',
  '................',
  '................',
  '.....o..........',
  '....oo..........',
  '...ooooooooooo..',
  '....oo..........',
  '.....o..........',
  '................',
  '................',
];

const ROTACION: Grid = [
  '................',
  '................',
  '.....yyyyyy.....',
  '...yy......yy...',
  '..y..........y..',
  '..y.........ooo.',
  '.y...........o..',
  '.y..............',
  '..............y.',
  '..o...........y.',
  '.ooo.........y..',
  '..y..........y..',
  '...yy......yy...',
  '.....yyyyyy.....',
  '................',
  '................',
];

const REAJUSTE: Grid = [
  '................',
  '.......y........',
  '...yyyyyyyyy....',
  '...y...y...y....',
  '..y.y..y..y.y...',
  '.y...y.y.y...y..',
  '.yyyyy.y.yyyyy..',
  '..YYY..y..YYY...',
  '.......y........',
  '.......y........',
  '.......y........',
  '.....yyyyy......',
  '....YYYYYYY.....',
  '................',
  '................',
  '................',
];

const SIN_CAMISETA = overlay(
  [
    '................',
    '................',
    '....uu....uu....',
    '...uuuuuuuuuu...',
    '..uuuuuuuuuuuu..',
    '.uuuuuuuuuuuuuu.',
    '.uuu.uuuuuu.uuu.',
    '.uu..uuuuuu..uu.',
    '.....uuuuuu.....',
    '.....uuuuuu.....',
    '.....uuuuuu.....',
    '.....uuuuuu.....',
    '.....UUUUUU.....',
    '................',
    '................',
    '................',
  ],
  X_ROJA,
);

const ARMADURA_LATON = recolor(PECHERA, { g: 'y', G: 'Y' });
const ARMADURA_ACERO = PECHERA;
const ARMADURA_MAGICA = overlay(recolor(PECHERA, { g: 'v', G: 'V', w: 'c' }), [
  '.c............c.',
  'ccc............',
  '.c..............',
  '', '', '', '', '', '', '', '', '', '',
  '..............c.',
  '.............ccc',
  '..............c.',
]);

const ELIXIR: Grid = [
  '................',
  '......bbbb......',
  '......bnnb......',
  '.......gg.......',
  '.......gg.......',
  '......gggg......',
  '.....g....g.....',
  '....g.yyyy.g....',
  '...g.yywyyy.g...',
  '...gyywwwyyyg...',
  '...gyyywyyyyg...',
  '...gyyyyyyyyg...',
  '...gYyyyyyyYg...',
  '....gYYYYYYg....',
  '.....gggggg.....',
  '................',
];

const PIEDRAS: Grid = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '......GGG.......',
  '.....GgggG......',
  '....GggwggG.....',
  '....GgggggGd....',
  '....dGgggGdd....',
  '..GGGdGGGdGGG...',
  '.GgggGdddGgwgG..',
  '.GgwggGd.GgggGd.',
  '.dGgggGd.dGggGd.',
  '..ddddd...dddd..',
  '................',
];

const POCIMA_CURATIVA = FRASCO;
const POCIMA_NORMALIDAD = recolor(FRASCO, { r: 'c', R: 'u' });

const CONTAGIOSO: Grid = [
  '................',
  '................',
  '.......l........',
  '...l..eee..l....',
  '....eeeeeeee....',
  '...eeleeeeeee...',
  '.leeleeeeeeeel..',
  '..eeeekeeekeee..',
  '..eeeeeeeeeeee..',
  '.leeeeeeeeeeeel.',
  '..eeeekkkkeeee..',
  '...eeeeeeeeEe...',
  '....eeeeeeEE....',
  '...l..EEE..l....',
  '.......l........',
  '................',
];

const REGALO: Grid = [
  '................',
  '................',
  '.....y....y.....',
  '....y.y..y.y....',
  '.....yy..yy.....',
  '..rrrrryyrrrrr..',
  '..rrrrryyrrrrr..',
  '..RRRRRyyRRRRR..',
  '...rrrryyrrrr...',
  '...rrrryyrrrr...',
  '...rrrryyrrrr...',
  '...rrrryyrrrr...',
  '...RRRRYYRRRR...',
  '................',
  '................',
  '................',
];

const FIJADO: Grid = [
  '................',
  '......rrrr......',
  '.....rrprrr.....',
  '.....rpprrr.....',
  '.....rrrrRr.....',
  '......rrRR......',
  '....rrrrrrRR....',
  '...rrrrrrrrRR...',
  '......GgG.......',
  '.......g........',
  '.......g........',
  '.......g........',
  '.......G........',
  '................',
  '................',
  '................',
];

const RELEGADO: Grid = [
  '................',
  '................',
  '......ee.ee.....',
  '....eeeleeeee...',
  '...ee..nle..ee..',
  '.......n........',
  '......n.........',
  '......n.........',
  '.....n..........',
  '.....n..........',
  '...nnnnnn.......',
  '..yyyyyyyyy.....',
  '.uuyyyyyyyyyuu..',
  '.uuuuuuuuuuuuuu.',
  '..cucucucucucu..',
  '................',
];

const VECINO: Grid = [
  '................',
  '................',
  '.......RR.......',
  '......RrrR......',
  '.....RrrrrR.....',
  '....RrrrrrrR....',
  '...RrrrrrrrrR...',
  '..RRRRRRRRRRRR..',
  '...nnnnnnnnnn...',
  '...nbbnnnnccn...',
  '...nbbnnnnccn...',
  '...nbbnnnnnnn...',
  '...nbbnnnnnnn...',
  '...BBBBBBBBBB...',
  '................',
  '................',
];

const DEBILUCHO: Grid = [
  '................',
  '................',
  '........vvv.....',
  '.......vpvvv....',
  '........vvv.v...',
  '..........e.....',
  '.........e......',
  '........e.......',
  '.......e........',
  '.......e..l.....',
  '.......e.ll.....',
  '......le.l......',
  '......lee.......',
  '.....bbbbbb.....',
  '......BBBB......',
  '................',
];

const SUPER_FUERTE: Grid = [
  '................',
  '................',
  '................',
  '...ss...........',
  '..ssss..........',
  '..sSss..........',
  '..sSss....sss...',
  '..sSss...sssss..',
  '..sSsss.sssssss.',
  '..sSssssssssSss.',
  '..sSsssssssSSs..',
  '...SSssssSSS....',
  '....SSSSSS......',
  '................',
  '................',
  '................',
];

const ROMPE_ESCUDOS: Grid = [
  '................',
  '.............c..',
  '..GGGGGGGGGGG..c',
  '..GwwggggggdG.c.',
  '..GwgggggggdG...',
  '..GGGGGGGGGGG...',
  '......nb........',
  '......nb........',
  '......nb........',
  '......nb........',
  '......nb........',
  '......nb........',
  '......nb........',
  '......YY........',
  '................',
  '................',
];

const KAMIKAZE: Grid = [
  '................',
  '..........o.y...',
  '.........y.o....',
  '........bb......',
  '.......b........',
  '.....dddd.......',
  '....mmmmmm......',
  '...mmwmmmmmm....',
  '..mmwmmmmmmmm...',
  '..mmmmmmmmmmm...',
  '..mmmmmmmmmmm...',
  '..mmmmmmmmmmm...',
  '...mmmmmmmmm....',
  '....mmmmmmm.....',
  '......mmm.......',
  '................',
];

// ---------------------------------------------------------------- personajes (uno por asiento)

const CABALLERO: Grid = [
  '................',
  '.......rr.......',
  '......rrr.......',
  '.....gggggg.....',
  '....gwgggggG....',
  '...gwgggggggG...',
  '...gwgggggggG...',
  '...gKKKKKKKKG...',
  '...ggggggggGG...',
  '...gggggggggG...',
  '....gggggggG....',
  '....GGGGGGGG....',
  '...uuuuuuuuuu...',
  '..uuuuuyyuuuuu..',
  '..uuuuuyyuuuuu..',
  '................',
];

const BARBARO: Grid = [
  '................',
  '....h.h..h.h....',
  '...hhhhhhhhhh...',
  '..hhhhhhhhhhhh..',
  '..hhssssssssh...',
  '..hsskssksssh...',
  '..hssssssssSh...',
  '..hsHHHHHHsSh...',
  '...hHHsrrsHHh...',
  '...HHHHHHHHHH...',
  '....HHHHHHHH....',
  '.....HHHHHH.....',
  '...ssbbbbbbss...',
  '..sssbnnnnbsss..',
  '..sssbnnnnbsss..',
  '................',
];

const PICARO: Grid = [
  '................',
  '......VVVV......',
  '....VVVVVVVV....',
  '...VVvvvvvvVV...',
  '...VvKKKKKKvV...',
  '..VVKKwKKwKKVV..',
  '..VvKKKKKKKKvV..',
  '..VvKKKKKKKKvV..',
  '..VVvKKKKKKvVV..',
  '...VVvvvvvvVV...',
  '....VVVVVVVV....',
  '...VVVVVVVVVV...',
  '..VVVVVyyVVVVV..',
  '..VVVVVVVVVVVV..',
  '..VVVVVVVVVVVV..',
  '................',
];

const ARQUERA: Grid = [
  '................',
  '..........yy....',
  '......eeeeyy....',
  '....eeeeeeey....',
  '...eeeeeeeeE....',
  '..EEEEEEEEEEEE..',
  '...hssssssssh...',
  '...hskssssksh...',
  '...hssssssssh...',
  '...hsssrrsssh...',
  '...hhssssssh....',
  '....hhSSSShh....',
  '...eeeeeeeeee...',
  '..eeeeEnneeeee..',
  '..eeeeEnneeeee..',
  '................',
];

const MONJE: Grid = [
  '................',
  '................',
  '.....ssssss.....',
  '....sswsssss....',
  '...sswssssssS...',
  '...sssssssssS...',
  '...sksssssksS...',
  '...sssssssssS...',
  '...ssssSsssSS...',
  '....sssrrssS....',
  '.....sssssS.....',
  '......SSSS......',
  '...oooooooooo...',
  '..ooooYooooooo..',
  '..ooooYooooooo..',
  '................',
];

const BRUJA: Grid = [
  '.........V......',
  '........VVV.....',
  '.......VVVV.....',
  '......VVVvV.....',
  '.....VVVVVVV....',
  '...VVVVyyVVVVV..',
  '.VVVVVVVVVVVVVV.',
  '...hssssssssh...',
  '...hskssssksh...',
  '...hsssssssSh...',
  '...hhssrrssSh...',
  '....hhSSSSSh....',
  '...VVVVVVVVVV...',
  '..VVVVVllVVVVV..',
  '..VVVVVVVVVVVV..',
  '................',
];

export const CHARACTERS = ['caballero', 'barbaro', 'picaro', 'arquera', 'monje', 'bruja'] as const;

// ---------------------------------------------------------------- interfaz

const CORAZON: Grid = [
  '.........',
  '..rr.rr..',
  '.rprrrrr.',
  '.rrrrrrr.',
  '..rrrrR..',
  '...rRR...',
  '....R....',
  '.........',
];

const ESCUDITO: Grid = [
  '.........',
  '.uuuuuuu.',
  '.ucuuuuU.',
  '.uuuuuuU.',
  '..uuuuU..',
  '...uUU...',
  '....U....',
  '.........',
];

const DORSO: Grid = [
  '.........',
  '.BBBBBBB.',
  '.BbnbnbB.',
  '.BnbybnB.',
  '.BbyYybB.',
  '.BnbybnB.',
  '.BbnbnbB.',
  '.BBBBBBB.',
  '.........',
];

const LAPIDA: Grid = [
  '................',
  '................',
  '.....GGGGGG.....',
  '....GggggggG....',
  '...GggggggggG...',
  '...GgggkkgggG...',
  '...GggkkkkggG...',
  '...GgggkkgggG...',
  '...GgggkkgggG...',
  '...GggggggggG...',
  '...GggggggggG...',
  '...GggggggggG...',
  '..lGGGGGGGGGGl..',
  '.llellleellell..',
  '................',
  '................',
];

const ESTRELLA: Grid = [
  '.........',
  '....y....',
  '....y....',
  '.yyyyyyy.',
  '..yyyyy..',
  '...yyy...',
  '..yy.yy..',
  '.y.....y.',
  '.........',
];

const CHISPA: Grid = ['.......', '...w...', '...w...', '.wwwww.', '...w...', '...w...', '.......'];

const LLAMA_A: Grid = [
  '..........',
  '....o.....',
  '....oo....',
  '...oyo....',
  '...oyyo...',
  '..oyywyo..',
  '..oywwyo..',
  '..oywwyo..',
  '...oyyo...',
  '..........',
];

const LLAMA_B: Grid = [
  '..........',
  '.....o....',
  '....oo....',
  '....oyo...',
  '...oyyo...',
  '..oyyyyo..',
  '..oywwyo..',
  '..oywwyo..',
  '...oyyo...',
  '..........',
];

const ANTORCHA: Grid = [
  '..........',
  '..gGGGGg..',
  '...gGGg...',
  '....bn....',
  '....bn....',
  '....bn....',
  '....bn....',
  '....bn....',
  '....bn....',
  '....BB....',
  '..........',
];

const NOTA: Grid = [
  '..........',
  '....wwwww.',
  '....wwwww.',
  '....w...w.',
  '....w...w.',
  '....w...w.',
  '..www.www.',
  '.wwww.www.',
  '..ww......',
  '..........',
];

const PARLANTE: Grid = [
  '..........',
  '.....w....',
  '....ww..w.',
  '.wwwww...w',
  '.wwwww.w.w',
  '.wwwww.w.w',
  '.wwwww...w',
  '....ww..w.',
  '.....w....',
  '..........',
];

const RAYO: Grid = [
  '..........',
  '.....yy...',
  '....yy....',
  '...yy.....',
  '..yyyyyy..',
  '.....yy...',
  '....yy....',
  '...yy.....',
  '..y.......',
  '..........',
];

const CINE: Grid = [
  '..........',
  '.wwwwwwww.',
  '.w.w..w.w.',
  '.wwwwwwww.',
  '.w......w.',
  '.w......w.',
  '.wwwwwwww.',
  '.w.w..w.w.',
  '.wwwwwwww.',
  '..........',
];

const FLECHA: Grid = [
  '................',
  '..........gggg..',
  '...........wgg..',
  '..........wgwg..',
  '.........n..wg..',
  '........n.......',
  '.......n........',
  '......n.........',
  '.....n..........',
  '....n...........',
  '...n............',
  '..rn............',
  '.rr.............',
  '..r.............',
  '................',
  '................',
];

const DETERMINACION: Grid = [
  '................',
  '.......o........',
  '......oyo.......',
  '.....oywyo......',
  '....ooywyoo.....',
  '....orywyro.....',
  '...orrywyrro....',
  '...orrrrrrro....',
  '...orrrrrrro....',
  '....orrrrro.....',
  '.....orrro......',
  '......ooo.......',
  '.....yyyyy......',
  '....yYYYYYy.....',
  '................',
  '................',
];

const FRANCOTIRADOR: Grid = [
  '................',
  '.......c........',
  '.....ccccc......',
  '....cc.c.cc.....',
  '...cc..c..cc....',
  '..cc...c...cc...',
  '..c....r....c...',
  '.cccccrwccccc...',
  '..c....r....c...',
  '..cc...c...cc...',
  '...cc..c..cc....',
  '....cc.c.cc.....',
  '.....ccccc......',
  '.......c........',
  '................',
  '................',
];

const BRINCON: Grid = [
  '................',
  '.........yy.....',
  '........yyw.....',
  '.......yyw......',
  '......yyyyy.....',
  '.....yyyyw......',
  '....yy..yy......',
  '...yy..yy.......',
  '......yyyyy.....',
  '.....yyyyw......',
  '....yy..yy......',
  '...yy..yy.......',
  '..yy..yy........',
  '..y...y.........',
  '................',
  '................',
];

const DECIDIDO: Grid = [
  '................',
  '......wgg.......',
  '.....wggg.......',
  '......gg........',
  '......yy........',
  '..yyyyyyyyyyyy..',
  '.yYYYYYYYYYYYYy.',
  '.ynnnnnnnnnnnny.',
  '.ynnnnnYYnnnnny.',
  '.ynnnnYwwYnnnny.',
  '.ynnnnnYYnnnnny.',
  '.ynnnnnnnnnnnny.',
  '.yNNNNNNNNNNNNy.',
  '..yyyyyyyyyyyy..',
  '................',
  '................',
];

// ---------------------------------------------------------------- registro

export const SPRITES: Record<string, SpriteDef> = {
  // armas (mismo id que en el motor; 'punos' = sin arma)
  punos: { rows: PUNOS },
  espada: { rows: ESPADA },
  daga: { rows: DAGA },
  arco: { rows: ARCO },
  hacha: { rows: HACHA },
  mangual: { rows: MANGUAL },
  garrote: { rows: GARROTE },
  // cartas (mismo id que en cards.ts)
  determinacion: { rows: DETERMINACION },
  francotirador: { rows: FRANCOTIRADOR },
  brincon: { rows: BRINCON },
  decidido: { rows: DECIDIDO },
  ataque_simple: { rows: ATAQUE_SIMPLE },
  ataque_cercano: { rows: ATAQUE_CERCANO },
  ataque_lejano: { rows: ATAQUE_LEJANO },
  ataque_doble: { rows: ATAQUE_DOBLE },
  escudo: { rows: ESCUDO },
  esquiva: { rows: ESQUIVA },
  escudo_rebote: { rows: ESCUDO_REBOTE },
  contraataque: { rows: CONTRAATAQUE },
  desarmado: { rows: DESARMADO },
  trueque: { rows: TRUEQUE },
  rotacion: { rows: ROTACION },
  reajuste: { rows: REAJUSTE },
  sin_camiseta: { rows: SIN_CAMISETA },
  armadura_laton: { rows: ARMADURA_LATON },
  armadura_acero: { rows: ARMADURA_ACERO },
  armadura_magica: { rows: ARMADURA_MAGICA },
  elixir_de_vida: { rows: ELIXIR },
  piedras: { rows: PIEDRAS },
  pocima_curativa: { rows: POCIMA_CURATIVA },
  contagioso: { rows: CONTAGIOSO },
  pocima_normalidad: { rows: POCIMA_NORMALIDAD },
  regalo_del_cielo: { rows: REGALO },
  fijado: { rows: FIJADO },
  relegado: { rows: RELEGADO },
  vecino: { rows: VECINO },
  debilucho: { rows: DEBILUCHO },
  super_fuerte: { rows: SUPER_FUERTE },
  rompe_escudos: { rows: ROMPE_ESCUDOS },
  kamikaze: { rows: KAMIKAZE },
  // personajes
  caballero: { rows: CABALLERO },
  barbaro: { rows: BARBARO },
  picaro: { rows: PICARO },
  arquera: { rows: ARQUERA },
  monje: { rows: MONJE },
  bruja: { rows: BRUJA },
  // interfaz
  corazon: { rows: CORAZON },
  corazon_vacio: { rows: recolor(CORAZON, { r: 'm', p: 'K', R: 'K' }) },
  corazon_oro: { rows: recolor(CORAZON, { r: 'y', p: 'w', R: 'Y' }) },
  escudito: { rows: ESCUDITO },
  escudito_roto: { rows: recolor(ESCUDITO, { u: 'd', c: 'G', U: 'm' }) },
  dorso: { rows: DORSO },
  lapida: { rows: LAPIDA },
  estrella: { rows: ESTRELLA },
  chispa: { rows: CHISPA },
  llama_a: { rows: LLAMA_A, outline: false },
  llama_b: { rows: LLAMA_B, outline: false },
  antorcha: { rows: ANTORCHA },
  nota: { rows: NOTA },
  parlante: { rows: PARLANTE },
  rayo: { rows: RAYO },
  cine: { rows: CINE },
  flecha: { rows: FLECHA },
  vacio: { rows: BLANK16, outline: false },
};

/** Revisa que cada sprite sea rectangular. Devuelve los problemas encontrados. */
export function checkSprites(): string[] {
  const problems: string[] = [];
  for (const [name, def] of Object.entries(SPRITES)) {
    const w = def.rows[0].length;
    def.rows.forEach((r, i) => {
      if (r.length !== w) problems.push(`${name} fila ${i}: ${r.length} en vez de ${w}`);
      for (const ch of r) if (ch !== '.' && !PALETTE[ch]) problems.push(`${name} fila ${i}: color '${ch}' no existe`);
    });
  }
  return problems;
}
