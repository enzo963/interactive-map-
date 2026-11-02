import { createRoot } from 'react-dom/client';
import Gallery from '../src/components/site/Gallery';
import '../src/styles/global.css';
import '../src/styles/pages.css';

const picture = (label, color) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="${color}"/><text x="60" y="300" font-size="50" fill="white">${label}</text></svg>`)}`;
const images = [
  { src: picture('Synthetic image one', '#394238'), alt: 'Synthetic landscape one', caption: 'A synthetic image used only to check native gallery controls, focus and responsive captions.' },
  { src: picture('Synthetic image two', '#a8482a'), alt: 'Synthetic landscape two', caption: 'A second synthetic image with a deliberately long caption to verify wrapping on small screens without changing or publishing any heritage records.' },
];
createRoot(document.getElementById('root')).render(<main className="hb-container hb-page" id="main" tabIndex={-1}>
  <h1>Gallery accessibility fixture</h1>
  <p>Synthetic local images for browser verification. These are not heritage records.</p>
  <Gallery images={images} />
  <a href="/">Return to the archive</a>
</main>);
