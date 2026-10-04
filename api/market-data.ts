const POOLS = {
  "ETH/USDC": "0x6f302decb49fb30b2d2c609bdd16e04e7dd096fc",
  "BTC/USDC": "0xd945caee4635bcd7fb8a9fa74dc1d0c4c1472782",
  "EURC/USDC": "0xbe080ac37ad1305dfcc9521f5e6f68cfdc41b7fa",
};

const RESOLUTION = {
  "1m": ["minute", 1],
  "5m": ["minute", 5],
  "15m": ["minute", 15],
  "1h": ["hour", 1],
  "4h": ["hour", 4],
  "1D": ["day", 1],
};

const GECKO_BASE = "https://api.geckoterminal.com/api/v2";
const GECKO_ACCEPT = "application/json;version=20230203";

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Cache-Control",
    status === 200
      ? "public, max-age=0, s-maxage=45, stale-while-revalidate=60"
      : "no-store"
  );
  res.end(JSON.stringify(body));
}

function statsFromCandles(candles) {
  if (!candles.length) return null;
  const latest = candles[candles.length - 1];
  const cutoff = latest.time - 24 * 60 * 60 * 1000;
  const window24h = candles.filter((c) => c.time >= cutoff);
  const prior = [...candles].reverse().find((c) => c.time <= cutoff);
  const rows = window24h.length ? window24h : [latest];

  return {
    price: latest.close,
    change: prior && prior.close ? ((latest.close / prior.close) - 1) * 100 : 0,
    high: Math.max(...rows.map((c) => c.high)),
    low: Math.min(...rows.map((c) => c.low)),
    vol: rows.reduce((sum, c) => sum + Math.max(0, c.volume || 0), 0),
  };
}

export default async function handler(req, res) {
  // This endpoint is a read-only market-data proxy. Reject every method except GET
  // before doing any upstream work, and strictly bound query parameters so a caller
  // cannot turn the proxy into an unbounded upstream resource consumer.
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method not allowed" });
  }

  const pair = String(req.query?.pair || "");
  const timeframe = String(req.query?.timeframe || "4h");
  const requestedCount = req.query?.count === undefined ? 120 : Number(req.query.count);
  const count = Number.isInteger(requestedCount) ? Math.min(Math.max(requestedCount, 2), 500) : 120;

  const pool = POOLS[pair];
  const resolution = RESOLUTION[timeframe];

  if (!pool || !resolution) {
    return json(res, 400, {
      error: "Unsupported Arc market or timeframe",
      supportedPairs: Object.keys(POOLS),
      supportedTimeframes: Object.keys(RESOLUTION),
    });
  }

  const [bucket, aggregate] = resolution;
  const url =
    GECKO_BASE +
    "/networks/arc/pools/" +
    pool +
    "/ohlcv/" +
    bucket +
    "?aggregate=" +
    aggregate +
    "&limit=" +
    count +
    "&currency=usd";

  try {
    const response = await fetch(url, {
      headers: { Accept: GECKO_ACCEPT },
    });

    const payload = await response.json();
    if (!response.ok) {
      return json(res, response.status, {
        error: "GeckoTerminal request failed",
        upstreamStatus: response.status,
        upstream: payload?.errors || payload?.error || null,
      });
    }

    const raw = payload?.data?.attributes?.ohlcv_list;
    if (!Array.isArray(raw) || raw.length < 2) {
      return json(res, 502, {
        error: "GeckoTerminal returned insufficient OHLCV data",
        pair,
        pool,
      });
    }

    const candles = raw
      .map((item) => ({
        time: Number(item?.[0]) * 1000,
        open: Number(item?.[1]),
        high: Number(item?.[2]),
        low: Number(item?.[3]),
        close: Number(item?.[4]),
        volume: Number(item?.[5] || 0),
      }))
      .filter(
        (c) =>
          Number.isFinite(c.time) &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close) &&
          c.close > 0
      )
      .sort((a, b) => a.time - b.time);

    return json(res, 200, {
      pair,
      pool,
      timeframe,
      source: "GeckoTerminal · Arc DEX",
      attribution: "Market data by GeckoTerminal",
      candles,
      stats: statsFromCandles(candles),
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json(res, 502, {
      error: "Unable to reach GeckoTerminal",
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
