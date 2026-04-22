import type {
  JobRequest,
  JobResponse,
  CandidatesResponse,
  StatusResponse,
  ResultsResponse,
  QuestionsResponse,
  RankedCandidate,
} from "./types";

const jobStartTimes = new Map<string, number>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mockPostJob(_body: JobRequest): Promise<JobResponse> {
  await delay(500);
  const job_id = "mock-" + crypto.randomUUID();
  return { job_id, status: "processing" };
}

export async function mockPostCandidates(formData: FormData): Promise<CandidatesResponse> {
  await delay(800);
  const job_id = formData.get("job_id") as string;
  jobStartTimes.set(job_id, Date.now());
  const files = formData.getAll("files");
  return { job_id, candidates_queued: files.length, status: "processing" };
}

export async function mockGetStatus(jobId: string): Promise<StatusResponse> {
  // If jobId is unknown (e.g. dev server restarted mid-session), elapsed defaults to 0 → stage "intake"
  const start = jobStartTimes.get(jobId) ?? Date.now();
  const elapsed = (Date.now() - start) / 1000;

  if (elapsed < 1.5) {
    return { job_id: jobId, stage: "intake", progress: 10, status: "processing" };
  } else if (elapsed < 5) {
    return { job_id: jobId, stage: "cv_analyzer", progress: 35, status: "processing" };
  } else if (elapsed < 7) {
    return { job_id: jobId, stage: "ranking", progress: 60, status: "processing" };
  } else if (elapsed < 9) {
    return { job_id: jobId, stage: "interview", progress: 80, status: "processing" };
  } else if (elapsed < 10) {
    return { job_id: jobId, stage: "report", progress: 95, status: "processing" };
  } else {
    // stage remains "report" to match the last state machine node.
    // After completion, stage is informational only — UI must branch on status, not stage.
    return { job_id: jobId, stage: "report", progress: 100, status: "complete" };
  }
}

const MOCK_CANDIDATES: RankedCandidate[] = [
  {
    candidate_id: "mock-candidate-1",
    name: "Sarah Al-Mansouri",
    score: 94,
    rank: 1,
    summary:
      "Exceptional product design background with 8 years across fintech and e-commerce. Strong systems thinking and a consistent record of shipping at scale.",
  },
  {
    candidate_id: "mock-candidate-2",
    name: "Reem Khalid",
    score: 84,
    rank: 2,
    summary:
      "Senior UX designer with deep user research expertise. Led end-to-end design for a B2B SaaS product used by 40,000+ active users.",
  },
  {
    candidate_id: "mock-candidate-3",
    name: "Lara Farouk",
    score: 76,
    rank: 3,
    summary:
      "Solid generalist designer with cross-functional collaboration strengths. Well-suited for fast-moving product teams; limited exposure to enterprise contexts.",
  },
  {
    candidate_id: "mock-candidate-4",
    name: "Noura Al-Rashidi",
    score: 70,
    rank: 4,
    summary:
      "Mid-level designer showing strong growth trajectory. Portfolio demonstrates visual craft; would benefit from more complex problem-scoping experience.",
  },
];

export async function mockGetResults(jobId: string): Promise<ResultsResponse> {
  await delay(300);
  return { job_id: jobId, ranked_candidates: MOCK_CANDIDATES };
}

export async function mockGetQuestions(candidateId: string): Promise<QuestionsResponse> {
  await delay(400);
  return {
    candidate_id: candidateId,
    job_id: "mock-job-id",
    questions: [
      "Walk me through a product decision you made that turned out to be wrong. How did you know, and what did you do next?",
      "Describe a situation where you had to align stakeholders who held fundamentally opposing views on what the product should do. What was your role and what did the outcome look like?",
      "Tell me about the most technically constrained project you've worked on. How did those constraints shape your design decisions?",
      "How do you decide when a problem is worth spending three days on versus three hours? Give me a recent example.",
      "What does 'done' mean to you for a shipped feature, and how do you know when you've actually reached it?",
    ],
  };
}

export async function mockGetReport(_jobId: string): Promise<Blob> {
  await delay(600);
  return new Blob(["Mock PDF report"], { type: "application/pdf" });
}
