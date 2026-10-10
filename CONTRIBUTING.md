# Contributing

Thanks for improving the LawDiver API examples.

## Scope

This repository is an **integration guide + sample clients**. Canonical API behavior always lives at [lawdiver.com/docs/api](https://lawdiver.com/docs/api). If docs and this repo disagree, update the samples to match the official docs (or open an issue noting the drift).

## Languages

- **TypeScript** is the primary sample language (matches official quickstart).
- **Python** is first-class as well.
- Keep cURL / PowerShell recipes in sync when adding endpoints.

## Guidelines

1. Never commit API keys or real briefs containing confidential work product.
2. Prefer thin clients over heavy SDKs -- the API is plain REST.
3. New examples should be runnable with `LAWDIVER_API_KEY` set.
4. Quote `requestId` in error messages.
5. Do not auto-pick `likely_valid` / `did_you_mean` candidates without documenting that it is a demo policy.

## Local checks

```bash
cd typescript && npm install && npm run build && npm test
cd ../python && pip install -r requirements.txt && python -m unittest discover -s tests -v
```

CI runs the same checks on every push/PR (`.github/workflows/ci.yml`).
