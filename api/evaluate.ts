import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Strict Origin Validation
  const allowedOrigins = [
    process.env.ALLOWED_ORIGIN,
    process.env.APP_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean) as string[];

  const origin = req.headers.origin as string | undefined;
  // Allow same-origin requests (no Origin header) or cross-origin from allowlist
  const isAllowed = !origin || allowedOrigins.includes(origin);

  if (!isAllowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // 2. Preflight CORS Request Handling
  res.setHeader('Access-Control-Allow-Origin', origin ?? 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { dossier, jobDescription } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error: Missing API Key' });
    }

    if (!dossier || !jobDescription) {
      return res.status(400).json({ error: 'Missing dossier or jobDescription' });
    }
    if (typeof dossier !== 'string' || typeof jobDescription !== 'string') {
      return res.status(400).json({ error: 'dossier and jobDescription must be strings' });
    }
    // Cap inputs to prevent prompt injection via oversized payloads and runaway API costs
    const MAX_CHARS = 50_000;
    if (dossier.length > MAX_CHARS || jobDescription.length > MAX_CHARS) {
      return res.status(400).json({ error: `Input exceeds maximum length of ${MAX_CHARS} characters` });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an expert career coach and technical recruiter performing a strict, forensic Fit Analysis.
I will provide you with a candidate's Master Dossier (their verified skills, experience, and background) and a target Job Description.
Your task is to evaluate the exact fit between the candidate and the job.

CRITICAL RULES:
1. ZERO HALLUCINATION: You are strictly forbidden from assuming, inventing, or hallucinating experience. If a requirement in the Job Description is not explicitly mentioned or clearly demonstrated in the Dossier, you MUST mark it as a 'gap' (badFitReason). Recognizing that a candidate's demonstrated experience in an adjacent field is relevant to a requirement is NOT hallucination — it is informed assessment. Hallucination is inventing experience that does not exist in the dossier at all.
2. IMPLICIT TRANSLATION: You may translate explicit achievements into required skills if the connection is undeniable (full credit) or reasonably defensible (partial credit). For full credit, the connection must be undeniable (e.g., managing a $5M P&L implies Financial Acumen). For partial credit, the standard is: would a reasonable hiring manager accept this experience as relevant? You must explicitly state the source of your translation and whether you are granting full or partial credit.
3. CLAIM + PROOF STRUCTURE: Every single 'goodFitReason' must follow a Claim + Proof structure. For example: "Candidate meets the [Skill] requirement, proven by their experience [Exact Metric/Achievement from Dossier]." Do not write generic praise.
4. BE CALIBRATED, NOT JUST RUTHLESS: This is a pro-grade platform. If the candidate is a weak fit, say so clearly. Do not inflate the match score. But do not deflate it either. A candidate who meets 60-70% of requirements with strong transferable skills is a PARTIAL_FIT, not a DO_NOT_APPLY. Reserve DO_NOT_APPLY only for candidates who are fundamentally misaligned — where applying would be a waste of time for both sides.
5. CALIBRATE FOR SENIORITY & SCALE: You must aggressively evaluate the career level, scope of responsibility, and implicit compensation band of the Job Description against the candidate's actual track record. Keyword matches do not equal level matches. If the scale of the role (e.g. Director/VP $250K+) far exceeds the candidate's demonstrated scope, penalize the match score proportionally to the gap in scope and responsibility and explain why.
6. DIMENSIONAL SCORING: In addition to the holistic matchScore, provide three separate dimensional scores (0-100 each):
   - skillsScore: How well the candidate's hard skills, tools, and methodologies match the JD's explicit technical requirements.
   - seniorityScore: How well the candidate's demonstrated career level, scope of responsibility, and organizational scale matches the target role's expectations.
   - domainScore: How well the candidate's industry vertical, functional expertise, and domain knowledge aligns with the target role's context. The holistic matchScore must be consistent with the weighted average of these three scores.
7. TRANSFERABLE SKILLS & ADJACENT EXPERIENCE: When a candidate lacks a specific requirement but has demonstrably adjacent experience, evaluate whether that experience reasonably bridges the gap. For example: K-12 curriculum design is relevant (not equivalent) to corporate instructional design. Quota-carrying B2B sales is relevant (not equivalent) to sales enablement. Score adjacent experience as partial credit — above zero but below what direct experience would receive. The exact score should reflect how strong the transfer logic is for the specific case. However, if the candidate's entire background is in an unrelated field with no demonstrable connection to the target role's core function, this logic does not apply — score based on actual evidence only. Important: Even when a JD explicitly welcomes career pivots or prefers adjacent backgrounds, a candidate making their first move into a new functional role — with no prior job title, formal program, or measurable output in that function — should not exceed a matchScore of 65 or a recommendation tier above GOOD_FIT. Adjacent experience reduces the gap; it does not eliminate it.
8. RECOMMENDATION TIERS: Use these tiers for the recommendation field based on the holistic matchScore:
   - STRONG_FIT (matchScore 75+): Candidate meets most requirements with only minor gaps.
   - GOOD_FIT (matchScore 60-74): Candidate is competitive with some notable gaps that can be addressed.
   - PARTIAL_FIT (matchScore 40-59): Candidate has a relevant foundation but significant gaps — worth applying with strong positioning.
   - WEAK_FIT (matchScore 20-39): Candidate has tangential relevance but is not competitive for this role.
   - DO_NOT_APPLY (matchScore below 20): Fundamental misalignment in skills, domain, and seniority — applying would waste everyone's time.
   The recommendation must be consistent with the matchScore. Do not output DO_NOT_APPLY for a candidate scoring above 40.

Candidate Dossier:
${dossier}

Job Description:
${jobDescription}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            levelingAnalysis: {
              type: Type.STRING,
              description: "A strict analysis comparing the seniority, scale, and expected trajectory of the target role against the candidate's actual footprint. Must define the 'gap' if one exists.",
            },
            matchScore: {
              type: Type.INTEGER,
              description: "A holistic score from 0 to 100 representing overall fit. Must be consistent with the weighted average of skillsScore, seniorityScore, and domainScore.",
            },
            skillsScore: {
              type: Type.INTEGER,
              description: "A score from 0 to 100 representing how well the candidate's hard skills, tools, and methodologies match the JD's explicit technical requirements.",
            },
            seniorityScore: {
              type: Type.INTEGER,
              description: "A score from 0 to 100 representing how well the candidate's demonstrated career level, scope of responsibility, and organizational scale matches the target role's expectations.",
            },
            domainScore: {
              type: Type.INTEGER,
              description: "A score from 0 to 100 representing how well the candidate's industry vertical, functional expertise, and domain knowledge aligns with the target role's context.",
            },
            goodFitReasons: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Reasons why the candidate is a good fit for the role based on their dossier.",
            },
            badFitReasons: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Reasons why the candidate might not be a good fit, or areas where they lack experience.",
            },
            recommendation: {
              type: Type.STRING,
              description: "Fit tier for the candidate. Must be exactly one of: 'STRONG_FIT', 'GOOD_FIT', 'PARTIAL_FIT', 'WEAK_FIT', 'DO_NOT_APPLY'.",
            },
            recommendationReasoning: {
              type: Type.STRING,
              description: "A short paragraph explaining the final recommendation.",
            },
            keywords: {
              type: Type.ARRAY,
              description: "Top 10-15 hard skills or keywords extracted from the JD, and whether the candidate's dossier matches them.",
              items: {
                type: Type.OBJECT,
                properties: {
                  skill: { type: Type.STRING, description: "The skill or keyword." },
                  matched: { type: Type.BOOLEAN, description: "True if the candidate's dossier explicitly or implicitly demonstrates this skill." }
                },
                required: ["skill", "matched"]
              }
            }
          },
          required: ["levelingAnalysis", "matchScore", "skillsScore", "seniorityScore", "domainScore", "goodFitReasons", "badFitReasons", "recommendation", "recommendationReasoning", "keywords"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const evaluation = JSON.parse(text);

    // Validate required numeric fields are present and in range
    const requiredFields = ['matchScore', 'skillsScore', 'seniorityScore', 'domainScore'];
    for (const field of requiredFields) {
      const val = evaluation[field];
      if (typeof val !== 'number' || val < 0 || val > 100) {
        throw new Error(`Invalid evaluation response: '${field}' missing or out of range`);
      }
    }
    if (!Array.isArray(evaluation.goodFitReasons) || !Array.isArray(evaluation.badFitReasons) || !Array.isArray(evaluation.keywords)) {
      throw new Error("Invalid evaluation response: missing required arrays");
    }
    const validRecommendations = ['STRONG_FIT', 'GOOD_FIT', 'PARTIAL_FIT', 'WEAK_FIT', 'DO_NOT_APPLY'];
    if (!validRecommendations.includes(evaluation.recommendation)) {
      throw new Error("Invalid evaluation response: unexpected recommendation value");
    }

    return res.status(200).json(evaluation);

  } catch (error: any) {
    console.error("Evaluation error:", error);
    return res.status(500).json({ error: 'Evaluation failed. Please try again.' });
  }
}
