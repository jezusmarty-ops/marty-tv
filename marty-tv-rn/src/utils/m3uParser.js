/**
 * Marty TV — Parser M3U tolerante a falhas.
 *
 * Converte listas M3U gigantes em objetos navegáveis, extraindo metadados
 * (tvg-id, tvg-logo, group-title, tvg-language) e criando seções dinâmicas.
 *
 * Regras de robustez:
 *  - Linhas corrompidas são ignoradas (nunca lançam exceção);
 *  - Só entram URLs http/https válidas;
 *  - Filtro de idioma (pt/es) com heurística para listas sem tvg-language;
 *  - Allowlist de domínios (legalidade) + filtro custom opcional;
 *  - Deduplicação por URL e limite de canais para não estourar memória.
 *
 * @module m3uParser
 */

/** @typedef {Object} Channel
 *  @property {string} id
 *  @property {string} name
 *  @property {string|null} logo
 *  @property {string} group
 *  @property {string|null} language
 *  @property {string} url
 *  @property {string} sourceId
 */

const DEFAULT_MAX_CHANNELS = 4000;

/**
 * Extrai os atributos chave="valor" de uma linha #EXTINF.
 * @param {string} line
 * @returns {Record<string,string>}
 */
function parseAttributes(line) {
  const attrs = {};
  const re = /([a-zA-Z0-9-]+)="([^"]*)"/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    try {
      attrs[m[1]] = m[2];
    } catch {
      /* atributo inválido: ignora */
    }
  }
  return attrs;
}

/** Nome do canal: tudo após a última vírgula da linha #EXTINF. */
function parseName(line) {
  const idx = line.lastIndexOf(',');
  const raw = idx >= 0 ? line.slice(idx + 1) : '';
  const name = raw.trim();
  return name.length > 0 ? name : 'Canal sem nome';
}

/**
 * Heurística de idioma para listas sem tvg-language:
 * procura marcadores de PT/ES no nome do canal/grupo.
 * @returns {'pt'|'es'|null}
 */
export function detectLanguage(name, group) {
  const hay = `${name} ${group || ''}`.toLowerCase();
  const ptMarks = ['brasil', 'portugal', 'rtp', 'globo', 'record', 'band ', 'sbt', 'cultura', 'novela', 'ao vivo br', ' (br)'];
  const esMarks = ['españa', 'espana', 'méxico', 'mexico', 'argentina', 'chile', 'colombia', 'perú', 'peru', 'rtve', 'televisa', 'canal ', ' (es)', ' (mx)', ' (ar)', ' (cl)', ' (co)', ' (pe)'];
  if (ptMarks.some(m => hay.includes(m))) return 'pt';
  if (esMarks.some(m => hay.includes(m))) return 'es';
  return null;
}

/**
 * Verifica se o host da URL está na allowlist.
 * @param {string} url
 * @param {string[]|null} allowlist
 */
function hostAllowed(url, allowlist) {
  if (!allowlist || allowlist.length === 0) return true;
  let host = '';
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }
  return allowlist.some(d => {
    const domain = d.toLowerCase();
    return host === domain || host.endsWith('.' + domain);
  });
}

/**
 * Compara o idioma do canal com o idioma desejado.
 * Aceita códigos (pt, es) e palavras (portuguese, spanish, español...).
 * Idioma desconhecido é ACEITO (as listas por idioma já vêm filtradas).
 */
function languageMatches(value, wanted) {
  if (!wanted || wanted === 'all') return true;
  if (!value) return true;
  const v = String(value).toLowerCase();
  const patterns = {
    pt: ['pt', 'por', 'portuguese', 'português', 'portugues', 'brazil', 'brasil'],
    es: ['es', 'spa', 'spanish', 'español', 'espanol', 'castellano'],
  };
  const list = patterns[wanted] || [wanted];
  return list.some(p => v === p || v.startsWith(p) || v.includes(p));
}

/**
 * Faz o parse de um texto M3U.
 *
 * @param {string} text conteúdo da lista
 * @param {object} [opts]
 * @param {string} [opts.sourceId] identificador da fonte (ex.: 'por')
 * @param {'pt'|'es'|'all'} [opts.language='all'] filtro de idioma
 * @param {string[]|null} [opts.allowlist] domínios permitidos (null = tudo)
 * @param {(ch: Channel) => boolean} [opts.customFilter] filtro extra
 * @param {string} [opts.fallbackGroup] grupo padrão quando não há group-title
 * @param {number} [opts.maxChannels]
 * @returns {Channel[]}
 */
export function parseM3U(text, opts = {}) {
  const {
    sourceId = 'unknown',
    language = 'all',
    allowlist = null,
    customFilter = null,
    fallbackGroup = 'Outros',
    maxChannels = DEFAULT_MAX_CHANNELS,
  } = opts;

  const channels = [];
  const seenUrls = new Set();
  let current = null;

  if (typeof text !== 'string' || text.length === 0) return channels;

  const lines = text.split(/\r?\n/);

  for (const raw of lines) {
    // limite de segurança de memória
    if (channels.length >= maxChannels) break;

    let line;
    try {
      line = raw.trim();
    } catch {
      continue;
    }
    if (!line) continue;

    try {
      if (line.startsWith('#EXTINF')) {
        const attrs = parseAttributes(line);
        const name = parseName(line);
        current = {
          id: attrs['tvg-id'] || `${sourceId}-${channels.length}-${Date.now()}`,
          name,
          logo: attrs['tvg-logo'] || null,
          group: attrs['group-title'] || fallbackGroup,
          language: attrs['tvg-language'] || detectLanguage(name, attrs['group-title'] || fallbackGroup),
          url: null,
          sourceId,
        };
      } else if (current && !line.startsWith('#')) {
        const url = line;
        current.url = url;
        if (/^https?:\/\/.+/i.test(url) && !seenUrls.has(url)) {
          // filtro de idioma (aceita código e nome por extenso)
          const langOk = languageMatches(current.language, language);
          // filtro legal + filtro custom
          const hostOk = hostAllowed(url, allowlist);
          const customOk = customFilter ? customFilter(current) : true;
          if (langOk && hostOk && customOk) {
            seenUrls.add(url);
            channels.push(current);
          }
        }
        current = null;
      }
    } catch {
      // linha corrompida: descarta e segue (nunca crasha o app)
      current = null;
    }
  }

  return channels;
}

/**
 * Agrupa canais por seção (group-title), retornando seções ordenadas.
 * @param {Channel[]} channels
 * @param {number} [minSize=1] seções menores que isso são fundidas em "Outros"
 * @returns {{key: string, title: string, data: Channel[]}[]}
 */
export function buildSections(channels, minSize = 1) {
  const map = new Map();
  for (const ch of channels) {
    if (!ch || !ch.group) continue;
    if (!map.has(ch.group)) map.set(ch.group, []);
    map.get(ch.group).push(ch);
  }
  const sections = [];
  const others = [];
  for (const [key, data] of map.entries()) {
    if (data.length < minSize) others.push(...data);
    else sections.push({ key, title: key, data });
  }
  if (others.length) sections.push({ key: 'outros', title: 'Outros', data: others });
  return sections.sort((a, b) => b.data.length - a.data.length);
}

/**
 * Parser assíncrono: recebe texto local (react-native-fs) e devolve
 * canais já filtrados e seccionados.
 * @param {string} fileContent
 * @param {object} opts mesmos de parseM3U
 */
export async function parseM3UAsync(fileContent, opts = {}) {
  return Promise.resolve(parseM3U(fileContent, opts));
}

export default { parseM3U, parseM3UAsync, buildSections, detectLanguage };
