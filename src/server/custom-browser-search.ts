import { isSafeUrl } from './security.js';

export type CustomSearchMode = 'all' | 'images' | 'videos' | 'news' | 'maps';
export type CustomSearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
  image?: string;
  latitude?: string;
  longitude?: string;
};

const cache = new Map<string, { expiresAt: number; data: CustomSearchResult[] }>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const USER_AGENT = 'KvantCustomBrowser/1.0 (autonomous research browser)';

function text(value: unknown) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}
function sourceFor(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}
async function getJson(url: string) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error(`Provedor respondeu HTTP ${response.status}`);
  return response.json();
}
async function searchWikipedia(query: string, limit: number): Promise<CustomSearchResult[]> {
  const data = await getJson(`https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&gsrnamespace=0&prop=extracts%7Cinfo%7Cpageimages&exintro=1&explaintext=1&exsentences=3&inprop=url&pithumbsize=320&format=json&origin=*`);
  return Object.values(data.query?.pages || {}).map((page: any) => ({
    title: page.title,
    url: page.fullurl || `https://pt.wikipedia.org/wiki/${encodeURIComponent(String(page.title).replaceAll(' ', '_'))}`,
    snippet: text(page.extract || 'Resultado da Wikipédia.'),
    source: 'pt.wikipedia.org',
    image: page.thumbnail?.source || ''
  }));
}
async function searchCommons(query: string, limit: number, videos = false): Promise<CustomSearchResult[]> {
  const data = await getJson(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=${Math.min(limit, 40)}&prop=imageinfo&iiprop=url%7Cmime%7Cextmetadata&iiurlwidth=520&format=json&origin=*`);
  return Object.values(data.query?.pages || {}).map((page: any) => {
    const info = page.imageinfo?.[0] || {};
    return {
      title: String(page.title || '').replace(/^File:/, ''),
      url: info.descriptionurl || 'https://commons.wikimedia.org/',
      snippet: text(info.extmetadata?.ImageDescription?.value || (videos ? 'Vídeo disponível no Wikimedia Commons.' : 'Imagem do Wikimedia Commons.')).slice(0, 280),
      source: 'Wikimedia Commons',
      image: videos ? undefined : (info.thumburl || info.url || '')
    };
  }).filter((item) => videos ? true : Boolean(item.image));
}
async function searchNews(query: string, limit: number): Promise<CustomSearchResult[]> {
  const data = await getJson(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&sort=HybridRel&maxrecords=${Math.min(limit, 25)}`);
  return (data.articles || []).map((article: any) => ({
    title: article.title || article.domain || 'Notícia',
    url: article.url,
    snippet: text([article.seendate, article.domain, article.language].filter(Boolean).join(' · ')),
    source: article.domain || sourceFor(article.url),
    image: article.socialimage || ''
  })).filter((item: CustomSearchResult) => /^https?:\/\//i.test(item.url));
}
async function searchMaps(query: string, limit: number): Promise<CustomSearchResult[]> {
  const data = await getJson(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&limit=${Math.min(limit, 10)}&addressdetails=1`);
  return data.map((place: any) => ({
    title: place.name || String(place.display_name || '').split(',')[0],
    url: `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=16/${place.lat}/${place.lon}`,
    snippet: text(place.display_name),
    source: 'OpenStreetMap',
    latitude: place.lat,
    longitude: place.lon
  }));
}
async function searchWeb(query: string, limit: number): Promise<CustomSearchResult[]> {
  // The agent's search index is deliberately independent from Google and does not scrape a search-engine results page.
  const [wiki, commons] = await Promise.allSettled([searchWikipedia(query, limit), searchCommons(query, Math.min(limit, 8))]);
  const results = wiki.status === 'fulfilled' ? wiki.value : [];
  if (commons.status === 'fulfilled') results.push(...commons.value.slice(0, 2));
  if (!results.length) throw new Error('Nenhum provedor público retornou resultados interpretáveis.');
  return results.slice(0, limit);
}

export async function customBrowserSearch(query: string, mode: CustomSearchMode = 'all', maxResults = 8) {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) throw new Error('Informe um termo de pesquisa.');
  const limit = Math.min(20, Math.max(1, Number(maxResults) || 8));
  const key = `${mode}:${cleanQuery.toLocaleLowerCase('pt-BR')}:${limit}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return { query: cleanQuery, mode, results: cached.data, provider: providerName(mode), browserUsed: true };
  let results: CustomSearchResult[];
  let provider = providerName(mode);
  if (mode === 'images') results = await searchCommons(cleanQuery, limit);
  else if (mode === 'videos') results = await searchCommons(cleanQuery, limit, true);
  else if (mode === 'news') {
    try {
      results = await searchNews(cleanQuery, limit);
    } catch {
      results = await searchWeb(cleanQuery, limit);
      provider = 'Kvant Index + Wikipédia (fallback de notícias)';
    }
  } else if (mode === 'maps') results = await searchMaps(cleanQuery, limit);
  else results = await searchWeb(cleanQuery, limit);
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data: results });
  return { query: cleanQuery, mode, results, provider, browserUsed: true };
}
function providerName(mode: CustomSearchMode): string {
  return ({ all: 'Kvant Index + Wikipédia', images: 'Wikimedia Commons', videos: 'Wikimedia Commons', news: 'GDELT', maps: 'OpenStreetMap' } as const)[mode];
}
export function validateSearchResultUrls(results: CustomSearchResult[]) {
  return results.filter((result) => isSafeUrl(result.url).isSafe);
}
