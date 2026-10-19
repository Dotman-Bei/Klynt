'use client';

import { useEffect } from 'react';

/**
 * Arms the entrance motion once script runs. Content is fully visible without it:
 * the hidden starting state only applies under `html.is-armed`.
 */
export function Reveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.classList.add('is-reduced');
    }
    root.classList.add('is-armed');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      root.classList.remove('is-armed');
    };
  }, []);
  return null;
}
