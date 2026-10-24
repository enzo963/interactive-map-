import Home from "./pages/Home";
import Explore from "./pages/Explore";
import MapPage from "./pages/Map";
import Decks from "./pages/Decks";
import DeckPage from "./pages/DeckPage";
import SiteDetails from "./pages/SiteDetails";
import About from "./pages/About";
import ThreeDArchive from "./pages/ThreeDArchive";

export const routes = [
  { path: "/", component: Home },
  { path: "/explore", component: Explore },
  { path: "/map", component: MapPage },
  { path: "/decks", component: Decks },
  { path: "/decks/:deckId", component: DeckPage },
  { path: "/sites/:slug", component: SiteDetails },
  { path: "/3d-archive", component: ThreeDArchive },
  { path: "/about", component: About },
];