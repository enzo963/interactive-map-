"""Builds the Sulaymaniyah governorate discovery batch (research date 2026-11-03).

Same contract as the Erbil, Duhok and Nineveh batches: source-backed `needs-review`
drafts, coordinates only from the cited source (`coordinates_source`), unknown values
left empty.

Two parts:
  * RECORDS — hand-written records for documented monuments and excavated sites.
  * survey_records() — survey sites taken from the C1-01 candidate file
    (../c1-01/parts/kurdistan.json): Shahrizor Survey Project, Tanjaro/Baban highway
    survey and Ranya–Pshdar survey names. They keep the candidate's source, locator and
    boundary notes. Names already covered by RECORDS or by approved records are skipped.

Halabja became a separate governorate in 2014. Sites beside Halabja town (Bakr Awa,
Gurga Chiya) are left out; other Shahrizor survey sites keep the C1 boundary note.

Usage (from the repository root):
    python3 tools/content-pipeline/data/discovery/sulaymaniyah-2026-11-03/build_sulaymaniyah_records.py
"""
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SITES = ROOT / 'src' / 'data' / 'sites.json'
C1_FILE = HERE.parent / 'c1-01' / 'parts' / 'kurdistan.json'
TODAY = '2026-11-03'
C1 = '2026-11-02'

MMM = 'https://mcid.mcah.columbia.edu/mapping-mesopotamian-monuments/'
SLEMANI_DIR = 'https://slemani-antiquities.com/detail?id=40'
SLEMANI_DIR_NAME = 'Slemani Antiquities and Heritage Directorate — Darband-i Rania project notice'
PESHDAR = 'https://www.en.ag.geschichte.uni-muenchen.de/research/peshdar-plain-project/index.html'
PESHDAR_NAME = 'LMU Munich — Peshdar Plain Project'
PLOS = 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0239564'
PLOS_NAME = 'PLOS ONE (2020) — The Zagros Epipalaeolithic revisited: Palegawra cave'
KOKUSHIKAN = 'https://www.kokushikan.ac.jp/research/ICSAI/publication/pdf/0285_4406_046.pdf'
KOKUSHIKAN_NAME = 'Kokushikan University — Karima Swr and the Baban Highway Archaeological Survey'
SSP = 'https://discovery.ucl.ac.uk/id/eprint/1382742/1/1382742_Radner%2520et%2520al_Iraq%252074%2520%282012%29%2520Shahrizor%2520Survey%2520Project%25202009-11.pdf'
SSP_NAME = 'Radner et al., IRAQ 74 (2012) — Shahrizor Survey Project 2009–2011'
HALABJA_EXCLUDED = {'Bakr Awa', 'Gurga Chiya'}


def src(name, url, accessed=TODAY, level='full-text', locator=None):
    entry = {'sourceName': name, 'url': url, 'evidenceId': None, 'accessedAt': accessed, 'accessLevel': level}
    if locator:
        entry['locator'] = locator
    return entry


def wp(title, level='full-text'):
    return src(f'Wikipedia — {title}', 'https://en.wikipedia.org/wiki/' + title.replace(' ', '_'), level=level)


def wd(qid):
    return src(f'Wikidata {qid} (coordinates)', f'https://www.wikidata.org/wiki/{qid}')


def mmm(path, title):
    return src(f'Columbia University, Mapping Mesopotamian Monuments — {title}', MMM + path)


def slug_of(name):
    s = re.sub(r'[^a-z0-9]+', '-', name.lower().replace('’', '').replace("'", '')).strip('-')
    return s


def rec(slug, name, category, description, sources, period='', alt=None, coords=None, year=None,
        location='', parent=None, notes='', destroyed=''):
    record = {
        'id': f'site-sulaymaniyah-{slug}',
        'name': name,
        'governorate': 'Sulaymaniyah',
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
        'discovery_batch': 'sulaymaniyah-2026-11-03',
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
    # ── Sulaymaniyah city ──────────────────────────────────────────────────────────────
    rec('great-mosque-sulaymaniyah', 'Great Mosque of Sulaymaniyah', 'Mosque',
        'The congregational mosque founded in 1784 and completed in 1785 by the Baban emir Ibrahim Pasha, founder of '
        'the city. It holds the tomb of the cleric Haji Kaka Ahmad, the shrine of Sheikh Mahmud Barzanji and a domed '
        'mausoleum of the Baban family. It was rebuilt to its original form by 2024.',
        [wp('Great Mosque of Sulaymaniyah'),
         src('PUKmedia — PUK President visits Great Mosque', 'https://www.pukmedia.com/EN/Details/77033', level='search-snippet'),
         wd('Q5989794')],
        alt=['Sheikh Ahmad Mosque', 'Kak Ahmad-i Sheikh Mosque', 'Mizgewtî Gewre', 'مزگەوتی گەورەی سلێمانی', 'جامع السليمانية الكبير'],
        period='Baban emirate', year=1784, coords=(35.558, 45.4405, 'Q5989794', 'site'), location='Old bazaar, Sulaymaniyah'),
    rec('sara-palace-and-bathhouse', 'Sara (Saray) Building and Fatima Khan Bathhouse', 'Historic Building',
        'The Saray government building in the old centre, built in the Baban era and rebuilt in 1926, beside the '
        'former Sara Gate square (Saray Azadi). Excavations from September 2025 uncovered the Baban-period Fatima Khan '
        'bathhouse behind it, demolished in 1954.',
        [src('PUKmedia, 14 September 2025 — Historic bathhouse unearthed at Sulaymaniyah Sara', 'https://www.pukmedia.com/EN/Details/79089'),
         src('Kurdistan Regional Government, September 2025 — Historic bathhouse from Baban principality rediscovered in Slemani',
             'https://gov.krd/dmi-en/activities/news-and-press-releases/2025/september/historic-bathhouse-from-baban-principality-rediscovered-in-slemani/', C1),
         wp('Saray Azadi')],
        alt=['Saray', 'Sara Gate', 'Bar Darki Sara', 'Saray Azadi', 'Hammam Fatima Khan'], period='Baban emirate; 1926 rebuilding',
        coords=(35.557, 45.443, 'Q7423455', 'settlement'), location='Saray Azadi, Sulaymaniyah',
        notes='Pin is the Saray Azadi square (Wikidata Q7423455).'),
    rec('sulaymaniyah-museum', 'Sulaymaniyah Museum', 'Museum',
        'Iraq’s second-largest archaeological museum, opened in 1961, with collections from prehistory to the '
        'Ottoman period. Since 2019 a gallery has displayed the inscribed blocks of the Paikuli tower.',
        [wp('Sulaymaniyah Museum'), wd('Q19414891')],
        alt=['Slemani Museum', 'مۆزەخانەی سلێمانی', 'متحف السليمانية'], period='20th century', year=1961,
        coords=(35.557569, 45.425819, 'Q19414891', 'site'), location='Sulaymaniyah'),
    rec('jasana-cave', 'Jasana Cave', 'Cave',
        'Caves in the Surdash area north-west of Sulaymaniyah where Sheikh Mahmud Barzanji moved his printing press '
        'in 1923; Kurdish newspapers were printed there. The caves later sheltered Peshmerga and are now visited as a '
        'historic site.',
        [src('KurdShop — Jasana Cave, a shelter for Kurdish revolution and Kurdish journalism', 'https://kurdshop.net/en/geography/3305', level='search-snippet'),
         src('Kurdish Academy — Printing in Iraq: the 1920–58 period', 'https://kurdishacademy.org/?p=764', level='search-snippet'),
         wd('Q115794268')],
        alt=['Jasna caves', 'Ashkawtî Jasane', 'كهف جاسنة'], period='20th century', year=1923,
        coords=(35.882966, 45.052998, 'Q115794268', 'site'), location='Surdash, north-west of Sulaymaniyah',
        notes='Sources differ on the name of the newspaper printed there (Bangi Haq vs. Umedi Istiqlal).'),

    # ── Qara Dagh, Bazian and the south-west ──────────────────────────────────────────────
    rec('darband-i-gawr-relief', 'Darband-i Gawr Rock Relief', 'Rock Relief',
        'A very large relief of a triumphant ruler cut high into a limestone cliff in the Qara Dagh gorge of '
        'Darband-i Gawr (“Pagan’s Pass”). Once attributed to Naram-Sin of Akkad, it is now dated by style to the '
        'Third Dynasty of Ur, around 2090 BC.',
        [mmm('darband-i-gawr-relief', 'Darband-i Gawr Relief'), wd('Q108861369')],
        alt=['Naram-Sin relief', 'Pagan’s Pass relief', 'Darbandi Gawr'], period='Ur III', year='c. 2090 BC',
        coords=(35.218939, 45.413853, 'Q108861369', 'site'), location='Qara Dagh range'),
    rec('dailaija-relief', 'Dailaija Rock Relief (Darband-i Basara)', 'Rock Relief',
        'A small, worn relief on the north face of the Darband-i Basara gorge near Dailaija, 25 km east-south-east of '
        'Sulaymaniyah, dated to around 2000 BC and linked to the Lullubi.',
        [mmm('dailaija-relief', 'Dailaija Relief'),
         src('World History Encyclopedia — The Lullubian rock relief of Darband-i Basara', 'https://www.worldhistory.org/article/1235/the-lullubian-rock-relief-of-darband-i-basara/', level='search-snippet')],
        alt=['Darband-i Basara relief', 'Lullubian relief'], period='Late 3rd–early 2nd millennium BC', year='c. 2000 BC',
        location='Darband-i Basara gorge'),
    rec('darband-i-belula-relief', 'Darband-i Belula Rock Relief', 'Rock Relief',
        'An Old Babylonian relief with a cuneiform inscription high on a gorge cliff near Belula, by the Iranian '
        'border, showing an armed man standing over two smaller victims.',
        [mmm('darband-i-balula-relief', 'Darband-i Balula Relief'), wd('Q108861386')],
        alt=['Darband-i Balula', 'Belula relief'], period='Old Babylonian', year='c. 1800 BC',
        coords=(34.947064, 45.732614, 'Q108861386', 'site'), location='Belula, near the Iranian border'),
    rec('paikuli-tower', 'Paikuli Tower and Inscription', 'Historic Monument',
        'A Sasanian victory monument of Narseh (r. 293–303) near Barkal village, with a bilingual Parthian and '
        'Middle Persian inscription telling how he overthrew Bahram III. The inscribed blocks are now in the '
        'Sulaymaniyah Museum.',
        [wp('Paikuli inscription'), mmm('paikuli-monument', 'Paikuli Monument')],
        alt=['Paikuli', 'Peykulî', 'پەیکوڵی'], period='Sasanian', year='c. 293', location='Paikuli pass near Barkal, Qara Dagh range'),
    rec('qizqapan-tomb', 'Qizqapan Rock-cut Tomb', 'Mausoleum',
        'An elaborately carved rock-cut tomb about 1 km west of Zarzi village, called Ishkewt-i Qizqapan (“Cave of the '
        'Ravisher”), probably for a local ruler of the Achaemenid or late Median period.',
        [mmm('qyzqapan-tomb', 'Qyzqapan Tomb')],
        alt=['Qyzqapan', 'Ishkewt-i Qizqapan', 'Cave of the Ravisher'], period='Achaemenid', year='6th–5th century BC',
        location='West of Zarzi, Surdash area'),
    rec('kur-u-kich-tomb', 'Kur u Kich Rock-cut Tomb', 'Mausoleum',
        'An apparently unfinished rock-cut tomb (“Cave of the Boy and Girl”) on the Banzad cliffs near Shornakh, '
        '2–3 km south of Qizqapan; one of only two such tombs in Iraqi Kurdistan.',
        [mmm('kur-u-kich-tomb', 'Kur u Kich Tomb')], alt=['Ishkewt-i Kur u Kich'], period='Achaemenid', year='c. 600–330 BC',
        location='Near Shornakh'),
    rec('zarzi-rock-shelter', 'Zarzi Rock Shelter', 'Archaeological Cave',
        'A rock shelter near Chamirezan that gave its name to the Zarzian Epipalaeolithic culture of the Zagros.',
        [src(KOKUSHIKAN_NAME, KOKUSHIKAN, C1, locator='p. 31, historical background'), wd('Q134352211')],
        alt=['Zarzi Cave'], period='Epipalaeolithic', coords=(35.815792, 45.023519, 'Q134352211', 'site'), location='Chamirezan, near Qizqapan'),
    rec('palegawra-cave', 'Palegawra Cave', 'Archaeological Cave',
        'An Epipalaeolithic cave re-excavated with new radiocarbon dates published in 2020.',
        [src(PLOS_NAME, PLOS, C1, locator='Abstract; Introduction'), wd('Q109680516')],
        period='Epipalaeolithic', coords=(35.599889, 45.145194, 'Q109680516', 'site'), location='Bazian area'),
    rec('hazar-merd-caves', 'Hazar Merd Caves', 'Archaeological Cave',
        'A group of Palaeolithic caves south-west of Sulaymaniyah sounded by Dorothy Garrod in 1928. The Dark Cave '
        '(Ashkawty Tarik) has a Mousterian layer over 3 m thick.',
        [wp('Hazar Merd Cave')], alt=['Ashkawty Tarik', 'Dark Cave', 'هەزارمێرد'], period='Middle Palaeolithic to Epipalaeolithic',
        location='South-west of Sulaymaniyah'),
    rec('kani-shaie', 'Kani Shaie', 'Archaeological Site',
        'A mound in the Bazian basin 23 km west of Sulaymaniyah occupied from about 5000 to 2500 BC. Since 2013 a '
        'Coimbra–Cambridge–Slemani team has found an Uruk-period public building with wall-cone mosaics, cylinder '
        'seals and a gold pendant fragment.',
        [wp('Kani Shaie'), src('Channel8, 6 November 2025 — 5,000-year-old monument unearthed in Sulaymaniyah', 'https://channel8.com/english/news/47983'),
         wd('Q113044671')],
        alt=['كاني شاي'], period='Chalcolithic to Early Bronze Age', year='c. 3300 BC',
        coords=(35.558061, 45.176505, 'Q113044671', 'site'), location='Bazian basin'),
    rec('tell-kunara', 'Tell Kunara', 'Archaeological Site',
        'A town on the Tanjaro river 10 km south-west of Sulaymaniyah occupied from the Chalcolithic to the early 2nd '
        'millennium BC, with monumental buildings that its French excavators suggest may mark the capital of the Lullubi.',
        [wp('Tell Kunara'), wd('Q65151623')],
        alt=['تل كوناره', 'Qadar Kunara'], period='Chalcolithic to Middle Bronze Age', year='c. 2200 BC',
        coords=(35.519444, 45.359444, 'Q65151623', 'site'), location='Tanjaro river'),
    rec('darbandikhan-khan', 'Darbandikhan Khan', 'Caravanserai',
        'A caravanserai on a hill above a bend of the Sirwan river at Sirwan village, guarding the caravan route '
        'through the pass; reconstructed shortly before 2017.',
        [mmm('darbandikhan-khan', 'Darbandikhan Khan')], alt=['Khan of Derbendîxan'], location='Sirwan, near Darbandikhan',
        notes='Original construction date not established.'),

    # ── Chamchamal ─────────────────────────────────────────────────────────────────────
    rec('jarmo', 'Jarmo', 'Archaeological Site',
        'One of the earliest farming villages, dated to around 7090 BC, on the Zagros foothills at 800 m. Found by the '
        'Iraqi Directorate of Antiquities in 1940 and excavated by Robert Braidwood.',
        [wp('Jarmo'), wd('Q1000577')], alt=['Charmo', 'Qelay Çermo', 'Qal‘at Jarmo', 'جرمو'], period='Neolithic', year='c. 7000 BC',
        coords=(35.555797, 44.930292, 'Q1000577', 'site'), location='Chamchamal area'),
    rec('karim-shahir', 'Karim Shahir', 'Archaeological Site',
        'An early Neolithic open-air site near Jarmo, investigated by the Iraq-Jarmo project.',
        [src(KOKUSHIKAN_NAME, KOKUSHIKAN, C1, locator='p. 31, historical background'), wd('Q11735703')],
        alt=['Karim Shair'], period='Early Neolithic', coords=(35.55, 44.966667, 'Q11735703', 'site'), location='Chamchamal area'),
    rec('barda-balka', 'Barda Balka', 'Archaeological Site',
        'A hilltop near the Little Zab and Chamchamal where late Acheulean stone tools found in 1949 rank among the '
        'oldest evidence of humans in Iraq.',
        [wp('Barda Balka'), wd('Q4860065')], alt=['باردا بالكا'], period='Lower Palaeolithic',
        coords=(35.55, 44.866667, 'Q4860065', 'site'), location='Chamchamal area'),

    # ── Sharbazher, Mawat and Penjween ─────────────────────────────────────────────────────
    rec('rabana-merquly', 'Rabana-Merquly', 'Archaeological Site',
        'Two fortified settlements with rock reliefs on Mount Piramagrun near Qarachatan, probably Middle Parthian '
        '(c. 50–150 CE) and suggested as the royal city of Natounia known from coins.',
        [wp('Rabana-Merquly'), mmm('merquli', 'Merquli'), mmm('rabbana', 'Rabbana'), wd('Q113159165')],
        alt=['Natounia (proposed)', 'Rabbana', 'Merquli', 'ربنا-مرقولي'], period='Parthian', year='c. 100',
        coords=(35.744155, 45.237033, 'Q113159165', 'site'), location='Mount Piramagrun, Qarachatan'),
    rec('rabana-rock-relief', 'Rabana Rock Relief', 'Rock Relief',
        'A Parthian-period relief at the Rabana fortification on Mount Piramagrun.',
        [mmm('rabbana', 'Rabbana'), wd('Q108142747')], alt=['النحت الصخري في جبل ربنه'], period='Parthian',
        coords=(35.760775, 45.218439, 'Q108142747', 'site'), parent='site-sulaymaniyah-rabana-merquly', location='Rabana'),
    rec('merquly-rock-relief', 'Merquly Rock Relief', 'Rock Relief',
        'A Parthian-period relief at the summit fortification of Merquly, excavated by the Sulaymaniyah antiquities '
        'directorate in 2009.',
        [wp('Rabana-Merquly'), wd('Q108860639')], alt=['Qimmat Merquli', 'قمة ميرقولي'], period='Parthian',
        coords=(35.749719, 45.230319, 'Q108860639', 'site'), parent='site-sulaymaniyah-rabana-merquly', location='Merquly'),
    rec('srochik-castle', 'Srochik Castle', 'Castle',
        'A ruined “stone and lime” castle on a hill at Barzinjah, used by the Baban dynasty as a prison. A local '
        'archaeologist suggests it may be a thousand years old.',
        [wp('Srochik Castle'), wd('Q31794260')], alt=['Sarvjak Castle', 'قلعة سروجك'], coords=(35.6833, 45.3, 'Q31794260', 'settlement'),
        location='Barzinjah', notes='Date is an expert opinion only; coordinates are rounded.'),
    rec('gird-i-rostam', 'Gird-i Rostam', 'Archaeological Site',
        'A mound in the Shalar valley near Penjween investigated by LMU Munich.',
        [src('LMU Munich — Gird-i Rostam excavations', 'https://www.en.ag.geschichte.uni-muenchen.de/chairs/chair_radner/research_radner/girdirostam/index.html', C1,
             locator='Project narrative; Fig. 2')],
        location='Shalar valley, Penjween'),

    # ── Shahrizor plain (Sulaymaniyah side) ────────────────────────────────────────────────
    rec('yasin-tepe', 'Yasin Tepe', 'Archaeological Site',
        'A large mound on the Shahrizor plain (Shahrizor Survey Project site 2) with remains of a Neo-Assyrian town.',
        [src(SSP_NAME, SSP, C1, locator='Fig. 1, SSP 2'),
         wd('Q108128170')],
        alt=['ياسين تبه'], period='Neo-Assyrian', coords=(35.360079, 45.649641, 'Q108128170', 'site'), location='Shahrizor plain, Said Sadiq'),
    rec('gird-i-kazhaw', 'Gird-i Kazhaw', 'Archaeological Site',
        'A Sasanian fortress in the Shahrizor hinterland published by Alexander Tamm in 2020; Shahrizor Survey Project site 8.',
        [src('FAU — Gird i Kazhaw: a Sasanian hinterland fortress in the Shahrizor', 'https://www.cris.fau.de/publications/340094684/', level='search-snippet'),
         src(SSP_NAME, SSP, C1, locator='Fig. 1, SSP 8'), wd('Q108131426')],
        alt=['Kazaw', 'تل كازاو'], period='Sasanian', coords=(35.380497, 45.649442, 'Q108131426', 'site'), location='Shahrizor plain'),
    rec('tell-begum', 'Tell Begum', 'Archaeological Site',
        'A 20 m conical mound with a lower town near Said Sadiq, first sounded in 1960 before the Darbandikhan dam.',
        [wp('Tell Begum'), wd('Q44075169')], alt=['Gird-i Begum', 'تل بيغوم'], coords=(35.297472, 45.884806, 'Q44075169', 'site'),
        location='Near Said Sadiq, Shahrizor plain', notes='Close to the Halabja boundary; confirm governorate.'),
    rec('gird-i-shamlu', 'Gird-i Shamlu', 'Archaeological Site',
        'A mound in Sulaymaniyah province studied by the German Archaeological Institute’s agrarian-worlds project.',
        [src('German Archaeological Institute — Agrarwelten Mesopotamiens', 'https://www.dainst.org/forschung/projekte/agrarwelten-mesopotamiens/5621', C1,
             locator='Überblick')], location='Shahrizor plain'),

    # ── Ranya, Dukan and Peshdar ────────────────────────────────────────────────────────
    rec('tell-bazmusian', 'Tell Bazmusian', 'Archaeological Site',
        'A mound on the right bank of the Little Zab in the Ranya plain, dug in 1956–58 in the salvage campaign before '
        'Lake Dukan flooded it.',
        [wp('Tell Bazmusian'), wd('Q7697385')], alt=['Tell Basmusian', 'تل بازموسيان'], coords=(36.161574, 44.924287, 'Q7697385', 'site'),
        location='Ranya plain, Lake Dukan'),
    rec('usu-aska', 'Usu Aska', 'Castle',
        'A Neo-Assyrian fort on the south side of the Darband-i Rania pass whose massive walls were damaged by '
        'earthquakes and rebuilt several times.',
        [src(SLEMANI_DIR_NAME, SLEMANI_DIR), wd('Q108142297')], alt=['أوسو و أسكا'], period='Neo-Assyrian',
        coords=(36.214353, 44.990987, 'Q108142297', 'site'), location='Darband-i Rania pass'),
    rec('murad-rasu', 'Murad Rasu', 'Archaeological Site',
        'A mound eroded by Lake Dukan, occupied from the Uruk to the Ottoman period, with a mud-brick palace probably '
        'of the early 2nd millennium BC and a store of large pithoi.',
        [src(SLEMANI_DIR_NAME, SLEMANI_DIR)], period='Uruk to Ottoman', location='Darband-i Rania pass'),
    rec('sartka-castle', 'Sartka Castle', 'Castle', 'A late-Islamic castle near Dukan discussed with the castles of the Soran region.',
        [src("Annali di Ca' Foscari. Serie orientale 60 (2024)", 'https://edizionicafoscari.unive.it/media/pdf/journals/annali-di-ca-foscari-serie-orientale/2024/1/iss-60-2024_NqHzUNM.pdf',
             C1, locator='Text at notes 16–18')], location='Near Dukan'),
    rec('ashkawta-rash', 'Ashkawta Rash (Black Cave), Alla Quli', 'Archaeological Cave',
        'A cave at Alla Quli in Bardaqaraman excavated by the University of Liverpool with the Slemani directorate.',
        [src(SLEMANI_DIR_NAME, SLEMANI_DIR, C1, locator='Top news notice')], alt=['Black Cave'], location='Alla Quli, Bardaqaraman'),
    rec('qalat-i-dinka', 'Qalat-i Dinka', 'Archaeological City',
        'A 60-hectare Neo-Assyrian city with a fortress on the Little Zab 5 km south of Qaladiza, excavated since 2015 '
        'by the Peshdar Plain Project after a cuneiform fragment came to light.',
        [wp('Qalat-i Dinka'), src(PESHDAR_NAME, PESHDAR), wd('Q104176940')],
        alt=['Dinka Settlement Complex', 'قلعة دنكه'], period='Neo-Assyrian', coords=(36.136944, 45.1325, 'Q104176940', 'site'),
        location='Peshdar plain, south of Qaladiza'),
    rec('gird-i-bazar', 'Gird-i Bazar', 'Archaeological Site',
        'A small mound beside Qalat-i Dinka with Neo-Assyrian houses and workshops and a later Sasanian cemetery.',
        [src(PESHDAR_NAME, PESHDAR), src('LMU Open Access — Peshdar Plain Project publication', 'https://epub.ub.uni-muenchen.de/71991/', C1, locator='Abstract')],
        period='Neo-Assyrian; Sasanian', parent='site-sulaymaniyah-qalat-i-dinka', location='Peshdar plain'),

    # ── Garmiyan ──────────────────────────────────────────────────────────────────────
    rec('sherwana-castle', 'Sherwana Castle', 'Castle',
        'The castle of the Jaff chiefs on a mound at the edge of Kalar, built by Mohamed Pasha Jaff in the 19th century '
        '(some sources say 18th) with an octagonal hall and a small museum. A 2017 earthquake damaged a third of it; '
        'a University of Glasgow project led its restoration.',
        [wp('Sherwana Castle'),
         src('Kurdistan24, 25 October 2021 — The Kurdistan Region’s historic Pasha Palace and Sherwana Castle',
             'https://www.kurdistan24.net/en/story/386028/The-Kurdistan-Region%E2%80%99s-historic-Pasha-Palace-and-Sherwana-Castle'),
         src('University of Glasgow — Qala Shirwana Cultural Heritage Project', 'https://www.gla.ac.uk/schools/humanities/research/archaeologyresearch/currentresearch/qala%20shirwana', level='search-snippet'),
         wd('Q3944781')],
        alt=['Qellay Şêrwane', 'Shirwanah Castle', 'Dli Garmiyan', 'قلعة شيروانة'], period='Ottoman (Jaff)', year='19th century',
        coords=(34.607, 45.3133, 'Q3944781', 'site'), location='Kalar, Garmiyan'),
    rec('pasha-palace-tazade', 'Pasha Palace, Tazade', 'Palace',
        'The partly ruined two-storey residence of Mohamed Pasha Jaff at Tazade, 9 km north-east of Kalar, with a '
        'storehouse and stable.',
        [src('Kurdistan24, 25 October 2021 — The Kurdistan Region’s historic Pasha Palace and Sherwana Castle',
             'https://www.kurdistan24.net/en/story/386028/The-Kurdistan-Region%E2%80%99s-historic-Pasha-Palace-and-Sherwana-Castle')],
        alt=['Koşkî Paşa'], period='Ottoman (Jaff)', location='Tazade, north-east of Kalar'),
]

CATEGORY = {'archaeological-tell': 'Archaeological Site', 'archaeological-site': 'Archaeological Site', 'cemetery': 'Cemetery'}
SURVEY_TEXT = {
    'discovery.ucl.ac.uk': 'the Shahrizor Survey Project (Radner et al. 2012)',
    'www.kokushikan.ac.jp': 'the Kokushikan University surveys (Tsuneki et al.)',
    'journals.plos.org': 'the EFEC survey reported in PLOS ONE (2020)',
}
COVERED = {
    'Bestansur', 'Tell Shimshara', 'Qalatga Darband', 'Yasin Tepe', 'Kazaw', 'Tell Kunara', 'Qadar Kunara',
    'Hazar Merd', 'Dailaija Relief', 'Darband-i Balula Relief', 'Darband-i Gawr Relief', 'Darbandikhan Khan',
    'Kur u Kich Tomb', 'Merquli', 'Paikuli Monument', 'Qyzqapan Tomb', 'Rabbana', 'Sartka Castle', 'Usu Aska',
    'Murad Rasu', 'Baban-period bathhouse in Slemani', 'Gird-i Shamlu', 'Gird-i Rostam', 'Gird-i Bazar',
    'Qalat-i Dinka', 'Ashkawta Rash', 'Zarzi Cave', 'Jarmo', 'Karim Shair', 'Palegawra Cave', 'Barda Balka',
}


def survey_records():
    out = []
    for cand in json.loads(C1_FILE.read_text(encoding='utf-8')):
        name = cand['name']
        if cand['governorate'] != 'Sulaymaniyah' or name in COVERED or name in HALABJA_EXCLUDED:
            continue
        sources = [src(s['title'], s['url'], C1, 'full-text' if s.get('accessLevel') == 'full-text' else 'search-snippet', s.get('locator'))
                   for s in cand['sources']]
        host = cand['sources'][0]['url'].split('/')[2]
        survey = SURVEY_TEXT.get(host, cand['sources'][0]['title'])
        where = cand.get('approximateLocation') or 'Sulaymaniyah province'
        kind = 'cemetery' if cand['category'] == 'cemetery' else 'site'
        desc = f'An archaeological {kind} ({where}) recorded by {survey}.'
        notes = cand.get('notes', '')
        if 'damaged or destroyed' in notes.lower():
            desc += ' The survey reports it as severely damaged by highway construction.'
        out.append(rec(slug_of(name), name, CATEGORY.get(cand['category'], 'Archaeological Site'), desc, sources,
                       alt=cand.get('alternativeNames') or None, location=where,
                       notes=notes or 'Survey record; period and present survival not established.'))
    return out


def main():
    records = RECORDS + survey_records()
    ids = [r['id'] for r in records]
    if len(ids) != len(set(ids)):
        sys.exit('duplicate ids in batch')
    (HERE / 'sulaymaniyah-records.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    sites = json.loads(SITES.read_text(encoding='utf-8'))
    have_ids = {s['id'] for s in sites}
    have_slugs = {s['slug'] for s in sites}
    clash = [r['slug'] for r in records if r['slug'] in have_slugs and r['id'] not in have_ids]
    if clash:
        sys.exit(f'slug already used by another record: {clash}')
    added = [r for r in records if r['id'] not in have_ids]
    sites.extend(added)
    SITES.write_text(json.dumps(sites, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(records)} records in batch ({len(RECORDS)} written, {len(records) - len(RECORDS)} from survey), {len(added)} added, {len(sites)} total')


if __name__ == '__main__':
    main()
