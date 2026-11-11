/**
 * Names that appear in the data (sites.json) and need a translation per language.
 * Keys are lower-case English values exactly as they are written in the data.
 * A value that is not listed is shown as written, so new data never breaks the page.
 * For a single record you can instead add a "translations" block to that site in sites.json.
 */

const term = (ar, de, en) => ({ ar, de, ...(en ? { en } : {}) });

/** Governorates, keyed by getGovernorateKey() (see data/governorates.js). */
export const GOVERNORATES = {
  nineveh: term('نينوى', 'Ninive'),
  duhok: term('دهوك', 'Dohuk'),
  erbil: term('أربيل', 'Erbil'),
  kirkuk: term('كركوك', 'Kirkuk'),
  salahaldin: term('صلاح الدين', 'Salah ad-Din'),
  sulaymaniyah: term('السليمانية', 'Sulaimaniyya'),
  baghdad: term('بغداد', 'Bagdad'),
  anbar: term('الأنبار', 'Anbar'),
  babylon: term('بابل', 'Babil'),
  basra: term('البصرة', 'Basra'),
  dhiqar: term('ذي قار', 'Dhi Qar'),
  diyala: term('ديالى', 'Diyala'),
  karbala: term('كربلاء', 'Kerbela'),
  maysan: term('ميسان', 'Maisan'),
  muthanna: term('المثنى', 'Muthanna'),
  najaf: term('النجف', 'Nadschaf'),
  qadisiyyah: term('القادسية', 'Al-Qadisiyya'),
  wasit: term('واسط', 'Wasit'),
};

export const COUNTRIES = {
  iraq: term('العراق', 'Irak'),
};

export const CITIES = {
  hatra: term('الحضر', 'Hatra'),
  mosul: term('الموصل', 'Mosul'),
  nineveh: term('نينوى', 'Ninive'),
  nimrud: term('النمرود', 'Nimrud'),
  khorsabad: term('خورسباد', 'Chorsabad'),
  sherqat: term('الشرقاط', 'Scherkat'),
  erbil: term('أربيل', 'Erbil'),
  duhok: term('دهوك', 'Dohuk'),
  dohuk: term('دهوك', 'Dohuk'),
  lalish: term('لالش', 'Lalisch'),
  kirkuk: term('كركوك', 'Kirkuk'),
  sulaymaniyah: term('السليمانية', 'Sulaimaniyya'),
  baghdad: term('بغداد', 'Bagdad'),
  samarra: term('سامراء', 'Samarra'),
  tikrit: term('تكريت', 'Tikrit'),
  ramadi: term('الرمادي', 'Ramadi'),
  fallujah: term('الفلوجة', 'Falludscha'),
  babylon: term('بابل', 'Babylon'),
  hillah: term('الحلة', 'Hilla'),
  karbala: term('كربلاء', 'Kerbela'),
  najaf: term('النجف', 'Nadschaf'),
  diwaniyah: term('الديوانية', 'Diwaniyya'),
  samawah: term('السماوة', 'Samawa'),
  nasiriyah: term('الناصرية', 'Nasiriyya'),
  ur: term('أور', 'Ur'),
  basra: term('البصرة', 'Basra'),
  amarah: term('العمارة', 'Amara'),
  kut: term('الكوت', 'Kut'),
  baqubah: term('بعقوبة', 'Baquba'),
};

export const SITE_TYPES = {
  'archaeological site': term('موقع أثري', 'Archäologische Stätte'),
  'archaeological city': term('مدينة أثرية', 'Archäologische Stadt'),
  'ancient city': term('مدينة قديمة', 'Antike Stadt'),
  monument: term('معلم تاريخي', 'Denkmal'),
  citadel: term('قلعة', 'Zitadelle'),
  castle: term('قلعة', 'Burg'),
  fortress: term('حصن', 'Festung'),
  'religious site': term('موقع ديني', 'Religiöse Stätte'),
  temple: term('معبد', 'Tempel'),
  mosque: term('مسجد', 'Moschee'),
  church: term('كنيسة', 'Kirche'),
  monastery: term('دير', 'Kloster'),
  shrine: term('مزار', 'Schrein'),
  tomb: term('ضريح', 'Grabmal'),
  minaret: term('مئذنة', 'Minarett'),
  palace: term('قصر', 'Palast'),
  museum: term('متحف', 'Museum'),
  bridge: term('جسر', 'Brücke'),
  market: term('سوق', 'Markt'),
  'historic building': term('مبنى تاريخي', 'Historisches Gebäude'),
  'historic district': term('حي تاريخي', 'Historisches Viertel'),
  'sample card': term('بطاقة نموذجية', 'Musterkarte'),
};

export const PERIODS = {
  prehistoric: term('ما قبل التاريخ', 'Vorgeschichtlich'),
  sumerian: term('السومري', 'Sumerisch'),
  'early dynastic': term('عصر فجر السلالات', 'Frühdynastisch'),
  akkadian: term('الأكدي', 'Akkadisch'),
  assyrian: term('الآشوري', 'Assyrisch'),
  'neo-assyrian': term('الآشوري الحديث', 'Neuassyrisch'),
  babylonian: term('البابلي', 'Babylonisch'),
  'neo-babylonian': term('البابلي الحديث', 'Neubabylonisch'),
  achaemenid: term('الأخميني', 'Achämenidisch'),
  hellenistic: term('الهلنستي', 'Hellenistisch'),
  parthian: term('الفرثي', 'Parthisch'),
  roman: term('الروماني', 'Römisch'),
  sasanian: term('الساساني', 'Sasanidisch'),
  islamic: term('الإسلامي', 'Islamisch'),
  umayyad: term('الأموي', 'Umayyadisch'),
  abbasid: term('العباسي', 'Abbasidisch'),
  seljuk: term('السلجوقي', 'Seldschukisch'),
  ilkhanid: term('الإيلخاني', 'Ilchanidisch'),
  medieval: term('العصور الوسطى', 'Mittelalter'),
  ottoman: term('العثماني', 'Osmanisch'),
  modern: term('الحديث', 'Modern'),
  'multi-period': term('متعدد الفترات', 'Mehrere Epochen'),
};

export const CIVILIZATIONS = {
  'hatra kingdom': term('مملكة الحضر', 'Königreich Hatra'),
  sumerian: term('السومريون', 'Sumerer'),
  akkadian: term('الأكديون', 'Akkader'),
  'akkadian empire': term('الإمبراطورية الأكدية', 'Akkadisches Reich'),
  babylonian: term('البابليون', 'Babylonier'),
  assyrian: term('الآشوريون', 'Assyrer'),
  'assyrian empire': term('الإمبراطورية الآشورية', 'Assyrisches Reich'),
  'neo-assyrian empire': term('الإمبراطورية الآشورية الحديثة', 'Neuassyrisches Reich'),
  'achaemenid empire': term('الإمبراطورية الأخمينية', 'Achämenidenreich'),
  'parthian empire': term('الإمبراطورية الفرثية', 'Partherreich'),
  'sasanian empire': term('الإمبراطورية الساسانية', 'Sasanidenreich'),
  'umayyad caliphate': term('الخلافة الأموية', 'Umayyadenkalifat'),
  'abbasid caliphate': term('الخلافة العباسية', 'Abbasidenkalifat'),
  'ottoman empire': term('الدولة العثمانية', 'Osmanisches Reich'),
  yazidi: term('الإيزيدية', 'Jesidisch'),
  'continuous settlement': term('استيطان مستمر', 'Durchgehende Besiedlung'),
};

/** Raw status values are shown as plain words instead of codes such as "needs-review". */
export const HERITAGE_STATUS = {
  existing: term('قائم', 'Erhalten', 'Existing'),
  damaged: term('متضرر', 'Beschädigt', 'Damaged'),
  endangered: term('مهدد بالخطر', 'Gefährdet', 'Endangered'),
  restored: term('مرمَّم', 'Restauriert', 'Restored'),
  lost: term('مفقود', 'Verloren', 'Lost'),
  destroyed: term('مدمَّر', 'Zerstört', 'Destroyed'),
};

export const UNESCO_STATUS = {
  'world-heritage': term('موقع تراث عالمي', 'UNESCO-Welterbe', 'World Heritage'),
  tentative: term('على القائمة التمهيدية', 'Auf der Vorschlagsliste', 'Tentative list'),
  none: term('غير مدرج', 'Nicht eingetragen', 'Not listed'),
};

export const VERIFICATION_STATUS = {
  'needs-review': term('بحاجة إلى مراجعة', 'Überprüfung erforderlich', 'Needs review'),
  verified: term('تم التحقق', 'Überprüft', 'Verified'),
  unverified: term('لم يتم التحقق', 'Nicht überprüft', 'Unverified'),
  draft: term('مسوّدة', 'Entwurf', 'Draft'),
};
