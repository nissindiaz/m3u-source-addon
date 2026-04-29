const path = require('path');
const sports = require(path.join(process.cwd(), 'data/sports.json'));

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Catálogos de esportes — aparece no browse E aceita busca por clube/time
  const sportCatalogs = sports.map(cat => ({
    type: 'tv',
    id:   `sport-${cat.id}`,
    name: cat.name,
    extra: [{ name: 'search', isRequired: false }]
  }));

  res.json({
    id: 'br.nissin.m3u-source',
    version: '3.0.0',
    name: 'M3U Source',
    description: 'Streams via M3U — séries, filmes e jogos do dia.',
    logo: 'https://i.imgur.com/8z9VHsQ.png',
    resources: ['catalog', 'meta', 'stream'],
    types: ['series', 'movie', 'tv'],
    catalogs: [
      // Séries e filmes: só via busca
      { type: 'series', id: 'm3u-series', name: 'M3U – Séries & Animes',
        extra: [{ name: 'search', isRequired: true }] },
      { type: 'movie',  id: 'm3u-movies', name: 'M3U – Filmes',
        extra: [{ name: 'search', isRequired: true }] },
      // Esportes: aparece no browse
      ...sportCatalogs
    ],
    idPrefixes: ['tt', 'sport:', 'm3u:']
  });
};
