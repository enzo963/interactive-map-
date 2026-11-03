"""Builds the Kirkuk governorate discovery batch (research date 2026-11-03).

Same contract as the earlier governorate batches: source-backed `needs-review` drafts,
coordinates only from the cited source (`coordinates_source`), unknown values left empty.

Citadel components link to the approved `site-kirkuk-kirkuk-citadel` through `parentSite`.
The approved records for the Prophet Daniel Mosque, Mother of Sorrows Church, Green Dome
(= Gök Kümbet / “Blue Dome”) and Qaysariyah Market are not repeated or changed.

The UNESCO Tentative List page for the citadel (6522) sits behind a bot challenge and was
not re-read; its component names come from the C1-01 capture of 2 November 2026.

Usage (from the repository root):
    python3 tools/content-pipeline/data/discovery/kirkuk-2026-11-03/build_kirkuk_records.py
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SITES = ROOT / 'src' / 'data' / 'sites.json'
TODAY = '2026-11-03'
C1 = '2026-11-02'

CITADEL = 'site-kirkuk-kirkuk-citadel'
TL = 'https://whc.unesco.org/en/tentativelists/6522/'
TL_NAME = 'UNESCO World Heritage Centre — Tentative List: Kirkuk Citadel (submitted 2021)'
MH = 'https://www.mesopotamiaheritage.org/en/monuments/'
NUZI_LMU = 'https://www.assyriologie.uni-muenchen.de/forschung/nuzi_palastarchive/index.html'
NUZI_LMU_NAME = 'LMU Munich, Assyriology — Nuzi palace archives project'
OXFORD = 'https://podcasts.ox.ac.uk/citadel-kirkuk-reconnaissance-and-assessment-its-archaeological-heritage-arabic'
OXFORD_NAME = 'University of Oxford, Protecting the Past — The Citadel of Kirkuk: reconnaissance and assessment of its archaeological heritage'
DRARCH = 'https://drarch.org/index.php/drarch/article/download/60/30/537'
DRARCH_NAME = 'DRArch — Resilience in intentionally destroyed historic settlements: Kirkuk Citadel and the old town of Van'


def src(name, url, accessed=TODAY, level='full-text', locator=None):
    entry = {'sourceName': name, 'url': url, 'evidenceId': None, 'accessedAt': accessed, 'accessLevel': level}
    if locator:
        entry['locator'] = locator
    return entry


def wp(title, level='full-text'):
    return src(f'Wikipedia — {title}', 'https://en.wikipedia.org/wiki/' + title.replace(' ', '_').replace(',', '%2C'), level=level)


def wd(qid):
    return src(f'Wikidata {qid} (coordinates)', f'https://www.wikidata.org/wiki/{qid}')


def tl(section='Description'):
    return src(TL_NAME, TL, C1, locator=section)


def rec(slug, name, category, description, sources, period='', alt=None, coords=None, year=None,
        location='', parent=None, notes='', destroyed=''):
    record = {
        'id': f'site-kirkuk-{slug}',
        'name': name,
        'governorate': 'Kirkuk',
        'category': category,
        'period': period,
        **({} if period else {'period_status': 'not-established'}),
        'description': description,
        'unesco': None,
        'has3D': None,
        'coverImage': None,
        'galleryImages': [],
        'image_status': 'none',
        'sources': sources,
        'unesco_status': 'unknown',
        'status': 'needs-review',
        'verification_status': 'needs-review',
        'slug': slug,
        'discovery_batch': 'kirkuk-2026-11-03',
    }
    if alt:
        record['alternativeNames'] = alt
    if location:
        record['approximateLocation'] = location
    if year is not None:
        record['estimated_year'] = year
    if parent:
        record['parentSite'] = parent
        if parent == CITADEL:
            record['heritage_status'] = 'Within Kirkuk Citadel (UNESCO Tentative List, 2021); no separate listing.'
    if destroyed:
        record['destruction_status'] = destroyed
    if coords:
        lat, lng, ref, precision = coords
        record['latitude'] = lat
        record['longitude'] = lng
        record['coordinates_source'] = ref if ':' in ref else f'wikidata:{ref}'
        record['coordinates_precision'] = precision
    if notes:
        record['review_notes'] = notes
    return record


CITADEL_NOTE = 'Component of Kirkuk Citadel named in the UNESCO dossier; survival after the 1997–98 clearance needs field confirmation.'

RECORDS = [
    # ── Kirkuk Citadel: components ────────────────────────────────────────────────────
    rec('great-mosque-kirkuk-citadel', 'Great Mosque of Kirkuk Citadel', 'Mosque',
        'Originally a 7th-century church of the Virgin Mary, turned into a mosque in the early 13th century and '
        'rebuilt by the Seljuks in 1237 with a brick minaret; the Ottomans added a madrasa in 1657.',
        [wp('Great Mosque of the Citadel'), tl(), wd('Q22685009')],
        alt=['Ulu Cami', 'Mosque of the Virgin Mary', 'al-Adra Maryam Mosque', 'الجامع الكبير في القلعة'], period='Seljuk; Ottoman',
        year=1237, coords=(35.468855, 44.394581, 'Q22685009', 'site'), parent=CITADEL, location='Kirkuk Citadel'),
    rec('al-aryan-mosque', 'Al-Aryan Mosque', 'Mosque', 'A historic mosque of Kirkuk Citadel named in the UNESCO dossier.',
        [tl()], parent=CITADEL, location='Kirkuk Citadel', notes=CITADEL_NOTE),
    rec('hasan-pakiz-mosque', 'Hasan Pakiz Mosque', 'Mosque',
        'A citadel mosque attributed to Firari Hasan Pasha, governor of Shahrizor, the Ottoman province then centred '
        'on Kirkuk.',
        [src(DRARCH_NAME, DRARCH, level='search-snippet')], alt=['Hasan Pakize'], period='Ottoman', parent=CITADEL, location='Kirkuk Citadel',
        notes='Sources place it either in the north-west of the citadel or in the southern Hammam quarter.'),
    rec('al-midan-quarter', 'Al-Midan Quarter, Kirkuk Citadel', 'Historic Urban Area',
        'One of the historic quarters of Kirkuk Citadel described in the UNESCO dossier. About 800 citadel houses were '
        'bulldozed in 1997–98, leaving nine monuments and nine small groups of houses.',
        [tl(), src(OXFORD_NAME, OXFORD, level='search-snippet')], alt=['Meydan'], parent=CITADEL, location='Kirkuk Citadel',
        notes=CITADEL_NOTE),
    rec('aghaliq-quarter', 'Aghaliq Quarter, Kirkuk Citadel', 'Historic Urban Area',
        'A historic quarter of Kirkuk Citadel described in the UNESCO dossier.', [tl()], alt=['Ağalık'], parent=CITADEL,
        location='Kirkuk Citadel', notes=CITADEL_NOTE),
    rec('hammam-quarter', 'Hammam Quarter, Kirkuk Citadel', 'Historic Urban Area',
        'A historic quarter of Kirkuk Citadel described in the UNESCO dossier, home of the Mother of Sorrows Church.',
        [tl()], alt=['Hamam'], parent=CITADEL, location='Kirkuk Citadel', notes=CITADEL_NOTE),
    rec('stone-gate', 'Stone Gate, Kirkuk Citadel', 'Gate', 'A gate of Kirkuk Citadel named in the UNESCO dossier.',
        [tl()], alt=['Taş Kapı'], parent=CITADEL, location='Kirkuk Citadel', notes=CITADEL_NOTE),
    rec('tob-qapi', 'Bab al-Toub (Tob Qapi), Kirkuk Citadel', 'Gate', 'The “Cannon Gate” of Kirkuk Citadel named in the UNESCO dossier.',
        [tl()], alt=['Toub Qabu', 'Top Kapı', 'Cannon Gate'], parent=CITADEL, location='Kirkuk Citadel', notes=CITADEL_NOTE),
    rec('seven-girls-gate', 'Seven Girls Gate, Kirkuk Citadel', 'Gate', 'A gate of Kirkuk Citadel named in the UNESCO dossier.',
        [tl()], alt=['Yedi Kızlar Kapısı'], parent=CITADEL, location='Kirkuk Citadel', notes=CITADEL_NOTE),
    rec('bab-al-halloujia', 'Bab al-Halloujia, Kirkuk Citadel', 'Gate', 'A gate of Kirkuk Citadel named in the UNESCO dossier.',
        [tl()], alt=['Halloujia Gate'], parent=CITADEL, location='Kirkuk Citadel', notes=CITADEL_NOTE),
    rec('ottoman-military-cemetery', 'Ottoman Military Cemetery, Kirkuk Citadel', 'Cemetery',
        'Kirkuk’s first cemetery behind the Prophet Daniel Mosque, later the burial ground of Ottoman soldiers after '
        'the First World War; restored by Türkiye’s TİKA with Kirkuk’s antiquities directorate.',
        [wp('Mosque of the Prophet Daniel, Kirkuk'),
         src('TİKA — Collective opening ceremony for TİKA’s projects in Iraq', 'https://tika.gov.tr/en/detail-a_collective_opening_ceremony_was_held_for_tika%27s_projects_in_iraq/', level='search-snippet')],
        alt=['Şehitlik'], period='Ottoman; 20th century', parent=CITADEL, location='Behind the Prophet Daniel Mosque'),
    rec('takiya-najib', 'Takiya of Najib', 'Shrine',
        'An Ottoman-era Sufi lodge on the edge of Kirkuk Citadel, among the oldest in the city, which keeps a hair '
        'relic of the Prophet that draws visitors at the Mawlid.',
        [src('Shafaq News (Arabic) — A centuries-old takiya in Kirkuk', 'https://shafaq.com/ar/مجتـمع/تكية-عمرها-قرون-شعرة-نبوية-تستقطب-زوار-كركوك-في-المولد-النبوي-صور-وفيديو', level='search-snippet')],
        alt=['تكية نجيب', 'Necip Tekkesi'], period='Ottoman', location='Edge of Kirkuk Citadel'),

    # ── Kirkuk city: civic, religious and domestic heritage ─────────────────────────────────
    rec('qishla-of-kirkuk', 'Qishla of Kirkuk', 'Historic Building',
        'The Ottoman army headquarters built in 1863 on about 6 acres in the city centre. Part of it collapsed in '
        '2016; a folk museum occupies the upper floor, and a UN assessment and a 30-billion-dinar plan target its '
        'restoration with the citadel.',
        [wp('Qishla of Kirkuk'),
         src('UN Iraq — Assessment visit to Kirkuk’s historical Qishla and Citadel', 'https://iraq.un.org/en/170039-un-iraq-assessment-visit-kirkuk%E2%80%99s-historical-qishla-and-citadel-sites-explore-ways-assist', level='search-snippet'),
         src('KirkukNow — Kirkuk Folk Museum opens', 'https://kirkuknow.com/en/news/67845', level='search-snippet'),
         wd('Q7267921')],
        alt=['Kirkuk Barracks', 'قشلة كركوك', 'Kerkük Kışlası', 'Kirkuk Folk Museum'], period='Ottoman', year=1863,
        coords=(35.47125, 44.388556, 'Q7267921', 'site'), location='Kirkuk city centre', destroyed='12 m collapsed (8 February 2016)'),
    rec('kirkuk-stone-bridge', 'Ottoman Stone Bridge, Kirkuk', 'Historic Bridge',
        'A stone bridge of 1875 over the Khasa built under the Ottoman governor Nafiz Pasha and leading towards a gate '
        'of the citadel; it has been restored.',
        [src('Iraq Oil Report — Kirkuk’s historic stone bridge gets restored', 'https://www.iraqoilreport.com/daily-brief/kirkuk%E2%80%99s-historic-stone-bridge-gets-restored-6541', level='search-snippet')],
        alt=['Taş Köprü', 'Khasa Su bridge'], period='Ottoman', year=1875, location='Khasa river, Kirkuk'),
    rec('mariam-al-adra-koria', 'Mariam al-Adra Church, Koria', 'Church',
        'A Chaldean church built in 1862 in the old Christian quarter of Koria, eight years after the dogma of the '
        'Immaculate Conception; a new church was added next to it in 1965.',
        [src('Mesopotamia Heritage — The Mariam Al Adra Church in Kirkuk', MH + 'leglise-mariam-al-adra-de-kirkouk-vierge-marie-immaculee-conception/')],
        alt=['Virgin Mary of the Immaculate Conception'], period='Ottoman', year=1862,
        coords=(35.464561, 44.378622, 'mesopotamiaheritage:mariam-al-adra-kirkuk', 'site'), location='Koria quarter, Kirkuk'),
    rec('tahmazgerd-red-church', 'Tahmazgerd Church (Red Church)', 'Church',
        'Kirkuk’s oldest Christian site: a martyrion raised around 470 for the 12,000 Christians killed by Yazdegerd II '
        'in 445, named after the Persian officer Tahmazgerd who led the massacre and later died a martyr.',
        [src('Mesopotamia Heritage — The Tahmazgerd church (the so-called Red church)', MH + 'leglise-tahmazgerd-de-kirkouk-dite-eglise-rouge/'),
         wp('Beth Garmai', 'search-snippet')],
        alt=['Red Church', 'Martyrs of Karka d-Beth Slokh', 'Karka d-Beth Slokh'], period='Late Antique (founded)', year='c. 470',
        coords=(35.468356, 44.383714, 'mesopotamiaheritage:tahmazgerd', 'site'), location='Hill overlooking Kirkuk'),
    rec('salih-malli-house', 'Salih Malli House', 'Historic House',
        'A house of about 1910 in the Imam Qasim quarter, described by residents as a palace and still lived in by the '
        'family’s fourth generation; locals asked the heritage directorate to register it in 2021.',
        [src('KirkukNow, 15 March 2021 — Buildings over 150 years old registered for renovation', 'https://kirkuknow.com/en/news/65105')],
        period='20th century', year=1910, location='Imam Qasim quarter, Kirkuk', notes='At risk; not yet registered when reported.'),

    # ── Ancient sites ──────────────────────────────────────────────────────────────────
    rec('nuzi', 'Nuzi (Yorghan Tepe)', 'Archaeological City',
        'A city 12 km south-west of Kirkuk occupied from the Ubaid period to the late 2nd millennium BC: Gasur under '
        'Akkad and Nuzi under Mitanni. Its thousands of family and palace tablets are a key source for Hurrian society.',
        [wp('Nuzi'), src(NUZI_LMU_NAME, NUZI_LMU, C1, locator='Project description'),
         src('University of Tokyo Museum — Iraq archaeological photo database', 'https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordeach.php?-action=find&-recid=27', C1, locator='N3'),
         wd('Q584605')],
        alt=['Yorghan Tepe', 'Yorgan Tepe', 'Gasur', 'نوزي'], period='Ubaid to Late Bronze Age (Mitanni)', year='c. 1450 BC',
        coords=(35.302494, 44.247622, 'Q584605', 'site'), location='South-west of Kirkuk'),
    rec('nuzi-palace', 'Palace of Nuzi', 'Palace', 'The Mitanni-period palace of Nuzi, whose archives are being edited by LMU Munich.',
        [src(NUZI_LMU_NAME, NUZI_LMU, C1, locator='Project description')], period='Mitanni', parent='site-kirkuk-nuzi', location='Nuzi'),
    rec('nuzi-temple', 'Temple of Nuzi', 'Temple', 'The temple complex excavated at Nuzi.',
        [src(NUZI_LMU_NAME, NUZI_LMU, C1, locator='Project description')], period='Bronze Age', parent='site-kirkuk-nuzi', location='Nuzi'),
    rec('nuzi-city-wall', 'City Wall of Nuzi', 'Historic Monument', 'The fortification wall of Nuzi.',
        [src(NUZI_LMU_NAME, NUZI_LMU, C1, locator='Project description')], period='Bronze Age', parent='site-kirkuk-nuzi', location='Nuzi'),
    rec('tell-al-fakhar', 'Tell al-Fakhar', 'Archaeological Site',
        'A mound 45 km south-west of Kirkuk whose Mitanni-period “Green Palace” held about 800 tablets; Neo-Assyrian '
        'remains lie above. It has been proposed as Kurruhanni.',
        [wp('Tell al-Fakhar'),
         src('al-Khalesi 1977 — Tell al-Fakhar (Kurruḫanni), a dimtu-settlement: excavation report', 'https://keibi.uni-tuebingen.de/Record/KEI00074561', level='search-snippet')],
        alt=['Kurruhanni', 'تل الفخار', 'Pottery Mound'], period='Mitanni; Neo-Assyrian', location='South-west of Kirkuk'),
    rec('tell-arab-kumbet', 'Tell Arab Kumbet', 'Archaeological Site',
        'A mound in the al-Wasiti quarter of central Kirkuk dated by the Iraqi State Board of Antiquities to the Early '
        'Dynastic to Old Babylonian periods. Excavations found houses, workshops and pottery kilns, graves with '
        'offerings and about 150 objects; houses built over the mound threaten it.',
        [src('Shafaq News (Arabic) — Kirkuk: encroachments hide thousands-of-years-old antiquities',
             'https://shafaq.com/ar/تقارير-وتحليلات/كركوك-التجاوزات-تغيب-ثار-عمرها-لاف-السنين-والدولة-تعجز-عن-انتشالها-صور', level='search-snippet'),
         src('Annals of the Faculty of Arts, Ain Shams University — The site of Arab Kumbet in Mesopotamia in the light of excavations',
             'https://aafu.journals.ekb.eg/article_30093.html', level='search-snippet')],
        alt=['عرب كومبت', 'Arab Kümbet'], period='Early Dynastic to Old Babylonian', location='al-Wasiti quarter, Kirkuk',
        destroyed='Encroached by house building'),

    # ── Districts: Altun Kupri, Daquq, Dibis, Hawija and the south ───────────────────────────
    rec('altun-kupri-bridges', 'Ottoman Bridges of Altun Kupri', 'Historic Bridge',
        'Sultan Murad IV built two bridges across the Little Zab at Altun Kupri (“Golden Bridge”). Their last phase, '
        'dated before 1736, was demolished in 1918, but remains are still visible.',
        [wp('Altun Kupri'),
         src('Athar al-Rafidain (University of Mosul) — Development of Altyn Köprü (Pirdi) in the light of new archaeological research',
             'https://athar.uomosul.edu.iq/index.php/athar/article/view/37653', level='search-snippet')],
        alt=['Altın Köprü', 'Pirdê', 'Prde', 'التون كوبري'], period='Ottoman', year='17th century', location='Altun Kupri, Little Zab'),
    rec('daquq-ottoman-bridge', 'Ottoman Bridge of Daquq', 'Historic Bridge',
        'An Ottoman bridge completed about 142 years ago and still in use in Daquq, a town first named as Diquqina in '
        'Neo-Assyrian texts.',
        [src('Türkiye Today, December 2025 — Historic Ottoman bridge in Iraq remains unharmed', 'https://www.turkiyetoday.com/culture/historic-ottoman-bridge-in-iraq-remains-unharmed-amid-regional-flooding-3212242', level='search-snippet'),
         wp('Daquq'), wd('Q115915275')],
        alt=['Dakuk Köprüsü', 'Tavuk bridge', 'جسر داقوق'], period='Ottoman', year=1883, coords=(35.173898, 44.50697, 'Q115915275', 'site'),
        location='Daquq'),
    rec('baba-gurgur', 'Baba Gurgur Eternal Fire', 'Historic Monument',
        'The ever-burning gas flame north-west of Kirkuk, linked in local belief to the fiery furnace of the Book of '
        'Daniel, where Iraq’s first northern oil gusher came in 1927.',
        [wp('Baba Gurgur')], alt=['Eternal Fire', 'Father of Fires', 'النار الأزلية', 'بابا كركر'], period='Ancient tradition; 1927 oil discovery',
        year=1927, location='16 km north-west of Kirkuk', notes='Industrial and cultural heritage; not an archaeological site.'),
    rec('sheikh-ismail-shrine', 'Shrine of Sheikh Ismail, Hbejh', 'Shrine',
        'A shrine in Hbejh village 46 km south of Kirkuk reported destroyed by Islamic State.',
        [src('ASOR Cultural Heritage Initiatives — Weekly Report 16–17', 'https://www.asor.org/wp-content/uploads/2019/09/ASOR_CHI_Weekly_Report_16–17r.pdf', level='search-snippet')],
        location='Hbejh, south of Kirkuk', destroyed='Reported destroyed (2014); unverified'),
]


def main():
    ids = [r['id'] for r in RECORDS]
    if len(ids) != len(set(ids)):
        sys.exit('duplicate ids in batch')
    (HERE / 'kirkuk-records.json').write_text(json.dumps(RECORDS, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    sites = json.loads(SITES.read_text(encoding='utf-8'))
    have_ids = {s['id'] for s in sites}
    have_slugs = {s['slug'] for s in sites}
    clash = [r['slug'] for r in RECORDS if r['slug'] in have_slugs and r['id'] not in have_ids]
    if clash:
        sys.exit(f'slug already used by another record: {clash}')
    added = [r for r in RECORDS if r['id'] not in have_ids]
    sites.extend(added)
    SITES.write_text(json.dumps(sites, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(RECORDS)} records in batch, {len(added)} added, {len(sites)} total')


if __name__ == '__main__':
    main()
