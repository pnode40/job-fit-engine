// Retry wrapper: retries only on network failures (TypeError) and timeouts (AbortError).
// Does NOT retry on HTTP error responses (4xx/5xx) since those are valid server responses.
async function withNetworkRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const isNetworkError = error instanceof TypeError;
      const isAbortError = error instanceof DOMException && error.name === 'AbortError';
      if ((isNetworkError || isAbortError) && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export interface JobFitEvaluation {
  levelingAnalysis: string;
  matchScore: number;
  baseComposite: number;
  penaltyPoints: number;
  mustHaveGapCount: number;
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
  return withNetworkRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dossier, jobDescription }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to evaluate job fit (${response.status}: ${response.statusText})`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  });
}

export async function generateDocuments(
  dossier: string,
  jobDescription: string
): Promise<GeneratedDocuments> {
  return withNetworkRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dossier, jobDescription }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to generate documents (${response.status}: ${response.statusText})`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  });
}
