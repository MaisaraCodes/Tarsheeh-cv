'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from 'next-intl';
import { Link } from "@/i18n/navigation";
import { getResults, getReport } from "@/lib/api";
import type { ResultsResponse, RankedCandidate } from "@/lib/types";

export default function ResultsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const t = useTranslations('results');
  const tErr = useTranslations('errors');
  const tCommon = useTranslations('common');

  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    getResults(jobId)
      .then(setResults)
      .catch((err) => setError(err instanceof Error ? err.message : tErr('loadResults')));
  }, [jobId, tErr]);

  async function handleDownloadReport() {
    setIsDownloading(true);
    setError(null);
    try {
      const blob = await getReport(jobId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `Tarsheeh_Shortlist_${dateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : tErr('downloadFailed'));
    } finally {
      setIsDownloading(false);
    }
  }

  const topScore = results?.ranked_candidates[0]?.score;

  return (
    <div className="animate-fade-up max-w-4xl mx-auto w-full px-4 sm:px-6 py-brand-xl sm:py-brand-2xl">

      {/* Section header */}
      <div className="flex items-baseline gap-4 sm:gap-6 mb-8 sm:mb-12">
        <span
          className="font-serif text-[13px] font-light tracking-logo flex-shrink-0"
          style={{ color: 'var(--gold-text)' }}
          dir="ltr"
        >
          {t('num')}
        </span>
        <h1
          className="font-serif text-[22px] sm:text-[28px] font-light tracking-heading flex-shrink-0"
          style={{ color: 'var(--text-primary)' }}
        >
          {t('title')}
        </h1>
        <div className="divider-shimmer flex-1 h-px" style={{ background: "var(--gold-dim)" }} />
      </div>

      {/* Sub-header row */}
      <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <p
            className="font-serif text-[18px] sm:text-[22px] font-light"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('intro')}
          </p>
          <p
            className="font-sans text-xs uppercase tracking-label mt-2"
            style={{ color: 'var(--muted)' }}
          >
            {t('tagline')}
          </p>
        </div>
        {topScore !== undefined && (
          <div className="text-end">
            <p
              className="font-sans text-[10px] uppercase tracking-label"
              style={{ color: "var(--muted)" }}
            >
              {t('topScore')}
            </p>
            <p
              className="score-display font-serif text-[34px] sm:text-[42px] font-light leading-none"
              style={{ color: 'var(--gold-light)' }}
              dir="ltr"
            >
              {topScore}
            </p>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="mt-brand-xl">
        {results === null && error === null && (
          <div className="flex items-center justify-center py-16">
            <span
              className="font-serif text-[18px] font-light"
              style={{ color: 'var(--muted-light)' }}
            >
              {t('loading')}
            </span>
          </div>
        )}

        {error !== null && results === null && (
          <div className="text-center py-16">
            <p className="font-serif text-[22px]" style={{ color: "var(--error)" }}>
              {t('errorState')}
            </p>
            <div className="mt-brand-lg">
              <Link
                href="/job"
                className="inline-block font-sans text-[11px] font-normal uppercase tracking-label py-3 px-8 transition-colors duration-200"
                style={{ border: "1px solid var(--border-default)", color: "var(--muted-light)" }}
              >
                {tCommon('tryAgain')}
              </Link>
            </div>
          </div>
        )}

        {results !== null && results.ranked_candidates.length === 0 && (
          <div className="text-center py-16">
            <p
              className="font-serif text-[22px]"
              style={{ color: 'var(--muted-light)' }}
            >
              {t('empty')}
            </p>
          </div>
        )}

        {results !== null && results.ranked_candidates.length > 0 && (
          <div
            className="p-brand-lg"
            style={{ background: 'var(--surface)', border: "1px solid var(--border-default)" }}
          >
            {results.ranked_candidates.map((candidate: RankedCandidate, i: number) => (
              <div key={candidate.candidate_id} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                {i > 0 && (
                  <div className="h-px" style={{ background: "var(--gold-faint)" }} />
                )}
                <Link
                  href={`/candidates/${candidate.candidate_id}?jobId=${jobId}`}
                  className="result-row flex items-start gap-4 py-4 cursor-pointer -mx-brand-lg px-brand-lg transition-colors duration-200"
                  style={{ background: 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {/* Rank */}
                  <span
                    className="font-serif text-[16px] font-light flex-shrink-0 w-8"
                    style={{ color: candidate.rank === 1 ? 'var(--gold-light)' : 'var(--muted)' }}
                    dir="ltr"
                  >
                    {String(candidate.rank).padStart(2, "0")}
                  </span>

                  {/* Name + summary */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-serif text-[18px] font-light"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {candidate.name}
                    </p>
                    <p
                      className="font-sans text-xs mt-1 leading-relaxed line-clamp-2"
                      style={{ color: 'var(--muted-light)' }}
                    >
                      {candidate.summary}
                    </p>
                  </div>

                  {/* Score bar + number */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div
                      className="relative hidden sm:block"
                      style={{ width: "80px", height: "1px", background: "var(--gold-faint)" }}
                    >
                      <div
                        className="absolute top-0 progress-bar-animated"
                        style={{
                          width: `${candidate.score}%`,
                          height: "1px",
                          insetInlineStart: 0,
                        }}
                      />
                    </div>
                    <span
                      className="font-serif text-[14px] text-end"
                      style={{ color: 'var(--muted-light)', minWidth: "28px" }}
                      dir="ltr"
                    >
                      {candidate.score}
                    </span>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Download report */}
      {results !== null && results.ranked_candidates.length > 0 && (
        <div className="mt-brand-xl text-center">
          <button
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="btn-glow font-sans text-[11px] font-normal uppercase tracking-logo py-3 px-8"
            style={{
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: '1px solid var(--btn-primary-bg)',
              opacity: isDownloading ? 0.5 : 1,
              cursor: isDownloading ? 'not-allowed' : 'pointer',
            }}
          >
            {isDownloading ? t('downloadingReport') : t('ctaReport')}
          </button>

          {error !== null && (
            <p className="font-sans text-xs text-center mt-4" style={{ color: "var(--error)" }}>
              {error}
            </p>
          )}
        </div>
      )}

    </div>
  );
}
