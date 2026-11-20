import { createRoot } from 'react-dom/client';
import project from '../content/sanity-project.js';

/** /admin – Sanity Studio pro správu fotek (načítá se jen na této adrese). */
export default async function renderAdmin(root) {
  document.title = 'Správa fotek – Chata Hliněnka';
  document.querySelector('meta[name="robots"]')?.remove();
  const robots = document.createElement('meta');
  robots.name = 'robots';
  robots.content = 'noindex, nofollow';
  document.head.appendChild(robots);

  Object.assign(document.body.style, { margin: '0' });
  Object.assign(root.style, { height: '100vh' });

  if (!project.projectId) {
    createRoot(root).render(<NotConnected />);
    return;
  }

  const [{ Studio }, { default: config }] = await Promise.all([import('sanity'), import('./sanity.config.js')]);
  createRoot(root).render(<Studio config={config} />);
}

function NotConnected() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '80px auto', padding: '0 24px', lineHeight: 1.6, color: '#1b1b1b' }}>
      <h1 style={{ fontSize: 24 }}>Správa fotek zatím není připojená</h1>
      <p>
        Doplňte <code>projectId</code> projektu Sanity do souboru <code>src/content/sanity-project.js</code>. Do té doby web používá fotky uložené přímo v
        projektu.
      </p>
    </main>
  );
}
