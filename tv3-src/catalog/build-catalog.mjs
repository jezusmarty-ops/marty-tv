// Marty TV 3 — robô que monta a lista de canais.
//
// Fonte: banco de dados público do iptv-org (https://github.com/iptv-org/api).
// Regras:
//   - só canais em português/espanhol ou de países lusófonos/hispânicos;
//   - fora: adultos, canais fechados, bloqueados pelo próprio iptv-org (DMCA),
//     canais pagos conhecidos (lista PAGOS abaixo) e televendas;
//   - cada link é testado; só entra o que respondeu agora.
//
// Uso:  node build-catalog.mjs            (gera catalog.json ao lado)
//       node build-catalog.mjs --no-check (não testa links; mais rápido)

import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const API = 'https://iptv-org.github.io/api/';
const CHECK = !process.argv.includes('--no-check');
const CONCURRENCY = 48;
const TIMEOUT_MS = 9000;

// Países que entram mesmo sem idioma declarado
const PAISES = {
  BR: 'Brasil', PT: 'Portugal', ES: 'España', MX: 'México', AR: 'Argentina',
  CO: 'Colombia', CL: 'Chile', PE: 'Perú', EC: 'Ecuador', BO: 'Bolivia',
  PY: 'Paraguay', UY: 'Uruguay', VE: 'Venezuela', CR: 'Costa Rica',
  GT: 'Guatemala', HN: 'Honduras', SV: 'El Salvador', NI: 'Nicaragua',
  PA: 'Panamá', DO: 'Rep. Dominicana', CU: 'Cuba', PR: 'Puerto Rico',
  AO: 'Angola', MZ: 'Moçambique', CV: 'Cabo Verde', US: 'EUA (espanhol)',
};
const LUSO_HISP = new Set(Object.keys(PAISES).filter(c => c !== 'US'));

// Canais pagos: se aparecerem de graça, é retransmissão sem autorização.
const PAGOS = new RegExp(
  '\\b(' +
    [
      'hbo', 'telecine', 'cinemax', 'tnt', 'star ?channel', 'star ?life', 'espn', 'fox ?sports',
      'premiere', 'sportv', 'combate', 'universal', 'studio universal', 'warner', 'amc', 'space',
      'paramount ?network', 'discovery', 'history', 'h2', 'a&e', 'a ?& ?e', 'tlc', 'disney',
      'cartoon', 'nick', 'nickelodeon', 'globoplay', 'max', 'movistar', 'dazn', 'win sports',
      'tyc', 'directv', 'sky', 'cinecanal', 'golden', 'de pel[ií]cula', 'fx', 'megapix',
      'canal brasil', 'tcm', 'sony', 'axn', 'cinelatino', 'cine latino', 'film ?&? ?arts',
      'lifetime', 'e!', 'comedy central', 'mtv', 'vh1', 'animal planet', 'nat ?geo',
      'national geographic', 'food network', 'hgtv', 'gloob', 'gnt', 'multishow', 'viva',
      'off', 'bis', 'megapix', 'claro sports', 'bein', 'gol ?tv', 'eurosport', 'la liga',
      'laliga', 'premier league', 'nba', 'nfl', 'ufc', 'f1', 'telemundo', 'univision',
      'unimas', 'galavision', 'tudn', 'tlnovelas', 'tl ?novelas', 'distrito comedia',
      'cine ?mex', 'cinemax', 'cinema dinamita', 'pasiones', 'studio ?5', 'canal 5 ?estrellas',
      'globonews', 'globo news', 'band ?sports', 'claro cinema', 'multipremier', 'multi premier',
      'az cinema', 'az corazon', 'az mundo', 'ifc', 'extreno', 'estreno', 'premiere', 'telemundo',
    ].join('|') +
    ')\\b',
  'i',
);

// iptv-org category -> seção do app
const SECAO_DE = {
  kids: 'infantil', animation: 'infantil', family: 'infantil',
  movies: 'filmes', classic: 'filmes',
  series: 'series', comedy: 'series', entertainment: 'series',
  religious: 'fe',
  music: 'musica',
  documentary: 'docs', science: 'docs', education: 'docs', culture: 'docs',
  travel: 'docs', outdoor: 'docs',
  news: 'noticias', weather: 'noticias', business: 'noticias',
  sports: 'esportes',
  lifestyle: 'estilo', cooking: 'estilo', auto: 'estilo', relax: 'estilo',
  general: 'abertos', public: 'abertos', legislative: 'abertos',
};
// prioridade quando o canal tem várias categorias
const PRIORIDADE = ['infantil', 'fe', 'filmes', 'musica', 'docs', 'esportes', 'noticias', 'series', 'estilo', 'abertos'];

const SECOES = [
  { id: 'abertos',  pt: 'TV Aberta',              es: 'TV Abierta',            icon: '📡' },
  { id: 'filmes',   pt: 'Filmes 24h',             es: 'Películas 24h',         icon: '🎬' },
  { id: 'series',   pt: 'Séries e Entretenimento', es: 'Series y Entretenimiento', icon: '🍿' },
  { id: 'infantil', pt: 'Infantil',               es: 'Infantil',              icon: '🧸', kids: true },
  { id: 'fe',       pt: 'Fé e Família',           es: 'Fe y Familia',          icon: '✝️' },
  { id: 'musica',   pt: 'Música',                 es: 'Música',                icon: '🎵' },
  { id: 'docs',     pt: 'Documentários e Cultura', es: 'Documentales y Cultura', icon: '🌎', kids: true },
  { id: 'noticias', pt: 'Notícias',               es: 'Noticias',              icon: '📰' },
  { id: 'esportes', pt: 'Esportes',               es: 'Deportes',              icon: '⚽' },
  { id: 'estilo',   pt: 'Culinária e Estilo',     es: 'Cocina y Estilo',       icon: '🍳' },
];

const fetchT = async (url, opts = {}, ms = TIMEOUT_MS) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: c.signal, redirect: 'follow' });
  } finally {
    clearTimeout(t);
  }
};
const api = async name => (await fetchT(API + name, {}, 60000)).json();

const qualidade = q => parseInt(String(q || '').replace(/\D/g, ''), 10) || 0;

async function testa(s) {
  const headers = { 'User-Agent': s.user_agent || 'Mozilla/5.0 (Linux; Android 11) MartyTV/3' };
  if (s.referrer) headers.Referer = s.referrer;
  try {
    const r = await fetchT(s.url, { headers });
    if (!r.ok) return false;
    const reader = r.body.getReader();
    const { value } = await reader.read();
    reader.cancel().catch(() => {});
    const head = Buffer.from(value || []).toString('utf8', 0, 400);
    const tipo = r.headers.get('content-type') || '';
    return /#EXTM3U|#EXT-X/.test(head) || /video|mpegurl|dash/i.test(tipo);
  } catch {
    return false;
  }
}

async function emLotes(itens, fn) {
  const out = new Array(itens.length);
  let i = 0, feitos = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < itens.length) {
        const k = i++;
        out[k] = await fn(itens[k]);
        if (++feitos % 400 === 0) console.log(`  testados ${feitos}/${itens.length}`);
      }
    }),
  );
  return out;
}

function limpaNome(n) {
  return String(n).replace(/\s*\((\d{3,4}p|SD|HD)\)\s*/gi, ' ').replace(/\s*\[[^\]]*\]\s*/g, ' ').trim();
}

async function main() {
  console.log('Baixando banco do iptv-org...');
  const [channels, feeds, streams, blocklist, logos] = await Promise.all(
    ['channels.json', 'feeds.json', 'streams.json', 'blocklist.json', 'logos.json'].map(api),
  );
  const C = new Map(channels.map(c => [c.id, c]));
  const bloqueados = new Set(blocklist.map(b => b.channel));
  const idiomas = {};
  for (const f of feeds) {
    (idiomas[f.channel] ??= new Set());
    for (const l of f.languages || []) idiomas[f.channel].add(l);
  }
  const logoDe = {};
  for (const l of logos) {
    if (!l.channel || !l.url) continue;
    const atual = logoDe[l.channel];
    // prefere logo horizontal/quadrado pequeno e sem feed específico
    if (!atual || (!l.feed && atual.feed)) logoDe[l.channel] = l;
  }

  const candidatos = [];
  for (const s of streams) {
    const c = C.get(s.channel);
    if (!c || c.is_nsfw || c.closed || bloqueados.has(c.id)) continue;
    const L = idiomas[c.id] || new Set();
    const pt = L.has('por'), es = L.has('spa');
    if (!(pt || es || LUSO_HISP.has(c.country))) continue;
    if (c.country === 'US' && !es && !pt) continue;
    if (PAGOS.test(c.name) || (c.alt_names || []).some(a => PAGOS.test(a))) continue;
    // versões de outros países (ex.: "Rakuten TV ... Germany") costumam vir em outro idioma
    const OUTRO_PAIS = /\b(germany|deutschland|italy|italia|france|uk|nederland|polska|australia|au|nordic)\s*(\(\d+p\))?\s*(\[[^\]]*\])?\s*$/i;
    if (OUTRO_PAIS.test(c.name) || OUTRO_PAIS.test(s.title || '')) continue;
    const cats = c.categories || [];
    if (cats.includes('shop') || cats.includes('xxx')) continue;
    if ((s.labels || []).some(l => /geo-?blocked/i.test(l)) && c.country !== 'BR') continue;
    // Link num IP solto (sem domínio da emissora) = quase sempre retransmissão não oficial
    let host = '';
    try { host = new URL(s.url).hostname; } catch { continue; }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) continue;
    const secs = cats.map(k => SECAO_DE[k]).filter(Boolean);
    const secao = PRIORIDADE.find(p => secs.includes(p)) || 'abertos';
    const lang = pt ? 'pt' : es ? 'es' : ['BR', 'PT', 'AO', 'MZ', 'CV'].includes(c.country) ? 'pt' : 'es';
    candidatos.push({ s, c, secao, lang });
  }
  console.log(`Candidatos: ${candidatos.length}`);

  let vivos = candidatos.map(() => true);
  if (CHECK) {
    console.log('Testando links (alguns minutos)...');
    vivos = await emLotes(candidatos, x => testa(x.s));
  }

  // um link por canal: o vivo de maior qualidade
  const porCanal = new Map();
  candidatos.forEach((x, i) => {
    if (!vivos[i]) return;
    const atual = porCanal.get(x.c.id);
    if (!atual || qualidade(x.s.quality) > qualidade(atual.s.quality)) porCanal.set(x.c.id, x);
  });

  const lista = [...porCanal.values()].map(({ s, c, secao, lang }) => {
    const ch = {
      id: c.id,
      n: limpaNome(s.title || c.name),
      s: secao,
      p: c.country,
      l: lang,
      u: s.url,
    };
    const logo = logoDe[c.id];
    if (logo) ch.i = logo.url;
    if (s.user_agent) ch.ua = s.user_agent;
    if (s.referrer) ch.rf = s.referrer;
    if (qualidade(s.quality) >= 720) ch.hd = 1;
    if ((s.labels || []).some(l => /not 24\/7/i.test(l))) ch.part = 1;
    return ch;
  });

  // ordem: Brasil/Portugal primeiro, depois por nome
  const peso = p => (p === 'BR' ? 0 : p === 'PT' ? 1 : 2);
  lista.sort((a, b) => peso(a.p) - peso(b.p) || a.n.localeCompare(b.n, 'pt'));

  // Removidos à mão depois da revisão (retransmissões que escaparam do filtro)
  const extraFile = join(HERE, 'removidos.txt');
  const removidos = existsSync(extraFile)
    ? new Set(readFileSync(extraFile, 'utf8').split(/\r?\n/).map(x => x.trim()).filter(x => x && !x.startsWith('#')))
    : new Set();
  const final = lista.filter(ch => !removidos.has(ch.id));

  const usados = new Set(final.map(c => c.p));
  const catalogo = {
    versao: 3,
    gerado: new Date().toISOString(),
    secoes: SECOES,
    paises: Object.fromEntries(Object.entries(PAISES).filter(([k]) => usados.has(k))),
    canais: final,
  };
  const out = join(HERE, 'catalog.json');
  writeFileSync(out, JSON.stringify(catalogo));
  const cont = {};
  final.forEach(c => (cont[c.s] = (cont[c.s] || 0) + 1));
  console.log(`OK: ${final.length} canais -> ${out}`);
  console.log(SECOES.map(s => `${s.id}:${cont[s.id] || 0}`).join('  '));
}

main().catch(e => {
  console.error('ERRO', e.message);
  process.exit(1);
});
