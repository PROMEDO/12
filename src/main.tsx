import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('_mp_recover')) {
      url.searchParams.delete('_mp_recover');
      const cleaned = url.pathname + (url.search ? url.search : '') + url.hash;
      window.history.replaceState(null, '', cleaned || '/');
    }
  } catch {
    // ignore URL cleanup errors
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((reg) => reg.update().catch(() => {}))
        .catch(() => {});
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
