/**
 * Utility condivise dalle funzioni: lettura canali, verifica e estrazione degli URL .m3u8
 */
const UA =
  "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export async function fetchWithTimeout(url, options = {}, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// channels.json è il file pubblico del sito: lo leggiamo via HTTP dall'origine del sito
export async function loadChannels(origin) {
  const res = await fetchWithTimeout(origin + "/channels.json", {}, 6000);
  if (!res.ok) throw new Error("channels.json non raggiungibile");
  return res.json();
}

// Un manifest HLS valido inizia con #EXTM3U
export async function isManifestAlive(url) {
  try {
    const res = await fetchWithTimeout(url, { headers: { "User-Agent": UA } }, 7000);
    if (!res.ok) return false;
    const text = await res.text();
    return text.trimStart().startsWith("#EXTM3U");
  } catch {
    return false;
  }
}

// Cerca un URL .m3u8 dentro la pagina ufficiale della diretta
export async function extractM3u8(pageUrl) {
  if (!pageUrl) return null;
  try {
    const res = await fetchWithTimeout(
      pageUrl,
      { headers: { "User-Agent": UA, Referer: pageUrl, "Accept-Language": "fr,en;q=0.8" } },
      8000
    );
    if (!res.ok) return null;
    const html = (await res.text()).replace(/\\\//g, "/").replace(/&amp;/g, "&");
    const m = html.match(/https?:\/\/[^"'\s<>\\]+?\.m3u8[^"'\s<>\\]*/i);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

/**
 * Trova l'URL migliore per un canale HLS:
 * 1) il "source" di channels.json, se risponde
 * 2) un URL estratto dalla pagina ufficiale (sourcePage)
 * Stati: LIVE (verificato), UNVERIFIED (trovato ma non verificabile dal server, il browser può provarlo),
 *        OFFLINE (nessun URL utilizzabile)
 */
export async function resolveChannel(ch) {
  const checkedAt = new Date().toISOString();

  if (ch.source && (await isManifestAlive(ch.source))) {
    return { id: ch.id, url: ch.source, status: "LIVE", via: "source", checkedAt };
  }

  const found = await extractM3u8(ch.sourcePage);
  if (found) {
    const ok = await isManifestAlive(found);
    return { id: ch.id, url: found, status: ok ? "LIVE" : "UNVERIFIED", via: "extracted", checkedAt };
  }

  return { id: ch.id, url: null, status: "OFFLINE", via: null, checkedAt };
}
