import { Link } from '@/i18n/navigation';

export default function ComingSoon() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center"
      style={{ background: 'var(--page)' }}
    >
      <p
        className="font-serif text-3xl sm:text-4xl tracking-logo leading-none mb-6"
        dir="ltr"
      >
        <span className="font-light" style={{ color: 'var(--text-display)' }}>
          TARSHEEH
        </span>
        <span className="font-normal" style={{ color: 'var(--gold)' }}>.CV</span>
      </p>

      <div
        className="mb-6"
        style={{ width: 56, height: '1px', background: 'var(--gold-dim)' }}
        aria-hidden="true"
      />

      <p
        className="font-serif text-[24px] font-light italic mb-3"
        style={{ color: 'var(--text-primary)' }}
      >
        This feature is on its way.
      </p>

      <p
        className="font-sans text-[12px] font-light mb-10"
        style={{ color: 'var(--muted)' }}
      >
        We are putting the final touches on this section.
      </p>

      <Link
        href="/"
        className="font-sans text-[11px] font-normal uppercase py-3 px-8 transition-opacity duration-150 hover:opacity-80"
        style={{
          border: '1px solid var(--border-default)',
          color: 'var(--gold)',
          letterSpacing: '0.15em',
        }}
      >
        Return to Homepage
      </Link>
    </div>
  );
}
