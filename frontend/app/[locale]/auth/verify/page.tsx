import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function VerifyPage() {
  const t = await getTranslations('auth');

  return (
    <div
      className="flex flex-1 items-center justify-center px-4 py-12"
      style={{ background: 'var(--page)' }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--gold-dim)',
          padding: '3rem',
          width: '100%',
          maxWidth: 440,
        }}
      >
        <div
          className="w-10 h-10 flex items-center justify-center mb-6"
          style={{ border: '1px solid var(--gold-dim)' }}
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5"
            style={{ color: 'var(--gold)' }}
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        <h1
          className="font-serif text-2xl font-light mb-3"
          style={{ color: 'var(--ink)', letterSpacing: '0.04em' }}
        >
          {t('verifyTitle')}
        </h1>

        <p className="font-sans text-[13px] font-light mb-2" style={{ color: 'var(--ink)' }}>
          {t('verifyBody')}
        </p>

        <p className="font-sans text-[12px] font-light mb-8" style={{ color: 'var(--muted)' }}>
          {t('verifySub')}
        </p>

        <Link
          href="/auth/signin"
          className="font-sans text-[12px] font-light transition-opacity duration-150 hover:opacity-70"
          style={{ color: 'var(--gold)' }}
        >
          {t('backToSignIn')}
        </Link>
      </div>
    </div>
  );
}
