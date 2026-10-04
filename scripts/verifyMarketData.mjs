const BASE = "https://api.geckoterminal.com/api/v2";
const ACCEPT = "application/json;version=20230203";

const pools = {
  "ETH/USDC": "0x6f302decb49fb30b2d2c609bdd16e04e7dd096fc",
  "BTC/USDC": "0xd945caee4635bcd7fb8a9fa74dc1d0c4c1472782",
  "EURC/USDC": "0xbe080ac37ad1305dfcc9521f5e6f68cfdc41b7fa",
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

for (const [pair, pool] of Object.entries(pools)) {
  const url =
    BASE +
    "/networks/arc/pools/" +
    pool +
    "/ohlcv/hour?aggregate=1&limit=3&currency=usd";

  const response = await fetch(url, {
    headers: { Accept: ACCEPT },
  });

  if (!response.ok) {
    throw new Error(pair + " GeckoTerminal HTTP " + response.status);
  }

  const payload = await response.json();
  const rows = payload?.data?.attributes?.ohlcv_list;

  if (!Array.isArray(rows) || rows.length < 2) {
    throw new Error(pair + " returned insufficient OHLCV rows");
  }

  const latest = rows[0];
  if (!Array.isArray(latest) || latest.length < 6) {
    throw new Error(pair + " returned malformed OHLCV row");
  }

  console.log(
    "PASS",
    pair,
    "pool=" + pool,
    "latest=" + latest[4],
    "rows=" + rows.length,
  );

  await sleep(350);
}

console.log("GeckoTerminal Arc market-data smoke test passed.");
