"""Card and Site Details text for the approved records (review of 3 November 2026).

`description` is the card-level text: what the place is, where, why it matters and roughly when.
`historical_background` is the expanded Site Details text. Every statement comes from the record's
own sources or from the sources added below. The publishers' pages refused automated access
(UNESCO and KRG return HTTP 403), so the added sources are search excerpts of those pages
(`search-snippet`). Where the sources give no date or disagree, the text says so.

Usage (from the repository root):
    python3 tools/content-pipeline/data/descriptions/approved-2026-11-03.py
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[4]
SITES = ROOT / 'src' / 'data' / 'sites.json'
ACCESSED = '2026-11-03'


def snippet(name, url):
    return {'sourceName': name, 'url': url, 'evidenceId': None, 'accessedAt': ACCESSED, 'accessLevel': 'search-snippet'}


REVIVE_MOSUL = snippet('UNESCO — Revive the Spirit of Mosul: Heritage', 'https://www.unesco.org/en/revive-mosul/heritage')

TEXT = {
    'site-001': (
        'A fortified city under Parthian influence, south-west of Mosul, whose thick walls and towers held off Roman '
        'sieges in 116 and 198 AD. Its temples blend Hellenistic and Roman architecture with Eastern decoration.',
        'The central temple complex was dedicated to several Hatrene gods, chief among them the sun god Shamash. '
        'UNESCO inscribed Hatra on the World Heritage List in 1985. After damage by armed groups it was added to the '
        'List of World Heritage in Danger in 2015, where the Committee retained it in 2026.',
        [snippet('UNESCO World Heritage Centre — Hatra added to the List of World Heritage in Danger', 'https://whc.unesco.org/en/news/1309')]),
    'site-erbil-erbil-citadel': (
        'A fortified settlement crowning a great oval mound in Erbil, linked by written records to ancient '
        'Arbela. Its maze of Ottoman-period alleys radiating from the main gate makes it a World Heritage Site (2014).',
        'The original walls were replaced over time by houses whose continuous 19th-century façades still read as a '
        'fortress. The nomination claimed continuous occupation over six millennia, but ICOMOS found too little physical '
        'evidence from the ancient periods to support it; the property was inscribed in June 2014 for its Ottoman urban '
        'fabric. Later UNESCO reports follow work to map buried remains, stabilise the mound’s slopes and keep residents '
        'living on the citadel.',
        [snippet('ICOMOS evaluation — Erbil Citadel (Republic of Iraq) No 1437', 'https://whc.unesco.org/document/152675')]),
    'site-salah-al-din-samarra': (
        'The ruins of the Abbasid capital of 836–892, stretching some 41.5 km along the Tigris at Samarra. As the '
        'caliphate’s second capital after Baghdad, it preserves the largest mosques and palaces of the Islamic world '
        'of its time.',
        'UNESCO inscribed the city in 2007 and placed it on the List of World Heritage in Danger the same year, where it '
        'remains. About 80 percent of the site is still unexcavated. Its monuments include the Great Mosque with its '
        'spiral minaret, the Abu Dulaf mosque and the Caliphal Palace.',
        []),
    'site-salah-al-din-great-mosque': (
        'The congregational mosque of Abbasid Samarra, built in 849–852 and, at 264 by 159 m, the largest mosque in the '
        'Islamic world when it was built. Its spiral minaret, al-Malwiya, is the most unusual minaret in the Islamic world.',
        'The mosque lies within Samarra Archaeological City, a World Heritage Site since 2007. UNESCO counts it with Abu '
        'Dulaf as one of the two largest mosques preserved in the city. Earlier reconstruction work at the Great Mosque '
        'used reinforced concrete, one of the conservation problems UNESCO cites for the site.',
        []),
    'site-salah-al-din-abu-dulaf': (
        'One of the two great Abbasid mosques that survive at Samarra, capital of the caliphate in 836–892, known for its '
        'unusual minaret and its planning.',
        'With the Great Mosque, UNESCO names Abu Dulaf among the largest mosques of the Islamic world preserved at '
        'Samarra Archaeological City, inscribed on the World Heritage List in 2007.',
        []),
    'site-salah-al-din-caliphal-palace': (
        'The palace of the Abbasid caliphs at Samarra, capital in 836–892, which UNESCO counts among the largest palaces '
        'of the Islamic world.',
        'Qasr al-Khalifa is one of the monumental remains of Samarra Archaeological City, inscribed on the World Heritage '
        'List in 2007 and on the List in Danger since the same year.',
        []),
    'site-salah-al-din-ashur': (
        'The first capital of the Assyrian Empire and religious centre of the god Ashur, on the west bank of the Tigris. '
        'A city-state and trading hub from the 14th to the 9th century BC, it was revived under the Parthians in the '
        '1st–2nd centuries AD.',
        'The site preserves temples, palaces and royal burials. Babylonian forces destroyed the Assyrian city. UNESCO '
        'inscribed Ashur on 5 July 2003 and at the same time placed it on the List of World Heritage in Danger, chiefly '
        'because of the planned Makhool Dam and erosion by the Tigris; it remains on that list.',
        []),
    'site-nineveh-nimrud': (
        'Ancient Kalhu, south of Mosul, which became the capital of the Assyrian Empire in the 9th century BC under '
        'Ashurnasirpal II. Its walls, raised palace platforms and royal tombs survive.',
        'Nimrud has been on Iraq’s Tentative List since 7 July 2000; it is not an inscribed World Heritage Site. In 2015 '
        'extremist armed groups deliberately and severely damaged the city, including the north-west part of the Palace '
        'of Ashurnasirpal II.',
        [snippet('UNESCO World Heritage Centre — Director-General welcomes the liberation of Nimrud', 'https://whc.unesco.org/en/news/1597')]),
    'site-nineveh-ancient-nineveh': (
        'The Assyrian royal city on the east bank of the Tigris at Mosul, adopted as the empire’s political seat after its '
        'first religious capital, Ashur. Its walls, gateways, mounds and palace remains still outline the ancient city.',
        'Nineveh has been on Iraq’s Tentative List since 7 July 2000; it is not an inscribed World Heritage Site. UNESCO '
        'reports that the site has been greatly damaged through acts of deliberate destruction.',
        []),
    'site-nineveh-old-mosul': (
        'The historic city on the west bank of the Tigris, with traditional streets, houses and markets and the mosques, '
        'churches and shrines of its many communities. The al-Hadba minaret and the Dominican clock tower defined its '
        'skyline.',
        'The Old City has been on Iraq’s Tentative List since 17 August 2018. UNESCO’s Revive the Spirit of Mosul '
        'initiative, launched in 2018, rebuilt landmarks including the al-Nouri Mosque, the '
        'al-Hadba minaret, the Dominican convent and al-Tahera Church.',
        [REVIVE_MOSUL]),
    'site-nineveh-al-nouri': (
        'The mosque of Mosul’s Old City and its al-Hadba minaret, 44 m high, the city’s icon. Excavations have '
        'found rooms of a 12th-century mosque on the site.',
        'UNESCO’s Tentative List entry for the Old City names the mosque and minaret its most significant landmarks. '
        'ISIL/Daesh largely destroyed the minaret in June 2017. Both were rebuilt under UNESCO’s Revive the Spirit of '
        'Mosul initiative; during the work, excavations uncovered four stone-and-plaster rooms of the 12th-century '
        'mosque.',
        [REVIVE_MOSUL, snippet('UNESCO — Historic prayer rooms discovered at Al-Nouri Mosque in Mosul',
                               'https://www.unesco.org/en/articles/historic-prayer-rooms-discovered-al-nouri-mosque-mosul')]),
    'site-nineveh-dominican-church': (
        'The Dominican church and convent in Mosul’s Old City, whose clock tower stood with the al-Hadba minaret as the '
        'defining features of the city’s skyline.',
        'The church and convent were among the landmarks rebuilt under UNESCO’s Revive the Spirit of Mosul initiative. '
        'The sources consulted do not give the date of its foundation.',
        [REVIVE_MOSUL]),
    'site-nineveh-lalish': (
        'The main temple of the Yazidi religion and its central pilgrimage place, in a sacred valley in Sheikhan '
        'district, about 60 km north-west of Nineveh. The complex holds the tomb of Sheikh Uday bin Musafir.',
        'Iraq placed Lalish on its Tentative List on 15 April 2020, describing the valley, the temple architecture and '
        'the tomb. The sources consulted do not date the buildings.',
        []),
    'site-kirkuk-kirkuk-citadel': (
        'The raised historic town at the centre of Kirkuk, whose traditional quarters, gates, market, mosques and '
        'church record the city’s Muslim and Christian communities.',
        'Iraq placed the citadel on its Tentative List on 6 April 2021. The submission describes quarters such as Hammam, '
        'Aghaliq and al-Midan, and buildings including the Prophet Daniel Mosque, the Green Dome, the Mother of Sorrows '
        'Church and the Qaysariyah market.',
        []),
    'site-kirkuk-prophet-daniel-mosque': (
        'The oldest and best-known mosque of Kirkuk Citadel, still visited by people of the city, especially on '
        'Saturdays. Its brick minaret probably dates from the late Mongol or early Timurid period.',
        'Iraq’s Tentative List submission for the citadel (2021) describes the minaret, arches and courtyard, and records '
        'the mosque’s social and spiritual role.',
        []),
    'site-kirkuk-green-dome': (
        'An octagonal building of 1361 in Kirkuk Citadel, decorated with coloured tiles and inscriptions.',
        'Iraq’s Tentative List submission for the citadel (2021) describes its form and decoration, and reports that two '
        'vaults on the ground floor have collapsed because of cracking.',
        []),
    'site-kirkuk-mother-of-sorrows-church': (
        'A Chaldean church in the Hammam quarter of Kirkuk Citadel, first built in 1862 and renewed in 1903, with stone '
        'and plaster arches and marble columns.',
        'Iraq’s Tentative List submission for the citadel (2021) reports that its walls are damaged and need scientific '
        'conservation.',
        []),
    'site-kirkuk-qaysariyah-market': (
        'The market on the eastern side of Kirkuk Citadel, more than 150 years old, with about 300 rooms and '
        'shops and an arched upper storey.',
        'Iraq’s Tentative List submission for the citadel (2021) describes its commercial rooms and architecture.',
        []),
    'site-duhok-amedy-city': (
        'A historic town on a high plateau about 70 km north of Duhok, with ancient gates and a minaret, which Iraq '
        'describes as one of the most important historic cities of northern Iraq.',
        'Amedy has been on Iraq’s Tentative List since 2 February 2011 as a mixed cultural and natural site; it is not an '
        'inscribed World Heritage Site.',
        []),
    'site-sulaymaniyah-bestansur': (
        'An Early Neolithic village of 7700–7100 BC in the Zagros foothills on the edge of the Shahrizor Plain, about '
        '30 km south-east of Sulaymaniyah, whose mud-brick and pisé buildings show early village life.',
        'A joint Iraqi–UK team has excavated the site since 2012. Iraq placed it on its Tentative List on 20 January '
        '2017.',
        []),
    'site-baghdad-mustansiriya-madrasa': (
        'The college founded on the Tigris in 1227 by the Abbasid caliph al-Mustansir, with rooms and iwans arranged '
        'around a great courtyard on the eastern bank in Baghdad.',
        'It is the southern anchor of Iraq’s Tentative List entry for the historic Rusafa riverfront (submitted 28 March '
        '2014). After restoration it opened as a museum of Islamic art and culture in 1960.',
        [snippet('Archnet (MIT / Aga Khan Trust for Culture) — Madrasa al-Mustansiriyya', 'https://www.archnet.org/sites/3836')]),
    'site-baghdad-abbasid-palace': (
        'A surviving Abbasid building on the Rusafa bank of the Tigris, attributed by researchers to Caliph '
        'al-Nasir li-Din Allah and admired for its ornamental brickwork.',
        'It marks the northern end of Iraq’s Tentative List entry for the historic Rusafa riverfront (submitted 28 March '
        '2014), which notes that parts of it lie buried under later riverbank deposits.',
        []),
    'site-baghdad-al-qishla': (
        'The Ottoman barracks and clock tower on the Tigris in Baghdad, whose architecture also records additions made '
        'under British rule.',
        'The submission for Iraq’s Tentative List entry on the Rusafa riverfront (2014) lists the Qishla among a series of '
        'historic buildings along the river bank.',
        []),
    'site-baghdad-al-wazir-mosque': (
        'A riverside mosque in Baghdad built in 1599 by the Ottoman governor Hassan Pasha and repeatedly restored since.',
        'It belongs to Iraq’s Tentative List entry for the historic Rusafa riverfront (submitted 28 March 2014).',
        []),
    'site-baghdad-al-asifiyah-mosque': (
        'A mosque on the Rusafa riverfront whose present building was raised in 1825 by the Ottoman governor Dawud '
        'Pasha, with a prayer hall under two domes and two minarets.',
        'It belongs to Iraq’s Tentative List entry for the historic Rusafa riverfront (submitted 28 March 2014).',
        []),
    'site-baghdad-house-of-wisdom-building': (
        'An Ottoman two-storey school building on the Baghdad riverfront, 64 by 29 m, with arcaded corridors over its '
        'gardens, known both as the Industries School and as the House of Wisdom (Bait al-Hikma).',
        'It belongs to Iraq’s Tentative List entry for the historic Rusafa riverfront (submitted 28 March 2014), whose '
        'dossier uses both names.',
        []),
    'site-duhok-delal-bridge': (
        'A bridge of large river stones over the Khabur at Zakho, about 114 m long and 16 m high. Official sources '
        'date its origin to the Roman or the medieval period.',
        'The Kurdistan Regional Government lists it among the region’s architectural heritage; the sources disagree on '
        'when it was first built, so no period is given.',
        [snippet('Kurdistan Region Board of Tourism — Dalal Bridge', 'http://bot.gov.krd/duhok-province-zakho/history-and-heritage/dalal-bridge')]),
    'site-duhok-faida-canal-reliefs': (
        'A 10 km Assyrian irrigation canal near Faida in southern Duhok province, with 13 reliefs carved into its walls '
        'under Sargon II and Sennacherib, about 2,700 years ago.',
        'The reliefs were uncovered by a joint mission with the University of Udine. The first phase of an archaeological '
        'park on the canal opened in October 2022, the first of five planned sites.',
        []),
    'site-erbil-choli-minaret': (
        'A 37 m historic minaret in Erbil, planned in 2025 for structural and exterior restoration.',
        'An August 2025 KRG report describes planned structural and exterior restoration alongside work on Erbil Citadel; '
        'it does not show whether the work is complete. The sources consulted do not date the minaret.',
        []),
    'site-erbil-shanidar-cave': (
        'A cave in the Zagros mountains of Erbil Governorate where the remains of Neanderthals were found, a key site for '
        'the study of early human history.',
        'The Kurdistan Regional Government presents it as one of the region’s main archaeological sites.',
        []),
    'site-erbil-qaysari-bazaar': (
        'A historic market in downtown Erbil, where restoration with UNESCO began after a fire in 2024.',
        'A May 2024 KRG report records the fire and describes the restoration work with UNESCO; it does not establish '
        'the market’s present condition.',
        []),
    'site-sulaymaniyah-qalatga-darband': (
        'A Hellenistic city in Sulaymaniyah Governorate, identified through drone surveys and excavated by the '
        'British Museum.',
        'The Kurdistan Regional Government presents it among the region’s main archaeological sites.',
        []),
    'site-sulaymaniyah-tell-shemshara': (
        'An early urban settlement on the Rania Plain near Lake Dukan, where tablets of the Old Babylonian period were found.',
        'The Kurdistan Regional Government presents it among the region’s main archaeological sites.',
        []),
    'site-sulaymaniyah-red-terror-museum': (
        'A museum in Sulaymaniyah documenting repression under Ba’athist rule, a place to learn about the region’s '
        'modern history.',
        'The Kurdistan Regional Government presents it among the region’s main places for learning about its modern '
        'history.',
        []),
}


def main():
    sites = json.loads(SITES.read_text(encoding='utf-8'))
    approved = {site['id'] for site in sites if site['status'] == 'approved'}
    if approved != set(TEXT):
        raise SystemExit(f'approved records and texts differ: {sorted(approved ^ set(TEXT))}')
    for site in sites:
        if site['id'] not in TEXT:
            continue
        description, background, extra = TEXT[site['id']]
        site['description'] = description
        site['historical_background'] = background
        urls = {source['url'] for source in site['sources']}
        site['sources'] += [source for source in extra if source['url'] not in urls]
    SITES.write_text(json.dumps(sites, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(TEXT)} approved records updated')


if __name__ == '__main__':
    main()
