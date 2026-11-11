"""Builds the Anbar governorate discovery batch (research date 2026-11-03).

Same contract as the earlier governorate batches: source-backed `needs-review` drafts,
coordinates only from the cited source (`coordinates_source`), unknown values left empty.

Anbar had no records before this batch. Much of its documented heritage lies in the
Haditha (Qadisiya) Dam basin, recorded by the 1979–83 international salvage campaign.
Many of those sites were flooded in 1985–87; `review_notes` say so where the source does.
Survey evidence does not establish present survival.

Usage (from the repository root):
    python3 tools/content-pipeline/data/discovery/anbar-2026-11-03/build_anbar_records.py
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SITES = ROOT / 'src' / 'data' / 'sites.json'
TODAY = '2026-11-03'
C1 = '2026-11-02'

ICOMOS = 'https://www.icomos.org/public/monumentum/vol17/vol17_5.pdf'
ICOMOS_NAME = 'ICOMOS Monumentum 17 — The ancient sites in the basin of the Haditha Dam on the Euphrates'
FLOODED = 'Haditha Dam salvage survey record; the site may now be under or beside Lake Qadisiya, and present survival is not established.'
HADITHA_BASIN = 'Haditha (Qadisiya) Dam basin'


def src(name, url, accessed=TODAY, level='full-text', locator=None):
    entry = {'sourceName': name, 'url': url, 'evidenceId': None, 'accessedAt': accessed, 'accessLevel': level}
    if locator:
        entry['locator'] = locator
    return entry


def wp(title, level='full-text'):
    return src(f'Wikipedia — {title}', 'https://en.wikipedia.org/wiki/' + title.replace(' ', '_').replace(',', '%2C'), level=level)


def wd(qid):
    return src(f'Wikidata {qid} (coordinates)', f'https://www.wikidata.org/wiki/{qid}')


def icomos(locator, accessed=C1):
    return src(ICOMOS_NAME, ICOMOS, accessed, locator=locator)


def rec(slug, name, category, description, sources, period='', alt=None, coords=None, year=None,
        location='', parent=None, notes='', destroyed=''):
    record = {
        'id': f'site-anbar-{slug}',
        'name': name,
        'governorate': 'Anbar',
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
        'discovery_batch': 'anbar-2026-11-03',
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


RECORDS = [
    # ── Anah ──────────────────────────────────────────────────────────────────────────
    rec('ancient-anah', 'Ancient Anah (Anat)', 'Archaeological City',
        'Anah, Hanat of the Old Babylonian texts and Anat of the land of Suhu under the Assyrians, lies on a bend of '
        'the Euphrates. Its oldest part stood on the island of Lubbad in mid-river; the town was moved before the '
        'Haditha reservoir flooded the valley.',
        [wp('Anah'), icomos('Introduction, p. 85'), wd('Q2627750')],
        alt=['Ana', 'Anat', 'Hanat', 'Anatho', 'عانة'], period='Old Babylonian to Islamic',
        coords=(34.368611, 41.981944, 'Q2627750', 'settlement'), location='Anah, Euphrates'),
    rec('ana-qala-island', 'Qal‘a Island (Lubbad), Anah', 'Archaeological Site',
        'The island fortress of ancient Anah, attacked by Julian in 363. British rescue excavations in 1981–82 found a '
        'pottery sequence from Neo-Assyrian through Parthian and Sasanian to several Islamic phases before the dam '
        'submerged it.',
        [icomos('Ancient Islands 2, p. 90'),
         src('British Institute for the Study of Iraq — Excavations at ‘Ana: Qal‘a Island (Northedge, Bamber and Roaf 1988)',
             'https://www.bisi.ac.uk/publication/excavations-at-ana-qala-island/', level='search-snippet')],
        alt=['Lubbad', 'Al-Qal‘a island', 'Anatha'], period='Neo-Assyrian to Islamic', parent='site-anbar-ancient-anah',
        location='Euphrates at Anah', notes='Submerged by Lake Qadisiya.', destroyed='Submerged (1980s)'),
    rec('minaret-of-anah', 'Minaret of Anah', 'Minaret',
        'A 28 m, eight-level minaret built by an Uqaylid ruler between 996 and 1096. It was taken down in at least 28 '
        'pieces and rebuilt on safer ground before the reservoir rose, destroyed twice in the 21st century and '
        'rebuilt; it reopened in 2023.',
        [wp('Minaret of Anah'),
         src('University of Anbar — opening ceremony report, 30 May 2023', 'https://uebdc.uoanbar.edu.iq/English/News_Print.php?ID=404', C1, 'search-snippet'),
         wd('Q12233450')],
        alt=['Manarat Anah', 'Tower of Anah', 'Al-Qal‘a minaret', 'مئذنة عانة'], period='Uqaylid (late Abbasid)', year='c. 1050',
        coords=(34.368988, 42.009579, 'Q12233450', 'site'), parent='site-anbar-ancient-anah', location='Anah',
        destroyed='Destroyed twice in the 21st century; rebuilt'),
    rec('mashhad-abu-reesha-mosque', 'Mash‘had (Abu Reesha) Mosque', 'Mosque',
        'A mosque about 10 km north-west of Anah with a 27 × 13.5 m prayer hall in four aisles and a three-room upper '
        'floor; its plan predates the Atabeg period, with Abbasid, Atabeg and Ottoman phases.',
        [icomos('A.5, pp. 85–87')], alt=['Abu Reesha Mosque', 'Mashhad Mosque'], period='Abbasid to Ottoman',
        location='10 km north-west of Anah', notes=FLOODED),

    # ── Rawa ──────────────────────────────────────────────────────────────────────────
    rec('shaykh-rajab-mosque', 'Shaykh Rajab Mosque (al-Barani), Rawa', 'Mosque',
        'A Sufi mosque of 1625 beside the destroyed tomb of Sayyid Rajab al-Rawi al-Rifa‘i. Old Rawa was flooded in '
        '1989; the historic mosque stands half-submerged and a new mosque was built above it in 1992.',
        [wp('Shaykh Rajab Mosque'), wd('Q22686674')],
        alt=['Al-Barani Mosque', 'جامع الشيخ رجب'], period='Ottoman', year=1625,
        coords=(34.467612, 41.915127, 'Q22686674', 'site'), location='Rawa', destroyed='Partly submerged (1989)'),
    rec('rawa-ottoman-castle', 'Ottoman Castle of Rawa', 'Castle',
        'An Ottoman castle at Rawa on the east bank of the Euphrates, opposite Anah, noted in the Haditha Dam survey.',
        [icomos('Introduction, p. 85')], alt=['Qal‘at Rawa'], period='Ottoman', location='Rawa',
        notes='Only a brief mention; condition not established.'),

    # ── Haditha basin: Bronze and Iron Age sites ──────────────────────────────────────────
    rec('haradum', 'Haradum (Khirbet ed-Diniye)', 'Archaeological City',
        'A small planned Old Babylonian town of the land of Suhum, “the place where one stands watch”, with a river '
        'tollbooth and archives dated from Samsu-iluna to Ammi-saduqa. A Neo-Assyrian fortress later stood on the '
        'site. Excavated 1981–88; the reservoir did not reach it.',
        [wp('Haradum'), icomos('A.6, p. 87'),
         src('CDLI — Haradum 2 tablets', 'https://cdli.mpiwg-berlin.mpg.de/artifacts/525505', level='search-snippet'), wd('Q3127717')],
        alt=['Harrâdum', 'Khirbet ed-Diniye', 'Al-Diniya ruin', 'خربة الدينية'], period='Old Babylonian; Neo-Assyrian',
        year='c. 1700 BC', coords=(34.433333, 41.6, 'Q3127717', 'approximate'), location='Middle Euphrates, upstream of Anah',
        notes='Wikidata coordinates are rounded.'),
    rec('usiyeh', '‘Usiyeh', 'Archaeological Site',
        'A terrace site between Haditha and Anah excavated by Kokushikan University in 1982–83. It held a looted '
        'high-status tomb of about 2600 BC with beads, seals and life-size clay lions, and a large underground tomb '
        'complex of about 1800 BC.',
        [src('Kokushikan University, ICSAI — ‘Usiyeh excavations', 'https://www.kokushikan.ac.jp/research/ICSAI/report/haditha/oushia.html'),
         src('MDPI Remote Sensing 13(4) — Time-series NDWI for emerging archaeological sites in Iraqi reservoirs', 'https://www.mdpi.com/2072-4292/13/4/786', level='search-snippet')],
        alt=['Usiyeh', 'Oushia'], period='Early Dynastic III; Isin-Larsa', year='c. 2600 BC', location=HADITHA_BASIN,
        notes=FLOODED, destroyed='Submerged by the reservoir'),
    rec('bijan-island', 'Bijan Island', 'Archaeological Site',
        'An island in the Euphrates with a fortress of the early 1st millennium BC, excavated over eight seasons in '
        '1979–83 by the Polish Centre of Mediterranean Archaeology before the dam flooded it.',
        [wp('Bijan (island)')], alt=['Bijân'], period='Iron Age (Neo-Assyrian)', location=HADITHA_BASIN, notes=FLOODED,
        destroyed='Submerged (Lake Qadisiya)'),
    rec('sur-jureh', 'Sur Jur‘eh', 'Castle',
        'A walled fortress of about 34 hectares in the Haditha basin, one of the large Iron Age strongholds of the land '
        'of Suhu.',
        [icomos('B.2, pp. 87–88'),
         src('HAL — Assyrian and Suhu fortresses of the middle Euphrates (French study)', 'https://shs.hal.science/halshs-02359802v1/document', level='search-snippet')],
        alt=['Jur‘a Wall', 'Sur Jur‘a', 'سور جرعة'], period='Iron Age', location=HADITHA_BASIN, notes=FLOODED),
    rec('yemniyeh', 'Yemniyeh', 'Castle', 'A small fort of about 0.1 hectare in the Haditha basin, distinct from the large fortresses nearby.',
        [src('HAL — Assyrian and Suhu fortresses of the middle Euphrates (French study)', 'https://shs.hal.science/halshs-02359802v1/document', level='search-snippet')],
        period='Iron Age', location=HADITHA_BASIN, notes=FLOODED),
    rec('kifrin', 'Kifrin', 'Archaeological Site',
        'A site excavated in the late 1970s in the Haditha Dam salvage project, partly exposed again when the reservoir '
        'fell.',
        [src('MDPI Remote Sensing 13(4) — Time-series NDWI for emerging archaeological sites in Iraqi reservoirs', 'https://www.mdpi.com/2072-4292/13/4/786', level='search-snippet')],
        location=HADITHA_BASIN, notes=FLOODED),
    rec('glaia', 'Glai‘a', 'Castle',
        'A 150 m square enclosure 30.5 km south-east of Anah, open to the river, with an inner 100 m building and a '
        'mud-brick structure on a rock platform; Parthian and Sasanian sherds lie on the surface.',
        [icomos('A.3, p. 85')], alt=['Glaia'], period='Parthian–Sasanian', location='30.5 km south-east of Anah', notes=FLOODED),
    rec('telbis-island', 'Telbis Island', 'Archaeological Site',
        'An island site in the Euphrates near Anah, part of a larger Telbis complex with burial grounds on both banks.',
        [icomos('Ancient Islands 1, pp. 89–90')], alt=['Tilmish', 'Tilbish'], location='Euphrates near Anah', notes=FLOODED),
    rec('telbis-burial-ground', 'Telbis Burial Ground (west bank)', 'Cemetery',
        'Four groups of graves cut into the cliff over 200 m of river bank 13.5 km south-east of Anah; the largest group '
        'has fourteen graves.',
        [icomos('A.4, p. 85')], parent='site-anbar-telbis-island', location='Telbis, west bank', notes=FLOODED),
    rec('telbis-eastern-cemetery', 'Telbis Eastern Cemetery and Mounds', 'Cemetery',
        'A cemetery and mounds on the east bank at Telbis, recorded in the Haditha Dam survey.',
        [icomos('B.6, p. 89')], parent='site-anbar-telbis-island', location='Telbis, east bank', notes=FLOODED),
    rec('rijan-island', 'Rijan Island', 'Archaeological Site', 'An island site opposite Tel Gubbain recorded in the Haditha Dam survey.',
        [icomos('Ancient Islands 3, p. 90')], location=HADITHA_BASIN, notes=FLOODED),
    rec('tel-gubbain', 'Tel Gubbain', 'Archaeological Site', 'A mound at New Ma‘atheed recorded in the Haditha Dam survey.',
        [icomos('B.3, p. 88')], alt=['Lumaira'], location='New Ma‘atheed', notes=FLOODED),
    rec('tel-al-darrajiya', 'Tel al-Darrajiya', 'Archaeological Site', 'A mound near Anah recorded in the Haditha Dam survey.',
        [icomos('B.8, p. 89')], location='Near Anah', notes=FLOODED),
    rec('buttain-al-jannadiya', 'Buttain al-Jannadiya', 'Archaeological Site', 'A site near Anah recorded in the Haditha Dam survey.',
        [icomos('B.4, p. 88')], location='Near Anah', notes=FLOODED),
    rec('jafrin', 'Jafrin and the Majul Caverns', 'Archaeological Site',
        'A site near Anah with the rock-cut Majul (Gufrin) caverns, recorded in the Haditha Dam survey.',
        [icomos('B.5(a)–(b), pp. 88–89')], alt=['Gafrin', 'Gufrin caverns', 'Majul caverns'], location='Near Anah', notes=FLOODED),
    rec('al-khaliliya', 'Al-Khaliliya Settlement, Mosque and Minaret', 'Archaeological Site',
        'A ruined settlement near Anah with a mosque and minaret, recorded in the Haditha Dam survey.',
        [icomos('B.7, p. 89')], alt=['Al-Khabuliya ruins'], period='Islamic', location='Near Anah', notes=FLOODED),
    rec('al-owaina-canals', 'Al-Owaina Canals', 'Archaeological Site', 'Ancient canals recorded in the Haditha Dam basin survey.',
        [icomos('B.9, p. 89')], location=HADITHA_BASIN, notes=FLOODED),
    rec('al-zawiya-site', 'Al-Zawiya Archaeological Site', 'Archaeological Site', 'A site near Sur Jur‘eh recorded in the Haditha Dam survey.',
        [icomos('p. 91')], location='Near Sur Jur‘eh', notes=FLOODED),
    rec('shihma-cemetery', 'Shihma Cemetery', 'Cemetery',
        'A cemetery on a rock platform at the river’s edge 24 km north-west of Haditha, with Islamic and Sasanian surface finds.',
        [icomos('A.1, p. 85')], period='Sasanian; Islamic', location='24 km north-west of Haditha', notes=FLOODED),
    rec('shaikh-tayie-tomb', 'Tomb of Shaikh Tay‘ie', 'Mausoleum',
        'A tomb under a small damaged cupola 19 km north-west of Haditha; floods had loosened the gravestones around it.',
        [icomos('A.2, p. 85')], location='19 km north-west of Haditha', notes=FLOODED),
    rec('imam-habib-al-najjar', 'Shrine of Imam Habib al-Najjar', 'Shrine', 'A shrine near Haditha recorded in the Haditha Dam survey.',
        [icomos('B.1, p. 87')], location='Near Haditha', notes=FLOODED),
    rec('tell-aswad-haditha', 'Tell Aswad (Haditha)', 'Archaeological Site',
        'A mound on the left bank of the Euphrates near Haditha with herringbone masonry walls and finds from the Early '
        'Dynastic period on; last excavated in 2009.',
        [src('Al Jazeera Net (Arabic), 28 February 2021 — More than 400 sites hold the secrets of history in Anbar',
             'https://www.aljazeera.net/culture/2021/2/28/أكثر-من-400-موقع-يضم-أسرار-التاريخ-خفايا')],
        alt=['تل أسود'], period='Early Dynastic onward', location='Left bank of the Euphrates near Haditha',
        notes='Not to be confused with the Tell Aswad near ancient Anbar.'),

    # ── Hit ───────────────────────────────────────────────────────────────────────────
    rec('hit-old-town', 'Old Town and Citadel of Hit', 'Historic Town',
        'Hit stood as a small walled town with a half-moat on two mounds, the ancient city of Is, famous for the bitumen '
        'that built Babylon and an Assyrian frontier fortress. The walled town was abandoned in the 1920s.',
        [wp('Hit, Iraq'),
         src('Iraqi Academic Scientific Journals — Hit Citadel, a model of military architecture (Arabic)', 'https://iasj.mohesr.gov.iq/journals/journal/issue/21000', C1, 'search-snippet'),
         src('Iraq National Investment Commission — Anbar tourism sector', 'https://www.investpromo.gov.iq/wp-content/uploads/2018/06/anbar-Tourism-Sector-1.pdf', C1, 'search-snippet'),
         wd('Q2422345')],
        alt=['Heet', 'Is', 'قلعة هيت', 'Hit Citadel'], period='Bronze Age to Ottoman',
        coords=(33.641667, 42.825, 'Q2422345', 'settlement'), location='Hit'),
    rec('al-farouq-minaret-hit', 'Al-Farouq Mosque and Minaret, Hit', 'Minaret',
        'A minaret on the edge of Hit’s northern citadel above a rock cliff, said to have served as a caravan signal '
        'tower; the mosque is traditionally dated to the conquest of 639. Cracked and leaning, it began restoration in '
        'July 2026.',
        [src('Shafaq News, 5 July 2026 — Iraq restores pre-Islamic Al-Farouq Minaret', 'https://shafaq.com/en/society/Iraq-restores-pre-Islamic-Al-Farouq-Minaret', level='search-snippet'),
         src('Shafaq News — Iraq’s Al-Faruq Mosque and Minaret at risk', 'https://shafaq.com/en/Iraq/Iraq-s-Al-Faruq-Mosque-Minaret-Living-testament-to-Islamic-architecture-at-risk', level='search-snippet'),
         wd('Q22686692')],
        alt=['Al-Faruq Minaret', 'Al-Ma‘mura Minaret', 'منارة المعمورة', 'جامع الفاروق'], period='Disputed: pre-Islamic or Abbasid',
        coords=(33.6445, 42.8237, 'Q22686692', 'site'), parent='site-anbar-hit-old-town', location='Northern citadel, Hit',
        notes='Sources disagree on the date; the Ma‘mura minaret named by Al Jazeera is taken to be the same tower.'),
    rec('norias-of-hit', 'Norias of the Euphrates (Hit, Haditha, Anah, al-Qa‘im)', 'Historic Monument',
        'Wooden water wheels that lifted Euphrates water to fields and palm groves, some over 400 years old; fewer than '
        '20 survive. Iraq seeks UNESCO listing, and the Hit Waterwheel Park was restored in 2024.',
        [src('Shafaq News, 28 June 2025 — Centuries-old Al-Anbar waterwheels spin a comeback', 'https://shafaq.com/en/Report/Centuries-old-Al-Anbar-waterwheels-spin-a-comeback'),
         src('Al-Monitor, July 2019 — Can Iraq save its historical water wheels?', 'https://al-monitor.com/originals/2019/07/can-iraq-save-its-historical-water-wheels.html', level='search-snippet'),
         wp('Hit, Iraq')],
        alt=['Nawa‘ir', 'نواعير الفرات', 'Hit water wheels'], period='Ottoman and later', coords=(33.641667, 42.825, 'Q2422345', 'settlement'),
        location='Euphrates at Hit and upstream'),
    rec('hit-bitumen-springs', 'Bitumen Springs of Hit', 'Historic Monument',
        'Natural bitumen and hot springs worked since the 3rd millennium BC; Hit bitumen built ziggurats and Babylon and '
        'is named in texts of Tukulti-Ninurta II.',
        [wp('Hit, Iraq'),
         src('Iraq Business News, 2019 — Can Iraq get its water wheels on the World Heritage List?', 'https://www.iraq-businessnews.com/2019/07/21/can-iraq-get-its-water-wheels-on-world-heritage-list/', level='search-snippet')],
        alt=['Hitum'], period='Early Dynastic to present', location='Hit', notes='Cultural landscape rather than a single monument.'),

    # ── Ancient al-Anbar (Fallujah district) ─────────────────────────────────────────────
    rec('ancient-anbar', 'Ancient Anbar (Peroz-Shapur)', 'Archaeological City',
        'Ruins near Fallujah at the head of the Nahr Isa canal: the Sasanian fortress-town of Peroz-Shapur, briefly the '
        'Abbasid capital before Baghdad (762), abandoned after the 14th century. It is linked with the Jewish academic '
        'centres of Nehardea and Pumbedita.',
        [wp('Anbar (town)'), src('Syriaca.org — Peruz Shapur / Anbar', 'https://syriaca.org/place/211', level='search-snippet'),
         src('Pleiades — Misiche / Peroz-Shapur / Anbar', 'https://pleiades.stoa.org/places/894043', level='search-snippet'),
         wp('Pumbedita', 'search-snippet'), wd('Q2829204')],
        alt=['Peroz-Shapur', 'Firuz Shapur', 'Misiche', 'Pumbedita (proposed)', 'Nehardea (proposed)', 'الأنبار'], period='Sasanian to Abbasid',
        coords=(33.375, 43.716667, 'Q2829204', 'approximate'), location='Near Saqlawiyah and Fallujah',
        notes='Pumbedita and Nehardea identifications are debated; Wikidata coordinates are rounded.'),
]


def main():
    ids = [r['id'] for r in RECORDS]
    if len(ids) != len(set(ids)):
        sys.exit('duplicate ids in batch')
    (HERE / 'anbar-records.json').write_text(json.dumps(RECORDS, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

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
