// Marty TV — robô das contas OFICIAIS no Vimeo, Dailymotion e YouTube.
// Tudo toca pelo player oficial de cada plataforma, embutido no app (nada é baixado).
// - Vimeo: API pública v2 (últimos ~60 vídeos por conta), só os que liberam embed.
// - Dailymotion: API pública, só os que permitem embed (allow_embed).
// - YouTube: lista conferida à mão (youtube-oficial.json) -> playlists / uploads / ao vivo.
//
// Uso: node vod-oficiais.mjs   -> gera vod-oficiais.json ao lado

import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const UA = 'Mozilla/5.0 (compatible; MartyTV-catalogo/1.0; uso pessoal sem fins lucrativos)';
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function json(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// [conta, seção, idioma, nome, kids?, duração mínima em minutos]
const VIMEO = [
  ['filmotecaespanola', 'filme', 'es', 'Filmoteca Española', false, 40],
  ['videonasaldeias', 'doc', 'pt', 'Vídeo nas Aldeias', false, 10],
  ['filmesdeplastico', 'filme', 'pt', 'Filmes de Plástico', false, 8],
  ['cinepata', 'filme', 'es', 'Cinépata', false, 40],
];
const DAILY = [
  ['sbtchiquititas', 'serie', 'pt', 'Chiquititas (SBT)', true],
  ['sbtcarrossel', 'serie', 'pt', 'Carrossel (SBT)', true],
  ['sbtcumplices', 'serie', 'pt', 'Cúmplices de um Resgate (SBT)', true],
  ['tierraamarga', 'serie', 'es', 'Tierra Amarga', false],
  ['SeriesTurcasWECO', 'serie', 'es', 'Series Turcas WECO', false],
];
const YT_SECAO = { infantil_pt: ['infantil', 'pt'], infantil_es: ['infantil', 'es'], filmes: ['filme'], series: ['serie'], docs: ['doc'], noticias_live: ['noticias'] };

async function main() {
  const itens = [];

  for (const [conta, k, l, nome, kids, minMin] of VIMEO) {
    let n = 0;
    for (let p = 1; p <= 3; p++) {
      const arr = await json(`https://vimeo.com/api/v2/${conta}/videos.json?page=${p}`);
      await sleep(800);
      if (!Array.isArray(arr) || !arr.length) break;
      for (const v of arr) {
        if (v.embed_privacy && v.embed_privacy !== 'anywhere') continue;
        if ((v.duration || 0) < minMin * 60) continue;
        itens.push({ id: 'vm' + v.id, t: v.title, d: String(v.description || '').replace(/<[^>]+>/g, ' ').slice(0, 240), k, l, c: nome, kids, f: 'vimeo', e: String(v.id), i: v.thumbnail_large || v.thumbnail_medium, dur: Math.round(v.duration / 60) + 'm' });
        n++;
      }
    }
    console.log(`Vimeo ${conta}: ${n}`);
  }

  for (const [conta, k, l, nome, kids] of DAILY) {
    let n = 0;
    for (let p = 1; p <= 3; p++) {
      const j = await json(`https://api.dailymotion.com/user/${conta}/videos?fields=id,title,duration,thumbnail_360_url,allow_embed,description&limit=100&page=${p}&sort=recent`);
      await sleep(1500);
      if (!j || !j.list) break;
      for (const v of j.list) {
        if (!v.allow_embed || (v.duration || 0) < 600) continue;
        itens.push({ id: 'dm' + v.id, t: v.title, d: String(v.description || '').slice(0, 240), k, l, c: nome, kids, f: 'dailymotion', e: v.id, i: v.thumbnail_360_url, dur: Math.round(v.duration / 60) + 'm' });
        n++;
      }
      if (!j.has_more) break;
    }
    console.log(`Dailymotion ${conta}: ${n}`);
  }

  // YouTube: para cada canal oficial, os vídeos mais recentes da playlist (feed RSS público)
  const ent = s => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  async function feed(q) {
    try {
      const r = await fetch('https://www.youtube.com/feeds/videos.xml?' + q, { headers: { 'User-Agent': UA } });
      if (!r.ok) return [];
      const x = await r.text();
      return [...x.matchAll(/<entry>[\s\S]*?<yt:videoId>([\w-]{11})<\/yt:videoId>[\s\S]*?<title>([^<]*)<\/title>/g)]
        .map(m => ({ t: ent(m[2]), y: m[1], i: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` }));
    } catch {
      return [];
    }
  }
  const yt = JSON.parse(readFileSync(join(HERE, 'youtube-oficial.json'), 'utf8'));
  let ny = 0;
  for (const [grupo, lista] of Object.entries(yt)) {
    if (!YT_SECAO[grupo]) continue;
    const [k, lFixo] = YT_SECAO[grupo];
    for (const c of lista) {
      const live = grupo === 'noticias_live';
      const pl = c.pl || ('UU' + c.id.slice(2));
      let eps = live ? [] : await feed('playlist_id=' + pl);
      if (!live && !eps.length) eps = await feed('channel_id=' + c.id);
      await sleep(400);
      const it = {
        id: 'yt' + c.id, t: c.n, k, l: c.l || lFixo, c: 'YouTube', kids: k === 'infantil', f: 'youtube',
        ch: c.id, full: c.full ? 1 : undefined,
      };
      if (live) {
        it.live = c.id;
        const ult = await feed('channel_id=' + c.id);
        if (ult[0]) it.i = ult[0].i;
      } else {
        if (!eps.length) continue; // canal sem vídeos acessíveis agora
        it.i = eps[0].i;
        it.temp = [{ n: 'Recentes', eps }];
        it.pl = pl;
      }
      itens.push(it);
      ny++;
    }
  }
  console.log(`YouTube oficial: ${ny}`);

  writeFileSync(join(HERE, 'vod-oficiais.json'), JSON.stringify({ gerado: new Date().toISOString(), itens }));
  console.log(`OK: ${itens.length} itens`);
}

main().catch(e => { console.error('ERRO', e.message); process.exit(1); });
