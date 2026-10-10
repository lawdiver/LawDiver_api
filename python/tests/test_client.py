"""Unit tests for the LawDiver examples client (no live network)."""

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

import httpx

from lawdiver import DEFAULT_USER_AGENT, LawDiverApiError, LawDiverClient


class LawDiverClientTests(unittest.TestCase):
    def test_default_user_agent_identifies_examples_pack(self) -> None:
        self.assertIn("LawDiver-API-Examples", DEFAULT_USER_AGENT)

    def test_client_sets_user_agent_header(self) -> None:
        with patch("lawdiver.client.httpx.Client") as client_cls:
            mock_http = MagicMock()
            client_cls.return_value = mock_http
            mock_http.request.return_value = httpx.Response(
                200,
                json={
                    "results": [],
                    "total": 0,
                    "usage": {"operation": "case_search", "quantity": 0},
                    "requestId": "req_test",
                },
            )

            client = LawDiverClient(api_key="ld_live_test", base_url="https://example.test/api/v1")
            client.search(query="test", jurisdiction={"type": "us_supreme_court"})

            kwargs = client_cls.call_args.kwargs
            self.assertEqual(kwargs["headers"]["User-Agent"], DEFAULT_USER_AGENT)
            self.assertEqual(kwargs["headers"]["Authorization"], "Bearer ld_live_test")

    def test_parse_raises_api_error(self) -> None:
        response = httpx.Response(
            401,
            json={
                "error": {"code": "invalid_api_key", "message": "bad key"},
                "usage": None,
                "requestId": "req_err",
            },
        )
        with self.assertRaises(LawDiverApiError) as ctx:
            LawDiverClient._parse(response)
        self.assertEqual(ctx.exception.code, "invalid_api_key")
        self.assertEqual(ctx.exception.request_id, "req_err")
        self.assertEqual(ctx.exception.status, 401)


if __name__ == "__main__":
    unittest.main()
