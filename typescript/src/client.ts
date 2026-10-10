import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type {
  ApiErrorBody,
  CaseBatchResponse,
  CaseMetadataResponse,
  CiteCheckResponse,
  CitedByResponse,
  DiscoveryResponse,
  BulkJobStart,
  BulkJobStatus,
  BulkRequestItem,
  BulkResult,
  DocumentJobStart,
  DocumentJobStatus,
  DocumentCiteCheckStartOptions,
  GoodLawResponse,
  GoodlawCheckResponse,
  JurisdictionsResponse,
  ResolveCitationResponse,
  RetrieveResponse,
  SearchRequest,
  SearchResponse,
  StatuteRetrieveResponse,
  UsageResponse,
} from "./types.js";

const DEFAULT_BASE = "https://lawdiver.com/api/v1";
/** Identify this examples client; missing User-Agent often fails Cloudflare bot checks (1010). */
export const DEFAULT_USER_AGENT = "LawDiver-API-Examples/1.0 (+https://github.com/lawdiver/LawDiver_api; typescript)";

/** Load KEY=VALUE pairs from a .env file if present (no dependency). */
function loadDotEnv(filePath: string): void {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function resolveApiKey(): string {
  // Walk up a few directories so examples work from typescript/ or repo root.
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "..", ".env"),
    resolve(process.cwd(), "..", "..", ".env"),
  ];
  for (const p of candidates) loadDotEnv(p);

  const key =
    process.env.LAWDIVER_API_KEY?.trim() ||
    process.env.LAWTOOLS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "Missing API key. Set LAWDIVER_API_KEY (or LAWTOOLS_API_KEY) in the environment or a .env file. Create a key at https://lawdiver.com/account/api-keys",
    );
  }
  return key;
}

export class LawDiverApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly requestId: string;
  readonly details?: ApiErrorBody["error"]["details"];

  constructor(status: number, body: ApiErrorBody) {
    super(`${body.error.code}: ${body.error.message} (${body.requestId})`);
    this.name = "LawDiverApiError";
    this.status = status;
    this.code = body.error.code;
    this.requestId = body.requestId;
    this.details = body.error.details;
  }
}

export interface LawDiverClientOptions {
  apiKey?: string;
  baseUrl?: string;
  /** Override User-Agent (default identifies this examples client). */
  userAgent?: string;
  /** Optional fetch implementation (tests / custom agents). */
  fetch?: typeof fetch;
}

/**
 * Thin LawDiver API client -- plain fetch, no SDK magic.
 * Docs: https://lawdiver.com/docs/api
 *
 * This package is an examples client (clone-and-copy), not a published npm SDK.
 */
export class LawDiverClient {
  readonly baseUrl: string;
  readonly userAgent: string;
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: LawDiverClientOptions = {}) {
    this.apiKey = options.apiKey ?? resolveApiKey();
    this.baseUrl = (options.baseUrl ?? process.env.LAWDIVER_API_BASE ?? DEFAULT_BASE).replace(
      /\/$/,
      "",
    );
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
    this.fetchImpl = options.fetch ?? fetch;
  }

  private authHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "User-Agent": this.userAgent,
      ...extra,
    };
  }

  /** Unauthenticated discovery document. */
  async discovery(): Promise<DiscoveryResponse> {
    const res = await this.fetchImpl(this.baseUrl, {
      headers: { "User-Agent": this.userAgent },
    });
    return res.json() as Promise<DiscoveryResponse>;
  }

  async search(body: SearchRequest, idempotencyKey?: string): Promise<SearchResponse> {
    return this.request<SearchResponse>("POST", "/search", body, idempotencyKey);
  }

  async jurisdictions(): Promise<JurisdictionsResponse> {
    return this.request<JurisdictionsResponse>("GET", "/jurisdictions");
  }

  async citeCheck(
    input: { citation: string } | { citations: string[] },
    idempotencyKey?: string,
  ): Promise<CiteCheckResponse> {
    return this.request<CiteCheckResponse>("POST", "/citecheck/cite", input, idempotencyKey);
  }

  async resolveCitation(query: string): Promise<ResolveCitationResponse> {
    return this.request<ResolveCitationResponse>("POST", "/citations/resolve", { query });
  }

  async retrieve(
    body: { query: string; caseId?: string },
    idempotencyKey?: string,
  ): Promise<RetrieveResponse> {
    return this.request<RetrieveResponse>("POST", "/cases/retrieve", body, idempotencyKey);
  }

  /**
   * Pull a statute / regulation / court-rule section by Bluebook citation
   * (section number required) or by authorityKey from cite-check.
   */
  async retrieveStatute(
    body: { query?: string; authorityKey?: string; year?: number },
    idempotencyKey?: string,
  ): Promise<StatuteRetrieveResponse> {
    return this.request<StatuteRetrieveResponse>("POST", "/statutes/retrieve", body, idempotencyKey);
  }

  async caseMetadata(caseId: string): Promise<CaseMetadataResponse> {
    return this.request<CaseMetadataResponse>("GET", `/cases/${encodeURIComponent(caseId)}`);
  }

  async caseBatch(caseIds: string[]): Promise<CaseBatchResponse> {
    return this.request<CaseBatchResponse>("POST", "/cases/batch", { caseIds });
  }

  async goodLaw(caseId: string): Promise<GoodLawResponse> {
    return this.request<GoodLawResponse>("GET", `/cases/${encodeURIComponent(caseId)}/good-law`);
  }

  /**
   * Citing cases with treatment status. A reversal is first when one exists,
   * then the newest cite. `limit` defaults to 10 on the server when omitted.
   */
  async goodlawCheck(
    caseId: string,
    opts: { limit?: "10" | "50" | "100" | "unlimited"; order?: "recent" | "negative" } = {},
  ): Promise<GoodlawCheckResponse> {
    const q = new URLSearchParams();
    if (opts.limit != null) q.set("limit", opts.limit);
    if (opts.order != null) q.set("order", opts.order);
    const qs = q.toString();
    return this.request<GoodlawCheckResponse>(
      "GET",
      `/cases/${encodeURIComponent(caseId)}/goodlaw-check${qs ? `?${qs}` : ""}`,
    );
  }

  async citedBy(
    caseId: string,
    opts: { limit?: number; offset?: number } = {},
  ): Promise<CitedByResponse> {
    const q = new URLSearchParams();
    if (opts.limit != null) q.set("limit", String(opts.limit));
    if (opts.offset != null) q.set("offset", String(opts.offset));
    const qs = q.toString();
    return this.request<CitedByResponse>(
      "GET",
      `/cases/${encodeURIComponent(caseId)}/cited-by${qs ? `?${qs}` : ""}`,
    );
  }

  /** Returns raw PDF bytes. */
  async casePdf(caseId: string): Promise<ArrayBuffer> {
    const res = await this.fetchImpl(`${this.baseUrl}/cases/${encodeURIComponent(caseId)}/pdf`, {
      headers: this.authHeaders(),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as ApiErrorBody | null;
      if (json?.error) throw new LawDiverApiError(res.status, json);
      throw new Error(`PDF download failed: HTTP ${res.status}`);
    }
    return res.arrayBuffer();
  }

  async startDocumentCiteCheck(
    file: Blob,
    fileName: string,
    opts: DocumentCiteCheckStartOptions = {},
  ): Promise<DocumentJobStart> {
    const form = new FormData();
    form.append("file", file, fileName);
    if (opts.delivery) form.append("delivery", opts.delivery);
    for (const addr of opts.emails ?? []) {
      form.append("emails", addr);
    }
    const res = await this.fetchImpl(`${this.baseUrl}/citecheck/document`, {
      method: "POST",
      headers: this.authHeaders(),
      body: form,
    });
    const json = (await res.json()) as DocumentJobStart & ApiErrorBody;
    if (!res.ok) throw new LawDiverApiError(res.status, json as ApiErrorBody);
    return json;
  }

  async documentJob(jobId: string): Promise<DocumentJobStatus> {
    return this.request<DocumentJobStatus>(
      "GET",
      `/citecheck/jobs/${encodeURIComponent(jobId)}`,
    );
  }

  async documentReport(jobId: string): Promise<ArrayBuffer> {
    const res = await this.fetchImpl(
      `${this.baseUrl}/citecheck/jobs/${encodeURIComponent(jobId)}/report`,
      { headers: this.authHeaders() },
    );
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as ApiErrorBody | null;
      if (json?.error) throw new LawDiverApiError(res.status, json);
      throw new Error(`Report download failed: HTTP ${res.status}`);
    }
    return res.arrayBuffer();
  }

  /**
   * Upload -> poll -> optional report download.
   * Caps polling so a stuck job becomes an error instead of an infinite loop.
   */
  async citeCheckDocument(
    file: Blob,
    fileName: string,
    opts: {
      pollMs?: number;
      maxPolls?: number;
      downloadReport?: boolean;
      emails?: string[];
      delivery?: "poll" | "email_link";
    } = {},
  ): Promise<{ job: DocumentJobStatus; report?: ArrayBuffer; started: DocumentJobStart }> {
    const started = await this.startDocumentCiteCheck(file, fileName, {
      emails: opts.emails,
      delivery: opts.delivery,
    });
    const pollMs = opts.pollMs ?? (started.pollAfterSeconds ?? 5) * 1000;
    const maxPolls = opts.maxPolls ?? 120;

    let job = started as unknown as DocumentJobStatus;
    for (let i = 0; i < maxPolls && (job.status === "queued" || job.status === "processing"); i++) {
      await new Promise((r) => setTimeout(r, pollMs));
      job = await this.documentJob(started.jobId);
    }
    if (job.status !== "completed") {
      throw new Error(`Cite check ${job.status}: ${job.error ?? "timed out"}`);
    }
    if (opts.downloadReport) {
      return { job, report: await this.documentReport(started.jobId), started };
    }
    return { job, started };
  }

  /**
   * Upload a list of API calls. Returns a job id immediately.
   * Each call is attempted up to 3 times. Download the result when the job completes.
   */
  async startBulk(requests: BulkRequestItem[]): Promise<BulkJobStart> {
    return this.request<BulkJobStart>("POST", "/bulk", { requests });
  }

  async bulkJob(jobId: string): Promise<BulkJobStatus> {
    return this.request<BulkJobStatus>("GET", `/bulk/jobs/${encodeURIComponent(jobId)}`);
  }

  /** The single combined output. 404 until status is completed or failed. */
  async bulkResult(jobId: string): Promise<BulkResult> {
    return this.request<BulkResult>("GET", `/bulk/jobs/${encodeURIComponent(jobId)}/result`);
  }

  /**
   * Upload, poll, and return one combined document.
   * Every API call has a completion deadline. Bulk retries each call 3 times.
   */
  async bulkUpload(
    requests: BulkRequestItem[],
    opts: { pollMs?: number; maxPolls?: number } = {},
  ): Promise<BulkResult> {
    const started = await this.startBulk(requests);
    const pollMs = opts.pollMs ?? (started.pollAfterSeconds ?? 5) * 1000;
    const maxPolls = opts.maxPolls ?? 360;
    let job: BulkJobStatus = {
      ...started,
      completedCount: 0,
      failedCount: 0,
    };
    for (let i = 0; i < maxPolls && (job.status === "queued" || job.status === "processing"); i++) {
      await new Promise((r) => setTimeout(r, pollMs));
      job = await this.bulkJob(started.jobId);
    }
    if (job.status !== "completed" && job.status !== "failed") {
      throw new Error(`Bulk job still ${job.status} after ${maxPolls} polls. Check ${started.statusUrl}`);
    }
    return this.bulkResult(started.jobId);
  }

  async usage(days = 30): Promise<UsageResponse> {
    return this.request<UsageResponse>("GET", `/usage?days=${days}`);
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<T> {
    const headers: Record<string, string> = this.authHeaders();
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const json = (await res.json()) as T & ApiErrorBody;
    if (!res.ok) throw new LawDiverApiError(res.status, json as ApiErrorBody);
    return json;
  }
}
