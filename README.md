# 🦁 Chico ajuda os animais

Jogo com cara de Super Nintendo sobre **animais e os ambientes onde eles vivem** (savana, floresta, deserto, gelo e oceano), feito para uma criança de 5 anos que **ainda não sabe ler**: tudo é narrado por voz em português pelo **Tio Robi**, com ícones grandes e sem "game over".

Roda no navegador do tablet (iPad ou Android), pode ser instalado na tela inicial como app e funciona sem internet depois da primeira abertura.

## Como se joga

| Modo | O que a criança faz | O que treina |
|---|---|---|
| **Resgate na Trilha** (uma fase por ambiente) | O Chico corre sozinho. Os bichos vêm em bolhas. **Quem mora ali** → pegue (se a bolha estiver alta, toque para pular). **Quem está perdido** → desvie (se a bolha estiver baixa, pule por cima). | Decidir rápido "esse bicho mora aqui ou não?" |
| **Sombras Misteriosas** (nível 3 de cada ambiente) | A mesma corrida, mas as bolhas mostram só a silhueta do bicho. | Reconhecer o animal pela forma |
| **Chuva de Bichos** (chefão, libera depois de 2 ambientes) | Bichos de todos os ambientes caem de balão; arraste cada um para a casa certa. Fica mais rápido a cada acerto. | Misturar todos os ambientes de uma vez |
| **Álbum de Figurinhas** 📖 | Cada bicho salvo vira figurinha colorida; os que faltam aparecem como sombra. Tocar faz a voz dizer o nome e onde mora. | Revisar e colecionar |

Outros detalhes pensados para a idade:

- **Tio Robi explica o jogo**: na primeira vez, depois da tela inicial, o Tio Robi aparece e explica com figuras ("você tem que pegar os animais de cada ambiente; se o bicho não mora ali, pule por cima"). O botão com o rosto dele no mapa repete a explicação.

- **Tutorial sem texto**: na primeira fase o jogo desacelera, mostra uma mãozinha 👆 e a voz explica o que fazer.
- **Errar ensina**: ao pegar um bicho perdido, aparece um quadro "🐧 ➜ paisagem do gelo" e a voz diz *"Ops! O pinguim mora no gelo."*
- **Repetição espaçada escondida**: o jogo anota os bichos em que ele errou e passa a sorteá-los com mais frequência até ele acertar.
- **Níveis**: com 2 ou 3 estrelas o ambiente sobe de nível (1 = normal, 2 = mais rápido, 3 = sombras).
- O progresso fica salvo no próprio tablet.

## Colocar no tablet

### 1. Publicar (grátis) no GitHub Pages

1. No GitHub, abra o repositório → **Settings** → **Pages**.
2. Em *Build and deployment*, escolha **Deploy from a branch**, selecione o branch com o jogo (por exemplo `main`) e a pasta `/ (root)`. Salve.
3. Em 1–2 minutos o jogo fica em `https://robisonp.github.io/jogochico/`.

### 2. Instalar como app

- **iPad (Safari)**: abra o link → botão Compartilhar → **Adicionar à Tela de Início**.
- **Android (Chrome)**: abra o link → menu ⋮ → **Instalar app** (ou *Adicionar à tela inicial*).

Depois disso ele abre em tela cheia, deitado, como um app, e funciona offline.

### 3. Deixar a criança "presa" no jogo (recomendado)

- **iPad**: Ajustes → Acessibilidade → **Acesso Guiado**. Abra o jogo e clique 3× no botão lateral para travar.
- **Android**: Configurações → Segurança → **Fixar app** (Screen pinning).

> **Voz do Tio Robi**: o jogo procura uma voz masculina em português no tablet; se só achar voz feminina, deixa o tom mais grave. Para ficar com voz de homem de verdade, instale uma:
> - **iPad**: Ajustes → Acessibilidade → Conteúdo Falado → Vozes → Português (Brasil) → baixe uma voz masculina, se aparecer na lista.
> - **Android**: Configurações → Acessibilidade → Saída de conversão de texto em voz → Mecanismo do Google → Português (Brasil) → escolha uma das vozes masculinas.
>
> A voz só começa a funcionar depois do primeiro toque na tela: é uma regra do navegador.

## Testar no computador

Qualquer servidor estático serve, por exemplo:

```bash
npx http-server -p 8080
```

Abra `http://localhost:8080`. No computador, **espaço** ou **seta para cima** também fazem o Chico pular.

## Personalizar

Tudo que muda o conteúdo está em [`src/dados.js`](src/dados.js):

- `NOME_HEROI`: nome que aparece no título e nas falas.
- As falas do Tio Robi na abertura ficam em `CenaTioRobi`, em [`src/jogo.js`](src/jogo.js); o visual dele (pixel art e cores) fica em `ROBI` e `PAL_ROBI`, em [`src/graficos.js`](src/graficos.js).
- `TODOS_ANIMAIS`: lista de bichos. Para adicionar um, copie uma linha e troque emoji, nome, artigo (`o`/`a`) e ambiente.
- `BIOMAS`: ambientes e como a voz fala deles ("na savana", "no deserto"…).

Os bichos são emojis do próprio tablet, "pixelados" pelo jogo para ficarem com cara de 16 bits. Se o aparelho não tiver algum emoji (ex.: 🐻‍❄️ em tablets antigos), o jogo o esconde sozinho.

Depois de alterar qualquer arquivo, aumente `VERSAO` em [`sw.js`](sw.js) para o tablet baixar a versão nova.

## Estrutura

```
index.html            página, metas de app e aviso "gire o tablet"
manifest.webmanifest  instalação como app (tela cheia, paisagem)
sw.js                 cache para funcionar offline
src/dados.js          ambientes, animais e nome do herói
src/audio.js          músicas chiptune, efeitos e narração por voz
src/graficos.js       pixel art, cenários com parallax, botões
src/jogo.js           loop, toque, cenas (título, Tio Robi, mapa, fases, chuva, álbum)
icons/                ícones do app
```

Sem dependências e sem etapa de build: é HTML, Canvas e JavaScript puro.

## Ideias para próximas versões

- **Voz gravada do Tio Robi**: trocar a voz sintetizada por gravações de verdade das falas.

- **Exploração estilo Zelda**: andar pela ilha e encontrar bichos perdidos que pedem ajuda para voltar para casa.
- **"Quem sou eu?"**: a voz dá pistas ("tenho pescoço comprido e moro na savana") e ele escolhe o bicho.
- **Sons reais dos animais** (rugido, barrido, canto) para reconhecer pelo som.
- **Continentes e subambientes**: África, Amazônia, Antártida, recife de coral, mangue, Pantanal.
- **O que o bicho come**: um passo seguinte, ligando animais a alimentos (cadeia alimentar simples).
