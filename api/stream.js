const https = require('https');
const path  = require('path');
const data  = require(path.join(process.cwd(), 'data/index.json'));

// ─── Índice de busca por título normalizado ────────────────────────────────
function norm(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// Agrupa séries por título normalizado (sem "(Legendado)")
const seriesByTitle = {};
data.series.forEach(s => {
  const key = norm(s.title.replace(/\s*\(legendado\)/i, '').trim());
  if (!seriesByTitle[key]) seriesByTitle[key] = [];
  seriesByTitle[key].push(s);
});

// Índice de filmes por título normalizado (sem ano)
const moviesByTitle = {};
data.movies.forEach(m => {
  const key = norm(m.title.replace(/\s*\(\d{4}\)\s*$/, ''));
  if (!moviesByTitle[key]) moviesByTitle[key] = [];
  moviesByTitle[key].push(m);
});

// ─── Cache de títulos IMDB → nome (persiste entre invocações warm) ─────────
const titleCache = {};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 6000 }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function getTitleFromIMDB(type, imdbId) {
  if (titleCache[imdbId]) return titleCache[imdbId];
  try {
    // Cinemeta é o addon oficial do Stremio — não precisa de API key
    const d = await fetchJSON(`https://v3-cinemeta.strem.io/meta/${type}/${imdbId}.json`);
    const title = d.meta?.name;
    if (title) titleCache[imdbId] = title;
    return title || null;
  } catch {
    return null;
  }
}

// ─── Handler ───────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { type, id } = req.query;

  // ── SÉRIE: id formato "tt0388629:1:1" ────────────────────────────────────
  if (type === 'series') {
    const parts   = id.split(':');
    const imdbId  = parts[0];
    const season  = parseInt(parts[1], 10);
    const episode = parseInt(parts[2], 10);

    if (!imdbId.startsWith('tt') || isNaN(season) || isNaN(episode)) {
      return res.json({ streams: [] });
    }

    const title = await getTitleFromIMDB('series', imdbId);
    if (!title) return res.json({ streams: [] });

    const matches = seriesByTitle[norm(title)] || [];
    const streams = [];

    for (const series of matches) {
      const ep = series.episodes.find(e => e.s === season && e.e === episode);
      if (ep) {
        streams.push({
          url: ep.url,
          name: 'M3U Source',
          title: series.title.toLowerCase().includes('legendado')
            ? `Legendado • S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}`
            : `Dublado • S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}`,
          behaviorHints: { notWebReady: false }
        });
      }
    }

    return res.json({ streams });
  }

  // ── FILME: id formato "tt0388629" ─────────────────────────────────────────
  if (type === 'movie') {
    if (!id.startsWith('tt')) return res.json({ streams: [] });

    const title = await getTitleFromIMDB('movie', id);
    if (!title) return res.json({ streams: [] });

    const matches = moviesByTitle[norm(title)] || [];
    const streams = matches.map(m => ({
      url: m.url,
      name: 'M3U Source',
      title: m.title,
      behaviorHints: { notWebReady: false }
    }));

    return res.json({ streams });
  }

  return res.json({ streams: [] });
};
