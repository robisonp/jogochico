'use strict';
// =====================================================================
//  GRÁFICOS: sprites pixel art, emojis "SNES-izados", cenários, UI
// =====================================================================

const CHAO = 26;              // altura da faixa de chão (pixels internos)
const LARG_CAMADA = 640;      // largura das camadas de parallax (repetem)
const FONTE_EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Android Emoji","EmojiSymbols",sans-serif';
const FONTE_PIXEL = '"Press Start 2P", ui-monospace, monospace';

function novoCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}
function ctx2d(c) {
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingEnabled = false;
  return g;
}
function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function hex(r, g, b) {
  const q = v => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + ((1 << 24) + (q(r) << 16) + (q(g) << 8) + q(b)).toString(16).slice(1);
}
function misturar(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
function clarear(c, t = 0.3) { return misturar(c, '#ffffff', t); }
function escurecer(c, t = 0.3) { return misturar(c, '#000000', t); }

// gerador aleatório com semente (cenários sempre iguais)
function aleatorioSemente(s) {
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deixa o canvas com cara de SNES: transparência binária, cor de 15 bits
// e (opcional) contorno de 1 pixel.
function nitidar(c, contorno = null) {
  const g = ctx2d(c);
  const W = c.width, H = c.height;
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
    d[i] &= 0xF8; d[i + 1] &= 0xF8; d[i + 2] &= 0xF8; d[i + 3] = 255;
  }
  if (contorno) {
    const [r, gg, b] = rgb(contorno);
    const alfa = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) alfa[p] = d[p * 4 + 3] ? 1 : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (alfa[p]) continue;
      if ((x > 0 && alfa[p - 1]) || (x < W - 1 && alfa[p + 1]) ||
          (y > 0 && alfa[p - W]) || (y < H - 1 && alfa[p + W])) {
        d[p * 4] = r; d[p * 4 + 1] = gg; d[p * 4 + 2] = b; d[p * 4 + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

// ------------------------------ emojis ------------------------------
const _cacheEmoji = new Map();
function spriteEmoji(e, tam, modo = 'cor') {
  const chave = e + '|' + tam + '|' + modo;
  let c = _cacheEmoji.get(chave);
  if (c) return c;
  const lado = Math.ceil(tam * 1.3) + 4;
  c = novoCanvas(lado, lado);
  const g = ctx2d(c);
  g.font = `${tam}px ${FONTE_EMOJI}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(e, lado / 2, lado / 2 + tam * 0.06);
  if (modo === 'sombra') {
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#231f3a';
    g.fillRect(0, 0, lado, lado);
    nitidar(c, '#f4f0ff');
  } else if (modo === 'cinza') {
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#5a5670';
    g.fillRect(0, 0, lado, lado);
    nitidar(c, '#2a2640');
  } else {
    nitidar(c, '#1a1226');
  }
  _cacheEmoji.set(chave, c);
  return c;
}

function desenharEmoji(g, e, x, y, tam, o = {}) {
  const s = spriteEmoji(e, tam, o.modo || 'cor');
  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (o.rot) g.rotate(o.rot);
  g.scale((o.virar ? -1 : 1) * (o.ex || 1), o.ey || 1);
  if (o.alfa != null) g.globalAlpha = o.alfa;
  g.drawImage(s, -Math.round(s.width / 2), -Math.round(s.height / 2));
  g.restore();
}

// O tablet consegue desenhar esse emoji colorido?
function emojiSuportado(e) {
  const c = novoCanvas(40, 40), g = ctx2d(c);
  g.font = `28px ${FONTE_EMOJI}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(e, 20, 20);
  const d = g.getImageData(0, 0, 40, 40).data;
  // fonte sem emoji colorido desenha tudo na cor do pincel (preto)
  let opacos = 0, claros = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] > 100) {
      opacos++;
      if (Math.max(d[i], d[i + 1], d[i + 2]) > 60) claros++;
    }
  }
  const largura = g.measureText(e).width;
  return opacos > 40 && claros > opacos * 0.3 && largura < 28 * 1.7;
}

// --------------------------- pixel art ---------------------------
function criarSprite(linhas, paleta) {
  const w = Math.max(...linhas.map(l => l.length)), h = linhas.length;
  const c = novoCanvas(w, h), g = ctx2d(c);
  linhas.forEach((l, y) => {
    for (let x = 0; x < l.length; x++) {
      const ch = l[x];
      if (ch === '.' || ch === ' ' || !paleta[ch]) continue;
      g.fillStyle = paleta[ch];
      g.fillRect(x, y, 1, 1);
    }
  });
  return c;
}

// desenha com o ponto (x, y) no centro-embaixo do sprite
function desenharSprite(g, spr, x, y, o = {}) {
  const esc = o.escala || 1;
  g.save();
  g.translate(Math.round(x), Math.round(y));
  if (o.rot) g.rotate(o.rot);
  g.scale(o.virar ? -esc : esc, esc * (o.ey || 1));
  if (o.alfa != null) g.globalAlpha = o.alfa;
  g.drawImage(spr, -Math.round(spr.width / 2), -spr.height);
  g.restore();
}

const PAL_HEROI = {
  k: '#2a1a12', h: '#e8c46a', H: '#9a6a32', s: '#f5c7a1', r: '#f08a8a', e: '#1b1b1b',
  c: '#3f9b4f', C: '#2d7a3b', p: '#8a5a32', b: '#5a3a22', w: '#ffffff',
};
const HEROI_CORPO = [
  '....kkkkk....',
  '...khhhhhk...',
  '..khhhhhhhk..',
  '..kHHHHHHHk..',
  '.kkkkkkkkkkkk',
  '..kssssssk...',
  '..kssssesk...',
  '..kssssssk...',
  '..krsssssk...',
  '...kssssk....',
  '..kcccccck...',
  '.kscccccCsk..',
  '..kcccccck...',
  '..kppppppk...',
];
const SPR = {};
function prepararSprites() {
  const perna = (a, b) => criarSprite(HEROI_CORPO.concat([a, b]), PAL_HEROI);
  SPR.correr = [
    perna('..kpk..kpk...', '.kbbk..kbbk..'),
    perna('...kpkkpk....', '...kbbbbk....'),
  ];
  SPR.pular = perna('.kpk....kpk..', 'kbbk.....kbbk');
  SPR.parado = perna('..kpk..kpk...', '..kbbk.kbbk..');
  SPR.tonto = criarSprite(HEROI_CORPO.map(l => l.replace('kssssesk', 'ksxsxsxk'))
    .concat(['..kpk..kpk...', '.kbbk..kbbk..']), Object.assign({ x: '#1b1b1b' }, PAL_HEROI));

  SPR.sub = [0, 1].map(f => criarSprite([
    '...........kkk......',
    '...........kyk......',
    '...........kyk......',
    '.....kkkkkkkkkkkk...',
    '...kkyyyyyyyykkkkk..',
    '..kyyyyyyyyykwwwwwk.',
    (f ? 'gg' : '.g') + 'kyyyyyyyykwhhhwwk',
    (f ? '.g' : 'gg') + 'kyyyyyyyykwssewk.',
    '..kyyYyyYyyykwwwwwk.',
    '...kYYYYYYYYYkkkkk..',
    '....kkkkkkkkkkkkk...',
  ], { k: '#2a1a12', y: '#f2c230', Y: '#c8961c', w: '#bfe8ff', h: '#e8c46a', s: '#f5c7a1', e: '#1b1b1b', g: '#8a8a9a' }));

  const pedra = [
    '....kkkkk.....',
    '..kklllggkk...',
    '.kllggggggGk..',
    '.klgggggGGGk..',
    'kgggggggGGGGk.',
    'kggggGGGGGGGk.',
    'kkkkkkkkkkkkk.',
  ];
  SPR.obst = {
    savana: criarSprite(pedra, { k: '#3a2a1a', l: '#e2c79a', g: '#b89468', G: '#8a6a44' }),
    floresta: criarSprite([
      '.kkkkkkkkkkkkk.',
      'kwwkpppppppppk',
      'kwpwkPPPPPPPPk',
      'kwwkpppppppppk',
      '.kkkkkkkkkkkkk.',
    ].map(l => l), { k: '#2a1a0e', w: '#e8c690', p: '#8a5a2a', P: '#6a4220' }),
    deserto: criarSprite([
      '....kkk.....',
      '...kgGgk....',
      '...kgGgk.kk.',
      '.kk.kgGgkkgk',
      'kgk.kgGgkgGk',
      'kgGkkgGggGk.',
      '.kgGggGgkk..',
      '..kkkgGgk...',
      '....kgGgk...',
      '....kgGgk...',
      '....kgGgk...',
      '...kkkkkkk..',
    ], { k: '#1f3a1a', g: '#5cae45', G: '#3d8a30' }),
    gelo: criarSprite([
      '...kkkkkkk....',
      '..kwwwllllk...',
      '.kwwllllllLk..',
      '.kwllllllLLk..',
      'kwlllllllLLLk.',
      'kllllllLLLLLk.',
      'kkkkkkkkkkkkk.',
    ], { k: '#2a5a7a', w: '#ffffff', l: '#bfe6fa', L: '#8cc8ea' }),
    oceano: criarSprite([
      '.k....k...k..',
      'kpk..kpk.kpk.',
      'kpk..kpkkpk..',
      '.kpk.kpkpk.k.',
      '.kpkkppk..kpk',
      '..kppppk.kpk.',
      '..kppPpkkpk..',
      '...kpPPppk...',
      '..kkkkkkkkk..',
    ], { k: '#5a1a3a', p: '#ff7a9c', P: '#d9507a' }),
  };

  SPR.estrela = criarSprite([
    '....k....',
    '...kyk...',
    'kkkkyykkk',
    'kyyyyyyyk',
    '.kyywyyk.',
    '..kyyyk..',
    '.kyykyyk.',
    '.kyk.kyk.',
    '.kk...kk.',
  ], { k: '#6a3a00', y: '#ffd83a', w: '#ffffff' });

  SPR.estrelaVazia = criarSprite([
    '....k....',
    '...kyk...',
    'kkkkyykkk',
    'kyyyyyyyk',
    '.kyyyyyk.',
    '..kyyyk..',
    '.kyykyyk.',
    '.kyk.kyk.',
    '.kk...kk.',
  ], { k: '#2a2440', y: '#4a4466' });

  SPR.pata = criarSprite([
    '.kk.kk.kk.',
    'kbbkbbkbbk',
    '.kk.kk.kk.',
    '...kkkk...',
    '..kbbbbk..',
    '.kbbbbbbk.',
    '.kbbbbbbk.',
    '..kkkkkk..',
  ], { k: '#1a1226', b: '#f0c080' });

  SPR.coracao = criarSprite([
    '.kk...kk.',
    'krrk.krrk',
    'krwrkrrrk',
    'krrrrrrrk',
    '.krrrrrk.',
    '..krrrk..',
    '...krk...',
    '....k....',
  ], { k: '#3a0a14', r: '#ff4a5a', w: '#ffffff' });
  SPR.coracaoVazio = criarSprite([
    '.kk...kk.',
    'krrk.krrk',
    'krrrkrrrk',
    'krrrrrrrk',
    '.krrrrrk.',
    '..krrrk..',
    '...krk...',
    '....k....',
  ], { k: '#3a0a14', r: '#5a4a5a' });

  SPR.estrelaGrande = criarSprite([
    '.......kk.......',
    '......kyyk......',
    '......kyyk......',
    '.....kyyyyk.....',
    'kkkkkkyyyyykkkkk',
    'kyyyyyyyyyyyyyyk',
    '.kyyywyyyyyyyyk.',
    '..kyywyyyyyyyk..',
    '...kyyyyyyyyk...',
    '...kyyyyyyyyk...',
    '..kyyyykkyyyyk..',
    '..kyyyk..kyyyk..',
    '.kyyk......kyyk.',
    '.kkk........kkk.',
  ], { k: '#6a3a00', y: '#ffd83a', w: '#ffffff' });
  SPR.estrelaApagada = criarSprite([
    '.......kk.......',
    '......kyyk......',
    '......kyyk......',
    '.....kyyyyk.....',
    'kkkkkkyyyyykkkkk',
    'kyyyyyyyyyyyyyyk',
    '.kyyyyyyyyyyyyk.',
    '..kyyyyyyyyyyk..',
    '...kyyyyyyyyk...',
    '...kyyyyyyyyk...',
    '..kyyyykkyyyyk..',
    '..kyyyk..kyyyk..',
    '.kyyk......kyyk.',
    '.kkk........kkk.',
  ], { k: '#2a2440', y: '#4a4466' });
}

// ------------------------------ cenários ------------------------------
const PALETAS = {
  savana:   { ceu: ['#6cc4ff', '#ffe0a6'] },
  floresta: { ceu: ['#12422a', '#86c97a'] },
  deserto:  { ceu: ['#4eaef0', '#fff0bf'] },
  gelo:     { ceu: ['#4f8fd8', '#e6f6ff'] },
  oceano:   { ceu: ['#58c8f0', '#082f66'] },
  mapa:     { ceu: ['#2f8fd8', '#57b8ee'] },
};

function faixasCeu(g, W, H, topo, base, n = 9) {
  const alt = H / n;
  const cores = [];
  for (let i = 0; i < n; i++) cores.push(misturar(topo, base, i / (n - 1)));
  cores.forEach((c, i) => { g.fillStyle = c; g.fillRect(0, Math.floor(i * alt), W, Math.ceil(alt) + 1); });
  // pontilhado entre as faixas (dithering estilo 16-bit)
  for (let i = 0; i < n - 1; i++) {
    const y0 = Math.floor((i + 1) * alt);
    g.fillStyle = cores[i + 1];
    for (let x = 0; x < W; x += 2) g.fillRect(x, y0 - 2, 1, 1);
    for (let x = 1; x < W; x += 2) g.fillRect(x, y0 - 1, 1, 1);
  }
}

// desenha algo repetido nas bordas para a camada emendar sem costura
function repetir(fn) { fn(0); fn(-LARG_CAMADA); fn(LARG_CAMADA); }

function circulo(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
function elipse(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); g.fill(); }
function poligono(g, pts) {
  g.beginPath(); g.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath(); g.fill();
}
// morros senoidais que emendam (freq = nº inteiro de ondas na camada)
function morros(g, H, cor, base, amp, freq, fase = 0, freq2 = 0, amp2 = 0) {
  g.fillStyle = cor;
  for (let x = 0; x < LARG_CAMADA; x++) {
    const a = (x / LARG_CAMADA) * Math.PI * 2;
    const y = Math.round(base - amp * (0.5 + 0.5 * Math.sin(a * freq + fase)) - amp2 * Math.sin(a * freq2));
    g.fillRect(x, y, 1, H - y);
  }
}

const DESENHO_CAMADAS = {
  savana: {
    longe(g, H, gy, rnd) {
      repetir(dx => {
        g.fillStyle = '#b98aa3';
        poligono(g, [dx + 60, gy - 8, dx + 150, gy - 78, dx + 175, gy - 80, dx + 270, gy - 8]);
        g.fillStyle = '#f6eef8';
        poligono(g, [dx + 128, gy - 58, dx + 150, gy - 78, dx + 175, gy - 80, dx + 196, gy - 58, dx + 180, gy - 64, dx + 162, gy - 56, dx + 146, gy - 63]);
        g.fillStyle = '#c99ab0';
        poligono(g, [dx + 400, gy - 8, dx + 470, gy - 50, dx + 540, gy - 8]);
      });
      morros(g, H, '#d9a466', gy - 4, 14, 3, 1);
    },
    meio(g, H, gy, rnd) {
      for (let i = 0; i < 5; i++) {
        const x = i * 128 + 20 + rnd() * 70, h = 34 + rnd() * 16, lw = 26 + rnd() * 14;
        repetir(dx => {
          const X = x + dx;
          g.fillStyle = '#5a3a1e';
          g.fillRect(X - 1, gy - h, 3, h);
          poligono(g, [X, gy - h + 10, X - lw * 0.5, gy - h - 1, X - lw * 0.5 + 3, gy - h - 1, X + 1, gy - h + 6]);
          poligono(g, [X + 1, gy - h + 8, X + lw * 0.45, gy - h - 1, X + lw * 0.45 - 3, gy - h - 1, X, gy - h + 4]);
          g.fillStyle = '#56771f';
          elipse(g, X, gy - h - 3, lw, 6);
          g.fillStyle = '#7a9c2e';
          elipse(g, X - 2, gy - h - 5, lw * 0.8, 3);
        });
      }
      g.fillStyle = '#c49a3a';
      for (let x = 0; x < LARG_CAMADA; x += 7 + Math.floor(rnd() * 8)) {
        const h = 4 + rnd() * 6;
        poligono(g, [x, gy, x + 2, gy - h, x + 4, gy]);
      }
    },
    chao(g, W, H) {
      g.fillStyle = '#d6a548'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#e9c46a'; g.fillRect(0, 0, W, 3);
      g.fillStyle = '#b4832e';
      for (let x = 0; x < W; x += 12) { g.fillRect(x, 3, 2, 3); g.fillRect(x + 6, 10 + (x % 5), 3, 1); g.fillRect(x + 3, 17, 1, 1); }
    },
  },
  floresta: {
    longe(g, H, gy, rnd) {
      g.fillStyle = '#2a6b39';
      for (let i = 0; i < 18; i++) {
        const x = i * 36 + rnd() * 20, r = 18 + rnd() * 16, y = gy - 40 - rnd() * 30;
        repetir(dx => circulo(g, x + dx, y, r));
      }
      g.fillRect(0, gy - 45, LARG_CAMADA, H);
      g.fillStyle = '#1d4a28';
      for (let i = 0; i < 12; i++) {
        const x = Math.floor(rnd() * LARG_CAMADA);
        repetir(dx => g.fillRect(x + dx, gy - 50, 4, 50));
      }
    },
    meio(g, H, gy, rnd) {
      for (let i = 0; i < 5; i++) {
        const x = i * 128 + 20 + rnd() * 70, w = 9 + rnd() * 5;
        repetir(dx => {
          const X = Math.round(x + dx);
          g.fillStyle = '#5b3a1e'; g.fillRect(X, 0, w, gy);
          g.fillStyle = '#4a2e16'; g.fillRect(X + w - 3, 0, 3, gy);
          g.fillStyle = '#6b4a2a'; poligono(g, [X - 6, gy, X, gy - 12, X + w, gy - 12, X + w + 6, gy]);
          g.fillStyle = '#2f7a33';
          for (let v = 0; v < 2; v++) {
            const vx = X + (v ? w + 12 : -12), vl = 30 + ((i * 17 + v * 11) % 40);
            g.fillRect(vx, 0, 1, vl);
            for (let y = 6; y < vl; y += 7) g.fillRect(vx - 2, y, 2, 2), g.fillRect(vx + 1, y + 3, 2, 2);
          }
        });
      }
      for (let i = 0; i < 12; i++) {
        const x = rnd() * LARG_CAMADA, r = 10 + rnd() * 14;
        repetir(dx => {
          g.fillStyle = '#2e8a3d'; circulo(g, x + dx, 4, r + 8);
          g.fillStyle = '#3fa24c'; circulo(g, x + dx, 0, r);
        });
      }
      for (let i = 0; i < 10; i++) {
        const x = rnd() * LARG_CAMADA;
        repetir(dx => {
          g.fillStyle = '#3f9e4a'; circulo(g, x + dx, gy - 2, 9);
          g.fillStyle = '#56b85a'; circulo(g, x + dx - 3, gy - 6, 5);
          g.fillStyle = i % 2 ? '#ff5a7a' : '#ffd23a'; g.fillRect(x + dx + 3, gy - 8, 2, 2);
        });
      }
    },
    chao(g, W, H) {
      g.fillStyle = '#5a3e22'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#6cae3a'; g.fillRect(0, 0, W, 5);
      g.fillStyle = '#4f8f2a';
      for (let x = 0; x < W; x += 4) g.fillRect(x, 5, 2, 2 + (x % 3));
      g.fillStyle = '#8fd04a';
      for (let x = 2; x < W; x += 8) g.fillRect(x, 0, 1, 2);
      g.fillStyle = '#44301a';
      for (let x = 0; x < W; x += 16) { g.fillRect(x + 3, 13, 3, 2); g.fillRect(x + 11, 20, 2, 1); }
    },
  },
  deserto: {
    longe(g, H, gy, rnd) {
      repetir(dx => {
        g.fillStyle = '#c9774a';
        poligono(g, [dx + 40, gy - 6, dx + 60, gy - 50, dx + 130, gy - 50, dx + 150, gy - 6]);
        poligono(g, [dx + 330, gy - 6, dx + 345, gy - 36, dx + 380, gy - 36, dx + 395, gy - 6]);
        g.fillStyle = '#a85f3a';
        poligono(g, [dx + 110, gy - 50, dx + 130, gy - 50, dx + 150, gy - 6, dx + 120, gy - 6]);
        poligono(g, [dx + 370, gy - 36, dx + 380, gy - 36, dx + 395, gy - 6, dx + 382, gy - 6]);
      });
      morros(g, H, '#e8b86a', gy - 2, 18, 2, 0.5, 5, 3);
    },
    meio(g, H, gy, rnd) {
      morros(g, H, '#f0c878', gy + 2, 8, 4, 2);
      for (let i = 0; i < 4; i++) {
        const x = i * 160 + 30 + rnd() * 90, h = 26 + rnd() * 14;
        repetir(dx => {
          const X = Math.round(x + dx), topo = gy - h;
          g.fillStyle = '#4c9a3d';
          g.fillRect(X, topo, 6, h); circulo(g, X + 3, topo, 3);
          g.fillRect(X - 7, topo + 10, 7, 4); g.fillRect(X - 7, topo + 2, 4, 10); circulo(g, X - 5, topo + 2, 2);
          g.fillRect(X + 6, topo + 14, 7, 4); g.fillRect(X + 9, topo + 6, 4, 10); circulo(g, X + 11, topo + 6, 2);
          g.fillStyle = '#357a2c'; g.fillRect(X + 4, topo, 2, h);
        });
      }
    },
    chao(g, W, H) {
      g.fillStyle = '#f2d08a'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#fbe2a6'; g.fillRect(0, 0, W, 2);
      g.fillStyle = '#dcb468';
      for (let y = 7; y < H; y += 7) for (let x = 0; x < W; x++) {
        if (Math.sin((x + y * 3) / 7) > 0.6) g.fillRect(x, y + Math.round(Math.sin(x / 9) * 1.5), 1, 1);
      }
    },
  },
  gelo: {
    longe(g, H, gy, rnd) {
      repetir(dx => {
        [[20, 120, 70], [150, 130, 55], [300, 150, 80], [470, 120, 60]].forEach(([x, w, h]) => {
          g.fillStyle = '#eaf6ff'; poligono(g, [dx + x, gy - 6, dx + x + w / 2, gy - 6 - h, dx + x + w, gy - 6]);
          g.fillStyle = '#b5d6ef'; poligono(g, [dx + x + w / 2, gy - 6 - h, dx + x + w, gy - 6, dx + x + w * 0.6, gy - 6]);
        });
      });
      morros(g, H, '#dcefff', gy, 8, 3, 0);
    },
    meio(g, H, gy, rnd) {
      morros(g, H, '#ffffff', gy + 2, 10, 3, 2);
      for (let i = 0; i < 5; i++) {
        const x = i * 128 + rnd() * 90;
        repetir(dx => {
          const X = Math.round(x + dx);
          g.fillStyle = '#2f5d50';
          for (let k = 0; k < 4; k++) poligono(g, [X - 10 + k * 2, gy - 4 - k * 8, X, gy - 18 - k * 8, X + 10 - k * 2, gy - 4 - k * 8]);
          g.fillStyle = '#ffffff';
          for (let k = 0; k < 4; k++) poligono(g, [X - 4 + k, gy - 13 - k * 8, X, gy - 18 - k * 8, X + 4 - k, gy - 13 - k * 8]);
          g.fillStyle = '#5a3a1e'; g.fillRect(X - 1, gy - 4, 3, 4);
        });
      }
      const ix = 250;
      repetir(dx => {
        g.fillStyle = '#ffffff'; elipse(g, ix + dx, gy, 18, 14);
        g.fillStyle = '#cfe6f7';
        for (let k = 0; k < 3; k++) g.fillRect(ix + dx - 16, gy - 11 + k * 5, 32, 1);
        g.fillStyle = '#6a8fb0'; elipse(g, ix + dx + 6, gy - 2, 5, 6);
      });
    },
    chao(g, W, H) {
      g.fillStyle = '#eef8ff'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, 3);
      g.fillStyle = '#a8d8f0';
      for (let x = 0; x < W; x += 40) g.fillRect(x + 8, 9, 18, 3), g.fillRect(x + 12, 12, 10, 1);
      g.fillStyle = '#cfe4f3';
      for (let x = 0; x < W; x += 10) g.fillRect(x + (x % 7), 17 + (x % 4), 2, 1);
    },
  },
  oceano: {
    longe(g, H, gy, rnd) {
      g.fillStyle = '#0e4478';
      repetir(dx => {
        elipse(g, dx + 90, gy, 70, 60); elipse(g, dx + 200, gy, 50, 34);
        elipse(g, dx + 380, gy, 80, 48); elipse(g, dx + 540, gy, 60, 70);
      });
      g.fillStyle = '#0b3864';
      repetir(dx => { elipse(g, dx + 120, gy + 4, 40, 30); elipse(g, dx + 560, gy + 4, 30, 40); });
    },
    meio(g, H, gy, rnd) {
      for (let i = 0; i < 9; i++) {
        const x = i * 70 + rnd() * 40, h = 40 + rnd() * 50;
        repetir(dx => {
          g.fillStyle = '#2c9a5c';
          for (let y = 0; y < h; y++) g.fillRect(Math.round(x + dx + Math.sin(y / 6 + i) * 3), gy - y, 3, 1);
          g.fillStyle = '#48c07a';
          for (let y = 6; y < h; y += 9) g.fillRect(Math.round(x + dx + Math.sin(y / 6 + i) * 3) + 3, gy - y, 3, 2);
        });
      }
      for (let i = 0; i < 6; i++) {
        const x = i * 106 + rnd() * 60, cor = ['#ff6f91', '#ffa94d', '#b36bff'][i % 3];
        repetir(dx => {
          const X = x + dx;
          g.fillStyle = cor;
          g.fillRect(X, gy - 14, 3, 14); g.fillRect(X - 6, gy - 10, 3, 8); g.fillRect(X - 6, gy - 5, 8, 3);
          g.fillRect(X + 6, gy - 18, 3, 12); g.fillRect(X + 2, gy - 9, 6, 3);
          g.fillStyle = clarear(cor, 0.4); g.fillRect(X, gy - 15, 3, 2); g.fillRect(X + 6, gy - 19, 3, 2); g.fillRect(X - 6, gy - 11, 3, 2);
        });
      }
      g.fillStyle = '#2d5f8a';
      for (let i = 0; i < 5; i++) { const x = rnd() * LARG_CAMADA; repetir(dx => elipse(g, x + dx, gy, 12, 7)); }
    },
    chao(g, W, H) {
      g.fillStyle = '#e5cc8c'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#f2dea8'; g.fillRect(0, 0, W, 2);
      g.fillStyle = '#c9ae6e';
      for (let y = 6; y < H; y += 6) for (let x = 0; x < W; x += 3) if (Math.sin(x / 11 + y) > 0.3) g.fillRect(x, y, 2, 1);
      g.fillStyle = '#fff0f5';
      for (let x = 20; x < W; x += 90) { g.fillRect(x, 8, 4, 2); g.fillRect(x + 1, 7, 2, 1); }
    },
  },
};

const _cacheCenario = new Map();
function obterCenario(id, H) {
  const chave = id + '|' + H;
  if (_cacheCenario.has(chave)) return _cacheCenario.get(chave);
  const d = DESENHO_CAMADAS[id];
  const gy = H - CHAO;
  const rnd = aleatorioSemente(id.length * 991 + 7);
  const longe = novoCanvas(LARG_CAMADA, H), meio = novoCanvas(LARG_CAMADA, H), chao = novoCanvas(LARG_CAMADA, CHAO);
  d.longe(ctx2d(longe), H, gy, rnd);
  d.meio(ctx2d(meio), H, gy, rnd);
  d.chao(ctx2d(chao), LARG_CAMADA, CHAO);
  [longe, meio, chao].forEach(c => nitidar(c));
  const cen = { id, H, gy, longe, meio, chao, ceus: new Map() };
  _cacheCenario.set(chave, cen);
  return cen;
}

function ceuDe(cen, W, H) {
  const chave = W + 'x' + H;
  if (cen.ceus.has(chave)) return cen.ceus.get(chave);
  const c = novoCanvas(W, H), g = ctx2d(c);
  const p = PALETAS[cen.id].ceu;
  faixasCeu(g, W, H, p[0], p[1]);
  if (cen.id === 'savana' || cen.id === 'deserto') {
    g.fillStyle = cen.id === 'savana' ? '#fff3b0' : '#ffffff';
    circulo(g, W * 0.78, H * 0.22, 16);
    g.fillStyle = cen.id === 'savana' ? '#ffe070' : '#fff7c0';
    circulo(g, W * 0.78, H * 0.22, 13);
  }
  if (cen.id === 'gelo') {
    g.globalAlpha = 0.35;
    ['#7af0c0', '#a0ffd8', '#c890ff'].forEach((cor, k) => {
      g.fillStyle = cor;
      for (let x = 0; x < W; x++) {
        const y = 14 + k * 7 + Math.sin(x / 23 + k) * 6 + Math.sin(x / 7) * 1.5;
        g.fillRect(x, Math.round(y), 1, 4);
      }
    });
    g.globalAlpha = 1;
  }
  if (cen.id === 'oceano') {
    g.globalAlpha = 0.12;
    g.fillStyle = '#ffffff';
    for (let k = 0; k < 5; k++) {
      const x = k * W / 4 + 20;
      poligono(g, [x, 0, x + 14, 0, x - 30, H, x - 60, H]);
    }
    g.globalAlpha = 1;
    g.fillStyle = '#9fe6ff'; g.fillRect(0, 0, W, 2);
  }
  if (cen.id === 'floresta') {
    g.globalAlpha = 0.14;
    g.fillStyle = '#fff8c0';
    for (let k = 0; k < 4; k++) { const x = k * W / 3 + 30; poligono(g, [x, 0, x + 20, 0, x + 60, H, x + 30, H]); }
    g.globalAlpha = 1;
  }
  cen.ceus.set(chave, c);
  return c;
}

function desenharCamada(g, c, W, desloc, y = 0) {
  let x = -(((desloc % LARG_CAMADA) + LARG_CAMADA) % LARG_CAMADA);
  x = Math.floor(x);
  while (x < W) { g.drawImage(c, x, y); x += LARG_CAMADA; }
}

function desenharCenario(g, id, W, H, desloc) {
  const cen = obterCenario(id, H);
  g.drawImage(ceuDe(cen, W, H), 0, 0);
  desenharCamada(g, cen.longe, W, desloc * 0.15);
  desenharCamada(g, cen.meio, W, desloc * 0.45);
  desenharCamada(g, cen.chao, W, desloc, H - CHAO);
}

// miniatura de um bioma (mapa e portais)
const _cacheMini = new Map();
function miniatura(id, w, h) {
  const chave = id + '|' + w + '|' + h;
  if (_cacheMini.has(chave)) return _cacheMini.get(chave);
  const HB = 120, WB = Math.round(HB * w / h);
  const big = novoCanvas(WB, HB), gb = ctx2d(big);
  const desl = { savana: 10, floresta: 40, deserto: 20, gelo: 200, oceano: 30 }[id] || 0;
  desenharCenario(gb, id, WB, HB, desl);
  const c = novoCanvas(w, h), g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(big, 0, 0, w, h);
  nitidar(c);
  _cacheMini.set(chave, c);
  return c;
}

// ------------------------------ interface ------------------------------
function texto(g, s, x, y, o = {}) {
  const tam = o.tam || 8;
  g.save();
  g.font = `${tam}px ${FONTE_PIXEL}`;
  g.textAlign = o.alinhar || 'center';
  g.textBaseline = 'top';
  const c = o.contorno === undefined ? '#1a1226' : o.contorno;
  if (c) {
    g.fillStyle = c;
    const e = o.grosso || 1;
    for (let dx = -e; dx <= e; dx++) for (let dy = -e; dy <= e + (o.sombra ? 1 : 0); dy++) {
      if (dx || dy) g.fillText(s, Math.round(x) + dx, Math.round(y) + dy);
    }
  }
  g.fillStyle = o.cor || '#ffffff';
  g.fillText(s, Math.round(x), Math.round(y));
  g.restore();
}

function caixa(g, x, y, w, h, cor, borda = '#1a1226') {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  g.fillStyle = borda;
  g.fillRect(x + 1, y, w - 2, h); g.fillRect(x, y + 1, w, h - 2);
  g.fillStyle = cor;
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = clarear(cor, 0.35);
  g.fillRect(x + 2, y + 1, w - 4, 2);
  g.fillStyle = escurecer(cor, 0.25);
  g.fillRect(x + 2, y + h - 3, w - 4, 2);
}

function botao(g, x, y, w, h, emoji, cor = '#3a7bd5', apertado = false) {
  const dy = apertado ? 1 : 0;
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(Math.round(x) + 2, Math.round(y) + 2, w, h);
  caixa(g, x, y + dy, w, h, cor);
  if (emoji) desenharEmoji(g, emoji, x + w / 2, y + h / 2 + dy, Math.round(h * 0.52));
}

function desenharBolha(g, x, y, r, t, parte = 'frente') {
  const ex = 1 + Math.sin(t * 0.15) * 0.04, ey = 1 - Math.sin(t * 0.15) * 0.04;
  g.save();
  g.translate(Math.round(x), Math.round(y));
  g.scale(ex, ey);
  if (parte === 'fundo') {
    g.fillStyle = 'rgba(200,240,255,0.3)';
    circulo(g, 0, 0, r);
  } else {
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineWidth = 1.5;
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffffff';
    g.fillRect(-Math.round(r * 0.55), -Math.round(r * 0.65), 4, 2);
    g.fillRect(-Math.round(r * 0.7), -Math.round(r * 0.45), 2, 3);
  }
  g.restore();
}

// fecha/abre a tela com um círculo (transição clássica)
function iris(g, W, H, frac, cx = W / 2, cy = H / 2) {
  const rmax = Math.hypot(W, H) * 0.6;
  const r = Math.max(0, rmax * frac);
  g.fillStyle = '#000000';
  g.beginPath();
  g.rect(0, 0, W, H);
  g.arc(cx, cy, r, 0, Math.PI * 2, true);
  g.fill('evenodd');
}
