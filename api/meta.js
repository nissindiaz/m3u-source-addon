const path = require('path');
const data = require(path.join(process.cwd(), 'data/index.json'));

// Índices em memória para lookup rápido
// Séries: m3u:s:<key>
const seriesByKey = {};
data.series.forEach(s => { seriesByKey[s.key] = s; });

// Filmes: gerado na hora via busca pelo mesmo id do catalog
function norm(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { type, id } = req.query;

  // --- SÉRIE ---
  if (type === 'series' && id.startsWith('m3u:s:')) {
    const key = id.slice('m3u:s:'.length);
    const series = seriesByKey[key];
    if (!series) return res.json({ meta: null });

    // Agrupa por temporada para montar os videos
    const epsBySeason = {};
    for (const ep of series.episodes) {
      if (!epsBySeason[ep.s]) epsBySeason[ep.s] = [];
      epsBySeason[ep.s].push(ep);
    }

    const videos = [];
    for (const [season, eps] of Object.entries(epsBySeason)) {
      for (const ep of eps) {
        videos.push({
          // ID que o Stremio vai usar para pedir o stream
          id: `${id}:${ep.s}:${ep.e}`,
          title: `S${String(ep.s).padStart(2,'0')}E${String(ep.e).padStart(2,'0')}`,
          season: ep.s,
          episode: ep.e,
          thumbnail: series.poster || null
        });
      }
    }

    return res.json({
      meta: {
        id,
        type: 'series',
        name: series.title,
        poster: series.poster || null,
        description: `${series.episodes.length} episódios disponíveis via M3U Source.`,
        genres: ['M3U Source'],
        videos
      }
    });
  }

  // --- FILME ---
  if (type === 'movie' && id.startsWith('m3u:mv:')) {
    // O id tem o sufixo do índice: m3u:mv:<slug>-<index>
    const lastDash = id.lastIndexOf('-');
    const idx = parseInt(id.slice(lastDash + 1), 10);
    const movie = data.movies[idx];
    if (!movie) return res.json({ meta: null });

    return res.json({
      meta: {
        id,
        type: 'movie',
        name: movie.title,
        poster: movie.poster || null,
        genres: ['M3U Source']
      }
    });
  }

  return res.json({ meta: null });
};
