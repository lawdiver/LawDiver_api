"""Example 08 -- Pull a statute section by Bluebook citation.

Requires a proper section number (e.g. 42 U.S.C. § 1983).
"""

from __future__ import annotations

import sys

from lawdiver import LawDiverClient


def main() -> None:
    query = sys.argv[1] if len(sys.argv) > 1 else "42 U.S.C. § 1983"
    client = LawDiverClient()
    hit = client.retrieve_statute(query=query)

    print(f"status: {hit.get('status')}")
    print(f"message: {hit.get('message') or ''}")
    print(f"requestId: {hit.get('requestId')}")

    statute = hit.get("statute") or {}
    if hit.get("status") == "ok" and statute:
        print(f"bluebook: {statute.get('bluebook')}")
        print(f"heading:  {statute.get('heading') or '(none)'}")
        print(f"chars:    {statute.get('bodyChars') or 0}")
        print(f"key:      {statute.get('authorityKey')}")
        body = statute.get("body") or ""
        preview = " ".join(body[:280].split())
        suffix = "…" if len(body) > 280 else ""
        print(f"preview:  {preview}{suffix}")
    elif hit.get("status") == "not_found":
        print("No such section.", hit.get("note") or "")
    elif hit.get("status") == "not_a_statute":
        print("Not a statute citation. Include jurisdiction + section number.")
    else:
        print("Unavailable.", hit.get("note") or hit.get("message") or "")
        if statute.get("officialUrl"):
            print(f"officialUrl: {statute.get('officialUrl')}")


if __name__ == "__main__":
    main()
