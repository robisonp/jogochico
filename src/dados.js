'use strict';
// =====================================================================
//  DADOS DO JOGO — edite aqui para trocar o nome do herói ou os animais
// =====================================================================

// Nome do herói (aparece no título e nas falas)
const NOME_HEROI = 'Chico';

// Ambientes. "frase" é usada nas falas: "O leão mora NA SAVANA".
const BIOMAS = {
  savana:   { id: 'savana',   nome: 'savana',   frase: 'na savana',   icone: '🌾' },
  floresta: { id: 'floresta', nome: 'floresta', frase: 'na floresta', icone: '🌳' },
  deserto:  { id: 'deserto',  nome: 'deserto',  frase: 'no deserto',  icone: '🌵' },
  gelo:     { id: 'gelo',     nome: 'gelo',     frase: 'no gelo',     icone: '❄️' },
  oceano:   { id: 'oceano',   nome: 'oceano',   frase: 'no oceano',   icone: '🌊' },
};
const ORDEM_BIOMAS = ['savana', 'floresta', 'deserto', 'gelo', 'oceano'];

// Animais. "art" é o artigo (o/a) usado nas falas.
// Para adicionar um bicho basta incluir uma linha nova com um emoji.
const TODOS_ANIMAIS = [
  // Savana
  { id: 'leao',        e: '🦁', nome: 'leão',              art: 'o', bioma: 'savana' },
  { id: 'girafa',      e: '🦒', nome: 'girafa',            art: 'a', bioma: 'savana' },
  { id: 'zebra',       e: '🦓', nome: 'zebra',             art: 'a', bioma: 'savana' },
  { id: 'elefante',    e: '🐘', nome: 'elefante',          art: 'o', bioma: 'savana' },
  { id: 'rinoceronte', e: '🦏', nome: 'rinoceronte',       art: 'o', bioma: 'savana' },
  { id: 'hipopotamo',  e: '🦛', nome: 'hipopótamo',        art: 'o', bioma: 'savana' },
  // Floresta
  { id: 'macaco',      e: '🐒', nome: 'macaco',            art: 'o', bioma: 'floresta' },
  { id: 'preguica',    e: '🦥', nome: 'bicho-preguiça',    art: 'o', bioma: 'floresta' },
  { id: 'arara',       e: '🦜', nome: 'arara',             art: 'a', bioma: 'floresta' },
  { id: 'gorila',      e: '🦍', nome: 'gorila',            art: 'o', bioma: 'floresta' },
  { id: 'tigre',       e: '🐅', nome: 'tigre',             art: 'o', bioma: 'floresta' },
  { id: 'onca',        e: '🐆', nome: 'onça-pintada',      art: 'a', bioma: 'floresta' },
  { id: 'orangotango', e: '🦧', nome: 'orangotango',       art: 'o', bioma: 'floresta' },
  // Deserto
  { id: 'camelo',      e: '🐫', nome: 'camelo',            art: 'o', bioma: 'deserto' },
  { id: 'dromedario',  e: '🐪', nome: 'dromedário',        art: 'o', bioma: 'deserto' },
  { id: 'escorpiao',   e: '🦂', nome: 'escorpião',         art: 'o', bioma: 'deserto' },
  { id: 'lagarto',     e: '🦎', nome: 'lagarto',           art: 'o', bioma: 'deserto' },
  { id: 'cascavel',    e: '🐍', nome: 'cascavel',          art: 'a', bioma: 'deserto' },
  { id: 'feneco',      e: '🦊', nome: 'raposa-do-deserto', art: 'a', bioma: 'deserto' },
  // Gelo
  { id: 'pinguim',     e: '🐧', nome: 'pinguim',           art: 'o', bioma: 'gelo' },
  { id: 'ursopolar',   e: '🐻‍❄️', nome: 'urso-polar',      art: 'o', bioma: 'gelo' },
  { id: 'foca',        e: '🦭', nome: 'foca',              art: 'a', bioma: 'gelo' },
  { id: 'rena',        e: '🦌', nome: 'rena',              art: 'a', bioma: 'gelo' },
  // Oceano
  { id: 'baleia',      e: '🐳', nome: 'baleia',            art: 'a', bioma: 'oceano' },
  { id: 'golfinho',    e: '🐬', nome: 'golfinho',          art: 'o', bioma: 'oceano' },
  { id: 'tubarao',     e: '🦈', nome: 'tubarão',           art: 'o', bioma: 'oceano' },
  { id: 'polvo',       e: '🐙', nome: 'polvo',             art: 'o', bioma: 'oceano' },
  { id: 'tartaruga',   e: '🐢', nome: 'tartaruga-marinha', art: 'a', bioma: 'oceano' },
  { id: 'caranguejo',  e: '🦀', nome: 'caranguejo',        art: 'o', bioma: 'oceano' },
  { id: 'peixepalhaco',e: '🐠', nome: 'peixe-palhaço',     art: 'o', bioma: 'oceano' },
];

// Preenchido em jogo.js depois de testar quais emojis o tablet consegue mostrar
let ANIMAIS = TODOS_ANIMAIS.slice();

function animaisDoBioma(bioma) { return ANIMAIS.filter(a => a.bioma === bioma); }
function animalPorId(id) { return ANIMAIS.find(a => a.id === id); }

// Falas da abertura, na voz do Tio Robi. Podem ser gravadas com a voz de
// verdade: no mapa, toque 5 vezes seguidas logo à direita do botão do Tio Robi.
const FALAS_ROBI = [
  { id: 'robi-1', texto: `Oi, ${NOME_HEROI}! Eu sou o Tio Robi!` },
  { id: 'robi-2', texto: 'Os animais se perderam, e você vai me ajudar a levar cada um para casa!' },
  { id: 'robi-3', texto: 'Em cada ambiente, você tem que pegar os animais que moram lá.' },
  { id: 'robi-4', texto: 'Se o bicho não mora ali, pule por cima! Para pular, é só tocar na tela.' },
  { id: 'robi-5', texto: 'Vamos lá? Toque no botão verde!' },
];

// Primeira letra maiúscula (para as falas)
function maiuscula(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
// "O pinguim mora no gelo."
function fraseMora(a) { return `${maiuscula(a.art)} ${a.nome} mora ${BIOMAS[a.bioma].frase}.`; }
