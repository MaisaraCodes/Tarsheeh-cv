'use client';

import { useEffect } from 'react';

/**
 * ScrollReveal — uses IntersectionObserver to reveal `.reveal` elements
 * and adds a `.header-scrolled` class to `.header-sticky` on scroll.
 *
 * Zero-architecture impact: just drop this component once in the layout.
 */
export default function ScrollReveal() {
  useEffect(() => {
    // ── Scroll-triggered reveal ──
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target); // one-shot
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    // ── Sticky header scroll shadow ──
    const header = document.querySelector('.header-sticky');
    function onScroll() {
      if (!header) return;
      if (window.scrollY > 8) {
        header.classList.add('header-scrolled');
      } else {
        header.classList.remove('header-scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // initial

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return null; // render-nothing component
}
