'use strict';
// =====================================================================
//  JOGO: loop principal, toque, cenas e progresso
// =====================================================================

const J = {
  W: 320, H: 180, t: 0,
  cena: null, transicao: null, pausado: false,
  botoes: [], canvas: null, g: null,
  velocidadeDebug: 1,
};
const gy = () => J.H - CHAO; // linha do chão

// ------------------------------ utilidades ------------------------------
const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
const sortearDe = lista => lista[Math.floor(Math.random() * lista.length)];
function colideCirculoRet(cx, cy, r, x0, y0, x1, y1) {
  const nx = limitar(cx, x0, x1), ny = limitar(cy, y0, y1);
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r;
}
function nomeFalado(a) { return maiuscula(a.nome); }

// ------------------------------ progresso ------------------------------
const Save = {
  d: { album: {}, biomas: {}, erros: {}, musica: true, tutorial: false, chuva: { estrelas: 0 }, ultimoNo: 'savana' },
  carregar() {
    try {
      const s = JSON.parse(localStorage.getItem('safari-chico') || 'null');
      if (s && typeof s === 'object') Object.assign(this.d, s);
    } catch (e) { /* sem armazenamento: joga sem salvar */ }
  },
  salvar() {
    try { localStorage.setItem('safari-chico', JSON.stringify(this.d)); } catch (e) { /* ignora */ }
  },
  bioma(id) { return this.d.biomas[id] || (this.d.biomas[id] = { estrelas: 0, nivel: 1, vezes: 0 }); },
  chuvaLiberada() { return ORDEM_BIOMAS.filter(b => this.bioma(b).estrelas > 0).length >= 2; },
};

// Repetição espaçada: bichos em que ele errou aparecem mais vezes
function sortearAnimal(lista, evitar) {
  const pesos = lista.map(a => (a === evitar ? 0.15 : 1) * (1 + 3 * (Save.d.erros[a.id] || 0) + (Save.d.album[a.id] ? 0 : 0.6)));
  let r = Math.random() * pesos.reduce((s, p) => s + p, 0);
  for (let i = 0; i < lista.length; i++) { r -= pesos[i]; if (r <= 0) return lista[i]; }
  return lista[lista.length - 1];
}
function marcarErro(a) { Save.d.erros[a.id] = Math.min(5, (Save.d.erros[a.id] || 0) + 1); }
function marcarAcerto(a) { if (Save.d.erros[a.id]) Save.d.erros[a.id]--; }

// ------------------------------ botões ------------------------------
function botaoAtivo(g, x, y, w, h, emoji, cor, acao) {
  botao(g, x, y, w, h, emoji, cor);
  J.botoes.push({ x, y, w, h, acao });
}

// ------------------------------ partículas ------------------------------
function Particulas() {
  const lista = [];
  return {
    lista,
    add(p) { lista.push(Object.assign({ vx: 0, vy: 0, vida: 60, tam: 2, cor: '#fff', gravidade: 0 }, p)); },
    brilho(x, y, cor = '#ffe45a', n = 12) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = 0.8 + Math.random() * 1.8;
        this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 25 + Math.random() * 15, cor: i % 3 ? cor : '#ffffff', tam: 2 });
      }
    },
    atualizar() {
      for (let i = lista.length - 1; i >= 0; i--) {
        const p = lista[i];
        p.x += p.vx; p.y += p.vy; p.vy += p.gravidade;
        if (p.onda) p.x += Math.sin((p.vida + p.fase) / 12) * p.onda;
        if (--p.vida <= 0) lista.splice(i, 1);
      }
    },
    desenhar(g) {
      for (const p of lista) {
        g.fillStyle = p.cor;
        if (p.bolha) { g.strokeStyle = p.cor; g.lineWidth = 1; g.beginPath(); g.arc(Math.round(p.x), Math.round(p.y), p.tam, 0, 7); g.stroke(); }
        else g.fillRect(Math.round(p.x), Math.round(p.y), p.tam, p.tam);
      }
    },
  };
}

function particulasAmbiente(part, bioma, t) {
  const W = J.W, H = J.H;
  if (bioma === 'gelo' && Math.random() < 0.5)
    part.add({ x: Math.random() * (W + 60), y: -2, vx: -0.6, vy: 0.5 + Math.random() * 0.4, vida: 400, cor: '#ffffff', tam: Math.random() < 0.3 ? 2 : 1, onda: 0.3, fase: Math.random() * 50 });
  if (bioma === 'floresta' && Math.random() < 0.06)
    part.add({ x: Math.random() * W + 40, y: -2, vx: -0.7, vy: 0.4, vida: 400, cor: sortearDe(['#8fd04a', '#e0a030', '#56b85a']), tam: 2, onda: 0.5, fase: Math.random() * 50 });
  if (bioma === 'oceano' && Math.random() < 0.12)
    part.add({ x: Math.random() * W, y: H - CHAO, vx: -0.3, vy: -0.5 - Math.random() * 0.5, vida: 300, cor: 'rgba(220,245,255,0.7)', tam: 1 + Math.floor(Math.random() * 2), bolha: true, onda: 0.2, fase: Math.random() * 50 });
  if (bioma === 'deserto' && Math.random() < 0.15)
    part.add({ x: W + 2, y: H - CHAO - Math.random() * 30, vx: -2 - Math.random(), vy: 0, vida: 200, cor: '#f8e0a8', tam: 1 });
  if (bioma === 'savana' && Math.random() < 0.02)
    part.add({ x: W + 2, y: 30 + Math.random() * 60, vx: -0.6, vy: 0, vida: 600, cor: sortearDe(['#ffffff', '#ff9ad0', '#ffe070']), tam: 2, onda: 0.6, fase: Math.random() * 50 });
}

// =====================================================================
//  CENA: TÍTULO
// =====================================================================
function CenaTitulo() {
  let t = 0;
  const parada = [];
  return {
    musica: 'tema',
    atualizar() {
      t++;
      if (t % 80 === 1) parada.push({ a: sortearDe(ANIMAIS), x: J.W + 16, f: Math.random() * 10 });
      parada.forEach(p => { p.x -= 0.9; });
      while (parada.length && parada[0].x < -20) parada.shift();
    },
    desenhar(g) {
      const W = J.W, H = J.H;
      desenharCenario(g, 'savana', W, H, t * 0.8);
      // desfile de bichos
      for (const p of parada) {
        const pulo = Math.abs(Math.sin((t + p.f * 10) / 8)) * 4;
        desenharEmoji(g, p.a.e, p.x, gy() - 10 - pulo, 18);
      }
      // Tio Robi acenando e o Chico correndo
      desenharSprite(g, Math.floor(t / 20) % 2 ? SPR.robi.acenando : SPR.robi.parado, W * 0.14, gy() + 1, { escala: 2 });
      desenharSprite(g, SPR.correr[Math.floor(t / 6) % 2], W * 0.3, gy() + 1, { escala: 2 });
      // logo
      const oy = Math.sin(t / 20) * 2;
      texto(g, NOME_HEROI.toUpperCase() + ' AJUDA', W / 2, 14 + oy, { tam: 16, cor: '#ffd83a', grosso: 2, sombra: true });
      texto(g, 'OS ANIMAIS', W / 2, 40 + oy, { tam: 16, cor: '#ffffff', grosso: 2, sombra: true });
      desenharEmoji(g, '🦁', W / 2 - 128, 30 + oy, 20);
      desenharEmoji(g, '🐧', W / 2 + 128, 30 + oy, 20, { virar: true });
      // botão jogar piscando
      const pulso = 1 + Math.sin(t / 8) * 0.06;
      const bw = 56 * pulso, bh = 34 * pulso;
      botaoAtivo(g, W / 2 - bw / 2, H * 0.47, bw, bh, '▶️', '#3aa655', () => comecar());
    },
    // age ao soltar o dedo: no iPad só assim a voz é liberada
    soltar() { comecar(); },
  };
  function comecar() {
    if (!Save.d.viuTioRobi) { irPara(CenaTioRobi); return; }
    Voz.falar(`Oi, ${NOME_HEROI}! Escolha um lugar para explorar!`);
    irPara(CenaMapa);
  }
}

// =====================================================================
//  CENA: TIO ROBI EXPLICA O JOGO
// =====================================================================
function CenaTioRobi() {
  const PASSOS = [
    `Oi, ${NOME_HEROI}! Eu sou o Tio Robi!`,
    'Os animais se perderam, e você vai me ajudar a levar cada um para casa!',
    'Em cada ambiente, você tem que pegar os animais que moram lá.',
    'Se o bicho não mora ali, pule por cima! Para pular, é só tocar na tela.',
    'Vamos lá? Toque no botão verde!',
  ];
  let t = 0, passo = -1, tPasso = 0, falando = false, espera = 0, token = 0, lembrou = false;
  const perdidos = ['🦁', '🐧', '🐒', '🐬', '🐫'];

  function irPasso(n) {
    passo = n; tPasso = 0; falando = true; espera = 0;
    const meu = ++token;
    const texto = PASSOS[n];
    const teveVoz = Voz.falar(texto, { aoTerminar: () => { if (meu === token) terminouFala(); } });
    // reserva: se a voz não avisar que terminou, segue sozinho
    espera = (teveVoz ? texto.length * 6 + 90 : texto.length * 4 + 40);
  }
  function terminouFala() {
    if (!falando) return;
    falando = false;
    espera = 35; // respiro antes do próximo passo
  }
  function sair() {
    Save.d.viuTioRobi = true; Save.salvar();
    Voz.falar(`Escolha um lugar para explorar!`);
    irPara(CenaMapa);
  }

  return {
    musica: 'tema',
    atualizar() {
      t++; tPasso++;
      if (passo < 0) { if (t > 20) irPasso(0); return; }
      if (espera > 0 && --espera === 0) {
        if (falando) terminouFala();
        else if (passo < PASSOS.length - 1) irPasso(passo + 1);
      }
      if (passo === PASSOS.length - 1 && !falando && tPasso > 600 && !lembrou) {
        lembrou = true; Voz.falar('Toque no botão verde!');
      }
    },
    desenhar(g) {
      const W = J.W, H = J.H, G = gy();
      desenharCenario(g, 'savana', W, H, t * 0.3);
      // Tio Robi e Chico
      const boca = falando && Math.floor(t / 7) % 2 === 0;
      const acena = passo <= 0 || passo === PASSOS.length - 1;
      const spr = acena && Math.floor(t / 18) % 2
        ? (boca ? SPR.robi.acenandoFalando : SPR.robi.acenando)
        : (boca ? SPR.robi.falando : SPR.robi.parado);
      desenharSprite(g, spr, 42, G + 1, { escala: 2 });
      const pulinho = passo === 3 ? -Math.abs(Math.sin(t / 12)) * 14 : 0;
      desenharSprite(g, pulinho < -2 ? SPR.pular : SPR.parado, 86, G + 1 + pulinho, { escala: 2 });
      // balãozinho de fala
      if (falando) {
        g.fillStyle = '#ffffff';
        poligono(g, [58, G - 56, 70, G - 62, 62, G - 50]);
      }
      // quadro com a explicação em figuras
      const bx = 116, by = 26, bw = W - bx - 8, bh = G - by - 10;
      caixa(g, bx, by, bw, bh, '#fff8e0');
      const cx = bx + bw / 2, cy = by + bh / 2;
      if (passo <= 0) {
        desenharSprite(g, SPR.robi.rosto, cx, cy + 22, { escala: 4 });
        desenharEmoji(g, '👋', cx + 46, cy - 14 + Math.sin(t / 6) * 3, 24, { rot: Math.sin(t / 5) * 0.3 });
      } else if (passo === 1) {
        perdidos.forEach((e, i) => {
          const x = bx + 26 + i * (bw - 52) / 4, y = cy + Math.sin(t / 14 + i * 1.3) * 10;
          desenharEmoji(g, e, x, y, 22);
          desenharEmoji(g, '❓', x + 10, y - 16, 11);
        });
      } else if (passo === 2 || passo === 3) {
        const mw = bw - 12, mh = bh - 12;
        g.drawImage(miniatura('savana', mw, mh), bx + 6, by + 6);
        const chao = by + 6 + mh - 10;
        if (passo === 2) {
          [['🦁', 0.3], ['🦓', 0.7]].forEach(([e, fx], i) => {
            const x = bx + 6 + mw * fx, y = chao - 28 + Math.sin(t / 12 + i) * 3;
            desenharBolha(g, x, y, 17, t, 'fundo');
            desenharEmoji(g, e, x, y, 22);
            desenharBolha(g, x, y, 17, t, 'frente');
            desenharEmoji(g, '✅', x + 14, y - 16, 14);
          });
        } else {
          const x = bx + 6 + mw * 0.55, y = chao - 16;
          desenharBolha(g, x, y, 15, t, 'fundo');
          desenharEmoji(g, '🐧', x, y, 20);
          desenharBolha(g, x, y, 15, t, 'frente');
          desenharEmoji(g, '❌', x + 13, y - 16, 12);
          // Chico pequeno pulando por cima do pinguim
          const k = (t % 120) / 120;
          const hx = bx + 16 + k * (mw - 20), hy = chao + 6 - Math.max(0, Math.sin((k - 0.3) / 0.45 * Math.PI)) * 44 * (k > 0.3 && k < 0.75 ? 1 : 0);
          desenharSprite(g, hy < chao + 4 ? SPR.pular : SPR.correr[Math.floor(t / 6) % 2], hx, hy, {});
          desenharEmoji(g, '👆', bx + 22, by + 24 + (Math.floor(t / 15) % 2) * 4, 18);
        }
      } else {
        const pulso = 1 + Math.sin(t / 8) * 0.06;
        const w = 70 * pulso, h = 44 * pulso;
        botaoAtivo(g, cx - w / 2, cy - h / 2, w, h, '▶️', '#3aa655', sair);
      }
      // bolinhas de progresso da explicação
      for (let i = 0; i < PASSOS.length; i++) {
        g.fillStyle = i <= passo ? '#ffd83a' : 'rgba(0,0,0,0.35)';
        g.fillRect(bx + bw / 2 - PASSOS.length * 4 + i * 8, by + bh + 3, 5, 5);
      }
      // pular a explicação (para os adultos)
      botaoAtivo(g, W - 30, 3, 27, 20, '⏭️', '#6a6a8a', sair);
    },
  };
}

// =====================================================================
//  CENA: MAPA DA ILHA
// =====================================================================
const NOS_MAPA = {
  floresta: [0.2, 0.33], gelo: [0.8, 0.33], chuva: [0.5, 0.43],
  savana: [0.2, 0.75], deserto: [0.5, 0.8], oceano: [0.8, 0.75],
};
const CAMINHOS = [['savana', 'floresta'], ['floresta', 'chuva'], ['chuva', 'gelo'], ['gelo', 'oceano'], ['oceano', 'deserto'], ['deserto', 'savana'], ['chuva', 'deserto']];
const TW = 60, TH = 40;

function CenaMapa() {
  let t = 0;
  const pos = id => [NOS_MAPA[id][0] * J.W, NOS_MAPA[id][1] * J.H];
  const posHeroi = id => { const [x, y] = pos(id); return [x - TW / 2 - 7, y + TH / 2]; };
  let [hx, hy] = posHeroi(Save.d.ultimoNo in NOS_MAPA ? Save.d.ultimoNo : 'savana');
  let alvo = null, tremer = { id: null, t: 0 };

  function escolher(id) {
    if (alvo) return;
    if (id === 'chuva' && !Save.chuvaLiberada()) {
      Som.tocar('cadeado');
      tremer = { id, t: 20 };
      Voz.falar('Ainda está trancado! Complete duas aventuras para abrir.');
      return;
    }
    Som.tocar('porta');
    Voz.falar(id === 'chuva' ? 'Chuva de bichos!' : maiuscula(BIOMAS[id].frase.split(' ')[1]) + '!');
    const [x, y] = posHeroi(id);
    alvo = { id, x0: hx, y0: hy, x, y, t: 0 };
    Save.d.ultimoNo = id; Save.salvar();
  }

  return {
    musica: 'tema',
    atualizar() {
      t++;
      if (tremer.t > 0) tremer.t--;
      if (alvo) {
        alvo.t++;
        const k = Math.min(1, alvo.t / 40);
        hx = alvo.x0 + (alvo.x - alvo.x0) * k;
        hy = alvo.y0 + (alvo.y - alvo.y0) * k - Math.sin(k * Math.PI) * 10;
        if (alvo.t === 48) irPara(alvo.id === 'chuva' ? CenaChuva : () => CenaFase(alvo.id), hx, hy - 16);
      }
    },
    desenhar(g) {
      const W = J.W, H = J.H;
      // mar
      faixasCeu(g, W, H, '#2a7fd0', '#57b8ee', 5);
      g.fillStyle = '#9fdcff';
      for (let y = 6; y < H; y += 14) for (let x = ((y * 7) % 40) - 40; x < W; x += 40) {
        const ox = Math.round(x + ((t * 0.25 + y) % 40));
        g.fillRect(ox, y, 6, 1); g.fillRect(ox + 2, y - 1, 3, 1);
      }
      // ilha
      g.fillStyle = '#f0d890'; elipse(g, W / 2, H / 2 + 6, W * 0.47, H * 0.45);
      g.fillStyle = '#7cc45a'; elipse(g, W / 2, H / 2 + 4, W * 0.44, H * 0.40);
      g.fillStyle = '#68b04a';
      const rnd = aleatorioSemente(42);
      for (let i = 0; i < 40; i++) {
        const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.9;
        g.fillRect(Math.round(W / 2 + Math.cos(a) * r * W * 0.42), Math.round(H / 2 + 4 + Math.sin(a) * r * H * 0.36), 3, 2);
      }
      // caminhos pontilhados
      g.fillStyle = '#a07a3a';
      for (const [a, b] of CAMINHOS) {
        const [x0, y0] = pos(a), [x1, y1] = pos(b);
        const n = Math.hypot(x1 - x0, y1 - y0) / 6;
        for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + (x1 - x0) * i / n) - 1, Math.round(y0 + (y1 - y0) * i / n) - 1, 3, 3);
      }
      // nós
      for (const id of Object.keys(NOS_MAPA)) {
        let [x, y] = pos(id);
        if (tremer.id === id && tremer.t) x += Math.sin(tremer.t * 1.5) * 3;
        const x0 = Math.round(x - TW / 2), y0 = Math.round(y - TH / 2);
        const pulsa = alvo && alvo.id === id ? Math.sin(t / 3) : 0;
        g.fillStyle = '#1a1226'; g.fillRect(x0 - 3, y0 - 3, TW + 6, TH + 6);
        g.fillStyle = pulsa > 0 ? '#ffffff' : '#fff4c8'; g.fillRect(x0 - 2, y0 - 2, TW + 4, TH + 4);
        if (id === 'chuva') {
          const livre = Save.chuvaLiberada();
          g.fillStyle = livre ? '#4a3a8a' : '#4a4a5a'; g.fillRect(x0, y0, TW, TH);
          g.fillStyle = livre ? '#7a6ac8' : '#6a6a7a'; g.fillRect(x0, y0, TW, 14);
          if (livre) {
            desenharEmoji(g, '⛈️', x0 + 16, y0 + 12, 16);
            desenharEmoji(g, '🎈', x0 + 44, y0 + 16 + Math.sin(t / 10) * 2, 14);
            desenharEmoji(g, '🐧', x0 + 30, y0 + 28 + Math.sin(t / 12 + 1) * 2, 12);
          } else desenharEmoji(g, '🔒', x, y, 20);
        } else {
          g.drawImage(miniatura(id, TW, TH), x0, y0);
          const a = animaisDoBioma(id)[0];
          if (a) desenharEmoji(g, a.e, x0 + TW - 12, y0 + TH - 12, 14, { virar: false });
        }
        J.botoes.push({ x: x0 - 4, y: y0 - 4, w: TW + 8, h: TH + 16, acao: () => escolher(id) });
        // estrelas conquistadas
        const est = id === 'chuva' ? Save.d.chuva.estrelas : Save.bioma(id).estrelas;
        for (let k = 0; k < 3; k++) desenharSprite(g, k < est ? SPR.estrela : SPR.estrelaVazia, x - 12 + k * 12, y0 + TH + 12);
        // nível (bolinhas)
        if (id !== 'chuva') {
          const nv = Save.bioma(id).nivel;
          for (let k = 0; k < 3; k++) { g.fillStyle = k < nv ? '#ffffff' : 'rgba(0,0,0,0.3)'; g.fillRect(x0 + TW - 5, y0 + 3 + k * 5, 3, 3); }
        }
      }
      // herói
      const andando = alvo && alvo.t < 40;
      const spr = andando ? SPR.correr[Math.floor(t / 5) % 2] : SPR.parado;
      desenharSprite(g, spr, hx, hy, { escala: 1, virar: alvo ? alvo.x < alvo.x0 : false });
      // botões
      botaoAtivo(g, 4, 4, 28, 22, '🏠', '#8a5a32', () => irPara(CenaTitulo));
      botao(g, 36, 4, 28, 22, null, '#3a6ab0');
      desenharSprite(g, SPR.robi.rosto, 50, 22, {});
      J.botoes.push({ x: 36, y: 4, w: 28, h: 22, acao: () => irPara(CenaTioRobi) });
      botaoAtivo(g, W - 64, 4, 28, 22, '📖', '#c0504a', () => irPara(CenaAlbum));
      botaoAtivo(g, W - 32, 4, 28, 22, Som.musicaLigada ? '🎵' : '🔇', '#6a4ab0', () => {
        Som.setMusicaLigada(!Som.musicaLigada); Save.d.musica = Som.musicaLigada; Save.salvar();
      });
    },
  };
}

// =====================================================================
//  CENA: FASE (corrida pelo bioma)
// =====================================================================
function CenaFase(biomaId) {
  const B = BIOMAS[biomaId];
  const est = Save.bioma(biomaId);
  const nivel = est.nivel;
  const agua = biomaId === 'oceano';
  const sombras = nivel >= 3;
  const tutorial = !Save.d.tutorial;
  const velBase = [1.45, 1.75, 1.9][nivel - 1];

  // física
  const GRAV = agua ? 0.12 : 0.25, PULO = agua ? -3.0 : -5.6, PULO2 = -4.8;
  const ALTS = agua ? { baixo: -16, meio: -50, alto: -86 } : { baixo: -16, alto: -62 };

  // ---- roteiro da fase ----
  const locais = animaisDoBioma(biomaId);
  const outros = ANIMAIS.filter(a => a.bioma !== biomaId);
  const bolhas = [], obstaculos = [], moedas = [];
  let d = 330, ultimo = null;
  const n = [12, 14, 16][nivel - 1], pCerto = [0.62, 0.58, 0.55][nivel - 1];
  for (let i = 0; i < n; i++) {
    let certo, alt;
    if (tutorial && i < 3) { certo = i < 2; alt = ['baixo', 'alto', 'baixo'][i]; }
    else { certo = Math.random() < pCerto; alt = sortearDe(Object.keys(ALTS)); }
    const a = sortearAnimal(certo ? locais : outros, ultimo);
    ultimo = a;
    const b = { d, a, certo, alt, estado: 'voando', t: 0, fase: Math.random() * 6, tutorial: tutorial && i < 3 };
    b.precisaAcao = agua ? (certo ? alt !== 'baixo' : alt === 'baixo') : (certo ? alt === 'alto' : alt === 'baixo');
    bolhas.push(b);
    const gap = 175 + Math.random() * 50;
    const meio = d + gap / 2;
    if (!(tutorial && i < 3)) {
      const r = Math.random();
      if (r < 0.35 && !b.precisaAcao) obstaculos.push({ d: meio, estado: 'chao', x: 0, y: 0, vx: 0, vy: 0, rot: 0 });
      else if (r < 0.7) for (let k = 0; k < 5; k++) moedas.push({ d: meio - 24 + k * 12, y: -18 - Math.sin((k / 4) * Math.PI) * (agua ? 50 : 42) - (agua ? 12 : 0), pega: false });
    }
    d += gap;
  }
  const FIM = d + 60;
  const totalCertos = bolhas.filter(b => b.certo).length;

  // ---- estado ----
  let t = 0, dist = 0, estado = 'correndo';
  const heroi = { x: 72, y: gy(), vy: 0, pulos: 0, tonto: 0, tropeco: 0, piscar: 0, hist: [] };
  const seguidores = [];
  let salvos = [], erradas = 0, nMoedas = 0, desvios = 0, jaFalouDesvio = false;
  let aviso = null;        // quadro "esse bicho mora lá"
  let camLenta = null;     // tutorial
  const part = Particulas();
  const efeitos = [];      // bichos voando para casa

  const falaIntro = [
    `${maiuscula(B.frase)}! Pegue os bichos que moram ${B.frase}!`,
    `${maiuscula(B.frase)} de novo! Agora mais rápido! Pegue só quem mora ${B.frase}!`,
    `Sombras misteriosas ${B.frase}! Quem será que mora aqui?`,
  ][nivel - 1];
  setTimeout(() => Voz.falar(falaIntro), 450);

  function noChao() { return heroi.y >= gy() - 0.01; }
  function caixaHeroi() {
    return agua ? [heroi.x - 18, heroi.y - 20, heroi.x + 14, heroi.y - 2] : [heroi.x - 6, heroi.y - 30, heroi.x + 6, heroi.y - 2];
  }

  function pular() {
    if (estado !== 'correndo' || heroi.tonto > 0) return;
    if (camLenta) { camLenta.b.tutorialFeito = true; camLenta = null; }
    if (agua) {
      heroi.vy = PULO; Som.tocar('nado');
      for (let i = 0; i < 3; i++) part.add({ x: heroi.x - 20, y: heroi.y - 10, vx: -0.5 - Math.random(), vy: -0.3, vida: 40, cor: 'rgba(230,250,255,0.8)', tam: 1 + i % 2, bolha: true });
      return;
    }
    if (noChao()) { heroi.vy = PULO; heroi.pulos = 1; Som.tocar('pulo'); }
    else if (heroi.pulos < 2) { heroi.vy = PULO2; heroi.pulos = 2; Som.tocar('pulo'); part.brilho(heroi.x, heroi.y, '#ffffff', 6); }
  }

  function terminar() {
    const taxa = salvos.length / Math.max(1, totalCertos);
    const estrelas = taxa >= 0.8 && erradas <= 1 ? 3 : (taxa >= 0.5 && erradas <= 3 ? 2 : 1);
    const antesLivre = Save.chuvaLiberada();
    est.vezes++;
    est.estrelas = Math.max(est.estrelas, estrelas);
    let subiu = 0;
    if (estrelas >= 2 && est.nivel < 3) { est.nivel++; subiu = est.nivel; }
    Save.d.tutorial = true;
    Save.d.ultimoNo = biomaId;
    Save.salvar();
    const falas = [salvos.length === 1 ? 'Muito bem! Você salvou um bicho!' : `Muito bem! Você salvou ${salvos.length} bichos!`];
    if (subiu === 2) falas.push('Você subiu de nível! Da próxima vez vai ser mais rápido!');
    if (subiu === 3) falas.push('Nível três! Agora vêm as sombras misteriosas!');
    if (!antesLivre && Save.chuvaLiberada()) falas.push('A chuva de bichos foi liberada no mapa!');
    irPara(() => CenaResultado({
      fundo: (g, tt) => desenharCenario(g, biomaId, J.W, J.H, tt * 0.5),
      mini: biomaId, estrelas, salvos, falas, repetir: () => CenaFase(biomaId),
    }));
  }

  return {
    musica: biomaId,
    pausavel: true,
    atualizar() {
      t++;
      const G = gy();
      particulasAmbiente(part, biomaId, t);
      part.atualizar();

      // velocidade
      let vel = velBase;
      if (heroi.tropeco > 0) { heroi.tropeco--; vel *= 0.45; }
      // tutorial: desacelera e congela logo antes do bicho até a criança tocar
      if (camLenta) vel = camLenta.b.d - dist > 32 ? vel * 0.25 : 0;
      if (estado === 'saindo') vel = 0;
      dist += vel;

      // herói
      if (heroi.tonto > 0) heroi.tonto--;
      if (heroi.piscar > 0) heroi.piscar--;
      const grav = camLenta ? GRAV * 0.12 : GRAV;
      heroi.vy += grav;
      if (agua) heroi.vy = Math.min(heroi.vy, 1.6);
      heroi.y += camLenta ? heroi.vy * 0.12 : heroi.vy;
      if (heroi.y >= G) { heroi.y = G; heroi.vy = 0; heroi.pulos = 0; }
      if (agua && heroi.y < 44) { heroi.y = 44; heroi.vy = Math.max(0, heroi.vy); }
      heroi.hist.push(heroi.y);
      if (heroi.hist.length > 90) heroi.hist.shift();
      if (agua && t % 6 === 0) part.add({ x: heroi.x - 22, y: heroi.y - 9, vx: -1, vy: -0.2, vida: 40, cor: 'rgba(230,250,255,0.7)', tam: 1, bolha: true });

      const [hx0, hy0, hx1, hy1] = caixaHeroi();

      // bolhas com bichos
      for (const b of bolhas) {
        const sx = heroi.x + (b.d - dist);
        b.t++;
        if (b.estado !== 'voando') continue;
        if (sx > J.W + 40) break;
        const by = G + ALTS[b.alt] + Math.sin(b.t / 14 + b.fase) * 2;
        // tutorial: câmera lenta e mãozinha
        if (b.tutorial && b.precisaAcao && !b.tutorialFeito && !camLenta && sx - heroi.x < 62 && sx - heroi.x > 20 && (agua || noChao())) {
          camLenta = { b };
          Voz.falar(b.certo ? 'Esse mora aqui! Toque na tela para pular e pegar!' : 'Esse não mora aqui! Toque na tela para pular por cima!');
        }
        const r = b.certo ? 16 : 7; // generoso para pegar, tolerante para desviar
        if (colideCirculoRet(sx, by, r, hx0, hy0, hx1, hy1)) {
          if (b.certo) {
            b.estado = 'pego';
            salvos.push(b.a); seguidores.unshift(b.a);
            Save.d.album[b.a.id] = true;
            marcarAcerto(b.a);
            Som.tocar('pop'); Som.tocar('certo');
            part.brilho(sx, by);
            Voz.falar(nomeFalado(b.a) + '!');
          } else {
            b.estado = 'errado';
            erradas++;
            marcarErro(b.a);
            Som.tocar('pop'); Som.tocar('errado');
            heroi.tonto = 50;
            part.brilho(sx, by, '#ff8a8a', 8);
            aviso = { a: b.a, t: 0 };
            efeitos.push({ a: b.a, x: sx, y: by, vx: 0.6, vy: -1.4, t: 0 });
            Voz.falar('Ops! ' + fraseMora(b.a));
          }
          continue;
        }
        if (sx < heroi.x - 26) {
          if (b.certo) { b.estado = 'passou'; efeitos.push({ a: b.a, x: sx, y: by, vx: -0.5, vy: -0.4, t: 0, sombra: sombras }); }
          else {
            b.estado = 'desviou'; desvios++;
            marcarAcerto(b.a);
            Som.tocar('desvio');
            efeitos.push({ a: b.a, x: sx, y: by, vx: 0.3, vy: -1.2, t: 0, sombra: sombras, tchau: true });
            if (!jaFalouDesvio && (tutorial || desvios === 1)) {
              jaFalouDesvio = true;
              Voz.falar('Isso! Esse não mora aqui!', { interromper: false });
            }
          }
        }
      }

      // obstáculos
      for (const o of obstaculos) {
        const sx = heroi.x + (o.d - dist);
        if (o.estado === 'voou') { o.x += o.vx; o.y += o.vy; o.vy += 0.3; o.rot += 0.2; continue; }
        if (sx > J.W + 40 || sx < -40) continue;
        const spr = SPR.obst[biomaId];
        const w = spr.width * 2 * 0.7, h = spr.height * 2 * 0.8;
        if (heroi.piscar === 0 && hx1 > sx - w / 2 && hx0 < sx + w / 2 && hy1 > G - h) {
          o.estado = 'voou'; o.x = sx; o.y = G; o.vx = 2.5; o.vy = -4;
          heroi.tropeco = 40; heroi.piscar = 80;
          nMoedas = Math.max(0, nMoedas - 3);
          Som.tocar('batida');
          part.brilho(sx, G - 10, '#ffffff', 8);
        }
      }

      // estrelinhas
      for (const m of moedas) {
        if (m.pega) continue;
        const sx = heroi.x + (m.d - dist), sy = G + m.y;
        if (sx > J.W + 20 || sx < -20) continue;
        if (colideCirculoRet(sx, sy, 7, hx0, hy0, hx1, hy1)) {
          m.pega = true; nMoedas++; Som.tocar('moeda'); part.brilho(sx, sy, '#ffe45a', 5);
        }
      }

      for (let i = efeitos.length - 1; i >= 0; i--) {
        const e = efeitos[i]; e.t++; e.x += e.vx; e.y += e.vy;
        if (e.t > 120) efeitos.splice(i, 1);
      }
      if (aviso && ++aviso.t > 170) aviso = null;

      // fim da trilha
      if (estado === 'correndo' && dist >= FIM) {
        estado = 'saindo';
        Som.tocar('vitoria');
      }
      if (estado === 'saindo') {
        heroi.x += 2.2;
        if (heroi.x > J.W + 60 && !this.saiu) { this.saiu = true; terminar(); }
      }
    },

    desenhar(g) {
      const W = J.W, H = J.H, G = gy();
      desenharCenario(g, biomaId, W, H, dist);
      // bandeira de chegada
      const fx = heroi.x + (FIM - dist) + 30;
      if (fx < W + 20) {
        g.fillStyle = '#4a3a2a'; g.fillRect(fx, G - 50, 2, 50);
        desenharEmoji(g, '🏁', fx + 10, G - 44, 18);
      }
      // estrelinhas
      for (const m of moedas) {
        if (m.pega) continue;
        const sx = heroi.x + (m.d - dist);
        if (sx < -10 || sx > W + 10) continue;
        desenharSprite(g, SPR.estrela, sx, G + m.y + 4, { ey: 1, escala: 1 });
      }
      // obstáculos
      for (const o of obstaculos) {
        const spr = SPR.obst[biomaId];
        if (o.estado === 'voou') { if (o.y < H + 30) desenharSprite(g, spr, o.x, o.y, { escala: 2, rot: o.rot }); continue; }
        const sx = heroi.x + (o.d - dist);
        if (sx < -30 || sx > W + 30) continue;
        desenharSprite(g, spr, sx, G + 1, { escala: 2 });
      }
      // bolhas
      for (const b of bolhas) {
        if (b.estado !== 'voando') continue;
        const sx = heroi.x + (b.d - dist);
        if (sx > W + 30) break;
        if (sx < -30) continue;
        const by = G + ALTS[b.alt] + Math.sin(b.t / 14 + b.fase) * 2;
        desenharBolha(g, sx, by, 15, b.t, 'fundo');
        desenharEmoji(g, b.a.e, sx, by, 20, { modo: sombras ? 'sombra' : 'cor' });
        desenharBolha(g, sx, by, 15, b.t, 'frente');
      }
      // bichos voando para casa / passando
      for (const e of efeitos) {
        const alfa = Math.max(0, 1 - e.t / 120);
        desenharEmoji(g, e.a.e, e.x, e.y, 16, { alfa, modo: e.sombra ? 'sombra' : 'cor', rot: Math.sin(e.t / 6) * 0.2 });
        if (e.tchau && e.t < 60) desenharEmoji(g, '👋', e.x + 10, e.y - 10, 10, { alfa });
      }
      // seguidores (trenzinho de bichos salvos)
      const hist = heroi.hist;
      seguidores.slice(0, 4).forEach((a, i) => {
        const hy = hist[Math.max(0, hist.length - 1 - (i + 1) * 7)] || G;
        const x = heroi.x - (agua ? 30 : 18) - i * 16;
        const saltinho = agua ? Math.sin((t + i * 9) / 10) * 2 : -Math.abs(Math.sin((t + i * 7) / 7)) * 3;
        desenharEmoji(g, a.e, x, hy - 9 + saltinho, 15, { virar: true });
      });
      if (seguidores.length > 4) texto(g, '+' + (seguidores.length - 4), heroi.x - 18 - 4 * 16 - 4, G - 24, { tam: 8 });

      // herói
      const visivel = heroi.piscar === 0 || Math.floor(heroi.piscar / 4) % 2 === 0;
      if (visivel) {
        if (agua) {
          const bob = Math.sin(t / 10) * 1.5;
          desenharSprite(g, SPR.sub[Math.floor(t / 5) % 2], heroi.x, heroi.y + bob, { escala: 2 });
        } else {
          let spr = !noChao() ? SPR.pular : SPR.correr[Math.floor(t / 6) % 2];
          if (heroi.tonto > 0) spr = SPR.tonto;
          desenharSprite(g, spr, heroi.x, heroi.y + 1, { escala: 2 });
        }
      }
      if (heroi.tonto > 0) {
        for (let k = 0; k < 3; k++) {
          const a = t / 6 + k * 2.1;
          desenharSprite(g, SPR.estrela, heroi.x + Math.cos(a) * 12, heroi.y - (agua ? 22 : 34) + Math.sin(a) * 3, {});
        }
      }
      part.desenhar(g);

      // mãozinha do tutorial
      if (camLenta) {
        const k = Math.floor(t / 12) % 2;
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, W, H);
        desenharEmoji(g, '👆', W / 2, H / 2 + 10 + k * 5, 30);
        texto(g, '!', W / 2 + 22, H / 2 - 12 + k * 2, { tam: 16, cor: '#ffd83a' });
      }

      // quadro: "esse bicho mora lá"
      if (aviso) {
        const k = Math.min(1, aviso.t / 10);
        const bw = 120, bh = 46, bx = W / 2 - bw / 2, by = 24 - (1 - k) * 60;
        caixa(g, bx, by, bw, bh, '#fff8e0');
        desenharEmoji(g, aviso.a.e, bx + 22, by + bh / 2, 22);
        g.fillStyle = '#c0504a';
        const ax = bx + 44, ay = by + bh / 2;
        g.fillRect(ax, ay - 2, 12, 5); poligono(g, [ax + 12, ay - 6, ax + 20, ay + 0.5, ax + 12, ay + 7]);
        g.drawImage(miniatura(aviso.a.bioma, 44, 32), bx + bw - 50, by + 7);
      }

      // HUD
      g.fillStyle = 'rgba(20,16,40,0.55)'; g.fillRect(3, 3, 50, 30);
      desenharSprite(g, SPR.pata, 12, 15);
      texto(g, String(salvos.length), 22, 7, { tam: 8, alinhar: 'left' });
      desenharSprite(g, SPR.estrela, 12, 30);
      texto(g, String(nMoedas), 22, 22, { tam: 8, alinhar: 'left', cor: '#ffe45a' });
      // barra de progresso
      const px0 = 64, px1 = W - 44, prog = limitar(dist / FIM, 0, 1);
      g.fillStyle = '#1a1226'; g.fillRect(px0 - 1, 7, px1 - px0 + 2, 8);
      g.fillStyle = '#4a4466'; g.fillRect(px0, 8, px1 - px0, 6);
      g.fillStyle = '#3aa655'; g.fillRect(px0, 8, Math.round((px1 - px0) * prog), 6);
      g.fillStyle = '#7ad07a'; g.fillRect(px0, 8, Math.round((px1 - px0) * prog), 2);
      desenharEmoji(g, '🏁', px1 + 4, 10, 14);
      desenharSprite(g, SPR.parado, px0 + (px1 - px0) * prog, 19, {});
      botaoAtivo(g, W - 30, 3, 27, 20, '⏸️', '#4a4a7a', () => pausar());

      // abertura da fase
      if (t < 120) {
        const k = t < 15 ? t / 15 : (t > 100 ? (120 - t) / 20 : 1);
        const bw = 120, bh = 70, bx = W / 2 - bw / 2, by = H / 2 - bh / 2 - 10;
        g.globalAlpha = k;
        caixa(g, bx, by, bw, bh, '#2a3a6a');
        g.drawImage(miniatura(biomaId, 76, 44), bx + 22, by + 6);
        for (let q = 0; q < 3; q++) desenharSprite(g, q < nivel ? SPR.estrela : SPR.estrelaVazia, W / 2 - 12 + q * 12, by + bh - 6);
        if (sombras) desenharEmoji(g, '❓', bx + bw - 12, by + 12, 14);
        g.globalAlpha = 1;
      }
    },
    toque() { pular(); },
    depurar: () => ({ heroi, bolhas, dist, camLenta }),
  };
}

// =====================================================================
//  CENA: CHUVA DE BICHOS (chefão)
// =====================================================================
function CenaChuva() {
  let t = 0, coracoes = 5, acertos = 0, espera = 60, flash = 0, fim = false;
  const META = 12;
  const ativos = [];
  const part = Particulas();
  let arrastado = null, dedo = null;
  let ultimo = null;
  const nuvens = Array.from({ length: 6 }, (_, i) => ({ x: i * 70, y: 6 + (i % 3) * 8, r: 12 + (i % 3) * 4 }));
  setTimeout(() => Voz.falar('Chuva de bichos! Arraste cada bicho para a casa certa!'), 450);

  function geo() {
    const gap = 4, pw = Math.floor((J.W - 8 - gap * 4) / 5), ph = 56;
    return { gap, pw, ph, x0: 4, y0: J.H - ph - 3 };
  }
  function portalEm(x) {
    const { gap, pw, x0 } = geo();
    return ORDEM_BIOMAS[limitar(Math.floor((x - x0 + gap / 2) / (pw + gap)), 0, 4)];
  }
  function novoBicho() {
    const a = sortearAnimal(ANIMAIS, ultimo); ultimo = a;
    ativos.push({ a, x: 30 + Math.random() * (J.W - 60), y: 28, estado: 'caindo', t: 0, tentativas: 0, cor: sortearDe(['#ff5a6a', '#ffd23a', '#5ad0ff', '#8aff6a', '#d07aff']), dica: false });
  }
  function velocidade() { return Math.min(0.5, 0.2 + acertos * 0.025); }

  function avaliar(b) {
    const casa = portalEm(b.x);
    if (casa === b.a.bioma) {
      b.estado = 'entrando'; b.t = 0;
      acertos++;
      if (b.tentativas === 0) marcarAcerto(b.a);
      Save.d.album[b.a.id] = true;
      Som.tocar('certo');
      part.brilho(b.x, geo().y0, '#ffe45a', 16);
      Voz.falar(`${nomeFalado(b.a)}! ${maiuscula(BIOMAS[b.a.bioma].frase)}!`);
    } else {
      b.tentativas++;
      if (b.tentativas === 1) marcarErro(b.a);
      coracoes--;
      Som.tocar('errado');
      b.estado = 'voltando'; b.t = 0; b.yIni = b.y;
      if (b.tentativas >= 2) b.dica = true;
      Voz.falar(b.tentativas === 1 ? 'Hmm... não é aí! Tenta de novo!' : 'Ops! ' + fraseMora(b.a));
    }
  }

  function acabar(venceu) {
    if (fim) return;
    fim = true;
    const estrelas = !venceu ? 1 : coracoes >= 4 ? 3 : coracoes >= 2 ? 2 : 1;
    Save.d.chuva.estrelas = Math.max(Save.d.chuva.estrelas || 0, estrelas);
    Save.salvar();
    Som.tocar('vitoria');
    const falas = venceu ? [`Incrível! Você levou ${acertos} bichos para casa!`] : [`Boa! Você levou ${acertos} bichos para casa! Vamos de novo?`];
    setTimeout(() => irPara(() => CenaResultado({ fundo: fundoChuva, icone: '⛈️', estrelas, salvos: salvosLista, falas, repetir: CenaChuva })), 800);
  }
  const salvosLista = [];

  function fundoChuva(g, tt) {
    const W = J.W, H = J.H;
    faixasCeu(g, W, H, '#2a1f55', '#8a7ac8', 7);
    for (const n of nuvens) {
      const x = ((n.x - tt * 0.2) % (W + 80) + W + 80) % (W + 80) - 40;
      g.fillStyle = '#5a4a8a'; circulo(g, x, n.y + 4, n.r + 4); circulo(g, x + n.r, n.y + 6, n.r);
      g.fillStyle = '#7a6aaa'; circulo(g, x, n.y, n.r); circulo(g, x - n.r, n.y + 4, n.r * 0.7);
    }
    g.fillStyle = 'rgba(200,220,255,0.45)';
    for (let i = 0; i < 30; i++) {
      const x = (i * 47 + tt * 1.5) % W, y = (i * 83 + tt * 5) % H;
      g.fillRect(Math.round(x), Math.round(y), 1, 4);
    }
  }

  return {
    musica: 'chuva',
    pausavel: true,
    atualizar() {
      t++;
      part.atualizar();
      if (flash > 0) flash--;
      if (Math.random() < 0.004) flash = 6;
      if (fim) return;
      const limite = acertos >= 4 ? 2 : 1;
      if (--espera <= 0 && ativos.filter(b => b.estado !== 'entrando').length < limite && acertos + ativos.length < META + 1) {
        novoBicho(); espera = 90;
      }
      const { y0 } = geo();
      for (let i = ativos.length - 1; i >= 0; i--) {
        const b = ativos[i];
        b.t++;
        if (b.estado === 'entrando') {
          if (b.t > 24) { ativos.splice(i, 1); salvosLista.push(b.a); if (acertos >= META) acabar(true); }
          continue;
        }
        if (b.estado === 'voltando') {
          b.y = b.yIni + (40 - b.yIni) * Math.min(1, b.t / 30);
          if (b.t >= 30) b.estado = 'caindo';
          continue;
        }
        if (b === arrastado) continue;
        b.y += velocidade();
        b.x += Math.sin(b.t / 40) * 0.2;
        b.x = limitar(b.x, 14, J.W - 14);
        if (b.y + 10 >= y0) avaliar(b);
      }
      if (coracoes <= 0) acabar(false);
    },
    desenhar(g) {
      const W = J.W, H = J.H;
      fundoChuva(g, t);
      if (flash) { g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(0, 0, W, H); }
      // portais
      const { gap, pw, ph, x0, y0 } = geo();
      const sobre = arrastado ? portalEm(arrastado.x) : null;
      ORDEM_BIOMAS.forEach((id, i) => {
        const x = x0 + i * (pw + gap);
        const dica = ativos.some(b => b.dica && b.a.bioma === id) && Math.floor(t / 8) % 2 === 0;
        caixa(g, x, y0, pw, ph, dica || sobre === id ? '#ffe45a' : '#7a6a8a');
        g.drawImage(miniatura(id, pw - 6, ph - 6), x + 3, y0 + 3);
      });
      // bichos caindo com balão
      for (const b of ativos) {
        if (b.estado === 'entrando') {
          const k = 1 - b.t / 24;
          desenharEmoji(g, b.a.e, b.x, b.y + b.t, 22, { ex: k, ey: k });
          continue;
        }
        const balanco = Math.sin(b.t / 15) * 2;
        g.strokeStyle = '#ffffff'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(b.x, b.y - 10); g.lineTo(b.x + balanco, b.y - 20); g.stroke();
        g.fillStyle = b.cor; elipse(g, b.x + balanco, b.y - 27, 7, 8);
        g.fillStyle = clarear(b.cor, 0.5); g.fillRect(Math.round(b.x + balanco) - 4, Math.round(b.y) - 32, 2, 3);
        desenharEmoji(g, b.a.e, b.x, b.y, b === arrastado ? 26 : 22);
      }
      part.desenhar(g);
      // HUD: corações e progresso
      for (let k = 0; k < 5; k++) desenharSprite(g, k < coracoes ? SPR.coracao : SPR.coracaoVazio, 10 + k * 11, 14, {});
      g.fillStyle = 'rgba(20,16,40,0.6)'; g.fillRect(W / 2 - 30, 3, 60, 14);
      desenharEmoji(g, '🏠', W / 2 - 20, 10, 10);
      texto(g, `${acertos}/${META}`, W / 2 + 6, 6, { tam: 8 });
      botaoAtivo(g, W - 30, 3, 27, 20, '⏸️', '#4a4a7a', () => pausar());
      if (t < 150 && !arrastado) {
        const k = Math.floor(t / 15) % 2;
        desenharEmoji(g, '👆', W / 2 + 30, 70 + k * 18, 22);
      }
    },
    toque(x, y, id) {
      if (fim) return;
      let melhor = null, dm = 26;
      for (const b of ativos) {
        if (b.estado !== 'caindo') continue;
        const dd = Math.hypot(b.x - x, b.y - 8 - y);
        if (dd < dm) { dm = dd; melhor = b; }
      }
      if (melhor) { arrastado = melhor; dedo = id; Som.tocar('pop'); }
    },
    arrastar(x, y, id) {
      if (!arrastado || id !== dedo) return;
      const { y0 } = geo();
      arrastado.x = limitar(x, 12, J.W - 12);
      arrastado.y = limitar(y, 30, y0 + 2);
    },
    soltar(x, y, id) {
      if (id !== dedo) return;
      arrastado = null; dedo = null;
    },
    depurar: () => ({ ativos, acertos, coracoes, geo: geo() }),
  };
}

// =====================================================================
//  CENA: RESULTADO
// =====================================================================
function CenaResultado(p) {
  let t = 0;
  const parada = p.salvos.slice(0, 12);
  return {
    musica: null,
    atualizar() {
      t++;
      if (t === 20) p.falas.forEach((f, i) => Voz.falar(f, { interromper: i === 0 }));
      [30, 55, 80].forEach((q, k) => { if (t === q && k < p.estrelas) Som.tocar('estrela', k); });
      if (t === 200) Som.musica('tema');
    },
    desenhar(g) {
      const W = J.W, H = J.H;
      p.fundo(g, t);
      g.fillStyle = 'rgba(10,8,30,0.35)'; g.fillRect(0, 0, W, H);
      const bw = 180, bh = 78, bx = W / 2 - bw / 2, by = 12;
      caixa(g, bx, by, bw, bh, '#2a3a6a');
      if (p.mini) g.drawImage(miniatura(p.mini, 36, 20), W / 2 - 18, by + 5);
      else desenharEmoji(g, p.icone, W / 2, by + 14, 18);
      for (let k = 0; k < 3; k++) {
        const q = [30, 55, 80][k];
        const ganhou = k < p.estrelas && t >= q;
        const s = ganhou ? Math.min(1.3, (t - q) / 8) : 1;
        const esc = ganhou && t - q > 8 ? 2 : Math.max(0.5, s * 2);
        desenharSprite(g, ganhou ? SPR.estrelaGrande : SPR.estrelaApagada, W / 2 + (k - 1) * 42, by + 64 - (k === 1 ? 6 : 0), { escala: Math.round(esc * 2) / 2 });
      }
      desenharSprite(g, SPR.pata, bx + 14, by + bh - 7);
      texto(g, String(p.salvos.length), bx + 26, by + bh - 16, { tam: 8, alinhar: 'left' });
      // desfile dos bichos salvos
      parada.forEach((a, i) => {
        const x = ((i * 26 + t * 0.7) % (W + 40)) - 20;
        const pulo = Math.abs(Math.sin((t + i * 11) / 7)) * 5;
        desenharEmoji(g, a.e, x, gy() - 10 - pulo, 18, { virar: true });
      });
      if (t > 60) {
        botaoAtivo(g, W / 2 - 52, by + bh + 10, 44, 30, '🗺️', '#3a7bd5', () => irPara(CenaMapa));
        botaoAtivo(g, W / 2 + 8, by + bh + 10, 44, 30, '🔁', '#3aa655', () => irPara(p.repetir));
      }
    },
  };
}

// =====================================================================
//  CENA: ÁLBUM DE FIGURINHAS
// =====================================================================
function CenaAlbum() {
  let t = 0, pulando = null;
  return {
    musica: 'tema',
    atualizar() { t++; if (pulando && ++pulando.t > 20) pulando = null; },
    desenhar(g) {
      const W = J.W, H = J.H;
      faixasCeu(g, W, H, '#5a3a2a', '#8a5a3a', 4);
      const total = ANIMAIS.length, tem = ANIMAIS.filter(a => Save.d.album[a.id]).length;
      desenharEmoji(g, '📖', W / 2 - 34, 14, 14);
      texto(g, `${tem}/${total}`, W / 2 - 22, 10, { tam: 8, alinhar: 'left' });
      const topo = 28, rh = Math.floor((H - topo - 3) / 5);
      ORDEM_BIOMAS.forEach((id, i) => {
        const y = topo + i * rh;
        g.drawImage(miniatura(id, W - 8, rh - 2), 4, y);
        g.fillStyle = '#1a1226'; g.fillRect(4, y, W - 8, 1); g.fillRect(4, y + rh - 3, W - 8, 1);
        animaisDoBioma(id).forEach((a, k) => {
          const cx = 26 + k * 40, cw = 34, ch = rh - 6;
          const achou = !!Save.d.album[a.id];
          caixa(g, cx - cw / 2, y + 1, cw, ch, achou ? '#fff4c8' : '#6a6a8a');
          const pulo = pulando && pulando.a === a ? -Math.sin(pulando.t / 20 * Math.PI) * 6 : 0;
          desenharEmoji(g, a.e, cx, y + 1 + ch / 2 + pulo, Math.min(20, ch - 6), { modo: achou ? 'cor' : 'sombra' });
          J.botoes.push({ x: cx - cw / 2, y: y + 1, w: cw, h: ch, acao: () => {
            pulando = { a, t: 0 };
            Voz.falar(achou ? `${nomeFalado(a)}. Mora ${BIOMAS[a.bioma].frase}.` : `Quem será? Mora ${BIOMAS[a.bioma].frase}.`);
          } });
        });
      });
      botaoAtivo(g, 4, 3, 28, 22, '🗺️', '#3a7bd5', () => irPara(CenaMapa));
    },
  };
}

// =====================================================================
//  PAUSA, TRANSIÇÕES E LOOP
// =====================================================================
function pausar() { if (J.cena && J.cena.pausavel) { J.pausado = true; Voz.calar(); } }

function irPara(fabrica, cx, cy) {
  if (J.transicao) return;
  J.transicao = { fase: 'fechando', t: 0, fabrica, cx, cy };
}

function trocarCena(c) {
  J.cena = c;
  J.pausado = false;
  if (c.musica) Som.musica(c.musica);
  else if (c.musica === null) Som.pararMusica();
}

const DUR_TRANS = 18;
function atualizar() {
  J.t++;
  const tr = J.transicao;
  if (tr) {
    tr.t++;
    if (tr.fase === 'fechando' && tr.t >= DUR_TRANS) {
      trocarCena(tr.fabrica());
      tr.fase = 'abrindo'; tr.t = 0; tr.cx = undefined; tr.cy = undefined;
    } else if (tr.fase === 'abrindo' && tr.t >= DUR_TRANS) J.transicao = null;
  }
  if (!J.pausado && J.cena) J.cena.atualizar();
}

function desenhar() {
  const g = J.g;
  g.imageSmoothingEnabled = false;
  J.botoes = [];
  if (J.cena) J.cena.desenhar(g);
  if (J.pausado) {
    J.botoes = [];
    g.fillStyle = 'rgba(10,8,30,0.7)'; g.fillRect(0, 0, J.W, J.H);
    botaoAtivo(g, J.W / 2 - 60, J.H / 2 - 22, 52, 40, '▶️', '#3aa655', () => { J.pausado = false; });
    botaoAtivo(g, J.W / 2 + 8, J.H / 2 - 22, 52, 40, '🗺️', '#3a7bd5', () => irPara(CenaMapa));
  }
  const tr = J.transicao;
  if (tr) {
    const k = tr.t / DUR_TRANS;
    iris(g, J.W, J.H, tr.fase === 'fechando' ? 1 - k : k, tr.cx, tr.cy);
  }
}

let ultimoQuadro = performance.now(), acumulado = 0;
function quadro(agora) {
  acumulado += Math.min(100, agora - ultimoQuadro);
  ultimoQuadro = agora;
  const passo = 1000 / 60;
  while (acumulado >= passo) {
    for (let i = 0; i < J.velocidadeDebug; i++) atualizar();
    acumulado -= passo;
  }
  desenhar();
  requestAnimationFrame(quadro);
}

// ------------------------------ tela e toque ------------------------------
function redimensionar() {
  const vw = window.innerWidth, vh = window.innerHeight;
  J.W = 320;
  J.H = Math.round(limitar(320 / (vw / vh), 180, 240));
  const c = J.canvas;
  c.width = J.W; c.height = J.H;
  const esc = Math.min(vw / J.W, vh / J.H);
  c.style.width = Math.floor(J.W * esc) + 'px';
  c.style.height = Math.floor(J.H * esc) + 'px';
  c.style.left = Math.floor((vw - J.W * esc) / 2) + 'px';
  c.style.top = Math.floor((vh - J.H * esc) / 2) + 'px';
  J.g.imageSmoothingEnabled = false;
}

function coordenadas(e) {
  const r = J.canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * J.W, y: (e.clientY - r.top) / r.height * J.H };
}

function pedirTelaCheia() {
  const standalone = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
  const el = document.documentElement;
  if (standalone || document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
    if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
  }).catch(() => {});
}

function configurarToque() {
  const c = J.canvas;
  const dentro = (b, x, y) => x >= b.x - 3 && x <= b.x + b.w + 3 && y >= b.y - 3 && y <= b.y + b.h + 3;
  c.addEventListener('pointerdown', e => {
    e.preventDefault();
    Som.iniciar();
    pedirTelaCheia();
    if (J.transicao) return;
    const { x, y } = coordenadas(e);
    try { c.setPointerCapture(e.pointerId); } catch (_) { /* ok */ }
    // botões agem ao soltar o dedo; aqui só guardamos qual foi apertado
    for (let i = J.botoes.length - 1; i >= 0; i--) {
      if (dentro(J.botoes[i], x, y)) { J.apertado = Object.assign({ id: e.pointerId }, J.botoes[i]); return; }
    }
    if (J.pausado || !J.cena) return;
    // o pulo responde já no encostar do dedo
    if (J.cena.toque) J.cena.toque(x, y, e.pointerId);
  });
  c.addEventListener('pointermove', e => {
    if (!J.cena || !J.cena.arrastar || J.pausado) return;
    const { x, y } = coordenadas(e);
    J.cena.arrastar(x, y, e.pointerId);
  });
  const soltar = (e, cancelado) => {
    const { x, y } = coordenadas(e);
    const b = J.apertado;
    if (b && b.id === e.pointerId) {
      J.apertado = null;
      if (!cancelado && !J.transicao && dentro(b, x, y)) { Som.iniciar(); Som.tocar('clique'); b.acao(); }
      Voz.desbloquear();
      return;
    }
    Som.iniciar();
    if (!cancelado && !J.transicao && !J.pausado && J.cena && J.cena.soltar) J.cena.soltar(x, y, e.pointerId);
    else if (cancelado && J.cena && J.cena.soltar) J.cena.soltar(x, y, e.pointerId);
    Voz.desbloquear();
  };
  c.addEventListener('pointerup', e => soltar(e, false));
  c.addEventListener('pointercancel', e => soltar(e, true));
  // garantia extra para o iPad: o primeiro fim de toque libera som e voz
  const liberar = () => { Som.iniciar(); Voz.desbloquear(); };
  document.addEventListener('touchend', liberar, { once: true });
  document.addEventListener('click', liberar, { once: true });
  // teclado (para testar no computador): espaço/seta = pular
  window.addEventListener('keydown', e => {
    if ([' ', 'ArrowUp', 'Enter'].includes(e.key) && J.cena && J.cena.toque && !J.pausado) {
      Som.iniciar();
      J.cena.toque(J.W / 2, J.H / 2, -1);
      e.preventDefault();
    }
  });
  // bloqueia zoom/menus do iOS
  ['gesturestart', 'contextmenu', 'dblclick'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { pausar(); Som.pausar(); Voz.calar(); } else Som.continuar();
  });
}

// ------------------------------ início ------------------------------
let iniciado = false;
function iniciarJogo() {
  if (iniciado) return;
  iniciado = true;
  J.canvas = document.getElementById('tela');
  J.g = J.canvas.getContext('2d');
  Save.carregar();
  Som.setMusicaLigada(Save.d.musica !== false);
  // só usa os bichos que o tablet consegue desenhar
  const ok = TODOS_ANIMAIS.filter(a => emojiSuportado(a.e));
  if (ok.length >= TODOS_ANIMAIS.length * 0.5) ANIMAIS = ok;
  prepararSprites();
  redimensionar();
  window.addEventListener('resize', redimensionar);
  configurarToque();
  trocarCena(CenaTitulo());
  requestAnimationFrame(quadro);
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    // quando uma versão nova do jogo é instalada, recarrega uma vez
    const tinhaVersao = !!navigator.serviceWorker.controller;
    let recarregou = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (tinhaVersao && !recarregou) { recarregou = true; location.reload(); }
    });
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

window.__jogo = { J, Save, irPara, CenaFase, CenaChuva, CenaMapa, CenaAlbum, CenaTitulo, CenaTioRobi };

if (document.fonts && document.fonts.load) {
  document.fonts.load(`16px ${FONTE_PIXEL}`).catch(() => {}).finally(iniciarJogo);
  setTimeout(iniciarJogo, 2500);
} else iniciarJogo();
