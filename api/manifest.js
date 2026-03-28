module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  res.json({
    id: 'br.nissin.m3u-source',
    version: '2.0.0',
    name: 'M3U Source',
    description: 'Streams via M3U — aparece automaticamente nos filmes e séries do Stremio.',
    logo: 'https://i.imgur.com/8z9VHsQ.png',

    // Apenas stream — não polui nenhum catálogo
    resources: ['stream'],
    types: ['series', 'movie'],
    catalogs: [],

    // Responde a qualquer ID IMDB (tt...)
    idPrefixes: ['tt']
  });
};
