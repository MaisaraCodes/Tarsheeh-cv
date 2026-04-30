'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { UserRound, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';

// Placeholder — replace with real auth state in the next step.
const IS_SIGNED_IN = false;

function Divider() {
  return (
    <div
      className="my-1 mx-0"
      style={{ height: '1px', background: 'var(--gold-dim)' }}
      aria-hidden="true"
    />
  );
}

function MenuItem({
  href,
  children,
  danger,
  onClick,
}: {
  href?: string;
  children: React.ReactNode;
  danger?: boolean;
  onClick?: () => void;
}) {
  const base =
    'block w-full text-start px-4 py-2.5 font-sans text-[13px] font-normal tracking-[0.08em] transition-colors duration-150 cursor-pointer';
  const color = danger
    ? 'text-[#C97E7E] hover:bg-[var(--gold-faint)] hover:text-[#C97E7E]'
    : 'hover:bg-[var(--gold-faint)] hover:text-[var(--gold)]';
  const style = danger ? { color: '#C97E7E' } : { color: 'var(--ink)' };

  if (href) {
    return (
      <Link href={href} className={`${base} ${color}`} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={`${base} ${color}`} style={style}>
      {children}
    </button>
  );
}

function CircleButton({
  onClick,
  disabled,
  children,
  label,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center rounded-full transition-colors duration-150"
      style={{
        width: 36,
        height: 36,
        border: '1px solid var(--gold-dim)',
        background: 'transparent',
        color: 'var(--gold)',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function UtilityRow() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { theme, toggleTheme } = useTheme();

  function switchLocale() {
    const next = locale === 'ar' ? 'en' : 'ar';
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2.5">
      <CircleButton
        onClick={switchLocale}
        disabled={isPending}
        label={locale === 'ar' ? 'Switch to English' : 'Switch to Arabic'}
      >
        <span className="font-sans text-[11px] font-normal uppercase tracking-[0.15em]">
          {locale === 'ar' ? 'EN' : 'AR'}
        </span>
      </CircleButton>

      <CircleButton
        onClick={toggleTheme}
        label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </CircleButton>
    </div>
  );
}

function AccountDropdown({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="menu"
      className="absolute top-full mt-2 end-0 w-52 z-50 py-1"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--gold-dim)',
        animation: 'dropdown-fade-up 180ms ease-out both',
      }}
      onClick={onClose}
    >
      {IS_SIGNED_IN ? (
        <>
          <MenuItem href="/dashboard">Dashboard</MenuItem>
          <MenuItem href="/account">Account Settings</MenuItem>
          <Divider />
          <UtilityRow />
          <Divider />
          <MenuItem danger onClick={() => {}}>Sign Out</MenuItem>
        </>
      ) : (
        <>
          <MenuItem href="/auth/signin">Sign In</MenuItem>
          <MenuItem href="/auth/signup">Create Account</MenuItem>
          <Divider />
          <UtilityRow />
        </>
      )}
    </div>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const t = useTranslations('common');
  const tNav = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const showPostAnother = pathname?.startsWith('/results/');

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href="/"
        className="font-serif text-lg sm:text-xl tracking-logo leading-none"
      >
        <span dir="ltr">
          <span className="font-light" style={{ color: 'var(--ink-2, var(--color-gold-pale))' }}>TARSHEEH</span>
          <span className="font-normal" style={{ color: 'var(--gold)' }}>.CV</span>
        </span>
      </Link>

      <div className="flex items-center gap-3 sm:gap-5">
        {showPostAnother && (
          <Link
            href="/job"
            className="font-sans text-[10px] sm:text-[11px] font-normal uppercase tracking-logo py-2 sm:py-3 px-4 sm:px-8 active:scale-[0.98] transition-transform duration-75 whitespace-nowrap"
            style={{
              color: 'var(--page, #0C0A07)',
              background: 'var(--gold)',
              border: '1px solid var(--gold)',
            }}
          >
            {t('ctaPrimary')}
          </Link>
        )}

        <div ref={containerRef} className="relative">
          <button
            type="button"
            aria-label={tNav('profileLabel')}
            aria-expanded={open}
            aria-haspopup="menu"
            onClick={() => setOpen((prev) => !prev)}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className="flex items-center justify-center w-8 h-8 transition-opacity duration-150 focus:outline-none"
            style={{ color: 'var(--gold)', opacity: open ? 0.8 : 1 }}
          >
            <UserRound size={20} strokeWidth={1.25} />
          </button>

          {!IS_SIGNED_IN && hovering && !open && (
            <div
              role="tooltip"
              className="absolute top-full z-50 pointer-events-none"
              style={{
                marginTop: '6px',
                insetInlineEnd: 0,
                background: 'var(--surface)',
                border: '1px solid var(--gold-dim)',
                padding: '8px 12px',
                whiteSpace: 'nowrap',
                animation: 'dropdown-fade-up 150ms ease-out both',
              }}
            >
              <p className="font-sans text-[11px] font-light" style={{ color: 'var(--muted)' }}>
                Sign in to access your account
              </p>
            </div>
          )}

          {open && <AccountDropdown onClose={() => setOpen(false)} />}
        </div>
      </div>
    </div>
  );
}
