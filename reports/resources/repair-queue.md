# Resource repair queue

Generated 2026-11-14 by `python3 tools/content-pipeline/check_resources.py`. 682 published cards, 300 images (local renditions and remote originals), 2044 links, plus every linked video and 3D resource. Full list: `tools/content-pipeline/data/resources/repair-queue.json`.

- **P1** a visitor sees something broken (missing or corrupt image file, dead image, unavailable video or model).
- **P2** a link a visitor follows is dead (source, Commons page, licence).
- **P3** a person must look: the site blocks automated clients, timed out, or moved the page. Record the result in `data/resources/manual-checks.json`.

| Priority | Problem | Items | What to do |
|---|---|---|---|
| P2 | link-dead | 7 | Find the page again (publisher site, Wayback Machine) and update the URL, or replace the source. |
| P3 | blocked | 150 | The site refuses automated clients. Open it in a browser; record the result in manual-checks.json. |
| P3 | timeout | 20 | No answer in time. Open it in a browser; record the result in manual-checks.json. |
| P3 | moved | 4 | The link redirects permanently: update it to the new address. |
| P3 | connection-reset | 2 | The server drops automated connections. Open it in a browser from another network; use the archived copy if it is gone. |

## P2 (7)

| Card | Field | Problem | Resource | Detail |
|---|---|---|---|---|
| `site-anbar-minaret-of-anah` Minaret of Anah | sources[1].url | link-dead | https://uebdc.uoanbar.edu.iq/English/News_Print.php?ID=404 | manual check 2026-11-14: 404 on the university site; archived copy of July 2025. → https://web.archive.org/web/20250719052411/https://uebdc.uoanbar.edu.iq/English/News_Print.php?ID=404 |
| `site-duhok-duhok-old-bazaar` Old Bazaar of Duhok | sources[0].url | link-dead | https://uod.ac/about/duhok-city | manual check 2026-11-14: 404 with and without www; archived copy of December 2024. → https://web.archive.org/web/20241214204610/https://www.uod.ac/about/duhok-city/ |
| `site-duhok-zebari-gate-amedi` Zebari Gate, Amedi | sources[0].url | link-dead | https://mcid.mcah.columbia.edu/node/87269 | manual check 2026-11-14: 404 and no archived copy: replace with another source for the Zebari Gate. |
| `site-erbil-house-b13-topkhana` House B13 (37 Topkhana) | sources[1].url | link-dead | https://mcid.mcah.columbia.edu/cataloging-viewer/1314_iraq2013_houseb13_img_010 | manual check 2026-11-14: 404 and no archived copy: the card keeps its other source; remove or replace this one. |
| `site-kirkuk-ottoman-military-cemetery` Ottoman Military Cemetery, Kirkuk Citadel | sources[1].url | link-dead | https://tika.gov.tr/en/detail-a_collective_opening_ceremony_was_held_for_tika%27s_projects_in_iraq/ | manual check 2026-11-14: 404; archived copy of May 2026. → https://web.archive.org/web/20260519001529/https://tika.gov.tr/en/detail-a_collective_opening_ceremony_was_held_for_tika%27s_projects_in_iraq/ |
| `site-kirkuk-sheikh-ismail-shrine` Shrine of Sheikh Ismail, Hbejh | sources[0].url | link-dead | https://www.asor.org/wp-content/uploads/2019/09/ASOR_CHI_Weekly_Report_16–17r.pdf | manual check 2026-11-14: 404 (also percent-encoded) and no archived copy. |
| `site-nineveh-tal-afar-citadel` Tal Afar Citadel | sources[1].url | link-dead | https://asor.org/?p=53066 | manual check 2026-11-14: 404 and no archived copy. |

## P3 (176)

| Card | Field | Problem | Resource | Detail |
|---|---|---|---|---|
| `site-001` Hatra | sources[0].url | blocked | https://whc.unesco.org/en/list/277/ | HTTP 403 |
| `site-anbar-hit-old-town` Old Town and Citadel of Hit | sources[2].url | blocked | https://www.investpromo.gov.iq/wp-content/uploads/2018/06/anbar-Tourism-Sector-1.pdf | HTTP 403 |
| `site-anbar-kifrin` Kifrin | sources[0].url | blocked | https://www.mdpi.com/2072-4292/13/4/786 | HTTP 403 |
| `site-anbar-usiyeh` ‘Usiyeh | sources[1].url | blocked | https://www.mdpi.com/2072-4292/13/4/786 | HTTP 403 |
| `site-baghdad-abbasid-palace` Abbasid Palace | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/5880/ | HTTP 403 |
| `site-baghdad-al-ahmadiyya-mosque` Mosque-Madrasa of al-Ahmadiyya | sources[2].url | blocked | https://www.archnet.org/sites/3852 | HTTP 429 |
| `site-baghdad-al-asifiyah-mosque` Al-Asifiyah Mosque | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/5880/ | HTTP 403 |
| `site-baghdad-al-khulafa-mosque` Al-Khulafa Mosque and Suq al-Ghazl Minaret | sources[3].url | blocked | https://www.archnet.org/sites/3842 | HTTP 429 |
| `site-baghdad-al-muradiyya-mosque` Al-Muradiyya Mosque | sources[2].url | blocked | https://www.archnet.org/sites/3850 | HTTP 429 |
| `site-baghdad-al-qishla` Al-Qishla and Clock Tower | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/5880/ | HTTP 403 |
| `site-baghdad-al-wazir-mosque` Al-Wazir Mosque | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/5880/ | HTTP 403 |
| `site-baghdad-bab-al-wastani` Bab al-Wastani | sources[3].url | blocked | https://www.archnet.org/sites/4326 | HTTP 429 |
| `site-baghdad-baghdad-gymnasium` Baghdad Gymnasium (Le Corbusier) | sources[2].url | blocked | https://www.archnet.org/sites/345 | HTTP 429 |
| `site-baghdad-ctesiphon` Ctesiphon | sources[2].url | blocked | https://www.iranicaonline.org/articles/ctesiphon/ | HTTP 403 |
| `site-baghdad-ctesiphon` Ctesiphon | sources[3].url | blocked | https://www.iranicaonline.org/articles/madaen-sasanian-metropolitan-area/ | HTTP 403 |
| `site-baghdad-dur-kurigalzu` Dur-Kurigalzu (Aqar Quf) | sources[2].url | blocked | https://whc.unesco.org/en/tentativelists/6797/ | HTTP 403 |
| `site-baghdad-hadhrat-al-qadiriyya` Hadhrat al-Qadiriyya | sources[2].url | blocked | https://www.archnet.org/sites/3849 | HTTP 429 |
| `site-baghdad-haydar-khana-mosque` Haydar-Khana Mosque | sources[2].url | blocked | https://www.archnet.org/sites/3854 | HTTP 429 |
| `site-baghdad-house-of-wisdom-building` House of Wisdom (Industries School Building) | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/5880/ | HTTP 403 |
| `site-baghdad-kadhimiya-shrine` Al-Kadhimiya Shrine | sources[2].url | blocked | https://www.archnet.org/sites/3848 | HTTP 429 |
| `site-baghdad-khan-mirjan` Khan Mirjan | sources[2].url | blocked | https://www.archnet.org/sites/15578 | HTTP 429 |
| `site-baghdad-khan-mirjan` Khan Mirjan | sources[3].url | blocked | https://www.archnet.org/publications/373 | HTTP 429 |
| `site-baghdad-mirjan-mosque` Mirjan Mosque (Madrasa al-Mirjaniyya) | sources[2].url | blocked | https://www.archnet.org/sites/3844 | HTTP 429 |
| `site-baghdad-mustansiriya-madrasa` Al-Mustansiriya Madrasa | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/5880/ | HTTP 403 |
| `site-baghdad-mustansiriya-madrasa` Al-Mustansiriya Madrasa | sources[2].url | blocked | https://www.archnet.org/sites/3836 | HTTP 429 |
| `site-baghdad-north-gate-war-cemetery` Baghdad (North Gate) War Cemetery | sources[2].url | blocked | https://www.cwgc.org/visit-us/find-cemeteries-memorials/cemetery-details/57303/baghdad-north-gate-war-cemetery/ | HTTP 403 |
| `site-baghdad-round-city` Round City of Baghdad (Madinat al-Salam) | sources[2].url | blocked | https://www.iranicaonline.org/articles/baghdad/baghdad-iranian-connection-i-pr-mongol/ | HTTP 403 |
| `site-baghdad-seleucia-on-tigris` Seleucia on the Tigris | sources[2].url | blocked | https://www.iranicaonline.org/articles/ctesiphon/ | HTTP 403 |
| `site-baghdad-suhrawardi-mausoleum` Mausoleum of Umar al-Suhrawardi | sources[2].url | blocked | https://www.archnet.org/sites/4329 | HTTP 429 |
| `site-baghdad-talisman-gate` Talisman Gate (site) | sources[1].url | blocked | https://www.archnet.org/sites/3832 | HTTP 429 |
| `site-baghdad-taq-kasra` Taq Kasra (Arch of Ctesiphon) | sources[2].url | blocked | https://www.iranicaonline.org/articles/ctesiphon | HTTP 403 |
| `site-baghdad-university-of-baghdad-campus` University of Baghdad Campus (Gropius) | sources[2].url | blocked | https://archnet.org/sites/15908 | HTTP 429 |
| `site-baghdad-unknown-soldier-monument` Monument to the Unknown Soldier | sources[2].url | blocked | https://www.archnet.org/sites/693 | HTTP 429 |
| `site-baghdad-zumurrud-khatun-mausoleum` Zumurrud Khatun Mausoleum | sources[2].url | blocked | https://www.archnet.org/sites/1696 | HTTP 429 |
| `site-baghdad-zumurrud-khatun-mausoleum` Zumurrud Khatun Mausoleum | sources[3].url | blocked | https://www.archnet.org/sites/4358 | HTTP 429 |
| `site-diyala-adhaim-ancient-dam` Ancient Adhaim Dam | sources[1].url | blocked | https://investpromo.gov.iq/investment-map/ | HTTP 403 |
| `site-diyala-baqubah-old-saray` Old Saray of Baqubah | sources[0].url | blocked | https://investpromo.gov.iq/investment-map/ | HTTP 403 |
| `site-diyala-eski-kifri` Eski Kifri | sources[0].url | blocked | https://sjh.univsul.edu.iq/article?id=2012 | HTTP 403 |
| `site-diyala-khanaqin-war-cemetery` Khanaqin War Cemetery | sources[0].url | blocked | https://www.cwgc.org/visit-us/find-cemeteries-memorials/cemetery-details/2090521/baghdad-north-gate-khanaqin-memorial/ | HTTP 403 |
| `site-diyala-kifri-saray` Kifri Saray | sources[1].url | blocked | https://sjh.univsul.edu.iq/article?id=2012 | HTTP 403 |
| `site-diyala-prophet-daniel-shrine-diyala` Shrine of the Prophet Daniel (Diyala) | sources[0].url | blocked | https://investpromo.gov.iq/investment-map/ | HTTP 403 |
| `site-diyala-tel-abu-uthaina` Tel Abu Uthaina | sources[0].url | blocked | https://investpromo.gov.iq/investment-map/ | HTTP 403 |
| `site-diyala-tel-shihab` Tel Shihab | sources[0].url | blocked | https://investpromo.gov.iq/investment-map/ | HTTP 403 |
| `site-diyala-tell-al-zendan` Tell al-Zendan Fortress | sources[1].url | blocked | https://investpromo.gov.iq/investment-map/ | HTTP 403 |
| `site-duhok-amedy-city` Amedy city | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/5601/ | HTTP 403 |
| `site-duhok-charsteen-cave` Charsteen Cave | sources[0].url | blocked | https://gov.krd/dmi-en/activities/news-and-press-releases/2025/april/first-phase-of-charsteen-cave-restoration-in-duhok-completed/ | HTTP 403 |
| `site-duhok-delal-bridge` Delal Bridge | sources[0].url | blocked | https://us.gov.krd/visit-kurdistan/ | HTTP 403 |
| `site-duhok-delal-bridge` Delal Bridge | sources[1].url | blocked | https://gov.krd/boi-en/why-kurdistan/region/history/ | HTTP 403 |
| `site-duhok-delal-bridge` Delal Bridge | sources[2].url | blocked | http://bot.gov.krd/duhok-province-zakho/history-and-heritage/dalal-bridge | HTTP 403 |
| `site-duhok-faida-canal-reliefs` Faida Archaeological Canal and Reliefs | sources[0].url | blocked | https://gov.krd/momt-en/activities/news-and-press-releases/2022/october/krg-inaugurated-the-first-archaeological-park-with-carvings-dating-back-2-700-years-in-duhok-province/ | HTTP 403 |
| `site-erbil-aliawa` Aliawa | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-awena` Awena | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-batas-harir-relief` Batas-Harir Rock Relief | sources[0].url | blocked | https://www.worldhistory.org/image/3086/rock-relief-of-mountain-hareer/ | HTTP 403 |
| `site-erbil-choli-minaret` Choli Minaret | sources[0].url | blocked | https://gov.krd/dmi-en/activities/news-and-press-releases/2025/august/erbil-citadel-and-choli-minaret-undergo-major-restoration-to-preserve-historic-identity/ | HTTP 403 |
| `site-erbil-erbil-citadel` Erbil Citadel | sources[0].url | blocked | https://whc.unesco.org/en/list/1437/ | HTTP 403 |
| `site-erbil-erbil-citadel` Erbil Citadel | sources[1].url | blocked | https://gov.krd/dmi-en/activities/news-and-press-releases/2025/august/erbil-citadel-and-choli-minaret-undergo-major-restoration-to-preserve-historic-identity/ | HTTP 403 |
| `site-erbil-erbil-citadel` Erbil Citadel | sources[2].url | blocked | https://whc.unesco.org/document/152675 | HTTP 403 |
| `site-erbil-erbil-citadel-hammam` Erbil Citadel Hammam | sources[1].url | blocked | https://whoseculture.hsites.harvard.edu/erbil | HTTP 403 |
| `site-erbil-erbil-citadel-hammam` Erbil Citadel Hammam | sources[2].url | blocked | https://gov.krd/dmi-en/activities/news-and-press-releases/2025/january/erbil-citadel-renovation-to-be-accelerated-reviving-the-world-s-oldest-inhabited-landmark-with-global-heritage-standards/ | HTTP 403 |
| `site-erbil-gird-i-dasht` Gird-i Dasht | sources[0].url | blocked | https://www.academia.edu/6884640 | HTTP 403 |
| `site-erbil-gird-i-matrab` Gird-i Matrab | sources[2].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-girdi-abdulaziz` Girdi Abdulaziz | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-girdi-daghan` Girdi Daghan | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-girdi-gozka` Girdi Gozka | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-girdi-helawa` Girdi Helawa | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-girdi-khazna` Girdi Khazna | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-girdi-peshka` Girdi Peshka | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-girdi-qawagh` Girdi Qawagh | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-great-mosque-erbil-citadel` Great Mosque of Erbil Citadel | sources[1].url | blocked | https://gov.krd/dmi-en/activities/news-and-press-releases/2025/august/erbil-citadel-and-choli-minaret-undergo-major-restoration-to-preserve-historic-identity/ | HTTP 403 |
| `site-erbil-kurd-qaburstan` Kurd Qaburstan | sources[3].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-qalinj-agha` Qalinj Agha | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-qasr-shemamok` Qasr Shemamok (Kilizu) | sources[1].url | blocked | https://www.iranicaonline.org/articles/kilizu/kilizu-i-the-site/ | HTTP 403 |
| `site-erbil-qasr-shemamok` Qasr Shemamok (Kilizu) | sources[2].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-qaysari-bazaar` Qaysari Bazaar, Erbil | sources[0].url | blocked | https://gov.krd/english/news-and-announcements/posts/2024/may/krg-s-council-of-ministers-deliberates-on-critical-issues/ | HTTP 403 |
| `site-erbil-shanidar-cave` Shanidar Cave | sources[0].url | blocked | https://us.gov.krd/visit-kurdistan/ | HTTP 403 |
| `site-erbil-tell-abu-shita` Tell Abu Shita | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-tell-baqrta` Tell Baqrta | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-tell-nader` Tell Nader | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-tell-quri-beg` Tell Quri Beg | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-tell-surezha` Surezha | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-erbil-zaga` Zaga | sources[0].url | blocked | https://www.kurdipedia.org/files/relatedfiles/2022/452119/0001.PDF | HTTP 403 |
| `site-kirkuk-aghaliq-quarter` Aghaliq Quarter, Kirkuk Citadel | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-al-aryan-mosque` Al-Aryan Mosque | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-al-midan-quarter` Al-Midan Quarter, Kirkuk Citadel | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-bab-al-halloujia` Bab al-Halloujia, Kirkuk Citadel | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-great-mosque-kirkuk-citadel` Great Mosque of Kirkuk Citadel | sources[1].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-green-dome` The Green Dome, Kirkuk Citadel | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-hammam-quarter` Hammam Quarter, Kirkuk Citadel | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-kirkuk-citadel` Kirkuk Citadel | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-mother-of-sorrows-church` Mother of Sorrows Church, Kirkuk Citadel | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-prophet-daniel-mosque` Prophet Daniel Mosque, Kirkuk Citadel | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-qaysariyah-market` Al-Qaysariyah Market, Kirkuk | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-seven-girls-gate` Seven Girls Gate, Kirkuk Citadel | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-stone-gate` Stone Gate, Kirkuk Citadel | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-kirkuk-tob-qapi` Bab al-Toub (Tob Qapi), Kirkuk Citadel | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6522/ | HTTP 403 |
| `site-nineveh-abdal-mosque-madrasa` Shaykh Abdal Mosque and Madrasa | sources[1].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-al-basha-mosque` Al-Basha Mosque | sources[1].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-al-juwayjati-mosque` Al-Juwayjati Mosque | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-al-khuzam-mosque` Al-Khuzam Mosque | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-al-nouri` Al-Nouri Mosque and al-Hadba Minaret | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-al-umariyya-mosque` Al-Umariyya Mosque | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-al-umawi-mosque` Umayyad Mosque of Mosul | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-ancient-nineveh` The Ancient City of Nineveh | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/1465/ | HTTP 403 |
| `site-nineveh-bab-al-qala` Bab al-Qal‘a | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-bab-al-sir` Bab al-Sir | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-barood-khana` Barood Khana | sources[0].url | blocked | https://penntoday.upenn.edu/news/penn-team-expands-cultural-heritage-work-iraq-backed-new-funding | HTTP 403 |
| `site-nineveh-bash-tapia-castle` Bash Tapia Castle | sources[1].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-dawsat-ali-mosque` Dawsat Ali Mosque | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-dominican-church` Dominican Church and Clock Tower, Mosul | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-lalish` Lalish Temple | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6467/ | HTTP 403 |
| `site-nineveh-nimrud` Nimrud | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/1463/ | HTTP 403 |
| `site-nineveh-old-mosul` Old City of Mosul | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-qara-saray` Qara Saray | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-umar-al-aswad-mosque` Umar al-Aswad Mosque | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-nineveh-umm-al-tisa-mosque` Mosque and Tomb of Umm al-Tis‘a and Cemetery | sources[1].url | blocked | https://whc.unesco.org/en/tentativelists/6355/ | HTTP 403 |
| `site-salah-al-din-abu-dulaf` Abu Dulaf Mosque | sources[0].url | blocked | https://whc.unesco.org/en/list/276/ | HTTP 403 |
| `site-salah-al-din-akitu-house-ashur` New Year Festival House (Akitu), Ashur | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-al-jafari-palace` Al-Ja‘fari Palace (al-Mutawakkiliyya) | sources[0].url | blocked | https://whc.unesco.org/en/list/276/ | HTTP 403 |
| `site-salah-al-din-anu-adad-temple` Temple of Anu and Adad, Ashur | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-ashur` Ashur (Qal'at Sherqat) | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-ashur-city-walls` City Walls of Ashur | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-ashur-temple` Temple of Ashur | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-ashur-ziggurat` Ziggurat of Ashur | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-balkuwara-palace` Balkuwara Palace | sources[0].url | blocked | https://whc.unesco.org/document/8815 | HTTP 403 |
| `site-salah-al-din-balkuwara-palace` Balkuwara Palace | sources[1].url | blocked | https://www.metmuseum.org/essays/ernst-emil-herzfeld-1879-1948-in-samarra | HTTP 429 |
| `site-salah-al-din-caliphal-palace` Caliphal Palace (Qasr al-Khalifa) | sources[0].url | blocked | https://whc.unesco.org/en/list/276/ | HTTP 403 |
| `site-salah-al-din-german-expedition-house-ashur` German Expedition House, Ashur | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-great-mosque` Great Mosque of Samarra and Malwiya Minaret | sources[0].url | blocked | https://whc.unesco.org/en/list/276/ | HTTP 403 |
| `site-salah-al-din-great-mosque` Great Mosque of Samarra and Malwiya Minaret | sources[2].url | blocked | https://www.archnet.org/sites/3828 | HTTP 429 |
| `site-salah-al-din-green-church-tikrit` Green Church (St Ahudemmeh), Tikrit | sources[1].url | blocked | https://unpo.org/?p=9696 | HTTP 403 |
| `site-salah-al-din-husn-al-qadisiyya` Husn al-Qadisiyya (Octagon of Harun al-Rashid) | sources[0].url | blocked | https://www.academia.edu/59904629/The_1986_Survey_Season_at_S%C4%81marr%C4%81 | HTTP 403 |
| `site-salah-al-din-ishtar-temple-ashur` Ishtar Temple, Ashur | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-istabulat` Al-Istabulat (al-‘Arus Palace) | sources[0].url | blocked | https://whc.unesco.org/document/8815 | HTTP 403 |
| `site-salah-al-din-old-palace-ashur` Old Palace of Ashur | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-ottoman-barracks-ashur` Ottoman Barracks, Ashur | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-parthian-palace-ashur` Parthian Palace, Ashur | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-qasr-al-ashiq` Qasr al-‘Ashiq (al-Ma‘shuq) | sources[1].url | blocked | https://whc.unesco.org/en/list/276/ | HTTP 403 |
| `site-salah-al-din-qubbat-al-sulaybiyya` Qubbat al-Sulaybiyya | sources[0].url | blocked | https://www.archnet.org/sites/3831 | HTTP 429 |
| `site-salah-al-din-qubbat-al-sulaybiyya` Qubbat al-Sulaybiyya | sources[1].url | blocked | https://whc.unesco.org/document/8815 | HTTP 403 |
| `site-salah-al-din-royal-tombs-ashur` Royal Burials of Ashur | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-samarra` Samarra Archaeological City | sources[0].url | blocked | https://whc.unesco.org/en/list/276/ | HTTP 403 |
| `site-salah-al-din-samarra-racecourses` Abbasid Racecourses of Samarra | sources[0].url | blocked | https://whc.unesco.org/document/205820 | HTTP 403 |
| `site-salah-al-din-tabira-gate` Tabira Gate, Ashur | sources[0].url | blocked | https://whc.unesco.org/en/list/1130/ | HTTP 403 |
| `site-salah-al-din-tell-al-alij` Tell al-‘Alij | sources[0].url | blocked | https://whc.unesco.org/document/8815 | HTTP 403 |
| `site-sulaymaniyah-bestansur` Bestansur Neolithic settlement | sources[0].url | blocked | https://whc.unesco.org/en/tentativelists/6172/ | HTTP 403 |
| `site-sulaymaniyah-dailaija-relief` Dailaija Rock Relief (Darband-i Basara) | sources[1].url | blocked | https://www.worldhistory.org/article/1235/the-lullubian-rock-relief-of-darband-i-basara/ | HTTP 403 |
| `site-sulaymaniyah-qalatga-darband` Qalatga Darband | sources[0].url | blocked | https://us.gov.krd/visit-kurdistan/ | HTTP 403 |
| `site-sulaymaniyah-red-terror-museum` Red Terror Museum, Slemani | sources[0].url | blocked | https://us.gov.krd/visit-kurdistan/ | HTTP 403 |
| `site-sulaymaniyah-sara-palace-and-bathhouse` Sara (Saray) Building and Fatima Khan Bathhouse | sources[1].url | blocked | https://gov.krd/dmi-en/activities/news-and-press-releases/2025/september/historic-bathhouse-from-baban-principality-rediscovered-in-slemani/ | HTTP 403 |
| `site-sulaymaniyah-tell-shemshara` Tell Shemshara | sources[0].url | blocked | https://us.gov.krd/visit-kurdistan/ | HTTP 403 |
| `site-erbil-grand-mosque-koya` Grand Mosque of Koya | sources[1].url | connection-reset | https://aafu.journals.ekb.eg/article_6102.html | curl 56; archived copy: https://web.archive.org/web/20251014035114/https://aafu.journals.ekb.eg/article_6102.html |
| `site-kirkuk-tell-arab-kumbet` Tell Arab Kumbet | sources[1].url | connection-reset | https://aafu.journals.ekb.eg/article_30093.html | curl 56; archived copy: https://web.archive.org/web/20251112023010/https://aafu.journals.ekb.eg/article_30093.html |
| `site-anbar-haradum` Haradum (Khirbet ed-Diniye) | sources[2].url | moved | https://cdli.mpiwg-berlin.mpg.de/artifacts/525505 | HTTP 200 → https://cdli.earth/artifacts/525505 |
| `site-nineveh-adad-nerari-palace-nimrud` Palace of Adad-nerari III, Nimrud | sources[0].url | moved | https://oracc2.museum.upenn.edu/saao/aebp/Essentials/Cities/Kalhu/index.html | manual check 2026-11-14: Certificate is issued for oracc.museum.upenn.edu; the same page answers there. → https://oracc.museum.upenn.edu/saao/aebp/Essentials/Cities/Kalhu/index.html |
| `site-nineveh-nimrud-ninurta-temple` Temple of Ninurta, Nimrud | sources[0].url | moved | https://oracc2.museum.upenn.edu/saao/aebp/Essentials/Cities/Kalhu/index.html | manual check 2026-11-14: Certificate is issued for oracc.museum.upenn.edu; the same page answers there. → https://oracc.museum.upenn.edu/saao/aebp/Essentials/Cities/Kalhu/index.html |
| `site-nineveh-nimrud-ziggurat` Ziggurat of Nimrud | sources[0].url | moved | https://oracc2.museum.upenn.edu/saao/aebp/Essentials/Cities/Kalhu/index.html | manual check 2026-11-14: Certificate is issued for oracc.museum.upenn.edu; the same page answers there. → https://oracc.museum.upenn.edu/saao/aebp/Essentials/Cities/Kalhu/index.html |
| `site-baghdad-al-khulafa-mosque` Al-Khulafa Mosque and Suq al-Ghazl Minaret | sources[2].url | timeout | https://www.archnet.org/sites/27 | curl 28 |
| `site-baghdad-al-shaheed-monument` Al-Shaheed Monument | sources[2].url | timeout | https://www.archnet.org/sites/433 | curl 28 |
| `site-baghdad-university-of-baghdad-campus` University of Baghdad Campus (Gropius) | sources[4].url | timeout | https://www.archnet.org/sites/15908 | curl 28 |
| `site-kirkuk-nuzi` Nuzi (Yorghan Tepe) | sources[2].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordeach.php?-action=find&-recid=27 | curl 28 |
| `site-nineveh-balawat` Balawat (Imgur-Enlil) | sources[1].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-el-khan` El Khan | sources[0].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-khorsabad` Khorsabad (Dur-Sharrukin) | sources[1].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-mezra` Mezra (Qara Tepe) | sources[0].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-mlefaat` M’lefaat | sources[1].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-qutb-al-din-minaret-sinjar` Minaret of Sultan Qutb al-Din’s Madrasa, Sinjar | sources[0].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-sinjar-old-city` Sinjar Historic Town (Singara) | sources[1].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-sitt-zaynab-sinjar` Shrine of Sitt Zaynab, Sinjar | sources[0].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-tell-arpachiyah` Tell Arpachiyah | sources[1].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-tell-billa` Tell Billa (Shibaniba) | sources[1].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-tell-hassuna` Tell Hassuna | sources[1].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-tell-sotto` Tell Sotto | sources[0].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-telul-eth-thalathat` Telul eth-Thalathat | sources[1].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-tepe-gawra` Tepe Gawra | sources[1].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-umm-dabaghiyah` Umm Dabaghiyah | sources[0].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
| `site-nineveh-yarim-tepe` Yarim Tepe | sources[1].url | timeout | https://umdb.um.u-tokyo.ac.jp/DKoukoga/iraq/recordlist.php?-max=all&-skip=0 | curl 28 |
