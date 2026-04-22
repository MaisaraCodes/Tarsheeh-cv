'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from 'next-intl';
import { Link } from "@/i18n/navigation";
import { getStatus } from "@/lib/api";
import type { PipelineStage, PipelineStatus, StatusResponse } from "@/lib/types";

const STAGE_KEYS: Array<{ key: PipelineStage; labelKey: string; msgKey: string }> = [
  { key: "intake",      labelKey: "stageIntakeLabel",     msgKey: "stageIntakeMsg" },
  { key: "cv_analyzer", labelKey: "stageScreeningLabel",  msgKey: "stageScreeningMsg" },
  { key: "ranking",     labelKey: "stageRankingLabel",    msgKey: "stageRankingMsg" },
  { key: "interview",   labelKey: "stageInterviewLabel",  msgKey: "stageInterviewMsg" },
  { key: "report",      labelKey: "stageReportLabel",     msgKey: "stageReportMsg" },
];

function stageState(
  cardStage: PipelineStage,
  current: PipelineStage | undefined,
  overallStatus: PipelineStatus | undefined
): "active" | "completed" | "pending" {
  if (overallStatus === "complete") return "completed";
  const currentIndex = STAGE_KEYS.findIndex((s) => s.key === current);
  const cardIndex = STAGE_KEYS.findIndex((s) => s.key === cardStage);
  if (cardIndex < currentIndex) return "completed";
  if (cardIndex === currentIndex) return "active";
  return "pending";
}

export default function ProcessingPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const t = useTranslations('processing');
  const tErr = useTranslations('errors');
  const tCommon = useTranslations('common');

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let hasReceivedStatus = false;

    async function poll() {
      try {
        const res = await getStatus(jobId);
        if (cancelled) return;
        hasReceivedStatus = true;
        setStatus(res);
        if (res.status === "processing") {
          timeoutId = setTimeout(poll, 2000);
        }
      } catch (err) {
        if (cancelled) return;
        // Keep polling on transient failures so a single blip doesn't kick the
        // user off the page; only surface the error if we never got a status.
        if (!hasReceivedStatus) {
          setError(err instanceof Error ? err.message : tErr('statusFailed'));
        }
        timeoutId = setTimeout(poll, 2000);
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [jobId, tErr]);

  const overallStatus = status?.status;
  const progress = status?.progress ?? 0;

  function LiveIndicator() {
    if (overallStatus === "complete") {
      return (
        <div className="flex items-center gap-2">
          <div className="w-[6px] h-[6px] rounded-full" style={{ background: "#6FCF97" }} />
          <span className="font-sans text-xs uppercase tracking-label" style={{ color: "#6FCF97" }}>
            {t('indicatorComplete')}
          </span>
        </div>
      );
    }
    if (overallStatus === "failed") {
      return (
        <div className="flex items-center gap-2">
          <div className="w-[6px] h-[6px] rounded-full" style={{ background: "#C97E7E" }} />
          <span className="font-sans text-xs uppercase tracking-label" style={{ color: "#C97E7E" }}>
            {t('indicatorFailed')}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <div className="w-[6px] h-[6px] rounded-full bg-gold animate-pulse" />
        <span className="font-sans text-xs text-gold uppercase tracking-label">
          {t('indicatorProcessing')}
        </span>
      </div>
    );
  }

  return (
    <div className="animate-fade-up max-w-4xl mx-auto w-full px-4 sm:px-6 py-brand-xl sm:py-brand-2xl">

      {/* Section header */}
      <div className="flex items-baseline gap-4 sm:gap-6 mb-8 sm:mb-12">
        <span
          className="font-serif text-[13px] font-light text-gold tracking-logo flex-shrink-0"
          dir="ltr"
        >
          {t('num')}
        </span>
        <h1 className="font-serif text-[22px] sm:text-[28px] font-light text-ivory tracking-heading flex-shrink-0">
          {t('title')}
        </h1>
        <div className="flex-1 h-px" style={{ background: "var(--gold-dim)" }} />
      </div>

      {/* Sub-header row */}
      <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <p className="font-serif text-[18px] sm:text-[22px] font-light text-ivory">
          {t('intro')}
        </p>
        <LiveIndicator />
      </div>

      {/* Trace panel */}
      <div className="mt-brand-xl">
        {status === null && error === null ? (
          <div className="min-h-[120px] flex items-center justify-center">
            <span className="font-serif text-[18px] font-light text-muted-light">
              {t('initializing')}
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-0.5">
            {STAGE_KEYS.map((stage) => {
              const state = stageState(stage.key, status?.stage, overallStatus);
              const isActive = state === "active";
              const isCompleted = state === "completed";
              const isPending = state === "pending";

              return (
                <div
                  key={stage.key}
                  className="bg-noir-2 p-4 flex flex-col justify-center items-center text-center min-h-[120px] transition-all duration-500 ease-out"
                  style={{
                    border: isActive
                      ? "1px solid var(--color-gold)"
                      : "1px solid var(--gold-faint)",
                    opacity: isPending ? 0.45 : 1,
                  }}
                >
                  {/* State badge */}
                  <span
                    className="font-sans text-[9px] uppercase tracking-label mb-2"
                    style={{
                      color: isActive
                        ? "var(--color-gold)"
                        : isCompleted
                        ? "var(--text-muted-light)"
                        : "var(--text-muted)",
                    }}
                  >
                    {isActive ? t('badgeActive') : isCompleted ? t('badgeDone') : t('badgePending')}
                  </span>

                  {/* Stage name */}
                  <span className="font-serif text-[16px] font-light text-ivory leading-tight">
                    {t(stage.labelKey)}
                  </span>

                  {/* Sub-description */}
                  <span
                    className="font-sans text-[10px] mt-2 leading-snug"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {isActive ? t(stage.msgKey) : isCompleted ? t('subDone') : t('subAwaiting')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-brand-lg">
        <div className="flex justify-between items-center mb-2">
          <span
            className="font-sans text-[10px] uppercase tracking-label"
            style={{ color: "var(--text-muted)" }}
          >
            {t('overallProgress')}
          </span>
          <span className="font-sans text-xs text-gold-light" dir="ltr">
            {progress}%
          </span>
        </div>
        <div className="w-full relative" style={{ height: "1px", background: "var(--gold-faint)" }}>
          <div
            className="absolute top-0 bg-gold transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, height: "1px", insetInlineStart: 0 }}
          />
        </div>
      </div>

      {/* Bottom section */}
      <div className="mt-brand-2xl">
        {overallStatus === "complete" && (
          <div className="text-center">
            <p className="font-serif text-[28px] font-light text-ivory">
              {t('complete')}
            </p>
            <div className="mt-brand-lg">
              <Link
                href={`/results/${jobId}`}
                className="inline-block font-sans text-[11px] font-normal uppercase tracking-logo text-noir bg-gold py-3 px-8 active:scale-[0.98] transition-transform duration-75"
                style={{ border: "1px solid var(--color-gold)" }}
              >
                {t('ctaResults')}
              </Link>
            </div>
          </div>
        )}

        {overallStatus === "failed" && (
          <div className="text-center">
            <p className="font-serif text-[22px]" style={{ color: "#C97E7E" }}>
              {t('errorState')}
            </p>
            {status?.error_message && (
              <p
                className="mt-brand-sm font-sans text-xs font-light max-w-xl mx-auto"
                style={{ color: "var(--text-muted-light)" }}
              >
                {status.error_message}
              </p>
            )}
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

        {error && overallStatus === undefined && (
          <div className="text-center">
            <p className="font-sans text-xs font-light" style={{ color: "#C97E7E" }}>
              {error}
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
      </div>

    </div>
  );
}
