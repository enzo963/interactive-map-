/**
 * Where each governorate's label sits on the Leaflet map: the governorate's capital city.
 * These are label anchors only, not boundaries or site positions. Counts on the labels come
 * from the data (utils/governorateStats.js), never from this file.
 * Coordinates are approximate city centres (WGS84, [latitude, longitude]).
 */
export const GOVERNORATE_CENTRES = {
  anbar: [33.42, 43.3], // Ramadi
  babylon: [32.48, 44.42], // Hillah
  baghdad: [33.31, 44.37], // Baghdad
  basra: [30.51, 47.78], // Basra
  dhiqar: [31.05, 46.26], // Nasiriyah
  diyala: [33.75, 44.64], // Baqubah
  duhok: [36.87, 42.99], // Duhok
  erbil: [36.19, 44.01], // Erbil
  karbala: [32.62, 44.02], // Karbala
  kirkuk: [35.47, 44.39], // Kirkuk
  maysan: [31.84, 47.14], // Amarah
  muthanna: [31.31, 45.28], // Samawah
  najaf: [32.03, 44.33], // Najaf
  nineveh: [36.34, 43.13], // Mosul
  qadisiyyah: [31.99, 44.93], // Diwaniyah
  salahaldin: [34.61, 43.68], // Tikrit
  sulaymaniyah: [35.56, 45.43], // Sulaymaniyah
  wasit: [32.51, 45.82], // Kut
};
