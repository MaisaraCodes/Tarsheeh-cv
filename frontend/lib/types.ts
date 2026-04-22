export type PipelineStage = "intake" | "cv_analyzer" | "ranking" | "interview" | "report";
export type PipelineStatus = "processing" | "complete" | "failed";

export type Locale = "en" | "ar";

export interface JobRequest {
  title: string;
  description: string;
  locale?: Locale;
}

export interface JobResponse {
  job_id: string;
  status: "processing";
}

export interface CandidatesResponse {
  job_id: string;
  candidates_queued: number;
  status: "processing";
}

export interface StatusResponse {
  job_id: string;
  stage: PipelineStage;
  progress: number;
  status: PipelineStatus;
  // Present only when status === "failed" and the backend captured a
  // human-readable reason from the failing pipeline step.
  error_message?: string | null;
}

export interface RankedCandidate {
  candidate_id: string;
  name: string;
  score: number;
  rank: number;
  summary: string;
}

export interface ResultsResponse {
  job_id: string;
  ranked_candidates: RankedCandidate[];
}

export interface QuestionsResponse {
  candidate_id: string;
  job_id: string;
  questions: string[];
}

export interface CandidateDetail {
  candidate_id: string;
  job_id: string;
  name: string;
  score: number;
  rank: number;
  summary: string;
}
