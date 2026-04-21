'use client';

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { COPY, PHRASES } from "@/lib/brand";
import { getResults, getQuestions } from "@/lib/api";
import type { RankedCandidate } from "@/lib/types";

export default function CandidateDetailPage() {
  const { candidateId } = useParams<{ candidateId: string }>();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId") ?? "";

  const [candidate, setCandidate] = useState<RankedCandidate | null>(null);
  const [questions, setQuestions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId || !candidateId) {
      setError("Missing job or candidate identifier.");
      return;
    }

    let cancelled = false;

    Promise.all([getResults(jobId), getQuestions(candidateId)])
      .then(([resultsRes, questionsRes]) => {
        if (cancelled) return;
        const match = resultsRes.ranked_candidates.find(
          (c) => c.candidate_id === candidateId
        );
        if (!match) {
          setError("Candidate not found in this shortlist.");
          return;
        }
        setCandidate(match);
        setQuestions(questionsRes.questions);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load candidate.");
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, candidateId]);

  const isLoading = candidate === null && questions === null && error === null;
  const backHref = `/results/${jobId}`;

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
          {candidate?.name ?? "Loading..."}
        </h1>
        <div className="flex-1 h-px" style={{ background: "var(--gold-dim)" }} />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <span className="font-serif text-[18px] font-light text-muted-light">
            Loading candidate...
          </span>
        </div>
      )}

      {/* Error state */}
      {error !== null && (
        <div className="text-center py-16">
          <p className="font-serif text-[22px]" style={{ color: "#C97E7E" }}>
            {COPY.errorState}
          </p>
          <div className="mt-brand-lg">
            <Link
              href={backHref}
              className="inline-block font-sans text-[11px] font-normal uppercase tracking-label py-3 px-8 transition-colors duration-200 hover:text-ivory"
              style={{ border: "1px solid var(--gold-dim)", color: "var(--text-muted-light)" }}
            >
              Back to shortlist
            </Link>
          </div>
        </div>
      )}

      {/* Loaded content */}
      {candidate !== null && questions !== null && error === null && (
        <>
          {/* Top summary row */}
          <div className="mt-brand-lg flex items-start justify-between gap-6">
            {/* Rank */}
            <div className="flex-shrink-0">
              <p className="font-sans text-[10px] uppercase tracking-label text-muted">
                {COPY.rankLabel}
              </p>
              <p className="font-serif text-[28px] font-light text-gold-light leading-none mt-2">
                {String(candidate.rank).padStart(2, "0")}
              </p>
            </div>

            {/* Summary */}
            <div className="flex-1 max-w-prose">
              <p className="font-serif text-[18px] font-light text-ivory leading-relaxed">
                {candidate.summary}
              </p>
            </div>

            {/* Score */}
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
          <div className="mt-brand-lg w-full relative" style={{ height: "1px", background: "var(--gold-faint)" }}>
            <div
              className="absolute top-0 left-0 bg-gold"
              style={{ width: `${candidate.score}%`, height: "1px" }}
            />
          </div>

          {/* Interview Questions section */}
          <div className="mt-brand-2xl">
            <h2 className="font-serif text-[22px] font-light text-ivory">
              Interview Questions
            </h2>
            <p className="font-sans text-xs text-muted uppercase tracking-label mt-2">
              {PHRASES.interview}
            </p>

            {/* Questions list */}
            <div className="mt-brand-lg">
              {questions.map((question, index) => (
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
        </>
      )}

    </div>
  );
}
