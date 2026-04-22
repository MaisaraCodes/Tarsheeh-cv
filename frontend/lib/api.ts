import type {
  JobRequest,
  JobResponse,
  CandidatesResponse,
  StatusResponse,
  ResultsResponse,
  QuestionsResponse,
} from "./types";
import {
  mockPostJob,
  mockPostCandidates,
  mockGetStatus,
  mockGetResults,
  mockGetQuestions,
  mockGetReport,
} from "./mocks";

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
  const res = await fetch(`${API_URL}/job`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
