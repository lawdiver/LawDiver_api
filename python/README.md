# LawDiver API -- Python examples

**Also included** alongside the primary TypeScript examples. Same endpoints, idiomatic `httpx` client.

Requires **Python 3.10+**.

This folder is an **examples client**. It is **not** published to PyPI -- clone this repo and `pip install -e .` (or copy `lawdiver/` into your project).

## Setup

```bash
# from repo root
cp .env.example .env
# paste LAWDIVER_API_KEY=ld_live_...

cd python
python -m venv .venv

# Windows PowerShell
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Add the package to `PYTHONPATH` (examples do this automatically when run from `python/`):

```bash
# from python/
python examples/01_search.py
```

Or install editable:

```bash
pip install -e .
```

## Run examples

```bash
python examples/01_search.py
python examples/02_cite_check.py
python examples/03_retrieve.py
python examples/04_document_cite_check.py path/to/brief.pdf
python examples/05_agent_search.py
python examples/06_usage.py
python examples/07_good_law_cited_by.py
python examples/09_goodlaw_check.py
python examples/10_boolean_search.py
python examples/10_bulk_upload.py
```

## Tests

```bash
python -m unittest discover -s tests -v
```

## Use the client

```python
from lawdiver import LawDiverClient

with LawDiverClient() as client:
    found = client.search(
        query="promissory estoppel",
        jurisdiction={"type": "one_state_plus_federal", "state": "NY"},
        limit=5,
    )
    for r in found["results"]:
        print(r["caseName"], r.get("citation"))
```

The client sets a `User-Agent`. If you write a bare `urllib` script instead, set one yourself -- missing User-Agents often fail at Cloudflare with error 1010 before reaching the API (see [docs/authentication.md](../docs/authentication.md)).
