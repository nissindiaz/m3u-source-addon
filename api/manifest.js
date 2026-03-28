module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  res.json({
    id: 'br.nissin.m3u-source',
    version: '1.0.0',
    name: 'M3U Source',
    description: 'Fonte de streams via M3U — busque qualquer série, anime ou filme.',
    logo: 'https://i.imgur.com/8z9VHsQ.png',
    resources: ['catalog', 'meta', 'stream'],
    types: ['series', 'movie'],
    // isRequired: true → catálogo SÓ aparece quando o usuário busca.
    // Nunca polui o Discover/Browse.
    catalogs: [
      {
        type: 'series',
        id: 'm3u-series',
        name: 'M3U – Séries & Animes',
        extra: [{ name: 'search', isRequired: true }]
      },
      {
        type: 'movie',
        id: 'm3u-movies',
        name: 'M3U – Filmes',
        extra: [{ name: 'search', isRequired: true }]
      }
    ],
    idPrefixes: ['m3u:']
  });
};
