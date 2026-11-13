import { useEffect } from 'react';

/**
 * Globální animace při scrollu: každý prvek s atributem [data-reveal]
 * dostane po vstupu do viewportu třídu .is-visible (viz global.css).
 * Zpoždění lze nastavit přes style={{ '--d': '120ms' }}.
 */
export function useReveal() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observed = new WeakSet();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' },
    );

    const scan = () => {
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        if (observed.has(el)) return;
        observed.add(el);
        if (prefersReduced) el.classList.add('is-visible');
        else io.observe(el);
      });
    };

    scan();
    // nové prvky (např. po přepnutí filtru) se zaregistrují automaticky
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}
