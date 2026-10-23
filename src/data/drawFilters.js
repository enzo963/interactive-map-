/**
 * Decks the visitor can draw from. `test` receives a normalized site.
 * `back` picks the card-back pattern shown on the deck (see CardBack).
 */
export const DRAW_FILTERS = [
  { id: 'all',      label: 'All Cards',     back: 'plain',     test: () => true },
  { id: 'unesco',   label: 'UNESCO',        back: 'formal',    test: (s) => s.isUnesco },
  { id: 'lost',     label: 'Lost Heritage', back: 'fragment',  test: (s) => s.isLost },
  { id: '3d',       label: '3D Archive',    back: 'wireframe', test: (s) => s.hasModel },
  { id: 'our-work', label: 'Our Work',      back: 'survey',    test: (s) => s.hasOurWork },
  { id: 'ancient',  label: 'Ancient Sites', back: 'plain',     test: (s) => s.cardType.tier >= 4 },
];
