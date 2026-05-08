import type {
  JobRequest,
  JobResponse,
  CandidatesResponse,
  StatusResponse,
  ResultsResponse,
  QuestionsResponse,
  RankedCandidate,
  UserJobsResponse,
} from "./types";

const jobStartTimes = new Map<string, number>();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Read the active locale from the <html lang="..."> attribute, which is
// set by the [locale]/layout.tsx server component on every render.
// Mock funcs run in the browser, so this is reliable at call time.
function activeLocale(): "ar" | "en" {
  if (typeof document === "undefined") return "en";
  const lang = document.documentElement.getAttribute("lang");
  return lang === "ar" ? "ar" : "en";
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
    return { job_id: jobId, stage: "report", progress: 100, status: "complete" };
  }
}

const MOCK_CANDIDATES_EN: RankedCandidate[] = [
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

const MOCK_CANDIDATES_AR: RankedCandidate[] = [
  {
    candidate_id: "mock-candidate-1",
    name: "سارة المنصوري",
    score: 94,
    rank: 1,
    summary:
      "خلفية استثنائية في تصميم المنتجات بثماني سنوات خبرة في التقنية المالية والتجارة الإلكترونية. تفكير منظومي قوي وسجل ثابت في إطلاق المنتجات على نطاق واسع.",
  },
  {
    candidate_id: "mock-candidate-2",
    name: "ريم خالد",
    score: 84,
    rank: 2,
    summary:
      "مصممة تجربة مستخدم أولى تمتلك خبرة عميقة في أبحاث المستخدمين. قادت تصميمًا متكاملًا لمنتج B2B SaaS يستخدمه أكثر من 40,000 مستخدم نشط.",
  },
  {
    candidate_id: "mock-candidate-3",
    name: "لارا فاروق",
    score: 76,
    rank: 3,
    summary:
      "مصممة عامة قوية بمهارات تعاون متعدد الفرق. مناسبة لفرق المنتجات السريعة الإيقاع؛ خبرتها محدودة في السياقات المؤسسية.",
  },
  {
    candidate_id: "mock-candidate-4",
    name: "نورة الراشدي",
    score: 70,
    rank: 4,
    summary:
      "مصممة من المستوى المتوسط تُظهر مسار نمو قوي. ملفها يبرز الحرفية البصرية؛ ستستفيد من تجارب أعمق في تأطير المشكلات المعقدة.",
  },
];

const MOCK_QUESTIONS_EN = [
  "Walk me through a product decision you made that turned out to be wrong. How did you know, and what did you do next?",
  "Describe a situation where you had to align stakeholders who held fundamentally opposing views on what the product should do. What was your role and what did the outcome look like?",
  "Tell me about the most technically constrained project you've worked on. How did those constraints shape your design decisions?",
  "How do you decide when a problem is worth spending three days on versus three hours? Give me a recent example.",
  "What does 'done' mean to you for a shipped feature, and how do you know when you've actually reached it?",
];

const MOCK_QUESTIONS_AR = [
  "اشرح قرار منتج اتخذته وتبيّن لاحقًا أنه خاطئ. كيف عرفت ذلك، وماذا فعلت بعدها؟",
  "صف موقفًا اضطررت فيه إلى توحيد رؤى أصحاب مصلحة لديهم وجهات نظر متعارضة جوهريًا حول وظيفة المنتج. ما كان دورك وما الذي انتهى إليه الأمر؟",
  "حدّثني عن أكثر مشروع واجهت فيه قيودًا تقنية. كيف شكّلت تلك القيود قراراتك التصميمية؟",
  "كيف تقرر متى تستحق المشكلة ثلاثة أيام من العمل مقابل ثلاث ساعات؟ أعطني مثالًا حديثًا.",
  "ماذا يعني لك مفهوم \"المنجز\" بالنسبة لميزة مُطلقة، وكيف تعرف أنك وصلت إليه فعلًا؟",
];

export async function mockGetResults(jobId: string): Promise<ResultsResponse> {
  await delay(300);
  const candidates = activeLocale() === "ar" ? MOCK_CANDIDATES_AR : MOCK_CANDIDATES_EN;
  return { job_id: jobId, ranked_candidates: candidates };
}

export async function mockGetQuestions(candidateId: string): Promise<QuestionsResponse> {
  await delay(400);
  return {
    candidate_id: candidateId,
    job_id: "mock-job-id",
    questions: activeLocale() === "ar" ? MOCK_QUESTIONS_AR : MOCK_QUESTIONS_EN,
  };
}

export async function mockGetReport(_jobId: string): Promise<Blob> {
  await delay(600);
  return new Blob(["Mock PDF report"], { type: "application/pdf" });
}

export async function mockGetJobsByUser(_userId: string): Promise<UserJobsResponse> {
  await delay(400);
  const isAr = activeLocale() === "ar";
  return {
    jobs: [
      {
        job_id: "mock-job-1",
        title: isAr ? "كبير مهندسي البرمجيات" : "Senior Software Engineer",
        status: "completed",
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        parsed_profile: { skills: ["React", "TypeScript", "Node.js", "PostgreSQL", "Docker", "AWS"] },
      },
      {
        job_id: "mock-job-2",
        title: isAr ? "مصمم منتج" : "Product Designer",
        status: "processing",
        created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        parsed_profile: { skills: ["Figma", "User Research", "Prototyping"] },
      },
      {
        job_id: "mock-job-3",
        title: isAr ? "مدير تسويق" : "Marketing Manager",
        status: "failed",
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        parsed_profile: null,
      },
      {
        job_id: "mock-job-4",
        title: isAr ? "محلل بيانات" : "Data Analyst",
        status: "candidates_pending",
        created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        parsed_profile: { skills: ["Python", "SQL", "Tableau"] },
      },
    ],
  };
}

export async function mockDeleteJob(_jobId: string): Promise<void> {
  await delay(300);
}

export async function mockRenameJob(_jobId: string, _title: string): Promise<void> {
  await delay(300);
}
