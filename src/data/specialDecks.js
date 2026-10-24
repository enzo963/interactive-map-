/**
 * Special decks cut across governorates. Membership comes from the same
 * predicates the Draw section uses (data/drawFilters.js), so there is one
 * definition of "UNESCO", "Lost Heritage", etc.
 */
export const SPECIAL_DECKS = [
  { id: 'unesco',   filterId: 'unesco',   title: 'UNESCO Heritage',   back: 'formal',    blurb: 'Sites recorded with a UNESCO designation.' },
  { id: 'lost',     filterId: 'lost',     title: 'Lost Heritage',     back: 'fragment',  blurb: 'Sites recorded as lost or destroyed.' },
  { id: 'our-work', filterId: 'our-work', title: 'Our Documentation', back: 'survey',    blurb: 'Sites documented first-hand by the project.' },
  { id: '3d',       filterId: '3d',       title: '3D Archive',        back: 'wireframe', blurb: 'Sites with a 3D model in the archive.' },
];
