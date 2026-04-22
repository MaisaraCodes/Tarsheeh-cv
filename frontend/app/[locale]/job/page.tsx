'use client';

import { useState } from "react";
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/navigation";
import { postJob } from "@/lib/api";
import type { JobRequest, Locale } from "@/lib/types";

const inputStyle: React.CSSProperties = {
  border: "1px solid var(--gold-dim)",
  borderBottom: "1px solid var(--color-gold)",
};

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
    <div className="animate-fade-up max-w-2xl mx-auto w-full px-6 py-brand-2xl">

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

      {/* Intro */}
      <p className="font-serif text-[22px] font-light text-ivory mb-brand-xl">
        {t('intro')}
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>

        {/* Job Title */}
        <div>
          <label className="block font-sans text-[9px] font-normal uppercase tracking-label text-muted mb-2">
            {t('labelTitle')}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('placeholderTitle')}
            className="w-full bg-noir-2 font-sans text-[13px] font-light text-ivory outline-none px-4 py-[0.875rem]"
            style={inputStyle}
          />
        </div>

        {/* Job Description */}
        <div className="mt-brand-lg">
          <label className="block font-sans text-[9px] font-normal uppercase tracking-label text-muted mb-2">
            {t('labelDescription')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('placeholderDescription')}
            rows={10}
            className="w-full bg-noir-2 font-sans text-[13px] font-light text-ivory outline-none px-4 py-[0.875rem] resize-none"
            style={inputStyle}
          />
        </div>

        {/* Submit */}
        <div className="mt-brand-xl">
          <button
            type="submit"
            disabled={isSubmitting}
            className={[
              "font-sans text-[11px] font-normal uppercase tracking-logo text-noir bg-gold py-3 px-8 active:scale-[0.98] transition-transform duration-75",
              isSubmitting ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
            style={{ border: "1px solid var(--color-gold)" }}
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </button>

          {error && (
            <p className="font-sans text-xs font-light text-[#C97E7E] mt-4">
              {error}
            </p>
          )}
        </div>

      </form>
    </div>
  );
}
