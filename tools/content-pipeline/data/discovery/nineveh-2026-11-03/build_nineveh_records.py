"""Builds the Nineveh (Ninewa) governorate discovery batch (research date 2026-11-03).

Same contract as the Erbil and Duhok batches: source-backed `needs-review` drafts,
coordinates only from the cited source (`coordinates_source`), `settlement`
precision when the pin marks the town rather than the monument, and unknown values
left empty. `parentSite` links components to the approved records for Nineveh,
Nimrud, Hatra and the Old City of Mosul; those approved records are not changed.

`destruction_status` repeats what the cited inventory says about 2014–2017 damage.
It is not a statement about present condition; several monuments have since been
rebuilt.

Shekhan-district sites added in the Duhok batch (Khinnis, Jerwan, Baadre castle,
Ain Sifni shrines, Gir-e Gomel, Mohamed Rashan) are already filed under Nineveh
there and are not repeated here.

Usage (from the repository root):
    python3 tools/content-pipeline/data/discovery/nineveh-2026-11-03/build_nineveh_records.py
"""
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[4]
SITES = ROOT / 'src' / 'data' / 'sites.json'
TODAY = '2026-11-03'
C1 = '2026-11-02'

OLD_MOSUL = 'site-nineveh-old-mosul'
NINEVEH = 'site-nineveh-ancient-nineveh'
NIMRUD = 'site-nineveh-nimrud'

MOM = 'https://monumentsofmosul.com/destroyedmonuments.htm'
MOM_NAME = 'Czech Academy of Sciences, Oriental Institute — Mosul’s monuments deliberately destroyed by Islamic State (2014–2017)'
TL = 'https://whc.unesco.org/en/tentativelists/6355/'
TL_NAME = 'UNESCO World Heritage Centre — Tentative List: Old City of Mosul'
UMDB = 'https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0'
UMDB_NAME = 'University of Tokyo Museum — Iraq archaeological photo database'
HEID = 'https://ninive.uni-heidelberg.de/'
MH = 'https://www.mesopotamiaheritage.org/en/monuments/'
MOSUL_EYE = 'https://mosul-eye.org/destroyed-sites/'


def src(name, url, accessed=TODAY, level='full-text', locator=None):
    entry = {'sourceName': name, 'url': url, 'evidenceId': None, 'accessedAt': accessed, 'accessLevel': level}
    if locator:
        entry['locator'] = locator
    return entry


def wp(title, level='full-text'):
    return src(f'Wikipedia — {title}', 'https://en.wikipedia.org/wiki/' + title.replace(' ', '_'), level=level)


def wd(qid):
    return src(f'Wikidata {qid} (coordinates)', f'https://www.wikidata.org/wiki/{qid}')


def mh(path, title):
    return src(f'Mesopotamia Heritage — {title}', MH + path + '/')


def mom(entry):
    return src(MOM_NAME, MOM, locator=f'Catalogue entry: {entry}')


def tl(section):
    return src(TL_NAME, TL, C1, locator=section)


def umdb(code):
    return src(UMDB_NAME, UMDB, C1, locator=f'Record {code}')


def rec(slug, name, category, description, sources, period='', alt=None, coords=None, year=None,
        location='', parent=None, notes='', destroyed='', governorate='Nineveh', admin=''):
    record = {
        'id': f'site-{governorate.lower()}-{slug}',
        'name': name,
        'governorate': governorate,
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
        'discovery_batch': 'nineveh-2026-11-03',
    }
    if alt:
        record['alternativeNames'] = alt
    if location:
        record['approximateLocation'] = location
    if year is not None:
        record['estimated_year'] = year
    if parent:
        record['parentSite'] = parent
        if parent == OLD_MOSUL:
            record['heritage_status'] = 'Within the Old City of Mosul (UNESCO Tentative List); no separate listing.'
    if destroyed:
        record['destruction_status'] = destroyed
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


def mh_coords(lat, lng, page, precision='site'):
    return (lat, lng, f'mesopotamiaheritage:{page}', precision)


def destroyed_mosul(slug, name, category, where, state, sources, period='', alt=None, coords=None, extra='',
                    parent=OLD_MOSUL, year=None):
    """A Mosul monument listed in the Czech Academy catalogue of deliberate IS destruction."""
    desc = f'{category} in {where}, Mosul.'
    if extra:
        desc += f' {extra}'
    desc += f' The Czech Academy of Sciences lists it among monuments deliberately destroyed by Islamic State ({state}).'
    return rec(slug, name, category, desc, sources, period=period, alt=alt, coords=coords, year=year,
               location=f'{where}, Mosul', parent=parent, destroyed=state)


RECORDS = [
    # ── Mosul: Islamic monuments (Czech Academy catalogue, UNESCO Old City dossier, Wikipedia) ──────
    rec('nabi-yunus-mosque', 'Mosque and Shrine of Nabi Yunus', 'Mosque',
        'A congregational mosque and shrine on Tell al-Tawba, the Nebi Yunus mound of Nineveh, holding a tomb '
        'venerated as that of the Prophet Jonah. It was blown up in July 2014; excavations after the liberation of '
        'Mosul found a Neo-Assyrian palace beneath it.',
        [wp('Al-Nabi Yunus Mosque'), mom('Mosque and Tomb of Nabi Yunus'), wd('Q12204304')],
        alt=['Prophet Jonah Mosque', 'جامع النبي يونس', 'Tell al-Tawba'], period='Assyrian site; Islamic shrine',
        coords=(36.347953, 43.159535, 'Q12204304', 'site'), location='Tell Nebi Yunus, East Mosul',
        parent=NINEVEH, destroyed='Razed (24 July 2014)'),
    rec('nabi-jirjis-mosque', 'Mosque and Shrine of Nabi Jirjis', 'Mosque',
        'A mosque named after Saint George (Jirjis), believed locally to be buried in its mausoleum. The tomb is '
        'mentioned by Ibn Jubayr in the 12th century; the mosque is attributed to Tamerlane in the 14th century, '
        'with Ottoman rebuilding.',
        [wp('Al-Nabi Jirjis Mosque'), mom('Mosque and Tomb of Nabi Jirjis'), wd('Q12204298')],
        alt=['Prophet George Mosque', 'جامع النبي جرجيس'], period='Timurid; Ottoman',
        coords=(36.344531, 43.130503, 'Q12204298', 'site'), location='Mahallat Bab al-Nabi, West Mosul',
        parent=OLD_MOSUL, destroyed='Razed (25 July 2014)'),
    rec('nabi-shith-mosque', 'Mosque of Nabi Shith', 'Mosque',
        'An Ottoman mosque and shrine in south Mosul believed to hold the burial of Seth, son of Adam. Islamic State '
        'blew it up and turned the site into a car park.',
        [wp('Al-Nabi Shith Mosque'), mom('Mosque of Nabi Shith'), wd('Q12204301')],
        alt=['Prophet Seth Mosque', 'جامع النبي شيت'], period='Ottoman',
        coords=(36.33468, 43.135398, 'Q12204301', 'site'), location='al-Nabi Shith Street, West Mosul',
        destroyed='Razed (25 July 2014)'),
    rec('hamu-al-qadu-mosque', 'Hamu al-Qadu Mosque', 'Mosque',
        'A mosque completed in 1880/81 by the merchant Hajji Abdullah Chalabi (“Hamu al-Qadu”), with the tomb of '
        'the local mystic Shaykh Ala’ al-Din in its basement. Destroyed by Islamic State and rebuilt in 2022.',
        [wp('Hamu al-Qadu Mosque'), mom('Mosque of Hamu al-Qadu – Tomb of Ala al-Din'), wd('Q12204323')],
        alt=['Tomb of Ala al-Din', 'جامع حمو القدو'], period='Ottoman', year=1880,
        coords=(36.345, 43.134528, 'Q12204323', 'site'), location='Bab al-Tob, West Mosul',
        parent=OLD_MOSUL, destroyed='Ruined (6 March 2015, per the Czech Academy catalogue)',
        notes='Wikipedia dates the destruction to March 2014; the catalogue gives 6 March 2015.'),
    rec('al-mujahidi-mosque', 'Al-Mujahidi Mosque (al-Khidr Mosque)', 'Mosque',
        'A 12th-century riverside mosque named after its patron Mujahid al-Din Qaimaz, also called the Red Mosque '
        'and al-Khidr. Islamic State destroyed it in 2015; it was being rebuilt in 2024.',
        [wp('Al-Mujahidi Mosque'), mom('Mosque of al-Khidr'), wd('Q12204228')],
        alt=['Mosque of al-Khidr', 'al-Jami al-Ahmar', 'Red Mosque', 'جامع المجاهدي', 'جامع الخضر'], period='Atabeg', year='12th century',
        coords=(36.340164, 43.140537, 'Q12204228', 'site'), location='Corniche, southern edge of the old town',
        parent=OLD_MOSUL, destroyed='Razed (26 February 2015)'),
    rec('imam-al-bahir-shrine', 'Shrine and Mosque of Imam al-Bahir', 'Shrine',
        'A shrine commissioned by the Atabeg ruler Badr al-Din Lu’lu’ in 1259 for a descendant of Imam Husayn, with '
        'marble work bearing the Throne Verse. Razed in 2014 and rebuilt in 2022.',
        [wp('Imam al-Baher Mosque'), mom('Shrine and Mosque of Imam al-Bahir'), wd('Q25450322')],
        alt=['Imam al-Baher Mosque', 'جامع الإمام الباهر'], period='Atabeg', year=1259,
        coords=(36.345306, 43.119528, 'Q25450322', 'site'), location='Mahallat al-Imam al-Bahir, West Mosul',
        parent=OLD_MOSUL, destroyed='Razed (2 September 2014)'),
    rec('imam-awn-al-din-shrine', 'Mausoleum of Imam Awn al-Din', 'Mausoleum',
        'A cube-shaped mausoleum with a muqarnas dome built in 1248 by Badr al-Din Lu’lu’ over the tomb of a '
        'grandson of Imam Hasan, restored in 1744 and 1776.',
        [wp('Mausoleum of Imam Awn Al-Din'), mom('Shrine of Imam Awn al-Din Ibn al-Hasan'), wd('Q112701911')],
        alt=['Mashhad Imam Awn al-Din', 'مشهد الإمام عون الدين'], period='Atabeg', year=1248,
        coords=(36.339064, 43.131093, 'Q112701911', 'site'), location='Mahallat al-Imam Awn al-Din, West Mosul',
        parent=OLD_MOSUL, destroyed='Ruined (24 July 2014)'),
    rec('yahya-abu-al-qasim-shrine', 'Mausoleum of Yahya Abu al-Qasim', 'Mausoleum',
        'A shrine of 1239 by Badr al-Din Lu’lu’ on the Tigris bank near Bash Tapia, over the tomb of a descendant of '
        'Ali ibn Abi Talib; it housed the Madrasa al-Badriya.',
        [wp('Mausoleum of Yahya Abu al-Qasim'), mom('Shrine of Imam Yahya ibn al-Qasim – Madrasa al-Badriya'), wd('Q30082979')],
        alt=['Madrasa al-Badriya', 'Imam Yahya ibn al-Qasim', 'مرقد يحيى أبو القاسم'], period='Atabeg', year=1239,
        coords=(36.3547, 43.123, 'Q30082979', 'site'), location='al-Shifa’, northern edge of the old town',
        parent=OLD_MOSUL, destroyed='Razed (23 July 2014)'),
    rec('shaykh-fathi-shrine', 'Shrine of Shaykh Fathi al-Mawsili', 'Shrine',
        'A complex with the 9th-century mausoleum of the ascetic and hadith transmitter al-Fath al-Mawsili, rebuilt '
        'in 1760, and a modern mosque. Razed in 2014 and reconstructed in 2022.',
        [wp('Shrine of Shaykh Fathi al-Mawsili'), mom('Mosque and Tomb of Shaykh Fathi'), wd('Q30082298')],
        alt=['مرقد فتحي الموصلي'], period='Abbasid; Ottoman', coords=(36.346424, 43.117651, 'Q30082298', 'site'),
        location='Mahallat al-Shaykh Fathi, West Mosul', destroyed='Two buildings razed (2014); mosque left standing'),
    rec('sultan-wais-mosque', 'Sultan Wais Mosque', 'Mosque',
        'A 17th-century Ottoman mosque on the site of a 14th-century tekke of the Jalayirid ruler Shaykh Uways, '
        'later wrongly linked to Uways al-Qarani.',
        [wp('Sultan Wais Mosque'), mom('Mosque of Sultan Uways and adjacent cemetery'), wd('Q25450071')],
        alt=['Sultan Uways Mosque', 'جامع السلطان ويس'], period='Ottoman', year='17th century',
        coords=(36.345522, 43.123439, 'Q25450071', 'site'), location='Mahallat Bab al-Masjid, West Mosul',
        parent=OLD_MOSUL, destroyed='Ruined (30 December 2014)'),
    rec('al-basha-mosque', 'Al-Basha Mosque', 'Mosque',
        'A Jalili mosque in Bab al-Saray begun by Hussein Pasha al-Jalili and completed in 1755/56 by his son, with '
        'a madrasa and family tombs.',
        [wp('Al-Basha Mosque'), tl('Authenticity'), wd('Q12204202')],
        alt=['Pasha Mosque', 'al-Khabazin Mosque', 'جامع الباشا'], period='Ottoman (Jalili)', year=1756,
        coords=(36.343278, 43.136056, 'Q12204202', 'site'), location='Bab al-Saray', parent=OLD_MOSUL),
    rec('aghawat-mosque', 'Aghawat Mosque', 'Mosque',
        'A mosque by the gate of the old bridge in Bab al-Saray, next to Khan al-Gumruk.',
        [wd('Q25450633'), src('University of Mosul — Khan al-Gumruk', 'https://uomosul.edu.iq/en/?p=761', level='search-snippet')],
        alt=['جامع الأغوات'], coords=(36.3446, 43.1366, 'Q25450633', 'site'), location='Bab al-Saray', parent=OLD_MOSUL,
        notes='Date not established.'),
    destroyed_mosul('qadib-al-ban-mosque', 'Mosque and Tomb of Shaykh Qadib al-Ban', 'Mosque', 'Bab Sinjar, West Mosul',
                    'Ruined (26 July 2014)', [mom('Mosque and Tomb of Shaykh Qadib al-Ban')], period='Ottoman (Atabeg origin)'),
    destroyed_mosul('ibn-al-athir-tomb', 'Tomb of Ibn al-Athir (Qabr al-Bint)', 'Mausoleum', 'Ibn al-Athir Street, West Mosul',
                    'Razed (16 June 2014)', [mom('Tomb of Ibn al-Athir')], period='Modern (rebuilt 1938)',
                    alt=['Qabr al-Bint'],
                    extra='The tomb of the historian Izz al-Din ibn al-Athir (d. 1233) was first documented as rebuilt in 1888–89 and was rebuilt to a new design in 1938.'),
    destroyed_mosul('imam-ibrahim-mosque', 'Mosque and Shrine of Imam Ibrahim', 'Shrine', 'Ra’s al-Kur, West Mosul',
                    'listed as destroyed', [mom('Mosque and Shrine of Imam Ibrahim')], period='Atabeg'),
    destroyed_mosul('abu-al-ala-mosque', 'Mosque of Shaykh Abu al-Ala', 'Mosque', 'Mahallat al-Shaykh Abu al-Ala, West Mosul',
                    'Ruined (24 July 2014)', [mom('Mosque of Shaykh Abu al-Ala')], period='Ottoman'),
    destroyed_mosul('nabi-daniyal-mosque', 'Mosque and Tomb of Nabi Daniyal', 'Mosque', 'Mahallat Jamshid, West Mosul',
                    'Ruined (23 July 2014)', [mom('Mosque and Tomb of Nabi Daniyal')], period='Ottoman (19th century)',
                    alt=['Prophet Daniel Mosque']),
    destroyed_mosul('muhammad-al-afghani-takiya', 'Takiya and Tomb of Muhammad al-Afghani', 'Shrine', 'al-Midan, West Mosul',
                    'Ruined (reported 2 September 2014)', [mom('Takiya and Tomb of Muhammad al-Afghani')], period='Ottoman',
                    alt=['Shaykh al-Shatt']),
    destroyed_mosul('ali-al-asghar-shrine', 'Shrine of Imam Ali al-Asghar', 'Shrine', 'north-west of the al-Nuri Mosque',
                    'Razed (24 July 2014)', [mom('Shrine of Imam Ali al-Asghar')], period='Ilkhanid (origin unknown)'),
    destroyed_mosul('abd-al-rahman-shrine', 'Shrine of Imam Abd al-Rahman (Madrasa al-Izziya)', 'Shrine', 'al-Tawalib quarter, West Mosul',
                    'Ruined (2 September 2014)', [mom('Shrine of Imam Abd al-Rahman – Madrasa al-Izziya')], period='Atabeg',
                    alt=['Madrasa al-Izziya']),
    destroyed_mosul('ali-al-hadi-shrine', 'Shrine of Imam Ali al-Hadi', 'Shrine', 'West Mosul',
                    'listed as destroyed', [mom('Shrine of Imam Ali al-Hadi')],
                    extra='The sarcophagus inscription names a son or descendant of the tenth Imam Ali al-Hadi; its decoration links it to the late 13th century.'),
    destroyed_mosul('imam-muhsin-mosque', 'Mosque and Shrine of Imam Muhsin (Madrasa al-Nuriya)', 'Shrine', 'Mahallat al-Shifa’, West Mosul',
                    'listed as destroyed', [mom('Mosque and Shrine of Imam Muhsin – Madrasa al-Nuriya')], period='Atabeg',
                    alt=['Madrasa al-Nuriya']),
    destroyed_mosul('isa-dadah-mosque', 'Mosque and Tomb of Isa Dadah', 'Mosque', 'al-Midan, West Mosul',
                    'Ruined (reported 2 September 2014)', [mom('Mosque and Tomb of Isa Dadah and adjacent cemetery')], period='Zengid'),
    destroyed_mosul('al-ridwani-mosque', 'Mosque and Madrasa of al-Ridwani', 'Mosque', 'West Mosul',
                    'listed as destroyed', [mom('Mosque and Madrasa of al-Ridwani')]),
    destroyed_mosul('sitt-nafisa-shrine', 'Hammam al-Saray Mosque and Shrine of al-Sitt Nafisa', 'Shrine', 'Mahallat al-Nabi Jirjis, 160 m east of the al-Nuri Mosque',
                    'Ruined (9 March 2015)', [mom('Hammam al-Saray Mosque and Shrine of al-Sitt Nafisa')],
                    period='Atabeg? (shrine); later rebuildings', alt=['Hammam al-Saray Mosque']),
    destroyed_mosul('al-abariqi-mosque', 'Mosque and Tomb of Shaykh Muhammad al-Abariqi', 'Mosque', 'Bab al-Jadid, West Mosul',
                    'Ruined', [mom('Mosque and Tomb of Shaykh Muhammad al-Abariqi')], period='Ottoman'),
    destroyed_mosul('al-abbas-mosque', 'Mosque and Shrine of al-Abbas', 'Shrine', 'West Mosul',
                    'listed as destroyed', [mom('Mosque and Shrine of al-Abbas')],
                    extra='Its first attested rebuilding, in 1586–87, involved the shrine of Imam al-Abbas; it was rebuilt again in 1876–77 and 1927–28.'),
    destroyed_mosul('zayd-ibn-ali-mosque', 'Mosque and Tomb of Imam Zayd ibn Ali', 'Mosque', 'Mahallat Bab al-Bayd, West Mosul',
                    'listed as destroyed', [mom('Mosque and Tomb of Imam Zayd ibn Ali')]),
    destroyed_mosul('umm-al-tisa-mosque', 'Mosque and Tomb of Umm al-Tis‘a and Cemetery', 'Mosque', 'old city',
                    'cemetery listed as destroyed', [mom('Cemetery adjacent to the Mosque and Tomb of Umm al-Tis‘a'), tl('Authenticity')],
                    alt=['Umm al-Tisa Mosque']),
    destroyed_mosul('abdal-mosque-madrasa', 'Shaykh Abdal Mosque and Madrasa', 'Mosque', 'Suq Bab al-Saray',
                    'madrasa razed between March and August 2015', [mom('Madrasa of the Abdal Mosque'), tl('Authenticity')],
                    period='Ottoman', year=1669,
                    extra='The madrasa was built within the mosque complex in 1669–70 by al-Hajj Abdal ibn Mustafa al-Mawsili and restored twice in the 18th century.'),
    destroyed_mosul('shaykh-mansur-tomb', 'Tomb of Shaykh Mansur', 'Mausoleum', 'Bab Sinjar, at the foot of Tell al-Kunasa',
                    'Ruined (between December 2014 and March 2015)', [mom('Tomb of Shaykh Mansur')]),
    destroyed_mosul('abu-al-hawawin-tomb', 'Tomb of Abu al-Hawawin (Shaykh Amir)', 'Mausoleum', 'Mahallat al-Mushahada, West Mosul',
                    'Ruined (before 21 August 2014)', [mom('Tomb of Abu al-Hawawin / Shaykh Amir')], alt=['Shaykh Amir Tomb'],
                    extra='Local tradition linked it to Shaykh Amir, regarded as a Companion and banner-bearer of the Prophet, and it played a role in popular veterinary medicine.'),
    destroyed_mosul('awlad-al-hasan-mosque', 'Mosque and Shrine of Awlad al-Hasan (Bayt Shahidu)', 'Shrine', 'Suq al-Sagha, Hosh al-Khan',
                    'Razed (before 22 December 2014)', [mom('Mosque and Shrine of Awlad (or Banat) al-Hasan')],
                    alt=['Banat al-Hasan', 'Bayt Shahidu Mosque'], period='Ottoman', year=1820,
                    extra='The present complex was built by al-Hajj Ahmad ibn Shahidu in 1820–21 on the site of an older shrine and was rebuilt in 1985.'),
    destroyed_mosul('imam-muhammad-mosque', 'Mosque of Imam Muhammad (al-Sab‘awi)', 'Mosque', 'Ra’s al-Kur, West Mosul',
                    'Ruined (between December 2014 and March 2015)', [mom('Mosque of Imam Muhammad / Mosque of al-Sabawi')],
                    alt=['al-Sabawi Mosque'], period='Ottoman',
                    extra='It was identified with Muhammad ibn al-Hanafiya and rebuilt in 1868–69 by Shaykh Ahmad, son of the Sufi Shaykh Muhammad al-Sab‘awi.'),
    destroyed_mosul('rashid-lolan-tomb', 'Tomb of Shaykh Rashid Lolan', 'Mausoleum', 'Tell Nabi Yunus, East Mosul',
                    'Ruined (24 July 2014)', [mom('Tomb of Shaykh Rashid Lolan')], period='20th century', parent=NINEVEH,
                    extra='Rashid Lolan (1882–1964) was a Naqshbandi Sufi shaykh and political leader of the Baradost Kurds.'),
    destroyed_mosul('hamid-and-mahmud-shrine', 'Shrine of Imams Hamid and Mahmud', 'Shrine', 'Mahallat al-Mahmudayn, West Mosul',
                    'Razed (between August and December 2014)', [mom('Shrine of Imams Hamid and Mahmud')]),
    destroyed_mosul('hammam-al-umariya', 'Hammam al-Umariya', 'Historic Bath', 'near Bab al-Jadid, West Mosul',
                    'listed as destroyed', [mom('Hammam al-Umariya')], period='Ottoman'),
    destroyed_mosul('shaykh-ibrahim-tomb', 'Tomb of Shaykh Ibrahim', 'Mausoleum', 'West Mosul',
                    'listed as destroyed', [mom('Tomb of Shaykh Ibrahim')]),
    destroyed_mosul('mahmud-al-khidri-mosque', 'Mosque of Mahmud al-Khidri', 'Mosque', 'Mahallat al-Midan, West Mosul',
                    'Ruined (between December 2014 and August 2015)', [mom('Mosque of Mahmud ibn Abd al-Jalil al-Khidri')], period='Ottoman',
                    extra='It is identified with Mahmud ibn Abd al-Jalil al-Khidri (1769–1836), a shaykh of the Qadiriyya order.'),
    destroyed_mosul('shatt-al-jumi-mosque', 'Shatt al-Jumi Mosque and Tomb of Shaykh Ibrahim al-Naqshbandi', 'Mosque', 'West Mosul',
                    'Razed (between December 2014 and August 2015)', [mom('Shatt al-Jumi Mosque – Tomb of Shaykh Ibrahim al-Naqshbandi')],
                    extra='The small mosque was the takiya of the Naqshbandi shaykh Ibrahim ibn Hasan al-Husayni, buried in its basement in 1921–22.'),
    destroyed_mosul('al-kharrazi-tomb', 'Mosque and Tomb of al-Kharrazi', 'Mausoleum', 'Mosul',
                    'listed as destroyed', [mom('Mosque and Tomb of al-Kharrazi')],
                    extra='The mausoleum was dedicated to the 9th-century Sufi Ahmad ibn Isa al-Kharrazi, whose identity is debated; it was rebuilt before 1966 and again before 2006.'),
    destroyed_mosul('saray-police-station', 'Al-Saray Police Station (Madrasat al-Sana’i‘)', 'Historic Building', 'Suq Bab al-Saray',
                    'listed as destroyed', [mom('Al-Saray Police Station / Madrasat al-Sanai')], alt=['Madrasat al-Sanai']),
    rec('al-juwayjati-mosque', 'Al-Juwayjati Mosque', 'Mosque', 'A historic mosque of Old Mosul cited in the UNESCO Tentative List dossier.',
        [tl('Authenticity')], parent=OLD_MOSUL, location='Old Mosul'),
    rec('al-umariyya-mosque', 'Al-Umariyya Mosque', 'Mosque', 'A historic mosque of Old Mosul cited in the UNESCO Tentative List dossier.',
        [tl('Authenticity')], parent=OLD_MOSUL, location='Old Mosul'),
    rec('umar-al-aswad-mosque', 'Umar al-Aswad Mosque', 'Mosque', 'A historic mosque of Old Mosul cited in the UNESCO Tentative List dossier.',
        [tl('Authenticity')], parent=OLD_MOSUL, location='Old Mosul'),
    rec('al-umawi-mosque', 'Umayyad Mosque of Mosul', 'Mosque',
        'The site of Mosul’s first congregational mosque (al-Jami‘ al-Umawi), cited in the UNESCO Tentative List '
        'dossier for the Old City.',
        [tl('Authenticity')], alt=['al-Jami al-Umawi', 'Masfi Mosque', 'الجامع الأموي'], parent=OLD_MOSUL, location='Old Mosul, Bab al-Saray',
        notes='Early Islamic foundation linked to al-Masfi; surviving fabric and minaret date need a dedicated source.'),
    rec('dawsat-ali-mosque', 'Dawsat Ali Mosque', 'Mosque', 'A historic mosque of Old Mosul cited in the UNESCO Tentative List dossier.',
        [tl('Authenticity')], parent=OLD_MOSUL, location='Old Mosul'),
    rec('al-khuzam-mosque', 'Al-Khuzam Mosque', 'Mosque', 'A historic mosque of Old Mosul cited in the UNESCO Tentative List dossier.',
        [tl('Authenticity')], parent=OLD_MOSUL, location='Old Mosul'),

    # ── Mosul: fortifications, markets, houses and civic buildings ──────────────────────────
    rec('bash-tapia-castle', 'Bash Tapia Castle', 'Castle',
        'A 12th-century castle on the west bank of the Tigris, one of seven in Mosul’s city wall. Damaged by Timur '
        'in 1393 and rebuilt under the Ottomans, it held out in Nader Shah’s siege of 1743; Islamic State partly '
        'destroyed it in April 2015.',
        [wp('Bash Tapia Castle'), tl('Justification'), wd('Q19968534')],
        alt=['Bashtabiya', 'Pashtabia', 'باشطابيا'], period='Atabeg; Ottoman', year='12th century',
        coords=(36.3554, 43.1216, 'Q19968534', 'site'), location='Tigris bank, north of the old city', parent=OLD_MOSUL,
        destroyed='Partly destroyed (April 2015)'),
    rec('bab-al-sir', 'Bab al-Sir', 'Gate', 'One of the two main fortified gates of Old Mosul named in the UNESCO dossier, associated with Bash Tapia.',
        [tl('Justification')], parent=OLD_MOSUL, location='Old Mosul', notes='Survival and exact position need review.'),
    rec('bab-al-qala', 'Bab al-Qal‘a', 'Gate', 'One of the two main fortified gates of Old Mosul named in the UNESCO dossier.',
        [tl('Justification')], alt=['Bab al-Qala'], parent=OLD_MOSUL, location='Old Mosul', notes='Survival and exact position need review.'),
    rec('qara-saray', 'Qara Saray', 'Palace',
        'The ruined “Black Palace” on the Tigris, cited in the UNESCO dossier for the authenticity of Old Mosul.',
        [tl('Authenticity')], alt=['Qara Serai', 'Black Palace', 'قره سراي'], parent=OLD_MOSUL, location='Tigris bank, Old Mosul'),
    rec('souq-bab-al-saray', 'Souq Bab al-Saray', 'Historic Market',
        'The heritage market on the Tigris, the central marketplace of the Jalili era, with sections for '
        'coppersmiths, blacksmiths, cloth merchants and spice sellers. Damaged in 2017, it has largely been rebuilt.',
        [wp('Souq Bab al-Saray'), src('Mosul Heritage — Souq Bab al-Saray', 'https://mosul-heritage.com/souq-bab-al-saray-1', level='search-snippet'),
         wd('Q131580117')],
        alt=['Bab al-Saray Market', 'سوق باب السراي'], coords=(36.34298, 43.13546, 'Q131580117', 'site'),
        location='Bab al-Saray', parent=OLD_MOSUL),
    rec('khan-al-gumruk', 'Khan al-Gumruk', 'Caravanserai',
        'A Jalili caravanserai of about 1703 in Bab al-Saray, endowed by three sons of Abdul-Jalil for their mosque '
        'and described as one of the few Mosul sites to survive in its original form.',
        [wp('Khan al-Gumruk'), src('Mosul Heritage — Khan al-Gumriq', 'https://mosul-heritage.com/khan-al-gumriq', level='search-snippet'),
         wd('Q110781171')],
        alt=['Khan al-Gumruk al-Akbar', 'Khan al-Gumriq', 'خان الكمرك'], period='Ottoman (Jalili)', year=1703,
        coords=(36.344769, 43.136266, 'Q110781171', 'site'), location='Bab al-Saray', parent=OLD_MOSUL),
    rec('beit-al-tutunji', 'Beit al-Tutunji', 'Historic House',
        'An early 19th-century Ottoman courtyard house with walls carved in local marble. Islamic State used it as an '
        'artillery position, and it was destroyed by airstrikes in 2017; restoration followed.',
        [wp('Beit al-Tutunji'), wd('Q109637949')],
        alt=['بيت التوتونجي'], period='Ottoman', year='early 19th century', coords=(36.3416, 43.1308, 'Q109637949', 'site'),
        location='Old Mosul', parent=OLD_MOSUL),
    rec('ahmadeya-synagogue', 'Ahmadeya Synagogue', 'Synagogue',
        'A synagogue of Mosul’s former Jewish community, documented by the Mosul Heritage project.',
        [src('Mosul Heritage — Historic buildings', 'https://mosul-heritage.com/historic-buildings')],
        alt=['Synagogue of the Ahmadiyya quarter'], location='Old Mosul', parent=OLD_MOSUL, notes='Date and condition not established.'),
    rec('barood-khana', 'Barood Khana', 'Historic Building',
        'A former Ottoman military headquarters and armoury in Mosul, part of the University of Pennsylvania heritage '
        'programme.',
        [src('Penn Today — Penn team expands cultural heritage work in Iraq',
             'https://penntoday.upenn.edu/news/penn-team-expands-cultural-heritage-work-iraq-backed-new-funding', C1, locator='Baroud Khana section')],
        alt=['Baroud Khana'], period='Ottoman', location='Mosul'),
    rec('mosul-museum', 'Mosul Museum', 'Museum',
        'Iraq’s second-largest museum, founded in 1952 with a new building opened in 1972, focused on Assyrian and '
        'Hellenistic finds. It was looted in 2003, and Islamic State smashed statues in its galleries in 2015.',
        [wp('Mosul Museum'), wd('Q387292')],
        alt=['متحف الموصل'], period='20th century', year=1952, coords=(36.337859, 43.139405, 'Q387292', 'site'), location='Mosul'),
    rec('english-war-cemetery-mosul', 'Mosul War Cemetery', 'Cemetery',
        'A cemetery founded in 1918 with more than 349 graves of Commonwealth and Turkish soldiers of both world '
        'wars and consular burials. It was levelled in spring 2015.',
        [mom('English War Cemetery'), wd('Q70869546')],
        alt=['English War Cemetery'], period='20th century', year=1918, coords=(36.34096, 43.11159, 'Q70869546', 'site'),
        location='al-Uruba quarter, West Mosul', destroyed='Levelled (spring 2015)'),

    # ── Mosul: churches and monasteries ─────────────────────────────────────────────────
    rec('al-tahira-kharijiya', 'Al-Tahira Syriac Orthodox Church (al-Tahira al-Kharijiya)', 'Church',
        'A church of unknown origin rebuilt in 1744–45 by the Jalili family after Nader Shah’s siege of 1743, '
        'a famous place of devotion and festivals in the al-Shifa’ quarter.',
        [mom('Al-Tahira Syriac Orthodox Church')], alt=['Outer Tahira', 'الطاهرة الخارجية'], period='Ottoman', year=1744,
        location='al-Shifa’ quarter, north-west Old Mosul', parent=OLD_MOSUL, destroyed='Ruined (2 February 2015)'),
    rec('al-tahira-syriac-catholic-mosul', 'Al-Tahira Syriac Catholic Church (old), Mosul', 'Church',
        'First mentioned in 1672 and largely rebuilt in 1744 under an Ottoman firman; a newer church of 1859–62 '
        'stands beside it. Partly demolished by Islamic State; UNESCO led its reconstruction.',
        [mh('leglise-syriaque-catholique-al-tahira-lancienne-de-mossoul', 'The al-Tahira Syriac-Catholic church in Mosul'),
         wp('Al-Tahera Church, Mosul'), wd('Q98608783')],
        alt=['Inner Tahira', 'Tahira of the Syrians', 'كنيسة الطاهرة القلعة'], period='Ottoman', year=1744,
        coords=mh_coords(36.344556, 43.132639, 'al-tahira-syriac-catholic'), location='Old Mosul', parent=OLD_MOSUL),
    rec('al-tahira-chaldean-mosul', 'Al-Tahira Chaldean Church, Mosul', 'Church',
        'One of six Mosul churches named al-Tahira; its lower part dates from the 18th century and upper floors '
        'were added around 2000.',
        [mh('leglise-chaldeenne-al-tahira-de-mossoul', 'The Al-Tāhirā Chaldean church in Mosul'), wd('Q98640603')],
        alt=['Al-Tahera Chaldean Cathedral'], period='Ottoman', year='18th century',
        coords=mh_coords(36.353525, 43.123414, 'al-tahira-chaldean'), location='Mosul'),
    rec('mar-touma-syriac-orthodox', 'Mar Touma Syriac Orthodox Church, Mosul', 'Church',
        'Said to stand where Saint Thomas lodged; first mentioned in 770, with a five-nave fabric probably of the '
        '13th century, renovated in 1744 and 1848.',
        [mh('leglise-syriaque-orthodoxe-mar-touma-de-mossoul', 'The Mar Touma Syriac-Orthodox church in Mosul'),
         wp('Church of Saint Thomas, Mosul'), wd('Q7663190')],
        alt=['Church of Saint Thomas', 'كاتدرائية مار توما'], period='Abbasid to Ottoman', year='13th century',
        coords=mh_coords(36.340833, 43.125417, 'mar-touma-syriac-orthodox'), location='Old Mosul', parent=OLD_MOSUL),
    rec('mar-touma-syriac-catholic', 'Mar Touma Syriac Catholic Church, Mosul', 'Church',
        'A church built in three years and consecrated on 25 March 1863, later home of the priests of Christ the '
        'King and the review La Pensée Chrétienne.',
        [mh('leglise-syriaque-catholique-mar-touma-de-mossoul', 'The Mar Touma Syriac-Catholic Church in Mosul')],
        period='Ottoman', year=1863, coords=mh_coords(36.341308, 43.125289, 'mar-touma-syriac-catholic'), location='Old Mosul', parent=OLD_MOSUL),
    rec('shamun-al-safa-church', 'Shamun al-Safa Chaldean Church', 'Church',
        'A church dedicated to Simon Peter, probably founded around the 9th century and lying about 5 m below '
        'street level. It later housed a Chaldean printing press and seminary and has fallen into ruin.',
        [mh('leglise-chaldeenne-shamun-al-safa-de-mossoul', 'The Chaldean Sham’ûn Al-Safâ church in Mosul'),
         wp('List of churches and monasteries in Nineveh'), wd('Q98835837')],
        alt=['Church of St Peter', 'كنيسة شمعون الصفا'], period='Abbasid (founded)', year='9th century',
        coords=mh_coords(36.338017, 43.125994, 'shamun-al-safa'), location='Old Mosul', parent=OLD_MOSUL),
    rec('mart-meskinta-church', 'Mart Meskinta Chaldean Church', 'Church',
        'Attested in a Gospel book of 1199 or 1212 and rebuilt in 1851 by Patriarch Joseph VI Audo; the only Iraqi '
        'church named after the martyr Meskinta. Damaged in 2008 and in 2014–17.',
        [mh('leglise-chaldeenne-mart-meskinta-de-mossoul', 'The Mart Meskinta Chaldean church in Mosul'),
         wp('Mart Meskinta Chaldean Church'), wd('Q98640602')],
        alt=['Mart Meskanta', 'كنيسة مسكنتة'], period='Medieval; Ottoman', year=1851,
        coords=mh_coords(36.338586, 43.125639, 'mart-meskinta'), location='Old Mosul', parent=OLD_MOSUL),
    rec('mar-ichaya-church', 'Mar Ichaya Chaldean Church', 'Church',
        'Founded in 570 by the monk Ishoyab bar Qusre as a Church of the East monastery, later an episcopal seat; '
        'three chapels were added over time.',
        [mh('leglise-chaldeenne-mar-ichaya-de-mossoul', 'The Chaldean church Mar Ichaya in Mosul')],
        alt=['Mar Ishaya', 'مار اشعيا'], period='Late Antique (founded)', year=570,
        coords=mh_coords(36.347833, 43.131269, 'mar-ichaya'), location='Mosul', parent=OLD_MOSUL),
    rec('mar-gorgis-chaldean-mosul', 'Mar Gorgis Chaldean Church, Mosul', 'Church',
        'The oldest trace of this church is a gravestone of 1023. The ancient church, planned by Ernst Herzfeld in '
        '1908, almost vanished under a modern church of 1931.',
        [mh('leglise-chaldeenne-mar-guorguis-de-mossoul-pour-memoire', 'The Mar Gorgis Chaldean church in Mosul (reminder)')],
        alt=['Mar Guorguis'], period='Medieval', year=1023, coords=mh_coords(36.340633, 43.125269, 'mar-gorgis-mosul'),
        location='Mosul', parent=OLD_MOSUL),
    rec('mar-gorgis-monastery-mosul', 'Monastery of Mar Gorgis, Mosul', 'Monastery',
        'A Chaldean monastery in the Arabi district of north Mosul, about 6 m below street level, with a marble door '
        'frame and niches of the 13th–14th centuries. It was wrecked by Islamic State and is being rebuilt.',
        [wp('List of churches and monasteries in Nineveh'),
         src('Exaudi — Church of Monastery of Mar Korkis to reopen', 'https://exaudi.org/church-of-monastery-of-mar-korkis-to-reopen', level='search-snippet')],
        alt=['St George’s Monastery', 'Deir Mar Gewargis', 'Mar Korkis'], location='Arabi district, north Mosul'),
    rec('mar-petion-church', 'Mar Petion Church', 'Church',
        'A Chaldean church older than the 10th century, about 3 m below street level and rebuilt many times; a hall '
        'of 1942 removed most of its decoration.',
        [wp('List of churches and monasteries in Nineveh')], alt=['Mar Petiun'], period='Abbasid (founded)', location='Mosul', parent=OLD_MOSUL),
    rec('mar-ahudeni-church', 'Mar Ahudeni Church', 'Church',
        'A 10th-century church about 7 m below street level, associated with the Tikritan community and first '
        'reconstructed in 1970.',
        [wp('List of churches and monasteries in Nineveh')], alt=['Mar Ahodemmeh'], period='Abbasid', year='10th century',
        location='Mosul', parent=OLD_MOSUL),
    rec('dair-mar-elia', 'Monastery of Saint Elijah (Dair Mar Elia)', 'Monastery',
        'One of Iraq’s oldest monasteries, founded around 595 by the monk Mar Elia. Its monks were massacred in 1743; '
        'the ruins were damaged in 2003 and destroyed by Islamic State in 2014.',
        [wp('Monastery of Saint Elijah'), wd('Q4120608')],
        alt=['Dair Mar Elia', 'دير مار إيليا'], period='Late Antique', year=595, coords=(36.2924, 43.131, 'Q4120608', 'site'),
        location='South of Mosul', destroyed='Destroyed (2014)'),

    # ── Nineveh Plain: monasteries ─────────────────────────────────────────────────────
    rec('mar-mattai-monastery', 'Mar Mattai Monastery', 'Monastery',
        'A Syriac Orthodox monastery founded in 363 on Mount Alfaf (Maqlub), 20 km north-east of Mosul, one of the '
        'oldest Christian monasteries still in use and famous for its library of Syriac manuscripts.',
        [wp('Mor Mattai Monastery'), mh('le-couvent-de-mar-matta', 'Mar Mattai Monastery'), wd('Q2062054')],
        alt=['Dayro d-Mor Mattai', 'Deir Mar Matta', 'دير مار متى'], period='Late Antique', year=363,
        coords=(36.49, 43.442778, 'Q2062054', 'site'), location='Mount Alfaf (Maqlub)'),
    rec('rabban-hormizd-monastery', 'Rabban Hormizd Monastery', 'Monastery',
        'A monastery carved into the mountain above Alqosh around 640. It was the residence of Church of the East '
        'patriarchs from 1551 into the 18th century and later a Chaldean monastery.',
        [wp('Rabban Hormizd Monastery'), mh('le-monastere-de-rabban-hormizd', 'Rabban Hormizd Monastery'), wd('Q1475704')],
        alt=['دير الربان هرمزد'], period='Late Antique', year=640,
        coords=mh_coords(36.749028, 43.114992, 'rabban-hormizd'), location='Above Alqosh'),
    rec('our-lady-of-the-seeds', 'Monastery of Our Lady of the Seeds', 'Monastery',
        'Completed in 1858 for Patriarch Joseph VI Audo to move the monks of Rabban Hormizd to a safer site, and a '
        'flagship of Chaldean identity.',
        [mh('le-monastere-notre-dame-des-moissons', 'Monastery our Lady of the Seeds')],
        alt=['Notre-Dame des Semences', 'Dayra d-Notre Dame'], period='Ottoman', year=1858,
        coords=mh_coords(36.732444, 43.111194, 'our-lady-of-the-seeds'), location='Alqosh'),
    rec('mar-behnam-monastery', 'Monastery of Mar Behnam and Mart Sarah', 'Monastery',
        'A monastery near Khidr Ilyas built around the pit where Behnam and his sister Sarah were martyred in the '
        '4th century, known for its high reliefs of Mar Behnam on horseback. Islamic State damaged the tomb in 2015; '
        'it was restored by 2018 and the reliefs were rehabilitated in 2025–26.',
        [wp('Mar Behnam Monastery'), mh('mar-behnam-sarahs-convent', 'Mar Behnām and Sārah’s convent'),
         mh('renaissance-des-grands-bas-reliefs-de-mar-behnam-et-de-mart-sarah', 'Renaissance of the great bas-reliefs'), wd('Q934579')],
        alt=['Deir al-Jubb', 'دير مار بهنام'], period='Late Antique (tradition); 12th–13th-century buildings',
        coords=mh_coords(36.138311, 43.405725, 'mar-behnam-convent'), location='Khidr Ilyas, al-Hamdaniya'),
    rec('mar-oraha-monastery', 'Mar Oraha Monastery', 'Monastery',
        'A monastery near Batnaya founded by Mar Oraha in 581–596, destroyed with its monks by Nader Shah in 1743 and '
        'rebuilt in 1921.',
        [wp('Mar Oraha Monastery'), wd('Q4117297')],
        alt=['Saint Abraham Monastery', 'دير مار أوراها'], period='Late Antique', year='6th century',
        coords=(36.544722, 43.145556, 'Q4117297', 'site'), location='Near Batnaya'),
    rec('dailam-monastery', 'Monastery of Saint John of Dailam (Naqortaya)', 'Monastery',
        'A Syriac Orthodox monastery 3 km north of Qaraqosh, attested from the 9th century and consecrated in 1115.',
        [wp('Monastery of Saint John of Dailam'), wd('Q6898335')],
        alt=['Naqortaya', 'Muqurtaya', 'دير ناقورتايا', 'Mar Yohanna al-Daylami'], period='Abbasid', year='9th century',
        coords=(36.299722, 43.373333, 'Q6898335', 'site'), location='North of Qaraqosh'),
    rec('mart-barbara-karamles', 'Mart Barbara Monastery, Karamles', 'Monastery',
        'A monastery dedicated to Saint Barbara at the entrance of Karamles, built on the side of an archaeological '
        'tell. Karamles was wholly Christian in the 14th century.',
        [mh('le-couvent-sainte-barbe-mart-barabara-de-karamlesse', 'Mart Barbara Monastery in Karamles')],
        alt=['Saint Barbara Monastery', 'Mart Barbara'], coords=mh_coords(36.305822, 43.410225, 'mart-barbara'),
        location='Karamles'),
    rec('tomb-of-nahum', 'Tomb of the Prophet Nahum, Alqosh', 'Synagogue',
        'A synagogue in Alqosh with the tomb of the prophet Nahum, the tomb of his sister Sara in the courtyard, a '
        'school and a storeroom. The fragile building has been under restoration.',
        [mh('la-tombe-du-prophete-nahoum', 'The Tomb of Prophet Nahum'), wd('Q110294532')],
        alt=['Nahum’s Tomb', 'Sara Mausoleum', 'قبر النبي ناحوم'], coords=mh_coords(36.738333, 43.096139, 'tomb-of-nahum'), location='Alqosh'),

    # ── Nineveh Plain: churches (Mesopotamia Heritage inventory, exact positions) ─────────────
    rec('al-tahira-qaraqosh', 'St Mary al-Tahira Church, Qaraqosh', 'Church',
        'The most iconic building of Baghdede, with an “ancient” church supposed to be of the 13th century and the '
        'great new al-Tahira of the early 20th century. Islamic State used it as a firing range in 2014–16.',
        [mh('leglise-al-taheera-de-qaraqosh', 'St Mary Al-Tahira church in Baghdede (Qaraqosh)'), wd('Q12236331')],
        alt=['Al-Tahira al-Kubra', 'Baghdede', 'Bakhdida', 'كنيسة الطاهرة الكبرى'], period='Medieval; 20th century',
        coords=mh_coords(36.270483, 43.377117, 'al-tahira-qaraqosh'), location='Qaraqosh (Baghdede)'),
    rec('mar-yacoub-qaraqosh', 'Mar Yacoub al-Muqataa Church, Qaraqosh', 'Church',
        'Attested in 1712, destroyed by Nader Shah in 1743 and rebuilt in 1744 by the governor of Mosul; the first '
        'church of Baghdede assigned to the Catholics.',
        [mh('leglise-de-saint-jacques-le-demembre-mar-yacoub-al-mouqatta-et-saint-andre-de-qaraqosh', 'Saint James the Mutilated Church')],
        alt=['Saint James the Mutilated'], period='Ottoman', year=1744,
        coords=mh_coords(36.270686, 43.379317, 'mar-yacoub-qaraqosh'), location='Qaraqosh (Baghdede)'),
    rec('mart-shmoni-qaraqosh', 'Mart Shmoni Church, Qaraqosh', 'Church',
        'A Syriac Orthodox church whose royal-gate lintel carries 12th-century reliefs of Mart Shmoni’s sons, the '
        'Maccabees, with Mongol-style faces and dress.',
        [mh('leglise-mart-schmouni-de-qaraqosh', 'Mart Shmoni Church in Baghdede (Qaraqosh)')],
        period='Medieval', year='12th century', coords=mh_coords(36.266233, 43.375325, 'mart-shmoni-qaraqosh'),
        location='Qaraqosh (Baghdede)'),
    rec('mar-sarkis-bakus-qaraqosh', 'Mar Sarkis and Bakus Church, Qaraqosh', 'Church',
        'Possibly the first church of Baghdede, confirmed in a late 16th-century manuscript and known for 15th–16th-'
        'century ceramic tiles. Islamic State sacked and burned it.',
        [mh('leglise-des-saints-serge-et-baccus-de-qaraqosh', 'Mar Sarkis and Bakus Church in Baghdede')],
        alt=['Saints Sergius and Bacchus'], period='Medieval', coords=mh_coords(36.267611, 43.375528, 'mar-sarkis-bakus'),
        location='Qaraqosh (Baghdede)'),
    rec('mar-gorgis-qaraqosh', 'Mar Gorgis Church, Qaraqosh', 'Church',
        'A Syriac Orthodox church mentioned in a prayer book of 1270, made of a small rock-cut ancient church and a '
        'massive modern one.',
        [mh('leglise-mar-guorguis-de-qaraqosh', 'Mar Gorgis Church in Baghdede (Qaraqosh)')],
        period='Medieval', year=1270, coords=mh_coords(36.265758, 43.378492, 'mar-gorgis-qaraqosh'), location='Qaraqosh (Baghdede)'),
    rec('mar-addai-karamles', 'Mar Addai Church, Karamles', 'Church',
        'A church of the early 1960s, probably on an older site, where relics attributed to Mar Addai were found in '
        '1881. Its martyrion holds the tomb of Fr Ragheed Ganni, killed in 2007.',
        [mh('eglise-chaldeenne-mar-addai-de-karamlesse', 'The Mar Addai church in Karemles')],
        alt=['Karemlash', 'Karemles'], period='20th century', coords=mh_coords(36.306017, 43.414789, 'mar-addai'), location='Karamles'),
    rec('mar-gorgis-bartella', 'Mar Gorgis Church, Bartella', 'Church',
        'A Syriac Catholic church: the ancient building was renovated in the mid-19th century and a new church built '
        'in 1934. Islamic State burned it; major repairs followed.',
        [mh('leglise-mar-guorguis-de-bartella', 'The Mar Gorgis church in Bartella')],
        period='Ottoman; 20th century', coords=mh_coords(36.351883, 43.3768, 'mar-gorgis-bartella'), location='Bartella'),
    rec('mart-mariam-bartella', 'Mart Mariam Church, Bartella', 'Church',
        'A Syriac Orthodox church built by the townspeople in the late 19th century from the stones of two churches '
        'ruined after the Mongol invasion.',
        [mh('leglise-mart-mariam-de-bartella', 'Mart Mariam Church in Bartella')],
        alt=['Mariam Azra'], period='Ottoman', coords=mh_coords(36.352661, 43.379647, 'mart-mariam-bartella'), location='Bartella'),
    rec('mart-shmoni-bartella', 'Mart Shmoni Church, Bartella', 'Church',
        'A Syriac Orthodox church, also called Bney Shmoni after the saint’s seven sons, profaned and partly burned '
        'in 2014–16.',
        [mh('leglise-mart-shmouni-de-bartella', 'Mart Shmouni Church in Bartella'), wd('Q98936348')],
        alt=['Bney Shmoni'], coords=mh_coords(36.351867, 43.382447, 'mart-shmoni-bartella'), location='Bartella'),
    rec('mart-shmoni-bashiqa', 'Mart Shmoni Church, Bashiqa', 'Church',
        'A three-nave Syriac Orthodox basilica rebuilt in 1890 with marble royal doors.',
        [mh('leglise-mart-schmouni-de-baashiqa', 'Mart Shmoni church in Baashiqa')],
        alt=['Baashiqa'], period='Ottoman', year=1890, coords=mh_coords(36.451133, 43.348353, 'mart-shmoni-bashiqa'), location='Bashiqa'),
    rec('mart-mariam-bashiqa', 'Mart Mariam al-Adra Church, Bashiqa', 'Church',
        'A Syriac Catholic church built in 1924–32 to replace a church of 1856; profaned during the 2014–16 occupation.',
        [mh('leglise-de-mart-mariam-al-adra-de-baashiqa', 'Mart Mariam al Adra Church in Baashiqa')],
        period='20th century', coords=mh_coords(36.451361, 43.348972, 'mart-mariam-bashiqa'), location='Bashiqa'),
    rec('mar-mikha-alqosh', 'Mar Mikha Church, Alqosh', 'Church',
        'One of the oldest churches of Alqosh, said to hold the relics of Mar Mikha, a disciple of Mar Awgin.',
        [mh('leglise-mar-miha-dalqosh', 'The Church of Mar Mikha in Alqosh')],
        coords=mh_coords(36.738389, 43.097417, 'mar-mikha-alqosh'), location='Alqosh'),
    rec('mar-gorgis-alqosh', 'Mar Gorgis Church, Alqosh', 'Church',
        'Considered the oldest church of Alqosh; restored in 1681 and rebuilt in 1906. Now a Chaldean cathedral.',
        [mh('leglise-mar-guorguis-dalqosh', 'Mar Gorgis Church in Alqosh'), wd('Q111804052')],
        alt=['Chaldean Cathedral of Saint George, Alqosh'], period='Ottoman', year=1906,
        coords=mh_coords(36.738056, 43.097222, 'mar-gorgis-alqosh'), location='Alqosh'),
    rec('mar-gorgis-baqofa', 'Mar Gorgis Church, Baqofa', 'Church',
        'A rustic stone church inside a walled cemetery court. Baqofa is recorded in the 7th century as helping to '
        'build the Rabban Hormizd monastery.',
        [mh('leglise-chaldeenne-mar-guorguis-de-baqofa', 'The Mar Gorgis Church in Baqofa')],
        coords=mh_coords(36.588889, 43.130667, 'mar-gorgis-baqofa'), location='Baqofa'),
    rec('mar-gorgis-tell-esqof', 'Mar Gorgis Church, Tell Esqof', 'Church',
        'The main church of Tell Esqof, attested in a lectionary of 1499; the old building seen in 1943 was already '
        'gone by 1955.',
        [mh('leglise-chaldeenne-mar-guorguis-de-tell-esqof', 'The Mar Gorgis Church in Tell Esqof')],
        alt=['Tesqopa', 'Tel Skuf'], coords=mh_coords(36.598556, 43.10475, 'mar-gorgis-tell-esqof'), location='Tell Esqof'),
    rec('mar-qouryakos-batnaya', 'Mar Qouryakos Church, Batnaya', 'Church',
        'Probably the oldest church of Batnaya, destroyed and rebuilt in 1944; the town was left in ruins by the '
        'fighting of 2014–16.',
        [mh('leglise-chaldeenne-mar-qouryakos-de-batnaya', 'The Mar Qouryakos Church in Batnaya')],
        coords=mh_coords(36.538564, 43.123478, 'mar-qouryakos-batnaya'), location='Batnaya'),

    # ── Yazidi heritage ────────────────────────────────────────────────────────────────
    rec('bozan-mausoleums', 'Yazidi Mausoleums of Bozan', 'Shrine',
        'Bozan, “Little Lalish”, has many mausoleums, oratories and sacred stones, mostly in its hill cemetery, which '
        'serves twelve villages; 70 caves show very early occupation. Several mausoleums date from the 12th century.',
        [mh('les-mausolees-yezidis-de-bozan', 'The Yazidi mausoleums in Bozan'), wp('Bozan, Iraq')],
        alt=['Lalişa Piçuk', 'Little Lalish', 'Beth Bozi'], coords=mh_coords(36.733222, 43.136972, 'bozan'), location='Bozan, Tel Keppe district'),
    rec('baba-noah-hatara', 'Yazidi Mausoleum of Baba Noah, Hatara', 'Shrine',
        'A Yazidi mausoleum in the village of Hatara near Alqosh, whose tell attests Assyrian-period occupation. Not '
        'to be confused with ancient Hatra.',
        [mh('le-mausolee-yezidi-de-babe-noe-a-hatara', 'The Yazidi Mausoleum of Baba Noah in Hatra')],
        alt=['Babe Noe', 'Hatara (Yazidi village)'], coords=mh_coords(36.664681, 43.0439, 'baba-noah'), location='Hatara village, Shekhan area'),
    rec('sheikh-bakeur-bahzani', 'Mausoleum of Sheikh Bakeur al-Qatani, Bahzani', 'Shrine',
        'A rebuilt mausoleum in Bahzani, the intellectual heart of Yazidism with neighbouring Bashiqa; Islamic State '
        'destroyed 22 mausoleums in the two towns in 2014–16.',
        [mh('le-mausolee-yezidi-de-cheikh-bakeur-al-qatani-a-bahzani', 'The Yazidi mausoleum Sheikh Bakeur al Qatani in Bahzani')],
        alt=['Sheikh Obaker', 'Şêxûbekir'], coords=mh_coords(36.466758, 43.328836, 'sheikh-bakeur'), location='Bahzani',
        destroyed='Destroyed 2014–16; rebuilt'),
    rec('melek-miran-bashiqa', 'Mausoleum of Melek Miran, Bashiqa', 'Shrine',
        'A Yazidi mausoleum in Bashiqa destroyed by Islamic State and restored and reopened in January 2018.',
        [mh('le-mausolee-yezidi-de-melek-miran-a-baashiqa', 'The Yazidi mausoleum of Melek Miran in Bashiqa'),
         wp('Bashiqa')],
        alt=['Malak Miran'], coords=mh_coords(36.457625, 43.346536, 'melek-miran'), location='Bashiqa',
        destroyed='Destroyed 2014–16; restored 2018'),
    rec('sheikh-suwar-beban', 'Mausoleum of Sheikh Suwar, Beban', 'Shrine',
        'The only Yazidi building with geometric patterns inside its dome and drum, dated by style to the 14th '
        'century; destroyed in 1893 and rebuilt.',
        [mh('le-mausolee-yezidi-de-cheikh-suwar-a-beban', 'Yazidi mausoleum Sheikh Suwar in Beban'), wp('Beban')],
        alt=['Shah Suwar', 'Bêban'], period='Medieval', year='14th century', coords=mh_coords(36.701617, 43.153767, 'sheikh-suwar'),
        location='Beban, near Alqosh'),
    rec('ezdin-mir-shexka', 'Ezdin Mîr Chamsani Mausoleum, Shexka', 'Shrine',
        'A Yazidi mausoleum in the cemetery of Shexka on a hilltop with views over the plain.',
        [mh('le-mausolee-yezidi-ezdin-mir-chamsani-de-shexka', 'The Ezdin Mîr Chamsani mausoleum in Shexka')],
        coords=mh_coords(36.768308, 43.448003, 'ezdin-mir'), location='Shexka, Shekhan district',
        admin='Shekhan district: administered by the Kurdistan Region from Duhok; de jure part of Nineveh Governorate.'),
    rec('mir-ali-beg-baadre', 'Mausoleum of Mîr Alî Beg, Baadre', 'Shrine',
        'The mausoleum of the Yazidi prince Mîr Alî Beg (late 19th–early 20th century) in the cemetery of Baadre.',
        [mh('le-mausolee-yezidi-mir-ali-beg-de-baadre', 'The Yazidi mausoleum Mîr Alî Beg in Ba’adrê')],
        period='20th century', coords=mh_coords(36.718056, 43.254167, 'mir-ali-beg'), location='Baadre',
        admin='Shekhan district: administered by the Kurdistan Region from Duhok; de jure part of Nineveh Governorate.'),
    rec('sultan-ezid-mahad', 'Sultan Ezid Mausoleum, Mahad', 'Shrine',
        'A square mausoleum under a large radiating conical dome, said by Yazidi masters to be about 1,000 years old '
        'and restored in 1990.',
        [mh('le-mausolee-yezidi-sultan-ezid-de-mahed', 'The Yazidi sultan ezid mausoleum in Mahad'), wp('Mahad, Iraq')],
        alt=['Siltan Êzîd', 'Mehetê'], coords=mh_coords(36.647036, 43.411589, 'sultan-ezid'), location='Mahad, Shekhan district',
        admin='Shekhan district: administered by the Kurdistan Region from Duhok; de jure part of Nineveh Governorate.'),
    rec('sharfadin-temple', 'Sharfadin Temple', 'Temple',
        'A Yazidi temple of pale yellow stone with two cones, dedicated to Sheikh Sherfedin and held among the '
        'holiest Yazidi places. In August 2014 a small band of defenders held it against Islamic State.',
        [wp('Sharfadin Temple'), wd('Q106345829')],
        alt=['Mezargeha Şerfedîn', 'Sherfedin', 'معبد شرف الدين'], coords=(36.429444, 41.868889, 'Q106345829', 'site'),
        location='Sinjar Mountains'),
    rec('mam-rashan-shrine', 'Mam Rashan Shrine', 'Shrine',
        'A 12th-century shrine on Mount Sinjar to Pîr Mehmed Reşan, figure of rain and harvest. Destroyed by Islamic '
        'State in 2014; rebuilt with WMF and ALIPH support from 2020 and back in worship since 2022.',
        [wp('Mam Rashan Shrine'),
         src('World Monuments Fund — Mam Rashan Shrine', 'https://wmf.org/monuments/mam-rashan-shrine', level='search-snippet'),
         wd('Q106008987')],
        alt=['Pir Mehmed Reşan', 'Mem Reşan'], period='Medieval', year='12th century', coords=(36.3569, 41.8866, 'Q106008987', 'site'),
        location='Mount Sinjar', destroyed='Destroyed 2014; rebuilt 2020–22'),
    rec('sheikh-mand-temple', 'Sheikh Mand Temple, Gedala', 'Temple',
        'A temple to the 12th-century Yazidi saint Sheikh Mand, whose emblem is a black snake, in Gedala village '
        'near Sinjar. Destroyed on 24 August 2014 and rebuilt from the ground by Nadia’s Initiative.',
        [src('Nadia’s Initiative — Sheikh Mand Temple', 'https://www.nadiasinitiative.org/news/nadias-initiative-rehabilitates-sheikh-mand-temple', level='search-snippet'),
         src('Iconem — Yazidi heritage', 'https://3d.iconem.com/partners/eamena/yazidi_heritage.html', level='search-snippet'),
         wp('Sheikh Mand')],
        alt=['Şêx Mend', 'Sheikh Mend'], location='Gedala, Sinjar', destroyed='Destroyed (24 August 2014); rebuilt'),
    rec('malak-sheikh-hassan-temple', 'Malak Sheikh Hassan Temple, Sinjar', 'Temple',
        'A Yazidi temple in Sinjar destroyed by Islamic State and rehabilitated and reopened by Nadia’s Initiative.',
        [src('Nadia’s Initiative — Sheikh Malack Hassan Temple', 'https://nadiasinitiative.org/news/nadias-initiative-rehabilitates-sheikh-malack-hassan-temple-in-sinjar', level='search-snippet')],
        alt=['Sheikh Hassan', 'Şêx Hesen'], location='Sinjar', destroyed='Destroyed 2015; rebuilt'),
    rec('sinjar-yazidi-mausoleums', 'Yazidi Mausoleums of Mount Sinjar', 'Shrine',
        'Yazidi belief holds that God set a mausoleum on each summit of the Sinjar range to keep it stable. Before '
        '2014 Sinjar had 28 shrines; several were blown up in 2014–15 and many have since been rebuilt.',
        [mh('les-mausolees-yezidis-de-sinjar', 'The Yazidi mausoleums of Sinjar'),
         src('Rudaw, 9 January 2021 — Destroyed Yazidi shrines in Shingal', 'https://www.rudaw.net/english/middleeast/iraq/09012021', level='search-snippet')],
        alt=['Şingal shrines', 'Chilmera'], coords=mh_coords(36.314217, 41.862442, 'sinjar-mausoleums', 'settlement'),
        location='Sinjar Mountains'),

    # ── Sinjar and Tal Afar: Islamic and urban heritage ─────────────────────────────────────
    rec('sinjar-old-city', 'Sinjar Historic Town (Singara)', 'Historic Town',
        'Sinjar was the Roman frontier fortress of Singara from the 2nd century until the Sasanians took it in 360; '
        'medieval monuments include the minaret of Sultan Qutb al-Din’s madrasa and the shrine of Sitt Zaynab.',
        [wp('Sinjar'), umdb('S4'), wd('Q955690')],
        alt=['Singara', 'Shingal', 'Şingal', 'Balad Sinjar', 'سنجار'], period='Roman to Islamic',
        coords=(36.320833, 41.876389, 'Q955690', 'settlement'), location='Sinjar'),
    rec('qutb-al-din-minaret-sinjar', 'Minaret of Sultan Qutb al-Din’s Madrasa, Sinjar', 'Minaret',
        'The minaret of the madrasa of the Zengid ruler Qutb al-Din in Sinjar, recorded by the University of Tokyo '
        'expedition.',
        [umdb('S4'), wd('Q138647658')], alt=['Sultan Kutb ad-Din'], period='Zengid',
        coords=(36.315723, 41.86631, 'Q138647658', 'site'), parent='site-nineveh-sinjar-old-city', location='Sinjar',
        notes='Wikidata item Q138647658 is an unlabelled madrasa at this position; identification to confirm.'),
    rec('sitt-zaynab-sinjar', 'Shrine of Sitt Zaynab, Sinjar', 'Shrine',
        'A medieval domed shrine in Sinjar recorded by the University of Tokyo expedition.',
        [umdb('S4')], alt=['Lady Zainab Shrine'], parent='site-nineveh-sinjar-old-city', location='Sinjar',
        notes='Current condition not established.'),
    rec('tal-afar-citadel', 'Tal Afar Citadel', 'Citadel',
        'An Ottoman citadel on an ancient mound with remains back to the Assyrian period. Islamic State used it as a '
        'prison and blew up its north and west walls in December 2014; it remains largely ruined.',
        [wp('Tal Afar Citadel'), src('ASOR Cultural Heritage Initiatives — Incident report: Tal Afar Citadel', 'https://asor.org/?p=53066', level='search-snippet'),
         wd('Q20031993')],
        alt=['Telafer Kalesi', 'Qal‘at Tal Afar', 'قلعة تلعفر', 'Nimit Ishtar (proposed)'], period='Ottoman; Assyrian mound',
        coords=(36.374552, 42.45428, 'Q20031993', 'site'), location='Tal Afar', destroyed='Walls blown up (31 December 2014)'),
    rec('saad-ibn-aqil-shrine', 'Shrine of Imam Saad ibn Aqil, Tal Afar', 'Shrine',
        'A 12th-century shrine founded in 1142 by Jamal al-Din al-Amadi for Saad ibn Aqil. Islamic State destroyed it '
        'in June 2014 with 32 other religious buildings; it was rebuilt from 2019.',
        [wp("Imam Saad bin Aqil' Shrine"), wd('Q60776398')],
        alt=['مرقد الإمام سعد بن عقيل'], period='Zengid', year=1142, coords=(36.371648, 42.450134, 'Q60776398', 'site'),
        location='Tal Afar', destroyed='Destroyed (June 2014); rebuilt 2019'),
    rec('sharif-khan-palace', 'Sharif Khan Palace (Tarbisu)', 'Palace',
        'An Assyrian palace site at Sharif Khan, ancient Tarbisu, north of Nineveh, listed by Mosul Eye among '
        'heritage destroyed or severely damaged in 2014–17.',
        [src('Mosul Eye — The 91 destroyed sites', MOSUL_EYE)], alt=['Tarbisu', 'Shereef Khan'], period='Neo-Assyrian',
        location='Sharif Khan, north of Mosul', destroyed='Destroyed or severely damaged (2014–17)'),

    # ── Nineveh: components of the ancient city ─────────────────────────────────────────
    rec('tell-kuyunjik', 'Tell Kuyunjik', 'Archaeological Site',
        'The main citadel mound of Nineveh, holding the palaces of Sennacherib and Ashurbanipal, the Ishtar temple and '
        'the find-spot of Ashurbanipal’s library of more than 30,000 tablets.',
        [src('Heidelberg University — Nineveh project', HEID + 'ng_introduction_en.html', C1, locator='Introduction'),
         wp('Library of Ashurbanipal'), wd('Q856544')],
        alt=['Kouyunjik', 'Quyunjiq', 'تل قوينجق'], period='Neo-Assyrian', coords=(36.3594, 43.1528, 'Q856544', 'site'),
        parent=NINEVEH, location='Nineveh, East Mosul'),
    rec('tell-nebi-yunus', 'Tell Nebi Yunus (Nineveh arsenal mound)', 'Archaeological Site',
        'The second mound of Nineveh, with the remains of the Assyrian military palace (ekal mašarti) beneath the '
        'Nabi Yunus mosque.',
        [src('Heidelberg University — Tell Nebi Yunus', HEID + 'ny_introduction_en.html', C1, locator='Introduction')],
        alt=['Tell al-Tawba'], period='Neo-Assyrian', parent=NINEVEH, location='Nineveh, East Mosul'),
    rec('sennacherib-southwest-palace', 'Southwest Palace of Sennacherib', 'Palace',
        'Sennacherib’s “Palace without Rival” on Kuyunjik, whose relief-lined halls are studied by Heidelberg University.',
        [src('Heidelberg University — Southwest Palace', HEID + 'swp_introduction_en.html', C1, locator='Introduction')],
        alt=['Palace without Rival'], period='Neo-Assyrian', year='c. 700 BC', parent=NINEVEH, location='Tell Kuyunjik'),
    rec('ashurbanipal-north-palace', 'North Palace of Ashurbanipal', 'Palace',
        'Ashurbanipal’s palace on Kuyunjik, source of the famous lion-hunt reliefs.',
        [src('Heidelberg University — North Palace', HEID + 'np_introduction_en.html', C1, locator='Introduction')],
        period='Neo-Assyrian', year='c. 645 BC', parent=NINEVEH, location='Tell Kuyunjik'),
    rec('ishtar-temple-nineveh', 'Ishtar Temple of Nineveh', 'Temple',
        'The temple of Ishtar of Nineveh on the Kuyunjik mound, one of the city’s oldest sanctuaries.',
        [src('Heidelberg University — Nineveh project', HEID + 'ng_introduction_en.html', C1, locator='Introduction')],
        period='Bronze Age to Neo-Assyrian', parent=NINEVEH, location='Tell Kuyunjik'),
    rec('nergal-gate', 'Nergal Gate', 'Gate',
        'A gate of Nineveh’s 12 km city wall guarded by lamassu; Islamic State bulldozed the gate in 2016.',
        [src('Heidelberg University — Nergal Gate', HEID + 'ng_introduction_en.html', C1, locator='Introduction'),
         src('UCL Nahrein Network — Nineveh gates', 'https://blogs.ucl.ac.uk/nahrein/2025/06/18/nineveh-gates-challenges-sustainability-and-strengthening-community-relations-in-mosul', level='search-snippet')],
        period='Neo-Assyrian', parent=NINEVEH, location='North wall of Nineveh', destroyed='Levelled (2016)'),
    rec('mashki-gate', 'Mashki Gate', 'Gate',
        'A reconstructed gate in Nineveh’s western wall, levelled in 2016 and rebuilt by the University of '
        'Pennsylvania with ALIPH funding.',
        [src('Penn IHSP — Mashki Gate restoration', 'https://web.sas.upenn.edu/ihsp-program/projects/restoration/mashki-gate/', C1),
         src('ALIPH — The Mashki Gate restoration', 'https://www.aliph-foundation.org/en/projects/the-mashki-gate-restoration-mosul', level='search-snippet')],
        alt=['Mashqi Gate', 'Gate of the Watering Places'], period='Neo-Assyrian', parent=NINEVEH,
        location='West wall of Nineveh', destroyed='Levelled (2016); restored'),
    rec('adad-gate', 'Adad Gate', 'Gate',
        'A gate in Nineveh’s northern wall, partly reconstructed in the 20th century and levelled by Islamic State in 2016.',
        [src('Heidelberg University — Nineveh project', HEID + 'ng_introduction_en.html', C1, locator='Introduction')],
        period='Neo-Assyrian', parent=NINEVEH, location='North wall of Nineveh', destroyed='Levelled (2016)'),
    rec('shamash-gate', 'Shamash Gate', 'Gate',
        'A gate in Nineveh’s eastern wall whose excavation shows two episodes of instability.',
        [src('Cambridge, IRAQ — The Shamash Gate, Nineveh', 'https://www.cambridge.org/core/journals/iraq/article/shamash-gate-nineveh-a-window-into-two-episodes-of-instability/86EE3C622258E35EAF5B5F0FEC4C86C7', C1)],
        period='Neo-Assyrian', parent=NINEVEH, location='East wall of Nineveh'),
    rec('sin-gate', 'Sin Gate', 'Gate', 'One of the gates of Nineveh’s city wall.',
        [src('Heidelberg University — Nineveh project', HEID + 'ng_introduction_en.html', C1, locator='Introduction')],
        period='Neo-Assyrian', parent=NINEVEH, location='Nineveh city wall'),
    rec('assur-gate', 'Assur Gate', 'Gate', 'One of the gates of Nineveh’s city wall.',
        [src('Heidelberg University — Nineveh project', HEID + 'ng_introduction_en.html', C1, locator='Introduction')],
        period='Neo-Assyrian', parent=NINEVEH, location='Nineveh city wall'),

    # ── Nimrud (Kalhu): components ───────────────────────────────────────────────────────
    rec('nimrud-northwest-palace', 'Northwest Palace of Nimrud', 'Palace',
        'Ashurnasirpal II’s palace at Kalhu, famous for its lamassu and wall reliefs; Islamic State blew it up in 2015.',
        [src('French Ministry of Culture — Nimrud, ancient Kalhu', 'https://archeologie.culture.gouv.fr/khorsabad/en/nimrud-ancient-kalhu', C1),
         mh('the-archaeological-assyrian-site-of-nimrud', 'The Assyrian archaeological site of Nimrud')],
        period='Neo-Assyrian', year='c. 879 BC', parent=NIMRUD, location='Nimrud', destroyed='Blown up (2015)'),
    rec('nimrud-burnt-palace', 'Burnt Palace of Nimrud', 'Palace', 'A palace on the citadel of Kalhu.',
        [src('French Ministry of Culture — Nimrud, ancient Kalhu', 'https://archeologie.culture.gouv.fr/khorsabad/en/nimrud-ancient-kalhu', C1)],
        period='Neo-Assyrian', parent=NIMRUD, location='Nimrud'),
    rec('fort-shalmaneser', 'Fort Shalmaneser', 'Palace',
        'The military palace (ekal mašarti) of Shalmaneser III in the south-east corner of Kalhu.',
        [src('French Ministry of Culture — Nimrud, ancient Kalhu', 'https://archeologie.culture.gouv.fr/khorsabad/en/nimrud-ancient-kalhu', C1)],
        period='Neo-Assyrian', year='9th century BC', parent=NIMRUD, location='Nimrud'),
    rec('nimrud-governors-palace', 'Governor’s Palace, Nimrud', 'Palace', 'A residence of the provincial governor at Kalhu.',
        [src('ORACC ATAE — Governor’s Palace, Kalhu', 'https://oracc.museum.upenn.edu/atae/778-I', C1, locator='012 - Governor’s Palace')],
        period='Neo-Assyrian', parent=NIMRUD, location='Nimrud'),
    rec('nimrud-ninurta-temple', 'Temple of Ninurta, Nimrud', 'Temple', 'The temple of Ninurta, patron god of Kalhu.',
        [src('ORACC SAAo — Kalhu', 'https://oracc2.museum.upenn.edu/saao/aebp/Essentials/Cities/Kalhu/index.html', C1)],
        period='Neo-Assyrian', parent=NIMRUD, location='Nimrud'),
    rec('nimrud-ziggurat', 'Ziggurat of Nimrud', 'Historic Monument',
        'The ziggurat of Kalhu beside the Ninurta temple; Islamic State bulldozed it in 2016.',
        [src('ORACC SAAo — Kalhu', 'https://oracc2.museum.upenn.edu/saao/aebp/Essentials/Cities/Kalhu/index.html', C1)],
        period='Neo-Assyrian', parent=NIMRUD, location='Nimrud', destroyed='Bulldozed (2016)'),
    rec('adad-nerari-palace-nimrud', 'Palace of Adad-nerari III, Nimrud', 'Palace', 'A royal palace of Adad-nerari III on the citadel of Kalhu.',
        [src('ORACC SAAo — Kalhu', 'https://oracc2.museum.upenn.edu/saao/aebp/Essentials/Cities/Kalhu/index.html', C1)],
        period='Neo-Assyrian', parent=NIMRUD, location='Nimrud'),

    # ── Assyrian capitals and towns ────────────────────────────────────────────────────
    rec('khorsabad', 'Khorsabad (Dur-Sharrukin)', 'Archaeological City',
        'The capital Sargon II built in the decade before 706 BC, 15 km north-east of Mosul, abandoned for Nineveh '
        'after his death. French excavations from 1843 removed great lamassu and reliefs to the Louvre.',
        [wp('Dur-Sharrukin'), umdb('K2'),
         src('French Ministry of Culture — Khorsabad', 'https://archeologie.culture.gouv.fr/khorsabad/en/mediatheque/pasha-mosul-visits-excavations-khorsabad-formerly-nineveh', level='search-snippet'),
         wd('Q253208')],
        alt=['Dur-Sharrukin', 'Fortress of Sargon', 'خورسباد', 'دور شروكين'], period='Neo-Assyrian', year='c. 710 BC',
        coords=(36.50953, 43.22931, 'Q253208', 'site'), location='Khorsabad, north-east of Mosul',
        destroyed='Damaged and looted under Islamic State (2015)'),
    rec('balawat', 'Balawat (Imgur-Enlil)', 'Archaeological City',
        'The Assyrian town of Imgur-Enlil, 25 km south-east of Mosul, where Hormuzd Rassam found the bronze gate '
        'bands of Shalmaneser III in 1878; Mallowan later excavated it.',
        [wp('Balawat'), umdb('B5'), wd('Q1659846')],
        alt=['Imgur-Enlil', 'Beth Labat', 'بلاوات'], period='Neo-Assyrian', coords=(36.216667, 43.416667, 'Q1659846', 'site'),
        location='South of Qaraqosh'),
    rec('tell-billa', 'Tell Billa (Shibaniba)', 'Archaeological Site',
        'A 12-hectare mound near Bashiqa occupied from the Uruk period, identified with the Assyrian town of '
        'Shibaniba.',
        [wp('Shibaniba'), umdb('B6'), wd('Q3482023')],
        alt=['Shibaniba', 'Tell Billah', 'Baasheikhah', 'شيبانيبا'], period='Uruk to Neo-Assyrian',
        coords=(36.433348, 43.347844, 'Q3482023', 'site'), location='Near Bashiqa'),
    rec('karamles-kar-mullissi', 'Karamles mounds (Kar-Mullissi)', 'Archaeological Site',
        'The hills around Karamles formed the Assyrian city of Kar-Mullissi, “city of Mullissu”.',
        [wp('Karamlesh'), wd('Q4115974')], alt=['Kar-Mullissi', 'Karemlash'], period='Neo-Assyrian',
        coords=(36.303611, 43.412778, 'Q4115974', 'settlement'), location='Karamles'),

    # ── Prehistoric and Bronze Age tells ───────────────────────────────────────────────
    rec('tepe-gawra', 'Tepe Gawra', 'Archaeological Site',
        'A settlement 24 km north-north-east of Mosul occupied from 5000 to 1500 BC, with Halaf, Ubaid and Uruk '
        'levels and early temples.',
        [wp('Tepe Gawra'), umdb('G1'), wd('Q607583')], alt=['Tepe Gaura', 'تبه كورا'], period='Halaf to Bronze Age',
        coords=(36.483, 43.25, 'Q607583', 'site'), location='Near Khorsabad'),
    rec('tell-arpachiyah', 'Tell Arpachiyah', 'Archaeological Site',
        'A small Halaf-period tell just outside Mosul (local name Tepe Reshwa), excavated by Max Mallowan in 1933.',
        [wp('Tell Arpachiyah'), umdb('A4'), wd('Q1744863')], alt=['Arpachiya', 'Tepe Reshwa', 'تل عربجية'], period='Halaf–Ubaid',
        location='Near Nineveh',
        notes='Wikidata Q1744863 gives 36.48, 42.95, west of the Tigris and far from Nineveh; coordinates left out until corrected.'),
    rec('tell-hassuna', 'Tell Hassuna', 'Archaeological Site',
        'The type site of the Hassuna culture (early 6th millennium BC), 35 km south-west of Nineveh, found by Fuad '
        'Safar in 1942 and dug by Seton Lloyd in 1943–44.',
        [wp('Tell Hassuna'), umdb('H2'), wd('Q2733421')], alt=['Hassuna', 'حسونة'], period='Neolithic', year='c. 5600 BC',
        coords=(36.166667, 43.1, 'Q2733421', 'site'), location='South-west of Mosul'),
    rec('mlefaat', 'M’lefaat', 'Archaeological Site',
        'A Pre-Pottery Neolithic A mound excavated by Robert Braidwood in 1954 and by Stefan Kozłowski in 1989–90.',
        [wp("M'lefaat"), umdb('M3'), wd('Q3523239')], alt=['Mlefaat', 'ملفعات'], period='Pre-Pottery Neolithic A',
        coords=(36.3, 43.55, 'Q3523239', 'site'), location='Khazir valley', notes='Near the Khazir boundary; governorate to confirm.'),
    rec('qermez-dere', 'Qermez Dere', 'Archaeological Site',
        'An early Neolithic settlement on the north-west edge of Tal Afar, found in 1987, with rounded mud-brick rooms '
        'and clay pillars.',
        [wp('Qermez Dere'), wd('Q15841331')], alt=['قرمز ديري'], period='Pre-Pottery Neolithic A',
        location='Tal Afar area',
        notes='Wikidata Q15841331 places it near the Mosul Dam rather than Tal Afar; coordinates left out until corrected.'),
    rec('yarim-tepe', 'Yarim Tepe', 'Archaeological Site',
        'A group of mounds 7 km south-west of Tal Afar recording the Hassuna, Halaf and Ubaid cultures, excavated by a '
        'Soviet expedition in 1969–76.',
        [wp('Yarim Tepe'), umdb('Y1'), wd('Q25490472')], alt=['Yarim Tepe I–III'], period='Neolithic–Chalcolithic', year='c. 6000 BC',
        coords=(36.32045, 42.3675, 'Q25490472', 'site'), location='Sinjar valley, south-west of Tal Afar'),
    rec('tell-maghzaliyah', 'Tell Maghzaliyah', 'Archaeological Site',
        'A fortified aceramic Neolithic site near Yarim Tepe with links to the Jarmo culture, dug by Soviet teams in '
        '1969–80.',
        [wp('Tell Maghzaliyah'), wd('Q17119019')], alt=['Tell Maghzalia', 'تل المغزالية'], period='Pre-Pottery Neolithic',
        coords=(36.38, 42.44, 'Q17119019', 'site'), location='Sinjar plain'),
    rec('telul-eth-thalathat', 'Telul eth-Thalathat', 'Archaeological Site',
        'A group of four or five mounds east of Tal Afar with Ubaid, Uruk and Ninevite 5 levels, excavated by the '
        'University of Tokyo in 1956–76.',
        [wp('Telul eth-Thalathat'), umdb('T2'), wd('Q7697916')], alt=['Tulul ath-Thalathat', 'تلول الثلاثات'], period='Ubaid to Ninevite 5',
        coords=(36.5667, 42.5333, 'Q7697916', 'site'), location='East of Tal Afar'),
    rec('tell-al-rimah', 'Tell al-Rimah', 'Archaeological Site',
        'A mound 15 km south of Tal Afar proposed as Karana or Qattara, with an Old Babylonian temple and palace.',
        [wp('Tell al-Rimah'), wd('Q195286')], alt=['Karana', 'Qattara', 'تل الرماح'], period='Bronze Age to Neo-Assyrian',
        coords=(36.1333, 42.5167, 'Q195286', 'site'), location='South of Tal Afar'),
    rec('tell-taya', 'Tell Taya', 'Archaeological Site',
        'A walled town 20 km south-west of Mosul occupied from the 3rd to the 1st millennium BC, excavated by the '
        'British School of Archaeology in Iraq.',
        [wp('Tell Taya'), wd('Q7697518')], alt=['تل الطايع'], period='Early Bronze Age to Iron Age',
        coords=(36.3326, 42.4937, 'Q7697518', 'site'), location='South-west of Mosul',
        notes='Wikidata point lies near Tal Afar, not 20 km from Mosul; coordinates need checking.'),
    rec('tell-khoshi', 'Tell Khoshi', 'Archaeological Site',
        'A site 14 km south of Sinjar town occupied mainly in the Akkadian and Ur III periods, suggested as Andarig.',
        [wp('Tell Khoshi'), wd('Q14466961')], alt=['تل خوشي'], period='Early Bronze Age',
        coords=(36.195, 41.835, 'Q14466961', 'site'), location='South of Sinjar'),
    rec('tell-deir-situn', 'Tell Deir Situn', 'Archaeological Site',
        'A Hellenistic site 45 km north-west of Nineveh excavated by the British Museum in 1985 before the Mosul Dam.',
        [wp('Tell Deir Situn'), wd('Q123773705')], alt=['تل دير سيتون'], period='Hellenistic',
        coords=(36.671617, 42.967766, 'Q123773705', 'site'), location='Eski Mosul (Mosul Dam) area'),
    rec('ginnig', 'Ginnig', 'Archaeological Site',
        'A small mound at the PPNB–Pottery Neolithic transition, found in 1986 and excavated in 1987–88.',
        [wp('Ginnig'), wd('Q109829140')], alt=['غينيغ'], period='Neolithic',
        coords=(36.717847, 42.274202, 'Q109829140', 'site'), location='North-western Nineveh'),
    rec('umm-dabaghiyah', 'Umm Dabaghiyah', 'Archaeological Site',
        'An early Neolithic site in the Jazira steppe, type site of the Umm Dabaghiyah culture.',
        [umdb('U1'), wd('Q12180374')], alt=['أم الدباغية'], period='Neolithic',
        coords=(35.504929, 42.300712, 'Q12180374', 'site'), location='Jazira, south-west of Mosul'),
    rec('tell-sotto', 'Tell Sotto', 'Archaeological Site', 'A Neolithic mound on the northern Mesopotamian plain recorded by the University of Tokyo.',
        [umdb('S2')], alt=['Satto'], period='Neolithic', location='Mosul region'),
    rec('mezra', 'Mezra (Qara Tepe)', 'Archaeological Site', 'A tell recorded by the University of Tokyo expedition.',
        [umdb('M2')], alt=['Mezrah', 'Mizrah', 'Qara Tepe'], location='Mosul region'),
    rec('el-khan', 'El Khan', 'Archaeological Site', 'A site on the west bank of the Khazir south of M’lefaat recorded by the University of Tokyo.',
        [umdb('E1')], alt=['Al-Khan'], location='Khazir valley', notes='Near the Khazir boundary; governorate to confirm.'),

    # ── Duhok-side Yazidi site listed with the Nineveh plain inventory ───────────────────────
    rec('mam-chevan-mausoleums', 'Yazidi Mausoleums of Mam Chevan', 'Shrine',
        'A tight group of mausoleums among Yazidi graves above a camp for people displaced from Sinjar, much '
        'visited since 2014.',
        [mh('les-mausolees-yezidis-de-mam-chevan', 'The Yazidi Mausoleums of Mam Chevan')],
        alt=['Mam Şivan'], coords=mh_coords(36.806, 42.772167, 'mam-chevan'), location='Near Khanke', governorate='Duhok'),
]


def main():
    ids = [r['id'] for r in RECORDS]
    if len(ids) != len(set(ids)):
        sys.exit('duplicate ids in batch')
    (HERE / 'nineveh-records.json').write_text(json.dumps(RECORDS, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

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
