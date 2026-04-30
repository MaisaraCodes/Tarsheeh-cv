'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="font-sans text-[9px] font-normal uppercase flex items-center gap-2"
        style={{ color: 'var(--muted)', letterSpacing: '0.15em' }}
      >
        {label}
        {hint && (
          <span className="normal-case tracking-normal" style={{ opacity: 0.7 }}>
            ({hint})
          </span>
        )}
      </label>
      {children}
      {error && (
        <p className="font-sans text-[11px] font-light" style={{ color: '#C97E7E' }}>
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
      className="w-full font-sans text-[11px] font-normal uppercase py-3.5 transition-opacity duration-150"
      style={{
        background: 'var(--gold)',
        color: '#0C0A07',
        letterSpacing: '0.15em',
        opacity: loading ? 0.7 : 1,
        cursor: loading ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

export default function SignUpPage() {
  const t = useTranslations('auth');
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isStartup, setIsStartup] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  function clearError(key: keyof FieldErrors) {
    setFieldErrors(p => ({ ...p, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: FieldErrors = {};
    if (!firstName.trim()) errs.firstName = t('errRequired');
    if (!lastName.trim()) errs.lastName = t('errRequired');
    if (!companyName.trim()) errs.companyName = t('errRequired');
    if (!email.trim()) {
      errs.email = t('errRequired');
    } else if (!email.includes('@')) {
      errs.email = t('errEmail');
    }
    if (!password) {
      errs.password = t('errRequired');
    } else if (password.length < 8) {
      errs.password = t('errPasswordShort');
    }
    if (!confirmPassword) {
      errs.confirmPassword = t('errRequired');
    } else if (password !== confirmPassword) {
      errs.confirmPassword = t('errPasswordMismatch');
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setAuthError('');

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      phone: phone.trim() || undefined,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          company_name: companyName.trim(),
          is_startup: isStartup,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setAuthError(t('errSignUp'));
      return;
    }

    router.push('/auth/verify');
  }

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--gold-dim)',
    padding: '3rem',
    width: '100%',
    maxWidth: 440,
  };

  return (
    <div
      className="flex flex-1 items-center justify-center px-4 py-12"
      style={{ background: 'var(--page)' }}
    >
      <div style={cardStyle}>
        <h1
          className="font-serif text-2xl font-light mb-6"
          style={{ color: 'var(--ink)', letterSpacing: '0.04em' }}
        >
          {t('signUpTitle')}
        </h1>

        {authError && (
          <p className="font-sans text-[12px] font-light mb-4" style={{ color: '#C97E7E' }}>
            {authError}
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          {/* First + Last name row */}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('firstName')} error={fieldErrors.firstName}>
              <input
                type="text"
                className={`auth-input${fieldErrors.firstName ? ' input-error' : ''}`}
                value={firstName}
                onChange={e => { setFirstName(e.target.value); clearError('firstName'); }}
                autoComplete="given-name"
                dir="auto"
              />
            </Field>
            <Field label={t('lastName')} error={fieldErrors.lastName}>
              <input
                type="text"
                className={`auth-input${fieldErrors.lastName ? ' input-error' : ''}`}
                value={lastName}
                onChange={e => { setLastName(e.target.value); clearError('lastName'); }}
                autoComplete="family-name"
                dir="auto"
              />
            </Field>
          </div>

          <Field label={t('companyName')} error={fieldErrors.companyName}>
            <input
              type="text"
              className={`auth-input${fieldErrors.companyName ? ' input-error' : ''}`}
              value={companyName}
              onChange={e => { setCompanyName(e.target.value); clearError('companyName'); }}
              autoComplete="organization"
              dir="auto"
            />
          </Field>

          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="auth-checkbox"
              checked={isStartup}
              onChange={e => setIsStartup(e.target.checked)}
            />
            <span className="font-sans text-[12px] font-light" style={{ color: 'var(--ink)' }}>
              {t('isStartup')}
            </span>
          </label>

          <Field label={t('email')} error={fieldErrors.email}>
            <input
              type="email"
              className={`auth-input${fieldErrors.email ? ' input-error' : ''}`}
              value={email}
              onChange={e => { setEmail(e.target.value); clearError('email'); }}
              autoComplete="email"
              dir="auto"
            />
          </Field>

          <Field label={t('phone')} hint={t('phoneHint')}>
            <input
              type="tel"
              className="auth-input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoComplete="tel"
              dir="auto"
            />
          </Field>

          <Field label={t('password')} error={fieldErrors.password}>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className={`auth-input${fieldErrors.password ? ' input-error' : ''}`}
                value={password}
                onChange={e => { setPassword(e.target.value); clearError('password'); }}
                autoComplete="new-password"
                style={{ paddingInlineEnd: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                aria-label={showPw ? t('hidePassword') : t('showPassword')}
                className="absolute inset-y-0 flex items-center px-3 transition-opacity duration-150 hover:opacity-70"
                style={{ insetInlineEnd: 0, color: 'var(--muted)' }}
              >
                {showPw ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
              </button>
            </div>
          </Field>

          <Field label={t('confirmPassword')} error={fieldErrors.confirmPassword}>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className={`auth-input${fieldErrors.confirmPassword ? ' input-error' : ''}`}
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); clearError('confirmPassword'); }}
                autoComplete="new-password"
                style={{ paddingInlineEnd: '2.75rem' }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(p => !p)}
                aria-label={showConfirm ? t('hidePassword') : t('showPassword')}
                className="absolute inset-y-0 flex items-center px-3 transition-opacity duration-150 hover:opacity-70"
                style={{ insetInlineEnd: 0, color: 'var(--muted)' }}
              >
                {showConfirm ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
              </button>
            </div>
          </Field>

          <GoldButton loading={loading} label={t('createAccount')} loadingLabel={t('creatingAccount')} />

          <p className="font-sans text-[12px] font-light text-center" style={{ color: 'var(--muted)' }}>
            {t('hasAccount')}{' '}
            <Link
              href="/auth/signin"
              className="transition-opacity duration-150 hover:opacity-70"
              style={{ color: 'var(--gold)' }}
            >
              {t('signInLink')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
