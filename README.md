# Marty TV — TV grátis e legal para sua casa

App de TV para **Android TV / Google TV / TV Box** e navegador, com tudo dentro de um app só:
canais de filme 24h com programação própria, filmes sob demanda, documentários e canais ao
vivo oficiais — **em português e espanhol**, sem mensalidade e sem cadastro.

## O que tem dentro

| Seção | Conteúdo |
|---|---|
| 📺 Canais de Filme 24h | 5 canais (Clássicos, Sci-Fi & Terror, Comédia, Cinema Mudo, Cine ES) com grade gerada na hora a partir de +28 mil filmes de domínio público do Internet Archive |
| 🔴 Ao Vivo | 17 canais oficiais e gratuitos: TV Brasil, Canal Gov, TV Cultura, TV Câmara, Record News, CNN Brasil, ge FAST, SESC TV, TVE RS, Nuevo Tiempo (ES) e mais |
| 🎬 Filmes | Biblioteca on demand com busca por título |
| ★ Favoritos | Lista pessoal salva no aparelho |
| 📥 Meus canais | Cole qualquer URL `.m3u8`/`.mp4` ou uma lista `.m3u` inteira |
| 🌎 Idiomas | Interface em português e espanhol (botão PT/ES) |

**Conteúdo 100% legal:** filmes de domínio público (Internet Archive) e transmissões oficiais
de emissoras públicas e canais FAST. Nenhuma playlist ou sinal não licenciado.

## Estrutura do projeto

```
marty-tv/
├── index.html            # app web (roda em qualquer navegador de TV/PC/celular)
├── gen_icons.py          # gera ícones do Android (Pillow)
├── release/              # APK pronto (MartyTV-v1.0.0.apk)
├── .github/workflows/    # CI: compila o APK na nuvem do GitHub
└── android/              # app nativa Android TV (Kotlin + Media3/ExoPlayer)
    ├── build-apk.bat     # build com dois cliques (Windows)
    ├── build-apk.ps1     # build automático sem Android Studio
    └── app/src/main/     # WebView + player nativo (sem limite de CORS)
```

## Como funciona por dentro

- **App web** (`index.html`): arquivo único. Busca filmes na API pública do
  Internet Archive (`advancedsearch` + `metadata`), monta a programação dos canais
  de filme com as durações reais (grade "agora/a seguir" e programação do dia),
  e toca com `<video>` + hls.js. Favoritos e canais pessoais ficam em `localStorage`.
- **App Android**: WebView carrega o mesmo `index.html` empacotado no APK; quando o
  usuário escolhe um canal, a página chama `NativePlayer.play(url)` via ponte JS, e o
  **ExoPlayer (Media3)** toca nativamente — por isso canais HLS oficiais funcionam no
  Android mesmo quando o servidor não envia cabeçalhos CORS.

## Instalar nas TVs

### Android TV / Google TV / TV Box (TCL, Aquario, etc.)
1. Baixe `release/MartyTV-v1.0.0.apk` (pen drive **ou** direto na TV pelo app
   **Downloader** com o link do APK publicado no GitHub).
2. Na TV: `Configurações → Segurança e restrições → Fontes desconhecidas → ativar`.
3. Instale o APK — o app aparece na tela inicial com o nome **Marty TV**.

### Samsung (Tizen)
A Samsung não permite instalar APK. Use o app web:
1. Publique o `index.html` (veja abaixo) e anote o link.
2. Na TV Samsung, abra o **Navegador de Internet (Web Browser)**, digite o link,
   adicione aos favoritos. Pronto — mesma interface, sem instalar nada.

## Publicar o app web (grátis, 2 minutos)

**Opção A — Netlify Drop (sem conta):** arraste a pasta do projeto para
<https://app.netlify.com/drop> → ele gera um link → abra o link nas TVs.

**Opção B — GitHub Pages (repositório novo, sem tocar em nada seu):**
1. No GitHub: **New repository** → nome `marty-tv` → Public → Create.
2. Suba o conteúdo deste projeto.
3. `Settings → Pages → Source: Deploy from a branch → main / (root) → Save`.
4. O link fica `https://SEU-USUARIO.github.io/marty-tv/`.
   O APK também fica em `https://SEU-USUARIO.github.io/marty-tv/release/MartyTV-v1.0.0.apk`
   — dá pra instalar nas TVs direto pelo app Downloader com esse link.

## Gerar o APK

**Sem instalar nada no PC (GitHub Actions — recomendado):** o projeto já traz
`.github/workflows/build-apk.yml`. Ao subir para um repositório **novo** seu,
o GitHub compila o APK na nuvem:
1. Crie um repositório novo (ex.: `marty-tv`) — **sem tocar nos seus outros projetos**.
2. Suba todo o conteúdo do projeto (atenção: inclua a pasta oculta `.github` —
   se a interface web do GitHub ignorar pastas ocultas, crie o arquivo manualmente:
   `Add file → Create new file`, nome `.github/workflows/build-apk.yml`, e cole o
   conteúdo do mesmo arquivo deste projeto).
3. Aba `Actions` → o workflow `Build APK` roda sozinho (ou clique `Run workflow`).
4. Quando terminar, baixe o artefato **MartyTV-APK** em `Actions → Build APK → Artifacts`.

**Sem Android Studio (Windows):** dê dois cliques em `android/build-apk.bat`.
O script baixa sozinho JDK 17, Android SDK e Gradle, compila e deixa o APK em `release/`.

**Com Android Studio:** abra a pasta `android`, espere sincronizar, `Run`.

## Limitações conhecidas (v1)

- Em navegador, alguns canais ao vivo oficiais podem bloquear a reprodução (política
  CORS do emissor). **No APK Android isso não acontece** (player nativo).
- TVs Samsung/LG muito antigas podem ter navegador limitado; teste e me avise.
- No modo nativo Android, o botão "próximo filme" fica para a v2.

## Próximos passos (roadmap)

- v2: próximo filme no player nativo; EPG completo; busca em espanhol; espelhamento
  de favoritos entre TVs; app nativa Tizen (Samsung) via Tizen Studio.
- v3: integração com YouTube (canais oficiais de filmes/novelas) e legendas.

## Licença e atribuições

- Código do app: livre para uso pessoal (MIT — veja `LICENSE`).
- Filmes: [Internet Archive](https://archive.org) — domínio público/Creative Commons.
- Canais ao vivo: transmissões oficiais das respectivas emissoras.
- "Marty TV" é o nome do projeto — pode renomear à vontade.
