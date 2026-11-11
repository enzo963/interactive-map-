"""Builds the Erbil governorate discovery batch (research date 2026-11-03).

Every record is a source-backed draft: status and verification stay `needs-review`.
Coordinates are only copied from the cited Wikidata item (`coordinates_source`);
`coordinates_precision: "settlement"` marks a pin placed on the town, not the monument.
Unknown periods, UNESCO and 3D flags stay empty/null. Nothing here is approved.

Usage (from the repository root):
    python3 tools/content-pipeline/data/discovery/erbil-2026-11-03/build_erbil_records.py
writes erbil-records.json next to this script and appends new IDs to src/data/sites.json.
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SITES = ROOT / 'src' / 'data' / 'sites.json'
TODAY = '2026-11-03'   # date these sources were actually consulted
C1 = '2026-11-02'      # date of the earlier C1-01 Kurdistan discovery pass

EPAS = 'https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF'
EPAS_NAME = 'Ur et al., The Erbil Plain Archaeological Survey: Preliminary Results, 2012–2020 (IRAQ 83, 2021)'
MMM = 'https://mcid.mcah.columbia.edu/mapping-mesopotamian-monuments/catalogue'
MMM_NAME = 'Columbia University, Mapping Mesopotamian Monuments catalogue'
CAFOSCARI = 'https://edizionicafoscari.unive.it/media/pdf/journals/annali-di-ca-foscari-serie-orientale/2024/1/iss-60-2024_NqHzUNM.pdf'
CAFOSCARI_NAME = "Annali di Ca' Foscari. Serie orientale 60 (2024)"
KRG_BOI = 'https://cdn.gov.krd/OtherEntities/Board%20of%20Investment/English/Publication/Downloads/5.%20Doing%20Business%20in%20Kurdistan.pdf'
KRG_BOI_NAME = 'Kurdistan Regional Government, Board of Investment — Doing Business in the Kurdistan Region'
WP_LIST = 'https://en.wikipedia.org/wiki/List_of_archaeological_sites_in_Erbil_Governorate'
WP_LIST_NAME = 'Wikipedia — List of archaeological sites in Erbil Governorate'
K24_KOYA = 'https://www.kurdistan24.net/ar/story/848728'
K24_KOYA_NAME = 'Kurdistan24 (Arabic), Koya heritage feature, 28 June 2025'
K24_BAZAAR = 'https://www.kurdistan24.net/en/opinion/843784/walk-the-bazaar-tread-on-history-ancient-graves-lie-scattered-across-erbils-bazaar'
K24_BAZAAR_NAME = 'Kurdistan24 opinion (Dr. Kamaran Aziz), 2 June 2025'
RAP = 'https://www.penn.museum/sites/expedition?p=22642'
RAP_NAME = 'Penn Museum, Expedition 56(3) — Searching for the Kingdom of Musasir'


def src(name, url, accessed=TODAY, level='full-text', locator=None):
    entry = {'sourceName': name, 'url': url, 'evidenceId': None, 'accessedAt': accessed, 'accessLevel': level}
    if locator:
        entry['locator'] = locator
    return _declare_mirror(entry)


# The survey article is cited from a copy on Kurdipedia; the card contract rates the work, not the host.
MIRRORS = {EPAS: ('academic-publication', 'Copy of Ur et al. 2021, Iraq 83 (British Institute for the Study of Iraq), hosted on Kurdipedia.')}


def _declare_mirror(entry):
    if entry['url'] in MIRRORS:
        entry['sourceType'], entry['sourceTypeNote'] = MIRRORS[entry['url']]
    return entry


def wd(qid):
    return src(f'Wikidata {qid} (coordinates)', f'https://www.wikidata.org/wiki/{qid}')


def epas(locator):
    return src(EPAS_NAME, EPAS, C1, 'full-text', locator)


def rec(slug, name, category, description, sources, period='', alt=None, coords=None, year=None,
        location='', parent=None, notes=''):
    record = {
        'id': f'site-erbil-{slug}',
        'name': name,
        'governorate': 'Erbil',
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
        'discovery_batch': 'erbil-2026-11-03',
    }
    if alt:
        record['alternativeNames'] = alt
    if location:
        record['approximateLocation'] = location
    if year is not None:
        record['estimated_year'] = year
    if parent:
        record['parentSite'] = parent
    if coords:
        lat, lng, qid, precision = coords
        record['latitude'] = lat
        record['longitude'] = lng
        record['coordinates_source'] = f'wikidata:{qid}'
        record['coordinates_precision'] = precision
    if notes:
        record['review_notes'] = notes
    return record


RECORDS = [
    # ── Erbil city: citadel components and the historic lower town ──────────────────────
    rec('great-mosque-erbil-citadel', 'Great Mosque of Erbil Citadel', 'Mosque',
        'The Great (Mulla Afandi) Mosque is the only religious building still standing on Erbil Citadel. '
        'Its founding date is unknown; the mosque is recorded on the citadel from the 13th century, and its '
        'present single-domed roof dates from a 1959 reconstruction. A 2025 KRG release lists its restoration '
        'among recent citadel works.',
        [src('Wikipedia — Citadel of Erbil', 'https://en.wikipedia.org/wiki/Citadel_of_Erbil', level='search-snippet'),
         src('Kurdistan Regional Government, August 2025 citadel restoration release',
             'https://gov.krd/dmi-en/activities/news-and-press-releases/2025/august/erbil-citadel-and-choli-minaret-undergo-major-restoration-to-preserve-historic-identity/',
             level='search-snippet'),
         wd('Q141224441')],
        alt=['Mulla Afandi Mosque'], coords=(36.191457, 44.009777, 'Q141224441', 'site'),
        parent='site-erbil-erbil-citadel', location='Erbil Citadel',
        notes='Wikidata gives inception 1797; the citadel sources say the founding date is unknown. Period left empty.'),
    rec('erbil-citadel-hammam', 'Erbil Citadel Hammam', 'Historic Bath',
        'The hammam is the oldest bathhouse on Erbil Citadel and is dated to the 18th century (1775 in the UNESCO '
        'documentation). A January 2025 KRG release reported its US-funded restoration as nearly finished.',
        [src(MMM_NAME, MMM, C1, locator='Catalogue entry: Erbil/Hawler Hammam'),
         src('Harvard University, Whose Culture? — Erbil', 'https://whoseculture.hsites.harvard.edu/erbil', level='search-snippet'),
         src('Kurdistan Regional Government, January 2025 citadel renovation release',
             'https://gov.krd/dmi-en/activities/news-and-press-releases/2025/january/erbil-citadel-renovation-to-be-accelerated-reviving-the-world-s-oldest-inhabited-landmark-with-global-heritage-standards/',
             level='search-snippet')],
        period='Ottoman', year=1775, parent='site-erbil-erbil-citadel', location='Erbil Citadel',
        notes='UNESCO date 1775 reported via search snippet; confirm against the nomination file.'),
    rec('house-b13-topkhana', 'House B13 (37 Topkhana)', 'Historic House',
        'A historic courtyard house in the Topkhana quarter of Erbil Citadel, documented in Columbia University’s '
        'Mapping Mesopotamian Monuments survey.',
        [src(MMM_NAME, MMM, C1, locator='Catalogue entry: House B13 (37 Topkhana)'),
         src('Columbia MCID — House B13 image record', 'https://mcid.mcah.columbia.edu/cataloging-viewer/1314_iraq2013_houseb13_img_010', level='search-snippet')],
        parent='site-erbil-erbil-citadel', location='Topkhana quarter, Erbil Citadel'),
    rec('rashid-agha-house', 'Rashid Agha House', 'Historic House',
        'A historic house in Erbil documented in Columbia University’s Mapping Mesopotamian Monuments catalogue.',
        [src(MMM_NAME, MMM, C1, locator='Catalogue entry: Rashid Agha House')], location='Erbil'),
    rec('selim-qaqa-house', 'Selim Qaqa House', 'Historic House',
        'A historic house in Erbil documented in Columbia University’s Mapping Mesopotamian Monuments catalogue.',
        [src(MMM_NAME, MMM, C1, locator='Catalogue entry: Selim Qaqa House')], location='Erbil'),
    rec('yaqub-aga-house', 'Yaqub Aga House', 'Historic House',
        'A historic house in Erbil documented in Columbia University’s Mapping Mesopotamian Monuments catalogue.',
        [src(MMM_NAME, MMM, C1, locator='Catalogue entry: Yaqub Aga House')], location='Erbil'),
    rec('kurdish-textile-museum', 'Kurdish Textile and Cultural Museum', 'Museum',
        'A museum of Kurdish textiles and crafts founded in 2004 in a renovated mansion in the south-east quarter '
        'of Erbil Citadel. It also works to keep traditional weaving methods alive.',
        [src('Wikipedia — Kurdish Textile and Cultural Museum', 'https://en.wikipedia.org/wiki/Kurdish_Textile_and_Cultural_Museum'),
         wd('Q2302612')],
        coords=(36.190123, 44.009739, 'Q2302612', 'site'), parent='site-erbil-erbil-citadel', location='Erbil Citadel'),
    rec('erbil-civilization-museum', 'Erbil Civilization Museum', 'Museum',
        'Erbil’s archaeological museum, the second largest in the Kurdistan Region, with finds from prehistory to '
        'the late Abbasid period. The museum began in the 1960s, moved into the citadel in the 1970s and later '
        'to its own building.',
        [src('Wikipedia — Erbil Civilization Museum', 'https://en.wikipedia.org/wiki/Erbil_Civilization_Museum'),
         wd('Q28716288')],
        coords=(36.177394, 44.013247, 'Q28716288', 'site'), location='Erbil'),
    rec('khalidiya-khanqah-mosque', 'Khalidiya Khanqah Mosque and Tekke', 'Mosque',
        'A Naqshbandi Sufi complex of mosque, tekke, library and market beside Erbil Citadel. It was founded in '
        '1805 by Mullah Hidayatullah al-Arbili at the request of Mawlana Khalid al-Naqshbandi and rebuilt in 1961. '
        'The surrounding Khanqah quarter takes its name from it.',
        [src('Wikipedia — Khalidiya Khanqah Mosque and Tekke', 'https://en.wikipedia.org/wiki/Khalidiya_Khanqah_Mosque_and_Tekke'),
         wd('Q28715077')],
        alt=['Mzgawti Xanaqa'], period='Ottoman', year=1805,
        coords=(36.188888, 44.011014, 'Q28715077', 'site'), location='Khanqah quarter, below Erbil Citadel'),
    rec('mausoleum-sultan-muzaffar', 'Mausoleum of Sultan Muzaffar', 'Mausoleum',
        'A mausoleum attributed to Sultan Muzaffar al-Din Gökböri, the 12th–13th-century ruler of Erbil, '
        'near the Erbil Governorate building. It is one of several historic tombs in the old bazaar area.',
        [src(K24_BAZAAR_NAME, K24_BAZAAR)],
        location='Near the Erbil Governorate building',
        notes='Single opinion-article source; attribution and fabric date need verification.'),
    rec('tomb-of-uzair', 'Grave of Prophet Uzair (Ezra), Erbil', 'Shrine',
        'A grave venerated as that of the Prophet Uzair (Ezra), near the Sheikh Choli Mosque in Erbil’s old bazaar '
        'district.',
        [src(K24_BAZAAR_NAME, K24_BAZAAR)],
        location='Near Sheikh Choli Mosque, Erbil',
        notes='Traditional attribution reported by one opinion article; not a historical identification.'),
    rec('erbil-jewish-cemetery', 'Jewish Cemetery of Erbil', 'Cemetery',
        'Erbil’s historic Jewish cemetery, a reminder of the city’s former Jewish community.',
        [src(K24_BAZAAR_NAME, K24_BAZAAR)], location='Erbil',
        notes='Exact location not given by the source.'),

    # ── Ankawa ─────────────────────────────────────────────────────────────────────────
    rec('st-george-church-ankawa', 'St. George’s Church, Ankawa', 'Church',
        'Mar Gewargis is described as the oldest Chaldean Catholic church in Ankawa. The building is probably from '
        'the 9th century, with parts possibly older, and was restored in 1995.',
        [src('Wikipedia — St. George’s Church, Ankawa', 'https://en.wikipedia.org/wiki/St._George%27s_Church,_Ankawa', level='search-snippet')],
        alt=['Mar Gewargis Church'], location='Ankawa, Erbil',
        notes='Wikipedia article flagged as needing citations; treat the 816 date as unverified.'),
    rec('mart-shmoni-church-ankawa', 'Mart Shmoni Church, Ankawa', 'Church',
        'A Syriac Catholic church dedicated to Mart Shmoni in Ankawa, the Christian suburb of Erbil.',
        [wd('Q98917963'),
         src('Wikipedia — Ankawa', 'https://en.wikipedia.org/wiki/Ankawa')],
        coords=(36.234961, 43.988194, 'Q98917963', 'site'), location='Ankawa, Erbil',
        notes='No construction date found; heritage significance needs a documented source.'),
    rec('melqi-mar-qardagh', 'Melqi (Mar Qardagh tradition), Ankawa', 'Religious Heritage Site',
        'Ankawa has been linked to the Neo-Assyrian town of Milqia, seat of an Akitu house of Ishtar near Arbela. '
        'Melqi is the martyrdom and burial place of Saint Mar Qardagh in the Syriac History of Mar Qardagh, and '
        'the saint is still venerated in Ankawa.',
        [src('Wikipedia — Ankawa', 'https://en.wikipedia.org/wiki/Ankawa'),
         src('Wikipedia — Mar Qardagh', 'https://en.wikipedia.org/wiki/Mar_Qardagh', level='search-snippet')],
        alt=['Milqia', 'Melqi'], location='Ankawa, Erbil',
        notes='Scholarly identification (Parpola) and hagiographic tradition, not an excavated site.'),

    # ── Erbil plain: tells and ancient cities (EPAS and excavation projects) ─────────────
    rec('qasr-shemamok', 'Qasr Shemamok (Kilizu)', 'Archaeological Site',
        'A 20-hectare tell rising about 30 m above the plain, 30 km south of Erbil on the Shiwazor river, with a '
        'lower town of about 50 hectares. Under the Assyrians it was Kilizu, a provincial capital; remains run '
        'from Hurrian and Assyrian to Parthian and Sasanian times. A French mission has excavated there since 2011.',
        [src('Wikipedia — Qasr Shemamok', 'https://en.wikipedia.org/wiki/Qasr_Shemamok'),
         src('Encyclopaedia Iranica — Kilizu i. The site', 'https://www.iranicaonline.org/articles/kilizu/kilizu-i-the-site/', level='search-snippet'),
         epas('p. 221; EPAS Site 2'), wd('Q25404315')],
        alt=['Kilizu', 'Kakzu', 'Qasr Shamamok'], period='Assyrian to Sasanian',
        coords=(36.10561, 43.75245, 'Q25404315', 'site'), location='Shamamok plain, south-west of Erbil'),
    rec('kurd-qaburstan', 'Kurd Qaburstan', 'Archaeological Site',
        'A large walled city 22 km south-west of Erbil, mainly of the Middle Bronze Age (early 2nd millennium BC) '
        'and proposed as ancient Qabra. A UCF-led team found evidence of a siege in 2025, together with the first '
        'substantial group of cuneiform tablets from the Erbil region.',
        [src('Wikipedia — Kurd Qaburstan', 'https://en.wikipedia.org/wiki/Kurd_Qaburstan'),
         src('University of Central Florida news — excavation at Kurd Qaburstan',
             'https://www.ucf.edu/news/ucf-led-excavation-reveals-evidence-of-life-conflict-in-ancient-mesopotamia/', level='search-snippet'),
         src('Kurdistan24, 13 July 2025 — Excavations conclude at ancient sites in southwestern Erbil',
             'https://www.kurdistan24.net/en/story/851569/excavations-conclude-at-ancient-sites-in-southwestern-erbil'),
         epas('p. 220; EPAS Site 31'), wd('Q115521019')],
        alt=['Qabra', 'Yadi Qzlar', 'Yedi Kizlar'], period='Middle Bronze Age', year='early 2nd millennium BC',
        coords=(35.99, 43.86, 'Q115521019', 'site'), location='Next to Yedi Kizlar village, Shamamok sub-district',
        notes='Kurdistan24 reports the excavation under the village name Yadi Qzlar; Wikipedia places Yedi Kizlar on the lower town, so they are treated as one site.'),
    rec('tell-baqrta', 'Tell Baqrta', 'Archaeological Site',
        'A major mound near Qasr Shemamok that reached about 80 hectares in the Early Bronze Age. It was recorded '
        'by the Erbil Plain Archaeological Survey.',
        [epas('p. 218; EPAS Site 17'),
         src('Wikipedia — Qasr Shemamok', 'https://en.wikipedia.org/wiki/Qasr_Shemamok'), wd('Q15882688')],
        alt=['Girdi Baqrta', 'Baqrta'], period='Early Bronze Age',
        coords=(35.95185, 43.909633, 'Q15882688', 'site'), location='Erbil plain, near Qasr Shemamok'),
    rec('gird-i-matrab', 'Gird-i Matrab', 'Archaeological Site',
        'A tell about 30 km south of Erbil, first identified by the Erbil Plain Archaeological Survey in 2012. '
        'Excavations by Bryn Mawr College since 2022 found Late Chalcolithic levels from the 5th millennium BC, '
        'an Iron Age reoccupation and a Hellenistic quarter; under the Seleucids and Parthians it grew to about '
        '25 hectares.',
        [src('Kurdistan24, 26 July 2025 — Vast multi-era settlement uncovered near Erbil',
             'https://www.kurdistan24.net/en/story/853951/vast-multi-era-settlement-uncovered-near-erbil'),
         src('Kurdistan24, 22 October 2026 — Gird-i Matrab excavation renewed', 'https://www.kurdistan24.net/en/story/947792'),
         epas('p. 222; EPAS Site 6'), wd('Q140609018')],
        alt=['Girdi Matraba', 'Tell Mitrab'], period='Late Chalcolithic to Parthian',
        coords=(35.93704, 43.91685, 'Q140609018', 'site'), location='Shamamok plain, south of Erbil'),
    rec('gird-lashkir', 'Gird Lashkir', 'Archaeological Site',
        'A tell with about 14 m of deposits over some 4 hectares near Wadi Kasnazan, close to Kasnazan and '
        'Banaslawa. Excavations by the Autonomous University of Barcelona since 2015 found Halaf and Ubaid levels '
        'and occupation into the 1st millennium BC; reports describe it as a trade centre in 3500–2000 BC.',
        [src('Popular Archaeology — Iraqi Kurdistan site reveals evolution toward the first cities of Mesopotamia',
             'https://popular-archaeology.com/article/iraqi-kurdistan-site-reveals-evolution-toward-the-first-cities-of-mesopotamia/', level='search-snippet'),
         src('SyriacPress, 13 June 2024 — Spanish team unearths Bronze Age city in Erbil', 'https://syriacpress.com/?p=58859')],
        alt=['Gird Lashkar'], period='Neolithic to Iron Age', location='Near Wadi Kasnazan, east of Erbil'),
    rec('girdi-sheikh-ahmad', 'Sheikh Ahmad archaeological site', 'Archaeological Site',
        'An excavated archaeological site on the Erbil–Koya road, shown in a 2026 Rudaw report on Erbil’s '
        'archaeology. The Wikipedia list of Erbil sites names it Girdi Sheikh Ahmed.',
        [src('Rudaw, 2 September 2026 — Erbil archaeology report', 'https://rudaw.net/english/categories/kurdistan/1079102'),
         src(WP_LIST_NAME, WP_LIST)],
        alt=['Girdi Sheikh Ahmed'], location='Erbil–Koya road',
        notes='Only a photo caption and a list entry; period unknown.'),
    rec('tell-surezha', 'Surezha', 'Archaeological Site',
        'A tell on the Erbil plain recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 213; EPAS Site 27'), wd('Q108147342')],
        alt=['Tell Surezha'], coords=(35.998544, 43.885568, 'Q108147342', 'site'), location='Erbil plain'),
    rec('tell-nader', 'Tell Nader', 'Archaeological Site',
        'A tell on the eastern edge of Erbil recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 213; EPAS Site 5'), wd('Q108147320')],
        alt=['Tell Nadir'], coords=(36.173148, 44.07549, 'Q108147320', 'site'), location='Erbil plain'),
    rec('bash-tapa', 'Bash Tapa', 'Archaeological Site',
        'A tell in southern Erbil Governorate listed among the governorate’s archaeological sites.',
        [src(WP_LIST_NAME, WP_LIST), wd('Q108147277')],
        alt=['Bashtepe'], coords=(35.881041, 44.00659, 'Q108147277', 'site'), location='South of Erbil',
        notes='Not the Bash Tapia castle of Mosul.'),
    rec('kelik-mishik', 'Kelik Mishik', 'Archaeological Site',
        'A tell south-west of Erbil listed among the governorate’s archaeological sites.',
        [src(WP_LIST_NAME, WP_LIST), wd('Q108147157')],
        alt=['Kalak Meshak'], coords=(36.157689, 43.977406, 'Q108147157', 'site'), location='South-west of Erbil'),
    rec('satu-qala', 'Satu Qala (Idu)', 'Archaeological Site',
        'A tell on the right bank of the Lower Zab, 70 km south-east of Erbil, identified as ancient Idu. It was a '
        'Middle Assyrian provincial capital, then the seat of independent kings, and stayed occupied into the '
        'Middle Islamic period.',
        [src('Wikipedia — Idu (city)', 'https://en.wikipedia.org/wiki/Idu_(city)'), wd('Q15876602')],
        alt=['Idu', 'Idum', 'Sātu Qalā'], period='Late Bronze Age to Islamic',
        coords=(35.875278, 44.697222, 'Q15876602', 'site'), location='Lower Zab, south-east of Erbil'),
    rec('girdi-daghan', 'Girdi Daghan', 'Archaeological Site', 'A tell recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 213; EPAS Site 228')], location='Erbil plain'),
    rec('girdi-helawa', 'Girdi Helawa', 'Archaeological Site',
        'A tell near Qasr Shemamok and Kurd Qaburstan recorded by the Erbil Plain Archaeological Survey and '
        'known for Late Chalcolithic remains.',
        [epas('p. 213; EPAS Site 272'), src(WP_LIST_NAME, WP_LIST)], alt=['Helawa', 'Tell Halawa'],
        location='Erbil plain'),
    rec('girdi-gozka', 'Girdi Gozka', 'Archaeological Site', 'A tell recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 213; EPAS Site 466')], alt=['Gozka'], location='Erbil plain'),
    rec('qalinj-agha', 'Qalinj Agha', 'Archaeological Site', 'A mound inside Erbil recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 213')], location='Erbil'),
    rec('girdi-khazna', 'Girdi Khazna', 'Archaeological Site', 'A tell recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 214; EPAS Site 45')], alt=['Tell Khazna'], location='Erbil plain'),
    rec('tell-quri-beg', 'Tell Quri Beg', 'Archaeological Site', 'A tell recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 218; EPAS Site 220')], alt=['Girdi Quri Beg'], location='Erbil plain'),
    rec('aliawa', 'Aliawa', 'Archaeological Site',
        'A tell near Qasr Shemamok and Kurd Qaburstan recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 220; EPAS Site 246')], alt=['Tell Aliawa'], location='Erbil plain'),
    rec('girdi-abdulaziz', 'Girdi Abdulaziz', 'Archaeological Site', 'A tell recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 220; EPAS Site 282')], location='Erbil plain'),
    rec('girdi-qawagh', 'Girdi Qawagh', 'Archaeological Site', 'A tell recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 221; EPAS Site 180')], location='Erbil plain'),
    rec('tell-abu-shita', 'Tell Abu Shita', 'Archaeological Site', 'A tell recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 222; EPAS Site 130')], location='Erbil plain'),
    rec('girdi-peshka', 'Girdi Peshka', 'Archaeological Site', 'A tell recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 222; EPAS Site 404')], location='Erbil plain'),
    rec('zaga', 'Zaga', 'Archaeological Site', 'A tell recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 224; EPAS Site 207')], alt=['Gird-i Zaga'], location='Erbil plain'),
    rec('awena', 'Awena', 'Archaeological Site', 'A tell recorded by the Erbil Plain Archaeological Survey.',
        [epas('p. 224; EPAS Site 325')], alt=['Qalat Awena'], location='Erbil plain'),

    # ── Shaqlawa and Harir ─────────────────────────────────────────────────────────────
    rec('khanzad-castle', 'Khanzad Castle', 'Castle',
        'A two-storey stone and gypsum castle on a hilltop 22 km from Erbil on the Erbil–Shaqlawa road. It was '
        'built in the late 16th century by Mir Khanzad, ruler of the Soran Emirate, as her residence and to '
        'defend Erbil.',
        [src('Wikipedia — Xanzad Castle', 'https://en.wikipedia.org/wiki/Xanzad_Castle'),
         src(CAFOSCARI_NAME, CAFOSCARI, C1, locator='Text at notes 16–18'), wd('Q5989037')],
        alt=['Xanzad Castle', 'Banaman Castle'], period='Soran Emirate', year='16th century',
        coords=(36.35359, 44.18001, 'Q5989037', 'site'), location='Erbil–Shaqlawa road'),
    rec('dwin-castle', 'Dwin Castle', 'Castle',
        'A castle in the mountain village of Dwin, about 31 km north-east of Erbil, long linked by local tradition '
        'to the family of Saladin. Research began in 2014 with Pázmány Péter Catholic University and Salahaddin '
        'University; restoration plans were reviewed in 2025.',
        [src('Shafaq News — Dwin Castle restoration revives Ayyubid link', 'https://shafaq.com/en/Kurdistan/Dwin-Castle-restoration-revives-Ayyubid-link'),
         src(CAFOSCARI_NAME, CAFOSCARI, C1, locator='Text at notes 16–18'), wd('Q109259098')],
        alt=['Dween Castle', 'Dwen Castle'], coords=(36.4633, 44.1331, 'Q109259098', 'site'),
        location='Dwin village, Shaqlawa district',
        notes='The Saladin birthplace link is local tradition, not documented fact.'),
    rec('rabban-boya-shrine', 'Rabban Boya Shrine', 'Shrine',
        'A cave shrine at about 1,070 m above Shaqlawa, sacred since early Christian times and shared by Christians '
        'and Muslims, who know it as Sheikh Wso Rahman. It was recognised as a historic site in 1945; an old '
        'church and cemetery lie nearby.',
        [src('Kurdistan Chronicle — Raban Boya: One Shrine, Two Faiths', 'https://kurdistanchronicle.com/b/2799'),
         src(KRG_BOI_NAME, KRG_BOI, C1, locator='p. 96, tourism in Erbil Governorate')],
        alt=['Rabban Beya Monastery', 'Raban Boya', 'Sheikh Wso Rahman'], location='Beya valley above Shaqlawa'),
    rec('batas-harir-relief', 'Batas-Harir Rock Relief', 'Rock Relief',
        'A rock relief of a standing figure carved on the cliff of Mount Harir above the villages of Batas and '
        'Harir. Its date is debated: the dress suggests the Parthian period, and one reading identifies the '
        'figure as a ruler of Adiabene of the 1st century AD.',
        [src('World History Encyclopedia — Rock relief of Mountain Hareer', 'https://www.worldhistory.org/image/3086/rock-relief-of-mountain-hareer/', level='search-snippet'),
         wd('Q4122022')],
        alt=['Harir relief', 'Hareer relief'], period='Parthian (debated)',
        coords=(36.55167, 44.35161, 'Q4122022', 'settlement'), location='Mount Harir, Harir sub-district',
        notes='Pin is on Harir town (Wikidata), not the relief itself. See Grabowski 2011 for the scholarly study.'),
    rec('dere-castle', 'Dere Castle', 'Castle',
        'A ruined castle about 40 km north of Erbil on the Erbil–Rawanduz road. Sources disagree on its age: some '
        'attribute it to Muhammad Pasha of Soran in the 19th century, others to an older foundation that was rebuilt.',
        [src(CAFOSCARI_NAME, CAFOSCARI, C1, locator='Text at notes 16–18'),
         src('KurdShop — Dere Castle', 'https://kurdshop.net/en/history/3016', level='search-snippet')],
        alt=['Dera Castle', 'Derry Castle'], location='Erbil–Rawanduz road'),

    # ── Soran, Rawanduz, Sidakan (Bradost) and Barzan ─────────────────────────────────────
    rec('rawanduz-old-town', 'Rawanduz Old Town', 'Historic Town',
        'The old quarters of Rawanduz keep narrow lanes and flat-roofed stone houses. Rawanduz was founded by the '
        'Rawadid dynasty in the 10th century and was capital of the Soran Emirate until 1836. In 2023 the '
        'government began buying and restoring historic houses, starting with ten.',
        [src('Wikipedia — Rawandiz', 'https://en.wikipedia.org/wiki/Rawandiz'),
         src('Rudaw, 2023 — Government initiates process to preserve Rawanduz historic houses', 'https://www.rudaw.net/english/kurdistan/080320232', level='search-snippet'),
         wd('Q579438')],
        alt=['Rawandiz', 'Rewandiz'], coords=(36.611944, 44.524722, 'Q579438', 'settlement'), location='Rawanduz, Soran district'),
    rec('qalat-lokhan', 'Qalat Lokhan', 'Castle',
        'A fortification on the northern edge of Rawanduz, discussed with the other late-Islamic castles of the '
        'Soran region.',
        [src(CAFOSCARI_NAME, CAFOSCARI, C1, locator='Text at notes 16–18')], location='North edge of Rawanduz'),
    rec('gird-i-dasht', 'Gird-i Dasht', 'Archaeological Site',
        'The largest known mound in the Soran area, rising about 20 m above the plain. The Rowanduz Archaeological '
        'Program excavated and surveyed it from 2013.',
        [src('Academia.edu — Rowanduz Archaeological Program first report', 'https://www.academia.edu/6884640', level='search-snippet'),
         src(RAP_NAME, RAP, level='search-snippet')], location='Soran plain'),
    rec('gund-i-topzawa', 'Gund-i Topzawa', 'Archaeological Site',
        'A burned early Iron Age settlement near Sidakan, cut into a hillside and uncovered when road widening in '
        '2013 disturbed it. Radiocarbon dates place its construction in the early 1st millennium BC, and its '
        'destruction fits Sargon II’s campaign against Musasir in 714 BC.',
        [src(RAP_NAME, RAP, level='search-snippet'),
         src('Penn Museum, Expedition 56(3) — Sargon’s march', 'https://www.penn.museum/documents/publications/expedition/56-3/sargons-march.pdf', level='search-snippet')],
        period='Iron Age', year='early 1st millennium BC', location='Topzawa, Sidakan sub-district'),
    rec('topzawa-stele', 'Topzawa Stele', 'Stele',
        'A bilingual Urartian–Assyrian stele near Sidakan recording a campaign to Musasir by the Urartian king '
        'Rusa I. Sources disagree whether it is still in place or held in Erbil.',
        [src('Wikipedia — Sidekan', 'https://en.wikipedia.org/wiki/Sidekan'),
         src('Wikipedia — Erbil Civilization Museum', 'https://en.wikipedia.org/wiki/Erbil_Civilization_Museum', level='search-snippet')],
        period='Urartian', year='c. 730 BC', location='Topzawa, near Sidakan',
        notes='Current custody disputed (in situ vs. Erbil museum). Year is the approximate reign of Rusa I.'),
    rec('kelashin-stele', 'Kelashin Stele', 'Stele',
        'A stele at the Kelashin pass bearing an Urartian–Akkadian bilingual text of about 800 BC, first described '
        'in 1827. It records the Urartian king Ishpuini taking the city of Musasir (Ardini).',
        [src('Wikipedia — Kelashin Stele', 'https://en.wikipedia.org/wiki/Kelashin_Stele'), wd('Q3849877')],
        alt=['Kelishin Stele', 'Keli-Shin'], period='Urartian', year='c. 800 BC',
        coords=(36.9, 44.933333, 'Q3849877', 'site'), location='Kelashin pass, Sidakan sub-district',
        notes='The stele sits on the Iraq–Iran border; sources disagree on its present custody.'),
    rec('mudjesir-haldi-temple', 'Mudjesir (proposed Musasir temple of Haldi)', 'Archaeological Site',
        'Column bases and statues found in the village of Mudjesir have been linked to the temple of Haldi at '
        'Musasir (Ardini), sacked by Sargon II in 714 BC. The identification is a working hypothesis; other '
        'candidates lie in Iran.',
        [src('Rudaw, 22 July 2014 — A stunning find in Kurdistan', 'https://www.rudaw.net/english/culture/22072014', level='search-snippet'),
         src(RAP_NAME, RAP, level='search-snippet'),
         src('Wikipedia — Musasir', 'https://en.wikipedia.org/wiki/Musasir')],
        alt=['Mdjeser', 'Musasir', 'Ardini'], period='Urartian (proposed)', location='Mudjesir village, Sidakan sub-district',
        notes='Identification with Musasir is debated.'),
    rec('bestoon-cave', 'Bestoon Cave', 'Archaeological Cave',
        'A cave in the Bradost mountains south-west of Soran where 1950s work with Fuad Safar found Neolithic '
        'remains. It has been developed for visitors.',
        [src('Showcaves.com — Beston Cave', 'https://showcaves.com/english/other/caves/Beston.html', level='search-snippet'),
         src(KRG_BOI_NAME, KRG_BOI, C1, locator='p. 96, tourism in Erbil Governorate'), wd('Q21032550')],
        alt=['Bastoon Cave', 'Bastun Cave'], period='Neolithic',
        coords=(36.7148, 44.47538, 'Q21032550', 'site'), location='Bradost mountain near Hawdiyan'),
    rec('diyan-cave', 'Diyan Cave', 'Cave',
        'A cave on Bradost mountain near Hawdiyan, listed with Bestoon Cave among the heritage destinations of '
        'Erbil Governorate.',
        [src(KRG_BOI_NAME, KRG_BOI, C1, locator='p. 96, tourism in Erbil Governorate')], location='Bradost mountain near Hawdiyan',
        notes='No archaeological source found yet.'),
    rec('zawi-chemi-shanidar', 'Zawi Chemi Shanidar', 'Archaeological Site',
        'An open-air settlement below Shanidar Cave excavated by Ralph Solecki, important for the transition '
        'to settled life in the Zagros.',
        [src('PLOS ONE — The Zagros Epipalaeolithic revisited (Palegawra)', 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0239564', C1,
             locator='Introduction, Solecki excavations')],
        period='Epipalaeolithic–early Neolithic', location='Near Shanidar Cave'),
    rec('plngan-cave', 'Plngan Cave', 'Archaeological Cave',
        'A cave at the foot of Plngan Mountain in Soran where the Soran antiquities department and the Autonomous '
        'University of Barcelona reported human footprints and remains of the late Old and early Middle Stone Age '
        'in 2025.',
        [src('Rudaw, 17 May 2025 — Stone Age footprints discovered in Soran', 'https://rudaw.net/english/kurdistan/17052025')],
        period='Palaeolithic–Mesolithic', location='Plngan Mountain, Soran'),
    rec('bana-helk', 'Bana Helk', 'Archaeological Site',
        'A hilltop Neolithic village north of Erbil where Kurdish and Spanish archaeologists found Halaf-period '
        'remains and decorated pottery.',
        [src('Rudaw, 29 May 2022 — Traces of Halaf culture discovered in north Erbil', 'https://www.rudaw.net/english/kurdistan/29052022', level='search-snippet')],
        period='Halaf', location='Soran area'),
    rec('mar-gewargis-bdeyal', 'Mar Gewargis Church, Bedyal', 'Church',
        'The historic church of Bedyal, one of the oldest Christian villages of the Barzan area. In 2025 the '
        'Assyrian Church of the East patriarch called for careful restoration of the region’s historic churches.',
        [src('Kurdistan Chronicle — A Christian village in the heart of Kurdistan’s mountains', 'https://kurdistanchronicle.com/b/3756', level='search-snippet'),
         src('SyriacPress, 12 August 2025 — Patriarch Mar Awa III on historic churches',
             'https://syriacpress.com/blog/2025/08/12/patriarch-mar-awa-iii-royel-emphasizes-importance-of-preserving-and-restoring-historic-churches-in-iraq/', level='search-snippet')],
        alt=['Bdeyal'], location='Bedyal village, Mergasor district'),

    # ── Koya (Koy Sanjaq) ──────────────────────────────────────────────────────────────
    rec('koya-old-town', 'Old Town of Koya', 'Historic Town',
        'The late-Ottoman old town of Koya (Koy Sanjaq), with architecture rarely found elsewhere in the Kurdistan '
        'Region. ALIPH and WADI have funded emergency stabilisation and documentation. The Bayz Agha and Hawawan '
        'quarters are among its oldest.',
        [src('ALIPH Foundation — Safeguarding the Old Town of Koya',
             'https://www.aliph-foundation.org/en/projects/safeguarding-the-old-town-of-koya-emergency-intervention-and-documentation-of-cultural-heritage', level='search-snippet'),
         src('WADI — Safeguarding the Old Town of Koya', 'https://wadi-online.org/2022/05/29/safeguarding-the-old-town-of-koya/', level='search-snippet'),
         src(K24_KOYA_NAME, K24_KOYA), wd('Q1778824')],
        alt=['Koy Sanjaq', 'Koysinjaq'], period='Ottoman',
        coords=(36.08278, 44.62861, 'Q1778824', 'settlement'), location='Koya'),
    rec('grand-mosque-koya', 'Grand Mosque of Koya', 'Mosque',
        'One of Koya’s oldest landmarks, founded in 1844, with a domed ceiling carrying Qur’anic inscriptions, '
        'marble columns and a stone minbar. An archaeological field study was published by Zeidan Rashid in 2013.',
        [src(K24_KOYA_NAME, K24_KOYA),
         src('Annals of the Faculty of Arts, Ain Shams University — Zeidan Rashid, The Great Mosque of Koysinjaq',
             'https://aafu.journals.ekb.eg/article_6102.html', level='search-snippet')],
        alt=['Great Mosque of Koysinjaq'], period='Ottoman', year=1844, parent='site-erbil-koya-old-town', location='Koya bazaar'),
    rec('koya-qaysari-bazaar', 'Haji Bakr Agha Qaysari, Koya', 'Historic Market',
        'A covered market of more than 90 shops built in 1840, described as one of the oldest bazaars in Iraqi '
        'Kurdistan and still in use.',
        [src(K24_KOYA_NAME, K24_KOYA),
         src('World Monuments Fund on Google Arts & Culture — Qaisari Bazaar in Koya',
             'https://artsandculture.google.com/asset/a-night-view-of-the-qaisari-bazaar-in-koya-iraqi-kurdistan-world-monuments-fund/9gHrsLhOemCQrA', level='search-snippet')],
        alt=['Qaisari Bazaar of Koya'], period='Ottoman', year=1840, parent='site-erbil-koya-old-town', location='Koya bazaar'),
    rec('mahmud-agha-khan-koya', 'Mahmud Agha Khan, Koya', 'Caravanserai',
        'A two-storey stone, gypsum and timber caravanserai of 1861–62 with 64 rooms at the centre of Koya’s bazaar, '
        'one of the town’s four old khans. WADI stabilised its endangered structures; Kurdistan24 described it as '
        'neglected in 2025.',
        [src(K24_KOYA_NAME, K24_KOYA),
         src('WADI — Safeguarding the Old Town of Koya', 'https://wadi-online.org/2022/05/29/safeguarding-the-old-town-of-koya/', level='search-snippet')],
        period='Ottoman', year=1861, parent='site-erbil-koya-old-town', location='Koya bazaar'),
    rec('mulla-abdul-majid-house', 'Mulla Abdul Majid House, Koya', 'Historic House',
        'A two-storey mud, lime and timber house with two courtyards and a hexagonal fountain, restored as a '
        'heritage museum of life about 250 years ago.',
        [src(K24_KOYA_NAME, K24_KOYA)], parent='site-erbil-koya-old-town', location='Koya'),
    rec('mulla-kura-house', 'Mulla Kura House, Koya', 'Historic House',
        'Described as one of the most prominent historic houses of Koya.',
        [src(K24_KOYA_NAME, K24_KOYA)], parent='site-erbil-koya-old-town', location='Koya'),
    rec('mar-bena-church-armota', 'Mar Bena Church, Armota', 'Church',
        'A church at Armota near Koya linked to the Monastery of Mar Behnam, said to date from the 4th century. '
        'It was destroyed in 1988 and rebuilt in 1996.',
        [src('Mesopotamia Heritage — The Mar Bena church in Koy Sanjaq',
             'https://www.mesopotamiaheritage.org/en/monuments/l-eglise-mar-bena-de-koye-sanjaq/', C1, locator='Location; History'),
         src('Wikipedia — Armota', 'https://en.wikipedia.org/wiki/Armota'), wd('Q4793768')],
        alt=['Mar Behnam Church'], coords=(36.066944, 44.608056, 'Q4793768', 'settlement'), location='Armota, Koya district'),
    rec('mart-mariam-church-armota', 'Mart Mariam Church, Armota', 'Church',
        'The village church of Armota, built in 1868 and renovated in 1979 and 2009. The village also has a church '
        'of Mar Michael and a shrine of Mart Shmune.',
        [src('Wikipedia — Armota', 'https://en.wikipedia.org/wiki/Armota'), wd('Q4793768')],
        period='Ottoman', year=1868, coords=(36.066944, 44.608056, 'Q4793768', 'settlement'), location='Armota, Koya district'),
]


def main():
    ids = [r['id'] for r in RECORDS]
    if len(ids) != len(set(ids)):
        sys.exit('duplicate ids in batch')
    (HERE / 'erbil-records.json').write_text(json.dumps(RECORDS, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    sites = json.loads(SITES.read_text(encoding='utf-8'))
    have_ids = {s['id'] for s in sites}
    have_slugs = {s['slug'] for s in sites}
    added = [r for r in RECORDS if r['id'] not in have_ids and r['slug'] not in have_slugs]
    sites.extend(added)
    SITES.write_text(json.dumps(sites, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(RECORDS)} records in batch, {len(added)} added, {len(sites)} total')


if __name__ == '__main__':
    main()
