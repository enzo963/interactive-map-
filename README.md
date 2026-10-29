

## Languages and theme

The interface is available in **English, Arabic (right-to-left) and German**, and in a **light and a dark theme**.

- **First visit:** the language follows the visitor's region — Iraq → Arabic, Germany → German, anywhere else → English. The region comes from the device time zone, then from the browser locale (no network request, no permission prompt).
- **After the visitor picks a language** (selector in the header) the choice is remembered and wins over the region. The theme works the same way: the device setting at first, then the saved choice.
- **UI text** lives in `src/i18n/messages/{en,ar,de}.js` (same keys in every file). **Names in the data** (governorates, site types, periods, civilizations, statuses) are in `src/i18n/vocabulary.js`; anything not listed there is shown as written.
- **Translating one site:** add a `translations` block to its record in `src/data/sites.json`:

  ```json
  "translations": {
    "ar": { "name": "الحضر", "short_description": "…", "full_description": "…" },
    "de": { "name": "Hatra", "short_description": "…" }
  }
  ```

  Supported fields: `name`, `short_description`, `full_description`, `city`, `site_type`, `historical_period`, `civilization`, `main_image_alt`. Missing fields fall back to the English record. Search finds a site by its Arabic or German name too.
- **Adding a language:** add it to `src/i18n/languages.js`, create `src/i18n/messages/<code>.js`, and extend `vocabulary.js`.
- **Checks:** `npm run check:i18n` verifies that every language has every message (with the same `{placeholders}`), that all keys used in the code exist, that every vocabulary entry is translated, and that region detection behaves as described.
- **Dark theme:** only the colour tokens in `src/styles/global.css` change (`:root[data-theme='dark']`). Heritage cards, deck piles and the always-dark bands keep the original palette.
