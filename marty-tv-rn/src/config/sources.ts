/**
 * Fontes do motor de conteúdo.
 *
 * O app não tem backend de mídia: busca listas M3U públicas do ecossistema
 * iptv-org na inicialização e faz o parse local. Para manter o catálogo
 * 100% legal, o parser aplica uma allowlist de domínios (emissoras públicas
 * e CDNs de distribuição FAST oficiais) — re-streams piratas presentes nas
 * listas públicas são descartados automaticamente.
 */

export interface TvSource {
  id: string;
  url: string;
  kind: 'language' | 'category';
  /** Idioma esperado da lista (para o filtro por idioma) */
  language?: 'pt' | 'es' | 'all';
  /** Seção padrão quando a tag group-title não existir */
  fallbackGroup: string;
}

export const SOURCES: TvSource[] = [
  {
    id: 'por',
    url: 'https://iptv-org.github.io/iptv/languages/por.m3u',
    kind: 'language',
    language: 'pt',
    fallbackGroup: 'TV Aberta',
  },
  {
    id: 'spa',
    url: 'https://iptv-org.github.io/iptv/languages/spa.m3u',
    kind: 'language',
    language: 'es',
    fallbackGroup: 'TV Aberta',
  },
  {
    id: 'movies',
    url: 'https://iptv-org.github.io/iptv/categories/movies.m3u',
    kind: 'category',
    language: 'all',
    fallbackGroup: 'Filmes',
  },
  {
    id: 'documentary',
    url: 'https://iptv-org.github.io/iptv/categories/documentary.m3u',
    kind: 'category',
    language: 'all',
    fallbackGroup: 'Documentários',
  },
  {
    id: 'sports',
    url: 'https://iptv-org.github.io/iptv/categories/sports.m3u',
    kind: 'category',
    language: 'all',
    fallbackGroup: 'Esportes',
  },
];

/**
 * Allowlist legal: domínios de emissoras públicas + CDNs FAST oficiais.
 * Qualquer canal fora desta lista é descartado no parse.
 */
export const OFFICIAL_DOMAINS: string[] = [
  // Brasil
  'ebc.com.br',
  'camara.gov.br',
  'tvcultura.com.br',
  'uol.com.br',
  'brasilstream.com.br',
  'procergs.com.br',
  'tvufop.com.br',
  'novotempo.com',
  // Portugal
  'rtp.pt',
  'global.ssl.fastly.net',
  // Espanha
  'rtve.es',
  'ztnr.rtve.es',
  'rtvelivestream.rtve.es',
  'rtveplayplus.rtve.es',
  '3catdirectes.cat',
  'etbon.eus',
  'telemadrid.cross-media.es',
  'cartv.streaming.aranova.es',
  'rtvclive.flumotion.cloud',
  'crtvg-europa.flumotion.cloud',
  'c21livecloud.com',
  // América Latina (públicos)
  'gov.ar',
  'gob.mx',
  'gob.ec',
  'gob.bo',
  'gob.py',
  'gov.co',
  'gob.do',
  'gob.cr',
  'senado.cl',
  'canaloncelive.tv',
  'buap.mx',
  'ovp-vivaro.digital',
  'rtvc.gov.co',
  'telesur.ultrabase.net',
  'asambleanacional.gob.ec',
  'ecuamedia.net',
  'upea.bo',
  'ucr.ac.cr',
  'protvradiostream.com',
  'paraguaytv.gov.py',
  'tv360.bitel.com.pe',
  // CDNs FAST oficiais
  'amagi.tv',
  'otteravision.com',
  'ottera.tv',
  'wurl.tv',
  'wurl.com',
  'roku.wurl.tv',
  'distro.tv',
  'stingray.com',
  'pbskids.org',
  '3qsdn.com',
  'magentamusik.de',
  'static.france24.com',
  'live.france24.com',
  'dwamdstream104.akamaized.net',
  'akamaized.net',
  'cloudfront.net',
  'fastly.net',
  'cdnlive.codev8.net',
  'rmtv.akamaized.net',
];
