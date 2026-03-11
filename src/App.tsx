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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      handleSaveDossier(dossierContent ? `${dossierContent}\n\n${text}` : text);
    };
    reader.readAsText(file);
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
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">
                    Build Your Master Dossier
                  </h2>
                  <p className="text-zinc-400 mt-2 text-lg">
                    Load your entire professional history, metrics, and achievements. The AI engine will filter and format this data for every new application.
                  </p>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm space-y-4">
                  <Textarea
                    placeholder="Paste your comprehensive work experience (resumes, performance reviews, brag documents)..."
                    className="min-h-[400px] bg-zinc-950/50 border-zinc-800 text-zinc-300 font-mono text-sm resize-y focus-visible:ring-1 focus-visible:ring-blue-500/50 placeholder:text-zinc-700 rounded-xl p-6 leading-relaxed"
                    value={dossierContent}
                    onChange={(e) => handleSaveDossier(e.target.value)}
                  />
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <input
                      type="file"
                      accept=".txt,.md,.csv"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300"
                    >
                      <Upload className="w-4 h-4 mr-2" /> Upload File
                    </Button>
                    <div className="flex-1" />
                    <Button
                      size="lg"
                      onClick={() => setActiveStep(2)}
                      disabled={dossierContent.trim().length < 50}
                      className="bg-white text-black hover:bg-zinc-200 font-bold px-8 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                      Next: Target Role <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
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
                dossierContent={dossierContent}
                jobDescription={jobDescription}
              />
            )}

            {/* Asset generation loading */}
            {activeStep === 3 && isGenerating && (
              <IngestionView
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
                onNewApplication={handleNewApplication}
              />
            )}

          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
