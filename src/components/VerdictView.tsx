import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  FileSearch,
  TrendingUp,
  ArrowRight,
  Loader2,
  RotateCcw,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { RadarChart } from "./RadarChart";
import { cn } from "../lib/utils";
import type { JobFitEvaluation } from "../services/ai";

interface VerdictViewProps {
  evaluation: JobFitEvaluation;
  tier: 1 | 2 | 3 | 4;
  isGenerating: boolean;
  onGenerateAssets: () => void;
  onDraftPitchNarrative: () => void;
  onAnalyzeAnother: () => void;
  onEditJD: () => void;
}

const TIER_CONFIG = {
  1: {
    header: "Exceptional Alignment",
    subtext: "Your track record maps directly to this role's core requirements. Proceed immediately.",
    badgeText: "TIER 1 · FAST LANE",
    containerBorder: "border-emerald-800/40",
    containerBg: "bg-emerald-950/15",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    headerColor: "text-emerald-400",
    ctaLabel: "Generate Assets",
    ctaClass: "bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.25)]",
    ctaIcon: <Sparkles className="ml-2 h-4 w-4" />,
  },
  2: {
    header: "Proceed with Confidence",
    subtext: "Solid alignment across core dimensions. This is a well-matched opportunity.",
    badgeText: "TIER 2 · SWEET SPOT",
    containerBorder: "border-cyan-800/40",
    containerBg: "bg-cyan-950/15",
    badgeClass: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    headerColor: "text-cyan-400",
    ctaLabel: "Generate Assets",
    ctaClass: "bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_24px_rgba(6,182,212,0.25)]",
    ctaIcon: <Sparkles className="ml-2 h-4 w-4" />,
  },
  3: {
    header: "Stretch Opportunity",
    subtext: "Viable, but only with a targeted narrative. Start with the cover letter to bridge identified gaps before touching the resume.",
    badgeText: "TIER 3 · STRETCH",
    containerBorder: "border-amber-800/40",
    containerBg: "bg-amber-950/15",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    headerColor: "text-amber-400",
    ctaLabel: "Draft Pitch Narrative",
    ctaClass: "bg-amber-600 hover:bg-amber-500 shadow-[0_0_24px_rgba(245,158,11,0.25)]",
    ctaIcon: <ArrowRight className="ml-2 h-4 w-4" />,
  },
  4: {
    header: "Not a Fit for Current Track Record",
    subtext: "The gap between your demonstrated scope and this role's requirements is too wide for application assets to bridge.",
    badgeText: "TIER 4 · GROWTH RESET",
    containerBorder: "border-zinc-700/40",
    containerBg: "bg-zinc-900/20",
    badgeClass: "bg-zinc-500/15 text-zinc-500 border-zinc-600/30",
    headerColor: "text-zinc-400",
    ctaLabel: "Analyze Another Role",
    ctaClass: "bg-zinc-800 hover:bg-zinc-700 text-zinc-300",
    ctaIcon: <RotateCcw className="ml-2 h-4 w-4" />,
  },
} as const;

const GENERATION_QUIPS = [
  "Percolating your professional narrative...",
  "Negotiating with passive voice...",
  "Removing 'passionate' from first draft...",
  "Consulting the ATS oracle...",
  "Making you sound 40% more strategic...",
  "Polishing your bullet points...",
  "Cross-referencing your career arc...",
  "Bribing the hiring algorithm...",
  "Philosophizing about your impact metrics...",
  "Summoning your best professional self...",
  "Teaching an AI to write like you...",
  "Inflating achievements responsibly...",
  "Fact-checking your superlatives...",
  "Adding synergy (just kidding)...",
  "Almost there — this takes a minute or two...",
];

export function VerdictView({
  evaluation,
  tier,
  isGenerating,
  onGenerateAssets,
  onDraftPitchNarrative,
  onAnalyzeAnother,
  onEditJD,
}: VerdictViewProps) {
  const config = TIER_CONFIG[tier];
  const [quipIndex, setQuipIndex] = useState(0);

  useEffect(() => {
    if (!isGenerating) { setQuipIndex(0); return; }
    const timeout = setTimeout(() => {
      setQuipIndex((i) => (i + 1) % GENERATION_QUIPS.length);
    }, 3500);
    return () => clearTimeout(timeout);
  }, [isGenerating, quipIndex]);

  const handleCTA = () => {
    if (tier === 1 || tier === 2) onGenerateAssets();
    else if (tier === 3) onDraftPitchNarrative();
    else onAnalyzeAnother();
  };

  return (
    <motion.div
      key="verdict"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.35 }}
      className="space-y-6 relative"
    >
      {/* Generating overlay */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            key="generating-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#050505]/90 backdrop-blur-sm rounded-xl min-h-[400px]"
          >
            <div className="flex flex-col items-center gap-5 max-w-sm text-center px-6">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border border-zinc-700 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                </div>
                <div className="absolute inset-0 rounded-full border border-blue-500/20 animate-ping" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold mb-3">
                  Crafting Your Assets
                </p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={quipIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                    className="text-zinc-300 text-sm font-medium leading-relaxed"
                  >
                    {GENERATION_QUIPS[quipIndex]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Resume, cover letter, and interview playbook generation typically takes 1–2 minutes. Worth the wait.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-semibold mb-1">
            Fit Analysis Complete
          </p>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Executive Verdict</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEditJD}
          className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white text-xs"
        >
          Edit JD
        </Button>
      </div>

      {/* Tier card */}
      <div
        className={cn(
          "rounded-2xl border p-6 backdrop-blur-sm",
          config.containerBorder,
          config.containerBg
        )}
      >
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Radar chart */}
          <div className="w-full md:w-64 shrink-0">
            <RadarChart
              skills={evaluation.skillsScore ?? evaluation.matchScore}
              seniority={evaluation.seniorityScore ?? evaluation.matchScore}
              domain={evaluation.domainScore ?? evaluation.matchScore}
              tier={tier}
            />
          </div>

          {/* Right column */}
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <Badge
                variant="outline"
                className={cn("text-[10px] px-2.5 py-1 font-bold tracking-widest border", config.badgeClass)}
              >
                {config.badgeText}
              </Badge>
              <h3 className={cn("text-xl font-bold", config.headerColor)}>{config.header}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{config.subtext}</p>
            </div>

            {/* Score chips */}
            <div className="flex gap-3 flex-wrap">
              {[
                { label: "Overall", value: evaluation.matchScore },
                { label: "Skills", value: evaluation.skillsScore ?? "—" },
                { label: "Seniority", value: evaluation.seniorityScore ?? "—" },
                { label: "Domain", value: evaluation.domainScore ?? "—" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-black/30 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-center min-w-[52px]"
                >
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{s.label}</p>
                  <p className="text-sm font-bold text-white">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Reasoning */}
            <p className="text-xs text-zinc-400 leading-relaxed bg-black/20 rounded-xl p-3 border border-white/5">
              {evaluation.recommendationReasoning}
            </p>

            {/* Leveling */}
            <div className="bg-blue-950/20 rounded-xl border border-blue-900/30 p-3">
              <h4 className="text-[10px] font-semibold text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3" /> Scope & Leveling Calibration
              </h4>
              <p className="text-xs text-blue-200/70 leading-relaxed">{evaluation.levelingAnalysis}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tier 3 pause notice */}
      {tier === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-start gap-3 bg-amber-950/20 border border-amber-800/40 rounded-xl p-4"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-400 mb-1">Recommended: Lead with the Cover Letter</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Generating assets for a stretch role leads to wasted applications. A gap-bridging Pitch Narrative establishes your narrative first — then the resume follows.
            </p>
          </div>
        </motion.div>
      )}

      {/* Tier 4 growth assessment */}
      {tier === 4 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-zinc-500" />
            <h4 className="text-sm font-semibold text-zinc-400">Growth Mindset Assessment</h4>
          </div>
          <p className="text-xs text-zinc-600">
            These gaps must close before this track becomes viable. Use this as a development roadmap.
          </p>
          <ul className="space-y-3">
            {evaluation.badFitReasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-zinc-700 text-xs font-mono mt-0.5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <p className="text-xs text-zinc-500 leading-relaxed">{reason}</p>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* ATS Keyword Heatmap */}
      {evaluation.keywords && evaluation.keywords.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.15em] flex items-center gap-2">
            <FileSearch className="w-3.5 h-3.5 text-zinc-600" /> ATS Keyword Heatmap
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {evaluation.keywords.map((kw, i) => (
              <Badge
                key={i}
                variant="outline"
                className={cn(
                  "px-2.5 py-1 text-[10px] font-mono border",
                  kw.matched
                    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                    : "bg-zinc-900/50 border-zinc-800 text-zinc-600"
                )}
              >
                {kw.matched ? (
                  <CheckCircle2 className="w-2.5 h-2.5 mr-1 inline-block" />
                ) : (
                  <XCircle className="w-2.5 h-2.5 mr-1 inline-block opacity-40" />
                )}
                {kw.skill}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Edge / Gaps grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-zinc-900/30 border-zinc-800/50 rounded-2xl">
          <CardHeader className="pb-3 bg-zinc-900/50 border-b border-zinc-800/50 rounded-t-2xl py-4 px-5">
            <CardTitle className="text-emerald-400 flex items-center text-sm font-semibold">
              <CheckCircle2 className="w-4 h-4 mr-2" /> The Edge
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-5 pb-5">
            <ul className="space-y-3">
              {evaluation.goodFitReasons.map((reason, i) => (
                <li key={i} className="text-xs text-zinc-400 flex items-start leading-relaxed">
                  <span className="mr-2.5 text-emerald-600 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/30 border-zinc-800/50 rounded-2xl">
          <CardHeader className="pb-3 bg-zinc-900/50 border-b border-zinc-800/50 rounded-t-2xl py-4 px-5">
            <CardTitle className="text-yellow-400 flex items-center text-sm font-semibold">
              <XCircle className="w-4 h-4 mr-2" /> The Gaps
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-5 pb-5">
            <ul className="space-y-3">
              {evaluation.badFitReasons.map((reason, i) => (
                <li key={i} className="text-xs text-zinc-400 flex items-start leading-relaxed">
                  <span className="mr-2.5 text-yellow-600 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* CTA row */}
      <div className="flex justify-end items-center gap-3 pt-4 border-t border-zinc-800/50">
        {tier === 4 && (
          <p className="text-xs text-zinc-600 mr-auto">Asset generation is disabled for Tier 4 matches.</p>
        )}
        <Button
          size="lg"
          onClick={handleCTA}
          disabled={isGenerating}
          className={cn(
            "rounded-full px-7 h-11 font-semibold text-white transition-all",
            config.ctaClass
          )}
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {tier === 3 ? "Drafting Narrative..." : "Generating Assets..."}
            </>
          ) : (
            <>
              {config.ctaLabel}
              {config.ctaIcon}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
