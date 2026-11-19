// Marty TV — junta os catálogos de vídeo sob demanda num arquivo só (vod.json) para o app.
// Entradas (geradas pelos outros robôs): vod-rtvc.json, vod-oficiais.json, vod-nazaret.json
// Saída: vod.json  (+ vod.js com a cópia que vai dentro do APK)
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ler = f => (existsSync(join(HERE, f)) ? JSON.parse(readFileSync(join(HERE, f), 'utf8')).itens || [] : []);
const num = s => parseInt(String(s).replace(/\D+/g, ' ').trim().split(' ')[0] || '0', 10);

const itens = [];

// RTVCPlay: infantil com classificação "Infantil" vale no modo infantil; o resto não
for (const x of ler('vod-rtvc.json')) {
  itens.push({ ...x, l: 'es', kids: x.k === 'infantil' && /infantil|todo/i.test(x.r || '') ? 1 : undefined });
}

// Oficiais: Vimeo e YouTube como estão; Dailymotion vira "série" (um item por conta, capítulos dentro)
const dmPorConta = {};
for (const x of ler('vod-oficiais.json')) {
  if (x.f === 'dailymotion') (dmPorConta[x.c] ||= []).push(x);
  else itens.push({ ...x, kids: x.kids ? 1 : undefined });
}
for (const [conta, eps] of Object.entries(dmPorConta)) {
  eps.sort((a, b) => num(a.t) - num(b.t) || a.t.localeCompare(b.t));
  const p = eps[0];
  itens.push({
    id: 'dm-' + conta.replace(/\W+/g, '').toLowerCase(), t: conta, k: p.k, l: p.l, c: 'Dailymotion', f: 'dailymotion',
    kids: p.kids ? 1 : undefined, i: p.i,
    temp: [{ n: 'Capítulos', eps: eps.map(e => ({ t: e.t, e: e.e, i: e.i, dur: e.dur })) }],
  });
}

// nazaret.tv: nunca no modo infantil
for (const x of ler('vod-nazaret.json')) itens.push({ ...x, l: 'es', adulto: 1 });

// títulos com acentos em código HTML (ex.: "Pel&iacute;cula", às vezes codificado 2x)
const NOMES = { aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü', ccedil: 'ç', Ccedil: 'Ç', atilde: 'ã', otilde: 'õ', acirc: 'â', ecirc: 'ê', ocirc: 'ô', agrave: 'à',
  laquo: '«', raquo: '»', iexcl: '¡', iquest: '¿', ordf: 'ª', ordm: 'º', quot: '"', amp: '&', nbsp: ' ', hellip: '…', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', apos: "'", lt: '<', gt: '>', deg: '°' };
const desc = s => {
  let t = String(s || '');
  for (let i = 0; i < 3; i++) {
    t = t.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&([a-zA-Z]+);/g, (m, n) => NOMES[n] || m);
  }
  return t.replace(/\s+/g, ' ').trim();
};
for (const x of itens) {
  x.t = desc(x.t);
  if (x.d) x.d = desc(x.d);
  if (x.temp) x.temp.forEach(s => s.eps.forEach(e => { e.t = desc(e.t); }));
}

// série sem imagem própria: usa a imagem do primeiro capítulo
for (const x of itens) {
  if (!x.i && x.temp) {
    for (const s of x.temp) { const e = s.eps.find(e => e.i); if (e) { x.i = e.i; break; } }
  }
}

const limpo = itens.map(x => JSON.parse(JSON.stringify(x))); // tira campos undefined
const out = { versao: 1, gerado: new Date().toISOString(), itens: limpo };
const txt = JSON.stringify(out);
writeFileSync(join(HERE, 'vod.json'), txt);
const cont = {};
limpo.forEach(x => (cont[x.f] = (cont[x.f] || 0) + 1));
const videos = limpo.reduce((n, x) => n + (x.temp ? x.temp.reduce((m, t) => m + t.eps.length, 0) : 1), 0);
console.log(`vod.json: ${limpo.length} itens, ${videos} vídeos, ${(txt.length / 1024).toFixed(0)} KB — ${JSON.stringify(cont)}`);
