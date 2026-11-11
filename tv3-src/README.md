# Marty TV 3

App de TV para Android/TV Box com ~1.700 canais **gratuitos e legais** em português e espanhol
(TV aberta do Brasil, Portugal, Espanha e América Latina, filmes 24h, Pluto TV, infantil,
fé, música, documentários, notícias). Sem canais pagos, sem retransmissão pirata.

## Pastas
- `web/` — a interface (HTML/CSS/JS). Funciona no navegador do PC também.
- `android/` — app Kotlin: abre a interface num WebView e toca o vídeo no ExoPlayer (Media3).
- `catalog/build-catalog.mjs` — robô que monta a lista a partir do banco público do
  [iptv-org](https://github.com/iptv-org/api), filtra e **testa cada link**.
- `catalog/removidos.txt` — canais tirados à mão.
- `.github/workflows/lista-canais.yml` — robô semanal (quando o projeto estiver no GitHub).
- `INSTALAR.md` — passo a passo para instalar nas TVs.

## Gerar o APK
```
powershell -ExecutionPolicy Bypass -File build.ps1          # usa a lista atual
powershell -ExecutionPolicy Bypass -File build.ps1 -Lista   # testa os links de novo (~6 min)
```
Sai em `release/MartyTV-3.0.0.apk`. A chave de assinatura fica em
`C:\Users\Jezus\.secrets\marty-tv\` (fora do projeto). **Não perca essa pasta**: sem ela,
versões novas não instalam por cima e é preciso desinstalar o app antes.

## Regras da lista
Entra: idioma português/espanhol ou país lusófono/hispânico.
Sai: adultos, canais fechados, bloqueados pelo iptv-org (DMCA), nomes de canais pagos
(HBO, Telecine, ESPN, Globo News…), links em IP solto (típico de retransmissão), televendas,
versões de outros países, e todo link que não respondeu no teste.

> Neste repositório a interface (pasta `web/` do projeto local) é publicada em `tv3/`.
> O robô semanal (`.github/workflows/lista-canais.yml`) roda `tv3-src/catalog/build-catalog.mjs` e atualiza `tv3/catalog.json`.
