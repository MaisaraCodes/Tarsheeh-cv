"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from 'next-intl';
import { Link } from "@/i18n/navigation";
import { getCandidate, getQuestions } from "@/lib/api";
import type { CandidateDetail } from "@/lib/types";

export default function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId") ?? "";

  const locale = useLocale();
  const t = useTranslations('candidate');
  const tErr = useTranslations('errors');

  const [candidate, setCandidate] = useState<CandidateDetail | null>(null);
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || !candidateId) {
      setError(tErr('missingIds'));
      return;
    }

    let cancelled = false;

    getCandidate(candidateId, jobId)
      .then((candidateRes) => {
        if (cancelled) return;
        setCandidate(candidateRes);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : tErr('loadCandidate'));
      });

    getQuestions(candidateId)
      .then((questionsRes) => {
        if (cancelled) return;
        setQuestions(questionsRes.questions);
      })
      .catch(() => {
        if (cancelled) return;
        setQuestions([]);
      });

    return () => { cancelled = true; };
  }, [jobId, candidateId, tErr]);

  const isLoading = candidate === null && questions === null && error === null;
  const backHref = `/results/${jobId}`;
  const backArrow = locale === 'ar' ? '→' : '←';

  return (
    <div className="animate-fade-up max-w-3xl mx-auto w-full px-4 sm:px-6 py-brand-xl sm:py-brand-2xl">
      {/* Back link */}
      <Link
        href={backHref}
        className="link-underline inline-block font-sans text-xs uppercase tracking-label transition-colors mb-brand-lg"
        style={{ color: 'var(--muted)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--muted)'; }}
      >
        {backArrow} {t('back')}
      </Link>

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
          className="font-serif text-[22px] sm:text-[28px] font-light tracking-heading min-w-0 break-words"
          style={{ color: 'var(--text-primary)' }}
        >
          {candidate?.name ?? t('loading')}
        </h1>
        <div className="divider-shimmer flex-1 h-px" style={{ background: "var(--gold-dim)" }} />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <span
            className="font-serif text-[18px] font-light"
            style={{ color: 'var(--muted-light)' }}
          >
            {t('loadingFull')}
          </span>
        </div>
      )}

      {/* Error state */}
      {error !== null && (
        <div className="text-center py-16">
          <p className="font-serif text-[22px]" style={{ color: "var(--error)" }}>
            {t('errorState')}
          </p>
          <div className="mt-brand-lg">
            <Link
              href={backHref}
              className="inline-block font-sans text-[11px] font-normal uppercase tracking-label py-3 px-8 transition-colors duration-200"
              style={{ border: "1px solid var(--border-default)", color: "var(--muted-light)" }}
            >
              {t('back')}
            </Link>
          </div>
        </div>
      )}

      {/* Loaded content */}
      {candidate !== null && questions !== null && error === null && (
        <>
          {/* Top summary row */}
          <div className="mt-brand-lg flex flex-col sm:flex-row items-start sm:justify-between gap-6">
            {/* Rank */}
            <div className="flex-shrink-0">
              <p
                className="font-sans text-[10px] uppercase tracking-label"
                style={{ color: 'var(--muted)' }}
              >
                {t('rankLabel')}
              </p>
              <p
                className="score-display font-serif text-[28px] font-light leading-none mt-2"
                style={{ color: 'var(--gold-light)' }}
                dir="ltr"
              >
                {String(candidate.rank).padStart(2, "0")}
              </p>
            </div>

            {/* Summary */}
            <div className="flex-1 max-w-prose">
              <p
                className="font-serif text-[18px] font-light leading-relaxed"
                style={{ color: 'var(--text-primary)' }}
              >
                {candidate.summary}
              </p>
            </div>

            {/* Score */}
            <div className="flex-shrink-0 text-end">
              <p
                className="font-sans text-[10px] uppercase tracking-label"
                style={{ color: 'var(--muted)' }}
              >
                {t('scoreLabel')}
              </p>
              <p
                className="score-display font-serif text-[42px] font-light leading-none mt-2"
                style={{ color: 'var(--gold-light)' }}
                dir="ltr"
              >
                {candidate.score}
              </p>
            </div>
          </div>

          {/* Score bar */}
          <div
            className="mt-brand-lg w-full relative"
            style={{ height: "1px", background: "var(--gold-faint)" }}
          >
            <div
              className="absolute top-0 progress-bar-animated"
              style={{ width: `${candidate.score}%`, height: "1px", insetInlineStart: 0 }}
            />
          </div>

          {/* Interview Questions section */}
          <div className="mt-brand-2xl">
            <h2
              className="font-serif text-[22px] font-light"
              style={{ color: 'var(--text-primary)' }}
            >
              {t('interviewQuestionsTitle')}
            </h2>
            <p
              className="font-sans text-xs uppercase tracking-label mt-2"
              style={{ color: 'var(--muted)' }}
            >
              {t('interviewTagline')}
            </p>

            {/* Questions list */}
            <div className="mt-brand-lg">
              {questions.map((question, index) => (
                <div
                  key={index}
                  className="question-card p-5 mb-2 flex items-start gap-4 animate-fade-up"
                  style={{
                    background: 'var(--surface-2)',
                    border: "1px solid var(--border-default)",
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <span
                    className="font-serif text-[14px] flex-shrink-0"
                    style={{ color: 'var(--gold-light)' }}
                  >
                    {t('questionPrefix')}{index + 1}
                  </span>
                  <p
                    className="font-sans text-sm font-light leading-relaxed"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {question}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
