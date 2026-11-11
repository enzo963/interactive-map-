"""Builds the Baghdad governorate discovery batch (research date 2026-11-03).

Same contract as the earlier governorate batches: source-backed `needs-review` drafts,
coordinates only from the cited source (`coordinates_source`), `approximate` precision when
the source coordinate is rounded or marks a lost site's general area, unknown values empty.

The six approved Rusafa riverbank records (Mustansiriya, Abbasid Palace, Qishla, al-Wazir,
al-Asifiyah, House of Wisdom building) are not repeated or changed.

Usage (from the repository root):
    python3 tools/content-pipeline/data/discovery/baghdad-2026-11-03/build_baghdad_records.py
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SITES = ROOT / 'src' / 'data' / 'sites.json'
TODAY = '2026-11-03'

MH = 'https://www.mesopotamiaheritage.org/en/monuments/'


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


def mh(path, title):
    return src(f'Mesopotamia Heritage — {title}', MH + path + '/')


def W(title, qid, lat, lng, precision='site'):
    """Wikipedia article + Wikidata coordinates."""
    return [wp(title), wd(qid)], (lat, lng, qid, precision)


def rec(slug, name, category, description, sources, period='', alt=None, coords=None, year=None,
        location='', parent=None, notes='', destroyed=''):
    record = {
        'id': f'site-baghdad-{slug}',
        'name': name,
        'governorate': 'Baghdad',
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
        'discovery_batch': 'baghdad-2026-11-03',
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


def wrec(slug, name, category, description, title, qid, lat, lng, precision='site', extra_sources=(), **kw):
    sources, coords = W(title, qid, lat, lng, precision)
    if lat is None:
        coords = None
    return rec(slug, name, category, description, sources[:1] + list(extra_sources) + sources[1:], coords=coords, **kw)


def mrec(slug, name, category, description, path, title, lat, lng, extra_sources=(), **kw):
    coords = (lat, lng, f'mesopotamiaheritage:{slug}', 'site') if lat is not None else None
    return rec(slug, name, category, description, [mh(path, title), *extra_sources], coords=coords, **kw)


ROUND_CITY = 'site-baghdad-round-city'
CTESIPHON = 'site-baghdad-ctesiphon'

RECORDS = [
    # ── Ancient and Abbasid archaeology ───────────────────────────────────────────────────
    wrec('round-city', 'Round City of Baghdad (Madinat al-Salam)', 'Archaeological City',
         'The circular core of Baghdad built by Caliph al-Mansur in 762–766 as the City of Peace, with four gates to '
         'Kufa, Damascus, Khurasan and Basra and the caliphal palace at its centre. Its remains lie under the modern city.',
         'Round City of Baghdad', 'Q1191316', 33.3475, 44.335, 'approximate',
         alt=['Madinat al-Salam', 'City of Peace', 'مدينة السلام', 'مدينة بغداد المدورة'], period='Abbasid', year=762,
         location='Karkh, west bank', destroyed='Disappeared; no standing remains'),
    wrec('khuld-palace', 'Khuld Palace (site)', 'Palace',
         'A principal early Abbasid palace begun by al-Mansur in 773 between the Round City and the Tigris, with '
         'extensive gardens; its site is now occupied by modern buildings.',
         'Khuld Palace', 'Q65081154', 33.35, 44.366667, 'approximate', alt=['Qasr al-Khuld', 'Palace of Eternity', 'قصر الخلد'],
         period='Abbasid', year=773, parent=ROUND_CITY, location='West bank of the Tigris', destroyed='Disappeared'),
    wrec('taj-palace', 'Taj Palace (site)', 'Palace',
         'A caliphal palace begun by al-Mu‘tadid (892–902) on the Tigris in East Baghdad, the southern part of the '
         'Dar al-Khilafa palace complex after the capital returned from Samarra.',
         'Taj Palace', 'Q65069409', 33.333333, 44.397222, 'approximate', alt=['Qasr al-Taj', 'Palace of the Crown', 'قصر التاج'],
         period='Abbasid', year='c. 900', location='Rusafa riverbank', destroyed='Disappeared'),
    wrec('adudi-hospital', 'Al-‘Adudi Bimaristan (site)', 'Historic Building',
         'One of the most advanced hospitals of the medieval Islamic world, founded by the Buyid ruler ‘Adud al-Dawla '
         'in West Baghdad shortly before his death in 983, and a centre of medical teaching.',
         "Al-'Adudi Hospital", 'Q4116635', 33.35, 44.366667, 'approximate', alt=['Bimaristan al-Adudi', 'البيمارستان العضدي'],
         period='Buyid', year=982, location='West bank of the Tigris', destroyed='Disappeared'),
    wrec('ctesiphon', 'Ctesiphon', 'Archaeological City',
         'The Parthian and Sasanian royal capital on the east bank of the Tigris 35 km south-east of Baghdad, capital '
         'of the Iranian empires for over 800 years until the Muslim conquest in 637.',
         'Ctesiphon', 'Q192541', 33.093611, 44.580833,
         alt=['Taysafun', 'al-Mada’in', 'قطيسفون', 'المدائن'], period='Parthian–Sasanian', location='Salman Pak'),
    wrec('taq-kasra', 'Taq Kasra (Arch of Ctesiphon)', 'Palace',
         'The great brick iwan that formed the façade of the main Sasanian palace at Ctesiphon, the only visible '
         'structure of the capital and a landmark in the history of vaulted architecture.',
         'Taq Kasra', 'Q1486703', 33.093722, 44.580722,
         alt=['Iwan of Khosrow', 'Taq-i Kisra', 'طاق كسرى'], period='Sasanian', year='6th century', parent=CTESIPHON, location='Salman Pak'),
    wrec('seleucia-on-tigris', 'Seleucia on the Tigris', 'Archaeological City',
         'The first capital of the Seleucid Empire, founded about 305 BC on the west bank of the Tigris; it flourished '
         'under the Parthians and was destroyed by the Romans in AD 165.',
         'Seleucia', 'Q1136681', 33.1, 44.52, 'approximate', alt=['Seleucia ad Tigrim', 'Tell Umar', 'سلوقية'],
         period='Hellenistic–Parthian', year='c. 305 BC', location='West bank opposite Ctesiphon'),
    mrec('kokhe-church', 'Church of Kokhe', 'Church',
         'Ruins of the church at Kokhe, successor to Seleucia, seat of the Catholicos of the Church of the East from '
         '310 to 780 and starting point of missions to Persia, India and China; around twenty patriarchal graves remain.',
         'leglise-assyrienne-de-kokhe', 'The Church in Kokhe', 33.099139, 44.551972,
         alt=['Koche', 'Kokhe'], period='Late Antique to Abbasid', year='4th century', location='West bank of the Tigris, 32 km south of Baghdad'),
    wrec('dur-kurigalzu', 'Dur-Kurigalzu (Aqar Quf)', 'Archaeological City',
         'A Kassite royal city founded by Kurigalzu I (d. c. 1375 BC) 30 km west of central Baghdad, whose ziggurat core '
         'still stands at Aqar Quf.',
         'Dur-Kurigalzu', 'Q622719', 33.35372, 44.20229,
         alt=['Aqar Quf', 'Agargouf', 'زقورة عقرقوف'], period='Kassite', year='c. 1390 BC', location='Aqar Quf, west of Baghdad'),
    wrec('sippar', 'Sippar (Tell Abu Habbah)', 'Archaeological City',
         'A Sumerian and Babylonian city of the sun god Shamash on the Euphrates near Yusufiyah, 30 km south-west of '
         'Baghdad.',
         'Sippar', 'Q619707', 33.058829, 44.252153, alt=['Tell Abu Habbah', 'Zimbir', 'Sippar-Yahrurum'], period='Early Dynastic to Neo-Babylonian',
         location='Near Yusufiyah'),
    wrec('sippar-amnanum', 'Sippar-Amnanum (Tell ed-Der)', 'Archaeological City',
         'Sippar’s sister city 6 km to the north-east, mainly developed in the Old Babylonian period.',
         'Sippar-Amnanum', 'Q7525818', 33.09979, 44.29833, alt=['Tell ed-Der', 'Sippar-Annunitum'], period='Akkadian to Old Babylonian',
         location='South-west of Baghdad'),
    wrec('tell-harmal', 'Tell Harmal (Shaduppum)', 'Archaeological Site',
         'An Old Babylonian administrative town of the kingdom of Eshnunna inside modern Baghdad, known for its tablets.',
         'Shaduppum', 'Q3481186', 33.366667, 44.466667, 'approximate', alt=['Shaduppum', 'Tell Abu Harmal', 'تل حرمل'],
         period='Old Babylonian', location='New Baghdad'),
    wrec('tell-muhammad', 'Tell Muhammad', 'Archaeological Site', 'An ancient mound on the Tigris near Tell Harmal, suggested as Diniktum.',
         'Tell Muhammad', 'Q125343267', 33.3, 44.469444, 'approximate', alt=['Diniktum (proposed)', 'تل محمد'],
         period='Old Babylonian', location='South-east Baghdad'),
    wrec('tell-al-dhibai', 'Tell al-Dhiba‘i', 'Archaeological Site',
         'A site in New Baghdad proposed as the Old Babylonian town of Uzarzalulu.',
         "Tell al-Dhiba'i", 'Q28716833', 33.31, 44.48, 'approximate', alt=['Uzarzalulu (proposed)', 'تل الضباعي'],
         period='Old Babylonian', location='New Baghdad'),

    # ── Gates and walls ─────────────────────────────────────────────────────────────────
    rec('bab-al-wastani', 'Bab al-Wastani', 'Gate',
        'The only surviving gate of Baghdad’s eastern wall, built under Caliph al-Mustazhir (1094–1118), near the '
        'Suhrawardi mausoleum and the Wardiyya cemetery. It was restored in the 20th century and later housed military '
        'museums.',
        [wp('Bab al-Wastani'), wp('Gates of Baghdad'), wd('Q138647434')],
        alt=['Bab al-Dhafariyya', 'Middle Gate', 'باب الوسطاني'], period='Abbasid', year='c. 1100',
        coords=(33.351868, 44.404131, 'Q138647434', 'site'), location='Muhammad al-Qasim highway, Rusafa',
        notes='Pin from an unlabelled Wikidata city-gate item next to the Suhrawardi mausoleum; confirm identity.'),
    rec('talisman-gate', 'Talisman Gate (site)', 'Gate',
        'A gate of the eastern wall described by Ibn Jubayr in 1185 and restored in 1220 by Caliph al-Nasir with '
        'decorative friezes and an inscription in his name. Murad IV bricked it up in 1638, and Ottoman troops destroyed '
        'it as they withdrew in 1917.',
        [wp('Gates of Baghdad')], alt=['Bab al-Talsim', 'Bab Halba', 'White Gate', 'باب الطلسم'], period='Abbasid', year=1220,
        location='Eastern wall, Rusafa', destroyed='Destroyed (1917)'),
    rec('bab-al-muadham', 'Bab al-Mu‘adham', 'Gate',
        'One of four gates built under Caliph al-Mustarshid in the late Abbasid wall, later the Ottoman gate towards '
        'the Abu Hanifa mosque. The gate itself was demolished after 1917; the district between the Sarafiya and Sinak '
        'bridges keeps late-Ottoman and later buildings.',
        [wp("Bab al-Mu'adham"), wp('Gates of Baghdad')], alt=['Bab al-Moatham', 'Bab al-Sultan', 'باب المعظم'], period='Abbasid; Ottoman',
        location='North Rusafa', destroyed='Gate demolished after 1917',
        notes='Wikidata coordinates (33.315, 44.366) point to Karkh and were not used.'),

    # ── Mosques, shrines and madrasas ─────────────────────────────────────────────────────
    wrec('abu-hanifa-mosque', 'Abu Hanifa Mosque', 'Mosque',
         'The great mosque and shrine of A‘dhamiyya built around the tomb of Abu Hanifa, founder of the Hanafi school, '
         'rebuilt many times over the centuries.', 'Abu Hanifa Mosque', 'Q334716', 33.371981, 44.358406,
         alt=['Grand Imam Mosque', 'جامع الإمام الأعظم'], period='Abbasid foundation; later rebuildings', location='A‘dhamiyya'),
    wrec('kadhimiya-shrine', 'Al-Kadhimiya Shrine', 'Shrine',
         'The shrine of the seventh and ninth Twelver Imams, Musa al-Kadhim and Muhammad al-Jawad, where Shaykh al-Mufid '
         'and Nasir al-Din al-Tusi are also buried.', 'Al-Kazimiyya Mosque', 'Q154116', 33.37997, 44.33796,
         alt=['Kadhimiyya Mosque', 'العتبة الكاظمية'], period='Abbasid foundation; later rebuildings', location='Kadhimiya'),
    wrec('hadhrat-al-qadiriyya', 'Hadhrat al-Qadiriyya', 'Shrine',
         'The mausoleum, mosque and library of Abd al-Qadir al-Gilani, founder of the Qadiriyya Sufi order, in Bab '
         'al-Sheikh; the Qadiriyya library holds rare manuscripts.', 'Hadhrat al-Qadiriyya', 'Q12186500', 33.33645, 44.40799,
         alt=['Abd al-Qadir al-Gilani shrine', 'الحضرة القادرية', 'Mazar Ghous'], period='Abbasid foundation; Ottoman', location='Bab al-Sheikh'),
    wrec('al-khulafa-mosque', 'Al-Khulafa Mosque and Suq al-Ghazl Minaret', 'Mosque',
         'Baghdad’s oldest surviving mosque site, first built in 908. Its Ilkhanid minaret, once the highest point of '
         'the city, survives beside a 1960s rebuilding.', 'Al-Khulafa Mosque', 'Q12204233', 33.339123, 44.397691,
         alt=['Al-Qasr Mosque', 'Suq al-Ghazl minaret', 'جامع الخلفاء'], period='Abbasid; Ilkhanid minaret', year=908, location='Jumhuriya Street'),
    wrec('qamariyya-mosque', 'Qamariyya Mosque', 'Mosque',
         'A late-Abbasid mosque on the Karkh bank of the Tigris, one of the oldest in Baghdad, renovated repeatedly but '
         'keeping its architectural character.', 'Qamariyya Mosque', 'Q20410890', 33.339722, 44.383056,
         alt=['جامع قمرية'], period='Late Abbasid', location='Karkh riverbank'),
    wrec('zumurrud-khatun-mausoleum', 'Zumurrud Khatun Mausoleum', 'Mausoleum',
         'The muqarnas-domed tomb of Zumurrud Khatun, wife of Caliph al-Mustadi and mother of al-Nasir, in the Sheikh '
         'Ma‘ruf cemetery; popularly called the tomb of Sitt Zubayda.', 'Zumurrud Khatun Mosque and Mausoleum', 'Q22689849', 33.331626, 44.372893,
         alt=['Tomb of Sitt Zubayda', 'قبر زمرد خاتون'], period='Abbasid', year='c. 1200', location='Sheikh Ma‘ruf cemetery, Karkh'),
    wrec('suhrawardi-mausoleum', 'Mausoleum of Umar al-Suhrawardi', 'Mausoleum',
         'The Abbasid-era conical muqarnas-domed tomb of Shihab al-Din Umar al-Suhrawardi, founder of the Suhrawardiyya '
         'order, near Bab al-Wastani.', 'Mausoleum of Umar Suhrawardi', 'Q28716432', 33.350556, 44.401944,
         alt=['جامع الشيخ عمر السهروردي'], period='Abbasid', year='13th century', location='Near Bab al-Wastani'),
    wrec('mustasim-billah-mosque', 'Al-Musta‘sim Billah Mosque', 'Mosque',
         'A shrine-mosque in A‘dhamiyya, originally Mashhad al-Wu‘ud over the grave of Ahmad al-Sabti, son of Harun '
         'al-Rashid, which holds the tomb of the last Abbasid caliph, al-Musta‘sim.', "Al-Musta'sim Billah Mosque", 'Q42331281', 33.371456, 44.363286,
         alt=['Abu Rabi‘ah Mosque', 'Mashhad al-Wu‘ud'], period='Abbasid', location='A‘dhamiyya'),
    wrec('arif-agha-mosque', 'Arif Agha Mosque (Imam Ahmad ibn Hanbal)', 'Mosque',
         'A small Ottoman mosque with the mausoleum purported to hold Ahmad ibn Hanbal (780–855), moved there after a '
         'flood destroyed his original grave.', 'Arif Agha Mosque, Iraq', 'Q125447828', 33.344444, 44.388056,
         alt=['Imam Ahmad ibn Hanbal Mosque', 'مسجد عارف آغا'], period='Ottoman', location='Rusafa'),
    wrec('buratha-mosque', 'Buratha Mosque', 'Mosque',
         'A Twelver Shi‘i holy site in Karkh traditionally founded in the 7th century over a Nestorian monastery.',
         'Buratha Mosque', 'Q12204312', 33.350944, 44.361028, alt=['جامع براثا'], period='Early Islamic (tradition)', location='Karkh'),
    wrec('mirjan-mosque', 'Mirjan Mosque (Madrasa al-Mirjaniyya)', 'Mosque',
         'The walled mosque of the madrasa founded in 1356 by the Jalayirid governor Amin al-Din Mirjan, with the tombs '
         'of scholars such as Nu‘man al-Alusi.', 'Mirjan Mosque', 'Q12204368', 33.339, 44.3935,
         alt=['Madrasa al-Mirjaniyya', 'جامع مرجان'], period='Jalayirid', year=1356, location='Al-Rashid Street'),
    wrec('al-sarai-mosque', 'Al-Sarai Mosque', 'Mosque',
         'A mosque said to have been laid out by Caliph al-Nasir in 1193 near Bab al-Sultan, rebuilt by Hassan Pasha; '
         'the kings of Iraq prayed here in the royal era.', 'Al-Sarai Mosque', 'Q12204245', 33.3417, 44.3867,
         alt=['Hassan Pasha Mosque', 'King Ghazi Mosque', 'جامع السراي'], period='Abbasid; Ottoman', year=1193, location='Zuqaq al-Sarai'),
    wrec('al-muradiyya-mosque', 'Al-Muradiyya Mosque', 'Mosque',
         'An early Ottoman mosque begun in 1566 by Murad Pasha on al-Maidan Square, whose minaret some consider the '
         'most beautiful in Baghdad.', 'Al-Muradiyya Mosque', 'Q12204288', 33.345451, 44.384826,
         alt=['Murad Pasha Mosque', 'جامع المرادية'], period='Ottoman', year=1566, location='Al-Maidan Square'),
    wrec('uzbek-mosque', 'Uzbek Mosque', 'Mosque', 'A 17th-century mosque of Baghdad’s Uzbek community beside al-Maidan.',
         'Uzbek Mosque', 'Q12204185', 33.3463, 44.3833, alt=['Azbak Mosque', 'جامع الأزبك'], period='Ottoman', year='17th century',
         location='Al-Maidan'),
    wrec('al-ahmadiyya-mosque', 'Mosque-Madrasa of al-Ahmadiyya', 'Mosque',
         'A mosque and madrasa built in 1796 by Ahmad al-Katkhuda, deputy of the Mamluk ruler Sulayman the Great, on '
         'al-Rashid Street at al-Maidan.', 'Mosque-Madrasa of al-Ahmadiyya', 'Q12204184', 33.343611, 44.385833,
         alt=['Al-Maidan Mosque', 'جامع الأحمدية'], period='Ottoman (Mamluk)', year=1796, location='Al-Maidan'),
    wrec('haydar-khana-mosque', 'Haydar-Khana Mosque', 'Mosque',
         'A 19th-century mosque and madrasa by the Mamluk governor Dawud Pasha on a 12th-century mosque of Caliph '
         'al-Nasir; a forum of anti-British agitation in 1920.', 'Haydar-Khana Mosque', 'Q12204223', 33.342545, 44.389423,
         alt=['جامع الحيدرخانة'], period='Abbasid origin; Ottoman (Mamluk)', year='19th century', location='Al-Rashid Street'),
    wrec('adila-khatun-mosque', 'Adila Khatun Mosque', 'Mosque',
         'A mosque founded by Adila Khatun, daughter of the Mamluk ruler Ahmad Pasha, near the Sarafiya bridge.',
         'Adila Khatun Mosque', 'Q28716074', 33.352013, 44.379085, alt=['جامع عادلة خاتون'], period='Ottoman (Mamluk)', year='18th century',
         location='Doctors’ Quarter, Rusafa'),
    wrec('al-khilani-mosque', 'Al-Khilani Mosque', 'Mosque',
         'A Shi‘i mosque with an old shrine of disputed identity, once in the vanished Khilani cemetery; first recorded '
         'in 1726.', 'Al-Khilani Mosque', 'Q6756164', 33.3335, 44.4052, alt=['جامع الخلاني'], period='Ottoman', year=1726,
         location='Khilani Square'),
    wrec('siraj-al-din-mosque', 'Siraj al-Din Mosque', 'Mosque',
         'A mosque of the Mamluk period under Hassan Pasha that names the Siraj al-Din quarter near the Qadiriyya shrine.',
         'Siraj al-Din Mosque', 'Q22686675', 33.3371, 44.4035, alt=['جامع الشيخ سراج الدين'], period='Ottoman (Mamluk)', location='Bab al-Sheikh'),
    wrec('sayyid-sultan-ali-mosque', 'Sayyid Sultan Ali Mosque', 'Mosque',
         'A mosque, madrasa and mausoleum on al-Rashid Street, headquarters of the Rifa‘i Sufi order in Baghdad, around '
         'a tomb of disputed identity.', 'Syed Sultan Ali Mosque', 'Q25450463', 33.3324, 44.3983, alt=['جامع سيد سلطان علي'],
         location='Al-Rashid Street'),
    wrec('shabandar-mosque', 'Shabandar Mosque', 'Mosque', 'A mosque completed in 1902 in A‘dhamiyya by the merchant Shabandar family.',
         'Shabandar Mosque', 'Q20424971', 33.371361, 44.355322, alt=['مسجد الشابندر'], period='Ottoman', year=1902, location='A‘dhamiyya'),
    wrec('fattah-pasha-mosque', 'Fattah Pasha Mosque', 'Mosque',
         'A congregational mosque in Kadhimiya built in the royal era by the sons of the Turkmen statesman Fattah Pasha.',
         'Fattah Pasha Mosque', 'Q20410871', 33.37233, 44.34881, alt=['جامع فتاح باشا'], period='Royal era', location='Kadhimiya'),
    wrec('al-shawy-mosque', 'Al-Shawy Mosque', 'Mosque',
         'A 1957 mosque in Karkh inaugurated in the presence of King Faisal II, noted for calligraphy by Hashem Muhammad '
         'al-Baghdadi.', 'Al-Shawy Mosque', 'Q28714673', 33.3255, 44.3971, alt=['Al-Khatib Mosque', 'جامع الشاوي'],
         period='Royal era', year=1957, location='Karkh'),
    wrec('ibn-bunnieh-mosque', 'Ibn Bunnieh Mosque', 'Mosque',
         'A modern Iraqi mosque with an egg-shaped dome and calligraphy by Hashem Muhammad al-Baghdadi, opposite '
         'Baghdad Central Station.', 'Ibn Bunnieh Mosque', 'Q12242715', 33.323705, 44.383568,
         alt=['Hajj al-Bunnieh Mosque', 'جامع ابن بنية'], period='20th century', location='Alawi, Karkh'),
    wrec('umm-al-tabul-mosque', 'Umm al-Tabul Mosque', 'Mosque',
         'A large mosque commemorating officers of the 1959 Mosul uprising, modelled on Cairo’s Citadel mosques.',
         'Umm al-Tabul Mosque', 'Q12204308', 33.287121, 44.344144, alt=['جامع أم الطبول'], period='20th century', location='Yarmouk'),
    wrec('salman-al-farsi-mosque', 'Mosque of Salman al-Farsi', 'Shrine',
         'The tomb of Salman the Persian, companion of the Prophet, at Salman Pak, with a mosque established over the '
         'older mausoleum in 1950.', 'Mosque of Salman al-Farsi', 'Q40376648', 33.098333, 44.581111,
         alt=['Salman Pak shrine', 'مرقد سلمان الفارسي'], period='Early Islamic tomb; 1950 mosque', location='Salman Pak'),
    wrec('baba-nanak-shrine', 'Baba Nanak Shrine', 'Shrine',
         'A Sikh shrine marking where Guru Nanak stayed outside Baghdad around 1511; rediscovered and rebuilt by Sikh '
         'soldiers in the two world wars, it survived in fair shape until 2003.', 'Baba Nanak Shrine', 'Q65951969', 33.336188, 44.363937,
         alt=['Gurdwara Baba Nanak', 'مقام بابا نانك'], period='Ottoman (16th century)', year=1511, location='Karkh cemetery area',
         destroyed='Badly damaged after 2003'),

    # ── Markets, streets and historic quarters ───────────────────────────────────────────
    wrec('khan-mirjan', 'Khan Mirjan', 'Caravanserai',
         'A 14th-century caravanserai built by the Jalayirid governor Amin al-Din Mirjan, with a 13 m-high vaulted hall of '
         'brick arches; restored in the 1980s.', 'Khan Mirjan', 'Q6400089', 33.3386, 44.3925,
         alt=['Khan Murjan', 'خان مرجان'], period='Jalayirid', year='14th century', location='Souk area, Rusafa'),
    wrec('souk-al-safafeer', 'Souk al-Safafeer', 'Historic Market',
         'The coppersmiths’ market off al-Rashid Street, active since the Abbasid period and linked to the Mustansiriya '
         'madrasa; its craft is now in decline.', 'Souk al-Safafeer', 'Q6802795', 33.339999, 44.39176,
         extra_sources=[src('Al Jazeera, 7 August 2018 — Baghdad’s coppersmith souk: a fading cultural treasure',
                            'https://www.aljazeera.com/features/2018/8/7/baghdads-coppersmith-souk-a-fading-cultural-treasure', level='search-snippet')],
         alt=['Coppersmiths’ market', 'سوق الصفافير'], period='Abbasid to present', location='Al-Rashid Street'),
    wrec('shorja-market', 'Shorja Market', 'Historic Market',
         'One of Baghdad’s historic marketplaces, with late-Abbasid origins, stretching from al-Kifah Street to the '
         'Mirjan mosque.', 'Shorja', 'Q6807626', 33.339424, 44.400202, alt=['Al-Shorja', 'الشورجة'], period='Late Abbasid to present',
         location='Rusafa'),
    wrec('mutanabbi-street', 'Al-Mutanabbi Street', 'Historic Urban Area',
         'The historic centre of Baghdad bookselling off al-Rashid Street, a gathering place of writers and intellectuals.',
         'Mutanabbi Street', 'Q2562384', 33.340954, 44.388843, alt=['شارع المتنبي'], period='Ottoman and later', location='Rusafa'),
    wrec('al-rashid-street', 'Al-Rashid Street', 'Historic Urban Area',
         'Baghdad’s first modern avenue, opened in 1916, lined with arcaded late-Ottoman and royal-era buildings and now '
         'a municipal conservation focus.', 'Al-Rashid Street, Baghdad', 'Q4704687', 33.342702, 44.388671,
         alt=['شارع الرشيد'], period='Late Ottoman and royal era', year=1916, location='Rusafa'),
    wrec('al-maidan-square', 'Al-Maidan Square', 'Historic Urban Area',
         'An old square from Bab al-Mu‘adham to al-Rashid Street with mosques, markets and the houses of royal-era '
         'politicians such as Nuri al-Said.', 'Al-Maidan Square', 'Q120765111', 33.3443, 44.3852,
         alt=['Al-Maidan', 'ساحة الميدان'], period='Ottoman to royal era', location='Rusafa'),
    rec('bab-al-sheikh-quarter', 'Bab al-Sheikh Quarter', 'Historic Urban Area',
        'An old Rusafa quarter around the Qadiriyya shrine, rich in Sufi lodges, tombs and mosques.',
        [wp('Bab al-Sheikh')], alt=['باب الشيخ'], period='Abbasid to present', location='Rusafa'),
    wrec('bataween', 'Bataween (former Jewish quarter)', 'Historic Urban Area',
         'A 1930s riverside quarter built by Iraqi Jews and Armenians, once home to synagogues, churches, schools and '
         'clubs, and the main Jewish quarter until the community left.', 'Bataween', 'Q130467025', 33.3201, 44.4205, 'settlement',
         alt=['Al-Bataween', 'البتاوين'], period='Royal era', location='Karrada'),

    # ── Churches ───────────────────────────────────────────────────────────────────────
    mrec('sourp-asdvadzadzin', 'Sourp Asdvadzadzin Church (Miskinta)', 'Church',
         'Baghdad’s oldest church still in use, built in 1639–40 by an Armenian artillery officer of Sultan Murad IV '
         'after the conquest of Baghdad; rebuilt several times, last in 1967–70.',
         'leglise-sourp-asdwadzadzin-de-bagdad-eglise-de-la-sainte-mere-de-dieu-', 'The church Sourp Asdvadzadzin in Baghdad', 33.346017, 44.386633,
         extra_sources=[wd('Q114342026')], alt=['Holy Mother of God', 'Miskinta', 'كنيسة مريم العذراء للأرمن الأرثوذكس'],
         period='Ottoman', year=1639, location='Al-Maidan'),
    mrec('om-al-ahzan-church', 'Om al-Ahzan Church (Mary Mother of Sorrows)', 'Church',
         'The old Chaldean patriarchal cathedral in Aqd al-Nasara, the historic Christian quarter of Shorja; built in '
         '1843 and rebuilt 5 m higher in 1889 after floods, consecrated in 1898.',
         'leglise-om-al-ahzane-mere-des-douleurs-de-bagdad', 'Church of Mary mother of sorrows in Baghdad', 33.338139, 44.395528,
         extra_sources=[wp('Cathedral of Our Lady of Sorrows')], alt=['Umm al-Ahzan', 'Our Lady of Sorrows', 'كنيسة أم الأحزان'],
         period='Ottoman', year=1843, location='Aqd al-Nasara, Shorja'),
    mrec('latin-st-joseph', 'Latin Church of St Joseph', 'Church',
         'The Carmelite church consecrated in 1871, long the Latin cathedral, with a 32 m dome visible across the old '
         'Christian quarter; requisitioned by Ottoman forces in 1917.',
         'leglise-latine-mar-youssef-de-bagdad', 'The Mar Youssef latin church in Baghdad', 33.338861, 44.396528,
         extra_sources=[wp('Latin Cathedral of St. Joseph')], alt=['Church of the Latins', 'كنيسة اللاتين'], period='Ottoman', year=1871,
         location='Jumhuriya Street'),
    mrec('syriac-catholic-immaculate', 'Syriac Catholic Church of the Immaculate Conception (site)', 'Church',
         'A church completed in 1862 next to Om al-Ahzan; abandoned when its community moved to Karrada and demolished at '
         'the end of 2018, 156 years after it opened.',
         'leglise-syriaque-catholique-vierge-marie-immaculee-conception-de-bagda', 'The syriac-catholic church of our Lady of the Immaculate in Baghdad',
         33.338425, 44.395672, period='Ottoman', year=1862, location='Aqd al-Nasara, Shorja', destroyed='Demolished (December 2018)'),
    mrec('armenian-sacred-heart', 'Armenian Catholic Church of the Sacred Heart', 'Church',
         'A western-style brick basilica in Karrada consecrated in 1938, funded by the Kasparkhan sisters.',
         'leglise-armenienne-catholique-du-sacre-coeur-de-jesus-a-bagdad', 'The Armenian Catholic church of the Sacred Heart of Jesus in Baghdad',
         33.304806, 44.42825, period='Royal era', year=1938, location='Karrada'),
    mrec('st-gregory-armenian-cathedral', 'Sourp Krikor Loussavoritch Armenian Cathedral', 'Church',
         'The Armenian Apostolic cathedral of 1954–57 with an octagonal cupola, on an estate holding an Armenian cemetery '
         'since 1904.', 'la-cathedrale-armenienne-sourp-krikor-loussavoritch-de-bagdad', 'The Armenian Apostolic Cathedral of Sourp Krikor Loussavoritch in Baghdad',
         33.330108, 44.414344, extra_sources=[wp('St. Gregory Armenian Church')], alt=['St Gregory the Illuminator', 'كنيسة غريغور الأرمنية'],
         period='Royal era', year=1957, location='Bab al-Sharqi'),
    mrec('chaldean-st-joseph-karrada', 'Chaldean Cathedral of St Joseph, Karrada', 'Church',
         'The Chaldean cathedral begun in 1952 and consecrated in 1956, built when the community left Aqd al-Nasara for '
         'Karrada.', 'la-cathedrale-mar-youssef-kharbanda-de-bagdad', 'Mar Yousef (St Joseph) cathedral in Baghdad', 33.301469, 44.428247,
         extra_sources=[wp('Chaldean Cathedral of St. Joseph')], alt=['Mar Yusif', 'كاتدرائية مار يوسف'], period='Royal era', year=1956, location='Karrada'),
    mrec('queen-of-the-rosary', 'Chaldean Church of Our Lady Queen of the Rosary', 'Church',
         'A domed church inaugurated in 1960 in Karrada, also called the church of Saint Rita.',
         'leglise-chaldeenne-vierge-marie-reine-du-rosaire-de-bagdad', 'The Chaldean our Lady Queen of the Rosary church in Baghdad', 33.293594, 44.419442,
         alt=['Saint Rita Church'], period='20th century', year=1960, location='Karrada'),
    mrec('st-peter-and-paul-cathedral', 'Syriac Orthodox Cathedral of St Peter and St Paul', 'Church',
         'A large cathedral consecrated in 1964 by Patriarch Ignatius Yacoub III, twice targeted by car bombs after 2003.',
         'la-cathedrale-mar-petros-et-mar-paulos-de-bagdad-saints-pierre-et-paul', 'St Peter and St Paul Cathedral in Baghdad', 33.31305, 44.440561,
         alt=['Mar Petros and Mar Paulos'], period='20th century', year=1964, location='Rusafa'),
    mrec('sayidat-al-nejat', 'Sayidat al-Nejat Cathedral', 'Church',
         'The Syriac Catholic cathedral of 1968 in Karrada where 47 worshippers were killed in the attack of 31 October '
         '2010.', 'la-cathedrale-sayidat-al-najatte-notre-dame-du-salut-ou-notre-dame-du-', 'Cathedral Sayidat al Najat in Baghdad', 33.307081, 44.426189,
         extra_sources=[wp('Sayidat al-Nejat Cathedral')], alt=['Our Lady of Salvation', 'كنيسة سيدة النجاة'], period='20th century', year=1968,
         location='Karrada'),
    rec('mar-gorgis-new-baghdad', 'Mar Gorgis Chaldean Church, New Baghdad', 'Church',
        'A church of 1969 in brick and concrete with a reverse arch and radiating apse, richly decorated with paintings, '
        'mosaics and stained glass.', [mh('leglise-chaldeenne-mar-guorguis-de-bagdad', 'The Mar Gorgis Chaldean Church in Baghdad')],
        period='20th century', year=1969, location='Al-Jidida (New Baghdad)', notes='Source coordinates are garbled; no pin.'),

    # ── Jewish heritage ────────────────────────────────────────────────────────────────
    wrec('great-synagogue', 'Great Synagogue of Baghdad (Shaf ve-Yativ)', 'Synagogue',
         'A synagogue traditionally on the site of one founded by the exiled King Jeconiah; rebuilt several times and '
         'now a Jewish museum.', 'Great Synagogue of Baghdad', 'Q5600071', 33.3413, 44.3964,
         alt=['Shaf ve-Yativ', 'كنيس بغداد العظيم'], period='Ottoman fabric; ancient tradition', location='Old Jewish quarter, Rusafa'),
    wrec('meir-taweig-synagogue', 'Meir Taweig Synagogue', 'Synagogue',
         'A 1942 synagogue complex with school, library and community centre in Bataween, one of the city’s last.',
         'Meir Taweig Synagogue', 'Q5274677', 33.322557, 44.416861, alt=['Meir Tweg', 'كنيس مئير طويق'], period='Royal era', year=1942,
         location='Bataween'),
    wrec('shamash-school', 'Shamash School', 'Historic School',
         'A Jewish high school founded on al-Rashid Street in 1928 with Anglo-Jewish support; after 1950 it passed through '
         'other uses and stood as a garage before reopening as a heritage site.', 'Shamash School', 'Q7487432', 33.3201, 44.4205,
         alt=['مدرسة شماش'], period='Royal era', year=1928, location='Al-Rashid Street'),
    wrec('habibiyah-jewish-cemetery', 'Al-Habibiyah Jewish Cemetery', 'Cemetery',
         'Baghdad’s Jewish cemetery near Sadr City with more than 4,000 graves, moved here in 1975 from the old cemetery '
         'in al-Nahda.', 'Al-Habibiyah Jewish Cemetery', 'Q130218654', 33.364167, 44.458889,
         alt=['مقبرة الحبيبية'], period='20th century', year=1975, location='Habibiya'),

    # ── Ottoman, royal-era and 20th-century architecture ─────────────────────────────────────
    wrec('baghdadi-museum', 'Baghdadi Museum', 'Museum',
         'A folk museum opened in 1970 in a riverside building of 1869, with 70 life-size scenes of Baghdad crafts and '
         'street life.', 'Baghdadi Museum', 'Q10424690', 33.3401, 44.3895, alt=['المتحف البغدادي'], period='Ottoman building', year=1869,
         location='Rusafa riverbank'),
    wrec('abd-al-karim-qasim-museum', 'Abd al-Karim Qasim Museum', 'Museum',
         'A museum to Iraq’s first republican leader in a heritage house on al-Rashid Street.', 'Abd al-Karim Qasim Museum', 'Q28716348', 33.3272, 44.4054,
         alt=['Al-Za‘em Museum', 'متحف الزعيم'], period='Heritage house', location='Al-Rashid Street'),
    wrec('iraq-museum', 'Iraq Museum', 'Museum',
         'The national museum, founded after the First World War to keep excavated finds in Iraq; looted in 2003 and '
         'reopened in 2015.', 'Iraq Museum', 'Q521251', 33.328611, 44.385833, alt=['National Museum of Iraq', 'المتحف العراقي'],
         period='20th century', location='Karkh'),
    wrec('white-palace', 'White Palace (al-Qasr al-Abyadh)', 'Palace',
         'A domed royal guest house of 1934, built at King Ghazi’s order, where foreign heads of government were received.',
         'White Palace (Baghdad)', 'Q114773770', 33.326018, 44.420482, alt=['القصر الأبيض'], period='Royal era', year=1934,
         location='Above Bataween'),
    wrec('al-rehab-palace', 'Al-Rehab Palace', 'Palace',
         'The private residence of the Iraqi royal family from 1937 to 1958, the last home of the monarchy.', 'Al-Rehab Palace', 'Q6831994', 33.320833, 44.390278, alt=['Qasr al-Rihab', 'قصر الرحاب'],
         period='Royal era', year=1937, location='Mansour'),
    wrec('republican-palace', 'Republican Palace', 'Palace',
         'The third royal palace of the Hashemite kingdom, ordered by Faisal II and finished in the early 1960s; seat of '
         'the presidency from 1963 to 2003.', 'Republican Palace, Baghdad', 'Q3564887', 33.304167, 44.408611,
         alt=['القصر الجمهوري'], period='Royal era', year='c. 1960', location='Karkh'),
    wrec('royal-cemetery', 'Royal Mausoleum (Iraqi Royal Cemetery)', 'Mausoleum',
         'The blue-domed mausoleum of the Iraqi royal family in A‘dhamiyya, designed by J. Brian Cooper and built in '
         '1934–36 in Islamic style.', 'Iraqi Royal Cemetery', 'Q16128350', 33.3655, 44.3578,
         alt=['Royal Mausoleum', 'المقبرة الملكية'], period='Royal era', year=1936, location='A‘dhamiyya'),
    wrec('baghdad-central-station', 'Baghdad Central Station', 'Historic Building',
         'The domed main railway station designed by J. M. Wilson and built in 1948–53, described by the BBC as the '
         '“crown jewel” of Baghdad.', 'Baghdad Central Station', 'Q3544831', 33.323611, 44.380278,
         alt=['محطة بغداد المركزية'], period='Royal era', year=1953, location='Alawi, Karkh'),
    wrec('markaziyah-high-school', 'Al-Markaziyya High School', 'Historic School',
         'Iraq’s oldest and most renowned high school, founded in 1918.', 'Markaziyah High School', 'Q6770580', 33.315, 44.3661,
         alt=['الإعدادية المركزية'], period='20th century', year=1918, location='Karkh', notes='Wikidata coordinate is rounded.'),
    wrec('university-of-baghdad-campus', 'University of Baghdad Campus (Gropius)', 'Historic Building',
         'The Jadiriya campus planned by Walter Gropius and The Architects Collaborative, only partly built; '
         'its faculty office tower is among the surviving elements.', 'University of Baghdad', 'Q550376', 33.270111, 44.381719,
         extra_sources=[src('Monocle — How Le Corbusier and Walter Gropius built modernist Baghdad',
                            'https://monocle.com/design/architecture/how-le-corbusier-and-walter-gropius-built-modernist-baghdad/', level='search-snippet'),
                        src('Archnet — Jami‘a Baghdad', 'https://archnet.org/sites/15908', level='search-snippet')],
         alt=['Jami‘a Baghdad', 'جامعة بغداد'], period='20th century', location='Jadiriya'),
    wrec('baghdad-gymnasium', 'Baghdad Gymnasium (Le Corbusier)', 'Historic Building',
         'The only built part of the sports complex Le Corbusier designed from 1956 for King Faisal II; completed long '
         'after his death.', 'Baghdad Gymnasium', 'Q7397664', 33.326389, 44.437778,
         alt=['Saddam Hussein Gymnasium', 'Le Corbusier Gym'], period='20th century', location='Al-Sha‘ab'),
    wrec('al-sarafiya-bridge', 'Al-Sarafiya Bridge', 'Historic Bridge',
         'A steel truss bridge of the 1940s–50s linking Waziriyah and Utafiyah, damaged in 1991, partly destroyed by a '
         'truck bomb in 2007 and rebuilt in 2008.', 'Al-Sarafiya Bridge', 'Q310579', 33.353611, 44.372778,
         alt=['جسر الصرافية'], period='Royal era', location='North Baghdad', destroyed='Partly destroyed (2007); rebuilt'),

    # ── Cemeteries ─────────────────────────────────────────────────────────────────────
    wrec('north-gate-war-cemetery', 'Baghdad (North Gate) War Cemetery', 'Cemetery',
         'A Commonwealth war cemetery with 4,480 burials and commemorations of both world wars, including 100 Turkish '
         'graves; repaired in 2012.', 'Baghdad (North Gate) War Cemetery', 'Q65242789', 33.35442, 44.38648,
         alt=['مقبرة الإنكليز'], period='20th century', location='Bab al-Mu‘adham'),

    # ── Monuments ──────────────────────────────────────────────────────────────────────
    wrec('freedom-monument', 'Freedom Monument (Nasb al-Hurriyah)', 'Historic Monument',
         'Jawad Saleem’s 1961 bronze frieze on a travertine wall in Tahrir Square, telling the story of the 14 July '
         'Revolution in a language drawn from ancient Mesopotamian art.', 'Freedom Monument (Baghdad)', 'Q12248479', 33.328246, 44.409206,
         alt=['Nasb al-Hurriyah', 'نصب الحرية'], period='20th century', year=1961, location='Tahrir Square'),
    wrec('kahramana', 'Kahramana Fountain', 'Historic Monument',
         'Mohammed Ghani Hikmat’s 1971 fountain of Marjana pouring oil on the forty thieves, one of Baghdad’s best-known '
         'public artworks.', 'Kahramana', 'Q49006231', 33.311364, 44.424119, alt=['نصب كهرمانة'], period='20th century', year=1971,
         location='Al-Sa‘doun Street'),
    wrec('al-shaheed-monument', 'Al-Shaheed Monument', 'Historic Monument',
         'Ismail Fatah al-Turk’s split turquoise dome of 1983 commemorating the dead of the Iran–Iraq War.',
         'Al-Shaheed Monument', 'Q310023', 33.3433, 44.4459, alt=['Martyr’s Memorial', 'نصب الشهيد'], period='20th century', year=1983,
         location='East Baghdad'),
    wrec('unknown-soldier-monument', 'Monument to the Unknown Soldier', 'Historic Monument',
         'A monument built in 1979–82 by the Italian architect Marcello D’Olivo after a concept by Khaled al-Rahal.',
         'Monument to the Unknown Soldier, Baghdad', 'Q7752141', 33.3085, 44.389, alt=['نصب الجندي المجهول'], period='20th century', year=1982,
         location='Karkh'),
    wrec('victory-arch', 'Victory Arch (Swords of Qadisiyah)', 'Historic Monument',
         'Twin arches of hands holding crossed swords marking the entrances to the Grand Festivities Square, opened in 1989.',
         'Victory Arch', 'Q1340523', 33.305167, 44.386464, alt=['Hands of Victory', 'Crossed Swords', 'قوس النصر'], period='20th century', year=1989,
         location='Karkh'),
]


# ── Corroboration pass (2026-11-03) ──────────────────────────────────────────────────────
# Institutional sources found for cards whose strongest evidence was Wikipedia. Each was
# identified from the search result title and excerpt only: the sites refused automated
# access (Archnet 429, Encyclopaedia Iranica 403, Diarna unreachable, CWGC 403), so every
# entry is `search-snippet`. Where an excerpt disagrees with the card, the description is
# left as it was and the difference is recorded for review.
CORROBORATED = '2026-11-03'
ARCHNET = 'Archnet (MIT / Aga Khan Trust for Culture)'


def snippet(name, url):
    return src(name, url, CORROBORATED, 'search-snippet')


def archnet(site_id, title):
    return snippet(f'{ARCHNET} — {title}', f'https://www.archnet.org/sites/{site_id}')


CORROBORATION = {
    'mirjan-mosque': ([archnet(3844, 'Madrasa al-Mirjaniyya')],
                      'Archnet says Mirjan was buried here in 1372 and describes the building as now destroyed; check '
                      'whether that refers to the demolished madrasa or the surviving mosque.'),
    'kadhimiya-shrine': ([archnet(3848, 'Mashhad al-Kazimiyya')], ''),
    'hadhrat-al-qadiriyya': ([archnet(3849, "Jami' 'Abd al-Qadir al-Jaylani")], ''),
    'zumurrud-khatun-mausoleum': ([archnet(1696, 'Turba Zumurrud Khatun'), archnet(4358, "Jami' Zumurrud Khatun")], ''),
    'suhrawardi-mausoleum': ([archnet(4329, 'Darih al-Suhrawardi')], ''),
    'al-muradiyya-mosque': ([archnet(3850, "Jami' Murad Basha")],
                            'Archnet dates the mosque to 1578 from its inscription; the card gives 1566 as the start.'),
    'khan-mirjan': ([archnet(15578, 'Khan Marjan'),
                     snippet('Aga Khan Award for Architecture (Archnet) — Mirjan Khan Restoration Project Summary',
                             'https://www.archnet.org/publications/373')],
                    'Archnet dates the khan to 1358 and lists a restoration in 1976; the card says restored in the 1980s.'),
    'bab-al-wastani': ([archnet(4326, 'Bab al-Wastani')],
                       'Archnet dates the gate to 1221 (618 AH), under al-Nasir; the card attributes it to al-Mustazhir (c. 1100). '
                       'Possibly the wall and a later rebuilding of the gate; check.'),
    'talisman-gate': ([archnet(3832, 'Bab al-Talsim')], 'Archnet gives 1221 for the inscription; the card says 1220.'),
    'al-khulafa-mosque': ([archnet(27, "Jami' al-Khulafa"), archnet(3842, 'Suq al-Ghazl Minaret')], ''),
    'haydar-khana-mosque': ([archnet(3854, "Jami' Haydar Khanah")], ''),
    'al-ahmadiyya-mosque': ([archnet(3852, "Jami' al-Ahmadiyya")],
                            'Archnet says Ahmad Pasha, the Ottoman governor, began it in 1780 and his brother Abdallah Bey finished it '
                            'in 1796; the card names Ahmad al-Katkhuda as builder in 1796.'),
    'baghdad-gymnasium': ([archnet(345, 'Baghdad Gymnasium')], ''),
    'university-of-baghdad-campus': ([archnet(15908, "Jami'a Baghdad")], ''),
    'unknown-soldier-monument': ([archnet(693, 'Unknown Soldier Monument')], ''),
    'al-shaheed-monument': ([archnet(433, 'Al-Shaheed Monument and Museum')], ''),
    'ctesiphon': ([snippet('Encyclopaedia Iranica — Ctesiphon', 'https://www.iranicaonline.org/articles/ctesiphon/'),
                   snippet('Encyclopaedia Iranica — Madāʾen (Sasanian metropolitan area)',
                           'https://www.iranicaonline.org/articles/madaen-sasanian-metropolitan-area/')], ''),
    'seleucia-on-tigris': ([snippet('Encyclopaedia Iranica — Ctesiphon', 'https://www.iranicaonline.org/articles/ctesiphon/')], ''),
    'round-city': ([snippet('Encyclopaedia Iranica — Baghdad i. The Iranian connection before the Mongol invasion',
                            'https://www.iranicaonline.org/articles/baghdad/baghdad-iranian-connection-i-pr-mongol/')], ''),
    'dur-kurigalzu': ([snippet('UNESCO World Heritage Centre — Archaeological site of Aqar Quf (ancient Dur-Kurigalzu), Tentative List',
                               'https://whc.unesco.org/en/tentativelists/6797/')], ''),
    'sippar-amnanum': ([snippet('German Archaeological Institute library (Zenon) — Van Lerberghe and Voet, Sippar-Amnānum: the Ur-Utu archive (Ghent, 1991)',
                                'https://zenon.dainst.org/Record/000145595')], ''),
    'north-gate-war-cemetery': ([snippet('Commonwealth War Graves Commission — Baghdad (North Gate) War Cemetery',
                                         'https://www.cwgc.org/visit-us/find-cemeteries-memorials/cemetery-details/57303/baghdad-north-gate-war-cemetery/')],
                                'The CWGC lists 4,487 identified casualties; the card says 4,480 burials.'),
    'meir-taweig-synagogue': ([snippet('Diarna (Digital Heritage Mapping) — Meir Tweg Synagogue at Baghdad',
                                       'http://archive.diarna.org/site/detail/public/155/')], ''),
    'shamash-school': ([snippet('Diarna (Digital Heritage Mapping) — Shamash Jewish School at Baghdad',
                                'http://archive.diarna.org/site/detail/public/293/')], ''),
}

# Status recorded by an official source in this pass.
TENTATIVE = {'dur-kurigalzu': 'On the UNESCO World Heritage Tentative List (added 31 January 2025)'}


def corroborate(records):
    by_slug = {record['slug']: record for record in records}
    missing = sorted(set(CORROBORATION) - set(by_slug))
    if missing:
        sys.exit(f'corroboration names unknown records: {missing}')
    for slug, (sources, note) in CORROBORATION.items():
        record = by_slug[slug]
        record['sources'] = record['sources'] + sources
        if note:
            record['review_notes'] = f"{record['review_notes']} {note}" if record.get('review_notes') else note
    for slug, status in TENTATIVE.items():
        by_slug[slug]['unesco'] = False
        by_slug[slug]['heritage_status'] = status
    return records


def main():
    corroborate(RECORDS)
    ids = [r['id'] for r in RECORDS]
    if len(ids) != len(set(ids)):
        sys.exit('duplicate ids in batch')
    (HERE / 'baghdad-records.json').write_text(json.dumps(RECORDS, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

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
