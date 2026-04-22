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
      const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
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
    <div className="animate-fade-up max-w-4xl mx-auto w-full px-6 py-brand-2xl">

      {/* Section header */}
      <div className="flex items-baseline gap-6 mb-12">
        <span
          className="font-serif text-[13px] font-light text-gold tracking-logo flex-shrink-0"
          dir="ltr"
        >
          {t('num')}
        </span>
        <h1 className="font-serif text-[28px] font-light text-ivory tracking-heading flex-shrink-0">
          {t('title')}
        </h1>
        <div className="flex-1 h-px" style={{ background: "var(--gold-dim)" }} />
      </div>

      {/* Sub-header row */}
      <div className="mt-4 flex justify-between items-end">
        <div>
          <p className="font-serif text-[22px] font-light text-ivory">
            {t('intro')}
          </p>
          <p className="font-sans text-xs text-muted uppercase tracking-label mt-2">
            {t('tagline')}
          </p>
        </div>
        {topScore !== undefined && (
          <div className="text-end">
            <p
              className="font-sans text-[10px] uppercase tracking-label"
              style={{ color: "var(--text-muted)" }}
            >
              {t('topScore')}
            </p>
            <p
              className="font-serif text-[42px] font-light text-gold-light leading-none"
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
            <span className="font-serif text-[18px] font-light text-muted-light">
              {t('loading')}
            </span>
          </div>
        )}

        {error !== null && results === null && (
          <div className="text-center py-16">
            <p className="font-serif text-[22px]" style={{ color: "#C97E7E" }}>
              {t('errorState')}
            </p>
            <div className="mt-brand-lg">
              <Link
                href="/job"
                className="inline-block font-sans text-[11px] font-normal uppercase tracking-label py-3 px-8 transition-colors duration-200 hover:text-ivory"
                style={{ border: "1px solid var(--gold-dim)", color: "var(--text-muted-light)" }}
              >
                {tCommon('tryAgain')}
              </Link>
            </div>
          </div>
        )}

        {results !== null && results.ranked_candidates.length === 0 && (
          <div className="text-center py-16">
            <p className="font-serif text-[22px] text-muted-light">
              {t('empty')}
            </p>
          </div>
        )}

        {results !== null && results.ranked_candidates.length > 0 && (
          <div
            className="bg-noir-2 p-brand-lg"
            style={{ border: "1px solid var(--gold-dim)" }}
          >
            {results.ranked_candidates.map((candidate: RankedCandidate, i: number) => (
              <div key={candidate.candidate_id} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                {i > 0 && (
                  <div className="h-px" style={{ background: "var(--gold-faint)" }} />
                )}
                <Link
                  href={`/candidates/${candidate.candidate_id}?jobId=${jobId}`}
                  className="flex items-start gap-4 py-4 hover:bg-noir-3 cursor-pointer -mx-brand-lg px-brand-lg transition-colors duration-200"
                >
                  {/* Rank */}
                  <span
                    className={`font-serif text-[16px] font-light flex-shrink-0 w-8 ${
                      candidate.rank === 1 ? "text-gold-light" : "text-muted"
                    }`}
                    dir="ltr"
                  >
                    {String(candidate.rank).padStart(2, "0")}
                  </span>

                  {/* Name + summary */}
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-[18px] font-light text-ivory">
                      {candidate.name}
                    </p>
                    <p className="font-sans text-xs text-muted-light mt-1 leading-relaxed line-clamp-2">
                      {candidate.summary}
                    </p>
                  </div>

                  {/* Score bar + number */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div
                      className="relative"
                      style={{ width: "80px", height: "1px", background: "var(--gold-faint)" }}
                    >
                      <div
                        className="absolute top-0"
                        style={{
                          width: `${candidate.score}%`,
                          height: "1px",
                          background: "var(--color-gold-light)",
                          insetInlineStart: 0,
                        }}
                      />
                    </div>
                    <span
                      className="font-serif text-[14px] text-muted-light text-end"
                      style={{ minWidth: "28px" }}
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
            className={[
              "font-sans text-[11px] font-normal uppercase tracking-logo text-noir bg-gold py-3 px-8 active:scale-[0.98] transition-transform duration-75",
              isDownloading ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
            style={{ border: "1px solid var(--color-gold)" }}
          >
            {isDownloading ? t('downloadingReport') : t('ctaReport')}
          </button>

          {error !== null && (
            <p className="font-sans text-xs text-center mt-4" style={{ color: "#C97E7E" }}>
              {error}
            </p>
          )}
        </div>
      )}

    </div>
  );
}
