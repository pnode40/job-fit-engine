export interface JobFitEvaluation {
  levelingAnalysis: string;
  matchScore: number;
  skillsScore: number;
  seniorityScore: number;
  domainScore: number;
  goodFitReasons: string[];
  badFitReasons: string[];
  recommendation: "STRONG_FIT" | "GOOD_FIT" | "PARTIAL_FIT" | "WEAK_FIT" | "DO_NOT_APPLY";
  recommendationReasoning: string;
  keywords: { skill: string; matched: boolean }[];
}

export interface GeneratedDocuments {
  resumeMarkdown: string;
  coverLetterMarkdown: string;
  interviewPlaybookMarkdown: string;
}

export async function evaluateJobFit(
  dossier: string,
  jobDescription: string
): Promise<JobFitEvaluation> {
  const response = await fetch('/api/evaluate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dossier, jobDescription }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to evaluate job fit (${response.status}: ${response.statusText})`);
  }

  return response.json();
}

export async function generateDocuments(
  dossier: string,
  jobDescription: string
): Promise<GeneratedDocuments> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ dossier, jobDescription }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to generate documents (${response.status}: ${response.statusText})`);
  }

  return response.json();
}
