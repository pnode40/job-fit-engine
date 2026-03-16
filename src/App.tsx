import { useState, useEffect, useRef } from "react";
import {
  evaluateJobFit,
  generateDocuments,
  type JobFitEvaluation,
  type GeneratedDocuments,
} from "./services/ai";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import {
  Shield,
  FileText,
  Target,
  FileCheck,
  Upload,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "./lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { IngestionView, GENERATION_PHASES } from "./components/IngestionView";
import { VerdictView } from "./components/VerdictView";
import { AssetFactory } from "./components/AssetFactory";
import * as pdfjsLib from "pdfjs-dist";
import * as mammoth from "mammoth";

// Configure PDF.js worker using local bundled file (v5 is .mjs only)
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

function getTier(score: number): 1 | 2 | 3 | 4 {
  if (score >= 90) return 1;
  if (score >= 80) return 2;
  if (score >= 70) return 3;
  return 4;
}

export default function App() {
  const [dossierContent, setDossierContent] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [activeStep, setActiveStep] = useState(1);
  const [activeTab, setActiveTab] = useState("resume");

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<JobFitEvaluation | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [documents, setDocuments] = useState<GeneratedDocuments | null>(null);
  const [pitchMode, setPitchMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedDossier = localStorage.getItem("job-fit-master-dossier");
    if (savedDossier) {
      setDossierContent(savedDossier);
    } else {
      const savedProfiles = localStorage.getItem("job-fit-profiles");
      if (savedProfiles) {
        try {
          const parsed = JSON.parse(savedProfiles);
          if (parsed && parsed.length > 0) {
            setDossierContent(parsed[0].content);
            localStorage.setItem("job-fit-master-dossier", parsed[0].content);
            localStorage.removeItem("job-fit-profiles");
          }
        } catch (e) {
          console.error("Failed to parse legacy profiles", e);
        }
      }
    }
  }, []);

  const handleSaveDossier = (content: string) => {
    setDossierContent(content);
    localStorage.setItem("job-fit-master-dossier", content);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let text = "";
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith(".pdf")) {
        // Extract text from PDF preserving line structure
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pageTexts: string[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const content = await page.getTextContent();
          // Use hasEOL flag to preserve line breaks rather than joining everything with spaces
          let pageText = "";
          for (const item of content.items as any[]) {
            pageText += item.str;
            if (item.hasEOL) pageText += "\n";
            else if (item.str && !item.str.endsWith(" ")) pageText += " ";
          }
          pageTexts.push(pageText.trim());
        }

        text = pageTexts.join("\n\n");
      } else if (fileName.endsWith(".docx")) {
        // Extract text from Word document
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        // Plain text files (.txt, .md, .csv)
        text = await file.text();
      }

      handleSaveDossier(dossierContent ? `${dossierContent}\n\n${text}` : text);
    } catch (error) {
      console.error("File upload error:", error);
      alert(`Failed to process file: ${error instanceof Error ? error.message : "Unknown error"}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEvaluate = async () => {
    if (!dossierContent || !jobDescription) return;
    setIsEvaluating(true);
    setEvaluation(null);
    setDocuments(null);
    try {
      const result = await evaluateJobFit(dossierContent, jobDescription);
      setEvaluation(result);
    } catch (error: unknown) {
      console.error("Evaluation failed:", error);
      alert(`Failed to evaluate job fit: ${error instanceof Error ? error.message : error}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGenerate = async (isPitch = false) => {
    if (!dossierContent || !jobDescription) return;
    setPitchMode(isPitch);
    setIsGenerating(true);
    try {
      const result = await generateDocuments(dossierContent, jobDescription);
      setDocuments(result);
      setActiveTab(isPitch ? "coverLetter" : "resume");
    } catch (error: unknown) {
      console.error("Document generation failed:", error);
      alert(`Failed to generate documents: ${error instanceof Error ? error.message : error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNewApplication = () => {
    setJobDescription("");
    setEvaluation(null);
    setDocuments(null);
    setPitchMode(false);
    setActiveStep(2);
    setActiveTab("resume");
  };

  const unlockedStep = () => {
    if (documents) return 4;
    if (evaluation) return 3;
    if (jobDescription.trim().length > 50 && dossierContent.trim().length > 50) return 2;
    return 1;
  };

  useEffect(() => {
    if (evaluation && !documents) setActiveStep(3);
    if (documents) setActiveStep(4);
  }, [evaluation, documents]);

  const tier = evaluation ? getTier(evaluation.matchScore) : null;

  const STEPS = [
    { step: 1, label: "Vault", icon: Shield },
    { step: 2, label: "Target", icon: FileText },
    { step: 3, label: "Analysis", icon: Target },
    { step: 4, label: "Assets", icon: FileCheck },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans flex flex-col selection:bg-blue-500/30 selection:text-blue-200 relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />

      {/* Header & Stepper */}
      <header className="px-6 py-4 border-b border-zinc-800/50 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center border border-zinc-700/50 shadow-inner">
              <Shield className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center">
                Job Fit Engine
                <Badge
                  variant="outline"
                  className="ml-3 bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] uppercase tracking-widest hidden sm:inline-flex"
                >
                  Pro
                </Badge>
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5 font-medium">Executive Identity Vault</p>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-0">
            {/* Nav stepper */}
            <div className="flex items-center space-x-2 md:space-x-6 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {STEPS.map((s, i) => {
                const maxUnlocked = unlockedStep();
                const isUnlocked = s.step <= maxUnlocked || s.step === 1;
                const isActive = activeStep === s.step;
                return (
                  <div key={s.step} className="flex items-center shrink-0">
                    <button
                      onClick={() => isUnlocked && setActiveStep(s.step)}
                      disabled={!isUnlocked}
                      className={cn(
                        "flex items-center space-x-2 transition-all duration-300 px-3 py-2 rounded-lg",
                        isActive
                          ? "bg-zinc-800/80 text-white shadow-sm"
                          : isUnlocked
                          ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 cursor-pointer"
                          : "text-zinc-700 cursor-not-allowed"
                      )}
                    >
                      <s.icon className={cn("w-4 h-4", isActive ? "text-blue-400" : "")} />
                      <span className="text-sm font-medium tracking-wide">{s.label}</span>
                    </button>
                    {i < 3 && <div className="w-4 md:w-8 h-px mx-1 md:mx-2 bg-zinc-800" />}
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12 pb-32">
        <div className="max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">

            {/* STEP 1: Vault */}
            {activeStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="space-y-7"
              >
                {/* Header */}
                <div className="space-y-4">
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full"
                  >
                    <Shield className="w-3 h-3 text-blue-400" />
                    <span className="text-[11px] font-semibold tracking-widest text-blue-400 uppercase">Intelligence Vault — Step 1 of 4</span>
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-[1.15]"
                  >
                    The more context you give it,<br />
                    <span className="text-zinc-500">the sharper every application becomes.</span>
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="text-zinc-400 text-base max-w-2xl leading-relaxed"
                  >
                    This is your master career file — paste everything here once. The engine reads your full history and pulls only what's relevant when you target a specific job. The richer this gets, the more precisely it can match and position you.
                  </motion.p>
                </div>

                {/* What to include chips */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <p className="text-[11px] font-semibold tracking-widest text-zinc-600 uppercase">What to include</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "Resume or CV",
                      "LinkedIn summary & work history",
                      "Key metrics & numbers",
                      "Performance review highlights",
                      "Projects & case studies",
                      "Brag doc / wins list",
                      "Certifications & credentials",
                    ].map((item) => (
                      <span
                        key={item}
                        className="px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-lg text-xs text-zinc-400 font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </motion.div>

                {/* Textarea card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm space-y-4"
                >
                  <Textarea
                    placeholder={`Paste everything here — format doesn't matter, the engine will parse it.\n\nGood inputs:\n  • Resume (paste text or upload PDF/Word below)\n  • "Led a team of 8 engineers, shipped 3 major features per quarter"\n  • "Grew ARR from $2M to $5M over 18 months"\n  • LinkedIn About section + job descriptions\n  • Performance review excerpts\n  • Side projects, open source, certifications\n\nMore depth = more precise targeting. Don't edit or clean it up — raw is fine.`}
                    className="min-h-[360px] bg-zinc-950/50 border-zinc-800 text-zinc-300 font-mono text-sm resize-y focus-visible:ring-1 focus-visible:ring-blue-500/50 placeholder:text-zinc-600 rounded-xl p-6 leading-relaxed"
                    value={dossierContent}
                    onChange={(e) => handleSaveDossier(e.target.value)}
                  />

                  {/* Signal strength indicator */}
                  {dossierContent.length > 0 && (() => {
                    const len = dossierContent.length;
                    const pct = Math.min(len / 2000, 1);
                    const { label, color, barColor } =
                      len < 300
                        ? { label: "Minimal signal — add more to improve accuracy", color: "text-red-400", barColor: "bg-red-500" }
                        : len < 801
                        ? { label: "Basic coverage — consider expanding your history", color: "text-yellow-400", barColor: "bg-yellow-500" }
                        : len < 2001
                        ? { label: "Strong profile — engine has enough to work with", color: "text-emerald-400", barColor: "bg-emerald-500" }
                        : { label: "Deep intelligence — optimal for precision targeting", color: "text-blue-400", barColor: "bg-blue-500" };
                    return (
                      <div className="space-y-1.5">
                        <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${barColor}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct * 100}%` }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                          />
                        </div>
                        <p className={`text-[11px] font-medium ${color}`}>{label}</p>
                      </div>
                    );
                  })()}

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <input
                      type="file"
                      accept=".txt,.md,.csv,.pdf,.docx"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Upload PDF or Word Doc
                    </Button>
                    <div className="flex-1" />
                    <Button
                      size="lg"
                      onClick={() => setActiveStep(2)}
                      disabled={dossierContent.trim().length < 50}
                      className="bg-white text-black hover:bg-zinc-200 font-bold px-8 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                      Analyze a Job <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* STEP 2: Target — or Ingestion loading */}
            {activeStep === 2 && !isEvaluating && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">
                    Paste the Target Role
                  </h2>
                  <p className="text-zinc-400 mt-2 text-lg">
                    Provide the exact Job Description. The engine will perform a forensic fit analysis against your Master Dossier.
                  </p>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm space-y-4">
                  <div
                    className={cn(
                      "relative rounded-xl overflow-hidden transition-all duration-500",
                      jobDescription.length > 0
                        ? "ring-1 ring-blue-500/50 shadow-[0_0_40px_-10px_rgba(59,130,246,0.15)]"
                        : "ring-1 ring-zinc-800"
                    )}
                  >
                    <Textarea
                      placeholder="Paste the Job Description here..."
                      className="relative z-10 min-h-[300px] bg-zinc-950/80 border-0 text-zinc-300 text-sm focus-visible:ring-0 p-6 placeholder:text-zinc-700 leading-relaxed"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 items-center justify-between">
                    <Button
                      variant="ghost"
                      onClick={() => setActiveStep(1)}
                      className="text-zinc-400 hover:text-white"
                    >
                      Back to Dossier
                    </Button>
                    <Button
                      size="lg"
                      onClick={handleEvaluate}
                      disabled={!dossierContent || !jobDescription || isEvaluating}
                      className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 font-semibold shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all hover:scale-[1.02]"
                    >
                      <Sparkles className="mr-2 h-5 w-5" /> Run Fit Analysis
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Phase 1: Ingestion view (evaluation loading) */}
            {activeStep === 2 && isEvaluating && (
              <IngestionView
                key="ingestion-eval"
                dossierContent={dossierContent}
                jobDescription={jobDescription}
              />
            )}

            {/* Asset generation loading */}
            {activeStep === 3 && isGenerating && (
              <IngestionView
                key="ingestion-gen"
                dossierContent={dossierContent}
                jobDescription={jobDescription}
                phases={GENERATION_PHASES}
                title="Crafting Your Assets"
                phaseIntervalMs={8000}
              />
            )}

            {/* STEP 3: Verdict */}
            {activeStep === 3 && evaluation && tier && !isGenerating && (
              <VerdictView
                key="verdict"
                evaluation={evaluation}
                tier={tier}
                isGenerating={isGenerating}
                onGenerateAssets={() => handleGenerate(false)}
                onDraftPitchNarrative={() => handleGenerate(true)}
                onAnalyzeAnother={handleNewApplication}
                onEditJD={() => setActiveStep(2)}
              />
            )}

            {/* STEP 4: Asset Factory */}
            {activeStep === 4 && documents && evaluation && tier && (
              <AssetFactory
                key="assets"
                documents={documents}
                evaluation={evaluation}
                tier={tier}
                isPitchMode={pitchMode}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onUpdateResume={(newMarkdown) =>
                  setDocuments((prev) => prev ? { ...prev, resumeMarkdown: newMarkdown } : prev)
                }
                onUpdateCoverLetter={(newMarkdown) =>
                  setDocuments((prev) => prev ? { ...prev, coverLetterMarkdown: newMarkdown } : prev)
                }
                onNewApplication={handleNewApplication}
              />
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
