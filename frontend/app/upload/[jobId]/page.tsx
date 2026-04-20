'use client';

import { useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { COPY } from "@/lib/brand";
import { postCandidates } from "@/lib/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_FILES = 20;

function formatKB(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}

function validateAndMerge(existing: File[], incoming: FileList | File[]): { valid: File[]; errorMsg: string | null } {
  const list = Array.from(incoming);
  let errorMsg: string | null = null;
  const valid: File[] = [];

  for (const file of list) {
    if (file.type !== "application/pdf") {
      errorMsg = "Only PDF files are accepted.";
      continue;
    }
    if (file.size > MAX_FILE_SIZE) {
      errorMsg = "File exceeds 10MB limit.";
      continue;
    }
    if (existing.length + valid.length >= MAX_FILES) {
      errorMsg = "Maximum 20 files.";
      break;
    }
    valid.push(file);
  }

  return { valid, errorMsg };
}

export default function UploadPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError("Add at least one CV.");
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
      setError(err instanceof Error ? err.message : "Upload failed.");
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
    <div className="max-w-2xl mx-auto w-full px-6 py-brand-2xl">

      {/* Section header */}
      <div className="flex items-baseline gap-6 mb-12">
        <span className="font-serif text-[13px] font-light text-gold tracking-logo flex-shrink-0">
          02
        </span>
        <h1 className="font-serif text-[28px] font-light text-ivory tracking-heading flex-shrink-0">
          Upload CVs
        </h1>
        <div className="flex-1 h-px" style={{ background: "var(--gold-dim)" }} />
      </div>

      {/* Intro */}
      <p className="font-serif text-[22px] font-light text-ivory mb-brand-xl">
        Add the CVs you&apos;d like evaluated. PDF format only.
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
            {COPY.uploadPlaceholder}
          </p>
          <p className="font-sans text-xs text-muted mt-2 text-center">
            PDF format only, max 10MB per file, up to 20 files
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
                  <span className="font-sans text-xs text-muted flex-shrink-0">
                    {formatKB(file.size)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="font-sans text-[10px] uppercase tracking-label text-muted hover:text-ivory flex-shrink-0 ml-2"
                  >
                    Remove
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
              "font-sans text-[11px] font-normal uppercase tracking-logo text-noir bg-gold py-3 px-8",
              isDisabled ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
            style={{ border: "1px solid var(--color-gold)" }}
          >
            {isSubmitting ? COPY.stageIntake : COPY.ctaSecondary}
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
