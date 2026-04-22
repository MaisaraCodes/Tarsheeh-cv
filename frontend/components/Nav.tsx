'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import LanguageToggle from './LanguageToggle';

function ProfileIcon({
  label,
  tooltip,
}: {
  label: string;
  tooltip: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className="relative group">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center w-7 h-7 text-muted hover:text-ivory transition-colors duration-200 cursor-pointer focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-[18px] h-[18px]"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.418 3.582-8 8-8s8 3.582 8 8" />
        </svg>
      </button>
      <div
        role="tooltip"
        className={`pointer-events-none absolute top-full mt-3 end-0 w-64 bg-noir-3 px-4 py-3 transition-opacity duration-200 z-50 group-hover:opacity-100 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ border: '1px solid var(--gold-dim)' }}
      >
        <p className="font-sans text-[11px] font-light text-muted-light leading-relaxed">
          {tooltip}
        </p>
      </div>
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const t = useTranslations('common');
  const tNav = useTranslations('nav');

  const showPostAnother = pathname?.startsWith('/results/');

  return (
    <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
      <Link
        href="/"
        className="font-serif text-lg sm:text-xl tracking-logo leading-none"
      >
        <span dir="ltr">
          <span className="font-light text-gold-pale">TARSHEEH</span>
          <span className="font-normal text-gold">.CV</span>
        </span>
      </Link>

      <div className="flex items-center gap-3 sm:gap-5">
        <ProfileIcon
          label={tNav('profileLabel')}
          tooltip={tNav('profileTooltip')}
        />
        <LanguageToggle />
        {showPostAnother && (
          <Link
            href="/job"
            className="font-sans text-[10px] sm:text-[11px] font-normal uppercase tracking-logo text-noir bg-gold py-2 sm:py-3 px-4 sm:px-8 active:scale-[0.98] transition-transform duration-75 whitespace-nowrap"
            style={{ border: '1px solid var(--color-gold)' }}
          >
            {t('ctaPrimary')}
          </Link>
        )}
      </div>
    </div>
  );
}
