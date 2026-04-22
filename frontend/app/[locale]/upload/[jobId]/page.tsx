'use client';

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/navigation";
import { postCandidates } from "@/lib/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 20;

function formatKB(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

export default function UploadPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('upload');
  const tErr = useTranslations('errors');

  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateAndMerge(existing: File[], incoming: FileList | File[]): { valid: File[]; errorMsg: string | null } {
    const list = Array.from(incoming);
    let errorMsg: string | null = null;
    const valid: File[] = [];

    for (const file of list) {
      if (file.type !== "application/pdf") {
        errorMsg = tErr('onlyPdf');
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errorMsg = tErr('fileTooLarge');
        continue;
      }
      if (existing.length + valid.length >= MAX_FILES) {
        errorMsg = tErr('maxFiles');
        break;
      }
      valid.push(file);
    }

    return { valid, errorMsg };
  }

  function addFiles(incoming: FileList | File[]) {
    const { valid, errorMsg } = validateAndMerge(files, incoming);
    setFiles((prev) => [...prev, ...valid]);
    setError(errorMsg);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(e.target.files);
    e.target.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function handleZoneClick() {
    inputRef.current?.click();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      setError(tErr('addCv'));
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("job_id", jobId);
      files.forEach((f) => formData.append("files", f));
      await postCandidates(formData);
      router.push(`/processing/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : tErr('uploadFailed'));
      setIsSubmitting(false);
    }
  }

  const dropZoneBorder = files.length > 0
    ? "1px solid var(--gold-dim)"
    : isDragging
    ? "1px dashed var(--color-gold)"
    : "1px dashed var(--gold-dim)";

  const isDisabled = files.length === 0 || isSubmitting;

  return (
    <div className="animate-fade-up max-w-2xl mx-auto w-full px-4 sm:px-6 py-brand-xl sm:py-brand-2xl">

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

      {/* Intro */}
      <p className="font-serif text-[18px] sm:text-[22px] font-light text-ivory mb-brand-xl">
        {t('intro')}
      </p>

      <form onSubmit={handleSubmit} noValidate>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="application/pdf"
          className="hidden"
          onChange={handlePickerChange}
        />

        {/* Drop zone */}
        <div
          onClick={handleZoneClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="w-full min-h-[200px] bg-noir-2 flex flex-col items-center justify-center cursor-pointer select-none px-6"
          style={{ border: dropZoneBorder, opacity: isDragging ? 0.8 : 1 }}
        >
          <p className="font-serif text-[18px] font-light text-ivory text-center">
            {t('dropzone')}
          </p>
          <p className="font-sans text-xs text-muted mt-2 text-center">
            {t('hint')}
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div
            className="bg-noir-3 p-4 mt-brand-lg"
            style={{ border: "1px solid var(--gold-dim)" }}
          >
            {files.map((file, i) => (
              <div key={`${file.name}-${i}`}>
                {i > 0 && (
                  <div className="h-px my-3" style={{ background: "var(--gold-faint)" }} />
                )}
                <div className="flex items-center gap-3">
                  <span className="font-sans text-sm font-light text-ivory flex-1 truncate">
                    {file.name}
                  </span>
                  <span
                    className="font-sans text-xs text-muted flex-shrink-0"
                    dir="ltr"
                  >
                    {formatKB(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="font-sans text-[10px] uppercase tracking-label text-muted hover:text-ivory flex-shrink-0 ms-2"
                  >
                    {t('remove')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Submit */}
        <div className="mt-brand-xl">
          <button
            type="submit"
            disabled={isDisabled}
            className={[
              "font-sans text-[11px] font-normal uppercase tracking-logo text-noir bg-gold py-3 px-8 active:scale-[0.98] transition-transform duration-75",
              isDisabled ? "opacity-50 cursor-not-allowed" : "",
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
