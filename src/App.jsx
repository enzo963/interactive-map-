import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import NotFound from './pages/NotFound';
import I18nProvider from './i18n/I18nProvider';
import ThemeProvider from './theme/ThemeProvider';
import { RouterProvider, Routes } from './router/Router';
import { routes } from "./routes";

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <RouterProvider>
          <Navbar />
          <Routes routes={routes} notFound={NotFound} />
          <Footer />
        </RouterProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
