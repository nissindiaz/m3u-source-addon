/**
 * parse-sports.js
 * Extrai jogos/canais esportivos do M3U e retorna estrutura por categoria.
 */

const SPORT_GROUPS = {
  'JOGOS DO DIA - FUTEBOL': { id: 'futebol', name: '⚽ Futebol',     type: 'game' },
  'JOGOS DO DIA - NBA':     { id: 'nba',     name: '🏀 NBA',          type: 'game' },
  'JOGOS DO DIA - VBTV':    { id: 'volei',   name: '🏐 Vôlei',        type: 'game' },
  'NHL | PPV+':             { id: 'nhl',     name: '🏒 NHL',           type: 'game' },
  'OUTROS JOGOS':           { id: 'outros',  name: '🏟️ Outros Jogos', type: 'game' },
  'CAZE TV | PPV+':         { id: 'caze',    name: '🎮 CazéTV',        type: 'game' },
  'DISNEY+ | PPV+':         { id: 'disney',  name: '🎬 Disney+ PPV',   type: 'game' },
  'GOAT - PPV+':            { id: 'goat',    name: '🐐 GOAT PPV',      type: 'game' },
  'DAZN | PPV+':            { id: 'dazn',    name: '📡 DAZN',          type: 'game' },
  'ONEFOOTBALL PPV+':       { id: 'oneft',   name: '⚽ OneFootball',   type: 'game' },
  'ESPORTES':               { id: 'canais',  name: '📺 Canais Esp.',   type: 'channel' },
  'ESPORTES | PPV':         { id: 'canais',  name: '📺 Canais Esp.',   type: 'channel' },
  'SPORTV':                 { id: 'canais',  name: '📺 Canais Esp.',   type: 'channel' },
  'PREMIERE':               { id: 'canais',  name: '📺 Canais Esp.',   type: 'channel' },
  'F1 TV | PPV+':           { id: 'f1',      name: '🏎️ F1',            type: 'channel' },
  'COMBATE - UFC':          { id: 'ufc',     name: '🥊 UFC / MMA',     type: 'channel' },
  'NFL':                    { id: 'nfl',     name: '🏈 NFL',           type: 'channel' },
  'FIFA 22 - COPA MUNDO':   { id: 'fifa',    name: '🏆 Copa do Mundo', type: 'channel' },
};

// Normaliza chave para agrupar sinais do mesmo jogo
// Ex: "Cremonese X Fiorentina | Campeonato Italiano - SINAL 1 - 16/03"
//  →  "cremonese x fiorentina | campeonato italiano"
function gameKey(name) {
  return name
    .toLowerCase()
    .replace(/\bppv\+?\b/gi, '')
    .replace(/\[.*?\]/g, '')          // remove [NBA], [CAZE], etc.
    .replace(/-?\s*sinal\s*\d+/gi, '') // remove "SINAL 1", "SINAL 2"
    .replace(/-?\s*\d{1,2}\/\d{2}\b/g, '') // remove data "16/03"
    .replace(/\s+/g, ' ')
    .trim();
}

// Extrai horário do nome
function extractTime(name) {
  const m = name.match(/(\d{1,2})[h:](\d{2})/);
  return m ? `${m[1].padStart(2,'0')}:${m[2]}` : null;
}

// Extrai número do sinal
function extractSignal(name) {
  const m = name.match(/sinal\s*(\d+)/i);
  return m ? parseInt(m[1]) : 1;
}

// Limpa o título para exibição
function cleanTitle(name) {
  return name
    .replace(/\bppv\+?\b/gi, '')
    .replace(/\[.*?\]/g, '')
    .replace(/-?\s*sinal\s*\d+/gi, '')
    .replace(/-?\s*\d{1,2}\/\d{2}\b/g, '')
    .replace(/^\d{1,2}[h:]\d{2}\s*[-–]?\s*/i, '') // remove horário do início
    .replace(/\d{1,2}\/\d{2}\s+\d{1,2}[h:]\d{2}\s*/i, '') // remove "16/03 20:00"
    .replace(/\s*[-–]\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSports(lines) {
  // Mapa: catId → { id, name, type, gamesMap: { key → game } }
  const catMap = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF')) continue;

    const url = (lines[i + 1] || '').trim();
    if (!url || url.startsWith('#')) continue;

    const nameMatch  = line.match(/tvg-name="([^"]+)"/);
    const logoMatch  = line.match(/tvg-logo="([^"]+)"/);
    const groupMatch = line.match(/group-title="([^"]+)"/);
    if (!nameMatch || !groupMatch) continue;

    const name  = nameMatch[1].trim();
    const logo  = logoMatch ? logoMatch[1] : '';
    const group = groupMatch[1];

    const sportDef = SPORT_GROUPS[group];
    if (!sportDef) continue;

    const catId = sportDef.id;
    if (!catMap[catId]) {
      catMap[catId] = { id: catId, name: sportDef.name, type: sportDef.type, gamesMap: {} };
    }

    const key    = gameKey(name);
    const title  = cleanTitle(name);
    const time   = extractTime(name);
    const signal = extractSignal(name);

    if (!catMap[catId].gamesMap[key]) {
      catMap[catId].gamesMap[key] = {
        title: title || name,
        time,
        poster: logo,
        streams: []
      };
    }

    catMap[catId].gamesMap[key].streams.push({
      label: `Sinal ${signal}`,
      url
    });

    // Usa logo do primeiro sinal
    if (!catMap[catId].gamesMap[key].poster && logo) {
      catMap[catId].gamesMap[key].poster = logo;
    }
  }

  // Converte para array e ordena por horário
  const categories = Object.values(catMap).map(cat => {
    const games = Object.values(cat.gamesMap)
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
    return { id: cat.id, name: cat.name, type: cat.type, games };
  });

  // Ordena categorias: jogos do dia primeiro
  categories.sort((a, b) => {
    const order = ['futebol','nba','nhl','volei','outros','caze','disney','goat','dazn','oneft','canais','ufc','f1','nfl','fifa'];
    return order.indexOf(a.id) - order.indexOf(b.id);
  });

  return categories;
}

module.exports = { parseSports };
