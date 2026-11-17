import { useState } from 'react';
import { HomeSearchContext } from './components/home/HomeSearchContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import NotFound from './pages/NotFound';
import I18nProvider from './i18n/I18nProvider';
import ThemeProvider from './theme/ThemeProvider';
import { RouterProvider, Routes } from './router/Router';
import { routes } from "./routes";

export default function App() {
  const [query, setQuery] = useState('');
  return (
    <I18nProvider>
      <ThemeProvider>
        <RouterProvider>
          <Navbar query={query} setQuery={setQuery} />
          <HomeSearchContext.Provider value={query}>
            <Routes routes={routes} notFound={NotFound} />
          </HomeSearchContext.Provider>
          <Footer />
        </RouterProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
