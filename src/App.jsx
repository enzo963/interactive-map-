import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import NotFound from './pages/NotFound';
import { RouterProvider, Routes } from './router/Router';
import { routes } from "./routes";

export default function App() {
  return (
    <RouterProvider>
      <Navbar />
      <Routes routes={routes} notFound={NotFound} />
      <Footer />
    </RouterProvider>
  );
}
