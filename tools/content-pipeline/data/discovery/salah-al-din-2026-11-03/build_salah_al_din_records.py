"""Builds the Salah al-Din governorate discovery batch (research date 2026-11-03).

Same contract as the earlier governorate batches: source-backed `needs-review` drafts,
coordinates only from the cited source (`coordinates_source`), unknown values left empty.

Components link through `parentSite` to the approved records for Samarra Archaeological City
(`site-salah-al-din-samarra`, UNESCO 2007) and Ashur (`site-salah-al-din-ashur`, UNESCO 2003).
Components do not carry their own inscription; `heritage_status` says so. The approved Great
Mosque/Malwiya, Abu Dulaf and Caliphal Palace (Dar al-Khilafa / al-Jawsaq) records are not
repeated or changed.

Usage (from the repository root):
    python3 tools/content-pipeline/data/discovery/salah-al-din-2026-11-03/build_salah_al_din_records.py
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SITES = ROOT / 'src' / 'data' / 'sites.json'
TODAY = '2026-11-03'
C1 = '2026-11-02'

SAMARRA = 'site-salah-al-din-samarra'
ASHUR = 'site-salah-al-din-ashur'
UNESCO_SAMARRA = 'https://whc.unesco.org/en/list/276/'
UNESCO_SAMARRA_DOC = 'https://whc.unesco.org/document/8815'
UNESCO_ASHUR = 'https://whc.unesco.org/en/list/1130/'
NORTHEDGE_1986 = 'https://www.academia.edu/59904629/The_1986_Survey_Season_at_S%C4%81marr%C4%81'


def src(name, url, accessed=TODAY, level='full-text', locator=None):
    entry = {'sourceName': name, 'url': url, 'evidenceId': None, 'accessedAt': accessed, 'accessLevel': level}
    if locator:
        entry['locator'] = locator
    return entry


def wp(title, level='full-text'):
    url = 'https://en.wikipedia.org/wiki/' + title.replace(' ', '_').replace(',', '%2C').replace("'", '%27')
    return src(f'Wikipedia — {title}', url, level=level)


def wd(qid):
    return src(f'Wikidata {qid} (coordinates)', f'https://www.wikidata.org/wiki/{qid}')


def unesco_samarra(locator='Description / Outstanding Universal Value'):
    return src('UNESCO World Heritage Centre — Samarra Archaeological City', UNESCO_SAMARRA, C1, locator=locator)


def unesco_samarra_doc():
    return src('UNESCO — Samarra Archaeological City nomination documentation', UNESCO_SAMARRA_DOC, C1, 'search-snippet',
               'Samarra monument description')


def unesco_ashur():
    return src('UNESCO World Heritage Centre — Ashur (Qal‘at Sherqat)', UNESCO_ASHUR, C1,
               locator='Brief synthesis / Authenticity / Management')


def rec(slug, name, category, description, sources, period='', alt=None, coords=None, year=None,
        location='', parent=None, notes='', destroyed=''):
    record = {
        'id': f'site-salah-al-din-{slug}',
        'name': name,
        'governorate': 'Salah al-Din',
        'category': category,
        'period': period,
        'description': description,
        'unesco': None,
        'has3D': None,
        'coverImage': None,
        'galleryImages': [],
        'sources': sources,
        'unesco_status': 'unknown',
        'status': 'needs-review',
        'verification_status': 'needs-review',
        'slug': slug,
        'discovery_batch': 'salah-al-din-2026-11-03',
    }
    if alt:
        record['alternativeNames'] = alt
    if location:
        record['approximateLocation'] = location
    if year is not None:
        record['estimated_year'] = year
    if parent:
        record['parentSite'] = parent
        record['heritage_status'] = {
            SAMARRA: 'Component of Samarra Archaeological City (UNESCO World Heritage, 2007); not separately inscribed.',
            ASHUR: 'Component of Ashur (Qal‘at Sherqat) (UNESCO World Heritage, 2003); not separately inscribed.',
        }.get(parent, '')
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


def ashur_component(slug, name, category, description, **kw):
    return rec(slug, name, category, description, [unesco_ashur()], parent=ASHUR, location='Ashur (Qal‘at Sherqat)', **kw)


RECORDS = [
    # ── Samarra: Abbasid capital (836–892) ────────────────────────────────────────────────
    rec('abbasid-samarra-ruinfield', 'Abbasid Samarra (northern ruin-field)', 'Archaeological City',
        'The Abbasid capital of 836–892 founded by al-Mu‘tasim stretched for dozens of kilometres along the east bank of '
        'the Tigris. It was soon abandoned, so its planned streets, houses, palaces and mosques survive as one of the '
        'largest ruin-fields of the Islamic world.',
        [wp('Abbasid Samarra'), unesco_samarra(), wd('Q20717633')],
        alt=['Surra Man Ra’a', 'سامراء العباسية'], period='Abbasid', year=836,
        coords=(34.361667, 43.801944, 'Q20717633', 'approximate'), parent=SAMARRA, location='East bank of the Tigris, Samarra',
        notes='Wikidata point sits in the northern part of the ruin-field; the site extends far beyond it.'),
    rec('al-askari-shrine', 'Al-Askari Shrine', 'Shrine',
        'The mausoleum of the tenth and eleventh Shi‘i Imams, Ali al-Hadi and Hasan al-Askari, with the tombs of Hakima '
        'Khatun and Narjis Khatun and the adjoining cistern of the Twelfth Imam’s occultation. It was bombed in 2006 and '
        'rebuilt.',
        [wp('Al-Askari Shrine'), wd('Q309484')],
        alt=['‘Askariyya Shrine', 'Al-Askari Mosque', 'العتبة العسكرية'], period='Abbasid foundation; later rebuildings',
        coords=(34.198889, 43.873611, 'Q309484', 'site'), location='Samarra old city', destroyed='Bombed (2006); rebuilt'),
    rec('qasr-al-ashiq', 'Qasr al-‘Ashiq (al-Ma‘shuq)', 'Palace',
        'A palace built in 877–882 for Caliph al-Mu‘tamid on the west bank of the Tigris, 16 km from modern Samarra; '
        'called al-Ma‘shuq, “the beloved”, in the Middle Ages. Excavated in the 1960s and restored in the 1980s.',
        [wp("Qasr al-'Ashiq"), unesco_samarra(), wd('Q5940359')],
        alt=['Al-Ma‘shuq Palace', 'Al-Mashuq', 'قصر العاشق'], period='Abbasid', year=877,
        coords=(34.241389, 43.808889, 'Q5940359', 'site'), parent=SAMARRA, location='West bank of the Tigris, Samarra'),
    rec('qubbat-al-sulaybiyya', 'Qubbat al-Sulaybiyya', 'Mausoleum',
        'A small domed octagon on a raised platform with ramps on four sides, south of Qasr al-‘Ashiq, built about 862. '
        'It is the oldest surviving domed tomb in Islamic architecture, though it may have begun as a garden pavilion.',
        [src('Archnet — Qubba al-Sulaybiyya', 'https://www.archnet.org/sites/3831', level='search-snippet'), unesco_samarra_doc()],
        alt=['Qubba al-Sulaybiyya', 'قبة الصليبية'], period='Abbasid', year=862, parent=SAMARRA, location='West bank, south of Qasr al-‘Ashiq'),
    rec('balkuwara-palace', 'Balkuwara Palace', 'Palace',
        'A palace of about 854 south of Samarra on the Tigris, excavated by Ernst Herzfeld in 1910–13, whose complete '
        'plan has been drawn from survey.',
        [unesco_samarra_doc(),
         src('Metropolitan Museum of Art — Ernst Herzfeld in Samarra', 'https://www.metmuseum.org/essays/ernst-emil-herzfeld-1879-1948-in-samarra', level='search-snippet')],
        alt=['Al-Manqur Palace', 'Qasr Balkuwara'], period='Abbasid', year=854, parent=SAMARRA, location='South of Samarra'),
    rec('istabulat', 'Al-Istabulat (al-‘Arus Palace)', 'Palace',
        'A palace-city south of Samarra recorded among the Abbasid components of the site.',
        [unesco_samarra_doc(), wd('Q139784348')],
        alt=['Istablat', 'Al-‘Arus Palace', 'إسطبلات'], period='Abbasid',
        coords=(34.084649, 43.915481, 'Q139784348', 'site'), parent=SAMARRA, location='South of Samarra'),
    rec('al-jafari-palace', 'Al-Ja‘fari Palace (al-Mutawakkiliyya)', 'Palace',
        'The palace of al-Mutawakkiliyya, the new city Caliph al-Mutawakkil built north of Samarra, whose congregational '
        'mosque is the Abu Dulaf mosque of 859.',
        [unesco_samarra(), wp('Abu Dulaf Mosque', 'search-snippet'),
         src('French Ministry of Culture — Samarra, Abbasid capital', 'https://archeologie.culture.gouv.fr/monde/en/samarra-abbasid-capital')],
        alt=['Al-Mutawakkiliyya', 'Qasr al-Ja‘fari'], period='Abbasid', year=859, parent=SAMARRA, location='North of Samarra, near Abu Dulaf'),
    rec('husn-al-qadisiyya', 'Husn al-Qadisiyya (Octagon of Harun al-Rashid)', 'Archaeological Site',
        'An unfinished octagonal city begun by Harun al-Rashid at the end of the 8th century, before the Abbasid '
        'capital moved to Samarra; surveyed in 1986.',
        [src('Northedge — The 1986 survey season at Samarra', NORTHEDGE_1986, level='search-snippet'),
         src('French Ministry of Culture — Samarra, Abbasid capital', 'https://archeologie.culture.gouv.fr/monde/en/samarra-abbasid-capital')],
        alt=['Qadisiyya octagon', 'حصن القادسية'], period='Early Abbasid', year='late 8th century', parent=SAMARRA, location='Samarra area'),
    rec('samarra-racecourses', 'Abbasid Racecourses of Samarra', 'Archaeological Site',
        'Monumental Abbasid racecourses, including a maydan of about 525 × 66 m with a spectators’ lodge at its end and '
        'an out-and-back course, mapped by Alastair Northedge.',
        [src('Northedge — The racecourses at Samarra', 'https://whc.unesco.org/document/205820', level='search-snippet')],
        alt=['Hippodromes of Samarra'], period='Abbasid', parent=SAMARRA, location='Samarra ruin-field',
        notes='Source excerpt fragmentary; the cited URL is the UNESCO Samarra document returned with the Northedge material.'),
    rec('tell-al-alij', 'Tell al-‘Alij', 'Archaeological Site', 'A mound within the Samarra ruin-field recorded among its Abbasid components.',
        [unesco_samarra_doc()], period='Abbasid', parent=SAMARRA, location='Samarra ruin-field'),
    rec('tell-es-sawwan', 'Tell es-Sawwan', 'Archaeological Site',
        'A Neolithic village on a 12 m cliff over the Tigris south of Samarra, the type site of the Samarra culture '
        '(about 5500–4800 BC), with irrigated farming, fine painted pottery and marble vessels.',
        [wp('Tell es-Sawwan'), wp('Samarra culture'), wd('Q7697547')],
        alt=['تل الصوان'], period='Neolithic (Samarra culture)', year='c. 5500 BC',
        coords=(34.1167, 43.9, 'Q7697547', 'approximate'), location='South of Samarra'),
    rec('imam-dur-mausoleum', 'Imam Dur Mausoleum', 'Mausoleum',
        'The 11th-century mausoleum of Imam Muhammad al-Durri 20 km north of Samarra, completed before 1094 and the '
        'earliest datable building with a muqarnas dome. Islamic State blew it up on 23 October 2014.',
        [wp('Imam Dur Mausoleum')], alt=['Qubbat al-Imam Muhammad al-Durri', 'Imam al-Dur', 'قبة الإمام الدري'],
        period='Uqaylid–Seljuk', year=1085, location='Al-Dawr, north of Samarra', destroyed='Destroyed (23 October 2014)'),

    # ── Balad ────────────────────────────────────────────────────────────────────────
    rec('sayyid-muhammad-shrine', 'Shrine of Sayyid Muhammad ibn Ali al-Hadi, Balad', 'Shrine',
        'The shrine of a son of Imam Ali al-Hadi who died in Samarra, a major Shi‘i pilgrimage site south of Samarra; '
        'pilgrims were killed in a 2016 attack, though the shrine itself survived.',
        [wp('Muhammad ibn Ali al-Hadi'), wp('Muhammad ibn Ali al-Hadi Mausoleum attack', 'search-snippet'),
         src('E-Marefa — Architecture and planning of the shrine of Sayyid Muhammad in Balad (Arabic)', 'https://search.emarefa.net/detail/BIM-888336', level='search-snippet'),
         wd('Q1029645')],
        alt=['Sayyid Muhammad shrine', 'مرقد السيد محمد'], period='Abbasid tomb; later rebuildings',
        coords=(34.014722, 44.145556, 'Q1029645', 'settlement'), location='Near Balad'),

    # ── Tikrit ───────────────────────────────────────────────────────────────────────
    rec('tikrit-citadel', 'Tikrit Citadel and Walls', 'Citadel',
        'The fortress above the Tigris at Tikrit, a town that began as an Assyrian fort and was the birthplace of '
        'Saladin, with remains of its old city wall.',
        [wp('Tikrit'), wd('Q109260815'), wd('Q117814609')],
        alt=['Qal‘at Tikrit', 'Sur Tikrit', 'قلعة تكريت', 'سور تكريت'], period='Assyrian origin; Islamic',
        coords=(34.601684, 43.693905, 'Q109260815', 'site'), location='Tikrit', notes='No detailed archaeological source found; review needed.'),
    rec('al-arbaeen-mosque', 'Al-Arba‘een Mosque, Tikrit', 'Mosque',
        'An 11th-century five-domed mosque with the shrines of Amr ibn Jundab al-Ghifari and Sitt Nafisa, named for forty '
        'martyrs said to lie beneath it and used as an Islamic college in 1262. Islamic State destroyed it on 24 '
        'September 2014.',
        [wp("Al-Arba'een Mosque"), wd('Q112666371')],
        alt=['Mosque of the Forty Martyrs', 'Forty Shrine', 'جامع الأربعين'], period='Seljuk', year='11th century',
        coords=(34.598889, 43.676111, 'Q112666371', 'site'), location='Tikrit', destroyed='Destroyed (24 September 2014)'),
    rec('green-church-tikrit', 'Green Church (St Ahudemmeh), Tikrit', 'Church',
        'A Syriac Orthodox church built by the Maphrian Denha II in 700 and the burial place of five maphrians; looted '
        'in 1089, restored in 1112, a refuge in the Mongol sack of 1258, and excavated in the 1990s. Islamic State blew '
        'it up in September 2014.',
        [wp('Church of Saint Ahudemmeh, Tikrit'),
         src('UNPO — Ancient Assyrian church destroyed by suspected IS militants', 'https://unpo.org/?p=9696', level='search-snippet')],
        alt=['Church of Saint Ahudemmeh', 'الكنيسة الخضراء'], period='Early Islamic', year=700, location='Tikrit',
        destroyed='Destroyed (September 2014)'),

    # ── Ashur and Kar-Tukulti-Ninurta ───────────────────────────────────────────────────
    rec('kar-tukulti-ninurta', 'Kar-Tukulti-Ninurta (Tulul al-Aqar)', 'Archaeological City',
        'A new cult centre and residence founded by the Assyrian king Tukulti-Ninurta I (about 1243–1207 BC) 3 km north '
        'of Ashur on the east bank of the Tigris, an 800 m walled city with a temple and ziggurat of Ashur.',
        [wp('Kar-Tukulti-Ninurta'),
         src('Metropolitan Museum — Assyrian Origins: Discoveries at Ashur on the Tigris', 'https://resources.metmuseum.org/resources/metpublications/pdf/Assyrian_Origins_Discoveries_at_Ashur_on_the_Tigris_Antiquities_in_the_Vorderasiatisches_Museum_Be.pdf',
             C1, 'search-snippet', 'p. 110'),
         wd('Q165841')],
        alt=['Tulul al-Aqar', 'تلول العقر'], period='Middle Assyrian', year='c. 1230 BC',
        coords=(35.495833, 43.269444, 'Q165841', 'site'), location='East bank opposite Ashur'),
    ashur_component('ashur-temple', 'Temple of Ashur', 'Temple', 'The temple of the god Ashur, chief sanctuary of the Assyrian state, in its namesake city.',
                    period='Assyrian'),
    ashur_component('ashur-ziggurat', 'Ziggurat of Ashur', 'Historic Monument', 'The ziggurat of the city of Ashur.',
                    period='Assyrian'),
    ashur_component('ishtar-temple-ashur', 'Ishtar Temple, Ashur', 'Temple', 'The temple of the goddess Ishtar at Ashur.'),
    ashur_component('anu-adad-temple', 'Temple of Anu and Adad, Ashur', 'Temple', 'The double temple of Anu and Adad at Ashur.', period='Assyrian'),
    ashur_component('old-palace-ashur', 'Old Palace of Ashur', 'Palace', 'The Old Palace of the Assyrian kings at Ashur.', period='Assyrian'),
    ashur_component('royal-tombs-ashur', 'Royal Burials of Ashur', 'Mausoleum', 'The royal burials recorded at Ashur.', period='Assyrian'),
    ashur_component('parthian-palace-ashur', 'Parthian Palace, Ashur', 'Palace', 'A palace of the Parthian period, when Ashur was a semi-independent city.',
                    period='Parthian'),
    ashur_component('tabira-gate', 'Tabira Gate, Ashur', 'Gate', 'A monumental gate in the city wall of Ashur.', period='Assyrian'),
    ashur_component('ashur-city-walls', 'City Walls of Ashur', 'Historic Monument', 'The fortification walls of the Assyrian capital.', period='Assyrian'),
    ashur_component('akitu-house-ashur', 'New Year Festival House (Akitu), Ashur', 'Temple',
                    'The building used for the Assyrian New Year festival at Ashur.', period='Assyrian'),
    ashur_component('ottoman-barracks-ashur', 'Ottoman Barracks, Ashur', 'Historic Building', 'An Ottoman military building at Ashur.',
                    period='Ottoman'),
    ashur_component('german-expedition-house-ashur', 'German Expedition House, Ashur', 'Historic Building',
                    'The house built for the German archaeological expedition at Ashur.', period='20th century'),
]


def main():
    ids = [r['id'] for r in RECORDS]
    if len(ids) != len(set(ids)):
        sys.exit('duplicate ids in batch')
    (HERE / 'salah-al-din-records.json').write_text(json.dumps(RECORDS, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

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
