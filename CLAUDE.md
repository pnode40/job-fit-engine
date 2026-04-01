# CLAUDE.md — Job Fit Engine

## Project Overview

Job Fit Engine is an AI-powered career tool that evaluates how well a candidate fits a job description and generates tailored, ATS-optimized application documents. It uses a 3-dimensional scoring model (Skills, Seniority, Domain) and produces a resume, cover letter, and interview playbook.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Backend**: Express.js serverless functions on Vercel
- **AI**: Google Gemini 2.5 Pro (via `@google/genai`)
- **Key libs**: Radix UI, Framer Motion, react-markdown, pdfjs-dist, mammoth

## Project Structure

```
api/            # Serverless API endpoints (Vercel functions)
  evaluate.ts   # POST /api/evaluate — 3D fit scoring
  generate.ts   # POST /api/generate — document generation
  eval-judge.ts # POST /api/eval-judge — QA judge
dev/
  server.ts     # Express dev server (port 3000)
src/
  components/   # React UI components
  services/
    ai.ts       # API client (evaluateJobFit, generateDocuments)
  pages/
    EvalDashboard.tsx  # Testing/evaluation dashboard
  lib/
    utils.ts    # cn() utility for classname merging
```

## Development Setup

```bash
npm install

# Copy and fill in environment variables
cp .env.example .env.local
# Set GEMINI_API_KEY (required)

npm run dev     # Dev server at http://localhost:3000
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `APP_URL` | No | Application URL (AI Studio) |
| `UPSTASH_REDIS_REST_URL` | No | Redis for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Redis auth token |

## Common Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
npm run lint      # TypeScript type-check (tsc --noEmit)
npm run clean     # Remove dist/
```

## API Endpoints

### `POST /api/evaluate`
Scores a candidate against a job description.

**Input**: `{ dossier: string, jobDescription: string }`

**Output**: Evaluation with:
- `skillsScore`, `seniorityScore`, `domainScore` (0–100 each)
- `matchScore` (composite)
- `mustHaveGapCount`, `goodFitReasons`, `badFitReasons`
- `tier`: `STRONG_FIT | GOOD_FIT | PARTIAL_FIT | WEAK_FIT | DO_NOT_APPLY`

**Scoring formula**:
```
baseComposite = (skills × 0.4) + (seniority × 0.3) + (domain × 0.3)
penalty = min(mustHaveGapCount × 0.15, 0.40)
matchScore = baseComposite × (1 - penalty)
```

### `POST /api/generate`
Generates application documents.

**Input**: `{ dossier: string, jobDescription: string }`

**Output**: `{ resumeMarkdown, coverLetterMarkdown, interviewPlaybookMarkdown }`

### `POST /api/eval-judge`
QA judge for evaluating engine output quality (uses Gemini 2.5 Flash).

## AI Prompt Guidelines

These rules are enforced in the AI prompts and must not be violated:

- **Zero hallucination**: Never invent experience not present in the dossier.
- **Claim + Proof**: Every good-fit reason must cite specific dossier evidence.
- **Explicit disqualifier**: If the JD states a qualification "doesn't count," award zero credit.
- **Temperature 0**: All evaluation calls use temperature 0 for deterministic scoring.
- **Dimensional independence**: Each score (skills/seniority/domain) is computed separately.

## Security Constraints

- **CORS**: Strict origin allowlist in `api/evaluate.ts` and `api/generate.ts` — add new allowed origins there.
- **CSP**: Configured in `vercel.json` headers — do not loosen without review.
- **Input limits**: Max 50,000 chars per field; string type enforced at API boundary.
- **No iframes**: `X-Frame-Options: DENY` is set globally.

## Frontend Notes

- File uploads (PDF, .docx, .txt, .md, .csv) use lazy-loaded libs to avoid Safari crashes.
- Large libraries (`pdfjs-dist`, `mammoth`) are dynamically imported only on use.
- Dossier content is persisted to `localStorage` — use `safeGetLocalStorage` / `safeSetLocalStorage` helpers.
- API calls enforce a 5-second minimum interval between submits to prevent double-send.
- API timeout is 45 seconds.

## Deployment

Deployed on Vercel. Production branch is `main`.

```bash
# Build output
npm run build   # → dist/
```

The `vercel.json` config handles:
- SPA fallback (all routes → `index.html`)
- API rewrites (`/api/*` → serverless functions)
- Security headers (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy)
