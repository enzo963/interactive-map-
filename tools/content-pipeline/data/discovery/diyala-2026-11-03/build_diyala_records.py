"""Builds the Diyala governorate discovery batch (research date 2026-11-03).

Same contract as the earlier governorate batches: source-backed `needs-review` drafts,
coordinates only from the cited source, unknown values left empty.

Every record in this batch also carries `evidence_level`:
  * `documented` — described by an excavation report, institutional page or encyclopaedia
    entry that gives the site's character and period.
  * `limited`    — known only as a name in a survey map, a government list or a single
    news item; the description says what is missing. Nothing is filled in for it.

Two parts:
  * RECORDS — hand-written records.
  * map_records() — Hamrin basin tells named on Map 1 of Yaseen (2005, Adumatu 11), taken
    from the C1-01 candidate file and marked `limited`.

Usage (from the repository root):
    python3 tools/content-pipeline/data/discovery/diyala-2026-11-03/build_diyala_records.py
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SITES = ROOT / 'src' / 'data' / 'sites.json'
C1_FILE = HERE.parent / 'c1-01' / 'parts' / 'anbar-diyala.json'
TODAY = '2026-11-03'
C1 = '2026-11-02'

ISAC_DIYALA = 'https://isac.uchicago.edu/research-projects/diyala-project'
ISAC_DIYALA_NAME = 'University of Chicago ISAC — Diyala Project'
ISAC_UCH = 'https://isac.uchicago.edu/publications/uch-tepe-i-tell-razuk-tell-ahmed-al-mughir-tell-ajamat'
ISAC_UCH_NAME = 'Gibson (ed.) 1981 — Uch Tepe I: Tell Razuk, Tell Ahmed al-Mughir, Tell Ajamat (ISAC)'
ISAC_NN = 'https://isac.uchicago.edu/sites/default/files/uploads/shared/docs/nn59.pdf'
ISAC_NN_NAME = 'University of Chicago Oriental Institute News & Notes — Hamrin excavations'
KOKUSHIKAN = 'https://www.kokushikan.ac.jp/research/ICSAI/report/hamlin/'
KOKUSHIKAN_NAME = 'Kokushikan University ICSAI — Hamrin excavation reports'
CRAST = 'https://www.centroscavitorino.it/en/siti-di-scavo/hamrin-2/'
CRAST_NAME = 'Centro Scavi di Torino (CRAST) — Hamrin'
FOREST = 'https://www.persee.fr/doc/paleo_0153-9345_1980_num_6_1_4271'
FOREST_NAME = 'Forest 1980, Paléorient 6 — Kheit Qasim excavations'
NIC = 'https://investpromo.gov.iq/investment-map/'
NIC_NAME = 'Iraq National Investment Commission — Investment map, Province of Diyala, historical sites'
YASEEN = 'https://alsudairy.org.sa/wp-content/uploads/2024/06/Issue11-E_P027-038.pdf'
YASEEN_NAME = 'Yaseen 2005, Adumatu 11 — Settlements of the Hamrin Basin, Map 1'
K24_KIFRI = 'https://www.kurdistan24.net/en/story/838316/kifri-launches-campaign-to-restore-historical-heritage-sites'
K24_KIFRI_NAME = 'Kurdistan24 — Kifri launches campaign to restore historical heritage sites'
UOD = 'https://basicedu.uodiyala.edu.iq/uploads/basic%20basic/%D8%B3%D8%B9%D8%AF%20%D9%85%D8%AD%D9%85%D8%AF%20%D8%B9%D9%84%D9%8A.pdf'
UOD_NAME = 'University of Diyala, College of Basic Education — Diyala in the Late Ottoman Period (Arabic)'
HAMRIN = 'Hamrin basin'
FLOODED = 'Excavated in the Hamrin Dam salvage campaign (1977–80); now in or beside Lake Hamrin and exposed only when the water is low.'


def src(name, url, accessed=TODAY, level='full-text', locator=None):
    entry = {'sourceName': name, 'url': url, 'evidenceId': None, 'accessedAt': accessed, 'accessLevel': level}
    if locator:
        entry['locator'] = locator
    return entry


def wp(title, level='full-text'):
    return src(f'Wikipedia — {title}', 'https://en.wikipedia.org/wiki/' + title.replace(' ', '_').replace(',', '%2C'), level=level)


def wd(qid):
    return src(f'Wikidata {qid} (coordinates)', f'https://www.wikidata.org/wiki/{qid}')


def slug_of(name):
    return re.sub(r'[^a-z0-9]+', '-', name.lower().replace('’', '').replace("'", '')).strip('-')


def rec(slug, name, category, description, sources, period='', alt=None, coords=None, year=None,
        location='', parent=None, notes='', destroyed='', evidence='documented'):
    record = {
        'id': f'site-diyala-{slug}',
        'name': name,
        'governorate': 'Diyala',
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
        'discovery_batch': 'diyala-2026-11-03',
        'evidence_level': evidence,
    }
    if alt:
        record['alternativeNames'] = alt
    if location:
        record['approximateLocation'] = location
    if year is not None:
        record['estimated_year'] = year
    if parent:
        record['parentSite'] = parent
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


RUBEIDHEH_NOTE = ('Yaseen’s numbering is unclear: his map gives ar-Rubeideh as site 69 and Kumeideh as site 44, but his text '
                  'calls site 44 Rubeidheh. Kumeideh is kept as a separate card until the original map is checked.')
MAP_NOTES = {'Kumeideh': 'Possibly the same site as Tell Rubeidheh. ' + RUBEIDHEH_NOTE}

LIMITED_NIC = ('Known only from a line in the National Investment Commission’s list of Diyala historical sites; '
               'locality, period and present condition are not documented in the sources found.')

RECORDS = [
    # ── Lower Diyala: the Oriental Institute's Diyala project cities ─────────────────────────
    rec('eshnunna', 'Eshnunna (Tell Asmar)', 'Archaeological City',
        'A Sumerian and Akkadian city-state of the Diyala valley with Tishpak as its patron god; under its Old Babylonian '
        'kings it ruled Khafajah, Ishchali and the Hamrin. It was excavated by the University of Chicago’s Diyala '
        'project in the 1930s.',
        [wp('Eshnunna'), src(ISAC_DIYALA_NAME, ISAC_DIYALA, C1, locator='Overview')],
        alt=['Tell Asmar', 'Ashnunnak', 'إشنونة', 'تل أسمر'], period='Early Dynastic to Old Babylonian', location='Lower Diyala valley',
        notes='Wikidata gives the same rounded point (33.75, 44.75) for Eshnunna and Khafajah, so no pin is set.'),
    rec('khafajah', 'Khafajah (Tutub)', 'Archaeological City',
        'Ancient Tutub on the Diyala river 11 km east of Baghdad, occupied from the Uruk period to the end of the Old '
        'Babylonian period, known for its oval temple; later controlled by Eshnunna.',
        [wp('Khafajah'), src(ISAC_DIYALA_NAME, ISAC_DIYALA, C1, locator='Overview')],
        alt=['Khafaje', 'Tutub', 'خفاجة'], period='Uruk to Old Babylonian', location='Diyala river east of Baghdad',
        notes='No reliable coordinates (Wikidata point is rounded and shared with Eshnunna).'),
    rec('tell-agrab', 'Tell Agrab', 'Archaeological Site',
        'A walled mound of about 500 × 600 m south-east of Eshnunna, occupied from the Jemdet Nasr to the Larsa period, '
        'with the Early Dynastic Shara temple.',
        [wp('Tell Agrab'), src(ISAC_DIYALA_NAME, ISAC_DIYALA, C1, locator='Overview'), wd('Q1612336')],
        alt=['Tell Aqrab', 'تل أغرب'], period='Jemdet Nasr to Larsa', coords=(33.566667, 44.766667, 'Q1612336', 'approximate'),
        location='Lower Diyala'),
    rec('tell-ishchali', 'Tell Ishchali (Nerebtum)', 'Archaeological Site',
        'A site near the Diyala river south of Khafajah, probably ancient Nerebtum, with Isin-Larsa and Old Babylonian '
        'levels; for part of its history it was controlled by Eshnunna.',
        [wp('Tell Ishchali'), src(ISAC_DIYALA_NAME, ISAC_DIYALA, C1, locator='Overview'), wd('Q3338309')],
        alt=['Ishchali', 'Nerebtum', 'Kiti', 'تل إشجالي'], period='Isin-Larsa to Old Babylonian',
        coords=(33.3031, 44.5843, 'Q3338309', 'site'), location='Lower Diyala',
        notes='Wikipedia places it about 3 miles south-east of Baghdad; confirm the governorate.'),

    # ── Mandali ──────────────────────────────────────────────────────────────────────
    rec('choga-mami', 'Choga Mami', 'Archaeological Site',
        'A Samarran-culture village near Mandali with the earliest known canal irrigation, about 6000 BC, and a guard '
        'tower at its entrance; occupied into the Ubaid period.',
        [wp('Choga Mami'), wd('Q3820171')], alt=['تشوغا مامي'], period='Samarra to Ubaid', year='c. 6000 BC',
        coords=(33.88333, 45.44999, 'Q3820171', 'approximate'), location='Mandali'),

    # ── Hamrin basin: salvage excavations (1977–80) ───────────────────────────────────────
    rec('tell-abada', 'Tell Abada', 'Archaeological Site',
        'An Ubaid 1–3 village excavated in full in the Hamrin salvage campaign, 12 km south-east of Sadiyah; one of the '
        'few Ubaid settlements excavated entirely.',
        [wp('Tell Abada'), src('Jasim 2021, OIP 147 — Tell Abada: An Ubaid Village in Central Mesopotamia (ISAC)', 'https://isac.uchicago.edu/sites/default/files/uploads/shared/docs/Publications/OIP/oip147.pdf', C1, 'search-snippet'), src(YASEEN_NAME, YASEEN, C1, 'search-snippet', 'Map 1'), wd('Q56300816')],
        alt=['Abadah', 'تل عبادة'], period='Ubaid', coords=(34.1, 45.12, 'Q56300816', 'approximate'), location=HAMRIN, notes=FLOODED),
    rec('tell-rashid', 'Tell Rashid', 'Archaeological Site',
        'A small Ubaid mound excavated in 1978, with four Ubaid occupation levels down to virgin soil.',
        [wp('Tell Rashid'), wd('Q108022469')], period='Ubaid', coords=(34.03, 45.17, 'Q108022469', 'approximate'),
        location=HAMRIN, notes=FLOODED),
    rec('tell-madhur', 'Tell Madhur', 'Archaeological Site',
        'A mound best known for a well-preserved Ubaid house, with an Early Dynastic round building typical of the Hamrin.',
        [wp('Tell Madhur'), src(YASEEN_NAME, YASEEN, C1, 'search-snippet', 'Map 1'), wd('Q108047815')],
        alt=['Madhhur', 'تل مظهر'], period='Ubaid; Early Dynastic', coords=(34.38, 44.99, 'Q108047815', 'approximate'),
        location=HAMRIN, notes=FLOODED),
    rec('tell-saadiya', 'Tell Saadiya', 'Archaeological Site',
        'A small tell excavated in 1979–80 by the Polish Centre of Mediterranean Archaeology in the Hamrin salvage '
        'programme.', [wp('Tell Saadiya'), wd('Q86671285')], alt=['Tell es-Saadiya', 'تل سعدية'],
        coords=(34.18, 45.11, 'Q86671285', 'approximate'), location=HAMRIN, notes=FLOODED),
    rec('tell-suleimah', 'Tell Suleimah', 'Archaeological Site',
        'The largest site in the Hamrin inundation area, 1 km east of the Diyala river (Hamrin site 12); Awal and Batir '
        'have been proposed as its ancient name.',
        [wp('Tell Suleimah'), src(YASEEN_NAME, YASEEN, C1, 'search-snippet', 'Map 1'), wd('Q135441002')],
        alt=['Suleimah', 'Tell Sleima', 'Awal (proposed)'], coords=(34.1675, 45.103056, 'Q135441002', 'site'), location=HAMRIN, notes=FLOODED),
    rec('tell-yelkhi', 'Tell Yelkhi', 'Archaeological Site',
        'An oval mound settled in the early 3rd millennium BC and occupied into the Kassite period, excavated by an '
        'Italian team in 1977–80; it re-emerges when the lake falls.',
        [wp('Tell Yelkhi'), src(CRAST_NAME, CRAST, C1, locator='Main article')],
        alt=['Telkhi', 'Tell Yalkhi', 'Awalki (proposed)'], period='Early Dynastic to Kassite', location=HAMRIN, notes=FLOODED),
    rec('me-turan', 'Me-Turan (Tell Haddad and Tell as-Sib)', 'Archaeological City',
        'A city of the Isin-Larsa, Old Babylonian, Kassite and Neo-Assyrian periods (Me-Turnat), controlled first by '
        'Eshnunna and then Babylon, excavated in the Hamrin salvage campaign.',
        [wp('Me-Turan'), wd('Q86666193')], alt=['Tell Haddad', 'Tell al-Sib', 'Me-Turnat', 'تل حداد'],
        period='Isin-Larsa to Neo-Assyrian', coords=(34.214444, 45.084722, 'Q86666193', 'site'), location=HAMRIN, notes=FLOODED),
    rec('tell-razuk', 'Tell Razuk', 'Archaeological Site',
        'An Early Dynastic I town of about 3000 BC at Uch Tepe, best known for its Round Building, excavated by the '
        'Chicago–Copenhagen expedition.',
        [src(ISAC_UCH_NAME, ISAC_UCH, C1, locator='Title and description'), src(ISAC_NN_NAME, ISAC_NN, level='search-snippet'),
         src(YASEEN_NAME, YASEEN, C1, 'search-snippet', 'Map 1')],
        alt=['Razuk', 'Tell Razzuq'], period='Early Dynastic I', year='c. 3000 BC', location='Uch Tepe, Hamrin basin', notes=FLOODED),
    rec('tell-ahmed-al-mughir', 'Tell Ahmed al-Mughir', 'Archaeological Site', 'A tell at Uch Tepe excavated by the Chicago–Copenhagen expedition.',
        [src(ISAC_UCH_NAME, ISAC_UCH, C1, locator='Title and description')], location='Uch Tepe, Hamrin basin', notes=FLOODED),
    rec('tell-ajamat', 'Tell Ajamat', 'Archaeological Site', 'A tell at Uch Tepe excavated by the Chicago–Copenhagen expedition.',
        [src(ISAC_UCH_NAME, ISAC_UCH, C1, locator='Title and description')], alt=['Tell Ajama'], location='Uch Tepe, Hamrin basin', notes=FLOODED),
    rec('tell-atiqeh', 'Tell Atiqeh', 'Archaeological Site',
        'The southernmost Uch Tepe mound, consisting of one large Akkadian palace of about 2300 BC.',
        [src(ISAC_NN_NAME, ISAC_NN, level='search-snippet'), src(YASEEN_NAME, YASEEN, C1, 'search-snippet', 'Map 1')],
        alt=['Tepe Atiqeh', 'Tell Atikeh'], period='Akkadian', year='c. 2300 BC', location='Uch Tepe, Hamrin basin', notes=FLOODED),
    rec('tell-gubba', 'Tell Gubba', 'Archaeological Site',
        'A Hamrin tell excavated by Kokushikan University, one of the circular Early Dynastic fortresses of the basin.',
        [src(KOKUSHIKAN_NAME, KOKUSHIKAN, C1, locator='Excavation reports list'), src(CRAST_NAME, CRAST, level='search-snippet')],
        alt=['Gubba', 'Tell Gubbah'], period='Early Dynastic', location=HAMRIN, notes=FLOODED),
    rec('tell-songor', 'Tell Songor (A, B and C)', 'Archaeological Site',
        'A group of three mounds excavated by Kokushikan University in the Hamrin salvage campaign.',
        [src(KOKUSHIKAN_NAME, KOKUSHIKAN, C1, locator='Excavation reports list'), wd('Q108047701')],
        alt=['Sungur', 'Songor A', 'Songor B', 'Songor C'], coords=(34.17, 45.0, 'Q108047701', 'approximate'), location=HAMRIN, notes=FLOODED),
    rec('tellul-hamediyat', 'Tellul Hamediyat', 'Archaeological Site', 'Mounds in the Hamrin basin excavated by Kokushikan University.',
        [src(KOKUSHIKAN_NAME, KOKUSHIKAN, C1, locator='Excavation reports list')],
        alt=['Tulul al-Humeidiyat', 'Telul-Hamediyat'], location=HAMRIN, notes=FLOODED),
    rec('tell-rubeidheh', 'Tell Rubeidheh', 'Archaeological Site',
        'A Hamrin tell with its own section in the Oriental Institute’s Tell Abada volume; its character is not described in the '
        'excerpts found.',
        [src('Jasim 2021, OIP 147 — Tell Abada: An Ubaid Village in Central Mesopotamia (ISAC)', 'https://isac.uchicago.edu/sites/default/files/uploads/shared/docs/Publications/OIP/oip147.pdf', C1, 'search-snippet',
             'Section TELL AR-RUBEIDHEH'),
         src(YASEEN_NAME, YASEEN, C1, 'search-snippet', 'Map 1, site 69 (ar-Rubeideh)'), wd('Q108047841')],
        alt=['Tell ar-Rubeidheh', 'ar-Rubeideh'], coords=(34.34, 44.91, 'Q108047841', 'approximate'), location=HAMRIN, evidence='limited',
        notes=FLOODED + ' ' + RUBEIDHEH_NOTE),
    rec('tell-abu-husaini', 'Tell Abu Husaini', 'Archaeological Site', 'An Ubaid-period site excavated by the Italian CRAST mission.',
        [src(CRAST_NAME, CRAST, C1, locator='Main article')], alt=['Abu Husaini'], period='Ubaid', location=HAMRIN, notes=FLOODED),
    rec('tell-hassan', 'Tell Hassan', 'Archaeological Site', 'A Halaf-period site excavated by the Italian CRAST mission.',
        [src(CRAST_NAME, CRAST, C1, locator='Main article')], alt=['Tell Hasan'], period='Halaf', location=HAMRIN, notes=FLOODED),
    rec('tell-kesaran', 'Tell Kesaran', 'Archaeological Site', 'A Hamrin site worked by the Italian CRAST mission.',
        [src(CRAST_NAME, CRAST, C1, locator='Main article')], location=HAMRIN, notes=FLOODED),
    rec('kheit-qasim', 'Kheit Qasim (I–III)', 'Archaeological Site',
        'A complex of a cemetery (I) and two mounds (II, III) in the northern Hamrin basin excavated by Jean-Daniel '
        'Forest.', [src(FOREST_NAME, FOREST, C1, locator='Introduction')], alt=['Kheit Qasim I', 'Kheit Qasim II', 'Kheit Qasim III'],
        location='Northern Hamrin basin', notes=FLOODED),
    rec('tell-abu-qasim', 'Tell Abu Qasim', 'Archaeological Site', 'A mound beside Kheit Qasim in the Hamrin basin.',
        [src(FOREST_NAME, FOREST, C1, locator='Introduction'),
         src('Athar al-Rafidain (University of Mosul) — Tell Abu Qasim', 'https://athar.uomosul.edu.iq/index.php/athar/en/article/view/63503', C1, locator='Abstract')],
        alt=['Tell Abu-Qasim', 'Khibet al-Qasim (probable)'], location='Hamrin basin, beside Kheit Qasim',
        notes=FLOODED + ' Probably the same site as Khibet al-Qasim on Yaseen’s map (no. 14).'),

    # ── Sasanian and Islamic heritage ────────────────────────────────────────────────────
    rec('dastagird', 'Dastagird (Royal Dastjerd)', 'Archaeological City',
        'A Sasanian royal city near Ctesiphon, earlier Artemita, rebuilt under Hormizd I, enlarged under Khosrow I with '
        'palace and fortress, and a residence of Khosrow II until the Byzantine emperor Heraclius sacked it in 628.',
        [wp('Dastagird'), wd('Q112246696')], alt=['Dastgerd', 'Daskara', 'Artemita', 'Daskarat al-Malik', 'دسكرة الملك'],
        period='Parthian–Sasanian', year=628, coords=(33.93951, 44.92584, 'Q112246696', 'site'), location='Near Muqdadiya (Shahraban)',
        destroyed='Sacked (628)'),
    rec('tell-al-zendan', 'Tell al-Zendan Fortress', 'Castle',
        'A large rectangular Sasanian fortress 12 km south of Muqdadiya with 16 towers (12 surviving), two gates and '
        'walls about 19 feet thick; Diyala prepared its file for the Tentative List in 2022.',
        [src('Shafaq News (Arabic), 5 March 2022 — Diyala begins listing two heritage monuments', 'https://shafaq.com/ar/مجتـمع/ديالى-تشرع-بخطوات-ضم-معلمين-ثريين-الى-لا-حة-التراث-حدهما-يعود-للحقبة-الساسانية'),
         src(NIC_NAME, NIC, C1, 'search-snippet', 'Historical sites')],
        alt=['Zindan', 'Zendan', 'تل الزندان'], period='Sasanian', location='12 km south of Muqdadiya',
        notes='Dated by the source to the 2nd–3rd century CE, which is early for Sasanian; confirm.'),
    rec('adhaim-ancient-dam', 'Ancient Adhaim Dam', 'Historic Monument',
        'An ancient dam on the Adhaim river beside the modern dam, said to date from the 4th century and to have '
        'watered farmland in Diyala and Salah al-Din until the 12th; reported as Iraq’s first ancient dam proposed for '
        'the heritage list of irrigation works.',
        [src('Shafaq News (Arabic), 5 March 2022 — Diyala begins listing two heritage monuments', 'https://shafaq.com/ar/مجتـمع/ديالى-تشرع-بخطوات-ضم-معلمين-ثريين-الى-لا-حة-التراث-حدهما-يعود-للحقبة-الساسانية'),
         src(NIC_NAME, NIC, C1, 'search-snippet', 'Historical sites (Abbasid Dam on the Al-Uthaim)'), wd('Q115679578')],
        alt=['Abbasid Dam on the Uthaim', 'سد العظيم الأثري'], period='Late Antique to Abbasid', year='4th century',
        coords=(34.553656, 44.504018, 'Q115679578', 'site'), location='Adhaim, northern Diyala',
        notes='The NIC list calls it Abbasid; Shafaq gives a 4th-century date. Listing status needs an official source.'),
    rec('hawsh-kuri', 'Hawsh Kuri Palace', 'Palace',
        'An archaeological palace site in the Qara Tu subdistrict of Khanaqin district.',
        [src(UOD_NAME, UOD, C1, 'search-snippet', 'Chapter 1, p. 30'), wd('Q139901467')],
        alt=['Hawsh Kri', 'Hawsh Korw', 'حوش كري'], coords=(34.571586, 45.472394, 'Q139901467', 'site'), location='Qara Tu, Khanaqin district',
        evidence='limited', notes='Period and description not found.'),
    rec('alwand-bridge', 'Alwand Bridge, Khanaqin', 'Historic Bridge',
        'The historic bridge in the centre of Khanaqin joining the two banks of the Alwand (Helwan) river, named after '
        'Mount Alwand.', [wp('Alwand Bridge'), src(UOD_NAME, UOD, C1, 'search-snippet', 'Chapter 1, p. 30'), wd('Q100258194')],
        alt=['Khanaqin bridge', 'جسر الوند', 'جسر خانقين'],
        coords=(34.34169, 45.37886, 'Q100258194', 'site'), location='Khanaqin',
        notes='Construction date not established from the sources read, so no period is set.'),
    rec('khan-bani-saad', 'Khan Bani Saad Caravanserai', 'Caravanserai',
        'A rare surviving Ottoman caravanserai of 1688 on the Khorasan road, 60 km north of Baghdad; partly demolished '
        'for road widening in the 1940s, damaged by a car bomb in 2015, and under conservation in 2024–26.',
        [src('ALIPH — Conservation and rehabilitation of the Khan Bani Saad caravanserai', 'https://aliph-foundation.org/en/projects/conservation-and-rehabilitation-of-the-khan-bani-saad-caravanserai-diyala'),
         wd('Q4077311')],
        alt=['خان بني سعد'], period='Ottoman', year=1688, coords=(33.565556, 44.543333, 'Q4077311', 'settlement'), location='Bani Saad',
        destroyed='Partly demolished (1940s); damaged (2015)'),
    rec('baqubah-old-saray', 'Old Saray of Baqubah', 'Historic Building', LIMITED_NIC,
        [src(NIC_NAME, NIC, C1, 'search-snippet', 'Historical sites')], alt=['سراي بعقوبة القديم'], location='Baqubah', evidence='limited'),
    rec('tel-abu-uthaina', 'Tel Abu Uthaina', 'Archaeological Site', LIMITED_NIC,
        [src(NIC_NAME, NIC, C1, 'search-snippet', 'Historical sites')], alt=['Tel Abu Uthayna', 'تل أبو أذينة'], evidence='limited'),
    rec('tel-shihab', 'Tel Shihab', 'Archaeological Site', LIMITED_NIC,
        [src(NIC_NAME, NIC, C1, 'search-snippet', 'Historical sites')], evidence='limited'),
    rec('prophet-daniel-shrine-diyala', 'Shrine of the Prophet Daniel (Diyala)', 'Shrine', LIMITED_NIC,
        [src(NIC_NAME, NIC, C1, 'search-snippet', 'Historical sites')], alt=['مرقد النبي دانيال'], evidence='limited',
        notes='Not the Prophet Daniel mosque in Kirkuk Citadel; identity and location to establish.'),
    rec('khanaqin-war-cemetery', 'Khanaqin War Cemetery', 'Cemetery',
        'A Commonwealth War Graves Commission cemetery at Khanaqin.', [wd('Q70633320')],
        period='20th century', coords=(34.345578, 45.373286, 'Q70633320', 'site'), location='Khanaqin', evidence='limited',
        notes='Only the Wikidata record was consulted; the CWGC page should be added.'),

    # ── Kifri (administered by the Kurdistan Region) ────────────────────────────────────────
    rec('eski-kifri', 'Eski Kifri', 'Archaeological Site',
        'A large site about 8 km south-west of Kifri where Claudius Rich found Sasanian and Middle Assyrian material in '
        'the 19th century.',
        [src('University of Sulaimani Journal of Humanities — Archaeological and cultural architecture in Kifri', 'https://sjh.univsul.edu.iq/article?id=2012', level='search-snippet')],
        period='Middle Assyrian; Sasanian', location='8 km south-west of Kifri'),
    rec('kifri-bawa-shaswar', 'Bawa Shaswar Quarter, Kifri', 'Historic Urban Area',
        'Kifri’s traditional quarter of stone, mud and gypsum houses; heritage houses fell from about 60 to 15 before a '
        'restoration campaign in April 2026.',
        [src('Kurdistan24, 21 April 2026 — Kifri’s cultural heritage: restoration drive in Garmian', 'https://www.kurdistan24.net/en/opinion/909509/kifris-cultural-heritage-kurdistan-region-authorities-lead-restoration-drive-in-garmian'),
         wd('Q2626532')],
        alt=['Bawa Shaswar'], coords=(34.689444, 44.960556, 'Q2626532', 'settlement'), location='Kifri'),
    rec('kifri-saray', 'Kifri Saray', 'Historic Building', 'The Ottoman government building of Kifri, named among the town’s heritage sites.',
        [src(K24_KIFRI_NAME, K24_KIFRI, level='search-snippet'),
         src('University of Sulaimani Journal of Humanities — Archaeological and cultural architecture in Kifri', 'https://sjh.univsul.edu.iq/article?id=2012', level='search-snippet')],
        alt=['Qishla of Kifri'], period='Ottoman', location='Kifri', evidence='limited', notes='Named in lists only; no description found.'),
    rec('kifri-qaysari-bazaar', 'Qaysari Bazaar, Kifri', 'Historic Market', 'The traditional arched bazaar of Kifri with its khans.',
        [src(K24_KIFRI_NAME, K24_KIFRI, level='search-snippet'),
         src('PUKmedia — Kifri Keiseri, one of the ancient places of Kurdistan', 'https://pukmedia.com/EN/Details/67896', level='search-snippet')],
        alt=['Kifri Keiseri'], period='Ottoman', location='Kifri', evidence='limited', notes='Condition reported as neglected.'),
    rec('majid-pasha-palace-kifri', 'Majid Pasha Baban Palace, Kifri', 'Palace', 'A palace named among Kifri’s heritage sites.',
        [src(K24_KIFRI_NAME, K24_KIFRI, level='search-snippet')], location='Kifri', evidence='limited', notes='Named only; no description found.'),
    rec('dawood-zarifa-house', 'Dawood Zarifa House, Kifri', 'Historic House', 'A heritage house named among Kifri’s heritage sites.',
        [src(K24_KIFRI_NAME, K24_KIFRI, level='search-snippet')], location='Kifri', evidence='limited', notes='Named only; no description found.'),
]

COVERED = {
    'Abadah', 'Rashid', 'Madhhur', 'Suleimah', 'Telkhi', 'Razuk', 'Ahmed al-Mughir', 'Tell Ajamat', 'Tepe Atiqeh', 'Gubba',
    'Sungur', 'Tulul al-Humeidiyat', 'ar-Rubeideh', 'Abu Husaini', 'Tell Hasan', 'Tell Kesaran', 'Tell Songor A',
    'Tell Songor B', 'Tell Songor C', 'Kheit Qasim', 'Kheit Qasim I', 'Kheit Qasim II', 'Kheit Qasim III', 'Tell Abu Qasim',
    'Khibet al-Qasim', 'Tell Asmar', 'Tell Agrab', 'Khafajah', 'Ishchali', 'Prophet Danial Shrine', 'Tel Abu Uthaina',
    'Tel Shihab', 'Zindan', 'Abbasid Dam on the Al-Uthaim', "Ancient Saray of Ba'quba", 'Khanaqin historic bridge', 'Hawsh Kri',
}


def map_records():
    """Hamrin tells known only as names on Yaseen's map — `limited` evidence."""
    out = []
    for cand in json.loads(C1_FILE.read_text(encoding='utf-8')):
        if cand['governorate'] != 'Diyala' or cand['name'] in COVERED:
            continue
        sources = [src(s['title'] if 'title' in s else YASEEN_NAME, s['url'], C1,
                       'full-text' if s.get('accessLevel') == 'full-text' else 'search-snippet', s.get('locator'))
                   for s in cand['sources']]
        out.append(rec('hamrin-' + slug_of(cand['name']), f"{cand['name']} (Hamrin tell)", 'Archaeological Site',
                       'A tell named on Yaseen’s map of Hamrin basin settlements (2005). Its period, extent and exact '
                       'position are not documented in the sources found.',
                       sources, alt=[cand['name']] + (cand.get('alternativeNames') or []), location=HAMRIN, evidence='limited',
                       notes='Map-name only (search excerpt of the map list). Governorate inferred from the Hamrin basin; '
                             'likely flooded by Lake Hamrin.' + (' ' + MAP_NOTES[cand['name']] if cand['name'] in MAP_NOTES else '')))
    return out


def main():
    records = RECORDS + map_records()
    ids = [r['id'] for r in records]
    if len(ids) != len(set(ids)):
        sys.exit('duplicate ids in batch')
    (HERE / 'diyala-records.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    sites = json.loads(SITES.read_text(encoding='utf-8'))
    have_ids = {s['id'] for s in sites}
    have_slugs = {s['slug'] for s in sites}
    clash = [r['slug'] for r in records if r['slug'] in have_slugs and r['id'] not in have_ids]
    if clash:
        sys.exit(f'slug already used by another record: {clash}')
    added = [r for r in records if r['id'] not in have_ids]
    sites.extend(added)
    SITES.write_text(json.dumps(sites, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    limited = sum(r['evidence_level'] == 'limited' for r in records)
    print(f'{len(records)} records in batch ({len(RECORDS)} written, {len(records) - len(RECORDS)} map names; {limited} limited), '
          f'{len(added)} added, {len(sites)} total')


if __name__ == '__main__':
    main()
