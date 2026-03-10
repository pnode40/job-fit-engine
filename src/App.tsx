import { useState, useEffect, useRef } from "react";
import { evaluateJobFit, generateDocuments, type JobFitEvaluation, type GeneratedDocuments } from "./services/ai";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";
import { Loader2, Briefcase, FileText, CheckCircle2, XCircle, Copy, Check, Upload, Save, Info, Activity, Shield, ArrowRight, Sparkles, Target, FileCheck, Heart, Plus, Download, ChevronDown, FileSearch, TrendingUp } from "lucide-react";
import Markdown from "react-markdown";
import { cn } from "./lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useReactToPrint } from "react-to-print";

export default function App() {
  const [dossierContent, setDossierContent] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [activeStep, setActiveStep] = useState(1);
  const [activeTab, setActiveTab] = useState("resume");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<JobFitEvaluation | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [documents, setDocuments] = useState<GeneratedDocuments | null>(null);

  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedCoverLetter, setCopiedCoverLetter] = useState(false);
  const [copiedPlaybook, setCopiedPlaybook] = useState(false);

  const [showSupportModal, setShowSupportModal] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

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
          console.error("Failed to parse Legacy Profiles", e);
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
      const newContent = dossierContent
        ? `${dossierContent}\n\n${text}`
        : text;
      handleSaveDossier(newContent);
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEvaluate = async () => {
    if (!dossierContent || !jobDescription) return;
    setIsEvaluating(true);
    setEvaluation(null);
    setDocuments(null);
    try {
      const result = await evaluateJobFit(dossierContent, jobDescription);
      setEvaluation(result);
    } catch (error: any) {
      console.error("Evaluation failed:", error);
      alert(`Failed to evaluate job fit: ${error instanceof Error ? error.message : error}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleGenerate = async () => {
    if (!dossierContent || !jobDescription) return;
    setIsGenerating(true);
    try {
      const result = await generateDocuments(dossierContent, jobDescription);
      setDocuments(result);
      // Trigger support modal after successful generation
      setTimeout(() => setShowSupportModal(true), 1500);
    } catch (error: any) {
      console.error("Document generation failed:", error);
      alert(`Failed to generate documents: ${error instanceof Error ? error.message : error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'resume' | 'coverLetter' | 'playbook') => {
    await navigator.clipboard.writeText(text);
    if (type === 'resume') {
      setCopiedResume(true);
      setTimeout(() => setCopiedResume(false), 2000);
    } else if (type === 'coverLetter') {
      setCopiedCoverLetter(true);
      setTimeout(() => setCopiedCoverLetter(false), 2000);
    } else {
      setCopiedPlaybook(true);
      setTimeout(() => setCopiedPlaybook(false), 2000);
    }
  };

  const unlockedStep = () => {
    if (documents) return 4;
    if (evaluation) return 3;
    if (jobDescription.length > 50 && dossierContent.length > 50) return 2;
    if (dossierContent.length > 50) return 1;
    return 1;
  };

  // Sync active step when new steps unlock naturally
  useEffect(() => {
    if (evaluation && !documents) setActiveStep(3);
    if (documents) setActiveStep(4);
  }, [evaluation, documents]);


  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans flex flex-col selection:bg-blue-500/30 selection:text-blue-200 relative">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>

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
                <Badge variant="outline" className="ml-3 bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px] uppercase tracking-widest hidden sm:inline-flex">Pro</Badge>
              </h1>
              <p className="text-xs text-zinc-500 mt-0.5 font-medium">Executive Identity Vault</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-6 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {[
              { step: 1, label: "Vault", icon: Shield },
              { step: 2, label: "Target", icon: FileText },
              { step: 3, label: "Analysis", icon: Target },
              { step: 4, label: "Assets", icon: FileCheck },
            ].map((s, i) => {
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
                      isActive ? "bg-zinc-800/80 text-white shadow-sm" :
                        isUnlocked ? "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 cursor-pointer" : "text-zinc-700 cursor-not-allowed"
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

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-6 md:p-12 pb-32">
        <div className="max-w-4xl mx-auto w-full">

          <AnimatePresence mode="wait">

            {/* STEP 1: The Vault */}
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
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">Build Your Master Dossier</h2>
                  <p className="text-zinc-400 mt-2 text-lg">Load your entire professional history, metrics, and achievements. The AI engine will filter and format this data for every new application.</p>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm space-y-4">
                  <Textarea
                    placeholder="Paste your comprehensive work experience (resumes, performance reviews, brag documents)..."
                    className="min-h-[400px] bg-zinc-950/50 border-zinc-800 text-zinc-300 font-mono text-sm resize-y focus-visible:ring-1 focus-visible:ring-blue-500/50 placeholder:text-zinc-700 rounded-xl p-6 leading-relaxed"
                    value={dossierContent}
                    onChange={(e) => handleSaveDossier(e.target.value)}
                  />

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <input type="file" accept=".txt,.md,.csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-zinc-300">
                      <Upload className="w-4 h-4 mr-2" /> Upload File
                    </Button>
                    <div className="flex-1" />
                    <Button
                      size="lg"
                      onClick={() => setActiveStep(2)}
                      disabled={dossierContent.length < 50}
                      className="bg-white text-black hover:bg-zinc-200 font-bold px-8 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                    >
                      Next: Target Role <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Target Role */}
            {activeStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">Paste the Target Role</h2>
                  <p className="text-zinc-400 mt-2 text-lg">Provide the exact Job Description. The engine will perform a forensic fit analysis against your Master Dossier.</p>
                </div>

                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 shadow-2xl backdrop-blur-sm space-y-4">
                  <div className={cn("relative rounded-xl overflow-hidden transition-all duration-500", jobDescription.length > 0 ? "ring-1 ring-blue-500/50 shadow-[0_0_40px_-10px_rgba(59,130,246,0.15)]" : "ring-1 ring-zinc-800")}>
                    <Textarea
                      placeholder="Paste the Job Description here..."
                      className="relative z-10 min-h-[300px] bg-zinc-950/80 border-0 text-zinc-300 text-sm focus-visible:ring-0 p-6 placeholder:text-zinc-700 leading-relaxed"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 items-center justify-between">
                    <Button variant="ghost" onClick={() => setActiveStep(1)} className="text-zinc-400 hover:text-white">
                      Back to Dossier
                    </Button>

                    <Button
                      size="lg"
                      onClick={handleEvaluate}
                      disabled={!dossierContent || !jobDescription || isEvaluating}
                      className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 font-semibold shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all hover:scale-[1.02]"
                    >
                      {isEvaluating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing Fit...</> : <><Sparkles className="mr-2 h-5 w-5" /> Run Fit Analysis</>}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Analysis */}
            {activeStep === 3 && evaluation && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Executive Fit Analysis</h2>
                    <p className="text-zinc-400 mt-2">Zero-hallucination evaluation based strictly on your dossier.</p>
                  </div>
                  <Button variant="outline" onClick={() => setActiveStep(2)} className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white">
                    Edit JD
                  </Button>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8 bg-zinc-900/40 border border-zinc-800/50 p-8 rounded-3xl backdrop-blur-sm shadow-xl">
                  <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90 drop-shadow-2xl" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-zinc-800/50" strokeWidth="6" />
                      <motion.circle
                        initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - evaluation.matchScore / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        cx="50" cy="50" r="45" fill="none" stroke="currentColor"
                        className={cn(evaluation.matchScore >= 80 ? "text-emerald-500" : evaluation.matchScore >= 60 ? "text-yellow-500" : "text-red-500")}
                        strokeWidth="6" strokeDasharray={`${2 * Math.PI * 45}`} strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-white tracking-tighter">{evaluation.matchScore}</span>
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium mt-1">Match</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                      <Badge variant={evaluation.recommendation === "APPLY" ? "success" : "destructive"} className={cn(
                        "text-xs px-3 py-1 border-0 uppercase tracking-wider font-bold shrink-0",
                        evaluation.recommendation === "APPLY" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                      )}>
                        {evaluation.recommendation === "APPLY" ? "RECOMMENDED TO APPLY" : "NOT RECOMMENDED"}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-300 mt-4 leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">{evaluation.recommendationReasoning}</p>

                    <div className="mt-4 bg-blue-950/20 p-4 rounded-xl border border-blue-900/40">
                      <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center">
                        <TrendingUp className="w-3.5 h-3.5 mr-1.5" /> Scope & Leveling Calibration
                      </h4>
                      <p className="text-sm text-blue-200/80 leading-relaxed">{evaluation.levelingAnalysis}</p>
                    </div>
                  </div>
                </div>

                {evaluation.keywords && evaluation.keywords.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest flex items-center">
                      <FileSearch className="w-4 h-4 mr-2 text-blue-400" /> ATS Keyword Heatmap
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {evaluation.keywords.map((kw, i) => (
                        <Badge key={i} variant="outline" className={cn("px-3 py-1.5 text-xs font-mono border", kw.matched ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-zinc-900/50 border-zinc-800 text-zinc-500")}>
                          {kw.matched ? <CheckCircle2 className="w-3 h-3 mr-1.5 inline-block" /> : <XCircle className="w-3 h-3 mr-1.5 inline-block opacity-50" />}
                          {kw.skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm rounded-2xl">
                    <CardHeader className="pb-4 bg-zinc-900/50 border-b border-zinc-800/50 rounded-t-2xl"><CardTitle className="text-emerald-400 flex items-center text-base"><CheckCircle2 className="w-5 h-5 mr-2" /> The Edge</CardTitle></CardHeader>
                    <CardContent className="pt-6"><ul className="space-y-4">{evaluation.goodFitReasons.map((reason, i) => (<li key={i} className="text-sm text-zinc-300 flex items-start"><span className="mr-3 text-emerald-500/50">•</span><span>{reason}</span></li>))}</ul></CardContent>
                  </Card>
                  <Card className="bg-zinc-900/30 border-zinc-800/50 backdrop-blur-sm rounded-2xl">
                    <CardHeader className="pb-4 bg-zinc-900/50 border-b border-zinc-800/50 rounded-t-2xl"><CardTitle className="text-yellow-400 flex items-center text-base"><XCircle className="w-5 h-5 mr-2" /> The Gaps</CardTitle></CardHeader>
                    <CardContent className="pt-6"><ul className="space-y-4">{evaluation.badFitReasons.map((reason, i) => (<li key={i} className="text-sm text-zinc-300 flex items-start"><span className="mr-3 text-yellow-500/50">•</span><span>{reason}</span></li>))}</ul></CardContent>
                  </Card>
                </div>

                <div className="flex justify-end pt-8 border-t border-zinc-800/50">
                  <Button size="lg" onClick={handleGenerate} disabled={isGenerating} className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-full px-8 shadow-[0_0_30px_rgba(59,130,246,0.3)] transition-all h-12">
                    {isGenerating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating Assets...</> : <>Generate Resume & Playbook <ArrowRight className="ml-2 h-5 w-5" /></>}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Assets */}
            {activeStep === 4 && documents && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/50 pb-6">
                  <div>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">Generated Assets</h2>
                    <p className="text-zinc-400 mt-1">Tailored specifically for this role without hallucinations.</p>
                  </div>
                  <div className="flex space-x-3">
                    <Button onClick={() => {
                      setJobDescription("");
                      setEvaluation(null);
                      setDocuments(null);
                      setActiveStep(2);
                    }} variant="outline" className="bg-zinc-900 border-zinc-700 text-zinc-200">
                      New Application
                    </Button>
                    <Button onClick={() => handlePrint()} variant="outline" className="bg-blue-600/20 border-blue-500/30 text-blue-300 hover:bg-blue-600/30">
                      <Download className="w-4 h-4 mr-2" /> Export {activeTab === "resume" ? "Resume" : activeTab === "coverLetter" ? "Cover Letter" : "Playbook"} PDF
                    </Button>
                  </div>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 mb-8 bg-zinc-900/80 border border-zinc-800 p-1.5 rounded-xl">
                    <TabsTrigger value="resume" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white">ATS Resume</TabsTrigger>
                    <TabsTrigger value="coverLetter" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white">Cover Letter</TabsTrigger>
                    <TabsTrigger value="playbook" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white flex items-center"><Sparkles className="w-3 h-3 mr-1.5 text-blue-400" /> Playbook</TabsTrigger>
                  </TabsList>

                  <TabsContent value="resume" className="space-y-4">
                    <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => copyToClipboard(documents.resumeMarkdown, 'resume')} className="text-zinc-400">{copiedResume ? "Copied!" : "Copy Markdown"}</Button></div>
                    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 md:p-12 prose prose-invert max-w-none prose-sm sm:prose-base shadow-xl"><Markdown>{documents.resumeMarkdown}</Markdown></div>
                  </TabsContent>
                  <TabsContent value="coverLetter" className="space-y-4">
                    <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => copyToClipboard(documents.coverLetterMarkdown, 'coverLetter')} className="text-zinc-400">{copiedCoverLetter ? "Copied!" : "Copy Markdown"}</Button></div>
                    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 md:p-12 prose prose-invert max-w-none prose-sm sm:prose-base shadow-xl"><Markdown>{documents.coverLetterMarkdown}</Markdown></div>
                  </TabsContent>
                  <TabsContent value="playbook" className="space-y-4">
                    <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => copyToClipboard(documents.interviewPlaybookMarkdown, 'playbook')} className="text-zinc-400">{copiedPlaybook ? "Copied!" : "Copy Markdown"}</Button></div>
                    <div className="bg-gradient-to-br from-blue-900/10 to-indigo-900/10 border border-blue-900/30 rounded-2xl p-8 md:p-12 prose prose-invert max-w-none prose-sm sm:prose-base shadow-xl"><Markdown>{documents.interviewPlaybookMarkdown}</Markdown></div>
                  </TabsContent>
                </Tabs>

                {/* Unified Hidden Print Container */}
                <div className="hidden">
                  <div ref={printRef} className="print-container">
                    <style type="text/css" media="print">
                      {`
                        @page { size: letter; margin: 0; }
                        .print-container {
                          font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                          font-size: 11px;
                          line-height: 1.4;
                          color: #27272a;
                          padding: 0.5in 0.6in;
                          -webkit-box-decoration-break: clone;
                          box-decoration-break: clone;
                        }
                        .print-container > * { page-break-inside: avoid; break-inside: avoid; }
                        .print-container h1, .print-container h2, .print-container h3 { page-break-after: avoid; break-after: avoid; }
                        .print-container h1 { font-size: 22px; font-weight: 800; color: #09090b; margin: 0 0 2px 0; text-transform: uppercase; letter-spacing: -0.01em; }
                        .print-container h1 + p { font-size: 10.5px; color: #52525b; margin: 0 0 16px 0; font-weight: 500; }
                        .print-container h2 { font-size: 11.5px; font-weight: 700; text-transform: uppercase; color: #09090b; border-bottom: 1.5px solid #d4d4d8; padding-bottom: 3px; margin: 16px 0 8px 0; letter-spacing: 0.05em; }
                        .print-container h3 { font-size: 11px; font-weight: 700; color: #18181b; margin: 12px 0 2px 0; }
                        .print-container h3 + p { margin: 0 0 4px 0; font-style: italic; color: #52525b; font-size: 10.5px; }
                        .print-container p { margin: 0 0 6px 0; }
                        .print-container ul { margin: 0 0 8px 16px; list-style-type: disc; padding: 0; }
                        .print-container li { margin: 0 0 2px 0; padding-left: 2px; }
                        .print-container li::marker { color: #a1a1aa; }
                        .print-container strong { font-weight: 700; color: #09090b; }
                      `}
                    </style>
                    {activeTab === "resume" && <Markdown>{documents.resumeMarkdown}</Markdown>}
                    {activeTab === "coverLetter" && <Markdown>{documents.coverLetterMarkdown}</Markdown>}
                    {activeTab === "playbook" && <Markdown>{documents.interviewPlaybookMarkdown}</Markdown>}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main >

      <Dialog open={showSupportModal} onOpenChange={setShowSupportModal}>
        <DialogContent className="max-w-md bg-zinc-950 border-zinc-800 text-zinc-100"><DialogHeader><DialogTitle>Success!</DialogTitle></DialogHeader><Button onClick={() => setShowSupportModal(false)}>Close</Button></DialogContent>
      </Dialog>
    </div >
  );
}
