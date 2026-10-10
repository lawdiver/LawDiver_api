"""LawDiver API client (Python).

Docs: https://lawdiver.com/docs/api
Base: https://lawdiver.com/api/v1
"""

from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any, Mapping, MutableMapping, Optional

import httpx
from dotenv import load_dotenv

DEFAULT_BASE = "https://lawdiver.com/api/v1"
# Identify this examples client; bare urllib with no User-Agent often fails Cloudflare (1010).
DEFAULT_USER_AGENT = (
    "LawDiver-API-Examples/1.0 (+https://github.com/lawdiver/LawDiver_api; python)"
)


def _load_env() -> None:
    for candidate in (Path.cwd() / ".env", Path.cwd().parent / ".env", Path.cwd().parent.parent / ".env"):
        if candidate.is_file():
            load_dotenv(candidate, override=False)


def _resolve_api_key(explicit: Optional[str] = None) -> str:
    if explicit:
        return explicit
    _load_env()
    key = (os.environ.get("LAWDIVER_API_KEY") or os.environ.get("LAWTOOLS_API_KEY") or "").strip()
    if not key:
        raise RuntimeError(
            "Missing API key. Set LAWDIVER_API_KEY (or LAWTOOLS_API_KEY). "
            "Create a key at https://lawdiver.com/account/api-keys"
        )
    return key


class LawDiverApiError(Exception):
    def __init__(self, status: int, payload: Mapping[str, Any]):
        err = payload.get("error") or {}
        code = err.get("code", "unknown")
        message = err.get("message", "error")
        request_id = payload.get("requestId", "?")
        super().__init__(f"{code}: {message} ({request_id})")
        self.status = status
        self.code = code
        self.request_id = request_id
        self.payload = payload
        self.details = err.get("details")


class LawDiverClient:
    """Thin REST client for LawDiver API v1 (examples pack -- clone-and-copy, not a PyPI SDK)."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 60.0,
        user_agent: Optional[str] = None,
    ) -> None:
        self.api_key = _resolve_api_key(api_key)
        self.base_url = (base_url or os.environ.get("LAWDIVER_API_BASE") or DEFAULT_BASE).rstrip("/")
        self.user_agent = user_agent or DEFAULT_USER_AGENT
        self._client = httpx.Client(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "User-Agent": self.user_agent,
            },
            timeout=timeout,
        )

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "LawDiverClient":
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def discovery(self) -> Any:
        """Unauthenticated discovery document."""
        r = httpx.get(
            self.base_url,
            headers={"User-Agent": self.user_agent},
            timeout=30.0,
        )
        r.raise_for_status()
        return r.json()

    def search(
        self,
        *,
        query: str,
        jurisdiction: Mapping[str, Any],
        idempotency_key: Optional[str] = None,
        **kwargs: Any,
    ) -> dict[str, Any]:
        """POST /search.

        Pass searchType="boolean" for a strict terms-and-connectors query:
        AND, &, OR, NOT, %, "phrase", ! (root expander), * (one character),
        /s (25 words), /p (80 words), w/N. On that pin, lowercase and/or/not
        are connectors and every term is required. keyword is accepted and runs
        the same search. Connectors are also honored under searchType="auto"
        (uppercase only). searchInfo.booleanOperatorsDetected is true when the
        parser saw connectors.
        """
        body: dict[str, Any] = {"query": query, "jurisdiction": dict(jurisdiction), **kwargs}
        return self._request("POST", "/search", json=body, idempotency_key=idempotency_key)

    def jurisdictions(self) -> Any:
        return self._request("GET", "/jurisdictions")

    def cite_check(
        self,
        *,
        citation: Optional[str] = None,
        citations: Optional[list[str]] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict[str, Any]:
        if (citation is None) == (citations is None):
            raise ValueError("Provide exactly one of citation= or citations=")
        body: dict[str, Any] = {"citation": citation} if citation is not None else {"citations": citations}
        return self._request("POST", "/citecheck/cite", json=body, idempotency_key=idempotency_key)

    def resolve_citation(self, query: str) -> Any:
        return self._request("POST", "/citations/resolve", json={"query": query})

    def retrieve(
        self,
        *,
        query: str,
        case_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict[str, Any]:
        body: dict[str, Any] = {"query": query}
        if case_id:
            body["caseId"] = case_id
        return self._request("POST", "/cases/retrieve", json=body, idempotency_key=idempotency_key)

    def retrieve_statute(
        self,
        *,
        query: Optional[str] = None,
        authority_key: Optional[str] = None,
        year: Optional[int] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict[str, Any]:
        """Pull statute / regulation / court-rule text by Bluebook section cite or authorityKey."""
        if query is None and authority_key is None:
            raise ValueError("Provide query= and/or authority_key=")
        body: dict[str, Any] = {}
        if query is not None:
            body["query"] = query
        if authority_key is not None:
            body["authorityKey"] = authority_key
        if year is not None:
            body["year"] = year
        return self._request("POST", "/statutes/retrieve", json=body, idempotency_key=idempotency_key)

    def case_metadata(self, case_id: str) -> Any:
        return self._request("GET", f"/cases/{case_id}")

    def case_batch(self, case_ids: list[str]) -> Any:
        return self._request("POST", "/cases/batch", json={"caseIds": case_ids})

    def good_law(self, case_id: str) -> Any:
        return self._request("GET", f"/cases/{case_id}/good-law")

    def goodlaw_check(self, case_id: str, *, limit: str = "10", order: str = "recent") -> Any:
        """Citing cases with treatment status. limit: 10, 50, 100, or unlimited. order: recent or negative."""
        return self._request(
            "GET",
            f"/cases/{case_id}/goodlaw-check",
            params={"limit": limit, "order": order},
        )

    def cited_by(self, case_id: str, *, limit: int = 25, offset: int = 0) -> Any:
        return self._request("GET", f"/cases/{case_id}/cited-by", params={"limit": limit, "offset": offset})

    def case_pdf(self, case_id: str) -> bytes:
        r = self._client.get(f"/cases/{case_id}/pdf")
        if r.status_code >= 400:
            try:
                raise LawDiverApiError(r.status_code, r.json())
            except ValueError as exc:
                raise RuntimeError(f"PDF download failed: HTTP {r.status_code}") from exc
        return r.content

    def start_document_cite_check(
        self,
        file_path: str | Path,
        *,
        emails: list[str] | None = None,
        delivery: str | None = None,
    ) -> dict[str, Any]:
        path = Path(file_path)
        # Repeated `emails` fields: httpx accepts a list of (name, value) tuples in data.
        data: list[tuple[str, str]] = []
        if delivery:
            data.append(("delivery", delivery))
        for addr in emails or []:
            data.append(("emails", addr))
        with path.open("rb") as f:
            r = self._client.post(
                "/citecheck/document",
                data=data or None,
                files={"file": (path.name, f)},
            )
        return self._parse(r)

    def document_job(self, job_id: str) -> dict[str, Any]:
        return self._request("GET", f"/citecheck/jobs/{job_id}")

    def document_report(self, job_id: str) -> bytes:
        r = self._client.get(f"/citecheck/jobs/{job_id}/report")
        if r.status_code >= 400:
            try:
                raise LawDiverApiError(r.status_code, r.json())
            except ValueError as exc:
                raise RuntimeError(f"Report download failed: HTTP {r.status_code}") from exc
        return r.content

    def cite_check_document(
        self,
        file_path: str | Path,
        *,
        poll_seconds: Optional[float] = None,
        max_polls: int = 120,
        download_report: bool = False,
        emails: list[str] | None = None,
        delivery: str | None = None,
    ) -> dict[str, Any]:
        started = self.start_document_cite_check(file_path, emails=emails, delivery=delivery)
        job_id = started["jobId"]
        delay = poll_seconds if poll_seconds is not None else float(started.get("pollAfterSeconds") or 5)
        job: dict[str, Any] = started
        for _ in range(max_polls):
            if job.get("status") not in ("queued", "processing"):
                break
            time.sleep(delay)
            job = self.document_job(job_id)
        if job.get("status") != "completed":
            raise RuntimeError(f"Cite check {job.get('status')}: {job.get('error') or 'timed out'}")
        out: dict[str, Any] = {"job": job, "started": started}
        if download_report:
            out["report"] = self.document_report(job_id)
        return out

    def start_bulk(self, requests: list[dict[str, Any]]) -> dict[str, Any]:
        """Upload a list of API calls. Returns a job id immediately."""
        return self._request("POST", "/bulk", json={"requests": requests})

    def bulk_job(self, job_id: str) -> dict[str, Any]:
        return self._request("GET", f"/bulk/jobs/{job_id}")

    def bulk_result(self, job_id: str) -> dict[str, Any]:
        """One combined document. Raises until status is completed or failed."""
        return self._request("GET", f"/bulk/jobs/{job_id}/result")

    def bulk_upload(
        self,
        requests: list[dict[str, Any]],
        *,
        poll_seconds: Optional[float] = None,
        max_polls: int = 360,
    ) -> dict[str, Any]:
        """Upload, poll, and return one combined output.

        Every API call has a completion deadline. Each call in the file is
        attempted 3 times. When API usage is low the service runs calls in
        parallel; when usage is high it runs them one at a time.
        """
        started = self.start_bulk(requests)
        job_id = started["jobId"]
        delay = poll_seconds if poll_seconds is not None else float(started.get("pollAfterSeconds") or 5)
        job: dict[str, Any] = started
        for _ in range(max_polls):
            if job.get("status") not in ("queued", "processing"):
                break
            time.sleep(delay)
            job = self.bulk_job(job_id)
        if job.get("status") not in ("completed", "failed"):
            raise RuntimeError(
                f"Bulk job still {job.get('status')} after {max_polls} polls. Check {started.get('statusUrl')}"
            )
        return self.bulk_result(job_id)

    def usage(self, days: int = 30) -> dict[str, Any]:
        return self._request("GET", "/usage", params={"days": days})

    def _request(
        self,
        method: str,
        path: str,
        *,
        json: Optional[MutableMapping[str, Any]] = None,
        params: Optional[Mapping[str, Any]] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict[str, Any]:
        headers: dict[str, str] = {}
        if idempotency_key:
            headers["Idempotency-Key"] = idempotency_key
        r = self._client.request(method, path, json=json, params=params, headers=headers)
        return self._parse(r)

    @staticmethod
    def _parse(r: httpx.Response) -> dict[str, Any]:
        try:
            payload = r.json()
        except ValueError as exc:
            raise RuntimeError(f"Non-JSON response: HTTP {r.status_code}") from exc
        if r.status_code >= 400:
            raise LawDiverApiError(r.status_code, payload)
        return payload
