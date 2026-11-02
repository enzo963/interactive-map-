import L from 'leaflet';

// leaflet.markercluster is a UMD build that extends the global `L`.
// globalThis (not window) so it also works when the app is evaluated under Node in the tests.
globalThis.L = L;

export default L;
