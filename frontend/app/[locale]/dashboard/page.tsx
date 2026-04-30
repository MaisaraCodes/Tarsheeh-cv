'use client';

// NOTE: The jobs table in DATABASE_SCHEMA.md does not yet have a user_id column.
// This query will fail silently (returning 0 rows or an error) until Osama adds:
//   ALTER TABLE jobs ADD COLUMN user_id UUID REFERENCES auth.users(id);
// Coordinate with Osama before enabling this page in production.

import { useEffect, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthGuard } from '@/lib/useAuthGuard';

type DisplayStatus = 'processing' | 'complete' | 'failed';
type FilterValue = 'all' | DisplayStatus;

interface JobRow {
  id: string;
  title: string;
  status: string;
  created_at: string;
}

function mapStatus(dbStatus: string): DisplayStatus {
  if (dbStatus === 'completed') return 'complete';
  if (dbStatus === 'intake_pending' || dbStatus === 'candidates_pending') return 'processing';
  return 'failed';
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function StatusBadge({ status, label }: { status: DisplayStatus; label: string }) {
  if (status === 'processing') {
    return (
      <span
        className="font-sans text-[9px] font-normal uppercase inline-block px-2 py-0.5"
        style={{ background: 'var(--gold)', color: '#0C0A07', letterSpacing: '0.12em' }}
      >
        {label}
      </span>
    );
  }
  if (status === 'complete') {
    return (
      <span
        className="font-sans text-[9px] font-normal uppercase inline-block px-2 py-0.5"
        style={{ border: '1px solid #6B9E6B', color: '#6B9E6B', letterSpacing: '0.12em' }}
      >
        {label}
      </span>
    );
  }
  return (
    <span
      className="font-sans text-[9px] font-normal uppercase inline-block px-2 py-0.5"
      style={{ border: '1px solid #C97E7E', color: '#C97E7E', letterSpacing: '0.12em' }}
    >
      {label}
    </span>
  );
}

export default function DashboardPage() {
  const user = useAuthGuard();
  const t = useTranslations('dashboard');
  const locale = useLocale();

  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [fetchError, setFetchError] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterValue>('all');

  useEffect(() => {
    if (!user) return;

    supabase
      .from('jobs')
      .select('id, title, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) { setFetchError(error.message); return; }
        setJobs((data as JobRow[]) ?? []);
      });
  }, [user]);

  const filters: { value: FilterValue; label: string }[] = [
    { value: 'all',        label: t('filterAll') },
    { value: 'processing', label: t('filterProcessing') },
    { value: 'complete',   label: t('filterComplete') },
    { value: 'failed',     label: t('filterFailed') },
  ];

  const filtered = jobs.filter(job => {
    const display = mapStatus(job.status);
    const matchesFilter = activeFilter === 'all' || display === activeFilter;
    const matchesSearch = job.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const statusLabels: Record<DisplayStatus, string> = {
    processing: t('statusProcessing'),
    complete:   t('statusComplete'),
    failed:     t('statusFailed'),
  };

  // Still checking session
  if (user === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ background: 'var(--page)' }}>
        <span className="font-serif text-[18px] font-light" style={{ color: 'var(--muted)' }}>
          {t('loading')}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex-1 w-full"
      style={{ background: 'var(--page)' }}
    >
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-brand-xl sm:py-brand-2xl">

        {/* Page header */}
        <div className="flex items-baseline gap-4 sm:gap-6 mb-8 sm:mb-10">
          <h1
            className="font-serif text-[22px] sm:text-[28px] font-light flex-shrink-0"
            style={{ color: 'var(--ink)', letterSpacing: '0.04em' }}
          >
            {t('title')}
          </h1>
          <div className="flex-1 h-px" style={{ background: 'var(--gold-dim)' }} />
        </div>

        {/* Controls row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:items-center">
          {/* Search */}
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            className="auth-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: '220px' }}
          />

          {/* Filter tabs */}
          <div className="flex gap-1.5 flex-wrap sm:flex-1 sm:justify-center">
            {filters.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setActiveFilter(f.value)}
                className="font-sans text-[10px] font-normal uppercase px-3 py-1.5 transition-colors duration-150"
                style={{
                  border: '1px solid var(--gold-dim)',
                  background: activeFilter === f.value ? 'var(--gold)' : 'transparent',
                  color: activeFilter === f.value ? '#0C0A07' : 'var(--muted)',
                  letterSpacing: '0.12em',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Post new role */}
          <Link
            href="/job"
            className="font-sans text-[10px] sm:text-[11px] font-normal uppercase py-2.5 px-5 whitespace-nowrap transition-opacity duration-150 hover:opacity-85 sm:ms-auto"
            style={{
              background: 'var(--gold)',
              color: '#0C0A07',
              letterSpacing: '0.15em',
            }}
          >
            {t('postNewRole')}
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <span className="font-serif text-[18px] font-light" style={{ color: 'var(--muted)' }}>
              {t('loading')}
            </span>
          </div>
        )}

        {/* Fetch error */}
        {!loading && fetchError && (
          <p className="font-sans text-[13px] font-light text-center py-20" style={{ color: '#C97E7E' }}>
            {fetchError}
          </p>
        )}

        {/* Empty state */}
        {!loading && !fetchError && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-6">
            <p
              className="font-serif text-[22px] font-light"
              style={{ color: 'var(--muted)', letterSpacing: '0.04em' }}
            >
              {t('emptyTitle')}
            </p>
            <Link
              href="/job"
              className="font-sans text-[11px] font-normal uppercase py-3 px-8 transition-opacity duration-150 hover:opacity-85"
              style={{
                background: 'var(--gold)',
                color: '#0C0A07',
                letterSpacing: '0.15em',
              }}
            >
              {t('postNewRole')}
            </Link>
          </div>
        )}

        {/* Cards grid */}
        {!loading && !fetchError && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((job, i) => {
              const display = mapStatus(job.status);
              return (
                <Link
                  key={job.id}
                  href={`/results/${job.id}`}
                  className="block p-5 transition-colors duration-150 animate-fade-up"
                  style={{
                    border: '1px solid var(--gold-dim)',
                    background: 'var(--surface)',
                    animationDelay: `${i * 50}ms`,
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--gold-faint)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
                  }}
                >
                  <p
                    className="font-serif text-[18px] font-light leading-snug mb-2 line-clamp-2"
                    style={{ color: 'var(--ink)' }}
                  >
                    {job.title}
                  </p>
                  <p
                    className="font-sans text-[11px] font-light mb-4"
                    style={{ color: 'var(--muted)' }}
                  >
                    {t('posted')}: {formatDate(job.created_at, locale)}
                  </p>
                  <StatusBadge status={display} label={statusLabels[display]} />
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
