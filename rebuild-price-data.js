const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const PRICE_JSON_PATH = path.join(ROOT, 'price-data.json');
const PRICE_JS_PATH = path.join(ROOT, 'price-data.js');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36';

const STORE_IDS = {
  steam: 61,
  epic: 16
};

const STORE_META = {
  steam: { source: 'Steam' },
  epic: { source: 'Epic Games Store' }
};

const SLUG_BY_KEY = {
  minecraft: 'minecraft-java-and-bedrock-edition',
  rdr2: 'red-dead-redemption-2',
  'god-of-war': 'god-of-war',
  valorant: 'valorant',
  'where-winds-meet': 'where-winds-meet',
  'once-human': 'once-human',
  'no-mans-sky': 'no-mans-sky',
  'asphalt-legends': 'asphalt-legends',
  cs2: 'counter-strike-2',
  'forza-horizon-5': 'forza-horizon-5',
  'gta-5': 'grand-theft-auto-v',
  'cyberpunk-2077': 'cyberpunk-2077',
  'elden-ring': 'elden-ring',
  'ghost-of-tsushima': 'ghost-of-tsushima-directors-cut',
  'horizon-forbidden-west': 'horizon-forbidden-west-complete-edition',
  'zelda-botw': 'the-legend-of-zelda-breath-of-the-wild',
  'the-witcher-3': 'the-witcher-3-wild-hunt-complete-edition',
  skyrim: 'the-elder-scrolls-v-skyrim-special-edition',
  'final-fantasy-vii-rebirth': 'final-fantasy-vii-rebirth',
  'baldurs-gate-3': 'baldurs-gate-3',
  'gran-turismo-7': 'gran-turismo-7',
  'need-for-speed-heat': 'need-for-speed-heat',
  'f1-24': 'f1-24',
  'mario-kart-8-deluxe': 'mario-kart-8-deluxe',
  'cod-mw3': 'call-of-duty-modern-warfare-iii',
  'god-of-war-ragnarok': 'god-of-war-ragnarok',
  'spider-man-2': 'marvels-spider-man-2',
  'assassins-creed-mirage': 'assassins-creed-mirage',
  starfield: 'starfield'
};

const TITLE_BY_KEY = {
  minecraft: 'Minecraft: Java & Bedrock Edition',
  rdr2: 'Red Dead Redemption 2',
  'god-of-war': 'God of War',
  valorant: 'Valorant',
  'where-winds-meet': 'Where Winds Meet',
  'once-human': 'Once Human',
  'no-mans-sky': "No Man's Sky",
  'asphalt-legends': 'Asphalt Legends',
  cs2: 'Counter-Strike 2',
  'forza-horizon-5': 'Forza Horizon 5',
  'gta-5': 'Grand Theft Auto V',
  'cyberpunk-2077': 'Cyberpunk 2077',
  'elden-ring': 'Elden Ring',
  'ghost-of-tsushima': "Ghost of Tsushima DIRECTOR'S CUT",
  'horizon-forbidden-west': 'Horizon Forbidden West Complete Edition',
  'zelda-botw': 'The Legend of Zelda: Breath of the Wild',
  'the-witcher-3': 'The Witcher 3: Wild Hunt - Complete Edition',
  skyrim: 'The Elder Scrolls V: Skyrim Special Edition',
  'final-fantasy-vii-rebirth': 'Final Fantasy VII Rebirth',
  'baldurs-gate-3': "Baldur's Gate 3",
  'gran-turismo-7': 'Gran Turismo 7',
  'need-for-speed-heat': 'Need for Speed Heat',
  'f1-24': 'F1 24',
  'mario-kart-8-deluxe': 'Mario Kart 8 Deluxe',
  'cod-mw3': 'Call of Duty: Modern Warfare III',
  'god-of-war-ragnarok': 'God of War Ragnarök',
  'spider-man-2': "Marvel's Spider-Man 2",
  'assassins-creed-mirage': "Assassin's Creed Mirage",
  starfield: 'Starfield'
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: 'GET',
        headers: {
          'user-agent': USER_AGENT,
          ...headers
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            url
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function parseVar(body, startMarker, endMarker) {
  const start = body.indexOf(startMarker);
  if (start < 0) return null;
  const from = start + startMarker.length;
  const end = body.indexOf(endMarker, from);
  if (end < 0) return null;
  const raw = body.slice(from, end);
  try {
    // Using eval against trusted remote JSON-like literals from ITAD page script.
    return eval(`(${raw})`);
  } catch {
    return null;
  }
}

function b64UrlDecode(str) {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return JSON.parse(Buffer.from(s, 'base64').toString('utf8'));
}

function b64UrlEncode(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function toMoneyFromCents(value) {
  if (typeof value !== 'number') return null;
  return Math.round((value / 100) * 100) / 100;
}

function toIso(tsMs) {
  return new Date(tsMs).toISOString();
}

function fmtUpdatedAt(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss} UTC`;
}

function monthKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getLast12MonthRanges(now) {
  const ranges = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1, 0, 0, 0));
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1, 0, 0, 0));
    const end = new Date(next.getTime() - 1);
    ranges.push({ month: monthKey(start), start: start.getTime(), end: end.getTime() });
  }
  return ranges;
}

function compressSeries(rawSeries, startMs, nowMs) {
  if (!Array.isArray(rawSeries) || !rawSeries.length) return [];

  const all = rawSeries
    .map((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return null;
      const ts = Number(entry[0]);
      const price = Number(entry[1]);
      if (!Number.isFinite(ts) || !Number.isFinite(price)) return null;
      return { ts, price };
    })
    .filter(Boolean)
    .sort((a, b) => a.ts - b.ts);

  if (!all.length) return [];

  const preStart = [...all].reverse().find((p) => p.ts < startMs) || null;
  let points = all.filter((p) => p.ts >= startMs && p.ts <= nowMs);

  if (preStart) {
    points.unshift({ ts: startMs, price: preStart.price });
  }

  if (!points.length) {
    const last = [...all].reverse().find((p) => p.ts <= nowMs);
    if (last) {
      points = [
        { ts: startMs, price: last.price },
        { ts: nowMs, price: last.price }
      ];
    }
  }

  const compressed = [];
  for (const point of points) {
    const prev = compressed[compressed.length - 1];
    if (!prev) {
      compressed.push(point);
      continue;
    }
    if (Math.abs(prev.price - point.price) < 0.0001) {
      prev.ts = point.ts;
    } else {
      compressed.push(point);
    }
  }

  const last = compressed[compressed.length - 1];
  if (last && last.ts < nowMs) {
    compressed.push({ ts: nowMs, price: last.price });
  }

  return compressed;
}

function mergeStoreSeries(steamSeries, epicSeries) {
  const stamps = new Set();
  for (const p of steamSeries) stamps.add(p.ts);
  for (const p of epicSeries) stamps.add(p.ts);

  if (!stamps.size) return [];

  const times = [...stamps].sort((a, b) => a - b);
  const merged = [];

  let si = 0;
  let ei = 0;
  let steamVal = null;
  let epicVal = null;

  for (const ts of times) {
    while (si < steamSeries.length && steamSeries[si].ts <= ts) {
      steamVal = steamSeries[si].price;
      si += 1;
    }
    while (ei < epicSeries.length && epicSeries[ei].ts <= ts) {
      epicVal = epicSeries[ei].price;
      ei += 1;
    }
    merged.push({
      at: toIso(ts),
      steam: steamVal,
      epic: epicVal
    });
  }

  const compact = [];
  for (const row of merged) {
    const prev = compact[compact.length - 1];
    if (
      prev &&
      prev.steam === row.steam &&
      prev.epic === row.epic
    ) {
      prev.at = row.at;
    } else {
      compact.push(row);
    }
  }

  return compact;
}

function monthlyFromPoints(points, now) {
  const ranges = getLast12MonthRanges(now);
  if (!Array.isArray(points) || !points.length) {
    return ranges.map((r) => ({ month: r.month, steam: null, epic: null }));
  }

  const tsPoints = points
    .map((p) => ({
      ts: Date.parse(p.at),
      steam: typeof p.steam === 'number' ? p.steam : null,
      epic: typeof p.epic === 'number' ? p.epic : null
    }))
    .filter((p) => Number.isFinite(p.ts))
    .sort((a, b) => a.ts - b.ts);

  return ranges.map((r) => {
    let steam = null;
    let epic = null;
    for (const p of tsPoints) {
      if (p.ts > r.end) break;
      steam = p.steam;
      epic = p.epic;
    }
    return { month: r.month, steam, epic };
  });
}

function extractStoreSnapshot(historyLog, shopId) {
  const logRows = Array.isArray(historyLog?.log) ? historyLog.log : [];
  for (const row of logRows) {
    if (row?.shop !== shopId) continue;
    if (!row.current || !Array.isArray(row.current.new) || !Array.isArray(row.current.old)) continue;
    const currentCents = Number(row.current.new[0]);
    const normalCents = Number(row.current.old[0]);
    const currency = row.current.new[1] || 'USD';

    return {
      available: Number.isFinite(currentCents),
      free: Number.isFinite(currentCents) && currentCents <= 0,
      current: Number.isFinite(currentCents) ? toMoneyFromCents(currentCents) : null,
      normal: Number.isFinite(normalCents) ? toMoneyFromCents(normalCents) : null,
      currency,
      source: shopId === STORE_IDS.steam ? STORE_META.steam.source : STORE_META.epic.source
    };
  }

  return {
    available: false,
    free: false,
    current: null,
    normal: null,
    currency: 'USD',
    source: shopId === STORE_IDS.steam ? STORE_META.steam.source : STORE_META.epic.source
  };
}

function normalizeTitle(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scoreCandidate(query, candidateTitle) {
  const q = normalizeTitle(query);
  const c = normalizeTitle(candidateTitle);
  if (!q || !c) return 0;
  if (q === c) return 1000;

  let score = 0;
  if (c.includes(q)) score += 500;
  if (q.includes(c)) score += 400;

  const qTokens = q.split(' ');
  const cTokens = new Set(c.split(' '));
  let hit = 0;
  for (const t of qTokens) {
    if (cTokens.has(t)) hit += 1;
  }

  score += Math.round((hit / Math.max(1, qTokens.length)) * 300);
  score -= Math.abs(c.length - q.length);
  return score;
}

async function searchGameIdByTitle(title) {
  const resp = await request(`https://isthereanydeal.com/search/api/all/?q=${encodeURIComponent(title)}`);
  if (resp.status !== 200) return null;

  let parsed;
  try {
    parsed = JSON.parse(resp.body);
  } catch {
    return null;
  }

  const games = Array.isArray(parsed.games) ? parsed.games : [];
  if (!games.length) return null;

  const scored = games
    .map((g) => ({
      id: g.id,
      slug: g.slug,
      title: g.title,
      type: g.type,
      score: scoreCandidate(title, g.title)
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0] || null;
}

async function bootstrapSession() {
  const seedUrl = 'https://isthereanydeal.com/game/red-dead-redemption-2/history/';
  const pageResp = await request(seedUrl);
  if (pageResp.status !== 200) {
    throw new Error(`Failed bootstrap page: ${pageResp.status}`);
  }

  const gObj = parseVar(pageResp.body, 'var g = ', ';\nvar page =');
  if (!gObj?.user?.token) {
    throw new Error('Failed to parse ITAD session token from page');
  }

  const cookies = (pageResp.headers['set-cookie'] || []).map((v) => v.split(';')[0]).join('; ');
  if (!cookies) {
    throw new Error('Failed to capture ITAD session cookies');
  }

  return {
    token: gObj.user.token,
    cookie: cookies
  };
}

function buildApiHeaders(session, referer) {
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    'itad-sessiontoken': session.token,
    cookie: session.cookie,
    referer
  };
}

async function fetchHistoryForGame({ key, slug, gid, session, now }) {
  const referer = `https://isthereanydeal.com/game/${slug}/history/`;
  const headers = buildApiHeaders(session, referer);

  const cfgResp = await request(`https://isthereanydeal.com/api/history/config/${gid}/`, headers);
  if (cfgResp.status !== 200) {
    throw new Error(`config ${cfgResp.status}: ${cfgResp.body.slice(0, 120)}`);
  }

  const cfgJson = JSON.parse(cfgResp.body);
  if (!cfgJson?.config) {
    throw new Error('config payload missing');
  }

  const cfgObj = b64UrlDecode(cfgJson.config);
  const usCfgObj = {
    ...cfgObj,
    region: 'US',
    currency: 'USD'
  };
  const usCfg = b64UrlEncode(usCfgObj);

  const logResp = await request(`https://isthereanydeal.com/api/history/log/${gid}/${usCfg}/`, headers);
  if (logResp.status !== 200) {
    throw new Error(`log ${logResp.status}: ${logResp.body.slice(0, 120)}`);
  }
  const chartResp = await request(`https://isthereanydeal.com/api/history/charts/${gid}/${usCfg}/`, headers);
  if (chartResp.status !== 200) {
    throw new Error(`charts ${chartResp.status}: ${chartResp.body.slice(0, 120)}`);
  }

  const historyLog = JSON.parse(logResp.body);
  const historyChart = JSON.parse(chartResp.body);

  const nowMs = now.getTime();
  const startMs = Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate(), 0, 0, 0);

  const steamRaw = historyChart?.prices?.series?.shops?.[String(STORE_IDS.steam)] || [];
  const epicRaw = historyChart?.prices?.series?.shops?.[String(STORE_IDS.epic)] || [];

  const steamSeries = compressSeries(steamRaw, startMs, nowMs);
  const epicSeries = compressSeries(epicRaw, startMs, nowMs);

  const mergedPoints = mergeStoreSeries(steamSeries, epicSeries);

  const steamStore = extractStoreSnapshot(historyLog, STORE_IDS.steam);
  const epicStore = extractStoreSnapshot(historyLog, STORE_IDS.epic);

  return {
    points: mergedPoints,
    monthly: monthlyFromPoints(mergedPoints, now),
    stores: {
      steam: steamStore,
      epic: epicStore
    },
    usConfig: usCfgObj,
    debug: {
      steamPoints: steamSeries.length,
      epicPoints: epicSeries.length,
      mergedPoints: mergedPoints.length,
      usRegion: usCfgObj.region,
      usCurrency: usCfgObj.currency
    }
  };
}

async function run() {
  const now = new Date();
  const existingRaw = fs.readFileSync(PRICE_JSON_PATH, 'utf8').replace(/^\uFEFF/, '');
  const existing = JSON.parse(existingRaw);
  const result = {};

  let session = await bootstrapSession();

  const keys = Object.keys(existing);
  let processed = 0;

  for (const key of keys) {
    const original = existing[key] || {};
    const title = TITLE_BY_KEY[key] || original.title || key;
    const slug = SLUG_BY_KEY[key];

    process.stdout.write(`\n[${processed + 1}/${keys.length}] ${key} -> ${title}\n`);

    let gameMeta = null;

    try {
      if (slug) {
        const pageResp = await request(`https://isthereanydeal.com/game/${slug}/history/`);
        if (pageResp.status === 200) {
          const pageVar = parseVar(pageResp.body, 'var page = ', ';\nvar sentry =');
          const game = pageVar?.[1]?.game;
          if (game?.id) {
            gameMeta = {
              id: game.id,
              slug: game.slug,
              title: game.title,
              source: 'slug'
            };
          }
        }
      }

      if (!gameMeta) {
        const searched = await searchGameIdByTitle(title);
        if (searched?.id) {
          gameMeta = {
            id: searched.id,
            slug: searched.slug,
            title: searched.title,
            source: 'search'
          };
        }
      }

      if (!gameMeta) {
        throw new Error('No ITAD game match found');
      }

      let fetched;
      try {
        fetched = await fetchHistoryForGame({
          key,
          slug: gameMeta.slug,
          gid: gameMeta.id,
          session,
          now
        });
      } catch (err) {
        // Retry once with a fresh session when token expires.
        if (/Invalid session token/i.test(String(err.message)) || /400:/.test(String(err.message))) {
          session = await bootstrapSession();
          fetched = await fetchHistoryForGame({
            key,
            slug: gameMeta.slug,
            gid: gameMeta.id,
            session,
            now
          });
        } else {
          throw err;
        }
      }

      result[key] = {
        title: title,
        updatedAt: fmtUpdatedAt(now),
        freeExternal: Boolean(original.freeExternal),
        stores: {
          steam: fetched.stores.steam,
          epic: fetched.stores.epic
        },
        historyPoints: fetched.points,
        history: fetched.monthly,
        dataSource: 'isthereanydeal-site-history',
        match: {
          gid: gameMeta.id,
          slug: gameMeta.slug,
          title: gameMeta.title,
          via: gameMeta.source
        }
      };

      process.stdout.write(
        `  OK gid=${gameMeta.id} slug=${gameMeta.slug} points=${fetched.debug.mergedPoints} steam=${fetched.debug.steamPoints} epic=${fetched.debug.epicPoints}\n`
      );
    } catch (err) {
      result[key] = {
        ...original,
        updatedAt: fmtUpdatedAt(now),
        error: String(err.message || err)
      };
      process.stdout.write(`  FAIL ${String(err.message || err)}\n`);
    }

    processed += 1;
    await sleep(180);
  }

  fs.writeFileSync(PRICE_JSON_PATH, JSON.stringify(result, null, 2));
  fs.writeFileSync(PRICE_JS_PATH, `window.ALIVE_PRICE_DATA = ${JSON.stringify(result, null, 2)};\n`);

  process.stdout.write(`\nUpdated ${PRICE_JSON_PATH} and ${PRICE_JS_PATH}\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

