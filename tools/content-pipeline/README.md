# Heritage Bridge Content Pipeline — Phase 1.1

Phase 1.1 hardens the trusted-content ingestion foundation.

## Key upgrades

- Explicit `robots.txt` statuses:
  - `allowed`
  - `denied`
  - `unavailable`
  - `error`
- New `check` command to diagnose a URL before fetching.
- Structured diagnostic output.
- Safer redirect validation.
- Better HTTP/content-type errors.
- Per-domain throttling.
- Snapshot hashing with SHA-256.
- Evidence + extracted metadata + draft generation.
- No automatic publishing.
- No guessing when robots policy cannot be verified.

## Commands

List configured trusted sources:

```powershell
python main.py sources
```

Diagnose a page before fetching:

```powershell
python main.py check `
  --source unesco `
  --url "https://whc.unesco.org/en/list/1437/"
```

Fetch only when automated access is explicitly allowed:

```powershell
python main.py fetch `
  --source unesco `
  --governorate erbil `
  --url "https://whc.unesco.org/en/list/1437/"
```

Run self-tests:

```powershell
python -m unittest discover -s tests -v
```

## Important policy

`unavailable` and `error` are **not** treated as permission.

If `robots.txt` cannot be verified, Phase 1.1 stops and reports the reason.
Later source-specific adapters may use official APIs, feeds, dumps, or downloadable datasets instead of HTML scraping.

## Folder layout

```text
tools/content-pipeline/
├── config/
│   └── sources.json
├── data/
│   ├── raw/
│   ├── drafts/
│   └── logs/
├── hb_pipeline/
│   ├── __init__.py
│   ├── config.py
│   ├── diagnostics.py
│   ├── errors.py
│   ├── extractor.py
│   ├── fetcher.py
│   ├── models.py
│   ├── robots.py
│   ├── storage.py
│   └── utils.py
├── tests/
│   ├── test_registry.py
│   └── test_utils.py
├── main.py
├── requirements.txt
└── README.md
```
