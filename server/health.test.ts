import { describe, expect, it } from "vitest";
import { buildHealthResponse } from "./health";

describe("health response", () => {
  it("returns ok only when every check is ok", () => {
    const response = buildHealthResponse(
      {
        service: { status: "ok" },
        database: { status: "ok" },
        nbgEngine: { status: "ok" },
      },
      new Date("2026-06-25T10:00:00.000Z")
    );

    expect(response).toEqual({
      status: "ok",
      timestamp: "2026-06-25T10:00:00.000Z",
      checks: {
        service: { status: "ok" },
        database: { status: "ok" },
        nbgEngine: { status: "ok" },
      },
    });
  });

  it("returns unhealthy when DB or engine is unavailable without exposing URLs", () => {
    const response = buildHealthResponse({
      service: { status: "ok" },
      database: { status: "unhealthy", error: "Database not initialized" },
      nbgEngine: { status: "ok" },
    });

    expect(response.status).toBe("unhealthy");
    expect(JSON.stringify(response)).not.toContain("NBG_ENGINE_URL");
    expect(JSON.stringify(response)).not.toContain("http://");
  });
});
