'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';

type PageState = 'loading' | 'expired' | 'error';

export default function AuthCallbackPage() {
  const t = useTranslations('authCallback');
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorDescription, setErrorDescription] = useState('');
  const [newLinkHref, setNewLinkHref] = useState('/auth/signup');

  useEffect(() => {
    const hash = window.location.hash.slice(1); // strip leading #
    const params = new URLSearchParams(hash);

    const error = params.get('error');
    const errorCode = params.get('error_code');
    const rawDesc = params.get('error_description') ?? '';
    const type = params.get('type');

    // Infer which auth flow the user came from
    if (type === 'recovery') {
      setNewLinkHref('/auth/signin');
    }

    if (error) {
      setErrorDescription(rawDesc.replace(/\+/g, ' '));
      setPageState(
        error === 'access_denied' && errorCode === 'otp_expired' ? 'expired' : 'error'
      );
      return;
    }

    // No error in hash — wait for Supabase to exchange the token for a session.
    // onAuthStateChange fires as soon as the client processes the hash fragment.
    let timer: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        clearTimeout(timer);
        subscription.unsubscribe();
        router.replace('/dashboard');
      }
    });

    // Also handle the case where the session was already established before
    // this component mounted (e.g. user refreshed the callback page).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        clearTimeout(timer);
        subscription.unsubscribe();
        router.replace('/dashboard');
      }
    });

    // Fallback: if no session arrives within 6 s, show a generic error.
    timer = setTimeout(() => {
      subscription.unsubscribe();
      setPageState('error');
    }, 6000);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [router]);

  // While waiting for the session exchange, show a minimal loading state.
  if (pageState === 'loading') {
    return (
      <div
        className="flex flex-1 items-center justify-center"
        style={{ background: 'var(--page)' }}
      >
        <span className="font-serif text-[18px] font-light" style={{ color: 'var(--muted)' }}>
          &hellip;
        </span>
      </div>
    );
  }

  const isExpired = pageState === 'expired';
  const title   = isExpired ? t('expired.title')  : t('error.title');
  const subtext  = isExpired ? t('expired.subtext') : (errorDescription || t('error.subtext'));

  return (
    <div
      className="flex flex-1 items-center justify-center px-4 py-12"
      style={{ background: 'var(--page)' }}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-default)',
          padding: '3rem',
          width: '100%',
          maxWidth: 440,
        }}
      >
        {/* Icon */}
        <div
          className="w-10 h-10 flex items-center justify-center mb-6"
          style={{ border: '1px solid var(--border-default)' }}
          aria-hidden="true"
        >
          {isExpired ? (
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
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              style={{ color: 'var(--error)' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>

        <h1
          className="font-serif text-[28px] font-light mb-4"
          style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}
        >
          {title}
        </h1>

        <p
          className="font-sans text-[13px] font-light mb-8 leading-relaxed"
          style={{ color: 'var(--muted)' }}
        >
          {subtext}
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href={newLinkHref}
            className="w-full font-sans text-[11px] font-normal uppercase py-3.5 text-center transition-opacity duration-150 hover:opacity-85"
            style={{
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              letterSpacing: '0.15em',
            }}
          >
            {t('expired.newLink')}
          </Link>

          <Link
            href="/"
            className="w-full font-sans text-[11px] font-light uppercase py-3 text-center transition-opacity duration-150 hover:opacity-70"
            style={{
              border: '1px solid var(--border-default)',
              color: 'var(--muted)',
              letterSpacing: '0.15em',
            }}
          >
            {t('returnHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
