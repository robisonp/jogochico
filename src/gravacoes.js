'use strict';
// =====================================================================
//  GRAVAÇÕES: a voz de verdade do Tio Robi nas falas da abertura
//  - gravadas dentro do jogo e guardadas no aparelho (IndexedDB)
//  - ou colocadas no repositório em audio/robi/robi-1.m4a ... robi-5.m4a
// =====================================================================

const Gravacoes = (() => {
  const BANCO = 'chico-voz', LOJA = 'falas';
  const EXTENSOES = ['wav', 'm4a', 'mp3', 'webm', 'ogg'];
  const itens = new Map();    // id -> { blob, origem: 'aparelho' | 'site' }
  const buffers = new Map();  // id -> AudioBuffer já decodificado
  let db = null;

  function abrir() {
    return new Promise((ok, erro) => {
      if (!window.indexedDB) return erro(new Error('sem IndexedDB'));
      const r = indexedDB.open(BANCO, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(LOJA);
      r.onsuccess = () => ok(r.result);
      r.onerror = () => erro(r.error);
    });
  }
  function pedido(modo, fn) {
    return new Promise((ok, erro) => {
      const tx = db.transaction(LOJA, modo);
      const r = fn(tx.objectStore(LOJA));
      tx.oncomplete = () => ok(r && r.result);
      tx.onerror = () => erro(tx.error);
    });
  }

  async function carregar() {
    try {
      db = await abrir();
      for (const f of FALAS_ROBI) {
        const blob = await pedido('readonly', l => l.get(f.id));
        if (blob) itens.set(f.id, { blob, origem: 'aparelho' });
      }
    } catch (e) { /* navegador sem armazenamento: só vale o que estiver no site */ }
    // gravações publicadas junto com o jogo (pasta audio/robi)
    for (const f of FALAS_ROBI) {
      if (itens.has(f.id)) continue;
      for (const ext of EXTENSOES) {
        try {
          const r = await fetch(`audio/robi/${f.id}.${ext}`);
          if (r.ok) { itens.set(f.id, { blob: await r.blob(), origem: 'site' }); break; }
        } catch (e) { /* sem internet ou arquivo ausente */ }
      }
      if (f.id === 'robi-1' && !itens.has('robi-1')) break; // sem a primeira, não procura as outras
    }
  }

  async function salvar(id, blob) {
    itens.set(id, { blob, origem: 'aparelho' });
    buffers.delete(id);
    if (!db) return;
    await pedido('readwrite', l => l.put(blob, id));
    // pede para o navegador não apagar os dados do jogo por falta de espaço
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* ok */ }
  }

  async function apagar(id) {
    buffers.delete(id);
    const it = itens.get(id);
    if (it && it.origem === 'aparelho') {
      itens.delete(id);
      if (db) await pedido('readwrite', l => l.delete(id));
    }
  }

  async function buffer(id) {
    if (buffers.has(id)) return buffers.get(id);
    const it = itens.get(id);
    if (!it) return null;
    try {
      const buf = await Som.decodificar(await it.blob.arrayBuffer());
      buffers.set(id, buf);
      return buf;
    } catch (e) { return null; }
  }

  // Converte a gravação para WAV (toca em qualquer aparelho, inclusive iPad):
  // corta o silêncio, deixa em mono 22 kHz e ajusta o volume.
  async function paraWav(buf, taxa = 22050) {
    const [ini, fim] = Som.aparar(buf);
    const n = Math.max(1, Math.ceil((fim - ini) * taxa));
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const off = new OAC(1, n, taxa);
    const fonte = off.createBufferSource();
    fonte.buffer = buf;
    fonte.connect(off.destination);
    fonte.start(0, ini, fim - ini);
    const r = await new Promise((ok, erro) => {
      off.oncomplete = e => ok(e.renderedBuffer);
      const p = off.startRendering();
      if (p && p.then) p.then(ok, erro);
    });
    const d = r.getChannelData(0);
    let pico = 0;
    for (let i = 0; i < d.length; i++) pico = Math.max(pico, Math.abs(d[i]));
    const ganho = pico > 0 ? Math.min(4, 0.9 / pico) : 1;
    const dados = new DataView(new ArrayBuffer(44 + d.length * 2));
    const txt = (o, s) => { for (let i = 0; i < s.length; i++) dados.setUint8(o + i, s.charCodeAt(i)); };
    txt(0, 'RIFF'); dados.setUint32(4, 36 + d.length * 2, true); txt(8, 'WAVE');
    txt(12, 'fmt '); dados.setUint32(16, 16, true); dados.setUint16(20, 1, true); dados.setUint16(22, 1, true);
    dados.setUint32(24, taxa, true); dados.setUint32(28, taxa * 2, true); dados.setUint16(32, 2, true); dados.setUint16(34, 16, true);
    txt(36, 'data'); dados.setUint32(40, d.length * 2, true);
    for (let i = 0; i < d.length; i++) {
      const v = Math.max(-1, Math.min(1, d[i] * ganho));
      dados.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7FFF, true);
    }
    return new Blob([dados.buffer], { type: 'audio/wav' });
  }

  function extensao(blob) {
    const t = (blob && blob.type) || '';
    if (/mp4|aac|m4a/.test(t)) return 'm4a';
    if (/webm/.test(t)) return 'webm';
    if (/ogg/.test(t)) return 'ogg';
    if (/mpeg|mp3/.test(t)) return 'mp3';
    if (/wav/.test(t)) return 'wav';
    return 'm4a';
  }

  return {
    carregar, salvar, apagar, buffer, extensao, paraWav,
    tem: id => itens.has(id),
    item: id => itens.get(id),
    preparar() { FALAS_ROBI.forEach(f => { if (itens.has(f.id)) buffer(f.id); }); },
  };
})();

// ---------------------------------------------------------------------
//  Tela de gravação (para o adulto): HTML por cima do jogo
// ---------------------------------------------------------------------
const Gravador = (() => {
  const LIMITE_SEG = 15;
  let painel = null, gravando = null, ouvindo = null;

  function tipoGravacao() {
    if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
      .find(t => MediaRecorder.isTypeSupported(t)) || '';
  }
  const podeGravar = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);

  function el(tag, attrs = {}, filhos = []) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === 'texto') e.textContent = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    filhos.forEach(f => f && e.appendChild(f));
    return e;
  }

  function montar() {
    painel = document.getElementById('gravador');
    painel.innerHTML = '';
    const lista = el('ol', { class: 'g-lista' });
    FALAS_ROBI.forEach((f, i) => lista.appendChild(linha(f, i)));
    const aviso = podeGravar() ? null : el('p', { class: 'g-erro', texto:
      'Este navegador não deixa gravar. Abra o jogo pelo link https (GitHub Pages) no Safari ou Chrome.' });
    painel.appendChild(el('div', { class: 'g-caixa' }, [
      el('h2', { texto: '🎙️ Gravar a voz do Tio Robi' }),
      el('p', { texto: 'Aperte ● Gravar, leia a frase com calma e aperte ■ Parar. Ouça com ▶ e grave de novo se quiser. As gravações ficam salvas neste aparelho; frase sem gravação continua com a voz do tablet.' }),
      aviso,
      lista,
      el('div', { class: 'g-rodape' }, [
        el('button', { class: 'g-btn g-verde', texto: '▶ Ver a abertura', onclick: () => { fechar(); irPara(CenaTioRobi); } }),
        el('button', { class: 'g-btn', texto: 'Fechar', onclick: fechar }),
      ]),
    ]));
  }

  function linha(f, i) {
    const it = Gravacoes.item(f.id);
    const estado = it ? (it.origem === 'site' ? '✓ gravada (do site)' : '✓ gravada') : 'sem gravação';
    const li = el('li', { class: 'g-linha' + (it ? ' g-ok' : ''), 'data-id': f.id }, [
      el('div', { class: 'g-frase', texto: f.texto }),
      el('div', { class: 'g-estado', texto: estado }),
      el('div', { class: 'g-botoes' }, [
        el('button', { class: 'g-btn g-rec', texto: gravando && gravando.id === f.id ? '■ Parar' : '● Gravar', onclick: () => alternarGravacao(f.id) }),
        el('button', { class: 'g-btn', texto: '▶ Ouvir', onclick: () => ouvir(f.id) }),
        it && it.origem === 'aparelho' ? el('button', { class: 'g-btn', texto: '⬇ Baixar', onclick: () => baixar(f.id) }) : null,
        it && it.origem === 'aparelho' ? el('button', { class: 'g-btn g-apagar', texto: 'Apagar', onclick: () => apagar(f.id) }) : null,
      ]),
    ]);
    if (!it) li.querySelector('.g-botoes button:nth-child(2)').disabled = true;
    return li;
  }

  async function alternarGravacao(id) {
    if (gravando) { const era = gravando.id; parar(); if (era === id) return; }
    pararOuvir();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const tipo = tipoGravacao();
      const rec = tipo ? new MediaRecorder(stream, { mimeType: tipo }) : new MediaRecorder(stream);
      const partes = [];
      rec.ondataavailable = e => { if (e.data && e.data.size) partes.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(partes, { type: rec.mimeType || tipo || 'audio/mp4' });
        if (blob.size > 0) await Gravacoes.salvar(id, blob);
        montar();
      };
      rec.start();
      const t0 = Date.now();
      gravando = { id, rec, relogio: setInterval(() => {
        const s = Math.floor((Date.now() - t0) / 1000);
        const e = painel.querySelector(`[data-id="${id}"] .g-estado`);
        if (e) e.textContent = `🔴 gravando… ${s}s`;
        if (s >= LIMITE_SEG) parar();
      }, 250) };
      montar();
      const e = painel.querySelector(`[data-id="${id}"]`);
      if (e) e.classList.add('g-gravando');
    } catch (e) {
      gravando = null;
      alert('Não consegui usar o microfone. Confira se o navegador tem permissão para o microfone.');
    }
  }

  function parar() {
    if (!gravando) return;
    clearInterval(gravando.relogio);
    try { gravando.rec.stop(); } catch (e) { /* já parado */ }
    gravando = null;
  }

  function ouvir(id) {
    pararOuvir();
    const it = Gravacoes.item(id);
    if (!it) return;
    const url = URL.createObjectURL(it.blob);
    ouvindo = new Audio(url);
    ouvindo.onended = () => URL.revokeObjectURL(url);
    ouvindo.play().catch(() => {});
  }
  function pararOuvir() { if (ouvindo) { ouvindo.pause(); ouvindo = null; } }

  // baixa em WAV, pronto para subir no GitHub em audio/robi/
  async function baixar(id) {
    const it = Gravacoes.item(id);
    if (!it) return;
    let blob = it.blob;
    try {
      const buf = await Gravacoes.buffer(id);
      if (buf) blob = await Gravacoes.paraWav(buf);
    } catch (e) { /* se não converter, baixa o original */ }
    const a = el('a', { href: URL.createObjectURL(blob), download: `${id}.${Gravacoes.extensao(blob)}` });
    document.body.appendChild(a); a.click(); a.remove();
  }

  async function apagar(id) {
    if (!confirm('Apagar esta gravação?')) return;
    await Gravacoes.apagar(id);
    montar();
  }

  function abrir() {
    Voz.calar();
    Som.pausar(); // silêncio para a música não entrar na gravação
    montar();
    painel.hidden = false;
  }
  function fechar() {
    parar(); pararOuvir();
    painel.hidden = true;
    Som.continuar();
  }

  return { abrir, fechar };
})();
