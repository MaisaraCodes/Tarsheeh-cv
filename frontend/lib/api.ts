import type {
  JobRequest,
  JobResponse,
  CandidatesResponse,
  StatusResponse,
  ResultsResponse,
  QuestionsResponse,
  CandidateDetail,
  UserJobsResponse,
} from "./types";
import {
  mockPostJob,
  mockPostCandidates,
  mockGetStatus,
  mockGetResults,
  mockGetQuestions,
  mockGetReport,
  mockGetJobsByUser,
  mockDeleteJob,
  mockRenameJob,
} from "./mocks";
import { supabase } from "@/lib/supabase";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function postJob(body: JobRequest): Promise<JobResponse> {
  if (USE_MOCK) return mockPostJob(body);

  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    userId = null;
  }

  const res = await fetch(`${API_URL}/job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, user_id: userId }),
  });
  return handleResponse<JobResponse>(res);
}

// Files are appended with repeated "files" key — standard multipart convention for arrays.
// If the backend expects a different key format, update the formData construction at the call site.
export async function postCandidates(formData: FormData): Promise<CandidatesResponse> {
  if (USE_MOCK) return mockPostCandidates(formData);
  const res = await fetch(`${API_URL}/candidates`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<CandidatesResponse>(res);
}

export async function getStatus(jobId: string): Promise<StatusResponse> {
  if (USE_MOCK) return mockGetStatus(jobId);
  const res = await fetch(`${API_URL}/status/${encodeURIComponent(jobId)}`);
  return handleResponse<StatusResponse>(res);
}

export async function getResults(jobId: string): Promise<ResultsResponse> {
  if (USE_MOCK) return mockGetResults(jobId);
  const res = await fetch(`${API_URL}/results/${encodeURIComponent(jobId)}`);
  return handleResponse<ResultsResponse>(res);
}

export async function getCandidate(
  candidateId: string,
  jobId?: string,
): Promise<CandidateDetail> {
  if (USE_MOCK) {
    // Mock fallback: derive the slim shape from the full results list.
    const results = await mockGetResults(jobId ?? "");
    const match = results.ranked_candidates.find((c) => c.candidate_id === candidateId);
    if (!match) throw new Error(`404: candidate ${candidateId} not found`);
    return { ...match, job_id: jobId ?? "" };
  }
  const qs = jobId ? `?job_id=${encodeURIComponent(jobId)}` : "";
  const res = await fetch(`${API_URL}/candidates/${encodeURIComponent(candidateId)}${qs}`);
  return handleResponse<CandidateDetail>(res);
}

export async function getQuestions(candidateId: string): Promise<QuestionsResponse> {
  if (USE_MOCK) return mockGetQuestions(candidateId);
  const res = await fetch(`${API_URL}/questions/${encodeURIComponent(candidateId)}`);
  return handleResponse<QuestionsResponse>(res);
}

export async function getReport(jobId: string): Promise<Blob> {
  if (USE_MOCK) return mockGetReport(jobId);
  const res = await fetch(`${API_URL}/report/${encodeURIComponent(jobId)}`);
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${body}`);
  }
  return res.blob();
}

export async function getJobsByUser(userId: string): Promise<UserJobsResponse> {
  if (USE_MOCK) return mockGetJobsByUser(userId);
  const res = await fetch(`${API_URL}/jobs/by-user/${encodeURIComponent(userId)}`);
  return handleResponse<UserJobsResponse>(res);
}

export async function deleteJob(jobId: string): Promise<void> {
  if (USE_MOCK) return mockDeleteJob(jobId);
  const res = await fetch(`${API_URL}/jobs/${encodeURIComponent(jobId)}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${body}`);
  }
}

export async function renameJob(jobId: string, title: string): Promise<void> {
  if (USE_MOCK) return mockRenameJob(jobId, title);
  const res = await fetch(`${API_URL}/jobs/${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${body}`);
  }
}
