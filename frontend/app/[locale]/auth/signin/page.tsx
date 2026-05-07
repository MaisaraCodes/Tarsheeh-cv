'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="font-sans text-[9px] font-normal uppercase"
        style={{ color: 'var(--muted)', letterSpacing: '0.15em' }}
      >
        {label}
      </label>
      {children}
      {error && (
        <p className="font-sans text-[11px] font-light" style={{ color: 'var(--error)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function GoldButton({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="btn-glow w-full font-sans text-[11px] font-normal uppercase py-3.5 transition-opacity duration-150"
      style={{
        background: 'var(--btn-primary-bg)',
        color: 'var(--btn-primary-text)',
        letterSpacing: '0.15em',
        opacity: loading ? 0.7 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

export default function SignInPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetFieldError, setResetFieldError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  function validate() {
    const errs: typeof fieldErrors = {};
    if (!identifier.trim()) errs.identifier = t('errRequired');
    if (!password) errs.password = t('errRequired');
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setAuthError('');

    const credentials = identifier.includes('@')
      ? { email: identifier.trim(), password }
      : { phone: identifier.trim(), password };

    const { error } = await supabase.auth.signInWithPassword(credentials);
    setLoading(false);

    if (error) {
      setAuthError(t('errSignIn'));
      return;
    }

    void rememberMe; // future: configure session persistence
    router.push('/dashboard');
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetFieldError('');
    setResetError('');

    if (!resetEmail.trim()) { setResetFieldError(t('errRequired')); return; }
    if (!resetEmail.includes('@')) { setResetFieldError(t('errEmail')); return; }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/${locale}/auth/reset-password`,
    });
    setResetLoading(false);

    if (error) { setResetError(error.message); return; }
    setResetSent(true);
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--gold-dim)',
    padding: '3rem',
    width: '100%',
    maxWidth: 440,
  };

  if (showForgot) {
    return (
      <div
        className="flex flex-1 items-center justify-center px-4 py-12"
        style={{ background: 'var(--page)' }}
      >
        <div className="auth-card-enter" style={cardStyle}>
          <h1
            className="font-serif text-2xl font-light mb-6"
            style={{ color: 'var(--ink)', letterSpacing: '0.04em' }}
          >
            {t('forgotTitle')}
          </h1>

          {resetSent ? (
            <div className="flex flex-col gap-5">
              <p className="font-sans text-[13px] font-light" style={{ color: 'var(--ink)' }}>
                {t('resetSent')}
              </p>
              <button
                type="button"
                onClick={() => { setShowForgot(false); setResetSent(false); setResetEmail(''); }}
                className="font-sans text-[12px] font-light transition-opacity duration-150 hover:opacity-70"
                style={{ color: 'var(--gold)', textAlign: 'start' }}
              >
                {t('backToSignIn')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-5" noValidate>
              <Field label={t('forgotEmailLabel')} error={resetFieldError}>
                <input
                  type="email"
                  className={`auth-input${resetFieldError ? ' input-error' : ''}`}
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  autoComplete="email"
                  dir="auto"
                />
              </Field>

              {resetError && (
                <p className="font-sans text-[11px]" style={{ color: 'var(--error)' }}>{resetError}</p>
              )}

              <GoldButton
                loading={resetLoading}
                label={t('sendReset')}
                loadingLabel={t('sendingReset')}
              />

              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="font-sans text-[12px] font-light transition-opacity duration-150 hover:opacity-70"
                style={{ color: 'var(--muted)', textAlign: 'start' }}
              >
                {t('backToSignIn')}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-1 items-center justify-center px-4 py-12"
      style={{ background: 'var(--page)' }}
    >
      <div className="auth-card-enter" style={cardStyle}>
        <h1
          className="font-serif text-2xl font-light mb-6"
          style={{ color: 'var(--ink)', letterSpacing: '0.04em' }}
        >
          {t('signInTitle')}
        </h1>

        {authError && (
          <p className="font-sans text-[12px] font-light mb-4" style={{ color: 'var(--error)' }}>
            {authError}
          </p>
        )}

        <form onSubmit={handleSignIn} className="flex flex-col gap-5" noValidate>
          <Field label={t('emailOrPhone')} error={fieldErrors.identifier}>
            <input
              type="text"
              className={`auth-input${fieldErrors.identifier ? ' input-error' : ''}`}
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); setFieldErrors(p => ({ ...p, identifier: undefined })); }}
              autoComplete="username"
              dir="auto"
            />
          </Field>

          <Field label={t('password')} error={fieldErrors.password}>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className={`auth-input${fieldErrors.password ? ' input-error' : ''}`}
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: undefined })); }}
                autoComplete="current-password"
                style={{ paddingInlineEnd: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                aria-label={showPw ? t('hidePassword') : t('showPassword')}
                className="absolute inset-y-0 flex items-center px-3 transition-opacity duration-150 hover:opacity-70"
                style={{ insetInlineEnd: 0, color: 'var(--muted)' }}
              >
                {showPw
                  ? <EyeOff size={14} strokeWidth={1.5} />
                  : <Eye size={14} strokeWidth={1.5} />}
              </button>
            </div>
          </Field>

          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="auth-checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span className="font-sans text-[12px] font-light" style={{ color: 'var(--ink)' }}>
                {t('rememberMe')}
              </span>
            </label>
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="font-sans text-[12px] font-light transition-opacity duration-150 hover:opacity-70"
              style={{ color: 'var(--gold)' }}
            >
              {t('forgotPassword')}
            </button>
          </div>

          <GoldButton loading={loading} label={t('signIn')} loadingLabel={t('signingIn')} />

          <p className="font-sans text-[12px] font-light text-center" style={{ color: 'var(--muted)' }}>
            {t('noAccount')}{' '}
            <Link
              href="/auth/signup"
              className="transition-opacity duration-150 hover:opacity-70"
              style={{ color: 'var(--gold)' }}
            >
              {t('createOne')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
