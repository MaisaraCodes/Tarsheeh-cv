'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter as useNextRouter } from 'next/navigation';
import { Link, useRouter } from '@/i18n/navigation';
import { MoreHorizontal, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthGuard } from '@/lib/useAuthGuard';
import { deleteJob, renameJob } from '@/lib/api';
import type { UserJobItem } from '@/lib/types';

type FilterValue = 'all' | 'processing' | 'complete' | 'failed';

function relativeTime(dateStr: string, locale: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diff < 60) return rtf.format(-Math.floor(diff), 'second');
  if (diff < 3600) return rtf.format(-Math.floor(diff / 60), 'minute');
  if (diff < 86400) return rtf.format(-Math.floor(diff / 3600), 'hour');
  if (diff < 2592000) return rtf.format(-Math.floor(diff / 86400), 'day');
  if (diff < 31536000) return rtf.format(-Math.floor(diff / 2592000), 'month');
  return rtf.format(-Math.floor(diff / 31536000), 'year');
}

function normalizeStatus(status: string): FilterValue {
  if (status === 'completed') return 'complete';
  if (status === 'error' || status === 'failed') return 'failed';
  return 'processing';
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 6,
        padding: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
        <div style={{ width: '60%', height: 22 }} className="skeleton-bone" />
        <div style={{ width: 24, height: 24 }} className="skeleton-bone" />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: '1rem' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ width: 56, height: 20, borderRadius: 999 }} className="skeleton-bone" />
        ))}
      </div>
      <div style={{ width: '35%', height: 11 }} className="skeleton-bone" />
    </div>
  );
}

// ── Three-dot menu ────────────────────────────────────────────────────────────

const menuItemBase: React.CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'start',
  padding: '8px 14px',
  fontFamily: 'var(--font-sans)',
  fontSize: 13,
  fontWeight: 400,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  background: 'transparent',
  border: 'none',
};

function DropdownMenuItem({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      style={{ ...menuItemBase, color: danger ? 'var(--error)' : 'var(--text-primary)' }}
      onClick={onClick}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--gold-faint)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function CardMenu({
  onEdit,
  onRename,
  onDelete,
  t,
}: {
  onEdit: () => void;
  onRename: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
      <button
        type="button"
        aria-label="Menu"
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--muted)',
          flexShrink: 0,
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--gold)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
      >
        <MoreHorizontal size={16} strokeWidth={1.5} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            insetInlineEnd: 0,
            marginTop: 4,
            minWidth: 140,
            background: 'var(--surface)',
            border: '1px solid var(--gold-dim)',
            zIndex: 40,
          }}
          className="dropdown-enter"
        >
          <DropdownMenuItem onClick={() => { setOpen(false); onEdit(); }}>{t('menuEdit')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => { setOpen(false); onRename(); }}>{t('menuRename')}</DropdownMenuItem>
          <DropdownMenuItem danger onClick={() => { setOpen(false); onDelete(); }}>{t('menuDelete')}</DropdownMenuItem>
        </div>
      )}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, t }: { status: string; t: ReturnType<typeof useTranslations> }) {
  const norm = normalizeStatus(status);

  let label: string;
  let color: string;
  let borderColor: string;
  let bg: string;

  if (norm === 'complete') {
    label = t('status.complete');
    color = '#5A9E6F';
    borderColor = '#5A9E6F';
    bg = 'transparent';
  } else if (norm === 'failed') {
    label = t('status.failed');
    color = 'var(--error)';
    borderColor = 'var(--error)';
    bg = 'transparent';
  } else {
    label = t('status.processing');
    color = 'var(--gold-text)';
    borderColor = 'var(--gold-dim)';
    bg = 'var(--gold-faint)';
  }

  return (
    <span
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 10,
        fontWeight: 400,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: 999,
        background: bg,
        color,
        border: `1px solid ${borderColor}`,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

// ── Job card ──────────────────────────────────────────────────────────────────

function JobCard({
  job,
  locale,
  t,
  onRequestDelete,
  onRenameSuccess,
}: {
  job: UserJobItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  onRequestDelete: (id: string) => void;
  onRenameSuccess: (id: string, title: string) => void;
}) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(job.title);
  const [renameSaving, setRenameSaving] = useState(false);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const skills = job.parsed_profile?.skills ?? [];
  const visibleSkills = skills.slice(0, 5);
  const extraCount = skills.length - 5;

  function handleCardClick() {
    if (isRenaming) return;
    router.push(`/results/${job.job_id}`);
  }

  function handleStartRename() {
    setRenameValue(job.title);
    setIsRenaming(true);
    setTimeout(() => renameInputRef.current?.focus(), 0);
  }

  async function handleSaveRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === job.title) { setIsRenaming(false); return; }
    setRenameSaving(true);
    try {
      await renameJob(job.job_id, trimmed);
      onRenameSuccess(job.job_id, trimmed);
    } finally {
      setRenameSaving(false);
      setIsRenaming(false);
    }
  }

  return (
    <div
      role="button"
      tabIndex={isRenaming ? -1 : 0}
      onClick={handleCardClick}
      onKeyDown={e => { if (e.key === 'Enter' && !isRenaming) handleCardClick(); }}
      className="card-hover"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 6,
        padding: '1.5rem',
        cursor: isRenaming ? 'default' : 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        outline: 'none',
      }}
      onMouseEnter={e => {
        if (!isRenaming) (e.currentTarget as HTMLElement).style.borderColor = 'var(--gold-dim)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)';
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {isRenaming ? (
            <form onSubmit={handleSaveRename} onClick={e => e.stopPropagation()}>
              <input
                ref={renameInputRef}
                className="auth-input"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                disabled={renameSaving}
                style={{ fontSize: 15, padding: '4px 8px' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button
                  type="submit"
                  disabled={renameSaving}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11,
                    fontWeight: 400,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '4px 12px',
                    background: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    border: 'none',
                    cursor: renameSaving ? 'not-allowed' : 'pointer',
                    opacity: renameSaving ? 0.6 : 1,
                  }}
                >
                  {t('renameSave')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRenaming(false)}
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 11,
                    fontWeight: 400,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    padding: '4px 12px',
                    background: 'transparent',
                    color: 'var(--muted)',
                    border: '1px solid var(--border-default)',
                    cursor: 'pointer',
                  }}
                >
                  {t('renameCancel')}
                </button>
              </div>
            </form>
          ) : (
            <p
              className="font-serif"
              style={{
                fontSize: 20,
                fontWeight: 300,
                color: 'var(--text-primary)',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {job.title}
            </p>
          )}
        </div>

        {!isRenaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <StatusBadge status={job.status} t={t} />
            <CardMenu
              t={t}
              onEdit={() => router.push(`/job?edit=${job.job_id}`)}
              onRename={handleStartRename}
              onDelete={() => onRequestDelete(job.job_id)}
            />
          </div>
        )}
      </div>

      {/* Skill chips */}
      {visibleSkills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {visibleSkills.map(skill => (
            <span
              key={skill}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: '0.06em',
                padding: '4px 10px',
                borderRadius: 999,
                background: 'var(--gold-faint)',
                color: 'var(--gold-text)',
                whiteSpace: 'nowrap',
              }}
            >
              {skill}
            </span>
          ))}
          {extraCount > 0 && (
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 10,
                fontWeight: 400,
                letterSpacing: '0.06em',
                padding: '4px 10px',
                borderRadius: 999,
                background: 'transparent',
                color: 'var(--muted)',
                border: '1px solid var(--border-default)',
                whiteSpace: 'nowrap',
              }}
            >
              {t('skillsMore', { count: extraCount })}
            </span>
          )}
        </div>
      )}

      {/* Date */}
      <p
        style={{
          fontFamily: 'var(--font-sans)',
          fontSize: 11,
          fontWeight: 300,
          color: 'var(--muted)',
        }}
      >
        {relativeTime(job.created_at, locale)}
      </p>
    </div>
  );
}

// ── Delete confirmation modal ──────────────────────────────────────────────────

function DeleteModal({
  onConfirm,
  onCancel,
  t,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const [text, setText] = useState('');
  const confirmed = text === 'DELETE';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--error)',
          padding: '2.5rem',
          width: '100%',
          maxWidth: 420,
        }}
        onClick={e => e.stopPropagation()}
      >
        <h2
          className="font-serif"
          style={{
            fontSize: 24,
            fontWeight: 300,
            color: 'var(--text-primary)',
            marginBottom: '0.75rem',
            letterSpacing: '0.04em',
          }}
        >
          {t('deleteConfirmTitle')}
        </h2>
        <p
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 300,
            color: 'var(--muted)',
            marginBottom: '1.5rem',
            lineHeight: 1.6,
          }}
        >
          {t('deleteConfirmBody')}
        </p>
        <input
          className="auth-input"
          placeholder={t('deleteConfirmPlaceholder')}
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ marginBottom: '1.25rem' }}
          autoFocus
          dir="ltr"
        />
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!confirmed}
            style={{
              flex: 1,
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              padding: '0.75rem',
              background: confirmed ? 'var(--error)' : 'var(--surface-2)',
              color: confirmed ? '#fff' : 'var(--muted)',
              border: `1px solid ${confirmed ? 'var(--error)' : 'var(--border-default)'}`,
              cursor: confirmed ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s ease',
            }}
          >
            {t('deleteConfirmButton')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              padding: '0.75rem',
              background: 'transparent',
              color: 'var(--muted)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
            }}
          >
            {t('cancelDelete')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filter chip ───────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-sans)',
        fontSize: 11,
        fontWeight: active ? 500 : 400,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        padding: '6px 14px',
        borderRadius: 999,
        background: active ? 'var(--btn-primary-bg)' : 'var(--surface-2)',
        color: active ? 'var(--btn-primary-text)' : 'var(--muted)',
        border: active ? '1px solid var(--btn-primary-bg)' : '1px solid var(--border-default)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const nextRouter = useNextRouter();
  const user = useAuthGuard();

  const [jobs, setJobs] = useState<UserJobItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadJobs() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        if (active) setLoadingJobs(false);
        return;
      }

      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, status, created_at, parsed_profile')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (!active) return;

      if (error) {
        setFetchError(t('errorState'));
      } else {
        const rows = (data ?? []).map(row => ({
          job_id: row.id as string,
          title: row.title as string,
          status: row.status as string,
          created_at: row.created_at as string,
          parsed_profile: row.parsed_profile as UserJobItem['parsed_profile'],
        }));
        setJobs(rows);
      }
      setLoadingJobs(false);
    }

    void loadJobs();
    return () => { active = false; };
  }, [t]);

  async function handleConfirmDelete() {
    if (!deletingJobId) return;
    const id = deletingJobId;
    setDeletingJobId(null);
    setJobs(prev => prev.filter(j => j.job_id !== id));
    try {
      await deleteJob(id);
    } catch {
      // Rollback: re-fetch to restore the deleted item
      if (user) {
        const { data } = await supabase
          .from('jobs')
          .select('id, title, status, created_at, parsed_profile')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (data) {
          setJobs(data.map(row => ({
            job_id: row.id as string,
            title: row.title as string,
            status: row.status as string,
            created_at: row.created_at as string,
            parsed_profile: row.parsed_profile as UserJobItem['parsed_profile'],
          })));
        }
      }
    }
  }

  function handleRenameSuccess(id: string, title: string) {
    setJobs(prev => prev.map(j => j.job_id === id ? { ...j, title } : j));
  }

  const filteredJobs = jobs.filter(job => {
    if (search && !job.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'all') return true;
    return normalizeStatus(job.status) === filter;
  });

  // Auth loading (user=undefined) or jobs loading
  const isLoading = user === undefined || (user !== null && loadingJobs);

  return (
    <div style={{ background: 'var(--page)', flex: 1 }} className="animate-fade-up">
      <div className="container-brand py-10 sm:py-14">

        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: '2.5rem',
            flexWrap: 'wrap',
          }}
        >
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

          <Link
            href="/job"
            className="btn-glow"
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              padding: '8px 20px',
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: '1px solid var(--btn-primary-bg)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {t('postNewRole')}
          </Link>
        </div>

        {/* Filter bar — hidden while loading */}
        {!isLoading && !fetchError && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
              marginBottom: '2rem',
            }}
          >
            <input
              className="auth-input"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: '1 1 200px', maxWidth: 300 }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <FilterChip label={t('filterAll')} active={filter === 'all'} onClick={() => setFilter('all')} />
              <FilterChip label={t('filterProcessing')} active={filter === 'processing'} onClick={() => setFilter('processing')} />
              <FilterChip label={t('filterComplete')} active={filter === 'complete'} onClick={() => setFilter('complete')} />
              <FilterChip label={t('filterFailed')} active={filter === 'failed'} onClick={() => setFilter('failed')} />
            </div>
          </div>
        )}

        {/* Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Error */}
        {fetchError && !isLoading && (
          <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
            <p className="font-serif" style={{ fontSize: 22, color: 'var(--error)' }}>
              {fetchError}
            </p>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && filteredJobs.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: '5rem', paddingBottom: '5rem' }}>
            <p
              className="font-serif"
              style={{
                fontSize: 26,
                fontWeight: 300,
                color: 'var(--text-primary)',
                marginBottom: '0.75rem',
              }}
            >
              {t('emptyTitle')}
            </p>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 300,
                color: 'var(--muted)',
                marginBottom: '2rem',
              }}
            >
              {t('emptySubtext')}
            </p>
            <Link
              href="/job"
              style={{
                display: 'inline-block',
                fontFamily: 'var(--font-sans)',
                fontSize: 11,
                fontWeight: 400,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                padding: '12px 32px',
                background: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                border: '1px solid var(--btn-primary-bg)',
                textDecoration: 'none',
              }}
            >
              {t('postNewRole')}
            </Link>
          </div>
        )}

        {/* Cards grid */}
        {!isLoading && !fetchError && filteredJobs.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job, i) => (
              <div
                key={job.job_id}
                className="animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <JobCard
                  job={job}
                  locale={locale}
                  t={t}
                  onRequestDelete={setDeletingJobId}
                  onRenameSuccess={handleRenameSuccess}
                />
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Delete modal */}
      {deletingJobId && (
        <DeleteModal
          t={t}
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingJobId(null)}
        />
      )}
    </div>
  );
}
