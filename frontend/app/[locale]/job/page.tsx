'use client';

import { useState } from "react";
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/navigation";
import { postJob } from "@/lib/api";
import type { JobRequest, Locale } from "@/lib/types";

export default function JobPage() {
  const router = useRouter();
  const t = useTranslations('job');
  const tErr = useTranslations('errors');
  const locale = useLocale() as Locale;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError(tErr('bothFieldsRequired'));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const body: JobRequest = { title: title.trim(), description: description.trim(), locale };
      const res = await postJob(body);
      router.push(`/upload/${res.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : tErr('somethingWentWrong'));
      setIsSubmitting(false);
    }
  }

  return (
    <div className="animate-fade-up max-w-2xl mx-auto w-full px-4 sm:px-6 py-brand-xl sm:py-brand-2xl">

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

      {/* Intro */}
      <p
        className="font-serif text-[18px] sm:text-[22px] font-light mb-brand-xl"
        style={{ color: 'var(--text-primary)' }}
      >
        {t('intro')}
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>

        {/* Job Title */}
        <div>
          <label
            className="block font-sans text-[9px] font-normal uppercase tracking-label mb-2"
            style={{ color: 'var(--muted)' }}
          >
            {t('labelTitle')}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('placeholderTitle')}
            className="auth-input w-full text-[13px] px-4 py-[0.875rem]"
            style={{ borderBottom: "1px solid var(--gold)" }}
          />
        </div>

        {/* Job Description */}
        <div className="mt-brand-lg">
          <label
            className="block font-sans text-[9px] font-normal uppercase tracking-label mb-2"
            style={{ color: 'var(--muted)' }}
          >
            {t('labelDescription')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('placeholderDescription')}
            rows={10}
            className="auth-input w-full text-[13px] px-4 py-[0.875rem] resize-none"
            style={{ borderBottom: "1px solid var(--gold)" }}
          />
        </div>

        {/* Submit */}
        <div className="mt-brand-xl">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-glow font-sans text-[11px] font-normal uppercase tracking-logo py-3 px-8"
            style={{
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              border: '1px solid var(--btn-primary-bg)',
              opacity: isSubmitting ? 0.5 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>

          {error && (
            <p className="font-sans text-xs font-light mt-4" style={{ color: 'var(--error)' }}>
              {error}
            </p>
          )}
        </div>

      </form>
    </div>
  );
}
