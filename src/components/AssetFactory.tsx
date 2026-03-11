import { useState, useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  Copy,
  Check,
  Sparkles,
  PenLine,
  RotateCcw,
  FileText,
  BookOpen,
} from "lucide-react";
import Markdown from "react-markdown";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { cn } from "../lib/utils";
import type { GeneratedDocuments, JobFitEvaluation } from "../services/ai";
import { useReactToPrint } from "react-to-print";

interface AssetFactoryProps {
  documents: GeneratedDocuments;
  evaluation: JobFitEvaluation;
  tier: 1 | 2 | 3 | 4;
  isPitchMode: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onUpdateResume: (markdown: string) => void;
  onNewApplication: () => void;
}

function extractNodeText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractNodeText).join("");
  if (node && typeof node === "object" && "props" in (node as object)) {
    const el = node as React.ReactElement;
    return extractNodeText(el.props.children);
  }
  return "";
}

const TIER_PITCH_COLORS: Record<1 | 2 | 3 | 4, string> = {
  1: "text-emerald-400",
  2: "text-cyan-400",
  3: "text-amber-400",
  4: "text-zinc-400",
};

export function AssetFactory({
  documents,
  evaluation,
  tier,
  isPitchMode,
  activeTab,
  setActiveTab,
  onUpdateResume,
  onNewApplication,
}: AssetFactoryProps) {
  const [localResume, setLocalResume] = useState(documents.resumeMarkdown);

  // Sandbox modal state
  const [sandboxOpen, setSandboxOpen] = useState(false);
  const [sandboxOriginal, setSandboxOriginal] = useState("");
  const [sandboxEdit, setSandboxEdit] = useState("");

  // Copy state
  const [copiedResume, setCopiedResume] = useState(false);
  const [copiedCover, setCopiedCover] = useState(false);
  const [copiedPlaybook, setCopiedPlaybook] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({ contentRef: printRef });

  const openSandbox = (rawText: string) => {
    const clean = rawText.trim();
    if (!clean) return;
    setSandboxOriginal(clean);
    setSandboxEdit(clean);
    setSandboxOpen(true);
  };

  const handleSandboxSave = () => {
    if (sandboxOriginal === sandboxEdit) {
      setSandboxOpen(false);
      return;
    }
    const updated = localResume.replace(sandboxOriginal, sandboxEdit);
    setLocalResume(updated);
    onUpdateResume(updated);
    setSandboxOpen(false);
  };

  const copy = async (text: string, type: "resume" | "cover" | "playbook") => {
    await navigator.clipboard.writeText(text);
    if (type === "resume") { setCopiedResume(true); setTimeout(() => setCopiedResume(false), 2000); }
    else if (type === "cover") { setCopiedCover(true); setTimeout(() => setCopiedCover(false), 2000); }
    else { setCopiedPlaybook(true); setTimeout(() => setCopiedPlaybook(false), 2000); }
  };

  // Keyword live-check for sandbox modal
  const keywordStatus = evaluation.keywords.map((kw) => ({
    skill: kw.skill,
    inDossier: kw.matched,
    inEdit: sandboxEdit.toLowerCase().includes(kw.skill.toLowerCase()),
  }));

  // Protected canvas: custom li renderer for resume
  const resumeComponents = {
    li: ({ children }: { children?: ReactNode }) => {
      const text = extractNodeText(children);
      return (
        <li
          className="group relative cursor-pointer rounded px-2 -mx-2 transition-colors duration-150 hover:bg-zinc-800/60"
          onClick={() => openSandbox(text)}
          title="Click to edit this bullet"
        >
          <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 opacity-0 group-hover:opacity-100 transition-opacity">
            <PenLine className="w-2.5 h-2.5 text-zinc-500" />
          </span>
          {children}
        </li>
      );
    },
  };

  return (
    <motion.div
      key="assets"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/50 pb-5">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-semibold mb-1">
            {isPitchMode ? "Pitch Narrative Ready" : "Assets Generated"}
          </p>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            {isPitchMode ? "Gap-Bridging Narrative" : "Generated Assets"}
          </h2>
          {isPitchMode && (
            <p className={cn("text-xs mt-1 font-medium", TIER_PITCH_COLORS[tier])}>
              Cover letter drafted to bridge your gaps before resume generation.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={onNewApplication}
            variant="outline"
            size="sm"
            className="bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> New Application
          </Button>
          <Button
            onClick={() => handlePrint()}
            variant="outline"
            size="sm"
            className="bg-blue-600/15 border-blue-500/25 text-blue-300 hover:bg-blue-600/25 text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-xl mx-auto grid-cols-3 mb-6 bg-zinc-900/80 border border-zinc-800 p-1.5 rounded-xl">
          <TabsTrigger value="resume" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs">
            <FileText className="w-3.5 h-3.5 mr-1.5" /> ATS Resume
          </TabsTrigger>
          <TabsTrigger value="coverLetter" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs">
            {isPitchMode && <Sparkles className="w-3 h-3 mr-1 text-amber-400" />}
            Cover Letter
          </TabsTrigger>
          <TabsTrigger value="playbook" className="rounded-lg data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-xs">
            <BookOpen className="w-3.5 h-3.5 mr-1.5 text-blue-400" /> Playbook
          </TabsTrigger>
        </TabsList>

        {/* Resume — Protected Canvas */}
        <TabsContent value="resume" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PenLine className="w-3.5 h-3.5 text-zinc-600" />
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
                Click any bullet to edit in sandbox
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copy(localResume, "resume")}
              className="text-zinc-500 hover:text-zinc-300 text-xs h-7"
            >
              {copiedResume ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Markdown</>}
            </Button>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 md:p-12 prose prose-invert max-w-none prose-sm shadow-xl [&_li]:list-disc">
            <Markdown components={resumeComponents as object}>{localResume}</Markdown>
          </div>
        </TabsContent>

        {/* Cover Letter */}
        <TabsContent value="coverLetter" className="space-y-3">
          {isPitchMode && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 bg-amber-950/20 border border-amber-800/30 rounded-xl p-3.5"
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-400">Pitch Narrative Active</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    This cover letter is engineered to bridge your gaps and frame transferable experience before the resume is sent.
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => copy(documents.coverLetterMarkdown, "cover")} className="text-zinc-500 hover:text-zinc-300 text-xs h-7">
              {copiedCover ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Markdown</>}
            </Button>
          </div>
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 md:p-12 prose prose-invert max-w-none prose-sm shadow-xl">
            <Markdown>{documents.coverLetterMarkdown}</Markdown>
          </div>
        </TabsContent>

        {/* Playbook */}
        <TabsContent value="playbook" className="space-y-3">
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => copy(documents.interviewPlaybookMarkdown, "playbook")} className="text-zinc-500 hover:text-zinc-300 text-xs h-7">
              {copiedPlaybook ? <><Check className="w-3.5 h-3.5 mr-1.5" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Markdown</>}
            </Button>
          </div>
          <div className="bg-gradient-to-br from-blue-900/10 to-indigo-900/10 border border-blue-900/30 rounded-2xl p-8 md:p-12 prose prose-invert max-w-none prose-sm shadow-xl">
            <Markdown>{documents.interviewPlaybookMarkdown}</Markdown>
          </div>
        </TabsContent>
      </Tabs>

      {/* Hidden print container */}
      <div className="hidden">
        <div ref={printRef} className="print-container">
          <style type="text/css" media="print">{`
            @page { size: letter; margin: 0; }
            .print-container { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #27272a; padding: 0.5in 0.6in; }
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
          `}</style>
          {activeTab === "resume" && <Markdown>{localResume}</Markdown>}
          {activeTab === "coverLetter" && <Markdown>{documents.coverLetterMarkdown}</Markdown>}
          {activeTab === "playbook" && <Markdown>{documents.interviewPlaybookMarkdown}</Markdown>}
        </div>
      </div>

      {/* Sandbox Modal */}
      <Dialog open={sandboxOpen} onOpenChange={setSandboxOpen}>
        <DialogContent className="max-w-xl bg-zinc-950 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <PenLine className="w-4 h-4 text-zinc-400" /> Edit Bullet Point
            </DialogTitle>
          </DialogHeader>

          <Textarea
            value={sandboxEdit}
            onChange={(e) => setSandboxEdit(e.target.value)}
            className="min-h-[96px] bg-zinc-900 border-zinc-800 text-zinc-200 text-sm leading-relaxed focus-visible:ring-1 focus-visible:ring-blue-500/50 resize-y"
          />

          {/* Keyword checklist */}
          <div className="border-t border-zinc-800/50 pt-3 space-y-2">
            <p className="text-[10px] text-zinc-600 uppercase tracking-[0.15em] font-semibold">
              JD Keyword Match
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {keywordStatus.map((kw, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className={cn(
                    "text-[10px] font-mono px-2 py-0.5 border transition-colors duration-200",
                    kw.inEdit
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : kw.inDossier
                      ? "bg-zinc-800/60 border-zinc-700 text-zinc-500 line-through"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-700"
                  )}
                >
                  {kw.skill}
                </Badge>
              ))}
            </div>
            <p className="text-[10px] text-zinc-700">
              <span className="text-emerald-500">Green</span> = present · Strikethrough = removed from this bullet · Gray = not in dossier
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setSandboxOpen(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSandboxSave}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs"
            >
              Save Change
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
