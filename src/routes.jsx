import { lazy } from 'react';
import Home from './pages/Home.jsx';

// Only the requested page is primed at startup; other destinations stay lazy.
// Tests await the same module promises instead of using arbitrary sleeps.
function page(loader) {
  let promise;
  let resolved;
  const load = () => promise ??= loader().then((module) => { resolved = module.default; return module; });
  const LazyPage = lazy(load);
  function RoutePage(props) {
    const CurrentPage = resolved ?? LazyPage;
    return <CurrentPage {...props} />;
  }
  return { component: RoutePage, load };
}

// Home is the entry experience: keep its graph eager to avoid a request/reveal
// waterfall. The larger map, detail, collection and project pages stay on demand.
const home = { component: Home, load: () => Promise.resolve({ default: Home }) };
const explore = page(() => import('./pages/Explore.jsx'));
const map = page(() => import('./pages/Map.jsx'));
const decks = page(() => import('./pages/Decks.jsx'));
const deck = page(() => import('./pages/DeckPage.jsx'));
const site = page(() => import('./pages/SiteDetails.jsx'));
const about = page(() => import('./pages/About.jsx'));
const methodology = page(() => import('./pages/Methodology.jsx'));
const work = page(() => import('./pages/OurWork.jsx'));
const contact = page(() => import('./pages/Contact.jsx'));
const unesco = page(() => import('./pages/UnescoCollection.jsx'));
const models = page(() => import('./pages/ThreeDArchive.jsx'));

export const routes = [
  { path: '/', ...home },
  { path: '/explore', ...explore },
  { path: '/map', ...map },
  { path: '/decks', ...decks },
  { path: '/decks/unesco', ...unesco },
  { path: '/decks/3d', ...models },
  { path: '/decks/:deckId', ...deck },
  { path: '/sites/:slug', ...site },
  { path: '/unesco', ...unesco },
  { path: '/3d-archive', ...models },
  { path: '/about', ...about },
  { path: '/methodology', ...methodology },
  { path: '/our-work', ...work },
  { path: '/contact', ...contact },
];
