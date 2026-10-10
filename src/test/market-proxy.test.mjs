import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/market-data";

function response() {
  return { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
}

afterEach(() => vi.unstubAllGlobals());

describe("read-only market proxy", () => {
  it("rejects inherited property names as unsupported routes", async () => {
    for (const pair of ["__proto__", "constructor", "toString"]) {
      const res = response();
      await handler({ method: "GET", query: { pair, timeframe: "4h" } }, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.end.mock.calls[0][0]).error).toBe("Unsupported Arc market or timeframe");
    }
  });
  it("blocks write methods before any upstream call", async () => {
    const res = response();
    await handler({ method: "POST", query: {} }, res);
    expect(res.statusCode).toBe(405);
    expect(res.setHeader).toHaveBeenCalledWith("Allow", "GET");
  });
  it("proxies published USYC reports and bounds the history without inventing data", async () => {
    const points = Array.from({ length: 10 }, (_, i) => ({ price: String(1.1 + i / 1000), timestamp: String(1700000000 + i * 86400) }));
    const fetchMock = vi.fn(async url => ({ ok: true, json: async () => ({ data: url.endsWith("price-reports") ? points : points[9] }) }));
    vi.stubGlobal("fetch", fetchMock);
    const res = response();
    await handler({ method: "GET", query: { pair: "USYC/USDC", timeframe: "1D", count: 3 } }, res);
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.end.mock.calls[0][0]);
    expect(data.current.data).toEqual(points[9]);
    expect(data.reports.data).toEqual(points.slice(0, 3));
    expect(data.source).toBe("USYC NAV · Hashnote");
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["https://usyc.hashnote.com/api/price", "https://usyc.hashnote.com/api/price-reports"]);
  });
  it("rejects intraday NAV requests before fetching", async () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const res = response();
    await handler({ method: "GET", query: { pair: "USYC/USDC", timeframe: "1h" } }, res);
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("fails closed when the issuer feed is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 503 })));
    const res = response();
    await handler({ method: "GET", query: { pair: "USYC/USDC", timeframe: "1D" } }, res);
    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.end.mock.calls[0][0]).candles).toBeUndefined();
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store");
  });
});
