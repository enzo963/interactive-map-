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


## P4-07 validation

- URLs must be absolute HTTP(S) public addresses without credentials, control characters,
  malformed escapes, or backslashes. The configured source allowlist is still required.
- Every page redirect is validated against the source allowlist and checked against
  robots policy **before** its destination is requested. Redirect loops and more than
  five redirects stop with an error. Redirected robots files, HTML responses, and
  files without a User-agent directive do not establish permission and are blocked.
- Extraction requires a title/heading of at least three characters and a description
  or paragraph of at least 40 characters. Error/challenge pages are rejected. Repeated
  paragraphs and image URLs are removed; invalid canonical/image URLs are discarded.
- A draft must have a safe ID, a name, a usable summary, known evidence references,
  and provenance for populated fields. Status stays `needs-review`, verification stays
  `unverified`, and image licenses stay `unverified`. Validation finishes before any
  evidence or draft file is saved. JSON records are replaced atomically.
- Within one source/governorate, identical HTML hashes reuse existing evidence instead
  of creating another draft, including when the URL differs. URL identities ignore
  fragments, hostname case, and default ports; query strings remain significant.
  Changed content at an existing URL is saved as a new revision with a reference to
  previous evidence. Corrupt evidence manifests stop ingestion with a repair path.
- The evidence manifest is written last as the completion marker. This is a local,
  single-process pipeline; concurrent ingestion and multi-file transactions are not
  supported. A failed write may leave intermediate files, but no completed manifest.

The tests use mocked HTTP and temporary storage; running them does not contact sources
or publish anything. No frontend connection is added.
