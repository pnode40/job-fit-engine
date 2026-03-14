import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Shield, Target } from "lucide-react";
import { cn } from "../lib/utils";

const ASSESSMENT_PHASES = [
  "Normalizing Dossier Schema",
  "Extracting JD Lexicon",
  "Cross-referencing Core Competencies",
  "Calibrating Seniority Signals",
  "Computing Dimensional Scores",
  "Generating Fit Assessment",
];

export const GENERATION_PHASES = [
  "Synthesizing Career Narrative",
  "Drafting ATS-Optimized Resume",
  "Calibrating Keyword Density",
  "Composing Cover Letter",
  "Building Interview Playbook",
  "Finalizing Your Assets",
];

interface IngestionViewProps {
  dossierContent: string;
  jobDescription: string;
  phases?: string[];
  title?: string;
  phaseIntervalMs?: number;
}

export function IngestionView({
  dossierContent,
  jobDescription,
  phases = ASSESSMENT_PHASES,
  title = "Forensic Analysis in Progress",
  phaseIntervalMs = 900,
}: IngestionViewProps) {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    setPhaseIndex(0);
  }, [phases]);

  useEffect(() => {
    if (phaseIndex >= phases.length - 1) return;
    const timeout = setTimeout(() => {
      setPhaseIndex((i) => i + 1);
    }, phaseIntervalMs);
    return () => clearTimeout(timeout);
  }, [phaseIndex, phases, phaseIntervalMs]);

  const dossierLines = dossierContent.trim().split("\n").filter(Boolean).slice(0, 10);
  const jdLines = jobDescription.trim().split("\n").filter(Boolean).slice(0, 10);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="text-center space-y-1">
        <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] font-semibold">
          {title}
        </p>
      </div>

      {/* Split screen cards */}
      <div className="relative grid grid-cols-2 gap-5 overflow-hidden rounded-2xl">
        {/* Scanning laser — sweeps across the combined card area */}
        <motion.div
          className="absolute inset-x-0 h-[1.5px] z-10 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(96,165,250,0) 10%, rgba(96,165,250,0.65) 40%, rgba(147,197,253,0.8) 50%, rgba(96,165,250,0.65) 60%, rgba(96,165,250,0) 90%, transparent 100%)",
          }}
          animate={{ y: [0, 340, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Profile Card */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 backdrop-blur-sm overflow-hidden select-none relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/10 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800/50">
              <Shield className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.15em]">
                Dossier Profile
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Locked</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {dossierLines.map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 + (i < 2 ? 0.3 : 0) }}
                  transition={{ delay: i * 0.04 }}
                  className={cn(
                    "text-[10px] font-mono leading-relaxed truncate",
                    i < 2 ? "text-zinc-400" : "text-zinc-600"
                  )}
                >
                  {line}
                </motion.p>
              ))}
            </div>
          </div>
        </div>

        {/* Target Parameters */}
        <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-5 backdrop-blur-sm overflow-hidden select-none relative">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/10 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800/50">
              <Target className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.15em]">
                Target Parameters
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-blue-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                />
                <span className="text-[9px] text-zinc-600 uppercase tracking-widest">Parsing</span>
              </div>
            </div>
            <div className="space-y-1.5">
              {jdLines.map((line, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 + (i < 2 ? 0.3 : 0) }}
                  transition={{ delay: i * 0.04 + 0.15 }}
                  className={cn(
                    "text-[10px] font-mono leading-relaxed truncate",
                    i < 2 ? "text-zinc-400" : "text-zinc-600"
                  )}
                >
                  {line}
                </motion.p>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Status line */}
      <div className="flex flex-col items-center gap-3 py-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={phaseIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2.5"
          >
            <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            <span className="text-xs text-zinc-400 font-mono tracking-wide">
              {phases[phaseIndex]}
            </span>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-1.5 mt-1">
          {phases.map((_, i) => (
            <motion.div
              key={i}
              className={cn(
                "rounded-full transition-colors duration-300",
                i < phaseIndex
                  ? "w-4 h-1 bg-blue-500/60"
                  : i === phaseIndex
                  ? "w-4 h-1 bg-blue-400"
                  : "w-1.5 h-1 bg-zinc-700"
              )}
              animate={{ scale: i === phaseIndex ? 1.1 : 1 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
