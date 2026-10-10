import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CITE_VERDICTS,
  DEFAULT_USER_AGENT,
  LawDiverApiError,
  LawDiverClient,
  type CiteCheckItem,
  type CiteVerdict,
} from "../src/index.js";

describe("CiteVerdict taxonomy", () => {
  it("lists the nine production verdicts and excludes not_found", () => {
    assert.equal(CITE_VERDICTS.length, 9);
    assert.ok(!CITE_VERDICTS.includes("not_found" as CiteVerdict));
    for (const v of [
      "valid",
      "name_mismatch",
      "page_mismatch",
      "likely_valid",
      "implausible",
      "not_in_corpus",
      "not_covered",
      "unverified",
      "error",
    ] as const) {
      assert.ok(CITE_VERDICTS.includes(v), `missing ${v}`);
    }
  });

  it("types the rich cite-check row fields", () => {
    const item: CiteCheckItem = {
      inputIndex: 0,
      unitIndex: 0,
      role: "primary",
      citationAsSent: "570 U.S. 744",
      citationAsWritten: "570 U.S. 744",
      verdict: "valid",
      lookupStatus: "completed",
      coverage: { held: true },
      fieldMatches: [{ field: "year", matched: true }],
      candidates: [
        {
          caseId: "2812209",
          knownCitations: [{ cite: "570 U.S. 744", kind: "reporter", preferred: true, matched: true }],
        },
      ],
    };
    assert.equal(item.candidates?.[0]?.knownCitations?.[0]?.cite, "570 U.S. 744");
  });
});

describe("LawDiverClient", () => {
  it("sends User-Agent and Authorization on authenticated calls", async () => {
    const calls: Array<{ url: string; headers: HeadersInit | undefined }> = [];
    const fetchMock: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), headers: init?.headers });
      return new Response(
        JSON.stringify({
          results: [],
          total: 0,
          usage: { operation: "case_search", quantity: 0 },
          requestId: "req_test",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const client = new LawDiverClient({
      apiKey: "ld_live_test",
      baseUrl: "https://example.test/api/v1",
      fetch: fetchMock,
    });

    await client.search({
      query: "test",
      jurisdiction: { type: "us_supreme_court" },
    });

    assert.equal(calls.length, 1);
    const headers = new Headers(calls[0].headers);
    assert.equal(headers.get("Authorization"), "Bearer ld_live_test");
    assert.equal(headers.get("User-Agent"), DEFAULT_USER_AGENT);
    assert.match(headers.get("User-Agent") ?? "", /LawDiver-API-Examples/);
  });

  it("raises LawDiverApiError with requestId on HTTP errors", async () => {
    const fetchMock: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          error: { code: "invalid_api_key", message: "bad key" },
          usage: null,
          requestId: "req_err",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );

    const client = new LawDiverClient({
      apiKey: "ld_live_bad",
      baseUrl: "https://example.test/api/v1",
      fetch: fetchMock,
    });

    await assert.rejects(
      () => client.usage(),
      (err: unknown) => {
        assert.ok(err instanceof LawDiverApiError);
        assert.equal(err.code, "invalid_api_key");
        assert.equal(err.requestId, "req_err");
        assert.equal(err.status, 401);
        return true;
      },
    );
  });

  it("types resolve / batch / good-law return values", async () => {
    const fetchMock: typeof fetch = async (input) => {
      const url = String(input);
      let body: unknown = { requestId: "req_x", usage: { operation: "x", quantity: 0 } };
      if (url.includes("/citations/resolve")) {
        body = {
          verdict: "valid",
          candidates: [{ caseId: "1", caseName: "Roe v. Wade" }],
          usage: { operation: "case_retrieval", quantity: 0 },
          requestId: "req_x",
        };
      } else if (url.includes("/cases/batch")) {
        body = {
          cases: [{ caseId: "1", caseName: "Roe v. Wade" }],
          notFound: [],
          usage: { operation: "case_batch", quantity: 1 },
          requestId: "req_x",
        };
      } else if (url.includes("/goodlaw-check")) {
        body = {
          caseId: "1",
          order: "recent",
          limit: "10",
          total: 1,
          citingCases: [{ citingCaseId: "2", caseName: "Dobbs", status: "overruled", pin: "reversal" }],
          requestId: "req_x",
        };
      } else if (url.includes("/good-law")) {
        body = {
          status: "good_law",
          negative: false,
          unknown: false,
          requestId: "req_x",
        };
      }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    const client = new LawDiverClient({
      apiKey: "ld_live_test",
      baseUrl: "https://example.test/api/v1",
      fetch: fetchMock,
    });

    const resolved = await client.resolveCitation("410 U.S. 113");
    assert.equal(resolved.candidates[0]?.caseName, "Roe v. Wade");

    const batch = await client.caseBatch(["1"]);
    assert.equal(batch.cases[0]?.caseId, "1");

    const gl = await client.goodLaw("1");
    assert.equal(gl.negative, false);

    const check = await client.goodlawCheck("1", { limit: "10", order: "recent" });
    assert.equal(check.citingCases[0]?.status, "overruled");
    assert.equal(check.citingCases[0]?.pin, "reversal");
  });
});
