// Marty TV — robô do nazaret.tv (catálogo católico em espanhol).
// O site organiza vídeos que, na maioria, estão no YouTube. O app mostra a lista e toca
// pelo player oficial do YouTube (embed) — as páginas do nazaret.tv nunca são abertas
// na TV (o site tem links de spam escondidos).
//
// - Lê https://nazaret.tv/sitemap (uma página com todos os vídeos), só links /video/{cat}/{slug}
// - Abre só as páginas novas (guarda o que já leu em vod-nazaret.json) para achar o ID do YouTube
// - Vídeos do Vimeo ficam de fora (bloqueados por domínio: tocar exigiria burlar a trava)
// - Confere no oEmbed do YouTube se o vídeo ainda existe
// - Educado: 1 página por segundo; robots.txt do site permite tudo
//
// Uso: node vod-nazaret.mjs   -> atualiza vod-nazaret.json ao lado

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'vod-nazaret.json');
const UA = 'Mozilla/5.0 (compatible; MartyTV-catalogo/1.0; uso pessoal sem fins lucrativos)';

// categoria do site -> [seção no app, quantos itens mais recentes guardar, nome]
const CATS = {
  46: ['filme', 400, 'Películas'],
  45: ['doc', 600, 'Documentales'],
  38: ['musica', 250, 'Música'],
  36: ['fe', 200, 'Catequesis'],
  7: ['fe', 40, 'Misa del día'],
  57: ['fe', 40, 'Homilías'],
};

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function get(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 40000);
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: c.signal });
      clearTimeout(t);
      if (r.ok) return await r.text();
      if (r.status === 404) return null;
    } catch { /* tenta de novo */ }
    await sleep(3000 * (i + 1));
  }
  return null;
}
const ent = s => String(s)
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, ' ').trim();

async function main() {
  const antigo = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : { itens: [], vistos: {} };
  const vistos = antigo.vistos || {}; // caminho -> youtubeId | '' (sem YouTube)

  const html = await get('https://nazaret.tv/sitemap');
  if (!html) throw new Error('sitemap indisponível');
  const porCat = {};
  for (const m of html.matchAll(/href="(\/video\/(\d+)\/([^"]+))"[^>]*>\s*-?\s*([^<]+)<\/a>/g)) {
    const cat = +m[2];
    if (!CATS[cat]) continue;
    (porCat[cat] ||= []).push({ path: m[1], t: ent(m[4]) });
  }

  const itens = [];
  let lidos = 0;
  for (const [cat, [secao, max, nome]] of Object.entries(CATS)) {
    const lista = (porCat[cat] || []).slice(0, max); // sitemap vem do mais novo ao mais antigo
    console.log(`${nome}: ${lista.length}`);
    for (const v of lista) {
      if (!(v.path in vistos)) {
        const p = await get('https://nazaret.tv' + v.path);
        await sleep(1000);
        lidos++;
        const ifr = p && p.match(/<div class="flex-video">\s*<iframe[^>]*src="([^"]+)"/);
        const yt = ifr && ifr[1].match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/);
        vistos[v.path] = yt ? yt[1] : '';
        if (lidos % 50 === 0) console.log(`  páginas lidas: ${lidos}`);
      }
      const y = vistos[v.path];
      if (y) itens.push({ id: 'nz' + y, t: v.t, k: secao, c: nome, y, i: `https://i.ytimg.com/vi/${y}/hqdefault.jpg`, f: 'nazaret' });
    }
  }

  // vídeo ainda existe e aceita embed? (oEmbed responde 200 só nesses casos)
  const vivos = [];
  let k = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (k < itens.length) {
      const it = itens[k++];
      try {
        const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${it.y}&format=json`, { headers: { 'User-Agent': UA } });
        if (r.ok) {
          const j = await r.json();
          if (j.author_name) it.ch = j.author_name;
          vivos.push(it);
        }
      } catch { /* fora */ }
      await sleep(150);
    }
  }));
  const unicos = new Set();
  const final = vivos.filter(x => (unicos.has(x.id) ? false : unicos.add(x.id)));
  const cont = {};
  final.forEach(x => (cont[x.c] = (cont[x.c] || 0) + 1));
  writeFileSync(OUT, JSON.stringify({ fonte: 'nazaret.tv', gerado: new Date().toISOString(), itens: final, vistos }));
  console.log(`OK: ${final.length} vídeos (${lidos} páginas novas lidas) — ${JSON.stringify(cont)}`);
}

main().catch(e => { console.error('ERRO', e.message); process.exit(1); });
