/**
 * fetch-and-parse.js
 * Baixa o M3U do Xtream Codes e gera data/index.json
 *
 * Uso:
 *   node scripts/fetch-and-parse.js
 *
 * Variáveis de ambiente necessárias:
 *   XTREAM_URL   → ex: http://servidor.com:8880
 *   XTREAM_USER  → seu usuário
 *   XTREAM_PASS  → sua senha
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const URL_BASE = process.env.XTREAM_URL;
const USER     = process.env.XTREAM_USER;
const PASS     = process.env.XTREAM_PASS;

if (!URL_BASE || !USER || !PASS) {
  console.error('❌ Defina XTREAM_URL, XTREAM_USER e XTREAM_PASS');
  process.exit(1);
}

// Xtream Codes: endpoint para baixar M3U completo com todos os grupos
const M3U_URL = `${URL_BASE}/get.php?username=${USER}&password=${PASS}&type=m3u_plus&output=ts`;

// ─── Download do M3U ──────────────────────────────────────────────────────────
function download(url) {
  return new Promise((resolve, reject) => {
    console.log(`⬇️  Baixando M3U: ${url.split('?')[0]}?...`);
    const client = url.startsWith('https') ? https : http;
    let data = '';

    client.get(url, { timeout: 120000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(download(res.headers.location)); // redirect
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// ─── Parser ───────────────────────────────────────────────────────────────────
const SERIES_GROUPS = ['ANIMES', 'SÉRIES', 'SERIES', 'NOVELAS', 'REALITY', 'DOCS', 'TOKUSATSU', 'DORAMA'];
const MOVIE_GROUPS  = ['FILMES'];
const SKIP_GROUPS   = ['JOGOS', 'FUTEBOL', 'NBA', 'NHL', 'PPV', 'CAZE', 'CANAIS', 'ESPORTES', 'NACIONAIS'];

function getCategory(group) {
  if (!group) return null;
  const g = group.toUpperCase();
  if (SKIP_GROUPS.some(s => g.includes(s))) return null;
  if (MOVIE_GROUPS.some(s => g.includes(s)))  return 'movie';
  if (SERIES_GROUPS.some(s => g.includes(s))) return 'series';
  return null;
}

function norm(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function extractEpisode(name) {
  let m;
  m = name.match(/S(\d+)\s*[Ee](\d+)/i);   if (m) return { s: +m[1], e: +m[2] };
  m = name.match(/T(\d+)\s*[Ee](\d+)/i);   if (m) return { s: +m[1], e: +m[2] };
  m = name.match(/(\d+)[xX](\d+)/);         if (m) return { s: +m[1], e: +m[2] };
  m = name.match(/[Ee][Pp]\.?\s*(\d+)/);    if (m) return { s: 1,     e: +m[1] };
  m = name.match(/\s+(\d{1,4})$/);          if (m) return { s: 1,     e: +m[1] };
  return null;
}

function extractShowName(name) {
  return name
    .replace(/\s*-?\s*(legendado|dublado|dub|leg|pt-br|ptbr)\b/gi, '')
    .replace(/\s+S\d+\s*[Ee]\d+.*$/i, '')
    .replace(/\s+T\d+\s*[Ee]\d+.*$/i, '')
    .replace(/\s+\d+[xX]\d+.*$/, '')
    .replace(/\s+[Ee][Pp]\.?\s*\d+.*$/i, '')
    .replace(/\s+\d{1,4}$/, '')
    .trim();
}

function normalizeKey(title) {
  return norm(title
    .replace(/\s*-?\s*(legendado|dublado|dub|leg)\b/gi, '')
    .replace(/\s*\(\d{4}\)\s*$/, ''));
}

function parse(m3uText) {
  const lines = m3uText.split('\n');
  const seriesMap = {};
  const moviesArr = [];
  const movieKeys = new Set();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF')) continue;

    const url = (lines[i + 1] || '').trim();
    if (!url || url.startsWith('#')) continue;

    const nameMatch  = line.match(/tvg-name="([^"]+)"/);
    const logoMatch  = line.match(/tvg-logo="([^"]+)"/);
    const groupMatch = line.match(/group-title="([^"]+)"/);
    if (!nameMatch) continue;

    const name  = nameMatch[1].trim();
    const logo  = logoMatch  ? logoMatch[1]  : '';
    const group = groupMatch ? groupMatch[1] : '';
    const cat   = getCategory(group);
    if (!cat) continue;

    if (cat === 'series') {
      const ep = extractEpisode(name);
      if (!ep) continue;
      const showName = extractShowName(name);
      if (!showName) continue;
      const isLeg = /legendado|leg\b/i.test(name);
      const key = normalizeKey(showName) + (isLeg ? ':leg' : ':dub');

      if (!seriesMap[key]) {
        seriesMap[key] = { title: showName + (isLeg ? ' (Legendado)' : ''), poster: logo, episodes: [] };
      }
      seriesMap[key].episodes.push({ s: ep.s, e: ep.e, url });
    }

    if (cat === 'movie') {
      const mk = normalizeKey(name);
      if (!movieKeys.has(mk)) {
        movieKeys.add(mk);
        moviesArr.push({ title: name, poster: logo, url });
      }
    }
  }

  for (const k of Object.keys(seriesMap)) {
    seriesMap[k].episodes.sort((a, b) => a.s - b.s || a.e - b.e);
  }

  const seriesArr = Object.entries(seriesMap).map(([key, v]) => ({ key, ...v }));
  console.log(`✅ Séries: ${seriesArr.length} | Filmes: ${moviesArr.length}`);
  return { series: seriesArr, movies: moviesArr };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const m3uText = await download(M3U_URL);
    const index   = parse(m3uText);
    const outPath = path.join(__dirname, '..', 'data', 'index.json');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(index));
    console.log(`💾 Salvo em ${outPath} (${(fs.statSync(outPath).size / 1024 / 1024).toFixed(1)} MB)`);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
})();
