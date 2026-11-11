# Marty TV — React Native (Android TV)

Plataforma de streaming premium **sem mensalidade** para Smart TVs Android e TV Boxes,
com UI 100% navegável por controle remoto (D-Pad), conteúdo em Português e Espanhol,
player HLS com auto-retry e legendas, e CI/CD no GitHub Actions.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React Native CLI 0.74 (sem Expo) |
| Player | react-native-video (ExoPlayer no Android) — HLS `.m3u8`, buffering, retry, legendas `.vtt/.srt` |
| Estado | Zustand + persistência (AsyncStorage) |
| Foco TV | Navegação espacial própria (`focusManager.tsx`) — sem dependências |
| Parser | `utils/m3uParser.js` (M3U → JSON navegável, tolerante a falhas) |
| Download | `fetch` com retry/backoff + fallback `react-native-fs` |
| CI/CD | GitHub Actions → `app-release.apk` nos Artifacts a cada push na `main` |

## Estrutura

```
marty-tv-rn/
├── App.tsx                      # root: FocusProvider + boot + navegação de telas
├── index.js                     # registro do app
├── package.json / tsconfig.json / babel.config.js / metro.config.js
├── src/
│   ├── config/sources.ts        # URLs M3U (iptv-org) + ALLOWLIST legal de domínios
│   ├── theme/theme.ts           # dark #0A0A0A + carmesim #DC143C
│   ├── store/useTvStore.ts      # Zustand: catálogo, seções, favoritos, navegação
│   ├── navigation/focusManager.tsx  # foco espacial D-Pad (setas → vizinho mais próximo)
│   ├── utils/
│   │   ├── m3uParser.js         # parser M3U com filtros de idioma/domínio
│   │   └── fetcher.js           # fetch com retry + RNFS fallback
│   ├── components/
│   │   ├── HeroBanner.tsx       # autoplay silencioso com fallback
│   │   ├── Sidebar.tsx          # menu lateral (MENU abre/fecha)
│   │   ├── Carousel.tsx         # FlatList horizontal virtualizada
│   │   ├── ChannelCard.tsx      # card com foco carmesim
│   │   ├── TVPlayer.js          # player tela cheia + retry + legendas
│   │   ├── ChannelOverlay.tsx   # zapping ▲▼ sem sair do player
│   │   └── ErrorScreen.tsx      # erro elegante (nunca crasha)
│   └── screens/                 # Home, Category, Favorites, Player
├── android/                     # projeto nativo (Gradle 8.6, SDK 34, Leanback)
└── .github/workflows/build-apk.yml  # CI/CD
```

## Fontes de conteúdo

O app busca, na inicialização, as listas públicas do ecossistema iptv-org:

- `https://iptv-org.github.io/iptv/languages/por.m3u`
- `https://iptv-org.github.io/iptv/languages/spa.m3u`
- `https://iptv-org.github.io/iptv/categories/movies.m3u`
- `https://iptv-org.github.io/iptv/categories/documentary.m3u`
- `https://iptv-org.github.io/iptv/categories/sports.m3u`

> ⚖️ **Política legal:** essas listas misturam emissoras oficiais com re-streams sem
> licença. O parser aplica a allowlist de `src/config/sources.ts` (emissoras públicas +
> CDNs FAST oficiais) e descarta o resto. Para uso próprio você pode ampliar a lista,
> mas o padrão do projeto é 100% legal.

## Rodar localmente

```bash
npm install --legacy-peer-deps
npx react-native run-android   # emulador/TV com adb
```

Requisitos: Node 20, JDK 17, Android SDK 34 (Android Studio recomendado).

## CI/CD

Arquivo: `.github/workflows/build-apk.yml`. A cada push na `main`, o GitHub gera o
`app-release.apk` na aba **Actions → Artifacts**.

> ⚠️ Para ativar o workflow num repositório existente: crie o arquivo pela interface
> web do GitHub (**Add file → Create new file** → `.github/workflows/build-apk.yml` →
> colar o conteúdo). A API do GitHub bloqueia a criação de workflows por token sem o
> escopo `workflow` — é proteção deles, não bug do projeto.

## Decisões de arquitetura

1. **Sem Expo**: módulos nativos pesados (ExoPlayer, RNFS) pedem CLI puro.
2. **Navegação espacial própria**: menos dependências, controle total do D-Pad e
   comportamento idêntico ao Leanback nativo (vizinho geométrico mais próximo).
3. **Tolerância a falhas**: fonte morta = aviso + catálogo restante segue; canal morto
   = retry com backoff e troca automática para o próximo canal da seção.
4. **Memória**: FlatList virtualizada, `windowSize`/`removeClippedSubviews` e limite
   de canais por fonte — TV Box de 1 GB não estoura.
