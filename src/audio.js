'use strict';
// =====================================================================
//  SOM: efeitos e músicas chiptune sintetizados com Web Audio
//  VOZ: narração em português com a Web Speech API
// =====================================================================

const Som = (() => {
  let ctx = null, mestre = null, busMusica = null, busSfx = null, ruido = null;
  let musicaLigada = true;
  let musicaDesejada = null, musicaAtual = null;
  let passo = 0, proximoTempo = 0, relogio = null;

  function iniciar() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      mestre = ctx.createGain(); mestre.gain.value = 0.9; mestre.connect(ctx.destination);
      busMusica = ctx.createGain(); busMusica.gain.value = musicaLigada ? 0.32 : 0; busMusica.connect(mestre);
      busSfx = ctx.createGain(); busSfx.gain.value = 0.55; busSfx.connect(mestre);
      // buffer de ruído branco (bateria e batidas)
      ruido = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = ruido.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    if (musicaDesejada && musicaAtual !== musicaDesejada) comecarMusica(musicaDesejada);
  }

  function tom(freq, dur, tipo = 'square', vol = 0.15, atraso = 0, deslize = null, destino = busSfx) {
    if (!ctx) return;
    const t = ctx.currentTime + atraso;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    if (deslize) o.frequency.exponentialRampToValueAtTime(deslize, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(destino);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function chiado(dur, vol = 0.2, atraso = 0, corte = 3000, destino = busSfx, quando = null) {
    if (!ctx) return;
    const t = quando != null ? quando : ctx.currentTime + atraso;
    const s = ctx.createBufferSource(); s.buffer = ruido;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = corte;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(destino);
    s.start(t); s.stop(t + dur + 0.02);
  }

  const efeitos = {
    clique:  () => tom(660, 0.06, 'square', 0.1, 0, 880),
    pulo:    () => tom(260, 0.16, 'square', 0.1, 0, 620),
    nado:    () => tom(400, 0.12, 'triangle', 0.18, 0, 700),
    moeda:   () => { tom(988, 0.06, 'square', 0.09); tom(1319, 0.2, 'square', 0.09, 0.06); },
    certo:   () => [523, 659, 784, 1047].forEach((f, i) => tom(f, 0.14, 'square', 0.1, i * 0.065)),
    errado:  () => { tom(320, 0.2, 'sawtooth', 0.1, 0, 160); tom(210, 0.3, 'sawtooth', 0.1, 0.16, 90); },
    batida:  () => { chiado(0.25, 0.35, 0, 900); tom(120, 0.2, 'square', 0.12, 0, 50); },
    pop:     () => tom(500, 0.09, 'triangle', 0.25, 0, 1400),
    desvio:  () => tom(700, 0.18, 'triangle', 0.14, 0, 1500),
    estrela: (n = 0) => { const b = [784, 988, 1175][n] || 1175; tom(b, 0.12, 'square', 0.1); tom(b * 1.5, 0.3, 'square', 0.1, 0.1); },
    vitoria: () => {
      const m = [[523, 0], [523, 0.12], [523, 0.24], [659, 0.36], [784, 0.6], [659, 0.78], [784, 0.9], [1047, 1.02]];
      m.forEach(([f, t]) => tom(f, t === 1.02 ? 0.6 : 0.14, 'square', 0.11, t));
      [[262, 0], [330, 0.36], [392, 0.6], [523, 1.02]].forEach(([f, t]) => tom(f, 0.4, 'triangle', 0.2, t));
    },
    porta:   () => { tom(392, 0.1, 'square', 0.1); tom(523, 0.1, 'square', 0.1, 0.08); tom(784, 0.25, 'square', 0.1, 0.16); },
    cadeado: () => { tom(180, 0.08, 'square', 0.12); tom(150, 0.12, 'square', 0.12, 0.09); },
  };

  // ------------------------- músicas -------------------------
  // Cada nota ocupa uma colcheia. "-" segura a nota anterior, "." é pausa.
  // Bateria: "o" = bumbo, "x" = chimbal, "s" = caixa.
  const MUSICAS = {
    tema: { bpm: 132, onda: 'square',
      lead: 'C5 - E5 G5 A5 - G5 E5 | F5 - A5 C6 B5 - G5 - | E5 - G5 C6 D6 - C6 A5 | G5 - F5 D5 C5 - - .',
      baixo: 'C3 . G3 . C3 . G3 . | F2 . C3 . G2 . D3 . | A2 . E3 . F2 . C3 . | G2 . G2 . C3 . G2 .',
      bat: 'o . x . s . x . | o . x . s . x . | o . x . s . x . | o . x . s . x x' },
    savana: { bpm: 150, onda: 'square',
      lead: 'G4 A4 B4 D5 - B4 D5 E5 | D5 - B4 A4 G4 - . . | E5 D5 E5 G5 - E5 D5 B4 | A4 - B4 A4 G4 - . .',
      baixo: 'G2 . D3 . G2 . D3 . | C3 . G3 . G2 . D3 . | E3 . B2 . C3 . G2 . | D3 . D3 . G2 . D3 .',
      bat: 'o . x o s . x . | o . x o s . x . | o . x o s . x . | o . x o s x s x' },
    floresta: { bpm: 140, onda: 'square',
      lead: 'A4 . C5 E5 D5 C5 A4 . | G4 . A4 C5 D5 - . . | E5 . D5 C5 D5 E5 G5 - | E5 D5 C5 A4 A4 - . .',
      baixo: 'A2 . E3 A2 . E3 A2 . | G2 . D3 G2 . D3 G2 . | C3 . G3 C3 . G3 C3 . | E3 . E3 . A2 . E3 .',
      bat: 'o x . x s x . x | o x . x s x . x | o x . x s x . x | o x o x s x s s' },
    deserto: { bpm: 130, onda: 'square',
      lead: 'E5 F5 G#5 - F5 E5 - . | D5 E5 F5 E5 D5 C5 B4 - | E5 F5 G#5 A5 B5 A5 G#5 F5 | E5 - F5 E5 D5 E5 - .',
      baixo: 'E2 . B2 . E2 . B2 . | D2 . A2 . D2 . A2 . | E2 . B2 . C3 . B2 . | E2 . E2 . E2 . B2 .',
      bat: 'o . . x s . x . | o . . x s . x . | o . . x s . x . | o . o x s . s x' },
    gelo: { bpm: 120, onda: 'triangle',
      lead: 'F#5 . A5 . D6 . A5 . | B5 . A5 F#5 E5 - . . | G5 . B5 . E6 . D6 C#6 | D6 - A5 - F#5 - . .',
      baixo: 'D3 . A3 . D3 . A3 . | G2 . D3 . A2 . E3 . | E3 . B3 . A2 . E3 . | D3 . A2 . D3 . . .',
      bat: 'o . x . . . x . | o . x . . . x . | o . x . . . x . | o . x . s . x .' },
    oceano: { bpm: 110, onda: 'triangle',
      lead: 'C5 . F5 A5 C6 - A5 F5 | G5 . A5 G5 F5 - D5 . | C5 . E5 G5 A#5 - A5 G5 | F5 - - . A4 C5 F5 .',
      baixo: 'F2 . C3 F3 . C3 F2 . | A#2 . F3 A#2 . F3 D3 . | C3 . G3 C3 . G3 E3 . | F2 . C3 . F2 . C3 .',
      bat: 'o . . x . . x . | o . . x . . x . | o . . x . . x . | o . . x s . x .' },
    chuva: { bpm: 168, onda: 'square',
      lead: 'E5 E5 G5 E5 A5 G5 E5 D5 | E5 - B4 - D5 - B4 - | E5 E5 G5 E5 B5 A5 G5 A5 | B5 - A5 - G5 - F#5 -',
      baixo: 'E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 D2 D3 D2 D3 | E2 E3 E2 E3 E2 E3 E2 E3 | C2 C3 C2 C3 B1 B2 B1 B2',
      bat: 'o x s x o x s x | o x s x o x s x | o x s x o x s x | o x s x o s s s' },
  };

  const SEMITOM = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freqDe(n) {
    const m = /^([A-G]#?)(\d)$/.exec(n);
    if (!m) return 0;
    const midi = 12 * (+m[2] + 1) + SEMITOM[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  function fatiar(s) { return s.replace(/\|/g, ' ').trim().split(/\s+/); }
  for (const k in MUSICAS) {
    const m = MUSICAS[k];
    m.L = fatiar(m.lead); m.B = fatiar(m.baixo); m.P = fatiar(m.bat);
    m.passos = m.L.length;
  }

  // duração (em passos) de uma nota: 1 + quantidade de "-" seguidos
  function duracao(trilha, i) {
    let n = 1;
    while (trilha[(i + n) % trilha.length] === '-' && n < trilha.length) n++;
    return n;
  }

  function agendar() {
    const m = MUSICAS[musicaAtual];
    if (!m || !ctx) return;
    const dt = 60 / m.bpm / 2; // colcheia
    while (proximoTempo < ctx.currentTime + 0.15) {
      const i = passo % m.passos;
      const t = proximoTempo;
      const l = m.L[i], b = m.B[i % m.B.length], p = m.P[i % m.P.length];
      if (l && l !== '-' && l !== '.') notaMusica(freqDe(l), duracao(m.L, i) * dt * 0.95, m.onda, 0.09, t);
      if (b && b !== '-' && b !== '.') notaMusica(freqDe(b), duracao(m.B, i % m.B.length) * dt * 0.9, 'triangle', 0.22, t);
      if (p === 'o') { notaMusica(150, 0.12, 'sine', 0.35, t, 45); }
      else if (p === 'x') chiado(0.04, 0.06, 0, 9000, busMusica, t);
      else if (p === 's') chiado(0.12, 0.14, 0, 4000, busMusica, t);
      proximoTempo += dt;
      passo++;
    }
  }

  function notaMusica(freq, dur, tipo, vol, t, deslize = null) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo;
    o.frequency.setValueAtTime(freq, t);
    if (deslize) o.frequency.exponentialRampToValueAtTime(deslize, t + dur);
    g.gain.setValueAtTime(0.0008, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(busMusica);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function comecarMusica(nome) {
    pararRelogio();
    musicaAtual = nome;
    if (!ctx || !MUSICAS[nome]) return;
    passo = 0;
    proximoTempo = ctx.currentTime + 0.08;
    relogio = setInterval(agendar, 30);
    agendar();
  }
  function pararRelogio() { if (relogio) clearInterval(relogio); relogio = null; musicaAtual = null; }

  return {
    iniciar,
    tocar(nome, ...args) { if (efeitos[nome]) efeitos[nome](...args); },
    musica(nome) {
      musicaDesejada = nome;
      if (musicaAtual === nome) return;
      if (ctx) comecarMusica(nome);
    },
    pararMusica() { musicaDesejada = null; pararRelogio(); },
    pausar() { if (ctx && ctx.state === 'running') ctx.suspend(); },
    continuar() { if (ctx && ctx.state === 'suspended') ctx.resume(); },
    setMusicaLigada(v) {
      musicaLigada = v;
      if (busMusica) busMusica.gain.setTargetAtTime(v ? 0.32 : 0, ctx.currentTime, 0.05);
    },
    // abaixa a música enquanto a voz fala
    abafar(sim) {
      if (!busMusica || !musicaLigada) return;
      busMusica.gain.setTargetAtTime(sim ? 0.1 : 0.32, ctx.currentTime, 0.08);
    },
    get musicaLigada() { return musicaLigada; },
    MUSICAS,
  };
})();

const Voz = (() => {
  const ok = 'speechSynthesis' in window;
  let voz = null;
  function escolher() {
    if (!ok) return;
    const vs = speechSynthesis.getVoices();
    voz = vs.find(v => /pt[-_]BR/i.test(v.lang) && /luciana|google|francisca|natural/i.test(v.name))
       || vs.find(v => /pt[-_]BR/i.test(v.lang))
       || vs.find(v => /^pt/i.test(v.lang)) || null;
  }
  if (ok) {
    escolher();
    if ('onvoiceschanged' in speechSynthesis) speechSynthesis.onvoiceschanged = escolher;
  }
  let falando = 0;
  return {
    falar(texto, { interromper = true } = {}) {
      if (!ok || !texto) return;
      try {
        if (interromper) speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = 'pt-BR';
        if (voz) u.voice = voz;
        u.rate = 0.95; u.pitch = 1.15;
        u.onstart = () => { falando++; Som.abafar(true); };
        u.onend = u.onerror = () => { falando = Math.max(0, falando - 1); if (!falando) Som.abafar(false); };
        speechSynthesis.speak(u);
      } catch (e) { /* sem voz neste aparelho */ }
    },
    calar() { if (ok) speechSynthesis.cancel(); },
  };
})();
