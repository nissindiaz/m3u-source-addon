const path = require('path');
const data = require(path.join(process.cwd(), 'data/index.json'));

// Normaliza string para busca: minúsculas, sem acentos, sem pontuação especial
function norm(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { type, id, extra } = req.query;

  // Extrai o termo de busca do parâmetro extra (ex: "search=dragon+ball")
  let searchTerm = '';
  if (extra) {
    const m = extra.match(/search=([^&]+)/);
    if (m) searchTerm = decodeURIComponent(m[1].replace(/\+/g, ' ').replace(/\.json$/, ''));
  }

  // Sem busca → retorna lista vazia (catálogo não aparece no browse)
  if (!searchTerm) {
    return res.json({ metas: [] });
  }

  const q = norm(searchTerm);

  if (type === 'series' && id === 'm3u-series') {
    const results = data.series
      .filter(s => norm(s.title).includes(q))
      .slice(0, 50)
      .map(s => ({
        id: `m3u:s:${s.key}`,
        type: 'series',
        name: s.title,
        poster: s.poster || null,
        description: `${s.episodes.length} episódios`,
        genres: ['M3U Source']
      }));

    return res.json({ metas: results });
  }

  if (type === 'movie' && id === 'm3u-movies') {
    const results = data.movies
      .filter(m => norm(m.title).includes(q))
      .slice(0, 50)
      .map((m, i) => ({
        id: `m3u:mv:${norm(m.title).replace(/\s+/g, '-').slice(0, 60)}-${i}`,
        type: 'movie',
        name: m.title,
        poster: m.poster || null,
        genres: ['M3U Source']
      }));

    return res.json({ metas: results });
  }

  return res.json({ metas: [] });
};
