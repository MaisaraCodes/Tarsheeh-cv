"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { COPY, PHRASES } from "@/lib/brand";
import { getResults, getQuestions } from "@/lib/api";
import type { RankedCandidate } from "@/lib/types";

const SKELETON_COUNT = 5;

export default function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId") ?? "";

  const [candidate, setCandidate] = useState<RankedCandidate | null>(null);
  const [candidateError, setCandidateError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<string[] | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState<boolean>(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  // Load candidate (fast — already-computed shortlist)
  useEffect(() => {
    if (!jobId || !candidateId) {
      setCandidateError("Missing job or candidate identifier.");
      return;
    }

    let cancelled = false;
    getResults(jobId)
      .then((res) => {
        if (cancelled) return;
        const match = res.ranked_candidates.find(
          (c) => c.candidate_id === candidateId,
        );
        if (!match) {
          setCandidateError("Candidate not found in this shortlist.");
          return;
        }
        setCandidate(match);
      })
      .catch((err) => {
        if (cancelled) return;
        setCandidateError(
          err instanceof Error ? err.message : "Failed to load candidate.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, candidateId]);

  // Load questions (slow — generated lazily by GPT-4o)
  useEffect(() => {
    if (!candidateId) return;

    let cancelled = false;
    setQuestionsLoading(true);
    setQuestionsError(null);

    getQuestions(candidateId)
      .then((res) => {
        if (cancelled) return;
        setQuestions(res.questions);
        setQuestionsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setQuestionsError(
          err instanceof Error ? err.message : "Failed to load questions.",
        );
        setQuestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [candidateId, retryToken]);

  const retryQuestions = useCallback(() => {
    setQuestions(null);
    setRetryToken((n) => n + 1);
  }, []);

  const backHref = `/results/${jobId}`;
  const isCandidateLoading = candidate === null && candidateError === null;

  return (
    <div className="animate-fade-up max-w-3xl mx-auto w-full px-6 py-brand-2xl">
      {/* Back link */}
      <Link
        href={backHref}
        className="inline-block font-sans text-xs uppercase tracking-label text-muted hover:text-ivory transition-colors mb-brand-lg"
      >
        ← Back to shortlist
      </Link>

      {/* Section header */}
      <div className="flex items-baseline gap-6 mb-12">
        <span className="font-serif text-[13px] font-light text-gold tracking-logo flex-shrink-0">
          05
        </span>
        <h1 className="font-serif text-[28px] font-light text-ivory tracking-heading flex-shrink-0">
          {candidate?.name ?? (candidateError ? "—" : "Loading…")}
        </h1>
        <div
          className="flex-1 h-px"
          style={{ background: "var(--gold-dim)" }}
        />
      </div>

      {/* Candidate-level error */}
      {candidateError !== null && (
        <div className="text-center py-16">
          <p className="font-serif text-[22px]" style={{ color: "#C97E7E" }}>
            {COPY.errorState}
          </p>
          <p className="font-sans text-xs text-muted mt-3">{candidateError}</p>
          <div className="mt-brand-lg">
            <Link
              href={backHref}
              className="inline-block font-sans text-[11px] font-normal uppercase tracking-label py-3 px-8 transition-colors duration-200 hover:text-ivory"
              style={{
                border: "1px solid var(--gold-dim)",
                color: "var(--color-muted-light)",
              }}
            >
              Back to shortlist
            </Link>
          </div>
        </div>
      )}

      {/* Candidate skeleton (top summary) */}
      {isCandidateLoading && (
        <div className="mt-brand-lg flex items-start justify-between gap-6">
          <ShimmerBlock className="h-10 w-16" />
          <ShimmerBlock className="flex-1 h-16" />
          <ShimmerBlock className="h-12 w-20" />
        </div>
      )}

      {/* Loaded candidate summary */}
      {candidate !== null && candidateError === null && (
        <>
          <div className="mt-brand-lg flex items-start justify-between gap-6">
            <div className="flex-shrink-0">
              <p className="font-sans text-[10px] uppercase tracking-label text-muted">
                {COPY.rankLabel}
              </p>
              <p className="font-serif text-[28px] font-light text-gold-light leading-none mt-2">
                {String(candidate.rank).padStart(2, "0")}
              </p>
            </div>

            <div className="flex-1 max-w-prose">
              <p className="font-serif text-[18px] font-light text-ivory leading-relaxed">
                {candidate.summary}
              </p>
            </div>

            <div className="flex-shrink-0 text-right">
              <p className="font-sans text-[10px] uppercase tracking-label text-muted">
                {COPY.scoreLabel}
              </p>
              <p className="font-serif text-[42px] font-light text-gold-light leading-none mt-2">
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
              className="absolute top-0 left-0 bg-gold"
              style={{ width: `${candidate.score}%`, height: "1px" }}
            />
          </div>
        </>
      )}

      {/* Interview Questions section — always rendered (with skeleton/error/retry) */}
      {candidateError === null && (
        <div className="mt-brand-2xl">
          <h2 className="font-serif text-[22px] font-light text-ivory">
            Interview Questions
          </h2>
          <p className="font-sans text-xs text-muted uppercase tracking-label mt-2">
            {questionsLoading
              ? "Preparing tailored questions…"
              : PHRASES.interview}
          </p>

          <div className="mt-brand-lg" aria-live="polite" aria-busy={questionsLoading}>
            {/* Loading skeleton */}
            {questionsLoading && (
              <div>
                {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-noir-3 p-5 mb-2 flex items-start gap-4"
                    style={{
                      border: "1px solid var(--gold-dim)",
                    }}
                  >
                    <span className="font-serif text-gold-light text-[14px] flex-shrink-0 opacity-60">
                      Q{i + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <ShimmerBlock className="h-3 w-11/12" />
                      <ShimmerBlock className="h-3 w-9/12" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error + retry */}
            {!questionsLoading && questionsError !== null && (
              <div
                className="bg-noir-3 p-6 text-center"
                style={{ border: "1px solid var(--gold-dim)" }}
              >
                <p
                  className="font-serif text-[18px] font-light"
                  style={{ color: "#C97E7E" }}
                >
                  We couldn&apos;t prepare the interview questions.
                </p>
                <p className="font-sans text-xs text-muted mt-2">
                  {questionsError}
                </p>
                <button
                  type="button"
                  onClick={retryQuestions}
                  className="mt-brand-lg inline-block font-sans text-[11px] font-normal uppercase tracking-label py-3 px-8 transition-colors duration-200 hover:text-ivory cursor-pointer"
                  style={{
                    border: "1px solid var(--gold-dim)",
                    color: "var(--color-muted-light)",
                    background: "transparent",
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* Loaded questions */}
            {!questionsLoading &&
              questionsError === null &&
              questions !== null &&
              questions.map((question, index) => (
                <div
                  key={index}
                  className="bg-noir-3 p-5 mb-2 flex items-start gap-4 animate-fade-up"
                  style={{
                    border: "1px solid var(--gold-dim)",
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <span className="font-serif text-gold-light text-[14px] flex-shrink-0">
                    Q{index + 1}
                  </span>
                  <p className="font-sans text-sm font-light text-ivory leading-relaxed">
                    {question}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ShimmerBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded-sm ${className}`}
      style={{
        background:
          "linear-gradient(90deg, rgba(184,146,46,0.06) 0%, rgba(184,146,46,0.18) 50%, rgba(184,146,46,0.06) 100%)",
        backgroundSize: "200% 100%",
      }}
    />
  );
}
