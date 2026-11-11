"""Builds the Duhok governorate discovery batch (research date 2026-11-03).

Same contract as ../erbil-2026-11-03/build_erbil_records.py: every record is a
source-backed `needs-review` draft, coordinates come only from the cited source
(`coordinates_source`), `coordinates_precision: "settlement"` marks a pin on the
village or town rather than the monument, and unknown values stay empty/null.

Akre district is administered by the Kurdistan Region from Duhok but partly
claimed by Nineveh; its sites stay under Duhok with an `administrative_note`.
Shekhan and Bardarash sites are filed under Nineveh, matching the approved
Lalish record (site-nineveh-lalish), and keep the note on their de facto status.

Usage (from the repository root):
    python3 tools/content-pipeline/data/discovery/duhok-2026-11-03/build_duhok_records.py
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SITES = ROOT / 'src' / 'data' / 'sites.json'
TODAY = '2026-11-03'
C1 = '2026-11-02'

AKRE = 'Akre district: administered by the Kurdistan Region from Duhok; partly claimed by Nineveh Governorate.'
SHEKHAN = 'Shekhan district: administered by the Kurdistan Region from Duhok; de jure part of Nineveh Governorate.'

MMM = 'https://mcid.mcah.columbia.edu/mapping-mesopotamian-monuments/catalogue'
MMM_NAME = 'Columbia University, Mapping Mesopotamian Monuments catalogue'
SHAFAQ_AKRE = 'https://shafaq.com/en/Kurdistan/Duhok-begins-restoration-of-six-key-archaeological-sites'
SHAFAQ_AKRE_NAME = 'Shafaq News, 27 January 2026 — Duhok begins restoration of six key archaeological sites'
K24_CAMPAIGN = 'https://www.kurdistan24.net/en/story/926986'
K24_CAMPAIGN_NAME = 'Kurdistan24, 20 July 2026 — Restoration campaign across Duhok'
LONAP_ROVIA = 'https://shafaq.com/en/Kurdistan/In-Kurdistan-s-Duhok-8-000-year-old-Neolithic-site-discovered'
LONAP_ROVIA_NAME = 'Shafaq News, 9 January 2025 — 8,000-year-old Neolithic site discovered in Duhok'
BASSETKI = 'https://fit.uni-tuebingen.de/Project/Details?id=4125'
BASSETKI_NAME = 'University of Tübingen — Bassetki project'


def src(name, url, accessed=TODAY, level='full-text', locator=None):
    entry = {'sourceName': name, 'url': url, 'evidenceId': None, 'accessedAt': accessed, 'accessLevel': level}
    if locator:
        entry['locator'] = locator
    return entry


def wp(title, level='full-text'):
    return src(f'Wikipedia — {title}', 'https://en.wikipedia.org/wiki/' + title.replace(' ', '_'), level=level)


def wd(qid):
    return src(f'Wikidata {qid} (coordinates)', f'https://www.wikidata.org/wiki/{qid}')


def mmm(entry):
    return src(MMM_NAME, MMM, C1, locator=f'Catalogue entry: {entry}')


NINEVEH_ADMIN = ('Shekhan district', 'Bardarash district')


def rec(slug, name, category, description, sources, period='', alt=None, coords=None, year=None,
        location='', parent=None, admin='', notes='', unesco=None, heritage_status=''):
    governorate = 'Nineveh' if admin.startswith(NINEVEH_ADMIN) else 'Duhok'
    record = {
        'id': f'site-{governorate.lower()}-{slug}',
        'name': name,
        'governorate': governorate,
        'category': category,
        'period': period,
        **({} if period else {'period_status': 'not-established'}),
        'description': description,
        'unesco': unesco,
        'has3D': None,
        'coverImage': None,
        'galleryImages': [],
        'image_status': 'none',
        'sources': sources,
        'unesco_status': 'tentative' if heritage_status.startswith('UNESCO Tentative') else 'unknown',
        'status': 'needs-review',
        'verification_status': 'needs-review',
        'slug': slug,
        'discovery_batch': 'duhok-2026-11-03',
    }
    if alt:
        record['alternativeNames'] = alt
    if location:
        record['approximateLocation'] = location
    if year is not None:
        record['estimated_year'] = year
    if parent:
        record['parentSite'] = parent
    if heritage_status:
        record['heritage_status'] = heritage_status
    if coords:
        lat, lng, ref, precision = coords
        record['latitude'] = lat
        record['longitude'] = lng
        record['coordinates_source'] = ref if ':' in ref else f'wikidata:{ref}'
        record['coordinates_precision'] = precision
    if admin:
        record['administrative_note'] = admin
    if notes:
        record['review_notes'] = notes
    return record


RECORDS = [
    # ── Duhok city and Mount Zawa ─────────────────────────────────────────────────────
    rec('maltai-reliefs', 'Maltai Rock Reliefs (Halamata Cave)', 'Rock Relief',
        'Four Neo-Assyrian reliefs on Mount Zawa, about 7 km south-west of Duhok above Geverke village. Each shows '
        'a procession of nine figures: the Assyrian king, most likely Sennacherib (704–681 BC), before gods standing '
        'on animals. They belong to his northern canal system. Gertrude Bell photographed them in 1909; they were '
        'vandalised in 2016 and again in 2023.',
        [wp('Halamata Cave'), mmm('Maltai Rock Reliefs'),
         src('Rudaw, 4 March 2023 — Millennia-old Assyrian reliefs in Duhok vandalized', 'https://www.rudaw.net/english/kurdistan/04032023', level='search-snippet'),
         wd('Q106371911')],
        alt=['Halamata Cave', 'Maltai Reliefs', 'Malthai', 'Gali Maltai'], period='Neo-Assyrian', year='c. 700 BC',
        coords=(36.838181, 42.940816, 'Q106371911', 'site'), location='Mount Zawa, south-west of Duhok'),
    rec('charsteen-cave', 'Charsteen Cave', 'Archaeological Cave',
        'A large cave sanctuary just north of Duhok city, traditionally described as a Zoroastrian shrine, with '
        'reported occupation going back to the Palaeolithic. The KRG completed the first restoration phase in 2025, '
        'and it reopened to visitors.',
        [src('Kurdistan Regional Government, April 2025 — First phase of Charsteen Cave restoration completed',
             'https://gov.krd/dmi-en/activities/news-and-press-releases/2025/april/first-phase-of-charsteen-cave-restoration-in-duhok-completed/'),
         src('SyriacPress, 3 May 2025 — Charsteen Cave reopens to visitors',
             'https://syriacpress.com/blog/2025/05/03/charsteen-cave-one-of-the-oldest-archaeological-sites-in-nohadra-duhok-reopens-to-visitors', level='search-snippet')],
        alt=['Chwar Stoun', 'Chwar Astoon', 'Çarstîn', 'Charstin'], location='Gali Duhok, north of Duhok city',
        notes='Zoroastrian attribution and the 12,000-year date are reported claims; check against an archaeological report.'),
    rec('mar-ith-alaha-church', 'Mar Ith-Alaha Church, Duhok', 'Church',
        'A church in the Nohadra quarter of Duhok on a site with long Christian continuity. The present building has '
        'been rebuilt several times.',
        [src('Mesopotamia Heritage — Mar Ith-Alaha Church in Dohuk-Nouhadra', 'https://www.mesopotamiaheritage.org/en/monuments/__trashed-3/', C1,
             locator='Location; Fragments of hagiography'),
         wd('Q98967701')],
        alt=['Mar Itha Alaha', 'Saint Ithilaha', 'Mar Ith Allaha'], coords=(36.861944, 42.985, 'Q98967701', 'site'),
        location='Duhok city'),
    rec('duhok-grand-mosque', 'Grand Mosque of Duhok', 'Mosque',
        'The historic congregational mosque of Duhok city centre, listed by the University of Duhok among the '
        'city’s heritage sites together with the old bazaar.',
        [src('University of Duhok — Life in Duhok', 'https://uod.ac/students/life-in-duhok/?lang=en', C1,
             locator='Tourism and Heritage: Beyond the Classroom')],
        alt=['Great Mosque of Duhok', 'Mizgefta Mezin'], location='Duhok city centre'),
    rec('duhok-old-bazaar', 'Old Bazaar of Duhok', 'Historic Market',
        'The old covered market in Duhok city centre, listed by the University of Duhok among the city’s heritage '
        'sites.',
        [src('University of Duhok — Duhok City', 'https://uod.ac/about/duhok-city', level='search-snippet')],
        alt=['Duhok Bazaar'], location='Duhok city centre',
        notes='Source page now returns 404; content seen only in search results.'),

    # ── Simele, Sharya, Khanke and the Mosul Dam shore ─────────────────────────────────
    rec('sharya-yazidi-shrines', 'Yazidi Shrines of Sharya', 'Shrine',
        'A group of Yazidi shrines around the town of Sharya, 15 km south of Duhok. They include Şêx Enzerût, '
        'Pîr Afat, Evdê Reş, Nasirdîn, Siltan Êzîd, Şêx Şems, Şahsiwar, Şêxûbekir, Kerecal, Şêx Hesen and Pîr Bûb.',
        [wp('Sharya, Iraq'), wd('Q59343124')],
        alt=['Shariya', 'Şariya', 'شاريا', 'Sheikh Shams shrine', 'Siltan Ezid shrine'],
        coords=(36.789444, 42.971944, 'Q59343124', 'settlement'), location='Sharya, Simele district',
        notes='Shrine list differs between Wikipedia revisions; individual shrines need separate verification.'),
    rec('khanke-hellenistic-tombs', 'Khanke Hellenistic Tombs', 'Archaeological Site',
        'About 40 tombs exposed on the shore of the Mosul Dam reservoir near Khanke when drought lowered the '
        'water. Duhok’s antiquities director Bekas Brifkani dates them to the Hellenistic or Seleucid period.',
        [src('CBS News, 30 August 2025 — Ancient tombs discovered in Iraq due to drought', 'https://www.cbsnews.com/news/ancient-tombs-discovered-iraq-due-to-drought/'),
         wd('Q59343218')],
        alt=['Khanik', 'Khanek', 'Xankê'], period='Hellenistic–Seleucid',
        coords=(36.79, 42.798056, 'Q59343218', 'settlement'), location='Mosul Dam reservoir shore, Khanke sub-district'),
    rec('kemune-palace', 'Kemune Mittani Palace', 'Archaeological Site',
        'A Bronze Age palace of the Mittani period on the east bank of the Tigris, exposed by the falling Mosul Dam '
        'reservoir in 2018. A German–Kurdish team found walls up to 2 m thick, rare red and blue wall paintings '
        'and ten cuneiform tablets; one tablet suggests the city was ancient Zakhiku.',
        [src('University of Tübingen press release — Palace of the Mittani Empire in the Duhok province',
             'https://uni-tuebingen.de/en/university/news-and-publications/press-release/archaeologists-uncover-palace-of-the-mittani-empire-in-the-duhok-province-of-the-kurdistan-region-iraq/', level='search-snippet')],
        alt=['Kemune', 'Zakhiku (proposed)'], period='Mittani (Late Bronze Age)', year='c. 1400 BC',
        location='East bank of the Tigris, Mosul Dam reservoir',
        notes='Underwater for most of the year; Zakhiku identification is tentative.'),
    rec('tell-gombass', 'Tell Gombass', 'Archaeological Site',
        'A mound on the Mosul Dam reservoir where Duhok archaeologists reported five superimposed settlement layers, '
        'part of a survey of 86 sites made between 2023 and 2025.',
        [src('Shafaq News — Duhok excavations reveal five ancient settlement layers (mirror)',
             'https://www.egerin.com/shafaq-news-duhok-excavations-reveal-five-ancient-settlement-layers/', level='search-snippet')
         | {'sourceType': 'news-report', 'sourceTypeNote': 'Mirror of a Shafaq News report.'}],
        location='Mosul Dam reservoir shore', notes='Seen only in a search snippet of a mirrored article.'),
    rec('mardaman-bassetki', 'Mardaman (Bassetki)', 'Archaeological Site',
        'A northern Mesopotamian city occupied from about 2900 to 600 BC beside Bassetki village. 92 cuneiform '
        'tablets excavated by the University of Tübingen in 2017 identified it as Mardaman, a royal city known from '
        'Akkadian and Old Babylonian texts.',
        [wp('Mardaman'), src(BASSETKI_NAME, BASSETKI, C1, locator='Abstract / short description'),
         src('Heidelberg University — Edition der Texte von Bassetki/Mardama', 'https://www.ori.uni-heidelberg.de/assyriologie/forschung/bassetki.html', C1, 'search-snippet'),
         wd('Q11935295')],
        alt=['Bassetki', 'Mardama', 'Maridaban'], period='Early Bronze Age to Neo-Assyrian',
        coords=(36.958778, 42.7215, 'Q11935295', 'site'), location='Bassetki, Simele district'),
    rec('muqable-i', 'Muqable I', 'Archaeological Site',
        'A numbered mound in the Bassetki settlement cluster investigated by the University of Tübingen.',
        [src(BASSETKI_NAME, BASSETKI, C1, locator='Abstract / short description')], location='Bassetki cluster'),
    rec('muqable-iii', 'Muqable III', 'Archaeological Site',
        'A numbered mound in the Bassetki settlement cluster investigated by the University of Tübingen.',
        [src(BASSETKI_NAME, BASSETKI, C1, locator='Abstract / short description')], location='Bassetki cluster'),
    rec('nemrik-9', 'Nemrik 9', 'Archaeological Site',
        'An early Neolithic (Pre-Pottery Neolithic A) settlement of about 1.8 hectares on a Tigris terrace, dated '
        'c. 9800–8270 BC. Polish archaeologists excavated its round houses, graves and stone tools in 1985–89 '
        'before the Mosul Dam flooded the area.',
        [wp('Nemrik 9'), wd('Q13708140')],
        period='Pre-Pottery Neolithic A', year='c. 9000 BC', coords=(36.716667, 42.85, 'Q13708140', 'site'),
        location='Tigris terrace, Mosul Dam area'),
    rec('bakhetme-mar-daniel', 'Monastery of Mar Daniel, Bakhetme', 'Monastery',
        'Local tradition places the martyrdom of Saint Daniel the Physician at Bakhetme and dates his monastery to '
        'the 3rd century AD. The village keeps a church of Mar Gewargis; the churches of Mar Daniel and Mart Maryam '
        'are recorded as former.',
        [wp('Bakhetme'), wd('Q30590774')],
        alt=['Bakhetme', 'Baxtimê', 'Beth Khatme'], coords=(36.806944, 42.858889, 'Q30590774', 'settlement'),
        location='Bakhetme, Simele district', notes='Founding date is local tradition.'),
    rec('avzrog-sourp-vartan', 'Sourp Vartan Armenian Church, Avzrog', 'Church',
        'An Armenian Apostolic church in Avzrog Miri, a village founded in 1933 by Armenian survivors from near Van; '
        'neighbouring Avzrog Shano has an Assyrian church of Mar Gewargis.',
        [wp('Avzrog'), wd('Q4829588')],
        alt=['Avzrog Miri', 'Surp Vardan'], period='20th century',
        coords=(37.019722, 42.509167, 'Q4829588', 'settlement'), location='Avzrog, Simele district'),

    # ── Navkur plain and Rovia ─────────────────────────────────────────────────────────
    rec('kanisban', 'Kanisban', 'Archaeological Site',
        'A Neolithic settlement of the 7th millennium BC in the Navkur plain near Rovia, announced in January 2025 '
        'by the Duhok antiquities directorate and the University of Udine.',
        [src(LONAP_ROVIA_NAME, LONAP_ROVIA),
         src('SyriacPress, 13 January 2025 — 8,000-year-old artifacts in Nohadra', 'https://syriacpress.com/blog/2025/01/13/iraq-archaeologists-unearth-8000-year-old-artifacts-in-nohadra-duhok/', level='search-snippet')],
        alt=['Kani Aspahan', 'Kanî Ispehan'], period='Neolithic', year='7th millennium BC', location='Navkur plain near Rovia'),
    rec('asinkran', 'Asinkran', 'Archaeological Site',
        'A Navkur-plain site near Rovia with evidence of pottery production and grain processing over 8,000 years old '
        'and two buildings of about 7,000 years ago, excavated by Duhok and the University of Udine.',
        [src(LONAP_ROVIA_NAME, LONAP_ROVIA)],
        alt=['Gre Asngaran', 'Girê Asinkran'], period='Neolithic', location='Navkur plain near Rovia'),

    # ── Zakho district ─────────────────────────────────────────────────────────────────
    rec('zakho-castle', 'Zakho Castle', 'Castle',
        'The castle in central Zakho on the bank of the Khabur, of which only a tower remains. It is said to have '
        'served as the governor’s house under the Bahdinan emirate; its true history is not known.',
        [wp('Zakho', 'search-snippet'), wd('Q167800')],
        alt=['Qelay Zaxo'], coords=(37.143611, 42.681911, 'Q167800', 'settlement'), location='Zakho city centre'),
    rec('qubad-pasha-castle', 'Qubad Pasha Castle', 'Castle',
        'A hexagonal structure with six windows and an entrance gate standing in Zakho’s cemetery.',
        [src('Kurdistan24 — Zakho, a Kurdish city with invisible wonders', 'https://www.kurdistan24.net/en/story/386186/Zakho,-a-Kurdish-city-with-invisible-wonders', level='search-snippet')],
        alt=['Qelay Qubad Pasha', 'Qubad Pasha Tower'], location='Zakho cemetery'),
    rec('zakho-old-bazaar', 'Old Bazaar of Zakho', 'Historic Market',
        'The old market of Zakho, the subject of a 2019 revitalisation and conservation study. A University of Mosul '
        'thesis found Zakho’s heritage buildings neglected.',
        [src('Kurdistan24 — Zakho, a Kurdish city with invisible wonders', 'https://www.kurdistan24.net/en/story/386186/Zakho,-a-Kurdish-city-with-invisible-wonders', level='search-snippet'),
         src('University of Mosul, College of Archaeology — Zakho heritage buildings', 'https://uomosul.edu.iq/en/archeology/?p=37814', level='search-snippet')],
        location='Zakho city centre'),
    rec('zakho-jewish-quarter', 'Jewish Quarter of Zakho', 'Historic Urban Area',
        'Zakho was a main spiritual centre of Kurdistan’s Jews. In 1848 a traveller counted 200 Jewish families with '
        'two large old synagogues, one with an inscription of 1780. The community left in the early 1950s.',
        [src('Encyclopedia.com — Zakho', 'https://encyclopedia.com/religion/encyclopedias-almanacs-transcripts-and-maps/zakho', level='search-snippet')],
        alt=['Mahalla Yahudiya', 'Zaxo Jewish quarter'], location='Zakho',
        notes='Present condition of the synagogues is not established.'),
    rec('mar-gorgis-cathedral-zakho', 'Mar Gorgis Cathedral, Zakho', 'Church',
        'The Chaldean cathedral of Zakho in the old Nasara (Christian) quarter, built in 1911 and later enlarged.',
        [src('Mesopotamia Heritage — The Mar Gorgis Cathedral in Zakho',
             'https://www.mesopotamiaheritage.org/en/monuments/la-cathedrale-chaldeenne-mar-guorguis-de-zakho/', C1, locator='Opening description; Location'),
         wd('Q98967700')],
        alt=['Mar Guorguis Cathedral', 'Mar Gewargis Cathedral', 'St George Cathedral, Zakho'], period='20th century', year=1911,
        coords=(37.141, 42.677667, 'Q98967700', 'site'), location='Nasara quarter, Zakho'),
    rec('sharanish-churches', 'Churches of Sharanish', 'Church',
        'Two Chaldean churches in Sharanish near the Turkish border: Mart Shmune, a converted former synagogue of the '
        'village’s old Jewish community, and Mar Kiriakos, said to be over 400 years old.',
        [wp('Sharanish'), wd('Q7489412')],
        alt=['Mart Shmune Church, Sharanish', 'Mar Kiriakos Church', 'Shiranish'],
        coords=(37.23, 42.844444, 'Q7489412', 'settlement'), location='Sharanish, Zakho district'),
    rec('mar-atqen-monastery', 'Monastery of Mar Atqen, Dera Shish', 'Monastery',
        'A monastery near Dera Shish mentioned in the 9th-century Book of Chastity. The village church of Mar Ephrem '
        'and the monastery were demolished by the Iraqi government in 1975 and during the Anfal campaign of 1988.',
        [wp('Dera Shish'), wd('Q24883709')],
        alt=['Dera Shish', 'ʿŪmrā Shghisha', 'Deir Shish'], period='Abbasid (first attested)',
        coords=(37.326667, 42.799444, 'Q24883709', 'settlement'), location='Dera Shish, Zakho district',
        notes='Ruined or destroyed; record documents lost heritage.'),
    rec('dayrabun-monastery', 'Dayrabun Monastery Site', 'Monastery',
        'Dayrabun takes its name (“monastery of the father”) from an 11th–12th-century monastery traditionally '
        'dedicated to Noah that no longer survives. The village’s Chaldean church of the Sacred Heart dates from '
        '1934–37.',
        [wp('Dayrabun'), wd('Q5243304')],
        alt=['Dêrebûn', 'Deir Abun', 'Derabun'], coords=(37.084167, 42.428333, 'Q5243304', 'settlement'),
        location='Dayrabun, near the Iraq–Syria–Turkey border'),

    # ── Amedi (Amadiya) ────────────────────────────────────────────────────────────────
    rec('great-mosque-amedi', 'Great Mosque of Amedi', 'Mosque',
        'Founded in 1177, the mosque has a 30 m minaret erected under Sultan Hussein al-Wali, often compared with '
        'the al-Nuri minaret of Mosul. It was damaged in an 18th-century raid and by airstrikes in 1961, and '
        'renovated several times.',
        [wp('Great Mosque of Amedi'), mmm('Amadiya/Amedi Mosque and Minaret'), wd('Q20410224')],
        alt=['Great Mosque of Amadiya', 'Mizgefta Mezin a Amêdiyê', 'جامع العمادية الكبير'], period='Abbasid; minaret Bahdinan', year=1177,
        coords=(37.093889, 43.488333, 'Q20410224', 'site'), parent='site-duhok-amedy-city', location='Amedi'),
    rec('tomb-of-hazkiel', 'Tomb of the Prophet Hazkiel, Amedi', 'Shrine',
        'A shrine revered by Muslims, Christians and Jews, once part of the synagogue Knis Navi Yehezqel, which was '
        'built around 1250. The KRG identifies the burial as the prophet Ezekiel; Jewish tradition names two '
        'brothers, Hazan David and Hazan Yosef.',
        [wp('Tomb of the Prophet Hazkiel'), wd('Q42801503')],
        alt=['Tomb of Hazana', 'Be Hazane', 'Knis Navi Yehezqel', 'Ezekiel’s Tomb, Amedi'], period='Medieval', year='c. 1250',
        parent='site-duhok-amedy-city', location='Amedi',
        notes='Wikidata Q42801503 places it about 9 km west of Amedi town; coordinates left out until a published position is found.'),
    rec('mosul-gate-amedi', 'Mosul Gate, Amedi', 'Gate',
        'A gate in the fortifications of Amedi, documented by Columbia’s Mapping Mesopotamian Monuments survey.',
        [mmm('Mosul Gate')], alt=['Bahdinan Gate', 'Bab al-Mosul', 'Derge Mûsil'],
        parent='site-duhok-amedy-city', location='Amedi'),
    rec('zebari-gate-amedi', 'Zebari Gate, Amedi', 'Gate',
        'The eastern gate of Amedi giving access to the high north-eastern plateau, closely tied to the former '
        'palace of the Bahdinan emirs.',
        [src('Columbia MCID — Amadiya/Amedi Citadel', 'https://mcid.mcah.columbia.edu/node/87269', level='search-snippet')],
        alt=['Eastern Gate', 'Derge Zêbarê'], parent='site-duhok-amedy-city', location='Amedi'),
    rec('amedi-ancient-staircase', 'Ancient Staircase, Amedi', 'Historic Monument',
        'A rock-cut stair of the Amedi fortifications documented by Columbia’s Mapping Mesopotamian Monuments survey.',
        [mmm('Ancient Staircase')], parent='site-duhok-amedy-city', location='Amedi'),
    rec('amedi-parthian-reliefs', 'Parthian Reliefs at Amedi', 'Rock Relief',
        'Rock reliefs near the Mosul Gate of Amedi attributed to the Parthian period.',
        [mmm('Parthian Reliefs')], period='Parthian', parent='site-duhok-amedy-city', location='Amedi'),
    rec('qubahan-madrasa', 'Qubahan Madrasa', 'Historic School',
        'The ruined Qubahan school below Amedi, founded under Sultan Hussein Wali (1534–76) as a centre of '
        'theology, philosophy, medicine and astronomy. It was being rehabilitated in 2026.',
        [mmm('Qubahan Medrese'), src(K24_CAMPAIGN_NAME, K24_CAMPAIGN)],
        alt=['Qubahan School', 'Medresa Qubahan', 'مدرسة قبهان'], period='Bahdinan emirate', year='16th century',
        parent='site-duhok-amedy-city', location='Below Amedi'),
    rec('amedi-chaldean-archdiocese', 'Former Chaldean Archdiocese, Amedi', 'Historic Building',
        'The former seat of the Chaldean archbishops of Amadiya in the north-west of the town, including its church.',
        [src('Mesopotamia Heritage — The former Chaldean archdiocese in Amadiya',
             'https://www.mesopotamiaheritage.org/en/monuments/lancien-eveche-chaldeen-damadia/', C1, locator='Location; historical account')],
        parent='site-duhok-amedy-city', location='North-west Amedi'),
    rec('issa-bridge', 'Issa Bridge', 'Historic Bridge',
        'A stone bridge on the Amedi river in the Bahdinan region, dated to the 16th century.',
        [src('PUKmedia — Ancient Issa Bridge in Duhok', 'https://pukmedia.com/EN/GalleryDetails/4341', level='search-snippet')],
        alt=['Pira Îsa'], period='Bahdinan emirate', year='16th century', location='Amedi river'),
    rec('bani-kondi-mosque', 'Bani Kondi Mosque, Bamerne', 'Mosque',
        'An old mosque at Bamerne included in Duhok’s 2026 cleaning and maintenance programme.',
        [src(SHAFAQ_AKRE_NAME, SHAFAQ_AKRE), wd('Q2123036')],
        alt=['Bamarni', 'Bamerne'], coords=(37.116667, 43.266667, 'Q2123036', 'settlement'), location='Bamerne, Amedi district'),

    # ── Sapna valley, Barwari and the border villages ───────────────────────────────────
    rec('sultana-mahdokht-araden', 'Church of Sultana Mahdokht, Araden', 'Church',
        'One of three old churches of Araden in the Sapna valley, with Mart Shmune and Mar Awda, possibly over a '
        'thousand years old. Local tradition says a pilgrim built it after finding a relic of the saint. Araden was '
        'a manuscript-copying centre from at least 1571.',
        [mmm('Church of Sultan Madokht'), wp('Araden'), wd('Q624740')],
        alt=['Sultan Madokht', 'Mart Shmune Church, Araden', 'Mar Awda Church', 'Aradin'],
        coords=(37.1095, 43.3179, 'Q624740', 'settlement'), location='Araden, Sapna valley'),
    rec('mar-abdisho-monastery-dere', 'Monastery of Mar Abdisho, Dere', 'Monastery',
        'A Church of the East monastery founded in the 4th century on a hill above Dere, once served by 42 monks '
        'living in nearby caves. It was damaged by an earthquake before 1586, abandoned by 1753, and still draws over '
        'a thousand pilgrims on its feast day.',
        [wp('Dere, Iraq'),
         src('Kurdistan24 — Saint Odisho: fourth-century monastery still serves worshippers',
             'https://www.kurdistan24.net/en/story/29990-Saint-Odisho:-fourth-century-monastery-still-serves-worshippers', level='search-snippet'),
         wd('Q24883512')],
        alt=['Mar Odisho', 'Mar Oudisho', 'Mar Abdishu', 'Dêrê'], period='Late Antique', year='4th century',
        coords=(37.097639, 43.519889, 'Q24883512', 'settlement'), location='Dere, Sapna valley, east of Amedi'),
    rec('komane-churches', 'Churches of Komane', 'Church',
        'Komane, Dere’s sister village, has the monastery of Mart Maryam, believed founded in the 4th century, and a '
        'church of Mar Ephrem dated to the Sasanian period; an 8th-century monastery of Mar Quryaqos is also recorded.',
        [wp('Komane, Iraq')],
        alt=['Mart Maryam Monastery, Komane', 'Mar Ephrem Church', 'Kowanê', 'Koma'], period='Sasanian to Abbasid',
        location='Komane, Sapna valley'),
    rec('dehi-churches', 'Churches of Dehi', 'Church',
        'Dehi in the Sapna valley has the church of Mart Shmune, built in the 5th century, and Mar Qayouma of the '
        '10th century, with a church of Mar Gewargis. The village was destroyed in 1988 and resettled.',
        [wp('Dehi, Iraq'),
         src('SyriacPress, 29 June 2025 — Mar Qyama shrine and Syriac library opened in Dahi',
             'https://syriacpress.com/blog/2025/06/29/mar-qyama-shrine-and-syriac-library-opened-in-dahi-village-nohadra/', level='search-snippet'),
         wd('Q5252260')],
        alt=['Dahi', 'Mart Shmune Church, Dehi', 'Mar Qayouma Church'], period='Late Antique', year='5th century',
        coords=(37.134074, 43.178976, 'Q5252260', 'settlement'), location='Dehi, Sapna valley'),
    rec('mart-shmune-bebadi', 'Church of Mart Shmune, Bebadi', 'Church',
        'A church first built in the 6th century in Bebadi (Beth Bede). The village was the residence of the Church '
        'of the East patriarch Shimun XXI Eshai from 1927 to 1933.',
        [wp('Bebadi'), wd('Q4878295')],
        alt=['Beth Bede', 'Bêbadê'], period='Late Antique', year='6th century',
        coords=(37.1, 43.45, 'Q4878295', 'settlement'), location='Bebadi, Sapna valley'),
    rec('mar-yohanna-dawodiya', 'Church of Mar Yohanna, Dawodiya', 'Church',
        'Dawodiya stands on an archaeological mound of the 5th century BC. Its 17th-century church of Mar Yohanna '
        'al-Ma’amadan (John the Baptist) was destroyed in the 1988 Anfal campaign and rebuilt in 1991.',
        [src('Mesopotamia Heritage — Mar Yohanna Al-Ma’amadan church in Dawoodia',
             'https://www.mesopotamiaheritage.org/en/monuments/leglise-mar-yohanna-al-maamadan-saint-jean-baptiste-de-dawoodia/'),
         wp('Dawodiya')],
        alt=['Dawoodia', 'Mar Yohanna Al-Ma’amadan', 'Monastery of Mar Daudo'], period='Achaemenid mound; 17th-century church',
        coords=(37.089306, 43.220833, 'mesopotamiaheritage:dawoodia', 'site'), location='Dawodiya, Sapna valley'),
    rec('mar-qayyoma-dooreh', 'Monastery of Mar Qayyoma, Dooreh', 'Monastery',
        'Ruins of a 4th-century monastery that became the seat of the Barwari diocese by 1610, beside the church of '
        'Mar Gewargis, first built in 909. Remains of a fortress near the village have been dated to the late 3rd '
        'millennium BC.',
        [wp('Dooreh, Iraq'),
         src('Rudaw, 24 December 2022 — Mar Qayum Church among the oldest churches in Duhok',
             'https://www.rudaw.net/english/kurdistan/241220222-amp', level='search-snippet'),
         wd('Q28220077')],
        alt=['Mar Qayyum', 'Mar Qayuma', 'Dore', 'Doreh'], period='Late Antique', year='4th century',
        coords=(37.223611, 43.468333, 'Q28220077', 'settlement'), location='Dooreh, Barwari Bala'),
    rec('betanure-synagogue', 'Betanure Synagogue and Elijah Cave', 'Synagogue',
        'Betanure was a Jewish village whose community kept a 10th-century synagogue, a study house and a cave '
        'where tradition says the Prophet Elijah stayed.',
        [wp('Betanure'), wd('Q4897358')],
        alt=['Beth Tanura', 'Gūḏāye', 'Bêtenûrê'], period='Medieval', year='10th century',
        coords=(37.2, 43.466667, 'Q4897358', 'settlement'), location='Betanure, Barwari',
        notes='Present condition unknown.'),
    rec('mangesh-mar-abraham', 'Mangesh: Mar Gewargis Church and Mar Abraham Monastery Site', 'Church',
        'Mangesh has a church of Mar Gewargis and a shrine of Mart Shmuni. The monastery of Mar Abraham of Shamrah '
        'nearby was abandoned in the 14th century; a Christian community here is attested in the 10th century.',
        [wp('Mangesh, Iraq'), wd('Q6748991')],
        alt=['Mangish', 'مانكيش', 'Mart Shmuni shrine'], coords=(37.033333, 43.1, 'Q6748991', 'settlement'),
        location='Mangesh, Duhok district'),
    rec('deraluk-st-luke', 'Ruined Monastery of St Luke, Deraluk', 'Monastery',
        'Deraluk on the Great Zab is named after a ruined monastery of Saint Luke nearby. The town has churches of '
        'Mar Khnana and Mar Gewargis.',
        [wp('Deraluk'), wd('Q10950935')],
        alt=['Deira d-Luqa', 'Dêrelûk'], coords=(37.055, 43.651111, 'Q10950935', 'settlement'), location='Deraluk, Amedi district'),

    # ── Akre district ──────────────────────────────────────────────────────────────────
    rec('great-mosque-akre', 'Great Mosque of Akre', 'Mosque',
        'One of Iraq’s oldest mosques, traditionally founded in AH 20 (640/641) under Caliph Umar and rebuilt several '
        'times, most recently in 1965. Madrasas surround it.',
        [wp('Great Mosque, Aqrah'), wd('Q20406162')],
        alt=['Great Mosque of Aqrah', 'الجامع الكبير عقرة', 'Mizgefta Mezin a Akrê'], period='Early Islamic (founded)', year=641,
        admin=AKRE, location='Akre',
        notes='Wikidata Q20406162 gives 36.48, 42.42, far west of Akre town (36.76, 43.89); coordinates left out until corrected.'),
    rec('akre-qishla', 'Akre Qishla', 'Historic Building',
        'An Ottoman barracks of more than a century in Akre, being restored with German (BMZ/GIZ) funding to become '
        'a museum of the town’s heritage and antiquities.',
        [src('Kurdistan24 — A museum in the making: Germany supports restoration of Akre’s historical fort',
             'https://www.kurdistan24.net/en/story/883314/a-museum-in-the-making-germany-supports-restoration-of-akres-historical-fort', level='search-snippet'),
         src(SHAFAQ_AKRE_NAME, SHAFAQ_AKRE),
         src('PUKmedia — Renovation works continue in Akre’s Qishla', 'https://www.pukmedia.com/EN/GalleryDetails/4548', level='search-snippet')],
        alt=['Qishla of Aqra', 'Qişleya Akrê'], period='Ottoman', admin=AKRE, location='Akre'),
    rec('akre-castle', 'Akre Castle', 'Castle',
        'The castle on the heights of Akre, under restoration in 2026 alongside ongoing excavations.',
        [src(SHAFAQ_AKRE_NAME, SHAFAQ_AKRE)],
        alt=['Qelay Akrê', 'Akre Citadel', 'Prince Zand’s castle'], admin=AKRE, location='Akre',
        notes='Tourism sources attribute it to a Median “Prince Zand” in 580 BC; no archaeological confirmation found.'),
    rec('akre-old-town', 'Old Quarters of Akre', 'Historic Town',
        'Akre climbs a hillside in terraces of stone houses; most of the district’s 760 archaeological sites lie '
        'in its historic neighbourhoods. A Chaldean cathedral of the Virgin Mary also stands in the town.',
        [src('Kurdistan24 — Why Kurdistan’s Akre is becoming a year-round cultural destination', 'https://www.kurdistan24.net/en/story/927636', level='search-snippet'),
         src('Kurdistan24 — Ancient sites and ecstatic traditions: Akre, the city on the hillside',
             'https://www.kurdistan24.net/en/story/373887/Ancient-sites-and-ecstatic-traditions:-Akre,-the-city-on-the-hillside', level='search-snippet'),
         wp('Akre'), wd('Q421302')],
        alt=['Aqrah', 'Aqra', 'Akrê', 'عقرة'], coords=(36.759722, 43.894444, 'Q421302', 'settlement'), admin=AKRE, location='Akre'),
    rec('gunduk-cave-reliefs', 'Gunduk Cave Reliefs', 'Rock Relief',
        'Rock carvings at and inside a hillside cave by Gunduk village, now dated to the mid-3rd millennium BC '
        '(Early Dynastic III or Akkadian). Two of three known reliefs were wrecked by an explosion in 1994; a fourth '
        'carving was identified later.',
        [src('Columbia MCID — Gunduk Reliefs', 'https://mcid.mcah.columbia.edu/mapping-mesopotamian-monuments/gunduk-reliefs', level='search-snippet'),
         src('Reade & Anderson 2013, Zeitschrift für Assyriologie 103 — Gunduk, Khanes, Gaugamela, Gali Zardak', 'https://doi.org/10.1515/za-2013-0008', level='search-snippet'),
         src(SHAFAQ_AKRE_NAME, SHAFAQ_AKRE)],
        alt=['Kondak Cave', 'Gundik', 'Gondak'], period='Early Bronze Age', year='mid-3rd millennium BC',
        admin=AKRE, location='Gunduk (Kondak) village, Akre district'),
    rec('mar-oudisho-kondak', 'Church of Mar Oudisho, Kondak', 'Church',
        'A church in Kondak village near the Gunduk cave, included in Duhok’s 2026 restoration programme.',
        [src(SHAFAQ_AKRE_NAME, SHAFAQ_AKRE)], alt=['Mar Odisho Church, Gunduk'], admin=AKRE, location='Kondak, Akre district'),
    rec('kalati-mosque-companions', 'Mosque of the Companions, Kalati', 'Mosque',
        'An old mosque in Kalati village in Akre district under restoration in 2026.',
        [src(SHAFAQ_AKRE_NAME, SHAFAQ_AKRE)], alt=['Mizgefta Sehaban', 'Masjid al-Sahaba'], admin=AKRE, location='Kalati, Akre district'),
    rec('gali-zardak', 'Gali Zardak Rock Sculptures', 'Rock Relief',
        'Rock-cut sculptures discussed by Reade and Anderson with the Gunduk and Khinis carvings around the Navkur plain.',
        [src('Reade & Anderson 2013, Zeitschrift für Assyriologie 103 — Gunduk, Khanes, Gaugamela, Gali Zardak', 'https://doi.org/10.1515/za-2013-0008', level='search-snippet')],
        admin=AKRE, location='Near Akre', notes='Only the article title and abstract were seen; nature and date of the carvings need the full text.'),

    # ── Shekhan district ───────────────────────────────────────────────────────────────
    rec('khinnis-reliefs', 'Khinnis Reliefs', 'Rock Relief',
        'Rock reliefs and the head-works of Sennacherib’s canal on the Gomel river, carved around 690 BC. The canal '
        'carried water about 51 km towards Nineveh; the University of Udine has documented and conserved the complex.',
        [wp('Khinnis Reliefs'), src(K24_CAMPAIGN_NAME, K24_CAMPAIGN), wd('Q104874183')],
        alt=['Khanes', 'Khinis', 'Bavian', 'Bawian', 'خنس'], period='Neo-Assyrian', year='c. 690 BC',
        coords=(36.758667, 43.425442, 'Q104874183', 'site'), admin=SHEKHAN, location='Khinis village, Gomel river'),
    rec('jerwan-aqueduct', 'Jerwan Aqueduct', 'Archaeological Site',
        'A stone aqueduct of 703–690 BC that carried Sennacherib’s Atrush canal across a wadi on its way to Nineveh. '
        'The Oriental Institute excavated it in 1933; it is part of the planned Jerwan–Faida archaeological park.',
        [wp('Jerwan', 'search-snippet'), src(K24_CAMPAIGN_NAME, K24_CAMPAIGN), wd('Q17064815')],
        alt=['Jarwana', 'جراونة', 'Sennacherib’s aqueduct'], period='Neo-Assyrian', year='c. 695 BC',
        coords=(36.669722, 43.393611, 'Q17064815', 'site'), admin=SHEKHAN, location='Jerwan, Shekhan district'),
    rec('baadre-mir-castle', 'Castle of the Mir, Baadre', 'Castle',
        'Baadre is the historic seat of the Yazidi princes of Sheikhan, and the castle of the princely family stands '
        'there. The town, ancient Beth ʿEdrai, hosted a Church of the East synod in 485 AD.',
        [wp('Baadre'), wd('Q4837020')],
        alt=['Ba’adra', 'Baedrê', 'Beth ʿEdrai', 'Quba Haji Ali temple', 'Khiz Rahman shrine'],
        coords=(36.718333, 43.254444, 'Q4837020', 'settlement'), admin=SHEKHAN, location='Baadre, Shekhan district'),
    rec('ain-sifni-shrines', 'Yazidi Shrines of Ain Sifni', 'Shrine',
        'Ain Sifni (Shekhan town) has seven Yazidi religious monuments, among them the mausoleums of Sheikh ʿAlî '
        'Chamse and Sheikh Hantuch and shrines of Sheikh Adi, Nishingaha Peroz and Sheikh Mushelleh, besides the '
        'churches of Mar Yousif and Mar Gewargis.',
        [wp('Ain Sifni'), wp('List of Yazidi holy places', 'search-snippet'),
         src('Mesopotamia Heritage — The Yazidi mausoleums in Ain Sifni', 'https://www.mesopotamiaheritage.org/en/monuments/les-mausolees-yezidis-de-ain-sifni/'),
         wd('Q4058903')],
        alt=['Shekhan', 'Şêxan', 'Êsivnê', 'Nishingaha Peroz'], coords=(36.695833, 43.351944, 'Q4058903', 'settlement'),
        admin=SHEKHAN, location='Ain Sifni, Shekhan district'),
    rec('gir-e-gomel', 'Gir-e Gomel', 'Archaeological Site',
        'A tell in the Navkur plain excavated since 2017 by a joint Kurdish–Italian team (KIGAP) with the Duhok '
        'antiquities directorate. The Navkur plain is the probable setting of the battle of Gaugamela in 331 BC.',
        [src('Kurdistan24 — Italian archaeologists make extraordinary discovery at Kurdistan Region site', 'https://www.kurdistan24.net/en/photo-story/381686', level='search-snippet'),
         src('Reade & Anderson 2013, Zeitschrift für Assyriologie 103', 'https://doi.org/10.1515/za-2013-0008', level='search-snippet')],
        alt=['Gire Gomel', 'Tell Gomel', 'Gaugamela (proposed area)'], admin=SHEKHAN, location='Navkur plain',
        notes='Exact district not confirmed; link to Gaugamela is regional, not a site identification.'),
    rec('mohamed-rashan-shrine', 'Shrine of Mohamed Rashan, Bardarash', 'Shrine',
        'A Yazidi shrine on a mountainside facing the Erbil–Duhok road near Bardarash.',
        [wp('List of Yazidi holy places', 'search-snippet'), wd('Q4121860')],
        alt=['Mehmed Reşan', 'Mam Rashan (Bardarash)'], coords=(36.503389, 43.587222, 'Q4121860', 'settlement'),
        admin='Bardarash district: administered by the Kurdistan Region; de jure part of Nineveh Governorate.',
        location='Bardarash', notes='Distinct from the Mam Rashan shrine in Sinjar.'),
]


def main():
    ids = [r['id'] for r in RECORDS]
    if len(ids) != len(set(ids)):
        sys.exit('duplicate ids in batch')
    (HERE / 'duhok-records.json').write_text(json.dumps(RECORDS, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    sites = json.loads(SITES.read_text(encoding='utf-8'))
    have_ids = {s['id'] for s in sites}
    have_slugs = {s['slug'] for s in sites}
    added = [r for r in RECORDS if r['id'] not in have_ids and r['slug'] not in have_slugs]
    sites.extend(added)
    SITES.write_text(json.dumps(sites, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(RECORDS)} records in batch, {len(added)} added, {len(sites)} total')


if __name__ == '__main__':
    main()
