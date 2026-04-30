'use client';

// Delete account uses supabase.rpc('delete_user'). This requires a Postgres function
// in your Supabase project. Run once in the Supabase SQL editor:
//
//   CREATE OR REPLACE FUNCTION delete_user()
//   RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
//   BEGIN
//     DELETE FROM auth.users WHERE id = auth.uid();
//   END;
//   $$;

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { useRouter } from '@/i18n/navigation';
import type { User } from '@supabase/supabase-js';

// ── Shared primitives ───────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
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
        <p className="font-sans text-[11px] font-light" style={{ color: '#C97E7E' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-4 mb-6">
      <h2
        className="font-serif text-[22px] font-light flex-shrink-0"
        style={{ color: 'var(--ink)', letterSpacing: '0.04em' }}
      >
        {children}
      </h2>
      <div className="flex-1 h-px" style={{ background: 'var(--gold-dim)' }} />
    </div>
  );
}

function GoldButton({
  loading,
  label,
  loadingLabel,
  type = 'submit',
  onClick,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
  type?: 'submit' | 'button';
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={loading}
      onClick={onClick}
      className="font-sans text-[11px] font-normal uppercase py-3 px-6 transition-opacity duration-150"
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

function PwInput({
  value,
  onChange,
  autoComplete,
  showLabel,
  hideLabel,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  showLabel: string;
  hideLabel: string;
  hasError: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className={`auth-input${hasError ? ' input-error' : ''}`}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        style={{ paddingInlineEnd: '2.75rem' }}
      />
      <button
        type="button"
        onClick={() => setShow(p => !p)}
        aria-label={show ? hideLabel : showLabel}
        className="absolute inset-y-0 flex items-center px-3 transition-opacity duration-150 hover:opacity-70"
        style={{ insetInlineEnd: 0, color: 'var(--muted)' }}
      >
        {show ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
      </button>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--gold-dim)',
  padding: '2.5rem',
};

// ── Section components (each owns its own state) ────────────────────────────

function PersonalInfoSection({ user }: { user: User }) {
  const t = useTranslations('account');
  const meta = user.user_metadata ?? {};

  // Initialize directly from props — no useEffect needed
  const [firstName,   setFirstName]   = useState<string>(meta.first_name   ?? '');
  const [lastName,    setLastName]     = useState<string>(meta.last_name    ?? '');
  const [companyName, setCompanyName]  = useState<string>(meta.company_name ?? '');
  const [loading,     setLoading]      = useState(false);
  const [error,       setError]        = useState('');
  const [saved,       setSaved]        = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({
      data: {
        first_name:   firstName.trim(),
        last_name:    lastName.trim(),
        company_name: companyName.trim(),
      },
    });
    setLoading(false);
    if (err) { setError(t('errSave')); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <section style={cardStyle}>
      <SectionTitle>{t('personalInfoTitle')}</SectionTitle>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label={t('firstName')}>
            <input
              type="text"
              className="auth-input"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              autoComplete="given-name"
              dir="auto"
            />
          </Field>
          <Field label={t('lastName')}>
            <input
              type="text"
              className="auth-input"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              autoComplete="family-name"
              dir="auto"
            />
          </Field>
        </div>

        <Field label={t('companyName')}>
          <input
            type="text"
            className="auth-input"
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            autoComplete="organization"
            dir="auto"
          />
        </Field>

        {error && (
          <p className="font-sans text-[11px] font-light" style={{ color: '#C97E7E' }}>{error}</p>
        )}

        <div className="flex items-center gap-4">
          <GoldButton loading={loading} label={t('saveChanges')} loadingLabel={t('saving')} />
          {saved && (
            <span className="font-sans text-[12px] font-light" style={{ color: 'var(--gold)' }}>
              {t('saved')}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function SecuritySection({ userEmail }: { userEmail: string }) {
  const t = useTranslations('account');
  const tAuth = useTranslations('auth');

  const [open,        setOpen]        = useState(false);
  const [currentPw,   setCurrentPw]   = useState('');
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});
  const [saved,       setSaved]       = useState(false);

  function resetForm() {
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setFieldErrors({}); setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof fieldErrors = {};
    if (!currentPw) errs.current = t('errRequired');
    if (!newPw) errs.new = t('errRequired');
    else if (newPw.length < 8) errs.new = t('errPasswordShort');
    if (!confirmPw) errs.confirm = t('errRequired');
    else if (newPw !== confirmPw) errs.confirm = t('errPasswordMismatch');
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setError('');

    if (userEmail) {
      const { error: reAuthErr } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPw,
      });
      if (reAuthErr) {
        setLoading(false);
        setFieldErrors({ current: t('errCurrentPassword') });
        return;
      }
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);
    if (updateErr) { setError(t('errSave')); return; }

    setSaved(true);
    setOpen(false);
    resetForm();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <section style={cardStyle}>
      <SectionTitle>{t('securityTitle')}</SectionTitle>

      {!open ? (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-sans text-[11px] font-normal uppercase py-3 px-6 transition-colors duration-150"
            style={{
              border: '1px solid var(--gold-dim)',
              color: 'var(--gold)',
              letterSpacing: '0.15em',
              cursor: 'pointer',
            }}
          >
            {t('changePassword')}
          </button>
          {saved && (
            <span className="font-sans text-[12px] font-light" style={{ color: 'var(--gold)' }}>
              {t('passwordSaved')}
            </span>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <Field label={t('currentPassword')} error={fieldErrors.current}>
            <PwInput
              value={currentPw}
              onChange={v => { setCurrentPw(v); setFieldErrors(p => ({ ...p, current: undefined })); }}
              autoComplete="current-password"
              showLabel={tAuth('showPassword')}
              hideLabel={tAuth('hidePassword')}
              hasError={!!fieldErrors.current}
            />
          </Field>

          <Field label={t('newPassword')} error={fieldErrors.new}>
            <PwInput
              value={newPw}
              onChange={v => { setNewPw(v); setFieldErrors(p => ({ ...p, new: undefined })); }}
              autoComplete="new-password"
              showLabel={tAuth('showPassword')}
              hideLabel={tAuth('hidePassword')}
              hasError={!!fieldErrors.new}
            />
          </Field>

          <Field label={t('confirmNewPassword')} error={fieldErrors.confirm}>
            <PwInput
              value={confirmPw}
              onChange={v => { setConfirmPw(v); setFieldErrors(p => ({ ...p, confirm: undefined })); }}
              autoComplete="new-password"
              showLabel={tAuth('showPassword')}
              hideLabel={tAuth('hidePassword')}
              hasError={!!fieldErrors.confirm}
            />
          </Field>

          {error && (
            <p className="font-sans text-[11px] font-light" style={{ color: '#C97E7E' }}>{error}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <GoldButton loading={loading} label={t('savePassword')} loadingLabel={t('savingPassword')} />
            <button
              type="button"
              onClick={() => { setOpen(false); resetForm(); }}
              className="font-sans text-[11px] font-light uppercase transition-opacity duration-150 hover:opacity-70"
              style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}
            >
              {t('cancelPasswordChange')}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function DangerZoneSection() {
  const t = useTranslations('account');
  const router = useRouter();

  const [showModal,    setShowModal]    = useState(false);
  const [confirm,      setConfirm]      = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  function closeModal() {
    setShowModal(false);
    setConfirm('');
    setError('');
  }

  async function handleDelete() {
    if (confirm !== 'DELETE') return;
    setLoading(true);
    setError('');

    const { error: rpcErr } = await supabase.rpc('delete_user');
    if (rpcErr) {
      setLoading(false);
      setError(t('errDelete'));
      return;
    }

    await supabase.auth.signOut();
    router.push('/');
  }

  return (
    <>
      <section
        style={{
          ...cardStyle,
          border: '1px solid rgba(201,126,126,0.3)',
        }}
      >
        <SectionTitle>{t('dangerZoneTitle')}</SectionTitle>

        <p className="font-sans text-[13px] font-light mb-6" style={{ color: 'var(--muted)' }}>
          {t('dangerZoneBody')}
        </p>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="font-sans text-[11px] font-normal uppercase py-3 px-6 transition-opacity duration-150 hover:opacity-80"
          style={{
            border: '1px solid rgba(201,126,126,0.5)',
            color: '#C97E7E',
            letterSpacing: '0.15em',
            cursor: 'pointer',
          }}
        >
          {t('deleteAccount')}
        </button>
      </section>

      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 px-4"
          style={{ background: 'rgba(12,10,7,0.88)' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            className="w-full flex flex-col gap-5"
            style={{
              background: 'var(--surface)',
              border: '1px solid rgba(201,126,126,0.4)',
              padding: '2.5rem',
              maxWidth: 400,
              animation: 'dropdown-fade-up 180ms ease-out both',
            }}
          >
            <h3
              className="font-serif text-[20px] font-light"
              style={{ color: 'var(--ink)', letterSpacing: '0.04em' }}
            >
              {t('deleteConfirmTitle')}
            </h3>

            <p className="font-sans text-[13px] font-light" style={{ color: 'var(--muted)' }}>
              {t('deleteConfirmBody')}
            </p>

            <input
              type="text"
              className="auth-input"
              placeholder={t('deleteConfirmPlaceholder')}
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(''); }}
              dir="ltr"
              spellCheck={false}
              autoComplete="off"
            />

            {error && (
              <p className="font-sans text-[11px] font-light" style={{ color: '#C97E7E' }}>{error}</p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                disabled={confirm !== 'DELETE' || loading}
                onClick={handleDelete}
                className="font-sans text-[11px] font-normal uppercase py-3 px-6 transition-opacity duration-150"
                style={{
                  background: confirm === 'DELETE' ? '#C97E7E' : 'transparent',
                  border: '1px solid rgba(201,126,126,0.5)',
                  color: confirm === 'DELETE' ? '#0C0A07' : '#C97E7E',
                  letterSpacing: '0.15em',
                  opacity: (confirm !== 'DELETE' || loading) ? 0.5 : 1,
                  cursor: (confirm !== 'DELETE' || loading) ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? t('deleting') : t('deleteConfirmButton')}
              </button>

              <button
                type="button"
                onClick={closeModal}
                className="font-sans text-[11px] font-light uppercase transition-opacity duration-150 hover:opacity-70"
                style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}
              >
                {t('cancelDelete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const user = useAuthGuard();
  const t = useTranslations('account');

  if (user === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--page)' }}>
        <span className="font-serif text-[18px] font-light" style={{ color: 'var(--muted)' }}>
          &hellip;
        </span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 w-full" style={{ background: 'var(--page)' }}>
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-brand-xl sm:py-brand-2xl">

        <div className="flex items-baseline gap-4 mb-10 sm:mb-14">
          <h1
            className="font-serif text-[22px] sm:text-[28px] font-light flex-shrink-0"
            style={{ color: 'var(--ink)', letterSpacing: '0.04em' }}
          >
            {t('title')}
          </h1>
          <div className="flex-1 h-px" style={{ background: 'var(--gold-dim)' }} />
        </div>

        <div className="flex flex-col gap-10">
          <PersonalInfoSection user={user} />
          <SecuritySection userEmail={user.email ?? ''} />
          <DangerZoneSection />
        </div>

      </div>
    </div>
  );
}
