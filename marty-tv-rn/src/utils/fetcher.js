/**
 * Busca de listas M3U com retry, timeout e fallback para react-native-fs
 * (download em disco para listas muito grandes). Nunca lança sem antes
 * esgotar as tentativas — o chamador decide o que fazer com o erro.
 */
import RNFS from 'react-native-fs';

const sleep = ms => new Promise(res => setTimeout(res, ms));

function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * @param {string} url
 * @param {{retries?:number, timeoutMs?:number, backoffMs?:number}} [opts]
 * @returns {Promise<string>} texto da lista
 */
export async function fetchTextWithRetry(url, opts = {}) {
  const { retries = 3, timeoutMs = 20000, backoffMs = 900 } = opts;
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTimeout(url, timeoutMs);
      if (res.ok) {
        return await res.text();
      }
      lastErr = new Error(`HTTP ${res.status} em ${url}`);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
    if (attempt < retries) {
      await sleep(backoffMs * (attempt + 1)); // backoff progressivo
    }
  }
  throw lastErr || new Error(`Falha ao buscar ${url}`);
}

/**
 * Fallback via react-native-fs: baixa em disco e lê o texto.
 * Útil para listas gigantes e para progresso de download.
 * @param {string} url
 * @param {(p:{bytesWritten:number, contentLength:number}) => void} [onProgress]
 */
export async function downloadTextWithRNFS(url, onProgress) {
  const dest = `${RNFS.CachesDirectoryPath}/m3u_${Date.now()}_${Math.floor(Math.random() * 10000)}.m3u`;
  const res = await RNFS.downloadFile({
    fromUrl: url,
    toFile: dest,
    progress: onProgress,
    background: false,
  }).promise;
  if (res.statusCode !== 200) {
    RNFS.unlink(dest).catch(() => {});
    throw new Error(`HTTP ${res.statusCode} em ${url}`);
  }
  const text = await RNFS.readFile(dest, 'utf8');
  RNFS.unlink(dest).catch(() => {});
  return text;
}
