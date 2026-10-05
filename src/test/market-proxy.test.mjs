import { describe, expect, it, vi } from "vitest";
import handler from "../../api/market-data";

function response() {
  return { statusCode: 0, setHeader: vi.fn(), end: vi.fn() };
}

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
});
