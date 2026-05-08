'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useRouter as useNextRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { useRouter } from '@/i18n/navigation';
import type { User } from '@supabase/supabase-js';

// ── Shared primitives ─────────────────────────────────────────────────────────

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
        <p className="font-sans text-[11px] font-light" style={{ color: 'var(--error)' }}>
          {error}
        </p>
      )}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="font-serif"
      style={{
        fontSize: 22,
        fontWeight: 300,
        color: 'var(--text-primary)',
        letterSpacing: '0.04em',
        marginBottom: '1.5rem',
      }}
    >
      {children}
    </h2>
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

function Divider() {
  return <div style={{ height: 1, background: 'var(--border-default)', margin: '2rem 0' }} />;
}

// ── Sections ──────────────────────────────────────────────────────────────────

function PersonalInfoSection({ user }: { user: User }) {
  const t = useTranslations('account');
  const meta = user.user_metadata ?? {};

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
    <section>
      <SectionHeader>{t('personalInfoTitle')}</SectionHeader>

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
          <p className="font-sans text-[11px] font-light" style={{ color: 'var(--error)' }}>{error}</p>
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
  const [newPw,       setNewPw]       = useState('');
  const [confirmPw,   setConfirmPw]   = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ new?: string; confirm?: string }>({});
  const [saved,       setSaved]       = useState(false);

  void userEmail;

  function resetForm() {
    setNewPw(''); setConfirmPw('');
    setFieldErrors({}); setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof fieldErrors = {};
    if (!newPw) errs.new = t('errRequired');
    else if (newPw.length < 8) errs.new = t('errPasswordShort');
    if (!confirmPw) errs.confirm = t('errRequired');
    else if (newPw !== confirmPw) errs.confirm = t('errPasswordMismatch');
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setError('');

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    setLoading(false);
    if (updateErr) { setError(t('errSave')); return; }

    setSaved(true);
    setOpen(false);
    resetForm();
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <section>
      <SectionHeader>{t('securityTitle')}</SectionHeader>

      {!open ? (
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="font-sans text-[11px] font-normal uppercase py-3 px-6 transition-opacity duration-150 hover:opacity-80"
            style={{
              border: '1px solid var(--gold-dim)',
              color: 'var(--gold)',
              letterSpacing: '0.15em',
              cursor: 'pointer',
              background: 'transparent',
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
            <p className="font-sans text-[11px] font-light" style={{ color: 'var(--error)' }}>{error}</p>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <GoldButton loading={loading} label={t('savePassword')} loadingLabel={t('savingPassword')} />
            <button
              type="button"
              onClick={() => { setOpen(false); resetForm(); }}
              className="font-sans text-[11px] font-light uppercase transition-opacity duration-150 hover:opacity-70"
              style={{ color: 'var(--muted)', letterSpacing: '0.12em', background: 'transparent', border: 'none', cursor: 'pointer' }}
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

  const [showModal, setShowModal] = useState(false);
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  function closeModal() {
    setShowModal(false);
    setConfirm('');
    setError('');
  }

  async function handleDelete() {
    if (confirm !== 'DELETE') return;
    setLoading(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); setError(t('errDelete')); return; }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? '/api';
    const res = await fetch(`${apiUrl}/account?user_id=${encodeURIComponent(user.id)}`, { method: 'DELETE' });
    if (!res.ok) {
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
          border: '1px solid rgba(201,126,126,0.35)',
          padding: '1.5rem',
        }}
      >
        <SectionHeader>{t('dangerZoneTitle')}</SectionHeader>
        <p
          className="font-sans text-[13px] font-light"
          style={{ color: 'var(--muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}
        >
          {t('dangerZoneBody')}
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="font-sans text-[11px] font-normal uppercase py-3 px-6 transition-opacity duration-150 hover:opacity-80"
          style={{
            border: '1px solid rgba(201,126,126,0.5)',
            color: 'var(--error)',
            letterSpacing: '0.15em',
            cursor: 'pointer',
            background: 'transparent',
          }}
        >
          {t('deleteAccount')}
        </button>
      </section>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(2px)',
          }}
          onClick={e => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid rgba(201,126,126,0.4)',
              padding: '2.5rem',
              width: '100%',
              maxWidth: 400,
              animation: 'dropdown-fade-up 180ms ease-out both',
            }}
          >
            <h3
              className="font-serif"
              style={{
                fontSize: 22,
                fontWeight: 300,
                color: 'var(--text-primary)',
                letterSpacing: '0.04em',
                marginBottom: '0.75rem',
              }}
            >
              {t('deleteConfirmTitle')}
            </h3>

            <p
              className="font-sans text-[13px] font-light"
              style={{ color: 'var(--muted)', marginBottom: '1.25rem', lineHeight: 1.6 }}
            >
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
              style={{ marginBottom: '1.25rem' }}
              autoFocus
            />

            {error && (
              <p
                className="font-sans text-[11px] font-light"
                style={{ color: 'var(--error)', marginBottom: '1rem' }}
              >
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={confirm !== 'DELETE' || loading}
                onClick={handleDelete}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  fontWeight: 400,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  padding: '12px 20px',
                  background: confirm === 'DELETE' ? 'var(--error)' : 'transparent',
                  border: '1px solid rgba(201,126,126,0.5)',
                  color: confirm === 'DELETE' ? '#fff' : 'var(--error)',
                  opacity: (confirm !== 'DELETE' || loading) ? 0.55 : 1,
                  cursor: (confirm !== 'DELETE' || loading) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {loading ? t('deleting') : t('deleteConfirmButton')}
              </button>

              <button
                type="button"
                onClick={closeModal}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 11,
                  fontWeight: 300,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '12px 20px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  transition: 'opacity 0.15s ease',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  const user = useAuthGuard();
  const t = useTranslations('account');
  const tCommon = useTranslations('common');
  const nextRouter = useNextRouter();

  if (user === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--page)' }}>
        <span className="font-serif text-[18px] font-light" style={{ color: 'var(--muted)' }}>&hellip;</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex-1 w-full animate-fade-up" style={{ background: 'var(--page)' }}>
      <div className="container-brand py-10 sm:py-14">

        {/* Page title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '2.5rem' }}>
          <button
            type="button"
            onClick={() => nextRouter.back()}
            className="flex items-center gap-2"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--muted)',
              whiteSpace: 'nowrap',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--gold)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
          >
            <ArrowLeft size={14} className="rtl:rotate-180" />
            {tCommon('back')}
          </button>

          <h1
            className="font-serif"
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 32,
              fontWeight: 300,
              color: 'var(--text-primary)',
              letterSpacing: '0.04em',
            }}
          >
            {t('title')}
          </h1>

          {/* Invisible spacer keeps title visually centered */}
          <div aria-hidden="true" style={{ visibility: 'hidden', fontSize: 11, whiteSpace: 'nowrap' }}>
            {tCommon('back')}
          </div>
        </div>

        {/* Single outer card */}
        <div
          style={{
            maxWidth: 600,
            margin: '0 auto',
            background: 'var(--surface)',
            border: '1px solid var(--border-default)',
            padding: '2.5rem',
          }}
        >
          <PersonalInfoSection user={user} />
          <Divider />
          <SecuritySection userEmail={user.email ?? ''} />
          <Divider />
          <DangerZoneSection />
        </div>

      </div>
    </div>
  );
}
