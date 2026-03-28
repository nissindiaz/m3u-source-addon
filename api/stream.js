const path = require('path');
const data = require(path.join(process.cwd(), 'data/index.json'));

const seriesByKey = {};
data.series.forEach(s => { seriesByKey[s.key] = s; });

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { type, id } = req.query;

  // --- STREAM DE EPISÓDIO ---
  // ID formato: m3u:s:<key>:<season>:<episode>
  if (type === 'series' && id.startsWith('m3u:s:')) {
    const parts = id.split(':');
    // m3u : s : <key...> : <season> : <episode>
    // O key pode ter ":" dentro (ex: "one-piece:leg"), então extraímos do fim
    const episode = parseInt(parts[parts.length - 1], 10);
    const season  = parseInt(parts[parts.length - 2], 10);
    const key     = parts.slice(2, parts.length - 2).join(':');

    const series = seriesByKey[key];
    if (!series) return res.json({ streams: [] });

    const ep = series.episodes.find(e => e.s === season && e.e === episode);
    if (!ep) return res.json({ streams: [] });

    return res.json({
      streams: [{
        url: ep.url,
        title: `▶ ${series.title} S${String(season).padStart(2,'0')}E${String(episode).padStart(2,'0')}`,
        behaviorHints: { notWebReady: false }
      }]
    });
  }

  // --- STREAM DE FILME ---
  // ID formato: m3u:mv:<slug>-<index>
  if (type === 'movie' && id.startsWith('m3u:mv:')) {
    const lastDash = id.lastIndexOf('-');
    const idx = parseInt(id.slice(lastDash + 1), 10);
    const movie = data.movies[idx];
    if (!movie) return res.json({ streams: [] });

    return res.json({
      streams: [{
        url: movie.url,
        title: `▶ ${movie.title}`,
        behaviorHints: { notWebReady: false }
      }]
    });
  }

  return res.json({ streams: [] });
};
