# P6-01 — Baghdad collection

Prepared directly in this project with the existing Python pipeline. No frontend files, pipeline implementation, source registry, or previous governorate catalogs were edited.

Six monuments: Al-Mustansiriya Madrasa; Abbasid Palace; Al-Qishla and Clock Tower; Al-Wazir Mosque; Al-Asifiyah Mosque; House of Wisdom (Industries School Building).

Historical evidence: Iraq's State Party submission hosted by UNESCO, https://whc.unesco.org/en/tentativelists/5880/ . These are components of the proposed Rusafa riverbank ensemble, not individually inscribed World Heritage properties. Unknown individual inscription and 3D flags remain null. The recognized UNESCO status value is `unknown`; ensemble context is retained in `heritage_status` to avoid an unsupported frontend badge.

Five Wikimedia Commons image pages were captured. Three original-image URLs passed HTTP/MIME/complete-decoder validation and have explicit archived CC BY-SA license evidence, creator attribution, source links and image/site-bound review decisions. Two URLs returned HTTP 429 after bounded retries and were excluded. No sufficiently specific image was found for the Industries School building. Image records and source HTML are stored; image binaries were validated over HTTP, not copied into the frontend.

Reviewer: Codex (AI evidence review, P6-01), at the user's request. This is source-based AI review, not human-curator approval or archaeological field verification. Original drafts remain `needs-review`; current effective approvals are held in the separate ledger and bound to exact record and source hashes. Superseded decisions remain in its history. Exporting does not publish to the website.

Main artifacts, relative to tools/content-pipeline/:
- data/raw/baghdad/: six HTML snapshots, six extractions, six evidence manifests.
- data/drafts/baghdad/: six fetch drafts and six site-focused drafts.
- data/prepared/baghdad-heritage-sites.json: canonical prepared records.
- data/image_reviews/baghdad/: five image preparation reviews.
- data/gallery_reviews/baghdad/: six gallery review records.
- data/license_reviews/baghdad/: three evidence-backed image license reviews.
- data/review/baghdad-heritage-review.json: validation and duplicate audit.
- data/review/baghdad-decisions.json: revision-bound decisions and history.
- data/review/baghdad-evidence-integrity.json: source hash audit and Python test result.
- data/review/baghdad-website-compatibility.json: schema and adapter checks.
- data/review/baghdad-p6-01-summary.json: collection summary.
- data/exports/baghdad-heritage-sites.approved.json: six approved export records.
- data/exports/baghdad-heritage-sites.approved.report.json: exporter inclusion report.
- data/collections/p6-01-baghdad-image-sources.json: approved-source collection manifest.
- data/collections/p6-01-baghdad-log-extract.jsonl: verbatim Baghdad structured log events; originals remain under data/logs/pipeline/.

Validation: 228 Python tests passed; all six prepared and exported records pass the shared website JSON schema; adapter checks confirm six unique IDs/slugs, three covers, three fallbacks and no unsupported UNESCO/3D badges. Six source snapshots pass SHA-256 verification. No possible duplicate pairs were found in this collection. Changed records were confirmed to invalidate their earlier approvals before the final revision was reviewed again.

To inspect effective status from the pipeline folder:
```powershell
..\..\.venv\Scripts\python.exe review_drafts.py list --input data/prepared/baghdad-heritage-sites.json --ledger data/review/baghdad-decisions.json --status approved
```

To regenerate the separate export from current approvals:
```powershell
..\..\.venv\Scripts\python.exe export_approved.py --input data/prepared/baghdad-heritage-sites.json --ledger data/review/baghdad-decisions.json --output data/exports/baghdad-heritage-sites.approved.json
```

The existing .gitignore excludes raw/drafts/prepared/review/media-review/export/log folders. They exist locally but will need an intentional artifact-sharing or versioning choice before sharing with another checkout. The output ZIP is a backup of this collection; it is not required to apply the work to the current project. Original evidence manifests retain their existing local path conventions; another machine may require the pipeline's normal path migration before re-reviewing.
