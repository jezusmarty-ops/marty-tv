// Marty TV — robô do catálogo de FILMES E SÉRIES da RTVCPlay
// (TV pública da Colômbia: acervo gratuito, sem login, vídeo HLS aberto).
//
// - Lê o sitemap público, abre a página de cada PRODUÇÃO (filme/série) e guarda
//   título, sinopse, imagem, classificação, e: filmes -> id do vídeo; séries -> lista de
//   capítulos (o id do vídeo de cada capítulo é buscado pelo app na hora de tocar).
// - Descarta tudo que tem geoblocking (licenciado só para a Colômbia).
// - Educado com o servidor: 3 pedidos por vez, pausa entre eles, User-Agent honesto.
//
// Uso: node vod-rtvc.mjs   -> gera vod-rtvc.json ao lado

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://www.rtvcplay.co';
const UA = 'Mozilla/5.0 (compatible; MartyTV-catalogo/1.0; uso pessoal sem fins lucrativos)';
const PARALELO = 3;
const PAUSA_MS = 350;

// caminho do site -> seção do app
const TIPO = {
  'peliculas-ficcion': 'filme',
  'cortometrajes-ficcion': 'filme',
  'peliculas-documentales': 'doc',
  'cortometrajes-documentales': 'doc',
  'series-documentales': 'doc',
  'series-ficcion': 'serie',
  'ninos': 'infantil',
  'musica': 'musica',
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 30000);
      const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: c.signal });
      clearTimeout(t);
      if (r.ok) return await r.text();
      if (r.status === 404) return null;
    } catch { /* tenta de novo */ }
    await sleep(2000 * (i + 1));
  }
  return null;
}

function estado(html) {
  if (!html) return null;
  const i = html.indexOf('window.__RTVCPLAY_STATE__ =');
  if (i < 0) return null;
  const j = html.indexOf('</script>', i);
  try {
    return JSON.parse(html.slice(i + 27, j).trim().replace(/;\s*$/, ''));
  } catch {
    return null;
  }
}

const limpa = s => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const img = o => (o && o.path ? o.path : null);

async function main() {
  // 1) todas as URLs do sitemap
  const urls = [];
  for (let p = 1; p <= 10; p++) {
    const xml = await get(`${BASE}/sitemap.xml?page=${p}`);
    if (!xml) break;
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
    if (!locs.length) break;
    urls.push(...locs);
  }
  // 2) só produções (/categoria/slug), das categorias que interessam
  const prods = [...new Set(urls.map(u => {
    try {
      const parts = new URL(u).pathname.split('/').filter(Boolean);
      if (parts.length === 2 && TIPO[parts[0]]) return '/' + parts.join('/');
    } catch { /* url ruim */ }
    return null;
  }).filter(Boolean))];
  console.log(`sitemap: ${urls.length} urls, ${prods.length} produções`);

  // 3) abre cada produção
  const itens = [];
  let i = 0, geo = 0, semVideo = 0, feitos = 0;
  await Promise.all(Array.from({ length: PARALELO }, async () => {
    while (i < prods.length) {
      const path = prods[i++];
      const s = estado(await get(BASE + path));
      await sleep(PAUSA_MS);
      if (++feitos % 100 === 0) console.log(`  ${feitos}/${prods.length}`);
      const c = s && s.content && s.content.currentContent;
      if (!c || c.error || !c.title) continue;
      if (c.geoblocking) { geo++; continue; }
      const tipo = TIPO[path.split('/')[1]];
      const res = (c.resource && c.resource.image) || {};
      const it = {
        id: 'rtvc' + c.id,
        t: limpa(c.title),
        d: limpa(c.description).slice(0, 280),
        k: tipo,
        i: img(res.cover_desktop) || img(res.cover_mobile),
        r: (c.rating && c.rating.value) || '',
        f: 'rtvc',
        s: path,
      };
      if (c.video && c.video.assetid) {
        it.a = String(c.video.assetid);
        if (c.video.duration) it.dur = c.video.duration;
      } else {
        const temporadas = [];
        for (const w of c.widgets || []) {
          if (w.type !== 'seasonList') continue;
          for (const t of w.contents || []) {
            const eps = (t.contents || [])
              .filter(e => e && e.slug && e.content_type === 'video')
              .map(e => ({
                t: limpa(e.subtitle ? `${e.chapter_number || ''}. ${e.subtitle}` : e.title),
                s: e.slug,
                i: img(e.image && e.image.cover),
                dur: e.duration || undefined,
              }));
            if (eps.length) temporadas.push({ n: limpa(t.title) || `T${t.season || temporadas.length + 1}`, eps });
          }
        }
        if (!temporadas.length) { semVideo++; continue; }
        it.temp = temporadas;
      }
      itens.push(it);
    }
  }));

  itens.sort((a, b) => a.t.localeCompare(b.t, 'es'));
  const cont = {};
  itens.forEach(x => (cont[x.k] = (cont[x.k] || 0) + 1));
  const eps = itens.reduce((n, x) => n + (x.temp ? x.temp.reduce((m, t) => m + t.eps.length, 0) : 1), 0);
  writeFileSync(join(HERE, 'vod-rtvc.json'), JSON.stringify({ fonte: 'RTVCPlay', gerado: new Date().toISOString(), itens }));
  console.log(`OK: ${itens.length} títulos (${eps} vídeos) — ${JSON.stringify(cont)} — fora: ${geo} geobloqueados, ${semVideo} sem vídeo`);
}

main().catch(e => { console.error('ERRO', e.message); process.exit(1); });
