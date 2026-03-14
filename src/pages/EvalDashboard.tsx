import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  FlaskConical,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { cn } from "../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Fixture {
  id: string;
  resume: string;
  jobDescription: string;
  expectedFit: "strong" | "partial" | "weak";
}

interface JudgeOutput {
  fitLevelMatch: boolean;
  gapSpecificity: number;
  recommendationQuality: number;
  scoreReasonableness: number;
  judgeRationale: string;
}

interface EngineOutput {
  matchScore: number;
  skillsScore: number;
  seniorityScore: number;
  domainScore: number;
  recommendation: "APPLY" | "DO_NOT_APPLY";
  recommendationReasoning: string;
  goodFitReasons: string[];
  badFitReasons: string[];
  levelingAnalysis: string;
  keywords: { skill: string; matched: boolean }[];
}

type ResultStatus = "pass" | "fail" | "error";

interface EvalResult {
  fixture: Fixture;
  engineOutput: EngineOutput | null;
  judgeOutput: JudgeOutput | null;
  status: ResultStatus;
  error?: string;
}

// ─── Sample Fixtures ──────────────────────────────────────────────────────────

const SAMPLE_FIXTURES: Fixture[] = [
  {
    id: "1",
    expectedFit: "strong",
    resume: `JANE DOE | jane@email.com | linkedin.com/in/janedoe | Chicago, IL

PROFESSIONAL SUMMARY
Senior Project Manager with 9 years of experience leading cross-functional product delivery in SaaS environments. PMP certified. Consistently delivered enterprise software projects on time and under budget.

PROFESSIONAL EXPERIENCE

Acme SaaS Corp | Senior Project Manager | 2018–Present | Chicago, IL
• Led 14 concurrent product delivery workstreams across engineering, design, and ops with a combined budget of $8.2M
• Reduced average sprint cycle time by 22% by implementing a hybrid Agile/Kanban framework adopted org-wide
• Managed stakeholder relationships for 3 Fortune 500 client deployments, achieving 98% on-time delivery rate
• Mentored team of 4 junior PMs; 2 promoted to senior roles within 18 months

TechFlow Inc | Project Manager | 2015–2018 | Remote
• Delivered 6 software product launches with cross-timezone teams (US, EU, APAC)
• Established a risk management playbook that reduced project escalations by 35%
• Coordinated resource allocation across 40+ engineers and designers

EDUCATION & CERTIFICATIONS
BS Business Administration – University of Illinois
PMP Certification – PMI (2017)
Certified Scrum Master (CSM) – Scrum Alliance`,
    jobDescription: `Senior Project Manager – SaaS Product Delivery

We're looking for an experienced Senior PM to own end-to-end delivery of our enterprise SaaS platform roadmap.

Requirements:
• 7+ years of project management experience in a SaaS or software environment
• PMP or equivalent certification required
• Proven track record delivering complex, multi-stakeholder software projects
• Strong familiarity with Agile, Scrum, or Kanban methodologies
• Experience managing budgets of $5M+
• Excellent communication skills with C-suite stakeholders

Nice to have:
• Experience mentoring junior PMs
• Background in enterprise client deployments`,
  },
  {
    id: "2",
    expectedFit: "weak",
    resume: `TYLER BROOKS | tyler@email.com | Austin, TX

EDUCATION
BA in Marketing Communications – University of Texas, Austin (Graduated May 2024)
GPA: 3.4

EXPERIENCE
Campus Marketing Coordinator – UT Austin Student Union | 2022–2024
• Organized 10+ campus events with 200+ attendees each
• Managed social media accounts; grew Instagram following by 3,200 followers

Marketing Intern – Local Coffee Brand | Summer 2023
• Assisted with email campaign design in Mailchimp
• Wrote 12 blog posts on food and lifestyle topics

SKILLS
Social media, Canva, Mailchimp, Microsoft Office, Google Analytics (basic)`,
    jobDescription: `Senior Software Engineer – Backend Platform

We're hiring a Senior Software Engineer to lead backend infrastructure development for our high-scale distributed systems.

Requirements:
• 5+ years of backend engineering experience
• Proficiency in Python, Go, or Java
• Deep experience with cloud infrastructure (AWS, GCP, or Azure)
• Experience designing and maintaining microservices at scale
• Strong CS fundamentals: data structures, algorithms, system design
• Experience mentoring junior engineers

Preferred:
• Experience with Kubernetes and containerized deployments
• Contributions to open source projects`,
  },
  {
    id: "3",
    expectedFit: "partial",
    resume: `MARIA CHEN | maria@email.com | Seattle, WA

PROFESSIONAL SUMMARY
High school science teacher with 7 years experience designing curriculum and facilitating hands-on learning for diverse learners. Tech-savvy educator with growing expertise in ed-tech tools and online learning design.

EXPERIENCE

Roosevelt High School | Science Teacher | 2017–Present | Seattle, WA
• Designed curriculum for 4 courses (Biology, Chemistry, AP Environmental Science, STEM elective)
• Integrated Google Classroom, Khan Academy, and Nearpod into instruction; achieved 91% student engagement scores
• Differentiated instruction for IEP/ELL students across 3 sections with 30+ students each
• Facilitated 2-week teacher training on edtech tool adoption for 18 peers

Volunteer – Code.org Workshop Facilitator | 2021–2023
• Facilitated 8 intro coding workshops for students and parents

EDUCATION
M.Ed. Curriculum & Instruction – University of Washington (2017)
B.S. Biology – University of Oregon (2015)

TECHNICAL SKILLS
Google Workspace, Articulate Storyline (basic), Nearpod, Canvas LMS, Canva`,
    jobDescription: `Instructional Designer – Corporate Learning & Development

We seek an Instructional Designer to create engaging e-learning content and training programs for a global enterprise workforce.

Requirements:
• 3+ years of experience in instructional design or L&D in a corporate setting
• Proficiency with Articulate Storyline or Rise 360
• Experience applying ADDIE or SAM instructional design models
• Strong writing and content development skills
• Familiarity with LMS platforms (Workday Learning, Cornerstone, or similar)

Preferred:
• Adult learning background (corporate vs. K-12)
• Video production experience for learning content`,
  },
  {
    id: "4",
    expectedFit: "weak",
    resume: `ROBERT KIM | robert@email.com | New York, NY

PROFESSIONAL SUMMARY
Senior Vice President of Operations with 20 years of experience directing global supply chain, logistics, and enterprise operations for Fortune 100 companies. P&L ownership of $500M+ business units.

EXPERIENCE

GlobalLogistics Corp | SVP Operations | 2012–Present | New York, NY
• Led 1,200-person global operations organization across 14 countries
• Delivered $85M in cost savings through supply chain optimization over 5 years
• Oversaw $620M annual operating budget; achieved 18% YoY efficiency improvement
• Drove digital transformation initiative integrating ERP, WMS, and AI-based demand forecasting

MegaRetail Inc | VP Supply Chain | 2006–2012 | Chicago, IL
• Managed end-to-end supply chain for $2.1B retail operation
• Negotiated $130M in vendor contracts

EDUCATION
MBA – Harvard Business School (2004)
BS Industrial Engineering – Cornell University (2002)`,
    jobDescription: `Operations Coordinator

We're looking for an Operations Coordinator to support day-to-day logistics and administrative tasks for our 50-person startup.

Responsibilities:
• Schedule meetings and manage executive calendars
• Coordinate vendor orders and office supply inventory
• Assist with onboarding logistics for new hires
• Maintain shared team folders and documentation

Requirements:
• 1–3 years of experience in an administrative or coordinator role
• Proficiency in Google Workspace and Slack
• Strong organizational skills and attention to detail
• $45,000–$55,000 salary range`,
  },
  {
    id: "5",
    expectedFit: "partial",
    resume: `ALEX MORGAN | alex@email.com | San Francisco, CA

PROFESSIONAL SUMMARY
Sales leader with 8 years of B2B enterprise sales experience, recently pivoting into AI and enterprise technology enablement. Passionate about helping organizations adopt and scale AI tools effectively.

EXPERIENCE

TechSales HQ | Senior Account Executive | 2019–2024 | San Francisco, CA
• Carried $2.1M annual quota; achieved 118% attainment in FY2023
• Sold SaaS solutions to enterprise accounts (avg deal size $180K); managed 60-account book of business
• Positioned technical products (API integrations, data pipelines) to non-technical buyers
• Ran 40+ executive product demos per quarter

SalesForce Dynamics | Account Executive | 2016–2019 | Austin, TX
• Closed $4.2M in net-new revenue over 3 years in CRM software vertical

SELF-DIRECTED AI LEARNING (2023–2024)
• Completed Stanford's AI for Everyone (Coursera) and Prompt Engineering for Developers
• Built internal GPT-4 prompt library used by 12 colleagues to automate sales outreach
• Ran 3 internal lunch-and-learns on AI productivity tools for sales team

EDUCATION
BS Business – Arizona State University (2015)`,
    jobDescription: `AI Enablement Manager – Enterprise Sales

We're hiring an AI Enablement Manager to accelerate AI adoption across our enterprise sales organization.

Responsibilities:
• Design and deliver AI training programs for 200+ sales reps globally
• Build prompt libraries, playbooks, and toolkits for AI-assisted selling
• Partner with sales leaders to identify AI use cases and ROI metrics
• Evaluate and onboard new AI tools; manage vendor relationships

Requirements:
• 5+ years of experience in sales enablement, L&D, or sales operations
• Hands-on experience with AI tools (ChatGPT, Copilot, or equivalent)
• Strong communication and facilitation skills
• Understanding of enterprise sales processes

Preferred:
• Background in sales with quota-carrying experience
• Experience building internal training programs or enablement content`,
  },
];

// ─── Star Rating Display ───────────────────────────────────────────────────────

function ScorePips({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-2 h-2 rounded-full",
            i < value ? "bg-blue-400" : "bg-zinc-700"
          )}
        />
      ))}
      <span className="ml-1.5 text-xs text-zinc-400 tabular-nums">{value}</span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function EvalDashboard() {
  const [fixtureJson, setFixtureJson] = useState(
    JSON.stringify(SAMPLE_FIXTURES, null, 2)
  );
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [results, setResults] = useState<EvalResult[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const abortRef = useRef(false);

  const loadSamples = () => {
    setFixtureJson(JSON.stringify(SAMPLE_FIXTURES, null, 2));
    setParseError(null);
  };

  const handleRunEval = async () => {
    setParseError(null);

    // Parse fixtures
    let fixtures: Fixture[];
    try {
      fixtures = JSON.parse(fixtureJson);
      if (!Array.isArray(fixtures) || fixtures.length === 0) throw new Error("Must be a non-empty JSON array");
    } catch (e: unknown) {
      setParseError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    // Validate each fixture has required keys
    for (const f of fixtures) {
      if (!f.id || !f.resume || !f.jobDescription || !f.expectedFit) {
        setParseError(`Fixture "${f.id ?? "unknown"}" is missing required fields (id, resume, jobDescription, expectedFit).`);
        return;
      }
    }

    setIsRunning(true);
    setResults([]);
    abortRef.current = false;


    const collected: EvalResult[] = [];

    for (let i = 0; i < fixtures.length; i++) {
      if (abortRef.current) break;
      const fixture = fixtures[i];
      setProgress(`Evaluating fixture ${i + 1} of ${fixtures.length} — "${fixture.id}"…`);

      let engineOutput: EngineOutput | null = null;
      let judgeOutput: JudgeOutput | null = null;
      let status: ResultStatus = "error";
      let error: string | undefined;

      try {
        // Step 1 – Call /api/evaluate
        const evalRes = await fetch("https://job-fit-engine-six.vercel.app/api/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dossier: fixture.resume, jobDescription: fixture.jobDescription }),
        });
        if (!evalRes.ok) {
          const errBody = await evalRes.json().catch(() => ({}));
          throw new Error(errBody.error || `Evaluate API returned ${evalRes.status}`);
        }
        engineOutput = await evalRes.json();

        // Step 2 – LLM-as-Judge call via serverless function
        const judgeRes = await fetch("https://job-fit-engine-six.vercel.app/api/eval-judge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fixture, engineOutput }),
        });
        if (!judgeRes.ok) {
          const errBody = await judgeRes.json().catch(() => ({}));
          throw new Error(errBody.error || `Judge API returned ${judgeRes.status}`);
        }
        judgeOutput = await judgeRes.json();

        // Validate judge output fields
        if (
          typeof judgeOutput!.fitLevelMatch !== "boolean" ||
          typeof judgeOutput!.gapSpecificity !== "number" ||
          typeof judgeOutput!.recommendationQuality !== "number" ||
          typeof judgeOutput!.scoreReasonableness !== "number" ||
          typeof judgeOutput!.judgeRationale !== "string"
        ) {
          throw new Error("Judge returned an unexpected JSON shape");
        }

        status = judgeOutput.fitLevelMatch ? "pass" : "fail";
      } catch (e: unknown) {
        error = e instanceof Error ? e.message : String(e);
        status = "error";
      }

      collected.push({ fixture, engineOutput, judgeOutput, status, error });
      // Update incrementally so user sees live progress
      setResults([...collected]);
    }

    setProgress(null);
    setIsRunning(false);
  };

  // ── Summary stats ──────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.status === "pass").length;
  const errored = results.filter((r) => r.status === "error").length;
  const judged = results.filter((r) => r.judgeOutput !== null);
  const avg = (key: keyof JudgeOutput) => {
    const vals = judged.map((r) => r.judgeOutput![key] as number).filter((v) => typeof v === "number");
    if (vals.length === 0) return "—";
    return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1);
  };

  const fitLevelLabel = (f: string) =>
    f === "strong" ? "Strong" : f === "partial" ? "Partial" : "Weak";

  const fitLevelColor = (f: string) =>
    f === "strong"
      ? "text-emerald-400"
      : f === "partial"
      ? "text-amber-400"
      : "text-red-400";

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-blue-500/30 selection:text-blue-200">
      {/* Header */}
      <header className="px-6 py-4 border-b border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-zinc-700/50">
            <FlaskConical className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Eval Dashboard</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Engine accuracy benchmarking</p>
          </div>
          <div className="ml-auto">
            <a
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Back to Job Fit Engine
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">

        {/* ── Section 1: Fixture Input ─────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="text-zinc-600 font-mono text-sm">01</span>
                Fixture Input
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                Paste a JSON array of test cases, or load the built-in sample set.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={loadSamples}
              disabled={isRunning}
              className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm"
            >
              Load Sample Fixtures
            </Button>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4">
            <Textarea
              value={fixtureJson}
              onChange={(e) => {
                setFixtureJson(e.target.value);
                setParseError(null);
              }}
              disabled={isRunning}
              className="min-h-[280px] bg-zinc-950/60 border-zinc-800 text-zinc-300 font-mono text-xs resize-y focus-visible:ring-1 focus-visible:ring-blue-500/50 placeholder:text-zinc-700 rounded-xl p-4 leading-relaxed"
              placeholder='[{"id": "1", "resume": "...", "jobDescription": "...", "expectedFit": "strong"}]'
            />
            {parseError && (
              <div className="mt-3 flex items-start gap-2 bg-red-950/30 border border-red-800/40 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-400">{parseError}</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Section 2: Run Eval ──────────────────────────────────────────── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="text-zinc-600 font-mono text-sm">02</span>
              Run Eval
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Runs each fixture through the evaluate API, then grades it with a Gemini 2.5 Flash judge.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              size="lg"
              onClick={handleRunEval}
              disabled={isRunning}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 font-semibold shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
            >
              {isRunning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Run Batch Eval
                </>
              )}
            </Button>

            <AnimatePresence>
              {progress && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-zinc-400"
                >
                  {progress}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ── Section 3: Results ───────────────────────────────────────────── */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="text-zinc-600 font-mono text-sm">03</span>
                  Results
                </h2>
              </div>

              {/* Summary bar */}
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl px-5 py-4 flex flex-wrap gap-6 items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-white">
                    {passed} of {results.length} passed
                  </span>
                  {errored > 0 && (
                    <span className="text-xs text-red-400 ml-1">({errored} error{errored !== 1 ? "s" : ""})</span>
                  )}
                </div>
                <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
                <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
                  <span>Avg Gap Specificity: <strong className="text-white">{avg("gapSpecificity")}</strong></span>
                  <span>Avg Rec Quality: <strong className="text-white">{avg("recommendationQuality")}</strong></span>
                  <span>Avg Score Reasonableness: <strong className="text-white">{avg("scoreReasonableness")}</strong></span>
                </div>
              </div>

              {/* Results table */}
              <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl overflow-hidden">
                {/* Table header */}
                <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_5rem] gap-2 px-4 py-3 border-b border-zinc-800/50 bg-zinc-900/60">
                  {["#", "Expected Fit", "Fit Match", "Gap (1-5)", "Rec Quality", "Score", "Status"].map((h) => (
                    <div key={h} className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                      {h}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                <div className="divide-y divide-zinc-800/30">
                  {results.map((result, idx) => {
                    const isExpanded = expandedRow === result.fixture.id;
                    const j = result.judgeOutput;

                    return (
                      <div key={result.fixture.id}>
                        {/* Row */}
                        <button
                          onClick={() => setExpandedRow(isExpanded ? null : result.fixture.id)}
                          className="w-full grid grid-cols-[2rem_1fr_1fr_1fr_1fr_1fr_5rem] gap-2 px-4 py-3.5 text-left hover:bg-zinc-800/20 transition-colors items-center"
                        >
                          <div className="flex items-center gap-1">
                            {isExpanded
                              ? <ChevronDown className="w-3 h-3 text-zinc-500" />
                              : <ChevronRight className="w-3 h-3 text-zinc-600" />
                            }
                            <span className="text-xs text-zinc-500 font-mono">{idx + 1}</span>
                          </div>

                          <div className={cn("text-xs font-medium", fitLevelColor(result.fixture.expectedFit))}>
                            {fitLevelLabel(result.fixture.expectedFit)}
                          </div>

                          <div>
                            {result.status === "error" ? (
                              <span className="text-xs text-zinc-600">—</span>
                            ) : j?.fitLevelMatch ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                          </div>

                          <div>
                            {j ? <ScorePips value={j.gapSpecificity} /> : <span className="text-xs text-zinc-600">—</span>}
                          </div>

                          <div>
                            {j ? <ScorePips value={j.recommendationQuality} /> : <span className="text-xs text-zinc-600">—</span>}
                          </div>

                          <div>
                            {j ? <ScorePips value={j.scoreReasonableness} /> : <span className="text-xs text-zinc-600">—</span>}
                          </div>

                          <div>
                            {result.status === "pass" && (
                              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/25 px-2">
                                PASS
                              </Badge>
                            )}
                            {result.status === "fail" && (
                              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-400 border-amber-500/25 px-2">
                                FAIL
                              </Badge>
                            )}
                            {result.status === "error" && (
                              <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/25 px-2">
                                ERROR
                              </Badge>
                            )}
                          </div>
                        </button>

                        {/* Expanded detail */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 pt-3 bg-zinc-950/40 border-t border-zinc-800/30 space-y-4">

                                {result.status === "error" && (
                                  <div className="flex items-start gap-2 bg-red-950/30 border border-red-800/40 rounded-xl p-3">
                                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                                    <p className="text-xs text-red-400">{result.error}</p>
                                  </div>
                                )}

                                {result.judgeOutput && (
                                  <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-3">
                                    <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-1">Judge Rationale</p>
                                    <p className="text-xs text-blue-200/80 leading-relaxed">{result.judgeOutput.judgeRationale}</p>
                                  </div>
                                )}

                                {result.engineOutput && (
                                  <div className="grid md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Engine Scores</p>
                                      <div className="flex flex-wrap gap-2">
                                        {[
                                          { label: "Overall", val: result.engineOutput.matchScore },
                                          { label: "Skills", val: result.engineOutput.skillsScore },
                                          { label: "Seniority", val: result.engineOutput.seniorityScore },
                                          { label: "Domain", val: result.engineOutput.domainScore },
                                        ].map((s) => (
                                          <div key={s.label} className="bg-black/30 border border-zinc-800 rounded-lg px-3 py-1.5 text-center min-w-[52px]">
                                            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{s.label}</p>
                                            <p className="text-sm font-bold text-white">{s.val}</p>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="pt-1">
                                        <span className={cn(
                                          "text-xs font-bold px-2.5 py-1 rounded-full",
                                          result.engineOutput.recommendation === "APPLY"
                                            ? "bg-emerald-500/15 text-emerald-400"
                                            : "bg-red-500/15 text-red-400"
                                        )}>
                                          {result.engineOutput.recommendation}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Engine Reasoning</p>
                                      <p className="text-xs text-zinc-400 leading-relaxed">
                                        {result.engineOutput.recommendationReasoning}
                                      </p>
                                    </div>

                                    <div className="space-y-2">
                                      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Good Fit Signals</p>
                                      <ul className="space-y-1">
                                        {result.engineOutput.goodFitReasons.slice(0, 3).map((r, i) => (
                                          <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                                            <span className="text-emerald-600 mt-0.5">•</span>
                                            <span className="leading-relaxed">{r}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>

                                    <div className="space-y-2">
                                      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Gaps Identified</p>
                                      <ul className="space-y-1">
                                        {result.engineOutput.badFitReasons.slice(0, 3).map((r, i) => (
                                          <li key={i} className="text-xs text-zinc-400 flex items-start gap-2">
                                            <span className="text-amber-600 mt-0.5">•</span>
                                            <span className="leading-relaxed">{r}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
