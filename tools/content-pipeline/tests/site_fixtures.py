def site(**changes):
    record = {
        "id": "site-one", "name": "Hatra", "governorate": "Nineveh",
        "category": "Archaeological Site", "period": "Parthian",
        "description": "A substantial description of the archaeological site and its heritage context.",
        "unesco": True, "has3D": False,
        "coverImage": {"src": "https://example.org/site.jpg", "alt": "View of the site", "caption": "", "credit": "Photographer", "license": "CC BY"},
        "galleryImages": [], "sources": [{"sourceName": "Reference", "url": "https://example.org/site", "evidenceId": "evidence-one", "accessedAt": "2026-10-31T12:00:00Z"}],
    }
    record.update(changes)
    return record
